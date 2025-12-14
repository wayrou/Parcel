import { useMemo, useEffect, useState, useRef } from "react";
import { useNotesStore } from "../state/notes";
import ConfirmDialog from "./ConfirmDialog";

// Helper to get platform-specific modifier key
const getModKey = () => {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  return isMac ? '⌘' : 'Ctrl';
};

const COLOR_CLASS: Record<string, string> = {
  paper: "note-color-paper",
  yellow: "note-color-yellow",
  mint: "note-color-mint",
  lavender: "note-color-lavender",
  salmon: "note-color-salmon",
  sky: "note-color-sky",
};

export default function NoteCard() {
  const { selectedNote, updateNote, deleteNote, selectedNoteId, folders, canUndo, canRedo, undo, redo } = useNotesStore();
  const note = selectedNote();
  const [isMounted, setIsMounted] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const modKey = useMemo(() => getModKey(), []);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setIsMounted(false);
    const timer = setTimeout(() => setIsMounted(true), 10);
    return () => clearTimeout(timer);
  }, [selectedNoteId]);

  // Auto-focus title input when note is selected or created
  useEffect(() => {
    if (note && titleInputRef.current) {
      // Small delay to ensure DOM is ready after animation
      const focusTimer = setTimeout(() => {
        titleInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(focusTimer);
    }
  }, [note?.id]);

  // Keyboard shortcuts for note actions
  useEffect(() => {
    if (!note) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      
      // ⌘P / Ctrl+P: Toggle pin
      if (isMod && e.key === 'p' && !e.shiftKey) {
        e.preventDefault();
        updateNote(note.id, { pinned: !note.pinned });
      }
      
      // ⌘⌫ / Ctrl+Backspace: Delete note
      if (isMod && (e.key === 'Backspace' || e.key === 'Delete')) {
        e.preventDefault();
        setShowDeleteConfirm(true);
      }

      // ⌘Z / Ctrl+Z: Undo
      if (isMod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      // ⌘⇧Z / Ctrl+Shift+Z: Redo
      if (isMod && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [note, updateNote, deleteNote, undo, redo]);

  const cardTint = useMemo(() => {
    const key = note?.color ?? "paper";
    return COLOR_CLASS[key] ?? COLOR_CLASS.paper;
  }, [note?.color]);

  if (!note) {
    return (
      <div className="max-w-3xl mx-auto mt-16 text-center px-4">
        <div className="text-6xl mb-4">✉️</div>
        <div className="text-lg font-medium mb-2" style={{ color: "var(--text-main)" }}>
          Welcome to Parcel
        </div>
        <div className="text-sm mb-6" style={{ color: "var(--muted)" }}>
          Create or select a note to begin writing
        </div>
        <div className="text-xs" style={{ color: "var(--muted)", opacity: 0.7 }}>
          Press {modKey}+N to create a new note
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '48rem', margin: '0 auto', width: '100%' }}>
      <div className={[
        "desk-card paper-texture p-8 note-card-active",
        cardTint,
        isMounted ? "note-card-enter" : "",
      ].filter(Boolean).join(" ")}>
        {/* Toolbar strip */}
        <div className="flex items-center justify-end gap-1 mb-6">
          <div className="toolbar-strip flex items-center gap-1">
            <button 
              type="button" 
              className="btn-icon" 
              title={`${note.pinned ? "Unpin" : "Pin"} (${modKey}+P)`}
              onClick={() => updateNote(note.id, { pinned: !note.pinned })}
            >
              📌
            </button>

            <select
              value={note.folderId || ""}
              onChange={(e) => updateNote(note.id, { folderId: e.target.value || null })}
              className="toolbar-select"
              title="Folder"
            >
              <option value="">No Folder</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>

            <select
              value={note.color}
              onChange={(e) => updateNote(note.id, { color: e.target.value as any })}
              className="toolbar-select"
              title="Color"
            >
              <option value="paper">Paper</option>
              <option value="yellow">Yellow</option>
              <option value="mint">Mint</option>
              <option value="lavender">Lavender</option>
              <option value="salmon">Salmon</option>
              <option value="sky">Sky</option>
            </select>

            <button 
              type="button" 
              className="btn-icon" 
              title={`Delete note (${modKey}+⌫)`}
              onClick={() => setShowDeleteConfirm(true)}
            >
              🗑
            </button>
          </div>
        </div>

        {/* Title input - typography style */}
        <input
          ref={titleInputRef}
          type="text"
          value={note.title}
          onChange={(e) => {
            // Use requestAnimationFrame to prevent UI jank while typing
            requestAnimationFrame(() => {
              updateNote(note.id, { title: e.target.value });
            });
          }}
          onKeyDown={(e) => {
            // Tab or Enter moves focus to body
            if (e.key === "Tab" || (e.key === "Enter" && !e.shiftKey)) {
              e.preventDefault();
              bodyTextareaRef.current?.focus();
            }
          }}
          className="w-full text-3xl font-semibold input-typography mb-6"
          style={{ color: "var(--text-main)" }}
          placeholder="Untitled"
        />

        {/* Body textarea - paper feel */}
        <textarea
          ref={bodyTextareaRef}
          value={note.body}
          onChange={(e) => {
            // Use requestAnimationFrame to prevent UI jank while typing
            requestAnimationFrame(() => {
              updateNote(note.id, { body: e.target.value });
            });
          }}
          className="w-full h-[70vh] bg-transparent border-0 p-0 rounded-none focus:shadow-none resize-none input-typography"
          style={{ 
            color: "var(--text-main)",
            lineHeight: "1.7",
            fontSize: "1rem"
          }}
          placeholder="Start typing…"
        />
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Note"
        message={`Are you sure you want to delete "${note.title || 'Untitled'}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={() => {
          deleteNote(note.id);
          setShowDeleteConfirm(false);
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
