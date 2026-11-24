import { MARK_GESTURE, type PointerText } from "./copy.ts";

/**
 * The operation orders inside each folder: a typewritten letter from the resistance that tells
 * the day's story one assignment at a time, then the orders for playing that level.
 *
 * The story: the player is a draughtsman in the Ministry's Planning Office. Every floor plan
 * crosses their desk, but the cameras are drawn elsewhere; only their counts reach the plans. Each
 * record is one plan: the player marks its cameras, checking the doubtful spots in person on their
 * rounds (a camera there sees them: a strike), so that the resistance's team can go in unseen.
 * Filing level IV is the night the team goes in.
 *
 * Copy rules still apply (design.md rule 10): flat, second person, no exclamation marks, no jokes.
 * Only cameras see: a number counts the cameras that can see its cell. The setting is ours: never
 * quote or borrow Orwell's text, characters or organisations.
 */

export const OPERATION = "Operation Blind Spot";
export const SENDER = "The Archivist";
export const RECIPIENT = "Draughtsman, Planning Office";
export const SALUTATION = "Draughtsman,";
export const SIGN_OFF = "The Archivist";
export const DESTROY_NOTE = "Destroy after reading. The clock starts when you start the operation.";

export type Briefing = {
  /** The story so far, one paragraph per entry. */
  backstory: string[];
  /** How to play this level, after the level's own brief. */
  /** The orders; one that names a gesture names the player's. */
  orders: PointerText[];
};

const BRIEFINGS: Record<number, Briefing> = {
  1: {
    backstory: [
      "You draw the Ministry's floor plans. Every plan in the building crosses your desk, but the cameras are drawn by the Surveillance Office and filed apart from yours. All that reaches you are the counts in its margins: for some points on a plan, how many cameras can see them.",
      "We are going into the Ministry. Our team must know where every camera is before they set foot inside. You will mark them on your plans.",
      "Start with the clerks' hall on the ground floor, where the team comes in. The counts will not settle every spot. Where they leave doubt, check the spot yourself on your rounds.",
      "Your pass explains your presence on the floor. It does not explain lingering where a camera can see you. One sighting passes for an errand. Three bring an inspector.",
    ],
    orders: [
      "Clear every cell that isn't a camera.",
      (pointer) => `Mark each camera you find: ${MARK_GESTURE[pointer]}.`,
      "A number counts the cameras that can see its cell, along its row and column.",
      "Three strikes end your day.",
    ],
  },
  2: {
    backstory: [
      "The clerks' hall is marked. From there the team needs the service corridors that run behind every department.",
      "Our maintenance crew says one stretch has been missing from the recordings for years. If your plans agree, it is the team's way to the archive.",
      "Mark every camera in the corridors. The team will walk them in the dark.",
    ],
    orders: [
      "A camera can't see past a wall, so a number counts only the cameras in line with it before a wall.",
      "Cells in the same stretch share that part of their count.",
      "When no number helps, count the cameras you have not yet found.",
      "Clear every safe cell. Three strikes end your day.",
    ],
  },
  3: {
    backstory: [
      "The corridors end at the Inner Archive. Its plans are not drawn in our office. The Party keeps them, with its own camera registers.",
      "The register counts are printed in red, and the Party alters them to mislead anyone who reads them. Our contact in the Surveillance Office checked the alterations: in every row with red figures, exactly one was changed, always by one, up or down. An altered 2 was really a 1 or a 3. The rest are true.",
      "What you check on the floor is always true. Mark the archive's cameras. The team crosses it on the night.",
    ],
    orders: [
      "Red numbers are posted counts. In every row with red numbers, exactly one lies: it is one too high or one too low. The others are true.",
      "Your own observations are always true.",
      (pointer) => `To stamp a red number false, ${MARK_GESTURE[pointer]}. The stamp is only your note.`,
      "Three strikes end your day.",
    ],
  },
  4: {
    backstory: [
      "The last plan is the surveillance centre, where every camera in the Ministry is watched. It is the team's target, and the most watched room in the building.",
      "Mark it and your plans are complete. The team goes in tonight at two, through the hall, the corridors and the archive, along the routes you have drawn.",
      "Nobody moves until you finish.",
    ],
    orders: [
      "Red numbers are posted counts here too. In every row with red numbers, exactly one lies: it is one too high or one too low.",
      "Clear every safe cell.",
      "Mark each camera you find.",
      "Three strikes end your day.",
    ],
  },
};

/** The orders for `level`. Throws for a level without a briefing, so a new level can't ship silent. */
export function briefingFor(level: number): Briefing {
  const briefing = BRIEFINGS[level];
  if (briefing === undefined) throw new Error(`No briefing written for level ${level}.`);
  return briefing;
}

/** The Archivist's report once a record closes, before the result line. */
export function reportLetter(outcome: "filed" | "seen" | "toppled"): string[] {
  switch (outcome) {
    case "filed":
      return [
        "The plan is complete. Leave it in the agreed drawer. It will be copied and back on your desk before your shift ends.",
        "Your next orders are in the folder.",
      ];
    case "seen":
      return [
        "The third sighting reached an inspector. Your drawing office will be searched tonight. Anything that ties you to us is already gone.",
        "The team stays where it is. Nobody moves today. Do not try to reach us. New orders come at midnight.",
      ];
    case "toppled":
      return [
        "At two the team came in through the clerks' hall. They crossed the corridors and the archive, and no camera they passed was anywhere your plans did not show it.",
        "At ten past two they reached the surveillance centre and cut every screen in the Ministry. Our guards opened the main gate. By dawn the directors had surrendered the building.",
        "The Ministry's headquarters and its communications are ours. Its offices in other cities are not, and they will come for this building. Hold your post. New orders come at midnight.",
      ];
  }
}
