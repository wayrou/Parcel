import React, { useMemo, useState } from "react";
import type { Note } from "../types";
import ContextMenu, { type MenuItem } from "./ContextMenu";

type Props = {
  note: Note;
  active: boolean;
  onClick: () => void;
  onDelete?: () => void;
  onPin?: () => void;
};

// Memoize to prevent unnecessary re-renders
const NoteListItem = ({ note, active, onClick, onDelete, onPin }: Props) => {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const title = note.title?.trim() || "Untitled";
  
  // Better preview extraction: remove markdown-like syntax, get first meaningful line
  const preview = useMemo(() => {
    const body = note.body.trim();
    if (!body) return "";
    
    // Get first non-empty line, strip markdown-like prefixes (#, -, *, etc.)
    const lines = body.split("\n");
    for (const line of lines) {
      const cleaned = line.trim().replace(/^[#\-\*\d+\.\s]+/, "").trim();
      if (cleaned.length > 0) {
        // Return first 60 chars, but try to break at word boundary
        if (cleaned.length <= 60) return cleaned;
        const truncated = cleaned.slice(0, 60);
        const lastSpace = truncated.lastIndexOf(" ");
        return lastSpace > 40 ? truncated.slice(0, lastSpace) + "…" : truncated + "…";
      }
    }
    return "";
  }, [note.body]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const menuItems: MenuItem[] = [
    { label: note.pinned ? "Unpin" : "Pin", action: () => onPin?.() },
    { separator: true },
    { label: "Delete", action: () => onDelete?.() },
  ];

  return (
    <>
    <button
      type="button"
      data-note-id={note.id}
      onClick={onClick}
      onContextMenu={handleContextMenu}
      className={[
        "w-full text-left transition focus:outline-none",
        active ? "note-item-active" : "note-item",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2 mb-0.5">
        <div className="font-medium truncate text-sm" style={{ color: "var(--text-main)" }}>
          {title}
        </div>
        {note.pinned ? (
          <span className="opacity-60 text-xs" title="Pinned" style={{ flexShrink: 0 }}>
            📌
          </span>
        ) : null}
      </div>
      {preview && (
        <div 
          className="text-xs truncate" 
          style={{ color: "var(--text-muted)", opacity: 0.75, lineHeight: "1.4" }}
        >
          {preview}
        </div>
      )}
    </button>
    <ContextMenu
      isOpen={!!contextMenu}
      x={contextMenu?.x ?? 0}
      y={contextMenu?.y ?? 0}
      items={menuItems}
      onClose={() => setContextMenu(null)}
    />
    </>
  );
};

export default React.memo(NoteListItem);
