/**
 * The privacy notice's words and the cookie notice's, in one place so they stay consistent with
 * what the code actually stores. When the game starts storing or sharing anything new, update the
 * matching section here (and bump PRIVACY_UPDATED) in the same change.
 */

/**
 * Who is responsible for the data, and how to reach them. REQUIRED BEFORE LAUNCH: replace both
 * values with the real name and a contact email. The notice shows the placeholders as they are.
 */
export const PRIVACY_CONTACT = {
  name: "[Name to be added before launch]",
  email: "[Contact email to be added before launch]",
};

/** Shown at the top of the notice. Change it whenever a section changes. */
export const PRIVACY_UPDATED = "23 November 2026";

export const PRIVACY_PATH = "/privacy.html";

/** The short notice under the game, until the player acknowledges it. */
export const COOKIE_NOTICE = {
  text: "Surveilled uses one cookie, to keep your game on our server. No tracking, no ads, no analytics.",
  link: "Privacy notice",
  acknowledge: "Acknowledge",
};

export type PrivacySection = {
  title: string;
  paragraphs: string[];
  items?: string[];
};

export const PRIVACY_INTRO =
  "Surveilled is a daily puzzle game with no accounts. This notice explains the little it stores, why, and for how long.";

export const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    title: "Who is responsible",
    paragraphs: [
      `${PRIVACY_CONTACT.name} runs Surveilled and is responsible for the data described here. Contact: ${PRIVACY_CONTACT.email}.`,
    ],
  },
  {
    title: "The cookie",
    paragraphs: [
      "When you open the game, our server sets one cookie, sv_player. It holds a random number that lets the server recognise your browser, so it can keep your game: your moves, your clock, your strikes and hints, and the rule that each level gets one attempt a day. It also keeps your training records while you play them.",
      "The cookie contains no name, email address or other details about you. Page scripts can't read it, and it is only sent to the game's own server. It lasts 400 days unless you delete it.",
      "The game can't work without it, so it is a strictly necessary cookie and does not need your consent. There are no other cookies: no tracking, advertising or analytics.",
    ],
  },
  {
    title: "What we store, and for how long",
    paragraphs: [],
    items: [
      "Your games, training records included: kept only in the game server's memory, never written to disk. Training records are never scored, ranked or logged. They are gone when the server restarts, which happens whenever the game is updated, or sooner when room is needed for newer games.",
      "Your standing: when your day ends, the server stores one row in our database with the date, how many levels you filed and your score. It is linked to a one-way hash of your cookie's number, never the number itself. These rows are deleted automatically after one year.",
      "Anonymous results: for each finished level the server logs the day, level, time, strikes and hints, with nothing that identifies you. We use them to tune how hard the puzzles are.",
      "In your browser only: your toppling streak, that you have acknowledged the cookie notice, which training records you have filed or skipped, and whether you turned the typewriter sound off. These stay in your browser's local storage and are never sent to us.",
    ],
  },
  {
    title: "Why",
    paragraphs: [
      "We process this data because we have a legitimate interest in running the game fairly and showing you how your day compares with other players' (GDPR article 6(1)(f)). We do not sell it, use it for advertising or build profiles.",
    ],
  },
  {
    title: "Who else handles it",
    paragraphs: [
      "These services help run the game. Like any website, they receive your IP address and basic browser details when your browser connects to them.",
    ],
    items: [
      "Netlify: hosts the website and passes game requests on to our server.",
      "Oracle Cloud: runs the game server, in Stockholm, Sweden.",
      "Supabase: hosts the database that holds the standings.",
      "Google Fonts: serves the game's typefaces. Your browser fetches them from Google, which receives your IP address.",
    ],
  },
  {
    title: "Data outside the EEA",
    paragraphs: [
      "Netlify, Supabase and Google are based in the United States, so some data may be processed there, under the safeguards GDPR requires for such transfers.",
    ],
  },
  {
    title: "Your rights",
    paragraphs: [
      "You can ask for access to, correction of or deletion of your data, or object to how it is used. Because we only know you by a random number, the simplest way is to delete this site's cookies and local storage in your browser: after that nothing we hold can be linked to you.",
      "To have your stored standings deleted, write to the contact above. Your browser's site settings show the sv_player cookie's value; include it so we can find your rows.",
      "If you think we handle your data wrongly, you can complain to the Norwegian Data Protection Authority (Datatilsynet), datatilsynet.no.",
    ],
  },
  {
    title: "Changes",
    paragraphs: [
      "If the game starts storing anything new, this notice changes first, and the date at the top changes with it.",
    ],
  },
];
