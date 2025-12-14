import { useEffect, useRef } from "react";

type MenuItem = 
  | {
      label: string;
      action: () => void;
      disabled?: boolean;
      separator?: false;
    }
  | {
      separator: true;
      label?: never;
      action?: never;
      disabled?: never;
    };

type Props = {
  isOpen: boolean;
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
};

export default function ContextMenu({ isOpen, x, y, items, onClose }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 desk-card p-1 min-w-[180px]"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        backgroundColor: "var(--panel-bg)",
      }}
    >
      {items.map((item, index) => {
        if (item.separator) {
          return (
            <div
              key={index}
              className="h-px my-1"
              style={{ backgroundColor: "var(--border-soft)" }}
            />
          );
        }
        return (
          <button
            key={index}
            type="button"
            className="w-full text-left px-3 py-2 text-sm rounded-md transition note-item"
            onClick={() => {
              item.action();
              onClose();
            }}
            disabled={item.disabled}
            style={{
              opacity: item.disabled ? 0.5 : 1,
              cursor: item.disabled ? "not-allowed" : "pointer",
            }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}


