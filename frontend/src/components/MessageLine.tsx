import type { Message } from "../hooks/useDaily.ts";

/** The line under the board where every message goes. Alerts use --party-text for contrast on concrete. */
export function MessageLine({ message }: { message: Message }) {
  return (
    <p aria-live="polite" className={`min-h-[3em] text-[14px] ${message.alert ? "font-bold text-party-text" : ""}`}>
      {message.text}
    </p>
  );
}
