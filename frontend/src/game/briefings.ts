/**
 * The operation orders inside each folder: a typewritten letter from the resistance that tells
 * the day's story one assignment at a time, then the orders for playing that level.
 *
 * Copy rules still apply (design.md rule 10): flat, second person, no exclamation marks, no jokes.
 * The setting is ours: never quote or borrow Orwell's text, characters or organisations.
 */

export const OPERATION = "Operation Blind Spot";
export const SENDER = "The Archivist";
export const RECIPIENT = "Clerk, Records Department";
export const SALUTATION = "Clerk,";
export const SIGN_OFF = "The Archivist";
export const DESTROY_NOTE = "Destroy after reading. The clock starts when you start the operation.";

export type Briefing = {
  /** The story so far, one paragraph per entry. */
  backstory: string[];
  /** How to play this level, after the level's own brief. */
  orders: string[];
};

const BRIEFINGS: Record<number, Briefing> = {
  1: {
    backstory: [
      "You file the Ministry's surveillance reports. You know how to read them, and your work takes you between departments. That is why we need you.",
      "Tonight we intend to take the Ministry's headquarters. Clerks, maintenance workers and guards are ready. The cameras would expose them before they reached their positions. We need a way to shut the network down without raising the alarm.",
      "Start with the camera logs. They are scattered among the unwatched desks on the open floor. Collect the full set. We need to find a route our people can use unseen.",
      "Your pass explains your presence. It does not explain searching another clerk's desk. One sighting passes for an errand. Three bring an inspector.",
    ],
    orders: [
      "Clear every cell no camera can see.",
      "Mark each camera you find.",
      "A number counts the cameras that can see its cell, along its row and column.",
      "Three strikes end your day.",
    ],
  },
  2: {
    backstory: [
      "The logs show the same stretches of the service corridor missing from every recording for six years. Someone in the Ministry wanted a way through the building that leaves no trace.",
      "Our maintenance crew has walked part of that corridor, but never past the archive.",
      "The building plans are filed in pieces in the corridor's unwatched alcoves. Bring back every sheet. If the hidden route reaches the surveillance centre, it is the only way our people can get there unseen.",
    ],
    orders: [
      "Walls stop a camera's view. A number counts only the cameras it can see before a wall.",
      "Cells in the same stretch share that part of their count.",
      "When no number helps, count the cameras you have not yet found.",
      "Clear every safe cell. Three strikes end your day.",
    ],
  },
  3: {
    backstory: [
      "The plans show a sealed passage from the Inner Archive to the surveillance centre. It is real. Our guards have seen the door.",
      "Switching the cameras off is not enough. If they go dark without a signed order, every door locks and the guards are recalled. The shutdown order and its codes are filed across the Inner Archive. Bring back every page.",
      "The posted camera counts are printed in red. Some have been altered to mislead intruders. Staff carry the original counts. Our contact checked the alterations: in every row with red figures, exactly one is wrong, off by one. The rest are true.",
    ],
    orders: [
      "Red numbers are posted counts. In every row with red numbers, exactly one is false, off by one. The others are true.",
      "Your own observations are always true.",
      "In Mark camera mode, tap a red number to stamp it false. The stamp is only your note.",
      "Three strikes end your day.",
    ],
  },
  4: {
    backstory: [
      "The order is signed and the codes are good. Tonight the night crew waits in the passage, our guards stand at the archive door, and clerks on every floor wait for the screens to go dark.",
      "The shutdown can only be given from the central surveillance room. Its controls are on the unwatched desks. Enter the order at each console. The cameras stay active until the last console is ready.",
      "When the cameras stop, our people move at once: the communications floor, the directors' offices, the main gate. Nobody moves until you finish.",
    ],
    orders: [
      "Red numbers are posted counts here too. In every row with red numbers, exactly one is false, off by one.",
      "Clear every safe cell. Clearing a cell means entering the shutdown order at that desk.",
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
        "The material is complete. Leave it in the agreed place. The night crew will collect it before your shift ends.",
        "Your next orders are in the folder.",
      ];
    case "seen":
      return [
        "The third sighting reached an inspector. Your desk will be searched tonight. Anything that ties you to us is already gone.",
        "Our people stay where they are. Nobody moves today. Do not try to reach us. New orders come at midnight.",
      ];
    case "toppled":
      return [
        "At ten past two the cameras went dark and stayed dark. No lockdown followed. The order carried the right codes.",
        "Our guards opened the main gate. The night crew took the communications floor before the morning broadcast, and clerks held the stairwells to the directors' offices. The directors found their telephones dead and their doors guarded. By dawn they had surrendered the building.",
        "The Ministry's headquarters and its communications are ours. Its offices in other cities are not, and they will come for this building. Hold your post. New orders come at midnight.",
      ];
  }
}
