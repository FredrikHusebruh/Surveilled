import type { Daily, Game, Level } from "../api/schemas.ts";
import type { Alarm, Message } from "../hooks/useBoardPlay.ts";
import { Board } from "./Board.tsx";
import { Letterhead } from "./Letterhead.tsx";
import { LevelTabs } from "./LevelTabs.tsx";
import { MessageLine } from "./MessageLine.tsx";
import { ShakeOnAlarm } from "./ShakeOnAlarm.tsx";
import { StatusStrip } from "./StatusStrip.tsx";

type Props = {
  /** The day, or null while it loads (the sheet then holds only the letterhead and the message). */
  daily: Daily | null;
  level: Level | null;
  game: Game | null;
  receivedAt: number;
  selected: number | null;
  hinted: number | null;
  reveal: ReadonlyMap<number, number> | null;
  justMarked: number | null;
  alarm: Alarm | null;
  message: Message;
  onView: (level: number) => void;
  onTap: (cell: number) => void;
  onMark: (cell: number) => void;
};

/**
 * What is typed on a record's sheet, top to bottom: the letterhead, the levels as tab stops, the
 * status row, the board (which takes all the height left) and the message line, just above the
 * platen. Nothing here scrolls unless the screen is too short for the board's smallest cells.
 */
export function RecordScreen({ daily, level, game, receivedAt, alarm, message, onView, ...board }: Props) {
  return (
    <div className="flex min-h-full flex-col gap-(--space-3) px-(--space-3) pt-(--space-3) pb-(--space-2) sm:px-(--space-4)">
      <Letterhead
        dayNumber={daily?.dayNumber ?? null}
        day={daily?.day ?? null}
        recordNo={game?.recordNo ?? null}
        toppled={daily?.outcome === "toppled"}
      />
      {daily !== null && <LevelTabs levels={daily.levels} current={level?.level ?? null} onView={onView} />}
      {game !== null ? (
        <>
          <StatusStrip game={game} receivedAt={receivedAt} />
          <ShakeOnAlarm alarm={alarm}>
            <Board game={game} {...board} />
          </ShakeOnAlarm>
        </>
      ) : (
        <div className="flex-1" />
      )}
      <MessageLine message={message} />
    </div>
  );
}
