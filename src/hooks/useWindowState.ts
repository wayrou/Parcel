import { useEffect } from "react";

export function useWindowState() {
  useEffect(() => {
    // Only run in Tauri environment - check if Tauri is available
    let isTauri = false;
    try {
      isTauri = typeof window !== 'undefined' && '__TAURI__' in window;
    } catch {
      // Not in Tauri environment
      return;
    }

    if (!isTauri) {
      return;
    }

    // Clear potentially bad window state on first run after this fix
    // This will reset window position if it was saved off-screen
    const windowStateVersion = localStorage.getItem("parcel-window-state-version");
    if (!windowStateVersion || windowStateVersion !== "2") {
      // Clear old window state that might be invalid
      localStorage.removeItem("parcel-window-state");
      localStorage.setItem("parcel-window-state-version", "2");
      // Don't restore on this run - let window use default position
      return;
    }

    const restoreWindowState = async () => {
      try {
        const { getCurrentWindow, LogicalSize, LogicalPosition } = await import("@tauri-apps/api/window");
        const appWindow = getCurrentWindow();
        
        // Restore window size and position from localStorage
        const savedState = localStorage.getItem("parcel-window-state");
        if (savedState) {
          const { width, height, x, y } = JSON.parse(savedState);
          
          // Validate that the saved position is reasonable (not off-screen)
          // Check if position is within reasonable bounds (e.g., within -1000 to 10000 pixels)
          const isValidPosition = x >= -1000 && x <= 10000 && y >= -1000 && y <= 10000;
          const isValidSize = width >= 400 && width <= 10000 && height >= 300 && height <= 10000;
          
          if (isValidSize) {
            await appWindow.setSize(new LogicalSize(width, height));
          }
          
          if (isValidPosition) {
            await appWindow.setPosition(new LogicalPosition(x, y));
          } else {
            // If position is invalid, center the window on screen
            try {
              await appWindow.center();
            } catch {
              // If center fails, just don't restore position - window will use default
            }
          }
        }
      } catch (e) {
        // Window APIs might not be available - fail silently
        // console.warn("Failed to restore window state:", e);
      }
    };

    const saveWindowState = async () => {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const appWindow = getCurrentWindow();
        const size = await appWindow.innerSize();
        const position = await appWindow.outerPosition();
        
        localStorage.setItem("parcel-window-state", JSON.stringify({
          width: size.width,
          height: size.height,
          x: position.x,
          y: position.y,
        }));
      } catch (e) {
        // Fail silently - window state saving is optional
      }
    };

    // Restore on mount
    restoreWindowState().catch(() => {
      // Ignore errors
    });

    // Save window state periodically
    const interval = setInterval(() => {
      saveWindowState().catch(() => {
        // Ignore errors
      });
    }, 2000);

    return () => {
      clearInterval(interval);
      // Final save on unmount
      saveWindowState().catch(() => {
        // Ignore errors
      });
    };
  }, []);
}

