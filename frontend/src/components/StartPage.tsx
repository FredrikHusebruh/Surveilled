import { useRef, useState } from "react";
import type { Level } from "../api/schemas.ts";
import { START_PAGE_NOTE } from "../game/copy.ts";
import type { Message } from "../hooks/useDaily.ts";
import type { OpeningPhase } from "../hooks/useRecordOpening.ts";
import { Briefing } from "./Briefing.tsx";
import { Button } from "./Button.tsx";
import { Folder } from "./Folder.tsx";
import { HowToPlay } from "./HowToPlay.tsx";
import { MessageLine } from "./MessageLine.tsx";

type Props = {
  dayNumber: number;
  level: Level;
  numeral: string;
  total: string;
  /** The day's level names, for the How to play progression demo. */
  levelNames: string[];
  phase: OpeningPhase;
  pending: boolean;
  message: Message;
  onOpen: () => void;
  onOpened: () => void;
  onStart: () => void;
};

/**
 * A record that hasn't started. Sealed, it is the folder with two actions: Open record and How
 * to play. Opened, it is the typewritten operation orders with Start operation, which starts the
 * record and its clock.
 */
export function StartPage({
  dayNumber,
  level,
  numeral,
  total,
  levelNames,
  phase,
  pending,
  message,
  onOpen,
  onOpened,
  onStart,
}: Props) {
  const [helpOpen, setHelpOpen] = useState(false);
  const helpButton = useRef<HTMLButtonElement>(null);
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
          <Button ref={helpButton} className="flex-1" aria-haspopup="dialog" onClick={() => setHelpOpen(true)}>
            How to play
          </Button>
        </div>
        <p className="text-center text-[13px] text-muted">{START_PAGE_NOTE}</p>
      </div>
      {failure}
      {helpOpen && (
        <HowToPlay levelNames={levelNames} returnFocusTo={helpButton} onClose={() => setHelpOpen(false)} />
      )}
    </>
  );
}
