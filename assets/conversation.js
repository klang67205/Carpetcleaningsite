/** Wichita Carpet Cleaning — conversation brain. Facts only. No invented promises. */

import { afterMove, composeJob, conversionLead, dropKnownQuestions, mentionsRug, mentionsWoolRug, QUIET, readyToBook } from "./agenda.js";
import { bookingUrl, CANCEL_LINE, DISCOUNT_LINE, howToBook, LIVE_TIMES, NO_CONFIRM_MAIL, RUG_NOTES, TEXT_PHOTO, TEXT_US, WOOL_LINE, asksServiceDiscount, paymentSpeech } from "./book-lines.js";
import { ground } from "./ground.js";
import { hear } from "./hear.js";
import { emptyMemory, guessFirstName, rememberPlan, syncMemory } from "./memory.js";
import { pickSituation } from "./playbook.js";
import { think } from "./reason.js";
import { hoursLine, schedulingWins, soonLine } from "./scheduling.js";

export { bookingUrl };
export const messengerUrl = "https://m.me/wichitacarpetcleaningservices";
export const phoneDisplay = "(316) 209-2176";
export const phoneTel = "tel:3162092176";
export const phoneSms = "sms:3162092176";

const cityAliases = { belaire: "Bel Aire", eldorado: "El Dorado" };
const servedCities = [
  "wichita",
  "derby",
  "andover",
  "goddard",
  "maize",
  "haysville",
  "park city",
  "valley center",
  "bel aire",
  "belaire",
  "rose hill",
  "kechi",
  "eastborough",
  "colwich",
  "benton",
];
const unsupportedCities = [
  "newton",
  "augusta",
  "clearwater",
  "cheney",
  "mulvane",
  "el dorado",
  "eldorado",
  "hutchinson",
  "winfield",
  "wellington",
  "kingman",
  "mcpherson",
  "arkansas city",
  "salina",
  "pratt",
  "halstead",
];
const cityTypos = {
  wichitq: "wichita",
  wichata: "wichita",
  andoer: "andover",
  godard: "goddard",
  haysvill: "haysville",
  maise: "maize",
};
const inZips = new Set([
  "67202",
  "67203",
  "67204",
  "67205",
  "67206",
  "67207",
  "67208",
  "67209",
  "67210",
  "67211",
  "67212",
  "67213",
  "67214",
  "67215",
  "67216",
  "67217",
  "67218",
  "67219",
  "67220",
  "67223",
  "67226",
  "67227",
  "67228",
  "67230",
  "67235",
  "67002",
  "67037",
  "67052",
  "67060",
  "67101",
  "67147",
  "67067",
  "67133",
  "67030",
  "67017",
]);
const outZips = new Set(["67114", "67010", "67110", "67042", "67501", "67156", "67068"]);

