type Props = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: Props) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
      onClick={onCancel}
    >
      <div
        className="desk-card p-6 max-w-md mx-4"
        style={{ backgroundColor: "var(--panel-bg)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--text-main)" }}>
          {title}
        </h3>
        <p className="mb-6" style={{ color: "var(--text-muted)" }}>
          {message}
        </p>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            className="btn-soft"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="btn-primary"
            style={{
              background: "linear-gradient(to bottom, color-mix(in srgb, #ef4444 15%, var(--panel-bg)), color-mix(in srgb, #ef4444 8%, var(--panel-bg)))",
              borderColor: "color-mix(in srgb, #ef4444 30%, transparent)",
            }}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

