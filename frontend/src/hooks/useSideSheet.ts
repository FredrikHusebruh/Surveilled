import { useEffect, useRef } from "react";

/**
 * For a sheet that takes the record's place in the typewriter for a while (the report, the
 * rules), named by `sheet` (null while the record itself is in): while one is in, Escape closes
 * it and focus moves to its heading (give the heading the returned ref and `tabIndex={-1}`), so a
 * screen reader reads the new sheet. When it goes, focus goes back to whatever had it before it
 * came, if that is still on the page.
 */
export function useSideSheet(sheet: string | null, onClose: () => void) {
  const heading = useRef<HTMLHeadingElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (sheet === null) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    heading.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [sheet]);

  return heading;
}
