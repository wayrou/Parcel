import { useEffect, useMemo, useState } from "react";
import HeaderBar from "./components/HeaderBar";
import Sidebar from "./components/Sidebar";
import NoteCard from "./components/NoteCard";
import LoadingSkeleton from "./components/LoadingSkeleton";
import SettingsDialog from "./components/SettingsDialog";
import ErrorBoundary from "./components/ErrorBoundary";
import ErrorBanner from "./components/ErrorBanner";
import { useNotesStore } from "./state/notes";
import { useDebouncedEffect } from "./hooks/useDebouncedEffect";
import { useWindowState } from "./hooks/useWindowState";

type Theme = "light" | "dark" | "night" | "north";

export default function App() {
  const { hydrated, hydrateFromDisk, notes, folders, saveToDisk } = useNotesStore();
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem("parcel-sidebar-collapsed");
    return saved === "true";
  });
  
  // Restore window state on mount (only in Tauri, and with validation)
  useWindowState();
  const [theme, setTheme] = useState<Theme>(() => {
    // Check for saved theme in localStorage, or default based on system preference
    const saved = localStorage.getItem("parcel-theme") as Theme | null;
    if (saved && ["light", "dark", "night", "north"].includes(saved)) {
      return saved as Theme;
    }
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches 
      ? "dark" 
      : "light";
  });

  useEffect(() => {
    // Remove all theme classes
    document.body.classList.remove("theme-light", "theme-dark", "theme-night", "theme-north");
    // Add current theme class
    document.body.classList.add(`theme-${theme}`);
    // Also set data-theme attribute on root for CSS variable support
    document.documentElement.setAttribute("data-theme", theme);
    // Save to localStorage
    localStorage.setItem("parcel-theme", theme);
  }, [theme]);

  const cycleTheme = () => {
    const themes: Theme[] = ["light", "dark", "night", "north"];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  useEffect(() => {
    hydrateFromDisk();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced autosave after hydration - runs in background, never blocks UI
  useDebouncedEffect(
    () => {
      if (!hydrated) return;
      // Save asynchronously - doesn't block typing or UI updates
      saveToDisk().catch((e) => console.warn("saveToDisk failed:", e));
    },
    [hydrated, notes, folders],
    600 // 600ms debounce - saves after user stops typing
  );

  const title = useMemo(() => "Parcel", []);

  // Persist sidebar state
  useEffect(() => {
    localStorage.setItem("parcel-sidebar-collapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Keyboard shortcut to toggle sidebar (⌘B / Ctrl+B)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key === 'b') {
        e.preventDefault();
        setSidebarCollapsed(!sidebarCollapsed);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarCollapsed]);

  return (
    <ErrorBoundary>
      <div className="w-screen h-screen flex flex-col" style={{ backgroundColor: "var(--app-bg)" }}>
        <ErrorBanner />
        <HeaderBar
          title={title}
          onToggleTheme={cycleTheme}
          onToggleSettings={() => setShowSettings(!showSettings)}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        <SettingsDialog
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          currentTheme={theme}
          onThemeChange={setTheme}
        />

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: sidebarCollapsed ? '0 1fr' : '20rem 1fr',
        flex: 1, 
        overflow: 'hidden', 
        minWidth: 0,
        minHeight: 0,
        transition: 'grid-template-columns 0.2s ease-out'
      }}>
        <div style={{
          width: sidebarCollapsed ? 0 : '20rem',
          overflow: 'hidden',
          transition: 'width 0.2s ease-out, opacity 0.2s ease-out',
          opacity: sidebarCollapsed ? 0 : 1,
          pointerEvents: sidebarCollapsed ? 'none' : 'auto'
        }}>
          {!sidebarCollapsed && <Sidebar />}
        </div>
        <main 
          className="main-content"
          style={{ 
            overflow: 'auto',
            padding: '2rem',
            backgroundColor: 'var(--bg)',
            position: 'relative',
            zIndex: 1,
            minWidth: 0
          }}
        >
          {!hydrated ? (
            <LoadingSkeleton />
          ) : (
            <NoteCard />
          )}
        </main>
      </div>
    </div>
    </ErrorBoundary>
  );
}
