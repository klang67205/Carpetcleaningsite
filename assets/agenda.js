/**
 * Keep the job moving. A fact (rug, after a move) is never the whole visit.
 * Answer what they asked, then collect rooms / halls / stairs / pets.
 */

import { RUG_LINE, RUG_NOTES, WOOL_RUG_LINE } from "./book-lines.js";

export function mentionsRug(text) {
  return /\barea rugs?\b|\boriental\b|(?:^|\s)rugs?(?:\s|$|[?.!,])/.test(String(text || "").toLowerCase());
}

export function mentionsWoolRug(text) {
  const spoken = String(text || "").toLowerCase();
  return /\bwool\b/.test(spoken) && mentionsRug(spoken);
}

export function afterMove(text) {
  const spoken = String(text || "").toLowerCase();
  if (/move (?:the |our |my )?(?:couch|sofa|loveseat|furniture|bed|dresser|sectional)/.test(spoken)) return false;
  return /after (?:i|we|they) move(?! in)|cleaned up after|after (?:the )?move(?:\s|$|[?.!,])|once i move(?! the)/.test(
    spoken,
  );
}

export function scopeIncomplete(state) {
  return !state?.rooms;
}

export function missingScope(state) {
  return state?.rooms ? [] : ["rooms"];
}

export function remainingScopeAsk(state) {
  if (state?.rooms) return "";
  return "If you’d like to get it scheduled, about how many rooms should we count?";
}

export function readyToBook(state) {
  return Boolean(state?.rooms) && state?.inArea !== false && !state?.sentLink;
}

export function wantsHouseJob(state, spoken, intents = []) {
  if (state?.stage === "need_scope" || state?.lastIntent === "rug") return true;
  if (state?.rug && mentionsRug(spoken)) return true;
  if (intents.includes("need-clean") || intents.includes("rug")) return true;
  if (afterMove(spoken) || mentionsRug(spoken)) return true;
  return false;
}

/**
 * Side facts may speak. They may not cancel the quote.
 * Returns null when the regular brain should handle a standalone FAQ.
 */
function fillingScope(spoken, intents = []) {
  if (intents.includes("payment") || intents.includes("home") || intents.includes("hours") || intents.includes("last-slot")) {
    return false;
  }
  if (intents.includes("cancel") || intents.includes("human") || intents.includes("prep")) return false;
  return (
    /\b\d+\s*(?:rooms?|halls?|hallways?|stairs?)\b/.test(spoken) ||
    /\bno pet|pet issues|pet treatment/.test(spoken) ||
    intents.includes("need-clean") ||
    intents.includes("rug") ||
    mentionsRug(spoken) ||
    afterMove(spoken)
  );
}

export function composeJob({ state, spoken, intents = [], quoteLine }) {
  const wool = mentionsWoolRug(spoken);
  const rugNow = mentionsRug(spoken);
  if (rugNow) state.rug = true;

  const collecting =
    state.stage === "need_scope" &&
    scopeIncomplete(state) &&
    !intents.includes("payment") &&
    !intents.includes("home") &&
    !intents.includes("hours") &&
    !intents.includes("last-slot");
  const job = (wantsHouseJob(state, spoken, intents) && fillingScope(spoken, intents)) || collecting;
  if (!job && !wool) return null;

  if (rugNow && state.rooms && !scopeIncomplete(state) && quoteLine) {
    return {
      intent: "rug",
      stage: "quoted",
      bubbles: [`${RUG_LINE} ${quoteLine(state)}`],
    };
  }

  if (wool) {
    const next = scopeIncomplete(state)
      ? `If the rest is wall-to-wall, ${remainingScopeAsk(state)}`
      : quoteLine
        ? `If the rest is wall-to-wall, ${quoteLine(state)}`
        : "If the rest is wall-to-wall we would love to help.";
    return {
      intent: "wool",
      stage: scopeIncomplete(state) ? "need_scope" : "quoted",
      bubbles: [`${WOOL_RUG_LINE} ${next}`],
    };
  }

  if (scopeIncomplete(state) && (job || rugNow || afterMove(spoken) || state.stage === "need_scope")) {
    const ask = remainingScopeAsk(state);
    if (ask) state.askedScope = true;
    if (!ask && state.rooms && quoteLine) {
      const extra = state.rug ? ` ${RUG_NOTES}` : "";
      return {
        intent: rugNow ? "rug" : "price",
        stage: "quoted",
        bubbles: [`${rugNow ? `${RUG_LINE} ` : ""}${quoteLine(state)}${extra}`],
      };
    }
    if (!ask) {
      /* nothing left to collect */
    } else if (rugNow) {
      return { intent: "rug", stage: "need_scope", bubbles: [`${RUG_LINE} ${ask}`] };
    }
    if (afterMove(spoken) && !state.rooms) {
      return {
        intent: "price",
        stage: "need_scope",
        bubbles: [`We would love to help get the house cleaned after you move. ${ask}`],
      };
    }
    if (state.stage === "need_scope" || (state.rug && !state.rooms) || (intents.includes("need-clean") && !state.rooms)) {
      const lead = state.rooms ? "We would love to help — I have the rooms." : "We would love to help.";
      return { intent: "price", stage: "need_scope", bubbles: [`${lead} ${ask}`] };
    }
    if (state.rug && state.stage === "need_scope") {
      return { intent: "rug", stage: "need_scope", bubbles: [`We would love to help. ${ask}`] };
    }
  }

  if (state.stage === "need_scope" && state.rooms && !scopeIncomplete(state) && quoteLine) {
    const quoted = quoteLine(state);
    const extra = state.rug ? ` ${RUG_NOTES}` : "";
    return { intent: "price", stage: "quoted", bubbles: [`${quoted}${extra}`] };
  }

  return null;
}

