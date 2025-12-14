export function uuid(): string {
  // Works in modern browsers + Tauri WebView.
  return crypto.randomUUID();
}
