import type { ComponentPropsWithRef } from "react";

/** An in-text link: ink, underlined, with the board's red focus outline. Never red itself. */
export function TextLink({ className = "", ...props }: ComponentPropsWithRef<"a">) {
  return (
    <a
      className={`text-ink underline decoration-1 underline-offset-2 hover:decoration-2 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-party focus-visible:outline-solid ${className}`}
      {...props}
    />
  );
}
