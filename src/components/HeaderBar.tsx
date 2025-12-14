import { useMemo } from "react";

type Props = {
  onOpenSettings?: () => void;
  onToggleTheme?: () => void;
  title?: string;
  showSettings?: boolean;
  onToggleSettings?: () => void;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
};

export default function HeaderBar({ onOpenSettings, onToggleTheme, title, showSettings, onToggleSettings, sidebarCollapsed, onToggleSidebar }: Props) {
  const appTitle = useMemo(() => title ?? "Parcel", [title]);

  return (
    <header className="h-12 flex items-center justify-between px-6 header-bar">
      <div className="flex items-center gap-3">
        <div className="font-semibold" style={{ color: "var(--text-main)" }}>
          ✏️ {appTitle}
        </div>
        <div className="text-xs hidden sm:block" style={{ color: "var(--text-muted)" }}>
          warm, local notes
        </div>
      </div>

      <div className="flex items-center gap-1" style={{ color: "var(--text-main)" }}>
        {onToggleSidebar && (
          <button
            className="btn-icon"
            onClick={onToggleSidebar}
            title={sidebarCollapsed ? "Show sidebar (⌘B)" : "Hide sidebar (⌘B)"}
            type="button"
          >
            {sidebarCollapsed ? "☰" : "◀"}
          </button>
        )}
        <button
          className="btn-icon"
          onClick={onToggleTheme}
          title="Cycle theme (Light → Dark → Night → North)"
          type="button"
        >
          🌗
        </button>
        <button
          className="btn-icon"
          onClick={onToggleSettings || onOpenSettings}
          title="Settings & Data Management"
          type="button"
        >
          ⚙
        </button>
      </div>
    </header>
  );
}
