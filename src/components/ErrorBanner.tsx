import { useNotesStore } from "../state/notes";

export default function ErrorBanner() {
  const error = useNotesStore((state) => state.error);

  if (!error) return null;

  return (
    <div
      className="fixed top-12 left-0 right-0 z-50 p-4"
      style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", borderBottom: "1px solid rgba(239, 68, 68, 0.3)" }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚠️</span>
          <p className="text-sm" style={{ color: "rgb(153, 27, 27)" }}>
            {error}
          </p>
        </div>
        <button
          type="button"
          className="btn-soft text-xs"
          onClick={() => useNotesStore.setState({ error: null })}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}


