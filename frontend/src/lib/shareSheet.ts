export type ShareResult = "shared" | "copied" | "cancelled";

/**
 * Hands `text` to the phone's share sheet on touch devices, otherwise copies it to the clipboard.
 * Dismissing the share sheet is a normal choice, reported as "cancelled". Anything else throws.
 */
export async function shareOrCopy(text: string): Promise<ShareResult> {
  const touch = window.matchMedia("(pointer: coarse)").matches;
  if (touch && typeof navigator.share === "function") {
    try {
      await navigator.share({ text });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
      throw error;
    }
  }
  await navigator.clipboard.writeText(text);
  return "copied";
}
