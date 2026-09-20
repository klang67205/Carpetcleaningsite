/**
 * Scheduling failsafe. Phrase lists miss. Score the meaning, then answer the book.
 * Daily starts: Mon–Fri 8, 10:30, 1, 3:30. Last start 3:30. Closed Sat/Sun.
 */

import { LIVE_TIMES } from "./book-lines.js";

export const SLOT_LINE =
  "We would love to get you on the schedule. Our normal appointment times are Monday through Friday at 8, 10:30, 1, and 3:30.";
export const LAST_LINE = "We would love to get you on the schedule. Our last daily appointment is at 3:30.";
export const FIRST_LINE = "We would love to get you on the schedule. Our first daily appointment is at 8.";
export const DAYS_LINE = "We’re closed Saturday and Sunday.";

function spokenOf(...parts) {
  return parts
    .map((part) => String(part || "").toLowerCase())
    .join(" ")
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function hasOurClock(spoken) {
  if (/10\s*:?\s*30|\b1030\b/.test(spoken)) return true;
  if (/3\s*:?\s*30|\b330\b/.test(spoken)) return true;
  if (/\b8\s*a\.?m\.?\b|\bat 8\b|\b8 o'?clock\b/.test(spoken)) return true;
  if (/\b1\s*(?:p\.?m\.?|o'?clock)\b|\bat 1\b/.test(spoken)) return true;
  if (/\b4\s*(?:p\.?m\.?|o'?clock)\b/.test(spoken)) return true;
  if (/\baround (?:8|10|1|3)\b/.test(spoken)) return true;
  return false;
}

function blocked(spoken) {
  if (
    (/\bpay\b|invoice|venmo|paypal|card|cash|deposit/.test(spoken) ||
      /\b(?:take|accept) (?:a )?che(?:ck|que)s?\b/.test(spoken) ||
      /\bpay (?:by|with|via) (?:a )?che(?:ck|que)s?\b/.test(spoken)) &&
    !hasOurClock(spoken) &&
    !/\bappointment times\b|what time do you/.test(spoken)
  ) {
    return true;
  }
  if (/how long (?:does|will|is) (?:the )?(?:job|visit|clean)|how long (?:are you|will you be)|time does it take/.test(spoken)) {
    return true;
  }
  if (/get ready|getting ready|to get ready|how should i prepare/.test(spoken)) return true;
  if (/dry|walk on the carpet|still wet/.test(spoken) && !/appointment|slot|schedule/.test(spoken)) return true;
  if (/hide (?:a |the )?key|garage code|vacant/.test(spoken) && !hasOurClock(spoken) && !/morning|afternoon|what time|when do/.test(spoken)) {
    return true;
  }
  if (
    /closing date|haven'?t closed|closing on|possession|\brealtor\b|\bescrow\b|move[- ]?in|don't have (?:a |the |our )?date|hold (?:a |the )?day|pencil|get the keys/.test(
      spoken,
    )
  ) {
    return true;
  }
  return false;
}

export function schedulingScore(text, original = "") {
  const spoken = spokenOf(text, original);
  if (!spoken || blocked(spoken)) return { score: 0, kind: null, reasons: ["blocked"] };

  let score = 0;
  const reasons = [];
  const add = (n, reason, yes) => {
    if (!yes) return;
    score += n;
    reasons.push(reason);
  };

  add(4, "what-time", /what time|which time|what times/.test(spoken));
  add(4, "when-arrive", /when (?:do|does|will|are|is|can) .*(?:come|show|arriv|start|run|be there|be here|head|roll|go out)/.test(spoken));
  add(4, "when-coming", /when (?:are|is) (?:you|yall|y'all|the).*(?:com|arriv|show|start)/.test(spoken));
  add(3, "when-come-short", /when do (?:you|yall|y'all|guys)/.test(spoken));
  add(3, "our-clock", hasOurClock(spoken));
  add(3, "last", /last (?:daily )?(?:appointment|slot|opening|start)|latest you can|how late|end of the day|too late|after 3/.test(spoken));
  add(3, "first", /first (?:daily )?(?:appointment|slot|opening)|how early|start of the day|what time do (?:you|yall|we) start/.test(spoken));
  add(3, "daypart", /morning|afternoon|evening|midday|\bnoon\b|after lunch|before noon|before lunch/.test(spoken));
  add(3, "visit-word", /appointment times|time slots|start time|arrival time|typical start|what times|windows (?:do you )?run/.test(spoken));
  add(2, "schedule-word", /(?:your schedule|\bscheduling\b|(?<!re)\bschedule\b)|\bhours\b|business hours|are you open/.test(spoken));
  add(2, "arrive", /show up|come out|come by|come through|arriv(?:e|al)|trucks? go/.test(spoken));
  add(2, "available-clock", /availab/.test(spoken) && (hasOurClock(spoken) || /morning|afternoon|slot|appointment/.test(spoken)));
  add(2, "o-clock", /o'?clock/.test(spoken));
  add(3, "around-clock", /around (?:10|8|1|3)|come at (?:8|1|10)|come around/.test(spoken));

  if (/\b[1-9] rooms?\b|how much|sofa|couch|closet/.test(spoken) && score < 6) {
    score -= 4;
    reasons.push("other-job");
  }

  let kind = "slots";
  if (/4\s*(?:p\.?m\.?|o'?clock)|after 3|too late|how late|last (?:daily )?(?:appointment|slot|one)/.test(spoken)) {
    kind = "last";
  } else if (/first (?:daily )?(?:appointment|slot)|how early|start of the day|8\s*a\.?m|8 o'?clock|at 8|morning/.test(spoken)) {
    kind = "first";
  } else if (/10\s*:?\s*30|1030|1\s*(?:p\.?m\.?|o'?clock)|\bat 1\b/.test(spoken)) {
    kind = "named";
  }

  return { score, kind, reasons };
}

export function isSchedulingAsk(text, original = "") {
  return schedulingScore(text, original).score >= 3;
}

const OTHER_JOB = new Set([
  "cancel",
  "reschedule",
  "confirmation",
  "damage",
  "complaint",
  "refund",
  "payment",
  "price",
  "closet",
  "prep",
  "upholstery",
  "stain",
  "pet-treat",
  "pet-loss",
  "safety",
  "human",
  "who-comes",
  "duration",
  "coupon",
  "commercial",
  "specialized",
  "closing",
  "hold",
]);

export function schedulingWins(text, original, intents = []) {
  if (!isSchedulingAsk(text, original)) return false;
  if (intents.some((name) => OTHER_JOB.has(name))) return false;
  return true;
}

export function hoursLine(text, original = "") {
  const { kind } = schedulingScore(text, original);
  if (kind === "last") {
    return `${LAST_LINE} That’s the last start we take. ${LIVE_TIMES}`;
  }
  if (kind === "first") {
    return `${FIRST_LINE} After that we have 10:30, 1, and 3:30, Monday through Friday. ${LIVE_TIMES}`;
  }
  if (kind === "named") {
    return `${SLOT_LINE} ${LIVE_TIMES}`;
  }
  return `${SLOT_LINE} ${DAYS_LINE} ${LIVE_TIMES}`;
}

export function soonLine() {
  return `We would love to get you on the schedule. We just don’t do same-day. ${LIVE_TIMES}`;
}
