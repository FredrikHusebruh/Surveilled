import { TRAINING, forPointer, romanNumeral } from "../game/copy.ts";
import { trainingCopy } from "../game/training.ts";
import { usePointer } from "../hooks/usePointer.ts";
import { useTraining } from "../hooks/useTraining.ts";
import { AlarmOverlay } from "./AlarmOverlay.tsx";
import { Board } from "./Board.tsx";
import { Controls } from "./Controls.tsx";
import { Letterhead } from "./Letterhead.tsx";
import { MessageLine } from "./MessageLine.tsx";
import { ShakeOnAlarm } from "./ShakeOnAlarm.tsx";
import { SoundButton } from "./SoundButton.tsx";
import { SpaceBar } from "./SpaceBar.tsx";
import { StatusStrip } from "./StatusStrip.tsx";
import { TrainingCard } from "./TrainingCard.tsx";
import { TypewriterFrame } from "./TypewriterFrame.tsx";

type Props = {
  level: number;
  /** The button once the record is filed ("Back to orders", "Next training" or "Done"). */
  finishLabel: string;
  onFinish: () => void;
  /** Leaves the training at any time, filed or not. */
  onLeave: () => void;
  onFiled: (level: number) => void;
};

/**
 * A training record, played on the real game screen: its own sheet in the typewriter, with the
 * letterhead (the training record's name and Leave training), the card for the current step,
 * the status row, the board and the message line; the hints are free keys on the machine. The
 * card introduces the rule and outlines the cell to try it on; once the guided moves are made,
 * the player finishes the record alone. Strikes are real; after three, "Try again" deals the
 * record afresh.
 */
export function TrainingScreen({ level, finishLabel, onFinish, onLeave, onFiled }: Props) {
  const play = useTraining(level, onFiled);
  const pointer = usePointer();
  const copy = trainingCopy(level);
  const { game } = play;
  const filed = game?.status === "won";
  const lost = game?.status === "lost";

  const card = filed
    ? { title: "Rectified", text: copy.done }
    : play.guideIndex === null
      ? copy.free
      : copy.guides[play.guideIndex];
  if (card === undefined) throw new Error(`Training ${level} has no words for guide ${play.guideIndex}.`);

  const paper = (
    <div className="flex min-h-full flex-col gap-(--space-3) px-(--space-3) pt-(--space-3) pb-(--space-2) sm:px-(--space-4)">
      <Letterhead
        dayNumber={null}
        day={null}
        recordNo="training"
        toppled={false}
        title={
          <span className="bg-ink px-1.5 py-1 text-paper">
            {TRAINING.record} {romanNumeral(level - 1)} · {copy.name}
          </span>
        }
        aside={
          <button
            type="button"
            onClick={onLeave}
            className="-my-3 shrink-0 cursor-pointer py-3 font-bold underline decoration-1 underline-offset-2 hover:decoration-2 focus-visible:outline-3 focus-visible:-outline-offset-4 focus-visible:outline-party focus-visible:outline-solid"
          >
            {TRAINING.leave}
          </button>
        }
      />
      <TrainingCard {...card} text={forPointer(card.text, pointer)} />
      {game !== null ? (
        <>
          <StatusStrip game={game} receivedAt={0} training />
          <ShakeOnAlarm alarm={play.alarm}>
            <Board
              game={game}
              selected={play.selected}
              hinted={play.outlined}
              reveal={play.reveal}
              justMarked={play.justMarked}
              onTap={play.tapCell}
              onMark={play.markCell}
            />
          </ShakeOnAlarm>
        </>
      ) : (
        <div className="flex-1" />
      )}
      <MessageLine message={play.message} />
    </div>
  );

  return (
    <>
      <TypewriterFrame sheet={`training:${level}`} paper={paper} left={<SoundButton />}>
        {game?.status === "play" && <Controls hints="free" opening={play.opening} onHint={play.takeHint} />}
        {filed && (
          <SpaceBar primary onClick={onFinish}>
            {finishLabel}
          </SpaceBar>
        )}
        {lost && (
          <SpaceBar primary onClick={play.restart} disabled={play.pending}>
            {TRAINING.tryAgain}
          </SpaceBar>
        )}
      </TypewriterFrame>
      <AlarmOverlay alarm={play.alarm} />
    </>
  );
}
