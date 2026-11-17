/**
 * The CCTV camera, the game's only icon (design.md): a housing tilted down toward the viewer, its
 * lens, and the wall bracket. 24px grid, 2px stroke, colored by `currentColor`.
 */
export function CameraIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M2.5 11 15.5 6.5 18 13.5 5 18Z" />
      <path d="M16.75 10H21M21 6v8" />
      <circle cx="7" cy="13.6" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}
