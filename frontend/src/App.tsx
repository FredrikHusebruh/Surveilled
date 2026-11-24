import { useState } from "react";
import type { ReactNode } from "react";
import { AlarmOverlay } from "./components/AlarmOverlay.tsx";
import { Briefing } from "./components/Briefing.tsx";
import { Button } from "./components/Button.tsx";
import { Controls } from "./components/Controls.tsx";
import { CookieNotice } from "./components/CookieNotice.tsx";
import { Desk } from "./components/Desk.tsx";
import { DevTools } from "./components/DevTools.tsx";
import { HelpButton } from "./components/HelpButton.tsx";
import { MessageLine } from "./components/MessageLine.tsx";
import { RecordScreen } from "./components/RecordScreen.tsx";
import { Report } from "./components/Report.tsx";
import { RulesCard } from "./components/RulesCard.tsx";
import { SoundButton } from "./components/SoundButton.tsx";
import { SpaceBar } from "./components/SpaceBar.tsx";
import { StartPage } from "./components/StartPage.tsx";
import { TrainingScreen } from "./components/TrainingScreen.tsx";
import { TypewriterFrame } from "./components/TypewriterFrame.tsx";
import { TRAINING, romanNumeral } from "./game/copy.ts";
import { useCookieNotice } from "./hooks/useCookieNotice.ts";
import { useDaily } from "./hooks/useDaily.ts";
import { useRecordOpening } from "./hooks/useRecordOpening.ts";
import { useReport } from "./hooks/useReport.ts";
import { useShareCard } from "./hooks/useShareCard.ts";
import { useSideSheet } from "./hooks/useSideSheet.ts";
import { useStanding } from "./hooks/useStanding.ts";
import { useTrainingDone } from "./hooks/useTrainingDone.ts";
import { wakeSound } from "./lib/sound.ts";

/** A training record being played, and whether the orders opened it (so it leads back to them). */
type TrainingVisit = { level: number; fromOrders: boolean };

const LAST_TRAINING = 4;

/**
 * The one page. A record that hasn't been opened is a sealed folder on the desk (`Desk`); opened,
 * its orders unfold on the desk with Start operation under them. Everything after that is a sheet
 * in the typewriter (`TypewriterFrame`), exactly one screen tall: the record's sheet
 * (`RecordScreen`) with the hints as keys. When a record closes, the Archivist's report is fed in in its place, and the "?"
 * feeds in the rules the same way; "Back to record" returns to the record, which stays mounted
 * underneath, and Show report brings the report back. A training record is played on its own sheet; the day's
 * typewriter stays mounted underneath, hidden, so the orders don't type themselves out again on
 * return. The cookie notice sits at the foot of the desk, or on the machine, until acknowledged.
 */
