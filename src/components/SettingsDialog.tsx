import { useState, useMemo, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useNotesStore } from "../state/notes";
import type { ParcelData } from "../types";

type Theme = "light" | "dark" | "night" | "north";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  currentTheme?: Theme;
  onThemeChange?: (theme: Theme) => void;
};

type SettingsTab = "appearance" | "data" | "keyboard" | "about";

export default function SettingsDialog({ isOpen, onClose, currentTheme, onThemeChange }: Props) {
  const { notes, folders, hydrateFromDisk } = useNotesStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>("appearance");
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const modKey = useMemo(() => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    return isMac ? '⌘' : 'Ctrl';
  }, []);

  // Handle Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const themes: { value: Theme; label: string; description: string }[] = [
    { value: "light", label: "Light", description: "Warm, bright workspace" },
    { value: "dark", label: "Dark", description: "Cozy, low-light environment" },
    { value: "night", label: "Night", description: "Deep, minimal darkness" },
    { value: "north", label: "North", description: "Cool, crisp brightness" },
  ];

  const handleExportJSON = async () => {
    try {
      setIsExporting(true);
      setMessage(null);

      const data: ParcelData = {
        version: 1,
        notes,
        folders,
      };

      const json = await invoke<string>("export_notes_json", { data });

      // Create a download link for the JSON
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `parcel-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setMessage({ type: "success", text: "Notes exported successfully!" });
    } catch (e) {
      setMessage({ type: "error", text: `Export failed: ${e}` });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportMarkdown = async () => {
    try {
      setIsExporting(true);
      setMessage(null);

      const data: ParcelData = {
        version: 1,
        notes,
        folders,
      };

      const markdown = await invoke<string>("export_notes_markdown", { data });

      // Create a download link for the Markdown
      const blob = new Blob([markdown], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `parcel-export-${new Date().toISOString().split("T")[0]}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setMessage({ type: "success", text: "Notes exported to Markdown successfully!" });
    } catch (e) {
      setMessage({ type: "error", text: `Export failed: ${e}` });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    try {
      setIsImporting(true);
      setMessage(null);

      // Create file input for import
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json";
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          setIsImporting(false);
          return;
        }

        try {
          const content = await file.text();
          const data: ParcelData = JSON.parse(content);

        // Validate data structure
        if (!data.notes || !data.folders) {
          throw new Error("Invalid file format");
        }

        // Confirm import
        const confirmed = window.confirm(
          `This will replace all current notes and folders.\n\n` +
          `Importing: ${data.notes.length} notes, ${data.folders.length} folders\n` +
          `Current: ${notes.length} notes, ${folders.length} folders\n\n` +
          `Continue?`
        );

        if (!confirmed) {
          setIsImporting(false);
          return;
        }

        // Import data
        await invoke("save_notes", { data });
        
          // Reload from disk
          await hydrateFromDisk();
          
          setMessage({ type: "success", text: "Notes imported successfully!" });
        } catch (err) {
          setMessage({ type: "error", text: `Import failed: ${err}` });
        } finally {
          setIsImporting(false);
        }
      };
      input.click();
    } catch (e) {
      setMessage({ type: "error", text: `Import failed: ${e}` });
      setIsImporting(false);
    }
  };

  const handleShowDataDir = async () => {
    try {
      const dir = await invoke<string>("get_data_dir");
      alert(`Your Parcel data is stored at:\n\n${dir}\n\nnotes.json contains all your notes and folders.`);
    } catch (e) {
      setMessage({ type: "error", text: `Failed to get data directory: ${e}` });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
      onClick={onClose}
    >
      <div
        className="desk-card p-0 max-w-3xl mx-4 w-full max-h-[90vh] overflow-hidden flex flex-col"
        style={{ backgroundColor: "var(--panel-bg)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b" style={{ borderColor: "var(--border-soft)" }}>
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold" style={{ color: "var(--text-main)" }}>
              Settings
            </h3>
            <button
              type="button"
              className="btn-icon"
              onClick={onClose}
              title="Close (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: "var(--border-soft)" }}>
          {[
            { id: "appearance" as SettingsTab, label: "Appearance", icon: "🎨" },
            { id: "data" as SettingsTab, label: "Data", icon: "💾" },
            { id: "keyboard" as SettingsTab, label: "Keyboard", icon: "⌨️" },
            { id: "about" as SettingsTab, label: "About", icon: "ℹ️" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setMessage(null);
              }}
              className={`px-4 py-3 text-sm font-medium transition ${
                activeTab === tab.id ? "note-item-active" : "note-item"
              }`}
              style={{
                borderBottom: activeTab === tab.id ? "2px solid var(--accent)" : "2px solid transparent",
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "appearance" && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold mb-3" style={{ color: "var(--text-main)" }}>
                  Theme
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {themes.map((themeOption) => (
                    <button
                      key={themeOption.value}
                      type="button"
                      onClick={() => onThemeChange?.(themeOption.value)}
                      className={`p-4 rounded-lg border-2 text-left transition ${
                        currentTheme === themeOption.value
                          ? "note-item-active"
                          : "note-item"
                      }`}
                      style={{
                        borderColor:
                          currentTheme === themeOption.value
                            ? "var(--accent)"
                            : "var(--border-soft)",
                      }}
                    >
                      <div className="font-medium mb-1" style={{ color: "var(--text-main)" }}>
                        {themeOption.label}
                      </div>
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {themeOption.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "data" && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold mb-3" style={{ color: "var(--text-main)" }}>
                  Export Data
                </h4>
                <div className="flex gap-3">
                  <button
                    type="button"
                    className="btn-soft flex-1"
                    onClick={handleExportJSON}
                    disabled={isExporting}
                  >
                    {isExporting ? "Exporting..." : "📄 Export JSON"}
                  </button>
                  <button
                    type="button"
                    className="btn-soft flex-1"
                    onClick={handleExportMarkdown}
                    disabled={isExporting}
                  >
                    {isExporting ? "Exporting..." : "📝 Export Markdown"}
                  </button>
                </div>
                <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                  Export all your notes and folders to a file
                </p>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-3" style={{ color: "var(--text-main)" }}>
                  Import Data
                </h4>
                <button
                  type="button"
                  className="btn-primary w-full"
                  onClick={handleImport}
                  disabled={isImporting}
                >
                  {isImporting ? "Importing..." : "📥 Import from JSON"}
                </button>
                <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                  This will replace all current notes and folders
                </p>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-3" style={{ color: "var(--text-main)" }}>
                  Data Location
                </h4>
                <button
                  type="button"
                  className="btn-soft w-full"
                  onClick={handleShowDataDir}
                >
                  📂 Show Data Directory
                </button>
                <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                  Your notes are stored locally in human-readable JSON format
                </p>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-3" style={{ color: "var(--text-main)" }}>
                  Statistics
                </h4>
                <div className="desk-panel p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div style={{ color: "var(--text-muted)" }}>Total Notes</div>
                      <div className="text-lg font-semibold" style={{ color: "var(--text-main)" }}>
                        {notes.length}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: "var(--text-muted)" }}>Folders</div>
                      <div className="text-lg font-semibold" style={{ color: "var(--text-main)" }}>
                        {folders.length}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "keyboard" && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold mb-4" style={{ color: "var(--text-main)" }}>
                  Keyboard Shortcuts
                </h4>
                <div className="space-y-3">
                  {[
                    { keys: `${modKey}+N`, action: "Create new note" },
                    { keys: `${modKey}+K`, action: "Focus search" },
                    { keys: `${modKey}+B`, action: "Toggle sidebar" },
                    { keys: "↑/↓", action: "Navigate notes" },
                    { keys: "Home/End", action: "First/Last note" },
                    { keys: `${modKey}+P`, action: "Pin/Unpin note" },
                    { keys: `${modKey}+Z`, action: "Undo" },
                    { keys: `${modKey}+⇧+Z`, action: "Redo" },
                    { keys: `${modKey}+⌫`, action: "Delete note" },
                  ].map((shortcut, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-2 border-b"
                      style={{ borderColor: "var(--border-soft)" }}
                    >
                      <span style={{ color: "var(--text-muted)" }}>{shortcut.action}</span>
                      <kbd
                        className="px-2 py-1 rounded text-xs font-mono"
                        style={{
                          backgroundColor: "var(--panel-bg)",
                          border: "1px solid var(--border-soft)",
                          color: "var(--text-main)",
                        }}
                      >
                        {shortcut.keys}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "about" && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold mb-3" style={{ color: "var(--text-main)" }}>
                  About Parcel
                </h4>
                <div className="desk-panel p-4 space-y-3">
                  <div>
                    <div className="text-2xl font-semibold mb-2" style={{ color: "var(--text-main)" }}>
                      ✉️ Parcel
                    </div>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                      A warm, local note-taking app. Your notes stay on your device.
                    </p>
                  </div>
                  <div className="pt-3 border-t" style={{ borderColor: "var(--border-soft)" }}>
                    <div className="text-xs space-y-1" style={{ color: "var(--text-muted)" }}>
                      <div>Version 1.0.0</div>
                      <div>Built with Tauri & React</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer with messages */}
        {(message || activeTab === "data") && (
          <div className="p-4 border-t" style={{ borderColor: "var(--border-soft)" }}>
            {message && (
              <div
                className={`p-3 rounded-md text-sm ${
                  message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                }`}
                style={{
                  backgroundColor:
                    message.type === "success"
                      ? "rgba(34, 197, 94, 0.1)"
                      : "rgba(239, 68, 68, 0.1)",
                  color:
                    message.type === "success"
                      ? "rgb(22, 101, 52)"
                      : "rgb(153, 27, 27)",
                }}
              >
                {message.text}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


