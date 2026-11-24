import type { Level } from "../api/schemas.ts";
import { START_PAGE_NOTE, TRAINING } from "../game/copy.ts";
import type { Message } from "../hooks/useBoardPlay.ts";
import { Button } from "./Button.tsx";
import { Folder } from "./Folder.tsx";
import { MessageLine } from "./MessageLine.tsx";

type Props = {
  dayNumber: number;
  level: Level;
  numeral: string;
  total: string;
  /** True while the folder is being opened. */
  opening: boolean;
  message: Message;
  onOpen: () => void;
  onOpened: () => void;
  /** Plays training record I, leading on through IV. */
  onTraining: () => void;
};

/**
 * A record that hasn't been opened: the sealed folder on the desk, with two actions, Open record
 * and How to play. Opening it breaks the seal; the orders inside are then fed into the typewriter.
 * The folder is sized by the screen's height as well as its width, so the page fits one screen.
 */
export function StartPage({ dayNumber, level, numeral, total, opening, message, onOpen, onOpened, onTraining }: Props) {
  return (
    <>
      <div className="mx-auto w-full max-w-[max(240px,calc((100dvh-330px)*1.5))]">
        <Folder
          dayNumber={dayNumber}
          numeral={numeral}
          total={total}
          name={level.name}
          opening={opening}
          onOpened={onOpened}
        />
      </div>
      <div className="grid gap-(--space-2)">
        <div className="flex gap-(--space-2)">
          <Button primary className="flex-1" onClick={onOpen} disabled={opening}>
            Open record
          </Button>
          <Button className="flex-1" onClick={onTraining}>
            {TRAINING.open}
          </Button>
        </div>
        <p className="text-center text-[13px] text-muted">{START_PAGE_NOTE}</p>
      </div>
      {/* Only failures belong on this page; play instructions wait until the record is open. */}
      {message.alert && <MessageLine message={message} />}
    </>
  );
}
