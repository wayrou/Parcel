import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { Folder, Note, ParcelData, NoteColor } from "../types";
import { uuid } from "../utils/id";

export type SortOption = "updated" | "created" | "title";

type HistoryState = {
  notes: Note[];
  folders: Folder[];
};

type NotesState = {
  hydrated: boolean;
  notes: Note[];
  folders: Folder[];
  selectedNoteId: string | null;
  search: string;
  activeFolderId: string | null;
  sortBy: SortOption;
  error: string | null; // Error state for user feedback
  
  // Undo/Redo
  history: HistoryState[];
  historyIndex: number;
  maxHistorySize: number;

  // Derived
  selectedNote: () => Note | null;
  visibleNotes: () => Note[];
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Actions
  hydrateFromDisk: () => Promise<void>;
  saveToDisk: () => Promise<void>;

  setSearch: (q: string) => void;
  setActiveFolder: (folderId: string | null) => void;
  setSortBy: (sort: SortOption) => void;

  createNote: (opts?: { folderId?: string | null; color?: NoteColor }) => void;
  selectNote: (id: string | null) => void;
  updateNote: (id: string, patch: Partial<Pick<Note, "title" | "body" | "folderId" | "pinned" | "color">>) => void;
  deleteNote: (id: string) => void;

  createFolder: (name: string) => void;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;

  // Undo/Redo actions
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
};

function now() {
  return Date.now();
}

function makeDefaultFolder(): Folder {
  const t = now();
  return { id: uuid(), name: "Notes", createdAt: t, updatedAt: t };
}

function makeNote(folderId: string | null, color: NoteColor = "paper"): Note {
  const t = now();
  return {
    id: uuid(),
    title: "", // Empty title for instant typing - user can start typing immediately
    body: "",
    folderId,
    pinned: false,
    color,
    createdAt: t,
    updatedAt: t,
  };
}

const initialFolder = makeDefaultFolder();
const initialState: HistoryState = { notes: [], folders: [initialFolder] };

