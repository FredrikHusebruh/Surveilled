import type { CSSProperties, HTMLAttributes } from "react";

type Props = HTMLAttributes<HTMLDivElement> & { cols: number; rows: number };

/**
 * The board's frame: square cells on an ink grid, as large as the space it is given allows. The
 * outer box takes whatever height the sheet has left (it is a size container); the grid inside
 * takes the width at which `rows` square cells fit that height, the full width, or `--cell-max`
 * per column, whichever is smallest. The box never shrinks below `--cell-floor` per row: below
 * that, the sheet scrolls instead. The grid is itself a size container, so digits scale with it.
 */
export function BoardGrid({ cols, rows, className = "", style, children, ...rest }: Props) {
  // --cols and --rows drive the grid, the board's size and the digit size: the one dynamic style.
  const vars = { "--cols": cols, "--rows": rows } as CSSProperties;
  return (
    <div
      style={vars}
      className="flex min-h-[calc(var(--rows)*var(--cell-floor)+(var(--rows)+1)*var(--space-board))] flex-1 basis-0 items-center justify-center [container-type:size]"
    >
      <div
        style={style}
        className={`@container grid w-[min(100cqw,calc((100cqh-(var(--rows)+1)*var(--space-board))*var(--cols)/var(--rows)+(var(--cols)+1)*var(--space-board)),calc(var(--cols)*var(--cell-max)))] grid-cols-[repeat(var(--cols),minmax(0,1fr))] gap-(--space-board) bg-ink p-(--space-board) ${className}`}
        {...rest}
      >
        {children}
      </div>
    </div>
  );
}
