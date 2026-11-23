import { useEffect } from "react";
import { TRAINING, forPointer, romanNumeral } from "../game/copy.ts";
import { trainingCopy } from "../game/training.ts";
import { usePointer } from "../hooks/usePointer.ts";
import { useTraining } from "../hooks/useTraining.ts";
import { AlarmOverlay } from "./AlarmOverlay.tsx";
import { Board } from "./Board.tsx";
import { Button } from "./Button.tsx";
import { Controls } from "./Controls.tsx";
import { MessageLine } from "./MessageLine.tsx";
import { ShakeOnAlarm } from "./ShakeOnAlarm.tsx";
import { SoundButton } from "./SoundButton.tsx";
import { StatusStrip } from "./StatusStrip.tsx";
import { TrainingCard } from "./TrainingCard.tsx";

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
 * A training record, played on the real game screen: its heading, the card for the current step,
 * the status strip, the board, the message line and the controls. The card introduces the rule and
 * outlines the cell to try it on; once the guided moves are made, the player finishes the record
 * alone. Strikes are real; after three, "Try again" deals the record afresh.
 */
export function TrainingScreen({ level, finishLabel, onFinish, onLeave, onFiled }: Props) {
  const play = useTraining(level, onFiled);
  const pointer = usePointer();
  // Start training sits at the foot of the long orders: begin each record at the top of the page.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [level]);
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

  return (
    <>
      <div className="flex items-center justify-between gap-(--space-3)">
        <p className="text-[12px] tracking-[0.12em] text-muted uppercase">
          {TRAINING.record} {romanNumeral(level - 1)} · {copy.name}
        </p>
        <span className="flex shrink-0 items-center gap-(--space-3)">
          <SoundButton />
          <button
            type="button"
            onClick={onLeave}
            className="shrink-0 cursor-pointer border-[1.5px] border-ink bg-paper px-2 py-1 text-[12px] font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-party focus-visible:outline-solid"
          >
            {TRAINING.leave}
          </button>
        </span>
      </div>
      <TrainingCard {...card} text={forPointer(card.text, pointer)} />
      {game !== null && (
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
      )}
      <MessageLine message={play.message} />
      {game?.status === "play" && (
        <Controls hints="free" opening={play.opening} onHint={play.takeHint} />
      )}
      {filed && (
        <Button primary onClick={onFinish}>
          {finishLabel}
        </Button>
      )}
      {lost && (
        <Button primary onClick={play.restart} disabled={play.pending}>
          {TRAINING.tryAgain}
        </Button>
      )}
      <AlarmOverlay alarm={play.alarm} />
    </>
  );
}
