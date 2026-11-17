import { useEffect, useRef } from "react";
import type { KeyboardEvent, MouseEvent, ReactNode, RefObject } from "react";

type Props = {
  /** The id of the sheet's heading, which names the dialog. */
  labelledBy: string;
  onClose: () => void;
  /** Where focus goes when the sheet is gone. Defaults to whatever had focus when it opened. */
  returnFocusTo?: RefObject<HTMLElement | null>;
  onKeyDown?: (event: KeyboardEvent<HTMLDialogElement>) => void;
  children: ReactNode;
};

/**
 * A paper sheet on its own layer above the page: How to play and the Archivist's report. Mount it
 * to open it. It closes with its ×, Escape, or a click on the backdrop.
 *
 * It is a native <dialog> opened with showModal(), so the page behind is inert and focus stays
 * inside; the page can't scroll behind it; focus goes back when it is gone.
 */
export function Sheet({ labelledBy, onClose, returnFocusTo, onKeyDown, children }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // Captured on the first render, before the sheet takes focus.
  const openerRef = useRef(document.activeElement instanceof HTMLElement ? document.activeElement : null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;
    const opener = returnFocusTo?.current ?? openerRef.current;
    if (!dialog.open) dialog.showModal();
    document.documentElement.classList.add("overflow-hidden");
    // No dialog.close() here: unmounting removes the dialog from the page, which ends the modal
    // state by itself. Calling close() would queue a "close" event that closes the next opening.
    return () => {
      document.documentElement.classList.remove("overflow-hidden");
      opener?.focus();
    };
  }, [returnFocusTo]);

  const closeOnBackdrop = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onClick={closeOnBackdrop}
      onKeyDown={onKeyDown}
      className="m-auto max-h-[calc(100dvh-24px)] w-[calc(100%-24px)] max-w-(--sheet-max) overflow-y-auto border-[1.5px] border-ink bg-paper p-0 text-ink backdrop:bg-ink/75"
    >
      <div className="relative">
        {children}
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute top-(--space-4) right-(--space-4) z-10 grid size-11 cursor-pointer place-items-center border-[1.5px] border-ink bg-paper text-[30px] leading-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-party focus-visible:outline-solid"
        >
          ×
        </button>
      </div>
    </dialog>
  );
}