const clean = (text) =>
  text
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/[^a-z0-9$'\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const titleCase = (text) => text.replace(/\b\w/g, (char) => char.toUpperCase());
const cityLabel = (city) => cityAliases[city] || titleCase(city);
const isMilitaryHousing = (text) =>
  /on[\s-]?base|military\s+housing|mcconnell(?:\s+afb)?|base housing/.test(text);

function findZip(text) {
  const match = text.match(/\b(\d{5})\b/);
  return match ? match[1] : null;
}

function findCity(text) {
  if (/sedgwick\s+county|butler\s+county/.test(text)) return "county";
  let normalized = text;
  for (const [typo, real] of Object.entries(cityTypos)) {
    normalized = normalized.replace(new RegExp(`\\b${typo}\\b`, "g"), real);
  }
  return (
    [...servedCities, ...unsupportedCities]
      .sort((a, b) => b.length - a.length)
      .find((city) => new RegExp(`\\b${city.replace(/ /g, "\\s+")}\\b`, "i").test(normalized)) ||
    null
  );
}

function inServiceArea(city, zip) {
  if (zip && inZips.has(zip)) return true;
  if (zip && outZips.has(zip)) return false;
  if (!city || city === "county") return null;
  return servedCities.includes(city);
}

function roomEstimate(text) {
  if (/whole (?:house|home)|entire (?:house|home)|the whole place/.test(text)) {
    return { whole: true };
  }
  const living = (text.match(/\b(living rooms?|family rooms?|dens?|dining rooms?)\b/g) || []).length;
  const justOne =
    /\b(?:just |only )?(?:the )?(living room|family room|den|dining room)\b/.test(text) &&
    !/\d+\s*(?:bed(?:room)?s?|rooms?)\b/.test(text)
      ? 1
      : 0;
  const bed = text.match(/\b(\d{1,2})\s*(?:bed(?:room)?s?)\b/);
  const rooms = text.match(/\b(\d{1,2})\s*rooms?\b/);
  const bare = text.match(/^(?:about |around |maybe )?(\d{1,2})$/);
  let count = null;
  if (bed) count = Number(bed[1]) + living;
  else if (rooms) count = Number(rooms[1]);
  else if (justOne) count = 1 + living - (living ? 1 : 0);
  else if (bare) count = Number(bare[1]);
  if (count == null || count < 1 || count > 30) return null;
  const extras = Math.max(0, count - 5);
  return { rooms: count, extras, standard: carpetAmount(count), pet: petAmount(count) };
}

function carpetAmount(rooms) {
  if (!rooms) return 99;
  if (rooms <= 3) return 75;
  return 99 + Math.max(0, rooms - 5) * 15;
}

function petAmount(rooms) {
  return 149 + Math.max(0, (rooms || 5) - 5) * 15;
}

function mentionsFurniture(text) {
  if (/move (?:the )?(?:couch|couches|sofa|bed|furniture)/.test(text)) return false;
  return /\bfurniture\b|upholstery|\bsofa\b|\bcouch\b|\bloveseat\b|\brecliner\b|\bsectional\b/.test(text);
}

function furnitureAndCarpetLine(state) {
  const rooms = state.rooms;
  if (rooms && rooms <= 3) {
    return `We would love to help. Unfortunately our furniture cleaning process is priced differently than our carpet cleaning, but with just ${rooms} room${rooms === 1 ? "" : "s"} we could certainly cover that for our minimum charge of $75 plus tax.`;
  }
  if (rooms) {
    return `We would love to help. Unfortunately our furniture cleaning process is priced differently than our carpet cleaning. The carpet for those rooms would be $${carpetAmount(rooms)} plus tax.`;
  }
  return otherServicePrice("upholstery");
}

function hallCount(text) {
  const match = text.match(/\b(\d{1,2})\s*(?:halls?|hallways?)\b/);
  if (match) return Number(match[1]);
  if (/\b(?:one|a|the) (?:hall|hallway)\b/.test(text)) return 1;
  if (/\bno (?:extra )?(?:halls?|hallways?)\b/.test(text)) return 0;
  return null;
}

function stairCount(text) {
  const match = text.match(/\b(\d{1,2})\s*(?:stairs?|staircases?|stairways?)\b/);
  if (match) return Number(match[1]);
  if (/\b(?:one|a|the) (?:stair|staircase|stairway)\b/.test(text)) return 1;
  if (/\bno (?:extra )?stairs?\b/.test(text)) return 0;
  return null;
}

function wantsPetTreatment(text) {
  return /pet treatment|pet clean|pet package|pet option|urine|odor|dog pee|cat pee|pet stain|add pets|with the pets|for the pets|dogs? (?:and|&) cats?|major pet|pet issues?|pet problems?/.test(
    text,
  );
}

function noPetIssues(text) {
  return /no pets|no pet issues|no pet problems|no odor|no urine|pets? aren'?t an issue/.test(text);
}

function homeLine(text, original = "") {
  const spoken = `${text} ${original}`.toLowerCase();
  const access =
    "If you can’t be there we can always get a garage code, and as long as we have a way to get in and lock up we can take care of it that way if you’re comfortable with that.";
  const vacant =
    "You don’t have to be present if it’s vacant, as long as we have a way in.";
  const notes =
    "If you leave a garage code or hide a key, leave that info in the notes section when you book and we can take it from there.";
  if (/vacant|empty house|unoccupied|nobody (?:there|home)/.test(spoken)) {
    return `${vacant} ${notes}`;
  }
  if (/hide (?:a |the )?key|hidden key/.test(spoken)) {
    return notes;
  }
  if (/can'?t be (?:there|home)|won'?t be|garage code/.test(spoken)) {
    return `${access} ${notes}`;
  }
  return "You don’t have to be there — vacant or not — as long as we have a way to get in and lock up, and you’re comfortable with that. If you leave a garage code or hide a key, put that in the notes section when you book and we can take it from there.";
}

function paymentLine(text, original = "") {
  return paymentSpeech(`${text} ${original}`.toLowerCase());
}

function odorHonesty() {
  return "We can’t promise in every case that odor that has set in can always be removed if it has worked into the padding or the subfloor, but we do promise to do the best job possible trying.";
}

function withHouseQuote(state, intent, speech, extra = {}) {
  const list = Array.isArray(speech) ? [...speech] : [speech];
  if (state.rooms && !list.some((line) => /\$\d+/.test(line))) {
    list.push(quoteLine(state));
  }
  return reply(state, intent, list, {
    ...extra,
    stage: state.rooms ? "quoted" : extra.stage || state.stage,
  });
}

function quoteLine(state) {
  const rooms = state.rooms;
  const extras = rooms ? Math.max(0, rooms - 5) : 0;
  const standard = carpetAmount(rooms);
  const pet = petAmount(rooms);
  const namedAreas = rooms != null || state.halls != null || state.stairs != null;
  if (!namedAreas) {
    return "We would love to get it cleaned for you. Our pricing is $75 plus tax up to three rooms, and $99 plus tax for five rooms, two halls, and one stair. Pets are $149 for that five-room size.";
  }
  if (state.pet) {
    if (rooms && rooms <= 3) {
      return `We would love to get those rooms cleaned for you. Our pricing is $75 plus tax for the carpet, and pet treatment is $149 plus tax for the five-room size.`;
    }
    let line = `We would love to get it cleaned for you. Our pricing is $${pet} plus tax with the pet treatment, and that would cover those areas.`;
    if ((state.halls != null && state.halls > 2) || (state.stairs != null && state.stairs > 1)) {
      line += " Two halls and one stair are in that price; extra beyond that I’ll look at on site.";
    }
    return line;
  }
  let line = `We would love to get it cleaned for you. Our pricing is $${standard} plus tax, and that would cover those areas.`;
  if (extras) {
    line = `We would love to get it cleaned for you. Our pricing is $${standard} plus tax, and that would cover those areas — five are in the $99, then $${extras * 15} for the extra room${extras === 1 ? "" : "s"}.`;
  }
  if ((state.halls != null && state.halls > 2) || (state.stairs != null && state.stairs > 1)) {
    line += " Two halls and one stair are in that price; extra beyond that I’ll look at on site.";
  }
  return line;
}

function lovePrice(detail) {
  return `We would love to get that cleaned for you. Our pricing is ${detail}`;
}

function otherServicePrice(text) {
  const has = (pattern) => pattern.test(text);
  if (has(/sofa.*loveseat|loveseat.*sofa/)) return lovePrice("$149 plus tax for a sofa and loveseat together.");
  if (has(/complete seating|all (?:my )?(?:seating|furniture)/))
    return lovePrice("$179 plus tax for complete seating.");
  if (has(/large sectional|big sectional/)) return lovePrice("$169 plus tax for a large sectional.");
  if (has(/small sectional/)) return lovePrice("$119 plus tax for a small sectional.");
  if (has(/\bsofa\b|\bcouch\b/)) return lovePrice("$89 plus tax for a sofa.");
  if (has(/\bloveseat\b/)) return lovePrice("$79 plus tax for a loveseat.");
  if (has(/\brecliner\b/)) return lovePrice("$39 plus tax for a recliner.");
  if (has(/\bchair\b/) && !has(/high chair/)) return lovePrice("$19 plus tax for a chair.");
  if (has(/bathroom.*(?:tile|grout)|(?:tile|grout).*bathroom/))
    return lovePrice("$99 plus tax for bathroom tile and grout.");
  if (has(/kitchen.*(?:tile|grout)|(?:tile|grout).*kitchen/))
    return lovePrice("$129 plus tax for kitchen tile and grout.");
  if (has(/whole (?:home|house)|(?:tile|grout).*whole/))
    return lovePrice("$259 plus tax for whole-home tile and grout.");
  if (has(/\b150\s*(?:sq|square|ft)/)) return lovePrice("$79 plus tax for hard floor up to 150 square feet.");
  if (has(/\b300\s*(?:sq|square|ft)/)) return lovePrice("$139 plus tax for hard floor up to 300 square feet.");
  if (has(/\b600\s*(?:sq|square|ft)/)) return lovePrice("$239 plus tax for hard floor up to 600 square feet.");
  if (has(/tile|grout/))
    return lovePrice("$99 a bathroom, $129 a kitchen, or $259 a whole home for tile and grout, plus tax.");
  if (has(/hard.?floor/))
    return lovePrice("$79 up to 150 square feet, $139 to 300, or $239 to 600 for hard floor, plus tax.");
  if (has(/upholstery|sofa|couch|seating/))
    return lovePrice("$19 a chair, $39 a recliner, $79 a loveseat, $89 a sofa, $119 a small sectional, $169 a large one, or $179 for complete seating, plus tax.");
  return null;
}

function intentSet(text) {
  const intents = [];
  const add = (name, pattern) => {
    if (pattern.test(text)) intents.push(name);
  };
  add("correction", /not what i asked|didn[' ]?t answer|you misunderstood|that makes no sense|wrong answer|that s not what/);
  add("damage", /damage|damaged|ruined|bleach|discolor|torn|ripped|worse after|after.*cleaning/);
  add("refund", /refund|money back|chargeback|reimburse/);
  add("complaint", /complaint|unhappy|not happy|dissatisfied|poor job|bad job|job was bad|still dirty|missed.*spot/);
  add("cancel", /\bcancel|cancellation|\bcanel\b/);
  add(
    "closing",
    /closing date|no closing|haven'?t closed|not closed yet|waiting to close|when (?:we|i) close|we close|they close|close on the|closing on|\bclosing\b|after (?:we )?close|before (?:we )?close|possession date|get (?:the )?keys|don'?t have (?:the |our |a )?keys|get the house|we.?re buying|buying (?:a |the )?(?:house|home)|\bescrow\b|\brealtor\b|when it'?s free to clean|move[- ]?in|before we move|don'?t have (?:a |the |our )?(?:date|closing)|no date yet/,
  );
  add("reschedule", /resched|resced|change.*(appointment|time|date)|move.*appointment|can(?:not|'t) make.*appointment/);
  add("confirmation", /didn[' ]?t get|no confirmation|not confirmed|confirm.*appointment|no email/);
  add("same-day", /same.?day|\basap\b|urgent|right away|(?:^|\s)today(?:\s|$)|tomorrow/);
  add("weekend", /weekend|saturday|sunday/);
  add(
    "send-link",
    /send (?:me )?(?:the )?(?:link|page|url|times|list|openings)|book(?:ing)? link|that link|the book page|weekday times|send the weekday/,
  );
  add("how-book", /how do i book|how (?:does|do) (?:booking|i book)|walk me through|what(?:'s| is) (?:the )?next step|how does this work/);
  add(
    "booking",
    /\bbook\b|(?:want to|need to|ready to|let'?s) book|new appointment|availability|available|opening|see times|grab a (?:time|slot)|i want (?:a |an )?(?:cleaning|appointment)/,
  );
  add("last-slot", /last (?:daily )?appointment|last (?:slot|opening|start)|latest (?:appointment|time|start)|how late|after 3|4\s*(?:pm|p\.m\.?)|evening appointment|late afternoon|end of the (?:day|schedule)|stop (?:taking|scheduling)|last one of the day|what time do you stop|latest you (?:can )?come|last time you can come|too late to come|come after/);
  add("hours", /what(?:'s| are) your hours|are you open|business hours|(?:^|\s)hours(?:\s|$)|what time (?:are you|do you)|your schedule|about (?:your )?scheduling|how (?:does|is) (?:your )?scheduling|(?:^|\s)scheduling(?:\s|$)|appointment times|what times do you/);
  add(
    "need-clean",
    /need .{0,40}(?:home|house|carpets?|place|rug).{0,24}(?:clean|done)|can you clean|come clean|get (?:it|them|the (?:carpets?|house|home)) cleaned/,
  );
  add("closet", /\bclosets?\b/);
  add(
    "pet-loss",
    /(?:pet|dog|cat|puppy|kitten|pup).*(?:died|dead|passed|put down|put to sleep)|(?:died|passed away|put down|put to sleep).*(?:pet|dog|cat|puppy|kitten)|lost (?:my|our|the) (?:pet|dog|cat|puppy|kitten)|we lost (?:our|the|a) (?:dog|cat|pet)/,
  );
  add("price", /price|pricing|\bprce\b|cost|how much|amount|rate|\$?99|\$?149|extra room|additional room|what does.*cover/);
  add("pet-treat", /pet treatment|pet clean|urine|odor|pet stain|pet package/);
  add("pet-mention", /\b(?:pet|animal|dog|cat|cats|dogs)\b/);
  add("area", /service area|coverage area|do you serve|come to|travel(?: to)?|location|what cities|what city|where do you work|near me|cross street|do you (?:go|get) (?:out )?to/);
  add("drying", /dry|drying|wet|walk on|use.*carpet|how long.*dry/);
  add(
    "prep",
    /prepare|prep|get ready|getting ready|to get ready|ready for (?:you|us|the clean)|what (?:do i|should i|to) do before|before you (?:come|arrive|get here)|need to move|do i move|do you move|will you move|move (?:the )?(?:couch|couches|sofa|bed|furniture)|clean under|underneath|\bvacuum\b|\bclear\b/,
  );
  add("upholstery", /clean(?:ing)? (?:the )?(?:sofa|couch|loveseat|sectional|recliner|furniture)|how much.*(?:sofa|couch|loveseat|chair|recliner|sectional|furniture)|upholstery/);
  add("other-services", /tile|grout|hard.?floor/);
  add("commercial", /commercial|(?<!home )office|business|large space|unusual|warehouse/);
  add("stain", /stain|spot|spill|wine|coffee|ink|grape|juice/);
  add("specialized", /mold|sewage|flood|biohazard|water damage|paint/);
  add("safety", /allerg|chemical|sensitive|safe for|child|baby|kids?/);
  add(
    "payment",
    /payment|\bpay\b|paid|card|cash|invoice|receipt|deposit|venmo|paypal|zelle|credit|debit|apple pay|how do i pay|what do you take|take checks|accept checks|pay (?:by|with|via) (?:a )?che(?:ck|que)|write (?:a )?che(?:ck|que)|what about (?:a )?che(?:ck|que)s?/,
  );
  add("method", /how.*clean|process|equipment|steam|encapsulation|low.moisture|what do you use/);
  add("guarantee", /guarantee|promise|definitely.*remove|will.*come out/);
  add("messages", /sent.*(message|text)|missed.*message|\btexted\b|housecall.*message|\binbox\b/);
  add("human", /human|person|owner|someone|representative|talk to|call me|phone number|call you|real person|keith/);
  add("later", /maybe later|think about it|not now|i'?ll pass|just looking|just browsing/);
  add("soon", /how soon|next available|earliest|first opening|when can you|how far (?:ahead|in advance)/);
  add("included", /what(?:'s| is) included|what do i get|what(?:'s| is) in the|what(?:'s| is) (?:in )?the \$ ?99/);
  add("coupon", /coupon|discount|deal|promo|special/);
  if (asksServiceDiscount(text)) intents.push("service-discount");
  add("bot", /are you (?:a )?bot|is this (?:a )?bot|automated|real or/);
  add("duration", /how long (?:does|will|is) (?:the )?(?:job|visit|clean|appointment)|how long (?:are you|will you be)|time does it take/);
  add("who-comes", /who (?:comes|shows)|how many (?:people|techs|guys)|just you|do you come yourself/);
  add("parking", /parking|park (?:on|in)|driveway|street park/);
  add("apartment", /apartment|complex|hoa|third floor|upstairs unit/);
  add("rug", /area rug|rug\b|oriental/);
  add("wool", /\bwool\b|berber|sisal|natural fiber/);
  add("protector", /protector|scotchgard|stain shield/);
  add("smell", /smell|stink|musty after/);
  add("pets-home", /pets? (?:in|at) (?:the )?house|leave the dog|put the dog|cats? out/);
  add(
    "home",
    /(?:need|have) to be (?:home|there|present)|(?:need|have) to stay|(?:be|stay) home for|someone (?:need|has|have) to be|anyone (?:need|has|have) to be|do i (?:need|have) to (?:be )?(?:there|home|present)|won'?t be (?:home|there)|not (?:going to )?be (?:home|there)|nobody (?:will be|home)|can'?t be (?:there|home)|leave a key|hide (?:a |the )?key|hidden key|lockbox|gate code|garage code|i'?ll be at work|while i(?:'?m| am) at work|at work|can i (?:leave|go to work|not be there)|empty house|\bvacant\b|unoccupied|not present/,
  );
  add("already", /already (?:told|said)|i (?:just )?told you|you (?:didn'?t|did not) listen|that(?:'s| is) not what i said|i said wichita|remember i said/);
  add("tip", /\btip\b|gratuity/);
  add("insured", /licen[sc]e|insured|bonded|background/);
  add("review", /reviews?|google|facebook rating|testimonials/);
  add("advance", /how far|how soon can i book|book (?:for )?(?:next week|this week)/);
  add("weather", /rain|snow|weather|storm/);
  add("new-carpet", /new carpet|just installed|brand new/);
  add("move-out", /move.?out|rental|landlord|deposit photos/);
  add("fleas", /\bfleas?\b|ticks|bed ?bugs|pests?/);
  add("smoke", /smoke odor|cigarette|fire smell/);
  add("recurring", /every month|weekly|recurring|regularly|standing appointment/);
  add("spanish", /espa[nñ]ol|spanish/);
  add("how-are-you", /how are you|how'?s it going|what'?s up/);
  add("who", /who (?:is this|are you)|what(?:'s| is) your name/);
  add("yes", /^(yes|yeah|yep|yup|sure|ok|okay|correct|right|please|do it|sounds good|let s do it|book it|send it|that works)[ .!]*$/);
  add("no", /^(no|nope|not really|nah)[ .!]*$/);
  add("thanks", /thank|thanks|appreciate/);
  add("greeting", /^(hi|hello|hey|yo|good morning|good afternoon|good evening)[ '!.-]*$/);
  return [...new Set(intents)];
}

function bookNote(state) {
  const bits = [];
  if (state.city && state.city !== "county") bits.push(cityLabel(state.city));
  if (state.rooms) bits.push(`${state.rooms} rooms`);
  if (state.pet) bits.push("pet treatment");
  return bits.length ? bits.join(", ") : "";
}

function bookNowLine() {
  return `We’d love to help — click this link. ${LIVE_TIMES}`;
}

function offerBookLine() {
  return "If you’d like to see times, I can send the booking link — no rush.";
}

export function leadsWithHardship(text) {
  const spoken = clean(text || "");
  if (!spoken) return false;
  return /(?:pet|dog|cat|puppy|kitten|mom|dad|mother|father|wife|husband|son|daughter|brother|sister|grandma|grandpa|husband|family).*(?:died|dead|passed|put down|put to sleep)|(?:died|passed away|put down|put to sleep|funeral)|lost (?:my|our) (?:pet|dog|cat|mom|dad|wife|husband|son|daughter)|we lost (?:our|the|a) |in the hospital|hospice|\bcancer\b|diagnosed|had a (?:fire|flood)|(?:house|home|basement).*(?:flood|fire|burned)|broke in|burglar|divorce|evict|foreclos|lost everything|devastat|heartbreak|having a hard time|going through (?:a lot|hell)|nightmare|bad news|so sorry to (?:say|tell)/.test(
    spoken,
  );
}

function alreadySorry(bubbles) {
  return /so sorry|i.?m sorry|i am sorry/i.test(String(bubbles[0] || ""));
}

function reply(state, intent, bubbles, extra = {}) {
  state.lastIntent = intent;
  if (extra.stage) state.stage = extra.stage;
  const list = Array.isArray(bubbles) ? [...bubbles] : [bubbles];
  if (leadsWithHardship(state.lastUser) && !alreadySorry(list)) {
    list.unshift("I’m so sorry about that.");
  }
  const alreadyInvited = Boolean(state.invitedTimes);
  let handed = Boolean(extra.sendLink || extra.linkOnly);
  if (extra.linkOnly) {
    state.sentLink = true;
    state.stage = extra.stage || "booking";
    if (!list.includes(bookingUrl)) list.push(bookingUrl);
  } else if (extra.sendLink) {
    state.sentLink = true;
    state.stage = extra.stage || "booking";
    if (!list.includes(bookingUrl)) list.push(...howToBook(state).filter((line) => !list.includes(line)));
  } else if (
    extra.lead !== false &&
    !QUIET.has(intent) &&
    readyToBook(state) &&
    !list.includes(bookingUrl) &&
    !/housecallpro/.test(list.join(" "))
  ) {
    list.push(...howToBook(state));
    state.sentLink = true;
    state.invitedTimes = true;
    state.stage = "booking";
    handed = true;
  } else if (extra.lead !== false) {
    const beat = conversionLead(state, intent, list);
    if (beat) list.push(beat);
  }
  const cleaned = dropKnownQuestions(state, list, { alreadyInvited });
  list.length = 0;
  list.push(...cleaned);
  return {
    bubbles: list,
    sendLink: handed,
    booking: handed,
    phone: Boolean(extra.phone),
    messenger: false,
    quickReplies: [],
    buttons: [],
    bookNote: extra.bookNote || bookNote(state),
  };
}

function payloadToText(payload) {
  if (!payload) return "";
  if (payload === "GET_STARTED") return "";
  if (payload === "BOOK") return "I want to book";
  if (payload === "PRICE") return "how much";
  if (payload === "PETS") return "pet treatment";
  if (payload === "AREA") return "service area";
  if (payload === "CALL" || payload === "HUMAN") return "talk to a person";
  if (payload === "ASK_ZIP") return "__ask_zip__";
  if (payload.startsWith("CITY_")) return payload.slice(5).replace(/_/g, " ");
  return payload.replace(/_/g, " ").toLowerCase();
}

function weekdayWanted(text) {
  const match = text.match(/\b(monday|tuesday|wednesday|thursday|friday)\b/);
  return match ? titleCase(match[1]) : null;
}

function helloLine() {
  return "Hey, we would love to help — what can we get cleaned for you?";
}

function scopeAsk() {
  return "We’d love to get you on our schedule. Do you know how many rooms, hallways, and stairs you have, and do you have any major pet issues you’re dealing with?";
}

function cityAsk() {
  return "Whenever you’re ready to pick a day, it helps to know what city the house is in — I stay about 15 miles of downtown. No rush if you’re still just looking at the price.";
}

function hearBack(state, text, intents) {
  const bits = [];
  if (state.city && state.city !== "county") bits.push(cityLabel(state.city));
  if (state.rooms) bits.push(`${state.rooms} room${state.rooms === 1 ? "" : "s"}`);
  if (state.halls != null) bits.push(`${state.halls} hall${state.halls === 1 ? "" : "s"}`);
  if (state.stairs != null) bits.push(`${state.stairs} stair${state.stairs === 1 ? "" : "s"}`);
  if (state.pet) bits.push("pet issues");
  const day = weekdayWanted(text) || state.weekday;
  if (day) bits.push(day);
  if (intents.includes("stain")) {
    const named = text.match(/\b(wine|coffee|grape(?: juice)?|ink|pet stain|urine|juice|tea|soda|blood)\b/);
    bits.push(named ? named[1] : "the stain");
  }
  if (intents.includes("apartment")) bits.push("the apartment");
  if (!bits.length) return "";
  if (bits.length === 1) return bits[0];
  if (bits.length === 2) return `${bits[0]}, ${bits[1]}`;
  return `${bits.slice(0, -1).join(", ")}, and ${bits.at(-1)}`;
}

function applySlots(state, text) {
  const zip = findZip(text);
  const city = findCity(text);
  const estimate = roomEstimate(text);
  const day = weekdayWanted(text);
  if (day) state.weekday = day;
  if (zip) state.zip = zip;
  if (city && city !== "county") state.city = city;
  if (city === "county") state.city = state.city || "county";
  if (estimate?.whole) state.wholeHome = true;
  if (estimate?.rooms) {
    state.rooms = estimate.rooms;
    state.extras = estimate.extras;
    state.wholeHome = false;
  }
  const halls = hallCount(text);
  const stairs = stairCount(text);
  if (halls != null) state.halls = halls;
  if (stairs != null) state.stairs = stairs;
  if (mentionsRug(text)) state.rug = true;
  if (/vacant|garage code|hide a key|hidden key|won'?t be (?:home|there)|will not be (?:home|there)|can'?t be (?:home|there)/.test(text)) {
    state.homeAnswered = true;
  }
  if (wantsPetTreatment(text)) {
    state.pet = true;
    state.petAnswered = true;
  }
  if (noPetIssues(text) || /just (?:the )?standard|regular clean|without pet/.test(text)) {
    state.pet = false;
    state.petAnswered = true;
  }
  const area = inServiceArea(state.city, state.zip);
  if (area === true) state.inArea = true;
  if (area === false) state.inArea = false;
  if (isMilitaryHousing(text)) state.inArea = false;
  if (asksServiceDiscount(text)) state.serviceDiscount = true;
  const name = guessFirstName(text);
  if (name) state.firstName = name;
  syncMemory(state);
}

function outOfAreaLine(state) {
  const name = state.city && state.city !== "county" ? cityLabel(state.city) : "that spot";
  if (["mulvane", "augusta", "newton"].includes(state.city)) {
    return `We would love to get out there, but ${name} sits outside our usual 15-mile ring. If you’re on the Wichita side of it, send the ZIP and we’ll tell you straight.`;
  }
  return `We would love to get out there, but ${name} isn’t in our service area. We stay within about 15 miles of downtown — Derby, Andover, Goddard, Maize, that ring.`;
}

export function isAfterHours(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);
  const day = parts.find((p) => p.type === "weekday")?.value;
  const hour = Number(parts.find((p) => p.type === "hour")?.value);
  if (day === "Sat" || day === "Sun") return true;
  return hour < 7 || hour >= 17;
}

export function opener(_now = new Date()) {
  return { bubbles: [helloLine()], stage: "listen", quickReplies: [], buttons: [] };
}

export function createConversation(seed = {}) {
  const state = {
    city: null,
    zip: null,
    inArea: null,
    rooms: null,
    extras: 0,
    halls: null,
    stairs: null,
    rug: false,
    pet: false,
    petAnswered: false,
    askedScope: false,
    invitedTimes: false,
    homeAnswered: false,
    wholeHome: false,
    lastIntent: null,
    lastUser: "",
    stage: "open",
    sentLink: false,
    weekday: null,
    firstName: null,
    channel: "site",
    turns: 0,
    history: [],
    memory: emptyMemory(),
    _fromPlaybook: false,
    ...seed,
  };
  if (!state.memory) state.memory = emptyMemory();
  syncMemory(state);
  const onMessenger = () => state.channel === "messenger";

  const start = (now) => {
    const opened = opener(now);
    state.stage = opened.stage;
    state.lastIntent = "opener";
    return { ...opened, sendLink: false, booking: false, phone: false, bookNote: "" };
  };

  const sendThePage = (lead) => {
    const bubbles = lead ? [lead, ...howToBook(state)] : howToBook(state);
    return reply(state, "booking", bubbles, { sendLink: true, stage: "booking" });
  };

  const respond = (raw) => {
    const original = String(raw || "").trim();
    if (original === "__ask_zip__") {
      return reply(state, "area", "We would love to check that for you — the ZIP is enough for us to see if we’re in that ring.");
    }
    const text = clean(original);
    if (!text) return { bubbles: [], quickReplies: [], buttons: [] };

    applySlots(state, text);
    const intents = intentSet(text);
    const estimate = roomEstimate(text);
    const heard = hear(text, original);
    if (!state._fromPlaybook) {
      state.lastUser = original;
      state.lastHeard = {
        job: heard.closingStory ? "closing" : heard.hold ? "hold" : null,
        closingStory: heard.closingStory,
        hold: heard.hold,
      };
      state.turns += 1;
    }

    if (!state._fromPlaybook) {
      const composed = composeJob({ state, spoken: `${text} ${original}`.toLowerCase(), intents, quoteLine });
      if (composed?.bubbles?.length) {
        state.lastThought = { want: "a house clean", cannot: "", offer: composed.bubbles[0] };
        return reply(state, composed.intent || "price", composed.bubbles, { stage: composed.stage || state.stage });
      }
    }

    const keepCollecting =
      state.stage === "need_scope" ||
      mentionsRug(text) ||
      mentionsWoolRug(text) ||
      afterMove(text) ||
      (intents.includes("need-clean") && !state.rooms);

    const quoteThisTurn = Boolean(estimate?.rooms);

    if (!state._fromPlaybook && !keepCollecting && !quoteThisTurn) {
      const thoughtFirst = think({ text, original, intents, heard, state, memory: state.memory });
      if (thoughtFirst?.bubbles?.length) {
        let bubbles = [...thoughtFirst.bubbles];
        if (thoughtFirst.sendLink && !bubbles.includes(bookingUrl) && thoughtFirst.intent !== "area") {
          bubbles.push(bookingUrl);
        }
        bubbles = ground(thoughtFirst.plan || thoughtFirst, bubbles);
        state.lastThought = { want: thoughtFirst.want, cannot: thoughtFirst.cannot, offer: thoughtFirst.offer };
        rememberPlan(state, thoughtFirst.plan || thoughtFirst);
        return reply(state, thoughtFirst.intent || "reason", bubbles, {
          sendLink: Boolean(thoughtFirst.sendLink) && !thoughtFirst.linkOnly,
          linkOnly: Boolean(thoughtFirst.linkOnly || thoughtFirst.sendLink),
          phone: Boolean(thoughtFirst.phone),
          stage: thoughtFirst.sendLink ? "booking" : state.stage,
        });
      }
    }

    const yes = intents.includes("yes");
    const no = intents.includes("no");
    const wantsBook =
      intents.includes("booking") ||
      intents.includes("send-link") ||
      (yes &&
        (state.stage === "quoted" ||
          state.stage === "offered" ||
          state.lastIntent === "price" ||
          Boolean(state.rooms)));

    if (!state._fromPlaybook) {
      const skipRewrite =
        wantsBook ||
        intents.includes("how-book") ||
        intents.includes("send-link") ||
        yes ||
        no ||
        intents.includes("greeting") ||
        intents.includes("correction") ||
        intents.includes("upholstery") ||
        intents.includes("payment") ||
        intents.includes("service-discount") ||
        intents.includes("coupon") ||
        intents.includes("hours") ||
        intents.includes("last-slot") ||
        intents.includes("home") ||
        intents.includes("closing") ||
        heard.closingStory ||
        heard.hold ||
        keepCollecting ||
        mentionsRug(text) ||
        afterMove(text) ||
        think({ text, original, intents, heard }) ||
        schedulingWins(text, original, intents) ||
        mentionsFurniture(text);
      let found = skipRewrite ? null : pickSituation(text);
      if (found?.id === "area" && (findCity(text) || findZip(text))) found = null;
      if (found && clean(found.canonical) !== text) {
        state._fromPlaybook = true;
        const result = respond(found.canonical);
        state._fromPlaybook = false;
        return result;
      }
    }

    if (intents.includes("correction")) {
      return reply(state, "correction", [
        "You’re right — thank you for catching that. I missed it.",
        "Whenever you’re ready, say it again in your words. City, rooms, a stain, a time change — we’ll stay on that.",
      ]);
    }

    if (
      intents.includes("already") &&
      !intents.includes("weekend") &&
      !intents.includes("same-day") &&
      !intents.includes("send-link") &&
      !intents.includes("how-book")
    ) {
      if (state.city) {
        return reply(
          state,
          "already",
          [`You’re right — ${hearBack(state, text, intents) || cityLabel(state.city)}. I have it.`, quoteLine(state)],
          { stage: "quoted" },
        );
      }
      return reply(state, "already", "You’re right, and I’m sorry I dropped it. City and rooms again whenever you’re ready, in your words.");
    }

    const thought = think({ text, original: state.lastUser, intents, heard });
    if (thought?.bubbles?.length) {
      const bubbles = [...thought.bubbles];
      if (thought.sendLink && !bubbles.includes(bookingUrl)) bubbles.push(bookingUrl);
      state.lastThought = { want: thought.want, cannot: thought.cannot, offer: thought.offer };
      return reply(state, thought.intent || "reason", bubbles, {
        sendLink: Boolean(thought.sendLink) && !thought.linkOnly,
        linkOnly: Boolean(thought.linkOnly || thought.sendLink),
        stage: thought.sendLink ? "booking" : state.stage,
      });
    }

    if (intents.includes("weekend")) {
      const bubbles = [
        "We would love to help — we just don’t run Saturday or Sunday. A weekday is when we can take care of you.",
      ];
      if (intents.includes("price") || estimate?.rooms) bubbles.push(quoteLine(state));
      return reply(state, "hours", bubbles, { stage: "offered" });
    }
    if (intents.includes("same-day") && !intents.includes("confirmation") && !intents.includes("last-slot")) {
      return reply(
        state,
        "same-day",
        `We would love to get it cleaned for you — we just don’t do same-day. ${LIVE_TIMES}`,
        { stage: "offered", linkOnly: true },
      );
    }

    if (
      intents.includes("home") &&
      /3\s*:?\s*30|10\s*:?\s*30|\b8\s*a|what time|when do you/.test(text)
    ) {
      return reply(state, "home", `${homeLine(text, state.lastUser)} ${hoursLine(text, state.lastUser)}`.trim(), {
        linkOnly: true,
      });
    }

    if (intents.includes("home") && !intents.includes("hours")) {
      const access = homeLine(text, state.lastUser);
      if (intents.includes("how-book") || intents.includes("send-link")) {
        if (state.inArea === false) return reply(state, "area", outOfAreaLine(state));
        return sendThePage(access);
      }
      return reply(state, "home", access);
    }

    if (intents.includes("soon") && !intents.includes("same-day") && !schedulingWins(text, state.lastUser, intents)) {
      return reply(state, "soon", soonLine(), { stage: "offered", linkOnly: true });
    }

    if (
      schedulingWins(text, state.lastUser, intents) &&
      !intents.includes("how-book") &&
      !intents.includes("send-link")
    ) {
      if (intents.includes("soon") && !/10\s*:?\s*30|3\s*:?\s*30|8\s*a|morning|afternoon|last|first|what time|hours|schedule/.test(text)) {
        return reply(state, "soon", soonLine(), { stage: "offered", linkOnly: true });
      }
      return reply(state, "hours", hoursLine(text, state.lastUser), { stage: "offered", linkOnly: true });
    }

    if (intents.includes("pet-loss")) {
      const bubbles = ["I’m so sorry about that."];
      const odor =
        intents.includes("pet-treat") ||
        intents.includes("smell") ||
        /odor|smell|stink|urine|pee/.test(text);
      if (odor) {
        bubbles.push(
          `For the odor, pet treatment is $${petAmount(state.rooms)} plus tax for the five-room size. ${odorHonesty()}`,
        );
      } else {
        bubbles.push("Whenever you’re ready, we would love to help with the house.");
      }
      return reply(state, "pet-loss", bubbles, { stage: odor ? "quoted" : "listen" });
    }

    if (intents.includes("closet")) {
      return reply(
        state,
        "closet",
        "We would love to get those rooms done — closets are included in the room and do not count as an additional area.",
      );
    }

    if (intents.includes("how-book") || intents.includes("send-link")) {
      if (state.inArea === false) return reply(state, "area", outOfAreaLine(state));
      return sendThePage();
    }

    if (wantsBook && !intents.includes("weekend") && !intents.includes("same-day")) {
      if (state.inArea === false) return reply(state, "area", outOfAreaLine(state));
      if (!state.rooms && !yes) {
        return reply(state, "price", scopeAsk(), { stage: "need_scope" });
      }
      return sendThePage();
    }

    if (intents.includes("need-clean") && !state.rooms) {
      return reply(state, "price", scopeAsk(), { stage: "need_scope" });
    }

    if (yes && (state.stage === "listen" || state.stage === "need_scope") && !state.rooms) {
      return reply(state, "listen", "We would love to help — what do you need cleaned?", { stage: "listen" });
    }
    if (yes && state.stage === "need_city" && !state.city) {
      return reply(state, "area", cityAsk(), { stage: "need_city" });
    }
    if (no && (state.stage === "quoted" || state.stage === "offered")) {
      return reply(state, "clarify", "No problem. Too many rooms, the week, or something else on your mind?");
    }

    if (intents.includes("greeting")) {
      return reply(
        state,
        "greeting",
        helloLine(),
        { stage: state.rooms ? "quoted" : "listen" },
      );
    }
    if (intents.includes("how-are-you")) {
      return reply(state, "how-are-you", "Doing well, thank you — we would love to help. What can we get cleaned for you?");
    }
    if (intents.includes("who") && !intents.includes("who-comes")) {
      return reply(
        state,
        "who",
        TEXT_US,
        { phone: true },
      );
    }
    if (intents.includes("thanks")) {
      return reply(state, "thanks", "You’re so welcome. We would love to help whenever you’re ready.");
    }
    if (intents.includes("later")) {
      return reply(state, "later", "Of course — no rush at all. We would love to help whenever you’re ready.");
    }
    if (intents.includes("bot")) {
      return reply(
        state,
        "bot",
        TEXT_US,
        { phone: true },
      );
    }
    if (intents.includes("spanish")) {
      return reply(state, "spanish", `We write in English here. ${TEXT_US}`, {
        phone: true,
      });
    }
    if (isMilitaryHousing(text) && (intents.includes("coupon") || intents.includes("service-discount") || intents.includes("area"))) {
      return reply(state, "area", "We would love to help where we can — we just don’t service on-base military housing.");
    }
    if (intents.includes("service-discount")) {
      return withHouseQuote(state, "service-discount", DISCOUNT_LINE);
    }
    if (intents.includes("coupon")) {
      return reply(
        state,
        "coupon",
        "We would love to get it cleaned for you. Nothing extra running right now — our pricing is $75 up to three rooms, $99 up to five, $149 for pets on the five-room size, plus tax. Extra rooms $15 after five.",
      );
    }
    if (intents.includes("review")) {
      return reply(
        state,
        "review",
        "We would love for you to read what’s really there. We don’t paste ratings in chat — search Wichita Carpet Cleaning Services on Google or the Facebook page.",
      );
    }
    if (intents.includes("insured")) {
      return reply(state, "insured", "We would love to make this easy — we’re owner-operated with professional equipment. If you need paperwork for a landlord, just say so when you book and we’ll sort it.");
    }
    if (intents.includes("tip")) {
      return reply(state, "tip", "That’s very kind — tips aren’t expected. What you see when you book is the price, and we would love to take care of the house.");
    }
    if (intents.includes("recurring")) {
      return reply(
        state,
        "recurring",
        "We would love to keep the house looking nice. We don’t run a standing weekly route, but you can book the next visit each time you want one.",
      );
    }
    if (intents.includes("fleas")) {
      return reply(
        state,
        "fleas",
        "We would love to help the house, but we’re not a pest company. A clean helps; it doesn’t treat fleas or bed bugs. Please call your exterminator first, then we’d be glad to clean.",
      );
    }
    if (intents.includes("smoke") && !intents.includes("stain")) {
      return reply(
        state,
        "smoke",
        "We would love to help. Smoke in the fiber is a maybe, and we won’t promise the smell is gone. If you still want a standard clean, we can take care of that.",
      );
    }
    if (intents.includes("new-carpet")) {
      return withHouseQuote(
        state,
        "new-carpet",
        "We would love to get that cleaned for you. If it was just installed, wait until the installer says it’s okay — new glue and fibers are picky. Then our regular pricing still applies.",
      );
    }
    if (intents.includes("wool") && !intents.includes("rug")) {
      return reply(state, "wool", WOOL_LINE);
    }
    if (intents.includes("protector")) {
      return reply(
        state,
        "protector",
        "We would love to help. We don’t add a separate Scotchgard package in the regular price. If you want protector, ask on the visit and we’ll tell you if we have it that day.",
      );
    }
    if (intents.includes("apartment")) {
      if (state.city && state.inArea) {
        return reply(
          state,
          "apartment",
          `We would love to help in ${cityLabel(state.city)} — that’s in our ring. A third floor is fine if we can park and the office lets us in.`,
          { stage: "quoted" },
        );
      }
      return reply(
        state,
        "apartment",
        "We would love to help with the apartment. That’s fine if we’re in the usual ring and we can park — the office just needs to let us in.",
        { stage: state.city ? state.stage : state.stage },
      );
    }
    if (intents.includes("parking")) {
      return reply(state, "parking", "We would love to make that easy — a driveway or a legal street spot is enough. Leave a note if we should use the alley.");
    }
    if (intents.includes("who-comes")) {
      return reply(state, "who-comes", "We would love to take care of it ourselves — it’s just us, small on purpose, so you know who is in the house.");
    }
    if (intents.includes("duration")) {
      return reply(
        state,
        "duration",
        "We would love to get it done right. Most five-room houses are a couple of hours. More rooms or heavy soil runs longer — we won’t clock-watch you, we finish the job.",
      );
    }
    if (intents.includes("pets-home")) {
      return reply(
        state,
        "pets-home",
        "We would love to work around them. A crate or a closed bedroom is kindest. We can work around a calm dog, and cats usually prefer a quiet room.",
      );
    }
    if (intents.includes("weather")) {
      return reply(
        state,
        "weather",
        "We would love to keep the appointment. Rain doesn’t stop a carpet clean inside. Ice or a closed road might — we’ll text if we have to slide the day.",
      );
    }
    if (intents.includes("move-out")) {
      return reply(
        state,
        "move-out",
        "We would love to help with the move-out. It’s the same $99 / $149 book. We don’t write landlord letters, and the photos on your phone are yours.",
      );
    }
    if (intents.includes("included")) {
      return withHouseQuote(
        state,
        "included",
        state.rooms
          ? quoteLine(state)
          : "We would love to get it cleaned for you. Our pricing is $75 plus tax up to three rooms, and $99 plus tax for five rooms, two halls, and one stair. Extra rooms are $15 after five. Pets are $149 for that five-room size.",
      );
    }
    if (intents.includes("soon") && !intents.includes("same-day")) {
      return reply(
        state,
        "soon",
        soonLine(),
        { stage: "offered" },
      );
    }

    if (isMilitaryHousing(text)) {
      return reply(state, "area", "We would love to help where we can — we just don’t service on-base military housing.");
    }
    if (state.inArea === false && (intents.includes("area") || intents.includes("price") || intents.includes("booking") || findCity(text) || findZip(text))) {
      return reply(state, "area", outOfAreaLine(state));
    }

    if (intents.includes("specialized")) {
      return reply(
        state,
        "specialized",
        [
          "We want to take care of you the right way — that’s not a standard clean, so please don’t book the regular price for mold, sewage, flood, or paint.",
          `${TEXT_PHOTO} We’ll look at it with you before anyone walks in.`,
        ],
        { phone: true },
      );
    }
    if (intents.includes("damage") || intents.includes("complaint")) {
      return reply(
        state,
        intents.includes("damage") ? "damage" : "complaint",
        [
          "I’m sorry that happened.",
          `${TEXT_PHOTO} I’ll look at it myself.`,
        ],
        { phone: true, messenger: false },
      );
    }
    if (intents.includes("refund")) {
      return reply(
        state,
        "refund",
        [
          "I’m sorry you’re dealing with that. Refunds aren’t automatic — we look at them one by one after the visit.",
          `${TEXT_PHOTO} We’ll look into it.`,
        ],
        { phone: true },
      );
    }
    if (intents.includes("cancel")) {
      return reply(
        state,
        "cancel",
        CANCEL_LINE,
        { phone: true },
      );
    }
    if (intents.includes("reschedule")) {
      return reply(
        state,
        "reschedule",
        `Of course — we would love to get you a better time. Text ${phoneDisplay} or message us here and we’ll take care of it.`,
        { phone: true },
      );
    }
    if (intents.includes("confirmation")) {
      return reply(
        state,
        "confirmation",
        NO_CONFIRM_MAIL,
        { phone: true },
      );
    }

    if (intents.includes("prep") && !intents.includes("upholstery")) {
      const moveLine =
        "We do move smaller items like couches and love seats, clean underneath them, and then return them to the original location. However, we do not move larger furniture items like entertainment centers, sectionals, beds, dressers, etc. If you would like to move those items prior to our arrival, then we’d gladly clean under them.";
      const askingWhatWeMove = /do you move|will you move|you (?:guys |all )?move|move the (?:couch|sofa|loveseat)/.test(
        text,
      );
      return reply(
        state,
        "prep",
        askingWhatWeMove
          ? moveLine
          : `To get ready, just pick up the small stuff — toys, clothes, breakables — so we can get to the carpet. ${moveLine}`,
      );
    }
    if ((intents.includes("upholstery") || mentionsFurniture(text)) && !intents.includes("prep")) {
      if (state.rooms || estimate?.rooms) {
        return reply(state, "other-services", furnitureAndCarpetLine(state), { stage: "quoted" });
      }
      const line = otherServicePrice(text) || otherServicePrice("upholstery");
      return reply(state, "other-services", line);
    }
    if (intents.includes("other-services") && intents.includes("price")) {
      const line = otherServicePrice(text);
      if (line) {
        return withHouseQuote(state, "other-services", line);
      }
    }
    if (intents.includes("other-services")) {
      const line = otherServicePrice(text) || "We would love to help with that — tile, grout, and hard floors can go on the same visit as the carpet.";
      return withHouseQuote(state, "other-services", line);
    }

    const homeOffice = /home office/.test(text);
    if (intents.includes("commercial") && !homeOffice) {
      return reply(
        state,
        "commercial",
        [
          "We would love to help with commercial and odd-sized spaces — we just price those after we see it.",
          `Send a photo and the size here in Messenger. Please don’t use the regular house price for that.`,
        ],
        { phone: true },
      );
    }

    if (intents.includes("safety")) {
      const pet = /\b(dog|dogs|cat|cats|pet)\b/.test(text);
      const kid = /\b(kid|kids|child|baby)\b/.test(text);
      const who = pet ? "the dog" : kid ? "the kids" : "that";
      return withHouseQuote(
        state,
        "safety",
        `We would love to be careful with ${who}. We don’t soak the carpet, and it’s the same products as a regular visit. If there’s a product we should avoid, just tell us.`,
        { phone: true },
      );
    }
    if (intents.includes("stain") || intents.includes("guarantee")) {
      const next = [
        "We would love to get that looking better. A lot of spots do improve — we just can’t promise it’s gone, because fiber, what it is, and how old it is all matter.",
      ];
      if (intents.includes("price") || estimate?.rooms) next.push(quoteLine(state));
      return reply(state, "stain", next, { stage: state.rooms ? "quoted" : state.stage });
    }
    if (intents.includes("smell") && !intents.includes("pet-treat")) {
      return withHouseQuote(
        state,
        "smell",
        `We would love to leave the house smelling clean. If the house already has odor, pet treatment is $149 plus tax for the five-room size. ${odorHonesty()}`,
      );
    }

    if (state.inArea === false) {
      return reply(state, "area", outOfAreaLine(state));
    }

    if (intents.includes("human")) {
      return reply(
        state,
        "human",
        TEXT_US,
        { phone: true },
      );
    }

    if (intents.includes("hours") && !intents.includes("how-book") && !intents.includes("send-link")) {
      return reply(state, "hours", hoursLine(text, state.lastUser), { linkOnly: true });
    }
    if (intents.includes("drying") && !intents.includes("pet-treat")) {
      return reply(
        state,
        "drying",
        "We would love for you to get back on the carpet soon. We use low-moisture, so it usually dries a lot faster than a soak. Air, humidity, and the carpet still change the clock.",
      );
    }
    if (intents.includes("method")) {
      return reply(
        state,
        "method",
        "We would love to walk you through it. We pretreat, use counter-rotating brushes, and encapsulate — we don’t flood the carpet. We’re not CRI-certified, and we won’t pretend otherwise.",
      );
    }
    if (intents.includes("payment")) {
      return withHouseQuote(state, "payment", paymentLine(text, state.lastUser));
    }
    if (intents.includes("messages")) {
      return reply(
        state,
        "messages",
        "We would love to keep that with your visit. For a job you already booked, just reply in that appointment thread.",
      );
    }

    if (state.wholeHome && !state.rooms) {
      return reply(state, "price", "We would love to do the whole house — about how many rooms should we count?", {
        stage: "need_rooms",
      });
    }

    if (intents.includes("area") && !state.city && !state.zip) {
      return reply(
        state,
        "area",
        "We would love to come to you if you’re in our area. We stay about 15 miles of downtown — Derby, Andover, Goddard, Maize, that ring.",
        { stage: state.stage },
      );
    }

    if (
      state.inArea &&
      !estimate?.rooms &&
      !intents.includes("pet-mention") &&
      (intents.includes("area") ||
        (findCity(text) &&
          !intents.includes("price") &&
          !intents.includes("booking") &&
          !intents.includes("pet-treat")))
    ) {
      if (intents.includes("area") || findCity(text)) {
        return reply(
          state,
          "area",
          [`We would love to help in ${cityLabel(state.city)} — we come there.`],
          { stage: state.rooms ? "quoted" : "listen" },
        );
      }
    }

    if (
      estimate?.rooms ||
      intents.includes("price") ||
      intents.includes("pet-treat") ||
      intents.includes("booking") ||
      intents.includes("need-clean")
    ) {
      if (state.inArea === false) return reply(state, "area", outOfAreaLine(state));
      if (intents.includes("booking") && (state.city || state.zip || state.inArea)) {
        return sendThePage();
      }
      const bubbles = [quoteLine(state)];
      if (intents.includes("pet-treat") || /odor|smell|urine/.test(text)) {
        bubbles.push(odorHonesty());
      }
      if (intents.includes("pet-mention") && !state.pet && !state.petAnswered && !intents.includes("safety")) {
        bubbles.push(`If you need pet treatment, we would love to take care of that too — our pricing is $${petAmount(state.rooms)} plus tax for the five-room size.`);
      }
      return reply(state, intents.includes("pet-treat") ? "pet" : "price", bubbles, { stage: "quoted" });
    }

    if (state.rooms && /just (?:do )?(?:the )?carpet|installer said|never mind just/.test(text)) {
      return reply(state, "price", quoteLine(state), { stage: "quoted" });
    }

    const namedDay = weekdayWanted(text);
    if (state.rooms && namedDay && !intents.includes("weekend") && !heard.closingStory) {
      return sendThePage(`We would love to help ${namedDay} — click this link. All of the availabilities and times are up to the minute.`);
    }

    if (state.city && state.inArea && intents.length === 0 && !state.rooms) {
      return reply(state, "area", `We would love to help in ${cityLabel(state.city)} — we come there.`);
    }

    if (state.stage === "need_rooms" && !state.rooms) {
      return reply(state, "price", "Whenever you have it, a rough room count is plenty — we would love to put a price together for you.");
    }

    if (state.stage === "need_scope" && !state.rooms) {
      return reply(state, "price", scopeAsk());
    }

    if (state.stage === "need_city" && !state.city) {
      return reply(state, "area", cityAsk());
    }

    if (schedulingWins(text, state.lastUser, intents)) {
      return reply(state, "hours", hoursLine(text, state.lastUser), { stage: "offered", linkOnly: true });
    }

    if (state.rooms) {
      return reply(state, "price", quoteLine(state), { stage: "quoted" });
    }

    return reply(state, "unknown", "We would love to help — what do you need cleaned?");
  };

  const incoming = ({ text, payload } = {}, now) => {
    if (payload === "GET_STARTED" || (!text && !payload)) return start(now);
    const spoken = text || payloadToText(payload);
    if (spoken === "" && payload) return start(now);
    return respond(spoken);
  };

  return { respond, start, incoming, applyHeard, state };
}

export function applyHeard(state, heard) {
  if (!state || !heard) return state;
  if (heard.rooms) {
    state.rooms = heard.rooms;
    state.extras = Math.max(0, heard.rooms - 5);
    state.wholeHome = false;
  }
  if (heard.halls != null) state.halls = heard.halls;
  if (heard.stairs != null) state.stairs = heard.stairs;
  if (heard.city) state.city = String(heard.city).toLowerCase();
  if (heard.zip) state.zip = heard.zip;
  if (heard.pet) state.pet = true;
  const area = inServiceArea(state.city, state.zip);
  if (area === true) state.inArea = true;
  if (area === false) state.inArea = false;
  return state;
}

export function delayFor(text) {
  const len = (text || "").length;
  if (text === bookingUrl) return 520;
  return Math.min(1600, 380 + len * 14);
}
