import type { Game } from "../api/schemas.ts";
import { cellPosition, sightDistances } from "../game/board.ts";
import { useBoardInput } from "../hooks/useBoardInput.ts";
import { BoardCell } from "./BoardCell.tsx";
import { BoardGrid } from "./BoardGrid.tsx";

type Props = {
  game: Game;
  selected: number | null;
  hinted: number | null;
  onTap: (cell: number) => void;
  onMark: (cell: number) => void;
};

/** The playable board. Nothing may overlap it (design rule 5). */
export function Board({ game, selected, hinted, onTap, onMark }: Props) {
  const input = useBoardInput({ cols: game.cols, cellCount: game.cells.length, onTap, onMark });
  const gaze = selected === null ? new Map<number, number>() : sightDistances(game, selected);

  return (
    <BoardGrid
      cols={game.cols}
      role="group"
      aria-label={`Record ${game.rows} rows by ${game.cols} columns`}
      {...input}
    >
      {game.cells.map((cell, index) => (
        <BoardCell
          key={index}
          cell={cell}
          index={index}
          lies={game.lies}
          position={cellPosition(game, index)}
          gazeDistance={gaze.get(index)}
          selected={index === selected}
          hinted={index === hinted}
        />
      ))}
    </BoardGrid>
  );
}