export const QUIET = new Set([
  "later",
  "thanks",
  "greeting",
  "opener",
  "unknown",
  "correction",
  "cancel",
  "damage",
  "refund",
  "complaint",
]);

/**
 * Hard rule: never ask a question we already have the answer to.
 * Rewrites or drops the ask. Facts on the same line stay.
 */
export function dropKnownQuestions(state, bubbles, flags = {}) {
  const alreadyInvited = Boolean(flags.alreadyInvited ?? state?.invitedTimes);
  return (bubbles || [])
    .map((line) => {
      if (!line || /^https?:\/\//.test(line)) return line;
      return scrubKnownAsk(state, line, alreadyInvited);
    })
    .filter((line) => line && String(line).trim());
}

function scrubKnownAsk(state, line, alreadyInvited) {
  const askingRooms = /how many rooms|\brooms, hallways, and stairs/i.test(line);
  const askingHalls = /how many hallways|hallways and stairs/i.test(line);
  const askingStairs = /how many stairs/i.test(line);
  const askingPets = /(?:any )?major pet issues|do you have any (?:major )?pet/i.test(line);
  const askingCity = /what city|which city|what city the house/i.test(line);
  const askingTimes = /weekday times|say the word and i.?ll send/i.test(line);
  const askingWhat = /what (?:can we get|do you need) cleaned/i.test(line);
  const askingHome = /\b(?:do|does) (?:i|we|you) (?:need|have) to be (?:home|there)/i.test(line);

  const roomsKnown = Boolean(state?.rooms);
  const hallsKnown = state?.halls != null;
  const stairsKnown = state?.stairs != null;
  const petsKnown = Boolean(state?.petAnswered);
  const cityKnown = Boolean(state?.city && state.city !== "county");

  const reask =
    (roomsKnown && askingRooms) ||
    (hallsKnown && askingHalls) ||
    (stairsKnown && askingStairs) ||
    (petsKnown && askingPets) ||
    (cityKnown && askingCity) ||
    (alreadyInvited && askingTimes) ||
    (roomsKnown && askingWhat) ||
    (state?.homeAnswered && askingHome);

  if (!reask) return line;
  const isQuestion = /[?]/.test(line) || askingTimes || askingWhat;
  if (!isQuestion) return line;

  if (askingRooms || askingHalls || askingStairs || askingPets) {
    const fact = line
      .replace(/\s*If you want to get a weekday, how many [^?]+\?/i, "")
      .replace(/\s*Do you know how many [^?]+\?/i, "")
      .replace(/\s*How many [^?]+\?/i, "")
      .replace(/\s*Do you have any major pet issues[^?]+\?/i, "")
      .trim();
    const leftover = remainingScopeAsk(state);
    if (leftover && leftover !== line) return fact ? `${fact} ${leftover}` : leftover;
    return fact || null;
  }
  if (alreadyInvited && askingTimes) {
    return (
      line.replace(/\s*If that works, say the word and I.?ll send the weekday times — no rush\.?/i, "").trim() || null
    );
  }
  if (cityKnown && askingCity) {
    return line.replace(/\s*Whenever you’re ready to pick a day, it helps to know what city[^.]*\./i, "").trim() || null;
  }
  if (roomsKnown && askingWhat) {
    return line.replace(/\s*What (?:can we get|do you need) cleaned\??/i, "").trim() || null;
  }
  return remainingScopeAsk(state) || line;
}

export function conversionLead(state, intent, bubbles) {
  const said = (Array.isArray(bubbles) ? bubbles : [bubbles]).join(" ");
  if (!said.trim()) return null;
  if (said.includes("housecallpro") || /click this link/i.test(said)) return null;
  if (/how many rooms|how many hallways|how many stairs|weekday times|what can we get cleaned|what do you need cleaned|any major pet issues/i.test(said)) {
    return null;
  }
  if (QUIET.has(intent)) return null;
  if (state?.inArea === false) return null;
  if (intent === "area" && state?.inArea !== true) return null;
  if (readyToBook(state)) return null;
  if (!state?.rooms) {
    if (state.askedScope) return null;
    const ask = remainingScopeAsk(state);
    if (!ask) return null;
    state.askedScope = true;
    return ask;
  }
  return null;
}