export default function App() {
  const play = useDaily();
  const { daily, level, game } = play;
  const opening = useRecordOpening(level);
  const cookieNotice = useCookieNotice();
  const [helpOpen, setHelpOpen] = useState(false);
  const [training, setTraining] = useState<TrainingVisit | null>(null);
  const trainingDone = useTrainingDone();
  const onStartPage = daily !== null && level !== null && level.state === "open";
  const closed = game !== null && game.status !== "play";
  const report = useReport(closed && daily !== null && level !== null ? `${daily.day}:${level.level}` : null, game?.status === "lost");

  const dayOver = daily !== null && daily.outcome !== "playing";
  // Refreshed each time the report opens: other time zones keep finishing the same day.
  const standing = useStanding(dayOver ? daily.day : null, report.open);
  const shareCard = useShareCard(
    daily,
    play.streakDays,
    standing.status === "ready" ? standing.standing : null,
    play.notify,
  );

  // The report or the rules, fed into the typewriter in the record's place.
  const side = report.open ? "report" : helpOpen ? "rules" : null;
  const closeSide = side === "report" ? report.hide : () => setHelpOpen(false);
  const sideHeading = useSideSheet(side, closeSide);

  const startTraining = (trainingLevel: number, fromOrders: boolean) => {
    wakeSound();
    setTraining({ level: trainingLevel, fromOrders });
  };
  const notice = cookieNotice.visible && (
    <CookieNotice onAcknowledge={cookieNotice.acknowledge} />
  );

  let screen: ReactNode;
  if (onStartPage && opening.phase !== "briefing") {
    screen = (
      <Desk dayNumber={daily.dayNumber} day={daily.day} toppled={daily.outcome === "toppled"} notice={notice}>
        <StartPage
          dayNumber={daily.dayNumber}
          level={level}
          numeral={romanNumeral(level.level - 1)}
          total={romanNumeral(daily.levels.length - 1)}
          opening={opening.phase === "opening"}
          message={play.message}
          onOpen={() => {
            wakeSound();
            opening.open();
          }}
          onOpened={opening.opened}
          onTraining={() => startTraining(1, false)}
        />
      </Desk>
    );
  } else if (onStartPage) {
    // The orders, out of the folder and on the desk. Start operation is what starts the record and
    // its clock, and feeds the record's sheet into the typewriter.
    const trainingFirst = trainingDone.trainingFirst(level.level);
    screen = (
      <Desk dayNumber={daily.dayNumber} day={daily.day} toppled={daily.outcome === "toppled"} notice={notice} fixedHeight>
        <Briefing
          dayNumber={daily.dayNumber}
          level={level.level}
          numeral={romanNumeral(level.level - 1)}
          total={romanNumeral(daily.levels.length - 1)}
          name={level.name}
          brief={level.brief}
        />
        {play.message.alert && <MessageLine message={play.message} />}
        <div className="flex gap-(--space-2)">
          {trainingFirst ? (
            <>
              <Button primary className="flex-1" onClick={() => startTraining(level.level, true)}>
                {TRAINING.start}
              </Button>
              <Button className="flex-1" onClick={() => trainingDone.markDone(level.level)}>
                {TRAINING.skip}
              </Button>
            </>
          ) : (
            <>
              <Button
                primary
                className="flex-1"
                disabled={play.pending}
                onClick={() => {
                  wakeSound();
                  play.openLevel(level.level);
                }}
              >
                Start operation
              </Button>
              <Button className="flex-1" onClick={() => startTraining(level.level, true)}>
                {TRAINING.open}
              </Button>
            </>
          )}
        </div>
      </Desk>
    );
  } else {
    const nextOpen = daily !== null && level !== null && daily.levels[level.level]?.state === "open";
    screen = (
      <TypewriterFrame
        sheet={`${side ?? "record"}:${daily?.day ?? ""}:${level?.level ?? ""}`}
        notice={notice}
        left={<SoundButton />}
        right={game !== null && <HelpButton open={helpOpen} onToggle={() => setHelpOpen((open) => !open)} />}
        paper={
          <>
            <div className={side === null ? "contents" : "hidden"}>
              <RecordScreen
                daily={daily}
                level={level}
                game={game}
                receivedAt={play.receivedAt}
                selected={play.selected}
                hinted={play.hinted}
                reveal={play.reveal}
                justMarked={play.justMarked}
                alarm={play.alarm}
                message={play.message}
                onView={play.viewLevel}
                onTap={play.tapCell}
                onMark={play.markCell}
              />
            </div>
            {side === "report" && daily !== null && level !== null && game !== null && (
              <Report
                daily={daily}
                level={level.level}
                game={game}
                streakDays={play.streakDays}
                standing={standing}
                message={play.message}
                headingRef={sideHeading}
              />
            )}
            {side === "rules" && <RulesCard level={level?.level ?? 1} headingRef={sideHeading} />}
          </>
        }
      >
        {side === null && daily !== null && game !== null && game.status === "play" && (
          <Controls hints={daily.hintsAvailable} opening={play.opening} onHint={play.takeHint} />
        )}
        {side === null && closed && (
          <SpaceBar primary onClick={report.show}>
            Show report
          </SpaceBar>
        )}
        {side === "report" && nextOpen && (
          <SpaceBar primary onClick={() => play.viewLevel(level.level + 1)}>
            Next record
          </SpaceBar>
        )}
        {side === "report" && dayOver && (
          <SpaceBar primary onClick={shareCard.share}>
            Share result
          </SpaceBar>
        )}
        {side !== null && <SpaceBar onClick={closeSide}>Back to record</SpaceBar>}
      </TypewriterFrame>
    );
  }

  return (
    <main aria-busy={play.pending}>
      {training !== null && (
        <TrainingScreen
          key={training.level}
          level={training.level}
          finishLabel={trainingFinishLabel(training)}
          onFinish={() => setTraining(nextTraining(training))}
          onLeave={() => setTraining(null)}
          onFiled={trainingDone.markDone}
        />
      )}
      <div className={training === null ? "contents" : "hidden"}>
        {screen}
      </div>
      {import.meta.env.DEV && daily !== null && (
        <div className="mx-auto max-w-(--sheet-max) px-(--space-5) py-(--space-4)">
          <DevTools
            onReset={play.resetToday}
            levels={daily.levels}
            current={level?.level ?? null}
            onViewLevel={play.viewLevel}
          />
        </div>
      )}
      <AlarmOverlay alarm={play.alarm} />
    </main>
  );
}

/** The button that ends a filed training: back to the orders that opened it, else on to the next. */
function trainingFinishLabel(training: TrainingVisit): string {
  if (training.fromOrders) return TRAINING.backToOrders;
  return training.level < LAST_TRAINING ? TRAINING.next : TRAINING.done;
}

function nextTraining(training: TrainingVisit): TrainingVisit | null {
  if (training.fromOrders || training.level >= LAST_TRAINING) return null;
  return { level: training.level + 1, fromOrders: false };
}
