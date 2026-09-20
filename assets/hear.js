/**
 * Hear what the person meant. Cue families + conflict rules.
 * One regex never covers live chat. Many independent families do.
 */

import { asksAboutChecks, asksServiceDiscount } from "./book-lines.js";

const TYPOS = [
  [/gonna/g, "going to"],
  [/wanna/g, "want to"],
  [/gotta/g, "got to"],
  [/\byall\b/g, "you all"],
  [/\by'all\b/g, "you all"],
  [/\bu\b/g, "you"],
  [/\bur\b/g, "your"],
  [/havent/g, "haven't"],
  [/hasnt/g, "hasn't"],
  [/dont/g, "don't"],
  [/doesnt/g, "doesn't"],
  [/cant/g, "can't"],
  [/wont/g, "won't"],
  [/isnt/g, "isn't"],
  [/arent/g, "aren't"],
  [/im\b/g, "i'm"],
  [/its\b/g, "it's"],
  [/theyre/g, "they're"],
  [/weve/g, "we've"],
  [/idk/g, "i don't know"],
  [/tbd/g, "no date yet"],
  [/closin\b/g, "closing"],
  [/movin\b/g, "moving"],
  [/movein/g, "move in"],
  [/move-in/g, "move in"],
  [/penciled/g, "pencil"],
  [/penciling/g, "pencil"],
];

export function spokenOf(...parts) {
  let spoken = parts
    .map((part) => String(part || ""))
    .join(" ")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^a-z0-9$'\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  for (const [from, to] of TYPOS) spoken = spoken.replace(from, to);
  return spoken;
}

function hits(spoken, patterns) {
  const found = [];
  for (const pattern of patterns) {
    if (pattern instanceof RegExp) {
      if (pattern.test(spoken)) found.push(pattern.source);
    } else if (spoken.includes(pattern)) {
      found.push(pattern);
    }
  }
  return found;
}

const CLOSING_PATTERNS = [
  /closing date/,
  /no closing/,
  /haven't closed/,
  /not closed yet/,
  /waiting to close/,
  /waiting on clos/,
  /waiting on the close/,
  /once we close/,
  /once they close/,
  /after we close/,
  /after they close/,
  /before we close/,
  /before they close/,
  /closing on/,
  /\bclosing\b/,
  /we close/,
  /they close/,
  /might close/,
  /may close/,
  /when we close/,
  /when i close/,
  /the day we close/,
  /day of closing/,
  /at close/,
  /after closing/,
  /before closing/,
  /pending close/,
  /possession/,
  /\brealtor\b/,
  /\bescrow\b/,
  /under contract/,
  /title company/,
];

const BUYING_PATTERNS = [
  /we're buying/,
  /we are buying/,
  /buying a house/,
  /buying the house/,
  /buying a home/,
  /buying the home/,
  /bought the house/,
  /bought a house/,
  /bought the home/,
  /purchased the house/,
  /purchased a house/,
  /just bought/,
  /new house/,
  /new home/,
  /our new place/,
];

const KEYS_PATTERNS = [
  /get the keys/,
  /get keys/,
  /got the keys/,
  /don't have the keys/,
  /don't have our keys/,
  /don't have keys/,
  /haven't got the keys/,
  /haven't gotten the keys/,
  /haven't received the keys/,
  /when we get the keys/,
  /when i get the keys/,
  /day we get the keys/,
  /pick up the keys/,
  /pick up keys/,
  /keys from the/,
  /keys from title/,
  /\btitle\b/,
];

const HOUSE_FREE_PATTERNS = [
  /get the house/,
  /get the home/,
  /when we get it/,
  /day we get it/,
  /when i get it/,
  /house is ours/,
  /house isn't ours/,
  /house is not ours/,
  /house isn't free/,
  /house is not free/,
  /house isn't empty/,
  /house won't be empty/,
  /house won't be free/,
  /house won't be ours/,
  /house isn't ready/,
  /when the house is free/,
  /free to clean/,
  /once it's empty/,
  /when it's empty/,
  /whenever it's empty/,
  /once they move out/,
  /after the seller/,
  /seller hasn't/,
  /sellers? still/,
  /still occupied/,
  /house is still/,
  /still in the house/,
  /they haven't moved/,
  /once we have the house/,
];

const MOVE_IN_PATTERNS = [
  /move in/,
  /moving in/,
  /before we move(?! (?:the |our |my )?(?:couch|sofa|loveseat|furniture|bed|dresser|sectional))/,
  /before i move(?! (?:the |our |my )?(?:couch|sofa|loveseat|furniture|bed|dresser|sectional))/,
  /after we move in/,
  /once we move in/,
  /when we move in/,
  /day we move in/,
];

const NO_DATE_PATTERNS = [
  /don't have a date/,
  /don't have the date/,
  /don't have our date/,
  /don't have a closing/,
  /don't have our closing/,
  /don't have the closing/,
  /no date yet/,
  /no date/,
  /not sure when/,
  /not sure of the date/,
  /not sure about the date/,
  /don't know when/,
  /don't know which/,
  /don't know the date/,
  /don't know what day/,
  /no idea when/,
  /hasn't told us the day/,
  /hasn't given us a date/,
  /nothing is locked/,
  /without a date/,
  /date isnt set/,
  /date isn't set/,
  /haven't got a date/,
  /date isn't set/,
  /date is not set/,
  /date hasn't/,
  /whenever we know/,
  /once we know the date/,
  /once we have a date/,
  /floating date/,
  /unknown date/,
];

const HOLD_PATTERNS = [
  /hold a day/,
  /hold the day/,
  /hold that day/,
  /hold our day/,
  /hold us/,
  /hold a spot/,
  /hold the spot/,
  /hold a time/,
  /hold that time/,
  /can you hold/,
  /could you hold/,
  /just hold/,
  /pencil/,
  /save us a spot/,
  /save me a spot/,
  /save a spot/,
  /keep a spot/,
  /keep that day/,
  /put us down/,
  /tentatively/,
];

const FURNITURE_MOVE_PATTERNS = [
  /do you move/,
  /will you move/,
  /you all move/,
  /you guys move/,
  /move the couch/,
  /move the couches/,
  /move the sofa/,
  /move the loveseat/,
  /move furniture/,
  /move the furniture/,
  /move the bed/,
  /move the dresser/,
  /entertainment center/,
  /should i move/,
  /do i move/,
  /clean under/,
  /underneath the/,
  /lift the couch/,
  /shift the couch/,
];

const WEEKEND_PATTERNS = [/saturday/, /sunday/, /\bweekend\b/];
const SAME_DAY_PATTERNS = [/\btoday\b/, /tomorrow/, /same day/, /\basap\b/, /right away/, /this afternoon/];
const PAYMENT_PATTERNS = [
  /\bpay\b/,
  /payment/,
  /invoice/,
  /venmo/,
  /paypal/,
  /\bcash\b/,
  /\bcard\b/,
  /deposit/,
  /apple pay/,
  /\b(?:take|accept) (?:a )?(?:personal )?che(?:ck|que)s?\b/,
  /\bpay (?:by|with|via) (?:a )?che(?:ck|que)s?\b/,
  /\bwrite (?:a |you a )?che(?:ck|que)\b/,
  /\bwhat about (?:a )?che(?:ck|que)s?\b/,
];
const HOURS_PATTERNS = [
  /what time/,
  /your hours/,
  /appointment times/,
  /last appointment/,
  /how late/,
  /3:30/,
  /10:30/,
];
const PREP_PATTERNS = [/get ready/, /getting ready/, /prepare/, /before you come/, /before you arrive/];
const HOME_PATTERNS = [
  /be home/,
  /be there/,
  /garage code/,
  /hide a key/,
  /vacant/,
  /go to work/,
  /have to stay/,
];

export function hear(text, original = "") {
  const spoken = spokenOf(text, original);
  const families = {
    closing: hits(spoken, CLOSING_PATTERNS),
    buying: hits(spoken, BUYING_PATTERNS),
    keys: hits(spoken, KEYS_PATTERNS),
    houseFree: hits(spoken, HOUSE_FREE_PATTERNS),
    moveIn: hits(spoken, MOVE_IN_PATTERNS),
    noDate: hits(spoken, NO_DATE_PATTERNS),
    hold: hits(spoken, HOLD_PATTERNS),
    furnitureMove: hits(spoken, FURNITURE_MOVE_PATTERNS),
    weekend: hits(spoken, WEEKEND_PATTERNS),
    sameDay: hits(spoken, SAME_DAY_PATTERNS),
    payment: hits(spoken, PAYMENT_PATTERNS),
    hours: hits(spoken, HOURS_PATTERNS),
    prep: hits(spoken, PREP_PATTERNS),
    home: hits(spoken, HOME_PATTERNS),
  };

  const wantsADay = /when can|can you come|could you come|come the day|book|schedule|hold|pencil|reserve|available/.test(
    spoken,
  );
  const closingStory = Boolean(
    families.closing.length ||
      families.moveIn.length ||
      families.keys.length ||
      families.houseFree.length ||
      (families.noDate.length && (families.buying.length || wantsADay || /house|home|clean|carpet/.test(spoken))) ||
      (families.buying.length && (families.noDate.length || families.keys.length || families.hold.length || wantsADay)),
  );

  return {
    spoken,
    families,
    closingStory,
    weekend: families.weekend.length > 0,
    sameDay: families.sameDay.length > 0,
    hold: families.hold.length > 0,
    furnitureMove: families.furnitureMove.length > 0,
    payment: families.payment.length > 0,
    askingWhatWeMove:
      /do you move|will you move|should i move|do i move|you (?:guys |all )?move|clean under|lift the|shift the|move the (?:couch|couches|sofa|loveseat|furniture|bed|sectional|entertainment)/.test(
        spoken,
      ),
    lastSlot: /last (?:daily )?appointment|how late|after 4|4\s*p|too late|3:30|latest/.test(spoken),
    noDate: families.noDate.length > 0,
    firmWeekday: Boolean(
      /\b(monday|tuesday|wednesday|thursday|friday)\b/.test(spoken) &&
        !families.noDate.length &&
        !/might|if that'?s when|don'?t know|not sure|nothing is locked/.test(spoken),
    ),
  };
}

/**
 * One primary job. Closing / house-not-free always beats a playbook rewrite.
 * "Do you move the couch" beats a stray "move" unless they are asking about move-in.
 */
export function primaryJob(heard) {
  if (!heard?.spoken) return null;
  const spoken = heard.spoken;
  const paymentQuestion =
    /cash or card|how do i pay|how does payment|what do you take|do you take (?:cash|card)|forms of payment|venmo|paypal|is there a deposit/.test(
      spoken,
    ) || asksAboutChecks(spoken);
  const homeQuestion =
    /(?:need|have) to be (?:home|there|present)|do i (?:need|have) to be|can i (?:leave|go to work)|garage code|hide a key/.test(
      spoken,
    );
  const priceQuestion = /how much|what(?:'s| is) the (?:price|cost|damage)|ballpark|what do you charge/.test(spoken);
  const dayLockAsk = /when can|can you come|could you come|come the day|hold|pencil|reserve|no date|don't have|keys|free to clean|move in/.test(
    spoken,
  );

  if (asksServiceDiscount(spoken)) return "service-discount";
  if (paymentQuestion) return "payment";
  if (homeQuestion && !heard.hold && !/can you come|hold|pencil/.test(spoken)) return "home";
  if (priceQuestion && !heard.hold && !dayLockAsk) return "price";
  if (heard.furnitureMove && !heard.closingStory) return "furniture";
  if (heard.furnitureMove && heard.askingWhatWeMove && heard.closingStory) {
    if (!/clos|keys|realtor|escrow|buying|bought|free to clean|no date|move in/.test(spoken)) {
      return "furniture";
    }
  }
  if (heard.closingStory) return "closing";
  if (heard.hold) return "hold";
  if (heard.weekend) return "weekend";
  if (heard.sameDay) return "same-day";
  return null;
}
