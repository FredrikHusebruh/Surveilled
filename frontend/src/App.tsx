import { useRef, useState } from "react";
import { AlarmOverlay } from "./components/AlarmOverlay.tsx";
import { Board } from "./components/Board.tsx";
import { Button } from "./components/Button.tsx";
import { Controls } from "./components/Controls.tsx";
import { CookieNotice } from "./components/CookieNotice.tsx";
import { DevTools } from "./components/DevTools.tsx";
import { HelpButton } from "./components/HelpButton.tsx";
import { SoundButton } from "./components/SoundButton.tsx";
import { LevelTabs } from "./components/LevelTabs.tsx";
import { Masthead } from "./components/Masthead.tsx";
import { MessageLine } from "./components/MessageLine.tsx";
import { PageFooter } from "./components/PageFooter.tsx";
import { Report } from "./components/Report.tsx";
import { RulesCard } from "./components/RulesCard.tsx";
import { ShakeOnAlarm } from "./components/ShakeOnAlarm.tsx";
import { Sheet } from "./components/Sheet.tsx";
import { StartPage } from "./components/StartPage.tsx";
import { StatusStrip } from "./components/StatusStrip.tsx";
import { TrainingScreen } from "./components/TrainingScreen.tsx";
import { TRAINING, romanNumeral } from "./game/copy.ts";
import { useCookieNotice } from "./hooks/useCookieNotice.ts";
import { useDaily } from "./hooks/useDaily.ts";
import { useRecordOpening } from "./hooks/useRecordOpening.ts";
import { useReport } from "./hooks/useReport.ts";
import { useShareCard } from "./hooks/useShareCard.ts";
import { useStanding } from "./hooks/useStanding.ts";
import { useTrainingDone } from "./hooks/useTrainingDone.ts";

/** A training record being played, and whether the orders opened it (so it leads back to them). */
type TrainingVisit = { level: number; fromOrders: boolean };

const LAST_TRAINING = 4;

/**
 * The one page. A record that hasn't started shows as a sealed folder, then its typewritten
 * orders (the start page).
 * Once open, it is a single Ministry form in the order design.md fixes: masthead, level tabs,
 * brief, status strip (with the "?" for the rules card), board, message line, controls. When a
 * record closes, the Archivist's report comes up on a sheet above the board; Show report brings it
 * back. A training record replaces the page below the masthead while it is played; the page stays
 * mounted underneath, hidden, so the orders don't type themselves out again on return.
 * At the foot: the cookie notice until it is acknowledged, then the link to the privacy notice.
 */
export default function App() {
  const play = useDaily();
  const { daily, level, game } = play;
  const opening = useRecordOpening(level);
  const cookieNotice = useCookieNotice();
  const [helpOpen, setHelpOpen] = useState(false);
  const helpButton = useRef<HTMLButtonElement>(null);
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

  return (
    <main
      aria-busy={play.pending}
      className="mx-auto flex max-w-(--sheet-max) flex-col gap-(--space-4) px-(--space-5) pt-5 pb-10"
    >
      <Masthead
        dayNumber={daily?.dayNumber ?? null}
        day={daily?.day ?? null}
        recordNo={training !== null ? "training" : onStartPage ? null : (game?.recordNo ?? null)}
        toppled={daily?.outcome === "toppled"}
      />
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
        {onStartPage ? (
          <StartPage
            dayNumber={daily.dayNumber}
            level={level}
            numeral={romanNumeral(level.level - 1)}
            total={romanNumeral(daily.levels.length - 1)}
            phase={opening.phase}
            pending={play.pending}
            message={play.message}
            trainingFirst={trainingDone.trainingFirst(level.level)}
            onOpen={opening.open}
            onOpened={opening.opened}
            onStart={() => play.openLevel(level.level)}
            onTraining={(trainingLevel, fromOrders) => setTraining({ level: trainingLevel, fromOrders })}
            onSkipTraining={() => trainingDone.markDone(level.level)}
          />
        ) : (
          <>
            {daily !== null && (
              <LevelTabs levels={daily.levels} current={level?.level ?? null} onView={play.viewLevel} />
            )}
            {level !== null && <p className="text-[14px]">{level.brief}</p>}
            {daily !== null && level !== null && game !== null && (
              <>
                <StatusStrip
                  game={game}
                  receivedAt={play.receivedAt}
                  aside={
                    <span className="flex items-center gap-(--space-3)">
                      <SoundButton />
                      <HelpButton ref={helpButton} onOpen={() => setHelpOpen(true)} />
                    </span>
                  }
                />
                <ShakeOnAlarm alarm={play.alarm}>
                  <Board
                    game={game}
                    selected={play.selected}
                    hinted={play.hinted}
                    reveal={play.reveal}
                    justMarked={play.justMarked}
                    onTap={play.tapCell}
                    onMark={play.markCell}
                  />
                </ShakeOnAlarm>
                {report.open && (
                  <Sheet labelledBy="report-title" onClose={report.hide}>
                    <Report
                      daily={daily}
                      level={level.level}
                      game={game}
                      streakDays={play.streakDays}
                      standing={standing}
                      message={play.message}
                      onNext={() => play.viewLevel(level.level + 1)}
                      onShare={shareCard.share}
                    />
                  </Sheet>
                )}
              </>
            )}
            <MessageLine message={play.message} />
            {daily !== null && game !== null && game.status === "play" && (
              <Controls
                hints={daily.hintsAvailable}
                opening={play.opening}
                onHint={play.takeHint}
              />
            )}
            {closed && (
              <Button primary={!report.open} aria-haspopup="dialog" onClick={report.show}>
                Show report
              </Button>
            )}
            {helpOpen && (
              <RulesCard level={level?.level ?? 1} returnFocusTo={helpButton} onClose={() => setHelpOpen(false)} />
            )}
          </>
        )}
      </div>
      {cookieNotice.visible && <CookieNotice onAcknowledge={cookieNotice.acknowledge} />}
      <PageFooter />
      {import.meta.env.DEV && daily !== null && (
        <DevTools
          onReset={play.resetToday}
          levels={daily.levels}
          current={level?.level ?? null}
          onViewLevel={play.viewLevel}
        />
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
