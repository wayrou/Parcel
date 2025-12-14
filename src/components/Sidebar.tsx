import { useMemo, useState, useEffect } from "react";
import { useNotesStore } from "../state/notes";
import NoteListItem from "./NoteListItem";
import ConfirmDialog from "./ConfirmDialog";

// Helper to get platform-specific modifier key
const getModKey = () => {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  return isMac ? '⌘' : 'Ctrl';
};

export default function Sidebar() {
  const {
    folders,
    selectedNoteId,
    search,
    activeFolderId,
    sortBy,
    setSearch,
    setActiveFolder,
    setSortBy,
    createNote,
    selectNote,
    visibleNotes,
    createFolder,
    deleteNote,
    updateNote,
  } = useNotesStore();

  const [newFolderName, setNewFolderName] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{ noteId: string; noteTitle: string } | null>(null);
  const modKey = useMemo(() => getModKey(), []);

  const notes = visibleNotes();
  const pinned = useMemo(() => notes.filter((n) => n.pinned), [notes]);
  const others = useMemo(() => notes.filter((n) => !n.pinned), [notes]);
  const searchResultCount = useMemo(() => notes.length, [notes]);

  // Keyboard shortcuts and navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const isMod = e.metaKey || e.ctrlKey;
      
      // ⌘N / Ctrl+N: New note
      if (isMod && e.key === 'n' && !e.shiftKey) {
        e.preventDefault();
        createNote();
        return;
      }
      
      // ⌘K / Ctrl+K: Focus search
      if (isMod && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('.search-pill') as HTMLInputElement;
        searchInput?.focus();
        return;
      }

      // Arrow key navigation for note list - optimized for performance
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const allNotes = [...pinned, ...others];
        if (allNotes.length === 0) return;

        // Use requestAnimationFrame to prevent blocking
        requestAnimationFrame(() => {
          const currentIndex = selectedNoteId 
            ? allNotes.findIndex(n => n.id === selectedNoteId)
            : -1;

          let nextIndex: number;
          if (e.key === 'ArrowDown') {
            nextIndex = currentIndex < allNotes.length - 1 ? currentIndex + 1 : 0;
          } else {
            nextIndex = currentIndex > 0 ? currentIndex - 1 : allNotes.length - 1;
          }

          if (allNotes[nextIndex]) {
            selectNote(allNotes[nextIndex].id);
            
            // Scroll selected note into view
            setTimeout(() => {
              const selectedElement = document.querySelector(`[data-note-id="${allNotes[nextIndex].id}"]`);
              selectedElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 0);
          }
        });
        return;
      }
      
      // Home/End keys for first/last note
      if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        const allNotes = [...pinned, ...others];
        if (allNotes.length === 0) return;
        
        requestAnimationFrame(() => {
          const targetIndex = e.key === 'Home' ? 0 : allNotes.length - 1;
          if (allNotes[targetIndex]) {
            selectNote(allNotes[targetIndex].id);
            setTimeout(() => {
              const selectedElement = document.querySelector(`[data-note-id="${allNotes[targetIndex].id}"]`);
              selectedElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 0);
          }
        });
        return;
      }

      // Enter to open selected note (if not already open)
      if (e.key === 'Enter' && selectedNoteId) {
        // Note is already selected, focus will be handled by NoteCard
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [createNote, pinned, others, selectedNoteId, selectNote]);

  return (
    <aside 
      className="sidebar"
      style={{ 
        width: '20rem', 
        flexShrink: 0, 
        flexGrow: 0,
        flexBasis: '20rem',
        height: '100%',
        overflowY: 'auto',
        padding: '1rem',
        transition: 'opacity 0.2s ease-out'
      }}
    >
      <div className="desk-panel p-4">
        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes…"
              className="search-pill"
              title={`${modKey}+K to focus`}
            />
            {search && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: "var(--text-muted)" }}>
                {searchResultCount}
              </div>
            )}
          </div>
        </div>

        {/* Sort Options */}
        <div className="mb-4 flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="flex-1 text-sm"
            title="Sort notes by"
          >
            <option value="updated">Updated</option>
            <option value="created">Created</option>
            <option value="title">Title</option>
          </select>
        </div>

        {/* Primary action */}
        <button 
          type="button" 
          onClick={() => {
            createNote();
            // Note: Auto-focus is handled in NoteCard component via useEffect
          }} 
          className="w-full btn-primary mb-5"
          title={`${modKey}+N - Create and start typing instantly`}
        >
          ➕ New Note
        </button>

        {/* Folders */}
        <section className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="label">Folders</h3>

            <button
              type="button"
              onClick={() => setActiveFolder(null)}
              className={["pill text-xs transition", activeFolderId === null ? "desk-inset" : "hover:opacity-90"].join(" ")}
              title="Show all folders"
            >
              All
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            {folders.map((f) => {
              const noteCount = notes.filter((n) => n.folderId === f.id).length;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActiveFolder(f.id)}
                  className={[
                    "w-full text-left text-sm transition flex items-center justify-between",
                    activeFolderId === f.id ? "note-item-active" : "note-item",
                  ].join(" ")}
                >
                  <span>📁 {f.name}</span>
                  {noteCount > 0 && (
                    <span className="text-xs opacity-60" style={{ color: "var(--text-muted)" }}>
                      {noteCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex gap-2 mt-3">
            <input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="New folder…"
              className="flex-1 text-sm"
            />
            <button
              type="button"
              className="btn-soft text-sm"
              onClick={() => {
                const name = newFolderName.trim();
                if (!name) return;
                createFolder(name);
                setNewFolderName("");
              }}
            >
              Add
            </button>
          </div>
        </section>

        {/* Pinned */}
        {pinned.length > 0 && (
          <section className="mt-6">
            <h3 className="label mb-3">Pinned</h3>
            <div className="flex flex-col gap-1.5">
              {pinned.map((n) => (
                <NoteListItem
                  key={n.id}
                  note={n}
                  active={n.id === selectedNoteId}
                  onClick={() => selectNote(n.id)}
                  onDelete={() => setDeleteConfirm({ noteId: n.id, noteTitle: n.title || 'Untitled' })}
                  onPin={() => updateNote(n.id, { pinned: !n.pinned })}
                />
              ))}
            </div>
          </section>
        )}

        {/* Separator between pinned and unpinned */}
        {pinned.length > 0 && others.length > 0 && (
          <div className="section-separator" />
        )}

        {/* Notes */}
        <section className="mt-6">
          <h3 className="label mb-3">Notes</h3>

          <div className="flex flex-col gap-1.5">
            {others.map((n) => (
              <NoteListItem
                key={n.id}
                note={n}
                active={n.id === selectedNoteId}
                onClick={() => selectNote(n.id)}
                onDelete={() => setDeleteConfirm({ noteId: n.id, noteTitle: n.title || 'Untitled' })}
                onPin={() => updateNote(n.id, { pinned: !n.pinned })}
              />
            ))}

            {notes.length === 0 && (
              <div className="text-center py-8 px-4" style={{ color: "var(--muted)" }}>
                <div className="text-4xl mb-3">📝</div>
                <div className="text-sm font-medium mb-1" style={{ color: "var(--text-main)" }}>
                  {search ? "No notes found" : "No notes yet"}
                </div>
                <div className="text-xs">
                  {search 
                    ? "Try a different search term"
                    : `Press ${modKey}+N or click "New Note" to create your first note`
                  }
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Delete Note"
        message={`Are you sure you want to delete "${deleteConfirm?.noteTitle}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={() => {
          if (deleteConfirm) {
            deleteNote(deleteConfirm.noteId);
            setDeleteConfirm(null);
          }
        }}
        onCancel={() => setDeleteConfirm(null)}
      />
    </aside>
  );
}
