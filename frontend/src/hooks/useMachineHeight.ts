import { useEffect, useRef } from "react";

/**
 * Keeps `--machine-h` on <html> equal to the typewriter's height, so a sheet (the report, the
 * rules) can be fed in above it and its backdrop can stop at the platen. The machine changes
 * height with the cookie notice and the width, so it is measured, not fixed. A hidden machine
 * (the record's while a training record is played) measures 0 and is ignored.
 */
export function useMachineHeight<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const machine = ref.current;
    if (machine === null) return;
    const root = document.documentElement;
    const observer = new ResizeObserver(() => {
      const height = machine.getBoundingClientRect().height;
      if (height > 0) root.style.setProperty("--machine-h", `${height}px`);
    });
    observer.observe(machine);
    return () => observer.disconnect();
  }, []);

  return ref;
}
