import type { Message } from "../hooks/useBoardPlay.ts";

/**
 * The line being typed, just above the platen, where every message goes. It keeps three lines'
 * height, so a message never moves the board. Alerts use --party-text for contrast.
 */
export function MessageLine({ message }: { message: Message }) {
  return (
    <p
      aria-live="polite"
      className={`min-h-[4.05em] text-[13px] leading-[1.35] ${message.alert ? "font-bold text-party-text" : ""}`}
    >
      {message.text}
    </p>
  );
}