export const useNotesStore = create<NotesState>((set, get) => ({
  hydrated: false,
  notes: [],
  folders: [initialFolder],
  selectedNoteId: null,
  search: "",
  activeFolderId: null,
  sortBy: "updated",
  error: null,
  history: [initialState],
  historyIndex: 0,
  maxHistorySize: 50,

  selectedNote: () => {
    const { notes, selectedNoteId } = get();
    return notes.find((n) => n.id === selectedNoteId) ?? null;
  },

  canUndo: () => {
    const { historyIndex } = get();
    return historyIndex > 0;
  },

  canRedo: () => {
    const { history, historyIndex } = get();
    return historyIndex < history.length - 1;
  },

  visibleNotes: () => {
    const { notes, search, activeFolderId, sortBy } = get();
    const q = search.trim().toLowerCase();

    const filtered = notes
      .filter((n) => (activeFolderId ? n.folderId === activeFolderId : true))
      .filter((n) => {
        if (!q) return true;
        return (
          n.title.toLowerCase().includes(q) ||
          n.body.toLowerCase().includes(q)
        );
      });

    // Sort based on selected option
    const sorted = [...filtered].sort((a, b) => {
      // Pinned notes always come first
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;

      // Then sort by selected option
      switch (sortBy) {
        case "updated":
          return b.updatedAt - a.updatedAt; // Most recently updated first
        case "created":
          return b.createdAt - a.createdAt; // Most recently created first
        case "title":
          const titleA = (a.title || "Untitled").toLowerCase();
          const titleB = (b.title || "Untitled").toLowerCase();
          return titleA.localeCompare(titleB); // Alphabetical
        default:
          return b.updatedAt - a.updatedAt;
      }
    });

    return sorted;
  },

  hydrateFromDisk: async () => {
    try {
      const data = await invoke<ParcelData>("load_notes");
      
      // Validate and sanitize data
      const folders = data.folders?.length 
        ? data.folders.filter(f => f.id && f.name?.trim())
        : [makeDefaultFolder()];
      
      // Filter out invalid notes and fix any issues
      const notes = (data.notes ?? []).filter(n => {
        if (!n.id) return false;
        // Ensure valid color
        const validColors: NoteColor[] = ["paper", "yellow", "mint", "lavender", "salmon", "sky"];
        if (!validColors.includes(n.color as NoteColor)) {
          (n as any).color = "paper";
        }
        return true;
      });
      
      const initialState: HistoryState = { notes: [...notes], folders: [...folders] };
      set({
        hydrated: true,
        folders,
        notes,
        selectedNoteId: notes[0]?.id ?? null,
        history: [initialState],
        historyIndex: 0,
        error: null, // Clear any previous errors
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      
      // Check if it's a corruption error
      const isCorrupt = errorMessage.includes("corrupt") || errorMessage.includes("parse");
      
      if (isCorrupt) {
        // Try to recover by creating backup and starting fresh
        set({
          hydrated: true,
          notes: [],
          folders: [makeDefaultFolder()],
          selectedNoteId: null,
          history: [{ notes: [], folders: [makeDefaultFolder()] }],
          historyIndex: 0,
          error: `Data file appears to be corrupt. Starting with empty notes. Original error: ${errorMessage}`,
        });
      } else {
        // First run / file missing is OK; treat as empty.
        const initialState: HistoryState = { notes: [], folders: [makeDefaultFolder()] };
        set({ 
          hydrated: true,
          history: [initialState],
          historyIndex: 0,
          error: null,
        });
      }
    }
  },

  saveToDisk: async () => {
    try {
      const payload: ParcelData = {
        version: 1,
        notes: get().notes,
        folders: get().folders,
      };
      await invoke("save_notes", { data: payload });
      // Clear error on successful save
      set({ error: null });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      set({ error: `Failed to save notes: ${errorMessage}` });
      // Don't throw - allow user to continue working
      console.error("saveToDisk failed:", e);
    }
  },

  pushHistory: () => {
    const { notes, folders, history, historyIndex, maxHistorySize } = get();
    const newState: HistoryState = { notes: [...notes], folders: [...folders] };
    
    // Remove any history after current index (when undoing and then making a new change)
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    
    // Limit history size
    if (newHistory.length > maxHistorySize) {
      newHistory.shift();
    }
    
    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  undo: () => {
    const { history, historyIndex, canUndo } = get();
    if (!canUndo()) return;
    
    const prevIndex = historyIndex - 1;
    const prevState = history[prevIndex];
    
    set({
      notes: [...prevState.notes],
      folders: [...prevState.folders],
      historyIndex: prevIndex,
    });
  },

  redo: () => {
    const { history, historyIndex, canRedo } = get();
    if (!canRedo()) return;
    
    const nextIndex = historyIndex + 1;
    const nextState = history[nextIndex];
    
    set({
      notes: [...nextState.notes],
      folders: [...nextState.folders],
      historyIndex: nextIndex,
    });
  },

  setSearch: (q) => set({ search: q }),
  setActiveFolder: (folderId) => set({ activeFolderId: folderId }),
  setSortBy: (sort) => set({ sortBy: sort }),
  createNote: (opts) => {
    const { pushHistory } = get();
    pushHistory();
    const folderId = opts?.folderId ?? get().activeFolderId ?? get().folders[0]?.id ?? null;
    const color = opts?.color ?? "paper";
    const note = makeNote(folderId, color);
    // Instant creation - add to top of list and select immediately
    set((s) => ({ notes: [note, ...s.notes], selectedNoteId: note.id }));
    get().pushHistory();
  },
  selectNote: (id) => set({ selectedNoteId: id }),
  updateNote: (id, patch) => {
    const { pushHistory } = get();
    // Only push history if this is a meaningful change (title/body)
    const shouldTrack = patch.title !== undefined || patch.body !== undefined;
    if (shouldTrack) {
      pushHistory();
    }
    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === id ? { ...n, ...patch, updatedAt: now() } : n
      ),
    }));
    // Push new state after update
    if (shouldTrack) {
      get().pushHistory();
    }
  },
  deleteNote: (id) => {
    const { pushHistory } = get();
    pushHistory();
    set((s) => {
      const notes = s.notes.filter((n) => n.id !== id);
      const selectedNoteId =
        s.selectedNoteId === id ? (notes[0]?.id ?? null) : s.selectedNoteId;
      return { notes, selectedNoteId };
    });
    get().pushHistory();
  },

  createFolder: (name) => {
    const { pushHistory } = get();
    pushHistory();
    set((s) => {
      const t = now();
      const folder: Folder = { id: uuid(), name, createdAt: t, updatedAt: t };
      return { folders: [...s.folders, folder] };
    });
    get().pushHistory();
  },
  renameFolder: (id, name) => {
    const { pushHistory } = get();
    pushHistory();
    set((s) => ({
      folders: s.folders.map((f) =>
        f.id === id ? { ...f, name, updatedAt: now() } : f
      ),
    }));
    get().pushHistory();
  },
  deleteFolder: (id) => {
    const { pushHistory } = get();
    pushHistory();
    set((s) => {
      const folders = s.folders.filter((f) => f.id !== id);
      const notes = s.notes.map((n) => (n.folderId === id ? { ...n, folderId: null } : n));
      const activeFolderId = s.activeFolderId === id ? null : s.activeFolderId;
      return { folders: folders.length ? folders : [makeDefaultFolder()], notes, activeFolderId };
    });
    get().pushHistory();
  },
}));
