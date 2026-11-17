import type { CSSProperties, HTMLAttributes } from "react";

type Props = HTMLAttributes<HTMLDivElement> & { cols: number };

/**
 * The board's frame: square cells on an ink grid, sized by the column count. It is a size
 * container, so digits scale with it. Shared by the playable board and the How to play demos.
 */
export function BoardGrid({ cols, className = "", style, children, ...rest }: Props) {
  // --cols drives the grid, the board width and the digit size; it is the one dynamic style value.
  const withCols = { ...style, "--cols": cols } as CSSProperties;
  return (
    <div
      style={withCols}
      className={`@container mx-auto grid w-[min(100%,calc(var(--cols)*var(--cell-max)))] grid-cols-[repeat(var(--cols),minmax(0,1fr))] gap-(--space-board) bg-ink p-(--space-board) ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
