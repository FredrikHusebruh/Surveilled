import type { HintKind } from "../api/schemas.ts";
import { CameraIcon } from "./CameraIcon.tsx";

/**
 * The symbol on each hint key, the one place besides the camera that the design allows symbols
 * (design.md): a magnifying glass for Open (look at a cell you choose), the camera for Camera, and
 * the camera struck through for Safe (a cell with no camera in it). Drawn like the camera icon:
 * 24px grid, 2px stroke, `currentColor`.
 */
export function HintIcon({ kind, className }: { kind: HintKind; className?: string }) {
  switch (kind) {
    case "open":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="10" cy="10" r="6" />
          <path d="M14.5 14.5 20.5 20.5" strokeWidth={2.5} />
        </svg>
      );
    case "camera":
      return <CameraIcon className={className} />;
    case "safe":
      return (
        <span className={`relative inline-grid ${className ?? ""}`}>
          <CameraIcon className="size-full" />
          <svg viewBox="0 0 24 24" aria-hidden="true" className="absolute inset-0 size-full" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M3 3 21 21" />
          </svg>
        </span>
      );
  }
}
