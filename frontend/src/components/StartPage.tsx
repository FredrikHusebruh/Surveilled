import type { Level } from "../api/schemas.ts";
import { START_PAGE_NOTE, TRAINING } from "../game/copy.ts";
import type { Message } from "../hooks/useBoardPlay.ts";
import type { OpeningPhase } from "../hooks/useRecordOpening.ts";
import { Briefing } from "./Briefing.tsx";
import { Button } from "./Button.tsx";
import { Folder } from "./Folder.tsx";
import { MessageLine } from "./MessageLine.tsx";

type Props = {
  dayNumber: number;
  level: Level;
  numeral: string;
  total: string;
  phase: OpeningPhase;
  pending: boolean;
  message: Message;
  /** Whether this level's orders put its training first. */
  trainingFirst: boolean;
  onOpen: () => void;
  onOpened: () => void;
  onStart: () => void;
  /** Plays a training record: `fromOrders` when the orders opened it, so it leads back to them. */
  onTraining: (level: number, fromOrders: boolean) => void;
  onSkipTraining: () => void;
};

/**
 * A record that hasn't started. Sealed, it is the folder with two actions: Open record and
 * Training, which plays training record I. Opened, it is the typewritten operation orders with
 * Start operation, which starts the record and its clock, and this level's training (first, while
 * its rules are new).
 */
export function StartPage({
  dayNumber,
  level,
  numeral,
  total,
  phase,
  pending,
  message,
  trainingFirst,
  onOpen,
  onOpened,
  onStart,
  onTraining,
  onSkipTraining,
}: Props) {
  // Only failures belong on this page; play instructions wait until the record is open.
  const failure = message.alert && <MessageLine message={message} />;

  if (phase === "briefing") {
    return (
      <>
        <Briefing
          dayNumber={dayNumber}
          level={level.level}
          numeral={numeral}
          total={total}
          name={level.name}
          brief={level.brief}
          pending={pending}
          onStart={onStart}
          trainingFirst={trainingFirst}
          onTraining={() => onTraining(level.level, true)}
          onSkipTraining={onSkipTraining}
        />
        {failure}
      </>
    );
  }

  return (
    <>
      <Folder
        dayNumber={dayNumber}
        numeral={numeral}
        total={total}
        name={level.name}
        opening={phase === "opening"}
        onOpened={onOpened}
      />
      <div className="grid gap-(--space-2)">
        <div className="flex gap-(--space-2)">
          <Button primary className="flex-1" onClick={onOpen} disabled={phase === "opening"}>
            Open record
          </Button>
          <Button className="flex-1" onClick={() => onTraining(1, false)}>
            {TRAINING.open}
          </Button>
        </div>
        <p className="text-center text-[13px] text-muted">{START_PAGE_NOTE}</p>
      </div>
      {failure}
    </>
  );
}
