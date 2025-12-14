import { useEffect, useRef } from "react";

export function useDebouncedEffect(
  effect: () => void | (() => void),
  deps: unknown[],
  delayMs: number
) {
  const cleanupRef = useRef<void | (() => void) | undefined>(undefined);
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (cleanupRef.current) cleanupRef.current();
      const maybeCleanup = effect();
      cleanupRef.current = maybeCleanup ?? undefined;
    }, delayMs);

    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
