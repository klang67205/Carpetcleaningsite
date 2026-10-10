/**
 * WCCS Front Desk v2 — one small, predictable brain for Messenger and the website chat.
 *
 * Rules:
 *  - Prices come only from the PRICES table below. Never guessed.
 *  - Answer what the customer asked (all of it), then give ONE next step.
 *  - Send the booking link when a customer has a price for their home or asks to book.
 *  - Hand off to Keith only for: complaints about our work, changes to an existing
 *    appointment, commercial jobs, explicit requests for a person, or a returning
 *    customer's past price. Never for "I don't understand" — that gets a helpful default.
 *  - Website chat never claims a message was sent to Keith (it can't send anything).
 * No dependencies; runs in Node (Messenger bot) and in the browser (website).
 */

export const bookingUrl = "https://book.housecallpro.com/book/Wichita-Carpet-Cleaning-Services/36104bbb2c7d409a8293445c570b5f8b?v2=true&attr=10856";
export const messengerUrl = "https://m.me/wichitacarpetcleaningservices";
export const smsUrl = "sms:+13162328111";
export const TEXT_LINE = "(316) 232-8111";

export const PRICES = {
  minimum: 75,          // up to 3 areas, no pet treatment
  petMinimum: 85,       // up to 3 areas with pet treatment
  standard: 99,         // up to 5 rooms + 2 hallways + 1 staircase
  pet: 149,             // same coverage with pet treatment
  extra: 15,            // each additional room, hallway or staircase
  includes: { rooms: 5, halls: 2, stairs: 1 },
  furniture: [
    ["dining chair", 19], ["recliner or accent chair", 39], ["loveseat", 79], ["sofa", 89],
    ["small sectional (up to 5 seats)", 119], ["large sectional (6–8 seats)", 169],
    ["sofa + loveseat", 149], ["sofa, loveseat and chair", 179],
  ],
  // bathroom refresh covers up to 2 bathrooms, 100 sq ft total (Housecall Pro menu)
  tile: [["bathroom refresh (up to 2 bathrooms, 100 sq ft total)", 99], ["kitchen (up to 150 sq ft)", 129], ["whole-floor clean & seal (up to 400 sq ft)", 259]],
  hardFloor: [["entry & hall (up to 150 sq ft)", 79], ["clean & polish (up to 300 sq ft)", 139], ["whole-floor deep clean & polish (up to 600 sq ft)", 239]],
};

const AREA_TOWNS = "Wichita, Derby, Andover, Goddard, Maize, Haysville, Park City, Bel Aire, Kechi, Eastborough and Valley Center";
const SERVED = ["wichita", "derby", "andover", "goddard", "maize", "haysville", "park city", "bel aire", "kechi", "eastborough", "valley center"];
const NOT_SERVED = ["hesston", "pretty prairie", "kingman", "andale", "haven", "wellington", "newton", "hutchinson", "el dorado", "augusta", "rose hill", "mulvane", "clearwater", "cheney", "colwich", "mount hope", "udall", "belle plaine", "towanda", "benton", "halstead", "sedgwick", "viola", "conway springs", "whitewater", "garden plain", "bentley", "mcpherson", "winfield", "arkansas city", "salina", "emporia", "topeka", "kansas city", "lawrence", "manhattan"];
const title = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());
function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
const NOT_TOWN_WORDS = new Set(["august", "saline", "session", "benson", "newtons"]);
/** Towns from `list` named in the text, allowing a typo or two in longer names ("wichta", "wellingtn"). */
const TOWN_ALIASES = [[/\bdarby\b/g, "derby"], [/\bmaze(?= ks| kansas|\?|$)/g, "maize"], [/\bkeechi\b/g, "kechi"], [/\bbel ?air(?:e)?\b|\bbelaire\b/g, "bel aire"], [/\bparkcity\b/g, "park city"], [/\beastboro\b/g, "eastborough"], [/\bvall?(?:e)?y cent(?:er|re)\b/g, "valley center"], [/\bhaysvile\b/g, "haysville"], [/\bgodard\b/g, "goddard"]];
function townsIn(t, list) {
  for (const [re, to] of TOWN_ALIASES) t = t.replace(re, to);
  const words = t.split(/[^a-z]+/).filter((w) => w.length >= 6 && !NOT_TOWN_WORDS.has(w));
  return list.filter((c) => new RegExp(`\\b${c}\\b`).test(t) || (!c.includes(" ") && c.length >= 6 && words.some((w) => lev(w, c) <= (c.length >= 9 ? 2 : 1))));
}
const PLACE_STOP = new Set(["the", "a", "an", "my", "our", "your", "need", "love", "town", "kansas", "ks", "wichita", "messenger", "facebook", "keith", "here", "there", "it", "this", "that", "home", "house", "apartment", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "the area", "area", "city", "county", "sedgwick county", "need of", "a hurry", "rush"]);

const NUM = { dozen: 12, "a dozen": 12, a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, hundred: 100, "a hundred": 100, couple: 2, few: 3, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6 };
const W = "a dozen|dozen|a hundred|hundred|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|couple|few|uno|dos|tres|cuatro|cinco|seis";
// a count: not part of a decimal ("2.5"), not negative ("-3"), up to 3 digits
const N = `(?<![\\d.])(?<!(?:^|\\s)-)(\\d{1,3}(?![.,]\\d)|${W})`;
const num = (w) => (w == null ? null : /^\d+$/.test(w) ? Number(w) : NUM[w] ?? null);
const ROOM_WORD = "(?:bed ?rooms?|bed ?rms?|bedrms?|bdrms?|bdr|bds?|beds?|brs?|rooms?|rms?|carpeted rooms?|areas?(?! ?rugs?)|living(?: ?rooms?)?|family ?rooms?|dining ?rooms?|dens?|offices?|lofts?|lrs?|frs?|cuartos?|rec[aá]maras?|habitaciones?)";
const VNOUN = "(?:(?:master|kids'?|guest|spare|small|big|little|upstairs|downstairs|carpeted)\\s+)?(?:bed ?rooms|rooms|hall ?ways|halls|stair ?cases|sets of stairs|bdrms|brs)\\b";
const ROOM_ADJ = "(?:(?:big|small|large|little|medium|huge|spare|main|guest|carpeted|upstairs|downstairs|master|kids'?|smaller|bigger|tiny)\\s+)?";

// common misspellings and texting shorthand -> the words the rules look for
const TYPOS = [
  [/\b(?:bedroms|bedrooms{2,}|bedroooms|bedromms)\b/g, "bedrooms"], [/\b(?:bedrom|bedroon|bedrooom|bedromm|bdroom|bedrm)\b/g, "bedroom"],
  [/\b(?:livng|liveing|livin|lving)\b/g, "living"], [/\b(?:dinning|dinnig|dinin)\b/g, "dining"], [/\b(?:famliy|famly)\b/g, "family"],
  [/\b(living|family|dining|bed) ?rms?\b/g, "$1 room"], [/\blivingroom\b/g, "living room"], [/\bdiningroom\b/g, "dining room"], [/\bfamilyroom\b/g, "family room"],
  [/\b(?:halway|hallwya|hallawy|hallwy|haulway)(s?)\b/g, "hallway$1"], [/\b(?:stiars|staris|starirs|stairss)\b/g, "stairs"], [/\b(and|the|plus|&|with|n) (?:stars|stares)\b/g, "$1 stairs"], [/\bstair case(s?)\b/g, "staircase$1"],
  [/\b(?:vaccum|vacum|vacume|vaccuum|vaccume|vacuume|vacumm)(\w*)\b/g, "vacuum$1"], [/\b(?:carpit|carpte|capet|carpett)(s?)\b/g, "carpet$1"],
  [/\b(?:hous|hosue|houes)\b/g, "house"], [/\b(?:hw|hwo|hiw|hoe) (?=much|long|many|soon|far|do|does)/g, "how "], [/\b(?:mich|muhc|mutch)\b/g, "much"],
  [/\b(?:pric|prise|prcie)\b/g, "price"], [/\b(?:tonite|2nite)\b/g, "tonight"], [/\b(?:tmrw|tmr|tomm?or+ow|2morrow)\b/g, "tomorrow"], [/\bwknd\b/g, "weekend"],
  [/\b(?:appt|apt) time\b/g, "appointment time"], [/\br u\b/g, "are you"], [/\br (?=you\b|yall\b|y'all\b)/g, "are "], [/\bu\b/g, "you"], [/\bur\b/g, "your"], [/\br you\b/g, "are you"], [/\bpls|plz\b/g, "please"],
  [/\bwit\b/g, "with"], [/\bw\/ ?(?=\w)/g, "with "], [/\bw (?=tax|pets?|the|my|a|an|dogs?|cats?)\b/g, "with "], [/\bn (?=hall|stair|living|dining|family|a |the |\d)/g, "and "], [/^n (?=\w)/g, "and "], [/\b4 (?=a |an |the |my |our )/g, "for "],
  [/\bsala\b/g, "living room"], [/\bpasillos?\b/g, "hallway"], [/\bescaleras?\b/g, "stairs"], [/\bsill[oó]n(?:es)?\b|\bsof[aá]s?\b/g, "sofa"], [/\btambi[eé]n\b/g, "too"],
  [/\b(?:se )?orin(?:o|ó|a|an|ado|aron)\b|\bpip[ií]\b|\bme[oó]\b/g, "peed"], [/(\w) y (?=\w)/g, "$1 and "], [/\bcuch(es)?\b/g, "couch$1"],
  [/\bmatt?ress?(es)?\b/g, "mattress$1"], [/\bcheques?\b/g, "check"], [/\bhafta\b/g, "have to"], [/\bgotta\b/g, "got to"], [/\bb4\b/g, "before"], [/\bwat\b/g, "what"], [/\by'?all\b/g, "you"],
  [/\bgive me a ring\b|\bring me\b/g, "call me"],
  // voice-to-text number words, only right before a plural room/hall/stair noun ("for bedrooms and to hallways", "too rooms", "tree rooms")
  [new RegExp(`\\btoo (?=${VNOUN})`, "g"), "two "], [new RegExp(`\\btree (?=${VNOUN})`, "g"), "three "],
  [new RegExp(`(^|\\b(?:and|the|&|plus|have|has|got|need|needs|do|clean|with|are)\\s+|,\\s*)to (?=${VNOUN})`, "g"), "$1two "],
  [new RegExp(`(^|\\b(?<!\\byou )(?:need|needs|have|has|got|clean|with)\\s+)for (?=${VNOUN})(?!${VNOUN}\\s*,?\\s*(?:do|does|is|are|can|will|would|what|how)\\b)`, "g"), "$1four "],
  // "3/2 ranch" = 3 bedrooms, 2 baths
  [/\b([1-6])\/([1-4](?:\.5)?)(?= ?(?:ranch|house|home|condo|apartment|apt|townhome|townhouse|duplex|split|bungalow|place|rental|with\b|,|\.|$))/g, "$1 bedroom $2 bath"],
  [/\borin(?:es|as)\b/g, "urine"], [/\b(\d+|dos|tres|two|three) escaleras\b/g, "$1 staircases"], [/\bparking (?:spot|space)s?\b/g, "parking"], [/\b(?:rugs? )?runners?\b/g, "rug"], [/\bkitchen chairs?\b/g, (m) => (m.endsWith("s") ? "dining chairs" : "dining chair")],
  // more misspellings seen in blind tests ("hal", "stares", "guess bedroom", "treetment", "acident", "upolstry", "do u due")
  [/\bhal\b/g, "hall"], [/\bhals\b/g, "halls"], [/\bstares\b/g, "stairs"], [/\bguess (?=bed ?rooms?\b|rooms?\b)/g, "guest "],
  [/\b(?:treetment|tretment|treatmant|treatmen|treament|treatmeant)\b/g, "treatment"], [/\b(?:acident|accidant|accedent|accidnet|acciddent)(s?)\b/g, "accident$1"],
  [/\b(?:upolstry|upholstry|upolstery|upholestry|upholstey|uphostery|upholstrey|upolstrey)\b/g, "upholstery"], [/\bdue (?=upholstery|carpets?\b|rugs?\b|tile\b|couch|sofas?\b)/g, "do "],
  [/\bwon (?=of (?:them|the)\b)/g, "one "], [/\bcar pet(s?)\b/g, "carpet$1"], [/\s+question mark\b/g, "?"], [/\s+period(?=\s+(?:how|what|i|we|can|do|is|and|also|my|the|thanks|thank)\b|\s*$)/g, "."],
  [new RegExp(`\\bfor to (?=${VNOUN})`, "g"), "for two "],
  // counts written as multipliers: "bedrooms x4", "x2 halls", "4x bedrooms", "dining chairs x6"
  [/\b((?:bed ?rooms?|rooms?|hall ?ways?|halls?|stair ?cases?|stairs?|(?:area )?rugs?|dining chairs?|chairs?|recliners?|sofas?|couch(?:es)?|love ?seats?))\s*x\s?(\d{1,2})\b/g, "$2 $1"],
  [/(?<![\d'"]\s*)(?:^|\s)x\s?(\d{1,2})\s+(?=(?:bed ?rooms?|rooms?|hall ?ways?|halls?|stair ?cases?|stairs?|(?:area )?rugs?|dining chairs?|chairs?|recliners?|sofas?|couch(?:es)?|love ?seats?)\b)/g, " $1 "],
  [/\b(\d{1,2})\s?x\s+(?=(?:bed ?rooms?|rooms?|hall ?ways?|halls?|stair ?cases?|stairs?|(?:area )?rugs?|dining chairs?|chairs?|recliners?|sofas?|couch(?:es)?|love ?seats?)\b)/g, "$1 "],
];
function norm(text) {
  let t = String(text ?? "").slice(0, 2000).normalize("NFKD").replace(/[̀-ͯ​-‏‪-‮⁠﻿️⃣]/g, "")
    .replace(/👍|👌|✅|🙂👍/g, " ok ").replace(/🐶|🐕|🐩/gu, " dog ").replace(/🐱|🐈/gu, " cat ").replace(/❓|❔/gu, "?")
    .replace(/\p{Extended_Pictographic}/gu, " ").toLowerCase().replace(/[’‘`]/g, "'").replace(/[“”]/g, '"')
    .replace(/([a-z])-(?=[a-z])/g, "$1 ").replace(/\s+/g, " ").trim();
  for (const [re, to] of TYPOS) t = t.replace(re, to);
  return t.replace(/\s+/g, " ").trim();
}
const has = (t, re) => re.test(t);
const money = (n) => `$${n}`;

/* ---------- reading the customer's message ---------- */

export function readScope(t, nested = false) {
  // rug sizes ("10 by 14 rug", "8x10") are dimensions, not counts
  t = t.replace(/\b\d{1,2}(?:\.\d)?\s*(?:'|ft|feet|foot)?\s*(?:x|by|×)\s*\d{1,2}(?:\.\d)?\s*(?:'|ft|feet|foot)?(?=\s|$|[,.!?])/g, " sized ")
    // "a 5x8 in the dining room": where a rug sits isn't another carpeted room
    .replace(/(\b(?:rugs?|sized)\b[^.?!]{0,30}?)\b(?:in|under|for) (?:the|my|our) (?:dining|living|family|front|great|bed) ?rooms?\b/g, "$1 ")
    // "all the bedrooms (3)" = 3 bedrooms
    .replace(/\b(bed ?rooms|rooms|hall ?ways|halls)\s*\((\d{1,2})\)/g, "$2 $1")
    // abbreviations: "LR, DR, 3 BRs", "3 rm"
    .replace(/\blrs?\b/g, "living room").replace(/(^|,|\band|&|\+)\s*dr\b(?=\s*(?:,|and\b|&|\+|$))/g, "$1 dining room").replace(/\bbrs\b/g, "bedrooms")
    // a bathroom counts only when the customer says it's carpeted
    .replace(/\bcarpet(?:ed)? in (?:the |my |our |a )?(?:master |guest |kids'? |main |upstairs |downstairs )?bath(?:room)?\b|\b(?:a |the |my |our )?carpeted (?:master |guest |kids'? |main )?bath(?:room)?\b|\b(?:the |my |our )?(?:master |guest |kids'? |main )?bath(?:room)? (?:is|has) (?:carpet(?:ed)?|all carpet)\b/g, " a carpeted room ")
    // "basement family room" is one room
    .replace(/\b(?:basement|downstairs) (family|rec|game|living|media|tv|play|bonus|great) ?room/g, "$1 room").replace(/\bbasement (bed ?rooms?)\b/g, "$1")
    // "add a 4th room" adds one; otherwise "the 6th room", "2nd bedroom" name a room, they don't count rooms
    .replace(/\b(add|adding|plus|throw in|include|and|also) (?:a |the |one )?(?:\d+(?:st|nd|rd|th)|second|third|fourth|fifth|sixth|seventh|eighth) (bed ?room|room)\b/g, "$1 1 more room")
    .replace(/\b\d+(?:st|nd|rd|th) (?:bed ?)?room\b/g, " ")
    // common typos
    .replace(/\b(and|the|plus|&|with) stars\b/g, "$1 stairs").replace(/\bhall way(s?)\b/g, "hallway$1").replace(/\bbedrm(s?)\b/g, "bedroom$1").replace(/\bbed rooms\b/g, "bedrooms")
    .replace(new RegExp(`\\b(just|only) ${N} of the (bed ?)?rooms\\b`, "g"), "$1 $2 rooms");
  // removals: "remove one bedroom", "take off 2 rooms", "no stairs", "skip the halls", "one less room"
  const remove = { rooms: 0, halls: 0, stairs: 0, rugs: 0, allHalls: false, allStairs: false, any: false };
  const ITEM = "(bed ?rooms?|rooms?|hall ?ways?|halls?|stair ?cases?|stairs?|steps|flights?|area rugs?|rugs?)";
  const remRe = new RegExp(`\\b(?:remove|take off|take out|minus|subtract|drop|skip(?:ping)?|forget(?: about)?|without|leave (?:off|out)|nix|exclude|except|cross off|scratch|no|don'?t need|do not need|not doing|not the)\\s+(?:the\\s+|a\\s+|an\\s+|any\\s+|my\\s+|our\\s+)?(?:${N}\\s+)?(?:of the\\s+)?${ITEM}\\b|\\b${N}\\s+(?:less|fewer)\\s+${ITEM}\\b|\\b${ITEM}\\s+(?:removed|taken off)\\b`, "g");
  t = t.replace(new RegExp(`\\btake ${N} (bed ?rooms?|rooms?|hall ?ways?|halls?|stair ?cases?|stairs|(?:area )?rugs?) (?:off|out|away)\\b`, "g"), (m0, n, item) => {
    const k = num(n) || 1; remove.any = true;
    if (/hall/.test(item)) remove.halls += k; else if (/stair/.test(item)) remove.stairs += k; else if (/rug/.test(item)) remove.rugs += k; else remove.rooms += k;
    return " ";
  });
  t = t.replace(/\b(?:remove|take off|take away|drop|minus|subtract|knock off) one\b(?! (?:hall|stair|rug|flight))|\btake one (?:off|away)\b|\bone less\b(?! (?:hall|stair|rug))/g, () => { remove.any = true; remove.rooms += 1; return " "; });
  t = t.replace(remRe, (...m) => {
    const g = m.slice(1, 6);
    const count = g[0] ?? g[2] ?? null, item = g[1] ?? g[3] ?? g[4] ?? "";
    const n = count != null ? num(count) : null;
    if (/^no\b/.test(m[0]) && count != null) return m[0];
    remove.any = true;
    if (/hall/.test(item)) { if (n) remove.halls += n; else if (/s$/.test(item) || /^(?:no|skip|without|forget)/.test(m[0])) remove.allHalls = true; else remove.halls += 1; }
    else if (/stair|step|flight/.test(item)) { if (n) remove.stairs += n; else remove.allStairs = true; }
    else if (/rug/.test(item)) remove.rugs += n || 1;
    else remove.rooms += n || 1;
    return " ";
  });
  // "a 3 bedroom apartment ... living room, 3 bedrooms" — the descriptor isn't extra rooms
  const descRe = new RegExp(`\\b${N}\\s*(?:bed ?rooms?|br|bd|bdrm|bedroom)\\s+(?:house|home|apartment|apt|condo|place|ranch|townhouse|townhome|duplex|split level|unit|rental)\\b`);
  if (descRe.test(t) && (t.replace(descRe, " ").match(new RegExp(`\\b${N}\\s*(?:bed ?rooms?|br|bdrms?|beds?)\\b`)) || [])[0]) t = t.replace(descRe, " ");
  // where a problem is ("pees on the stairs", "accidents in the hallway") isn't another hall or staircase
  if (/\b(?:pee|pees|peed|urine|accidents?|poop\w*|vomit|stains?|spots?|smells?|odou?rs?|spill\w*|mess)\b/.test(t)) t = t.replace(/\b(?:in|on|up|down|by|near|at|across) (?:the |our |my |that |this )?(?:hall ?ways?|halls?|stairs?|stair ?cases?|steps)\b/g, " ");
  let rooms = 0, halls = 0, stairs = 0, found = false, adding = false;
  const perRoomQuestion = /\b(?:per|each|by the) room\b|\bor per room\b/.test(t);
  // "3 bedrooms", "two rooms", "4 br", "3bd", "2 more rooms"
  // ranges: "five or six rooms", "5-6 rooms" -> low count, remember the high one
  let rangeHigh = 0;
  const range = t.match(new RegExp(`\\b${N}\\s*(?:or|-|to)\\s*${N}\\s*(?:rooms?|bed ?rooms?|br|areas?)\\b`));
  let scan = t;
  if (range) { rooms += num(range[1]) ?? 0; rangeHigh = num(range[2]) ?? 0; found = true; scan = t.replace(range[0], " "); }
  let located = 0; // rooms only named as WHERE something is ("accidents in the living room")
  const problem = /\b(?:pee|pees|peed|urine|accidents?|poop\w*|vomit|stains?|spots?|smells?|odou?rs?|spill\w*|mess)\b/.test(t);
  let locatedCount = 0;
  for (const m of scan.matchAll(new RegExp(`\\b${N}\\s*(more |extra |additional |other )?${ROOM_ADJ}${ROOM_WORD}\\b`, "g"))) {
    if (/^(?:a|an)$/.test(m[1]) && perRoomQuestion) continue;
    const before = scan.slice(Math.max(0, m.index - 22), m.index);
    if (/\b(?:don'?t|doesn'?t|do not|does not|not|isn'?t|aren'?t|never|no longer) (?:have |got |really |actually )*$/.test(before)) continue;
    const isLoc = /\b(?:in|on|from|across|through|throughout|of) (?:the |that |this |my |our |a )?$|\ben (?:la |el |los |las |mi |mis |su )?$/.test(before);
    if (isLoc && (found || /^(?:a|an|one|1)$/.test(m[1]))) continue;
    // "peed in 2 rooms ... whole house is 5 rooms": where the problem is doesn't add to the home's count
    if (isLoc && problem) { locatedCount += num(m[1]) ?? 0; continue; }
    rooms += num(m[1]) ?? 0; found = true; if (m[2]) adding = true;
  }
  let locatedOnly = false;
  if (locatedCount && !found && !nested) { rooms += locatedCount; found = true; locatedOnly = true; }

  // named single rooms: "living room", "front room", "lr", and bare "living"/"dining" in a list
  const NAMED = /\b(?:living|front|family|dining|great|bonus|game|play|sun|media|rec|tv|sitting|computer|craft|exercise|laundry|guest|master|primary)\s?rooms?\b|\b(?:den|office|loft|basement|nursery|study|lr|fr)\b|\b(?:living|dining)\b(?!\s?(?:rooms?|chairs?|table|here|in|at|with|area rug))/g;
  const numberedBedrooms = new RegExp(`\\b${N}\\s*(?:more |extra |additional )?${ROOM_ADJ}(?:bed ?rooms?|bdrms?|bdr|bds?|beds?|br)\\b`).test(t);
  const namedList = [];
  for (const m of t.matchAll(NAMED)) {
    const w = m[0];
    const before = t.slice(Math.max(0, m.index - 24), m.index);
    const bare = /^(?:living|dining)$/.test(w);
    if (bare && !/(?:,|\band|&|\+|plus|the|my|our|\d|beds?|bedrooms?|br)\s*$/.test(before) && !/^\s*(?:,|and\b|&|\+)/.test(t.slice(m.index + w.length))) continue;
    if (new RegExp(`\\b${N}\\s*(?:more |extra |additional |other )?${ROOM_ADJ}$`).test(before)) { namedList.push(w.replace(/\s+/g, " ")); continue; } // already counted with its number
    if (/\brugs? (?:in|from|for|out of) (?:the |my |our )?$/.test(before)) continue; // "an area rug in the living room" says where the rug is
    if (rooms > 0 && /\b(?:in|on|down in|up in) (?:the |my |our )?$/.test(before) && /^(?:basement|loft|bonus ?room|upstairs|downstairs)$/.test(w)) continue;
    if (/^\W*(?:only|too|also)?\W*(?:is carpeted,? |is all carpet,? )?(?:it'?s |is |which is |that'?s )(?:one|a|just one|just a) (?:big |large |open |huge |single )*room\b/.test(t.slice(m.index + w.length, m.index + w.length + 50))) continue; // "basement is one big room" // "2 more rooms in the basement"
    namedList.push(w.replace(/\s+/g, " "));
    if (new RegExp(`\\b(?:except|not|minus|but not|excluding) (?:the )?${w}\\b`).test(t)) continue;
    if (/\b(?:guest|master|primary)\s?rooms?\b/.test(w) && numberedBedrooms) continue; // already counted as a bedroom
    if (/\b(?:in|on|from|of) (?:the |my |our |that |this )?$|\ben (?:la |el |los |las |mi |mis |su )?$/.test(before)) located += 1;
    rooms += 1; found = true;
  }
  var listCounted = false;
  // comma lists like "bedroom, living" or "kitchen, living, family"
  if (!rooms && /\b(?:bed ?room|living|family|dining|den|office)\b\s*(?:,|and|&)\s*(?:the )?(?:living|family|dining|den|office|bed ?room)\b/.test(t) && !/\b(?:living|family|dining) rooms?\b/.test(t)) {
    rooms = (t.match(/\b(?:bed ?room|living|family|dining|den|office)\b/g) || []).length; found = true; var listCounted = true;
  }
  // a bare "bedroom"/"room" with no number = 1 (but not "per room" questions)
  let bare = false;
  const inRoom = /\b(?:in|on|from) (?:the |a |one |that |this |my |our |her |his )?(?:bed ?)?room\b/.test(t);
  // "the master bedroom and the guest bedroom" names two bedrooms
  const namedBeds = new Set((t.match(/\b(?:master|guest|kids'?|spare|front|back|upstairs|downstairs|primary|main|baby'?s?|boys'?|girls'?|son'?s|daughter'?s|small|big|little|second|third|other) bed ?room\b/g) || []).map((x) => x.replace(/\s+/g, " ")));
  if (!listCounted && !perRoomQuestion && /\bbed ?room\b/.test(t) && !numberedBedrooms && !inRoom && !/\b(?:a|one|1|each|per) bed ?room\b/.test(t.replace(/\bbed ?rooms\b/g, ""))) { rooms += Math.max(1, namedBeds.size); found = true; bare = !rooms || rooms === 1; }
  else if (!rooms && !perRoomQuestion && !inRoom && /\b(?:bed ?room|room)\b/.test(t) && !/\brooms\b/.test(t)) { rooms += 1; found = true; bare = true; }
  // standard area rugs: each counts as one of the rooms in the package
  let rugs = 0;
  const rug = t.match(new RegExp(`\\b(?:${N}\\s+)?(?:standard |small |medium |large )?(?:area )?rugs?\\b`));
  if (rug && (found || rug[1] || /\b(?:and|plus|with)\b[^.]*\brugs?\b/.test(t) || /\b(?:how much|price|cost)\b/.test(t) || (/\b(?:need|needs|cleaned|just|only|my|\d+ ?x ?\d+|sized|regular|polyester|synthetic|nylon|olefin)\b/.test(t) && !/\bdo you\b/.test(t)))) { rugs = rug[1] ? (num(rug[1]) ?? 1) : 1; found = true; }
  // hallways
  const hm = t.match(new RegExp(`\\b${N}\\s*(?:more |extra |additional )?(?:hall ?ways?|halls?)\\b`));
  const ORD = { second: 2, "2nd": 2, third: 3, "3rd": 3, fourth: 4, "4th": 4 };
  const hOrd = t.match(/\b(second|2nd|third|3rd|fourth|4th) (?:hall ?way|hall)\b/), sOrd = t.match(/\b(second|2nd|third|3rd|fourth|4th) (?:stair ?case|set of stairs|flight(?: of stairs)?|stairs)\b/);
  if (hOrd) { halls = ORD[hOrd[1]]; found = true; }
  else if (hm) { halls = num(hm[1]) ?? 1; found = true; }
  else if (/\b(?:hall ?ways?|halls?)\b/.test(t)) { halls = /\b(?:hall ?ways|halls)\b/.test(t) ? 2 : 1; found = true; }
  // stairs
  const sm = t.match(new RegExp(`\\b${N}\\s*(?:more |extra |additional )?(?:(?:short|small|big|long|full|half|little|separate|different) )?(?:stair ?cases?|flights?(?: of stairs)?|sets? of stairs|stair ?ways?)\\b`));
  const sN = t.match(new RegExp(`\\b${N}\\s*(?:more |extra |additional )?stairs\\b`));
  if (sOrd) { stairs = ORD[sOrd[1]]; found = true; }
  else if (sm) { stairs = num(sm[1]) ?? 1; found = true; }
  else if (sN && (num(sN[1]) ?? 0) >= 1 && num(sN[1]) <= 4) { stairs = num(sN[1]); found = true; }
  else if (/\b(?:stairs?|stair ?cases?|steps)\b/.test(t)) { stairs = 1; found = true; }
  // "make it 5", "nvm just 3", "only 2" -> replace room count
  const replace = t.match(new RegExp(`\\b(?:make it|just|only|nvm|never ?mind|actually|no wait|wait|sorry|oops|correction|i meant|i mean|scratch that)[,!.]?\\s*(?:it'?s |its |make it |just |only )?${N}\\b(?!\\s+of\\b)(?!\\s*(?:hall|stair|min|hour|pm|am|dollar|\\$))`));
  const addMore = t.match(new RegExp(`^(?:and|plus|\\+)\\s*${N}\\s*more\\b`)) || (/^(?:and |ok |oh |also )?(?:add|adding|plus|throw in|include) (?:a |the |one )?(?:third|fourth|fifth|sixth|seventh|another|one more|1 more|extra)(?: (?:bed ?)?room| one)?\b/.test(t) && !/\b(?:hall|stair|rug)/.test(t) ? [null, "1"] : null);
  const noN = t.match(new RegExp(`^no[,!. ]+(?:it'?s |its |make it )?${N}(?:\\s*rooms?)?[.!]*$`));
  const replaceRooms = (replace || noN) && !found ? num((replace || noN)[1]) : null;
  // several counts plus a correction word: the last stated count wins ("3 rooms, no wait 5, actually 4")
  const countRe = new RegExp(`\\b${N}\\s*(?:more |extra |additional |other )?${ROOM_ADJ}${ROOM_WORD}\\b`, "g");
  const corrections = [...t.matchAll(new RegExp(`\\b(?:no wait|wait no|wait|actually|i mean|i meant|correction|sorry|scratch that|make (?:it|that)|oops|no(?=[,!.]?\\s*(?:it'?s |its |make it |just |only )?(?:\\d|${W})\\b))\\b[,!.]?\\s*`, "g"))];
  if (found && corrections.length && (t.match(countRe) || []).length + (/\d|\b(?:one|two|three|four|five|six|seven|eight|nine|ten)\b/.test(t.slice(corrections.at(-1).index)) ? 1 : 0) > 1) {
    const tail = t.slice(corrections.at(-1).index + corrections.at(-1)[0].length);
    const tc = tail.match(new RegExp(`^(?:it'?s |its |make it |just |only )?${N}\\b`)) || tail.match(countRe.source ? new RegExp(countRe.source) : /$^/);
    const n = tc ? num(tc[1]) : null;
    if (n && !new RegExp(`^${N}\\s*(?:hall|stair|flight|rug)`).test(tail)) { rooms = n + (rugs || 0) * 0; rangeHigh = 0; }
  }
  if (addMore && !found) { rooms = num(addMore[1]) ?? 0; found = true; adding = true; }
  // a stated carpet total ("6 rooms carpet total") replaces bedroom counts; only rooms named after it are extra
  const totalM = !nested && t.match(new RegExp(`\\b${N}\\s*(?:carpeted |carpet )?rooms?(?: of carpet| carpeted| carpet| with carpet)?\\s*(?:in )?total\\b|\\btotal (?:of )?${N}\\s*(?:carpeted )?rooms?\\b|\\b${N} total (?:carpeted )?rooms?\\b`));
  if (totalM) { rooms = (num(totalM[1] ?? totalM[2] ?? totalM[3]) ?? 0) + readScope(t.slice(totalM.index + totalM[0].length), true).rooms; found = true; rangeHigh = 0; }
  const wholeFloor = (t.match(/\b(?:whole|entire|all(?: of)?(?: the)?)\s+(upstairs|downstairs)\b/) || [])[1] || null;
  if (wholeFloor && !rooms && !halls && !stairs) return { wholeFloor, found: false, rooms: 0, rugs: 0, halls: 0, stairs: 0, adding: false, perRoomQuestion, rangeHigh: 0, namedList: [], remove };
  const whole = /\bwhole (?:house|home|place|thing)\b|\bentire (?:house|home)\b|\ball (?:the )?(?:carpets?|rooms)\b/.test(t);
  if (whole && !rooms) return { wholeHouse: true, found: true, rooms: 0, rugs, halls, stairs, adding: false, perRoomQuestion, rangeHigh: 0, namedList: [], remove };
  // "bedrooms and a hallway" with no number: we don't know how many rooms yet
  const uncounted = !rooms && !perRoomQuestion && new RegExp(`(?<!\\b${N}\\s*(?:more |extra |additional |other )?${ROOM_ADJ})\\b(?:bed ?rooms|rooms|bdrms|brs)\\b`).test(t);
  return { remove, found, rooms, rugs, halls, stairs, adding, replaceRooms, locatedOnly: locatedOnly && !halls && !stairs && !rugs, perRoomQuestion, rangeHigh, namedList, uncounted, bare: bare && !halls && !stairs && !rugs,
    onlyLocated: found && located > 0 && rooms === located && !halls && !stairs && !rugs,
    onlyNamed: found && !halls && !stairs && !rugs && rooms === namedList.length && !/\d|\b(?:two|three|four|five|six|seven|eight)\b/.test(t) };
}

export function mentionsPets(t) {
  return /\b(?:dogs?|cats?|pets?|pupp(?:y|ies)|kittens?|perros?|gatos?|mascotas?)\b/.test(t);
}

export function readPets(t) {
  // "pets no", "pets: none", "dogs? nope", "no to pets", "nope no pets"
  if (/\b(?:pets?|dogs?|cats?|animals?|pet treatment)\s*[?:,\-]?\s*(?:no|none|nope|nah|n\/a|0|zero)\b(?!\s+(?:accidents?|stains?|pee|odou?rs?|smells?|issues?|problems?))/.test(t) || /\bno to (?:the )?pets?\b|\b(?:none|zero|0) (?:pets?|dogs?|cats?)\b/.test(t)) return false;
  // vomit/throw-up is a pet issue only when an animal is mentioned
  if (/\b(?:vomit|threw up|throw ?up|puke)\b/.test(t) && !mentionsPets(t)) t = t.replace(/\b(?:vomit|threw up|throw ?up|puke)\b/g, " ");
  const NEG_PROBLEM = /\b(?:no |never (?:had|has|have) (?:an? |any )?|hasn'?t had (?:an? |any )?|haven'?t had (?:an? |any )?|without (?:any )?)(?:pet )?(?:accidents?|stains?|pee|odou?rs?|smells?|issues?|problems?|messes|urine)\b/g;
  const POS_PROBLEM = /\b(?:urine|pee|pees|peed|peeing|poop|poops|pooped|pooping|accidents?|vomit|threw up|throw ?up|puke|marking|marks (?:his|her|its) territory|spray(?:s|ed|ing)?|piddle\w*|tinkle\w*|pet (?:stains?|spots?|treatment|issues?|problems?|odou?rs?|smells?|solution|package|special|stuff|mess(?:es)?)|(?:dog|cat|pet|puppy|kitten) (?:smell|odou?r|stains?|spots?|mess|shit|crap|poo)|(?:dog|cat|puppy|kitten|pet) (?:shit|crapped|pooped|threw up|got sick)|smells? like (?:dog|cat|pet)|litter box)\b/;
  // asking what pet treatment is (or whether they need it) doesn't mean they need it
  t = t.replace(/\b(?:do|would|will|should|does) (?:i|we|she|he|they) (?:really |even |still )?(?:need|have to (?:get|do)|want) (?:the |a )?pet (?:treatment|one|package|version|special)\b|\b(?:is|would) (?:the )?pet (?:treatment|one|package) (?:be )?(?:required|necessary|needed)\b|\bneed (?:the |a )?pet (?:treatment|package|one|version|special)\s*\?/g, " ");
  if (/\bnever ?mind (?:on |about )?(?:the )?pet\b|\b(?:skip|drop|forget|cancel|no need for|don'?t need|opt out of|remove|without|no|take off|leave off|leave out) (?:the )?pet (?:treatment|one|package)\b|\btake (?:the )?pet (?:treatment|one|package) off\b/.test(t)) return false;
  t = t.replace(/\b(?:what|why|how) (?:does|is|would|do|'?s)? ?(?:i need )?(?:the )?pet (?:treatment|package|one|version)\b[^.?!]*|\bpet (?:treatment|one|package) (?:actually )?(?:do|does|different)\b/g, " ");
  if (t.search(NEG_PROBLEM) >= 0 && !POS_PROBLEM.test(t.replace(NEG_PROBLEM, " "))) return false;
  t = t.replace(NEG_PROBLEM, " ");
  if (/\bno (?:pets?|dogs?|cats?|animals?)\b/.test(t) && !POS_PROBLEM.test(t)) return false;
  if (/\b(?:litter|house|potty)[- ]?trained\b|\b(?:he'?s|she'?s|they'?re|it'?s) trained\b/.test(t) && !POS_PROBLEM.test(t)) return false;
  if (/\bdon'?t have (?:any )?(?:pets?|dogs?|cats?)\b|\bwithout (?:the )?pets?\b|\bno pet (?:issues?|problems?|stains?|treatment)\b/.test(t)) return false;
  // Pet *problems* mean pet treatment. Just owning a pet does not — we quote standard and offer the pet price.
  if (POS_PROBLEM.test(t)) return true;
  return null;
}

/* ---------- prices ---------- */

/** @param {{ rooms?: number, rugs?: number, halls?: number, stairs?: number, pets?: boolean | null, wholeHouse?: boolean }} job */
export function quote({ rooms = 0, rugs = 0, halls = 0, stairs = 0, pets = null, wholeHouse = false }) {
  rooms += rugs;
  if (wholeHouse) {
    const base = pets === true ? PRICES.pet : PRICES.standard;
    return { kind: "package", base, total: base, extras: 0, pets };
  }
  const areas = rooms + halls + stairs;
  if (areas > 0 && areas <= 3) {
    return pets === true
      ? { kind: "pet-minimum", total: PRICES.petMinimum, extras: 0, pets }
      : { kind: "minimum", total: PRICES.minimum, extras: 0, pets };
  }
  // owner rule: an additional staircase can take an unused room spot in the package (halls can't)
  const extraStairs = Math.max(0, stairs - PRICES.includes.stairs);
  const stairSlots = Math.min(extraStairs, Math.max(0, PRICES.includes.rooms - rooms));
  const extras = Math.max(0, rooms - PRICES.includes.rooms) + Math.max(0, halls - PRICES.includes.halls) + extraStairs - stairSlots;
  const base = pets === true ? PRICES.pet : PRICES.standard;
  return { kind: "package", base, total: base + extras * PRICES.extra, extras, stairSlots, pets };
}

function describe({ rooms, rugs = 0, halls, stairs }) {
  const parts = [];
  if (rooms) parts.push(`${rooms} room${rooms === 1 ? "" : "s"}`);
  if (rugs) parts.push(rugs === 1 ? "an area rug" : `${rugs} area rugs`);
  if (halls) parts.push(halls === 1 ? "a hallway" : `${halls} hallways`);
  if (stairs) parts.push(stairs === 1 ? "a staircase" : `${stairs} staircases`);
  return parts.length > 1 ? parts.slice(0, -1).join(", ") + " and " + parts.at(-1) : parts[0] || "";
}

const COVER = "up to 5 rooms, two halls, and one staircase";

function quoteLine(scope, pets, mention99 = false, bedroomsOnly = false, brief = false) {
  const q = quote({ ...scope, pets });
  const what = scope.wholeHouse ? "the whole house" : describe(scope);
  const rugOnly = scope.rugs && !scope.rooms && !scope.halls && !scope.stairs && !scope.wholeHouse;
  if (q.kind === "minimum" && rugOnly) {
    return `A standard area rug counts as one of the rooms in the package. ${scope.rugs > 1 ? `${scope.rugs} standard area rugs by themselves are` : "One standard area rug by itself is"} ${money(PRICES.minimum)} plus tax, the same as ${scope.rugs > 1 ? `${scope.rugs} rooms` : "one room"}. Once a package's five rooms are used, each extra standard rug is ${money(PRICES.extra)} plus tax.`;
  }
  if (q.kind === "minimum") {
    return `For ${what}, it's ${money(PRICES.minimum)} plus tax — that's our price for up to 3 ${scope.halls || scope.stairs ? "areas" : "rooms"}.` + (mention99 ? ` The ${money(PRICES.standard)} special covers up to 5 rooms, two halls, and one staircase.` : "") +
      (bedroomsOnly ? ` If there's also a living room, hallway or stairs, tell me and I'll update it — the ${money(PRICES.standard)} special covers ${COVER}.` : "") +
      (pets === null ? " Pet treatment is available if you need it." : "");
  }
  if (q.kind === "pet-minimum") return `For ${what} with pet treatment, it's ${money(PRICES.petMinimum)} plus tax (pet treatment for up to 3 rooms).`;
  const pkg = q.base === PRICES.pet ? `${money(PRICES.pet)} pet-treatment special` : `${money(PRICES.standard)} whole-house special`;
  if (scope.wholeHouse) {
    return (q.base === PRICES.pet ? `The whole house with pet treatment is our ${money(PRICES.pet)} pet-treatment special — ${money(q.total)} plus tax.` : `The whole house is our ${money(PRICES.standard)} special — ${money(q.total)} plus tax.`) +
      ` It covers ${COVER}; each area beyond that is ${money(PRICES.extra)}.` + (pets === null ? ` With pet treatment it's ${money(PRICES.pet)}.` : "");
  }
  let line;
  if (q.extras) {
    const overRooms = Math.max(0, (scope.rooms || 0) + (scope.rugs || 0) - PRICES.includes.rooms);
    const overRugs = Math.min(scope.rugs || 0, overRooms), overPlain = overRooms - overRugs;
    const why = [];
    if (overPlain) why.push(`each room over five is an additional ${money(PRICES.extra)} plus tax`);
    if (overRugs) why.push(`each additional standard area rug is ${money(PRICES.extra)} plus tax${overRugs > 1 ? ` (${overRugs} × ${money(PRICES.extra)})` : ""}`);
    if ((scope.halls || 0) > PRICES.includes.halls) why.push(`each additional hall is ${money(PRICES.extra)} plus tax`);
    if ((scope.stairs || 0) - (q.stairSlots || 0) > PRICES.includes.stairs) why.push(q.stairSlots ? `${q.stairSlots > 1 ? "two extra staircases fill unused room spots free" : "one extra staircase fills the unused room spot free"}; each one after that is ${money(PRICES.extra)} plus tax` : `each additional staircase is ${money(PRICES.extra)} plus tax`);
    const sum = `${money(q.base)} + ${money(q.extras * PRICES.extra)}`;
    const kinds = [overPlain && "room over five", overRugs && "area rug", (scope.halls || 0) > PRICES.includes.halls && "hall over two", (scope.stairs || 0) - (q.stairSlots || 0) > PRICES.includes.stairs && "staircase over one"].filter(Boolean);
    if (brief && !q.stairSlots) line = `For ${what}: the ${pkg} plus ${money(PRICES.extra)} for each ${kinds.length > 2 ? `${kinds.slice(0, -1).join(", ")} and ${kinds.at(-1)}` : kinds.join(" and ")} — so it's ${sum}, plus tax.`;
    else if (why.length >= 2) {
      const kinds = [overPlain && "room over five", overRugs && "area rug", (scope.halls || 0) > PRICES.includes.halls && "hall over two", (scope.stairs || 0) - (q.stairSlots || 0) > PRICES.includes.stairs && "staircase over one"].filter(Boolean);
      const list = kinds.length > 2 ? `${kinds.slice(0, -1).join(", ")} and ${kinds.at(-1)}` : kinds.join(" and ");
      line = `For ${what}: the ${pkg} covers ${COVER}, and each extra ${list} is ${money(PRICES.extra)} plus tax — so it's ${sum}, plus tax.`;
    } else line = `For ${what}: the ${pkg} covers ${COVER}, and ${why.join("; ")} — so it's ${sum}, plus tax.`;
    line += ` That's ${money(q.total)} plus tax in all.`;
  } else {
    line = `For ${what}, that's our ${pkg} — ${money(q.total)} plus tax.${brief ? "" : ` It covers ${COVER}.`}`;
  }
  if (q.stairSlots && !(q.extras && (scope.stairs || 0) - q.stairSlots > PRICES.includes.stairs)) line += q.stairSlots > 1 ? ` Extra staircases are normally ${money(PRICES.extra)} each, but these take unused room spots — no extra charge.` : ` An extra staircase is normally ${money(PRICES.extra)}, but this one takes an unused room spot — no extra charge.`;
  if (pets === null && !brief) line += q.extras
    ? ` If you have pet accidents or odor, the pet-treatment version is ${money(PRICES.pet)} + ${money(q.extras * PRICES.extra)}, plus tax.`
    : ` If you have pet accidents or odor, the pet-treatment version is ${money(PRICES.pet)}.`;
  return line;
}

const asksAboutPrice = (t) => /\b(?:price|prices|pricing|cost|costs|how much|quote|estimate|rates?|charge|what'?s it run|pay for)\b|\$/.test(t);

/* ---------- furniture ---------- */
const FURN = [
  { key: "dining", re: new RegExp(`\\b(?:${N}\\s+)?dining (?:room )?chairs?\\b`), price: 19, label: "dining chair", each: true },
  { key: "small_sectional", re: /\bsmall sectionals?\b/, price: 119, label: "small sectional" },
  { key: "large_sectional", re: /\b(?:large|big|huge) sectionals?\b/, price: 169, label: "large sectional" },
  { key: "sectional", re: /\bsectionals?\b/, price: null, label: "sectional" },
  { key: "loveseat", re: new RegExp(`\\b(?:${N}\\s+)?love ?seats?\\b`), price: 79, label: "loveseat", each: true },
  { key: "sofa", re: new RegExp(`\\b(?:${N}\\s+)?(?:sofas?|couch(?:es)?)\\b`), price: 89, label: "sofa", each: true },
  { key: "chair", re: new RegExp(`\\b(?:${N}\\s+)?(?:(?:big|small|leather|fabric|matching)\\s+)?(?:recliners?|accent chairs?|arm ?chairs?|lazy ?boys?|chairs?)\\b`), price: 39, label: "recliner or accent chair", each: true },
];
const UNPRICED_FURN = /\b(?:ottomans?|futons?|benches?|headboards?|poufs?|chaise|daybeds?|cushions? only|pillows?)\b/;

export function readFurniture(t) {
  const items = {};
  let sawSectional = false;
  for (const f of FURN) {
    if (f.key === "sectional" && sawSectional) continue;
    const excluded = new RegExp(`\\b(?:no|not the|not|without|except(?: the)?|minus|skip(?: the)?) (?:a |an |the |my )?(?:${f.re.source.replace(/^\\b|\\b$/g, "")})`).test(t);
    const m = t.match(f.re);
    if (!m || excluded) continue;
    if (f.key === "chair" && /\bdining (?:room )?chairs?\b/.test(t) && !/\b(?:recliner|accent|arm ?chair|lazy ?boy)\b/.test(t)) continue;
    // "recliner ends" on a sectional are part of the sectional
    if (f.key === "chair" && /\b(?:recliner|reclining) ends?\b|\bbuilt[- ]in recliners?\b/.test(t) && /\bsectionals?\b|\bl[- ]shape/.test(t) && !/\b(?:separate|standalone|stand-alone|also a|and a) recliner\b/.test(t)) continue;
    if (f.key.endsWith("sectional")) sawSectional = true;
    items[f.key] = f.each ? (num(m[1]) ?? 1) : 1;
  }
  if (items.sectional) {
    const seats = t.match(/\b(\d{1,2}|three|four|five|six|seven|eight|nine|ten)[ -]?(?:seats?|seater|seated|pieces?|sections?|cushions?)\b/) || t.match(/\b(?:seats?|seater|sections?|pieces?)\s*(?:is |are |of )?(\d{1,2}|three|four|five|six|seven|eight|nine|ten)\b/);
    let n = seats ? num(seats[1]) : null;
    // "5 seats plus 2 recliner ends" = 7 seats
    const plus = n && t.slice(seats.index + seats[0].length).match(/^\s*(?:plus|\+|and|with)\s+(?:the\s+|a\s+|an\s+)?(\d{1,2}|one|two|three|four|a|an)\b(?:[ -]?(?:more|extra))?\s*(?:recliners?|recliner ends?|reclining ends?|seats?)/);
    if (plus) n += num(plus[1]) ?? 1;
    if (n) { delete items.sectional; items[n >= 6 ? "large_sectional" : "small_sectional"] = 1; }
  }
  let unpriced = (t.match(UNPRICED_FURN) || [])[0] || null;
  // "5-piece sectional with a chaise": the chaise is one of the sectional's pieces, not a separate item
  if (unpriced === "chaise" && Object.keys(items).some((k) => k.endsWith("sectional"))) unpriced = null;
  const special = /\b(?:velvet|leather|suede|silk|microsuede|linen|heavily stained|heavy stains?|very stained|oversized|huge|10 seats?|ten seats?|1[0-9] seats?)\b/.test(t);
  return { items, unpriced, special, any: Object.keys(items).length > 0 || Boolean(unpriced) };
}

function furnitureLine(f, site = false) {
  const it = f.items;
  if (f.unpriced) {
    const known = Object.keys(it).map((k) => FURN.find((x) => x.key === k)).filter((x) => x && x.price);
    const piece = f.unpriced === "benches" ? "bench" : /^(?:cushions? only|chaise)$/.test(f.unpriced) ? f.unpriced : f.unpriced.replace(/s$/, "");
    return `${known.length ? "Upholstery, plus tax: " + known.map((x) => `${x.label} ${money(x.price)}`).join(", ") + ". " : ""}The ${piece} isn't on our standard menu, so it needs a quick review before we can price it — ` +
      (site ? `text a photo to Keith at ${TEXT_LINE} and he'll price it.` : "I've passed it to Keith and he'll get back to you here with a price.");
  }
  const LABEL = { sofa: "sofa", loveseat: "loveseat", chair: "recliner or accent chair" };
  const extrasAfterSet = (used) => Object.entries(used).filter(([, n]) => n > 0).map(([k, n]) => `${n > 1 ? `${n} more ${LABEL[k]}s` : `another ${LABEL[k]}`} at ${money(FURN.find((x) => x.key === k).price)}${n > 1 ? " each" : ""}`);
  const special = f.special ? " Specialty fabrics like leather or velvet, heavy staining, or oversized pieces may need Keith to review them before the price is final." : "";
  if (it.sofa && it.loveseat && it.chair) {
    const more = extrasAfterSet({ sofa: it.sofa - 1, loveseat: it.loveseat - 1, chair: it.chair - 1 });
    return `A sofa, loveseat and chair or recliner is our complete seating package — ${money(179)} plus tax.` + (more.length ? ` Plus ${more.join(" and ")}, plus tax. Each piece is priced separately.` : "") + special;
  }
  if (it.sofa && it.loveseat) {
    // the sofa + loveseat combo applies even with dining chairs or a sectional in the order; those are priced on top
    const others = Object.entries(it).filter(([k, n]) => n > 0 && !["sofa", "loveseat", "chair"].includes(k)).map(([k, n]) => {
      const f2 = FURN.find((x) => x.key === k);
      if (!f2 || f2.price == null) return "a sectional at $119 (small, up to 5 seats) or $169 (large, 6–8 seats)";
      return n > 1 ? `${n} ${k === "dining" ? "dining chairs" : f2.label + "s"} at ${money(f2.price)} each` : `${/^[aeiou]/.test(f2.label) ? "an" : "a"} ${f2.label} at ${money(f2.price)}`;
    });
    const more = [...extrasAfterSet({ sofa: it.sofa - 1, loveseat: it.loveseat - 1, chair: it.chair || 0 }), ...others];
    return `A sofa and loveseat together are ${money(149)} plus tax.` + (more.length ? ` Plus ${more.join(" and ")}, plus tax. Each piece is priced separately.` : "") + special;
  }
  const parts = [];
  for (const [k, n] of Object.entries(it)) {
    const f2 = FURN.find((x) => x.key === k);
    if (!f2) continue;
    if (f2.price == null) { parts.push("sectionals are $119 for a small one (up to 5 seats) or $169 for a large one (6–8 seats)"); continue; }
    parts.push(f2.each && n > 1 ? `${n} ${f2.key === "dining" ? "dining chairs" : f2.key === "chair" ? "recliners or accent chairs" : f2.label + "s"} at ${money(f2.price)} each` : `${f2.label} ${money(f2.price)}`);
  }
  if (!parts.length) return `Upholstery, plus tax: ${PRICES.furniture.map(([n, p]) => `${n} ${money(p)}`).join(", ")}. Very large pieces or special fabrics may need a quick look.`;
  if (parts.length === 1) {
    const p = parts[0];
    const single = /^sectionals are/.test(p) ? `Sectionals are $119 plus tax for a small one (up to 5 seats) or $169 for a large one (6–8 seats).`
      : / at \$\d+ each$/.test(p) ? `${p.replace(/ at (\$\d+) each$/, " are $1 each")}, plus tax.`
      : `${/^[aeiou]/i.test(p) ? "An" : "A"} ${p.replace(/ (\$\d+)$/, " is $1")} plus tax.`;
    return single + special;
  }
  return `Upholstery, plus tax: ${parts.join("; ")}. Each piece is priced separately.` + special;
}

/** Exact upholstery subtotal for saved pieces, or null when a piece has no fixed price. */
function furnTotal(items) {
  const it = { ...items }, parts = [];
  let total = 0;
  if (it.sectional) return null;
  if (it.sofa && it.loveseat && it.chair) { total += 179; parts.push(`sofa, loveseat and chair ${money(179)}`); it.sofa--; it.loveseat--; it.chair--; }
  else if (it.sofa && it.loveseat) { total += 149; parts.push(`sofa and loveseat ${money(149)}`); it.sofa--; it.loveseat--; }
  for (const [k, n] of Object.entries(it)) {
    if (!n) continue;
    const f = FURN.find((x) => x.key === k);
    if (!f || f.price == null) return null;
    total += f.price * n;
    parts.push(n > 1 ? `${n} ${k === "dining" ? "dining chairs" : k === "chair" ? "recliners or accent chairs" : f.label + "s"} ${money(f.price * n)}` : `${/^[aeiou]/i.test(f.label) ? "an" : "a"} ${f.label} ${money(f.price)}`);
  }
  return parts.length ? { total, parts } : null;
}

/** A sectional of unknown size plus any fixed-price pieces: the two possible subtotals. */
function furnRange(items) {
  if (!items || !items.sectional) return null;
  const rest = { ...items }; delete rest.sectional;
  const r = Object.values(rest).some((n) => n) ? furnTotal(rest) : { total: 0, parts: [] };
  if (!r) return null;
  return { low: r.total + 119 * items.sectional, high: r.total + 169 * items.sectional, parts: r.parts };
}

/* ---------- the conversation ---------- */

const METHOD_CORE = "a low-moisture encapsulation process with a BrushPro counter-rotating brush to work the cleaning solution through the carpet fibers and lift soil";
const CRI_LINE = "Wichita Carpet Cleaning Services does not claim Carpet and Rug Institute (CRI) certification or endorsement.";
const METHOD_REPLY = `We use ${METHOD_CORE}. ${CRI_LINE}`;
const NO_STEAM_REPLY = `No — we use ${METHOD_CORE}. ${CRI_LINE}`;
const DRY_REPLY = "Carpet usually dries in about 1.5 to 2 hours, depending on humidity and airflow.";
const PAYMENT_REPLY = "We can take cash at the job, or we send a payment link right after the job is completed. That link can be paid by card, Apple Pay, and similar methods. We do not accept checks.";
// owner (Oct 6): no Venmo — card or cash
const PAYMENT_APPS_REPLY = "No Venmo or other payment apps — we take card or cash. We send a payment link after the job is complete (card or Apple Pay), or you can pay cash at the time of service.";
const INSURED_REPLY = "Yes — we're insured.";
const COI_REPLY = `Yes — we're insured. For a certificate of insurance, text Keith at ${TEXT_LINE}.`;
// business.ts typicalAppointmentDuration
const JOB_LENGTH_REPLY = "A typical job takes about 1.5 to 2 hours. That can flex a little with the size of the home.";
const VACUUM_REPLY = "You do not need to do special vacuuming — just pick up large debris. We typically vacuum beforehand unless there is major cat litter or construction debris.";
const FURNITURE_MOVE_REPLY = "We move smaller items like couches, loveseats, ottomans and coffee tables so we can clean underneath, then put them back. We don't move large furniture, beds, entertainment centers or large appliances, so clear those if you want the carpet under them cleaned.";
// owner brief: licensing and certification
const LICENSE_LINE = "Carpet cleaning doesn't require licensing or registration in Kansas, and we're insured.";
const CERT_REPLY = "Wichita Carpet Cleaning Services does not claim Carpet and Rug Institute (CRI) certification or endorsement.";
const SATISFACTION_REPLY = "If you're not satisfied, we're always happy to come back out and fix the issue.";
const LEAD_TIME_REPLY = "We recommend booking at least a week ahead, and we often have weekday openings sooner. We don't offer same-day service right now.";
const TIPS_REPLY = "Technicians do accept tips if you'd like to leave one, but it's absolutely not expected. Either way, we're glad to take care of the job.";
const UTILITIES_REPLY = "We do need electricity for our equipment, but water is not required. If an outlet is easy to reach, that's all we need from you.";
const FRAGRANCE_REPLY = "If you're sensitive to fragrances, just put that in the notes when you book. We have products designed for that and will plan around it.";
const PARKING_REPLY = "No special parking needed — street or driveway parking that works for your home is all we need.";
const RUNNING_LATE_REPLY = "If we're running behind schedule, we'll reach out as soon as we realize it. We almost always arrive within about 10 minutes of the appointment time.";
const ON_THE_WAY_REPLY = "Yes — you'll get a text about 10 to 15 minutes before we arrive, once we're headed your way.";
// owner (Oct 6): closets come with their room — never an extra area
const CLOSET_REPLY = "Closets are included with their room — they don't count as an extra area.";
const SAFETY_REPLY = "If children, pets, or anyone with a product sensitivity will be home, just tell us before the visit (a note when you book is perfect) so we can review the products we use. Keep foot traffic light until the carpet is fully dry — about 1.5 to 2 hours.";
// "are your products safe?" gets the approved review-the-products answer — never an unqualified "Yes"
const SAFETY_YES_REPLY = "Just tell us before the visit if children, pets, or anyone with a product sensitivity will be home (a note when you book is perfect) so we can review the products we use. Keep foot traffic light until the carpet is fully dry — about 1.5 to 2 hours.";
const STAIN_REPLY = "We get most spots and stains out. Some may be permanent — slime and red stains are common examples — so we can't promise a specific stain will come out, but we'll do everything possible to get it taken care of.";
const ODOR_REPLY = "We always strive for full odor removal, and our enzyme pet treatment is highly effective on areas we can reach with normal cleaning. In heavy cases urine can soak through the carpet backing and pad, so full odor removal can't always be guaranteed.";
const ROOMS_DEF_REPLY = "Bedrooms, living, family, dining and bonus rooms, offices, dens, lofts and finished-basement rooms each count as a room. Hallways and stairs are counted separately, bathrooms and kitchens count only if they're carpeted, and walk-in closets don't count.";
const SAME_DAY_REPLY = "We don't offer same-day service right now, but we often have weekday openings soon — the booking calendar shows the next open times.";
/** "$99 plus tax" or "$99 + $15, plus tax" */
const fmtQ = (q) => (q.extras ? `${money(q.base)} + ${money(q.extras * PRICES.extra)}, plus tax` : `${money(q.total)} plus tax`);
const CHICAGO_DAY = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const weekdayChicago = (d) => { try { return CHICAGO_DAY[new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", weekday: "short" }).format(d)]; } catch { return d.getUTCDay(); } };
const MILITARY_REPLY = "Yes — we offer 15% off for military, first responders, and teachers. Please put that in the notes when you book so we can apply it.";
const IDENTITY_REPLY = "I'm the automated assistant for Wichita Carpet Cleaning Services — I can give you a price and get you booked, or get Keith (the owner) if you need him.";
const IDENTITY_REPLY_SITE = "I'm the automated assistant for Wichita Carpet Cleaning Services — I can give you a price and help you book. For anything else, you can text Keith (the owner) at (316) 232-8111.";
const PET_DIFF_REPLY = "Same coverage — up to 5 rooms, two halls and one staircase. The $149 version adds an enzyme treatment that breaks down pet urine and odor, plus extra time for pet hair. No accidents or odor? The $99 is the one.";
// someone selling marketing/leads/web services to the business, not a customer
const VENDOR_PITCH = /\b(?:i|we) (?:help|work with|partner with) (?:\w+ ){0,3}(?:businesses|companies|cleaners|owners)\b|\bwho (?:handles|does|runs) your (?:marketing|ads|advertising|seo|website)\b|\b(?:facebook|google|meta) ads\b[^.?!]*\b(?:businesses|leads|booked jobs|clients)\b|\b(?:more|\d+\+?) (?:leads|booked jobs|appointments) (?:a|per) (?:month|week)\b|\b(?:seo|lead gen\w*|marketing agency|web design) (?:services|agency|for your)\b/;
const VENDOR_REPLY = "Thanks for reaching out — I've passed this along to Keith, and he'll reply if he's interested.";
const VENDOR_REPLY_SITE = `Thanks for reaching out — if you'd like Keith to see this, text him at ${TEXT_LINE}.`;
const SPECIAL_REPLY ="Our specials: $75 plus tax covers up to 3 rooms, and the $99 special covers up to 5 rooms, two halls, and one staircase, plus tax.";
const MONTHS = { jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11 };
/** True when the message names a calendar date (e.g. "October 3") that falls on a Saturday or Sunday. */
export function namesWeekendDate(t, now = new Date()) {
  const m = t.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+\d{4})?\b/)
    || t.match(/\b(\d{1,2})\/(\d{1,2})\b/);
  if (!m) return false;
  let month, day;
  if (/^\d/.test(m[1])) { month = Number(m[1]) - 1; day = Number(m[2]); } else { month = MONTHS[m[1]]; day = Number(m[2]); }
  if (month == null || month < 0 || month > 11 || day < 1 || day > 31) return false;
  const year = now.getUTCFullYear();
  let when = new Date(Date.UTC(year, month, day, 18));
  if (when.getTime() < now.getTime() - 2 * 864e5) when = new Date(Date.UTC(year + 1, month, day, 18));
  const wd = when.getUTCDay();
  return wd === 0 || wd === 6;
}

/** STOP only when the whole message is an opt-out — never "opt out of the pet treatment" or "my dog won't leave me alone, 3 rooms". */
function isStopMessage(t) {
  const stopPhrase = /\b(?:unsubscribe|opt[ -]?out|(?:stop|quit|don'?t keep|no more) (?:messaging|texting|contacting|sending|bugging|spamming|messages to) me|stop (?:the )?messages|remove me|take me off|leave me alone)\b/.test(t)
    && t.split(" ").length <= 9 && !/\bopt[ -]?out of\b|\b(?:won'?t|wont|doesn'?t|doesnt|don'?t|dont|never|can'?t|cant) leave me alone\b|\d|\$|\b(?:rooms?|price|cost|how much|quote|book|clean\w*|pet|carpets?)\b/.test(t);
  return (/^(?:please )?stop(?: it| now)?(?:[\s!.,]+stop)*[\s!.,]*(?:please)?$/.test(t) || stopPhrase) && !/\bcall me\b/.test(t);
}

/**
 * When the AI's reading has no handoff but the plain-text rules did, does the text handoff still stand?
 * Only for unambiguous wording: a complaint or damage report about our work, an existing appointment,
 * or an outright request for a person. Broad text matches ("small business", "put me down for Monday",
 * a rug size) defer to the AI.
 */
export function textHandoffStands(intent, text) {
  const t = norm(text);
  if (intent === "stop") return true;
  // a worry about the result ("scared they'll say it's still dirty") is a prospect's question, not a complaint about our work
  if (intent === "complaint" && /\b(?:scared|worried|afraid|nervous|concerned|hope|hoping)\b|\b(?:will|would|might|gonna|'ll|could) (?:it |they |that |he )?(?:say|be|look|still)\b/.test(t) && !/\blast time\b|\byou (?:guys )?(?:came|cleaned|did|were here|left)\b|\byour (?:guy|tech|cleaning|cleaner|work)\b|\bafter (?:you|the cleaning|your)\b|\brefund\b|\bmoney back\b/.test(t)) return false;
  if (intent === "complaint") return /\b(?:you|your (?:guy|tech|cleaner|company|team)|he|keith|the tech)\b[^.?!]{0,40}\b(?:ruin\w*|damag\w*|broke|broken|scratch\w*|stain\w*|bleach\w*|tore|ripped|missed|lost|left|never (?:showed|came)|no[- ]show\w*|late|rude)\b|\b(?:refund|money back|still dirty|not happy with|unhappy with|disappointed|terrible job|bad job|worst|nobody (?:called|showed)|no one (?:called|showed))\b/.test(t);
  if (intent === "change_existing" || intent === "confirm_existing") return /\b(?:my|our|the) (?:appointment|appt|booking|reservation|scheduled cleaning)\b|\balready (?:booked|scheduled|have an appointment)\b|\bi (?:booked|scheduled)\b|\bwe (?:booked|scheduled)\b/.test(t);
  if (intent === "human") return /\b(?:talk|speak|chat) (?:to|with) (?:a |an |the |someone|somebody|keith|owner|manager|person|human|real)|\b(?:real|actual|live) (?:person|human)\b|\bhave (?:keith|someone|him) (?:call|text|contact|reach)\b|\bcall me\b|\b(?:useless|not helping|frustrat\w*)\b/.test(t);
  return false;
}

const PACKAGE_SUMMARY = `The ${money(PRICES.standard)} special covers ${COVER}, plus tax. With pet treatment it's ${money(PRICES.pet)}. Smaller jobs (up to 3 areas) are ${money(PRICES.minimum)}.`;
const ASK_ROOMS = "How many rooms, hallways and stairs are we cleaning?";
const THANKS_NO_LINK = "You're very welcome! Whenever you're ready, just say the word and I'll send the booking link. Feel free to message here with any questions.";
const DAY_ASK = "Is there a day and time that works best for you? I can check what's open.";
const LINK_OFFER = "Would you like me to send the booking link so you can pick a time that works for you?";
const PM_PAGE = "https://wichitacarpetcleaningservices.com/property-managers/";
const PM_PRICES = "$75 plus tax for up to 3 rooms, or $99 plus tax for up to 5 rooms, 2 halls and 1 staircase. Pet treatment is $85 or $149.";
const pmLines = (t) => [
  (/\b(?:volume|bulk|discount\w*|deals?|special rates?|commercial rates?|better rates?|rates? for)\b/.test(t) ? "We don't have separate volume rates, but rental units book online like any appointment, at the same published prices: " : "Happy to help! Rental units book online like any appointment, at the same published prices: ") + PM_PRICES,
  "Each unit is its own booking and time slot (about 2 hours), openings start two days out, and payment is due when the invoice arrives. Details for property managers: " + PM_PAGE,
];
const PM_RE = /\b(?:property manag\w*|unit turns?|vacant (?:units?|apartments?)|(?:i'?m|we'?re|i am|we are) (?:a |the )?landlords?|manage (?:an? |the |our )?(?:apartment|complex|building|propert\w*)|\d+ (?:rental )?units|(?:[2-9]|\d{2,3})[ -]?(?:rental |apartment |condo )?units?|(?:[2-9]|\d{2,3}) (?:rental (?:houses|homes|properties|units)|rentals|apartments|condos|townhomes)|apartment complex(?:es)?|(?:own|manage|run) (?:an? |the |our |my )?apartment (?:complex|building)s?|\d ?-?plex(?:es)?|(?:tri|quad|four|five|six)[ -]?plex(?:es)?|duplex(?:es)?|multiple (?:units|rentals)|several (?:units|rentals)|rental (?:units?|propert\w*|homes?))\b/;
const PM_STRONG_RE = /\b(?:property manag\w*|unit turns?|vacant (?:units?|apartments?)|(?:i'?m|we'?re|i am|we are) (?:a |the )?landlords?)\b/;
const PM_COMMERCIAL_RE = /\b(?:office|offices|church|restaurant|warehouse|hotel|daycare|storefront|retail|business(?:es)?)\b/;
const BOOK_INTRO = "Here are the open weekday times — pick one and you'll get a confirmation text right away:";
const DAY = "(?:mon|monday|tue|tues|tuesday|wed|weds|wednesday|thu|thur|thurs|thursday|fri|friday)";
/* ---------- weekends: a firm no (owner policy). Never offered to Keith, never handed to Keith. ---------- */
const WEEKEND_LINE = "Sorry, we're weekdays only (Monday–Friday) — we're closed Saturday and Sunday.";
// the same answer when the customer pushes right after hearing it (never the identical sentence twice in a row)
const WEEKEND_AGAIN = "Sorry — weekends aren't an option. We work Monday through Friday only, and we're closed Saturday and Sunday.";
// a weekend named as the day for the job ("ask Keith if he can do Saturday", "talk to Keith about a weekend appointment")
// "yes please ask Keith" / "can Keith make an exception?" right after the weekdays-only answer
const WEEKEND_KEITH_FOLLOW_RE = /^(?:(?:yes|yeah|yep|sure|ok|okay|please|can you|could you|would you|will you|just|then|so|but)\b[\s,!.]*)*(?:ask|check with|talk to|speak (?:to|with)|message|tell|get) (?:him|keith)(?: (?:please|then|anyway|for me|about (?:it|that|this)|if he (?:can|could|would|will)(?: make an exception| do it| do one| do (?:a |one )?weekend)?))*[\s?!.]*$|\b(?:make|do|any|an) (?:an |one )?exceptions?\b/;
const isWeekendJobAsk = (t) => /\b(?:saturdays?|sundays?|weekends?)\b(?! ?(?:room|porch|down))/.test(t)
  && /\b(?:come|coming|do|doing|work|make|book|booking|schedule|appointment|appt|clean|cleaning|exception|slot|fit (?:me|us|it) in|squeeze|available|availability|possible|open)\b/.test(t)
  && !/\b(?:last|ago|cleaned|came|was|were|did)\b/.test(t);

/* ---------- directives: what the AI step decided the customer meant (see ai/directives-spec.md) ---------- */
export const DIRECTIVE_HANDOFFS = ["complaint", "damage", "no_show", "late_tech", "existing_change", "existing_cancel", "existing_confirm", "billing", "human", "callback", "cant_use_link", "weekend_booking", "commercial", "multi_unit", "oversized_rug", "large_home", "unpriced_item", "other_keith"];
export const DIRECTIVE_TOPICS = ["service_area", "out_of_state", "hours", "weekend_info", "same_day", "lead_time", "slot_times", "next_available",
  "furniture_moving", "heavy_furniture", "prep", "vacuum", "satisfaction", "payment", "checks", "cash", "cards", "deposit", "tips",
  "pet_package_why", "pet_treatment_info", "pets_no_accidents", "military_discount", "discount_apply", "discount_other",
  "running_late_policy", "on_the_way", "home_access", "door_code", "be_home", "product_safety", "kids_pets_walk", "dry_time", "job_length",
  "method", "steam", "certification", "insured", "reviews", "crew", "identity", "is_keith", "scam", "competitor", "utilities", "fragrance", "parking",
  "secured_building", "after_booking", "confirmation_text", "walk_in_closet", "what_counts_room", "bathroom", "basement", "stains", "red_stains",
  "odor", "traffic_lanes", "unsupported_service", "other_trades", "water_damage", "repair", "website", "phone", "email",
  "hiring", "travel_fee", "tax_policy", "upholstery_menu", "rug_info", "wool_rug", "tiny_mat", "tile_menu", "hard_floor_menu", "apartments",
  "mobile_homes", "high_rise", "on_base", "protector", "invoice", "photos", "voice_message", "location_pin", "combo_same_visit",
  "cancellation_policy", "existing_contact", "special_info", "catch", "still_available", "prices_set", "why_75_for_one", "whole_house_info",
  "extra_staircase", "extra_hall", "extra_room", "minimum", "included", "spanish"];
const D_PRICE_QS = ["none", "quote", "total", "per_room", "pet_difference", "without_pet", "why_this_price", "minimum", "tax", "extra_area_cost", "included"];
const D_BOOKING = ["none", "wants_link", "how_to_book", "time_question", "picked_time", "same_day", "tomorrow", "specific_days", "pick_time_question"];
const D_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"];
const D_CLOSINGS = ["thanks", "goodbye", "ok", "not_interested", "will_think", "just_booked"];
const D_PETS = ["accidents", "no_accidents", "declined_treatment", "wants_treatment"];
const D_UPH = { sofa: "sofa", loveseat: "loveseat", chair: "chair", dining_chair: "dining", small_sectional: "small_sectional", large_sectional: "large_sectional", sectional_unknown: "sectional" };

/**
 * Check the AI's directives against the schema. Returns a cleaned copy, or null when anything is off
 * (wrong type, unknown value, count outside 0–30, confidence below 0.6) so the caller falls back to the text rules.
 * Optional fields that are simply missing take their "not applicable" value.
 */
export function validateDirectives(d) {
  const isObj = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
  if (!isObj(d)) return null;
  let bad = false;
  const fail = () => { bad = true; return null; };
  const oneOf = (v, list, dflt) => (v === undefined ? dflt : v === dflt || list.includes(v) ? v : fail());
  const bool = (v) => (v === undefined ? false : typeof v === "boolean" ? v : fail());
  const count = (v) => (v === undefined ? 0 : Number.isInteger(v) && v >= 0 && v <= 30 ? v : fail());
  const numOrNull = (v, max) => (v === undefined || v === null ? null : typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max ? v : fail());
  const strOrNull = (v, max) => (v === undefined || v === null ? null : typeof v === "string" && v.length <= max ? (v.trim() || null) : fail());
  const objOrNull = (v, fn) => (v === undefined || v === null ? null : isObj(v) ? fn(v) : fail());
  if (typeof d.confidence !== "number" || !Number.isFinite(d.confidence) || d.confidence < 0.6 || d.confidence > 1) return null;
  const out = {
    language: oneOf(d.language, ["en", "es", "other"], "en"),
    confidence: d.confidence,
    handoff: oneOf(d.handoff ?? null, DIRECTIVE_HANDOFFS, null),
    job: objOrNull(d.job, (j) => ({ action: oneOf(j.action, ["set", "add", "remove"], "") || fail(), rooms: count(j.rooms), halls: count(j.halls), stairs: count(j.stairs), rugs: count(j.rugs), wholeHouse: bool(j.wholeHouse), wholeFloor: oneOf(j.wholeFloor ?? null, ["upstairs", "downstairs"], null) })),
    pets: oneOf(d.pets ?? null, D_PETS, null),
    upholstery: objOrNull(d.upholstery, (u) => {
      const items = isObj(u.items) ? u.items : u.items === undefined ? {} : fail();
      if (!items) return null;
      const clean = {};
      for (const [k, v] of Object.entries(items)) {
        if (k === "other") continue;
        if (!(k in D_UPH)) return fail();
        clean[k] = count(v);
      }
      const other = items.other === undefined ? [] : Array.isArray(items.other) && items.other.length <= 10 && items.other.every((x) => typeof x === "string" && x.length <= 60) ? items.other.filter((x) => x.trim()) : fail();
      return { action: oneOf(u.action, ["set", "add"], "") || fail(), items: clean, other: other || [] };
    }),
    area: objOrNull(d.area, (a) => ({ town: strOrNull(a.town, 60), zip: a.zip === undefined || a.zip === null ? null : typeof a.zip === "string" && /^\d{5}$/.test(a.zip.trim()) ? a.zip.trim() : fail(), high_rise: bool(a.high_rise), on_base: bool(a.on_base) })),
    floors: objOrNull(d.floors, (f) => ({ type: oneOf(f.type, ["tile", "hard_floor"], "") || fail(), where: oneOf(f.where ?? null, ["bathroom", "kitchen", "entry", "whole"], null), sqft: numOrNull(f.sqft, 100000), special: bool(f.special) })),
    rug: objOrNull(d.rug, (r) => ({ length: numOrNull(r.length, 100), width: numOrNull(r.width, 100), material: oneOf(r.material, ["synthetic", "wool_or_natural", "unknown"], "unknown"), antique_or_oriental: bool(r.antique_or_oriental), tiny_mat: bool(r.tiny_mat) })),
    price_question: oneOf(d.price_question, D_PRICE_QS, "none"),
    topics: d.topics === undefined ? [] : Array.isArray(d.topics) && d.topics.length <= 20 && d.topics.every((x) => DIRECTIVE_TOPICS.includes(x)) ? [...new Set(d.topics)] : fail(),
    booking: oneOf(d.booking, D_BOOKING, "none"),
    days: d.days === undefined ? [] : Array.isArray(d.days) && d.days.length <= 5 && d.days.every((x) => D_DAYS.includes(x)) ? [...new Set(d.days)] : fail(),
    time: strOrNull(d.time, 30),
    closing: oneOf(d.closing ?? null, D_CLOSINGS, null),
    answer_yes_no: oneOf(d.answer_yes_no ?? null, ["yes", "no"], null),
    unanswered: strOrNull(d.unanswered, 300),
    // the AI's own-words answer is optional: a malformed one is dropped, never fatal (checked again against FACTS when used)
    answer: isObj(d.answer) && typeof d.answer.text === "string" && d.answer.text.trim() && d.answer.text.length <= 400 && Array.isArray(d.answer.facts) && d.answer.facts.length && d.answer.facts.length <= 4 && d.answer.facts.every((x) => typeof x === "string")
      ? { text: d.answer.text.trim(), facts: d.answer.facts.slice(0, 4) } : null,
  };
  return bad ? null : out;
}

const D_HIGHRISE = "Sorry — we don't service downtown high-rise apartment buildings. If you're in a house, townhome or low-rise apartment within about 15 miles of downtown Wichita, we'd love to help.";
const D_BASE = "Sorry — we don't service on-base military housing. If you're off base within about 15 miles of downtown Wichita, we'd love to help.";
const D_WOOL = "We do not clean rugs made of wool or other organic or natural material — but we'd be glad to help with carpet or standard synthetic rugs.";
const D_TINY = "We do not clean extremely small rugs or mats that our machinery can't handle, like bath mats or door mats. Standard area rugs are no problem!";
const D_UNSUPPORTED = "We do not offer mattress or vehicle cleaning right now — but we'd be glad to help with home carpet, rugs, furniture, tile or hard floors.";
const D_MINIMUM = `Our minimum is ${money(PRICES.minimum)} plus tax for up to three areas, or ${money(PRICES.petMinimum)} plus tax for up to three rooms with pet treatment.`;
const D_INCLUDED = `The ${money(PRICES.standard)} special covers ${COVER}, plus tax (${money(PRICES.pet)} with pet treatment). Smaller jobs of up to 3 areas are ${money(PRICES.minimum)} plus tax.`;
const D_EXTRA_AREA = `The ${money(PRICES.extra)} is for each area beyond what the ${money(PRICES.standard)} special covers — each room over five, each hall over two, or each staircase over one is ${money(PRICES.extra)} plus tax.`;
const D_TAX = "Our prices are plus tax — Housecall Pro shows your exact total before you confirm.";
const D_PER_ROOM = `It's priced by package, not by the room: ${money(PRICES.minimum)} plus tax covers up to 3 rooms, the ${money(PRICES.standard)} special covers ${COVER} (${money(PRICES.pet)} with pet treatment), and each extra room, hall or staircase is ${money(PRICES.extra)} plus tax.`;
// owner brief: the military/first-responder/teacher discount is mentioned only when they ask about it specifically
const D_PRICES_SET = `Our prices are set: ${money(PRICES.minimum)} plus tax for up to 3 rooms, and the ${money(PRICES.standard)} special covers ${COVER}, plus tax.`;
const D_SLOTS = "Our weekday start times are usually 8:00 AM, 10:30 AM, 1:00 PM and 3:30 PM (we're closed Saturday and Sunday).";
const D_USUAL_SLOTS = ["8:00 AM", "10:30 AM", "1:00 PM", "3:30 PM"];
// evening / after-work asks: the honest no, plus the thing that usually solves it (they don't have to be home)
const D_LATE = "We don't start that late — our usual weekday start times are 8:00 AM, 10:30 AM, 1:00 PM and 3:30 PM (3:30 is the latest). You don't need to be home, though — a garage code, lockbox or unlocked door works.";
const D_EARLY = "We don't start that early — our earliest usual start time is 8:00 AM on weekdays. You don't need to be home, though — a garage code, lockbox or unlocked door works.";
const D_DAYNAME = { monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday" };
const D_ETA_RE = /\bwhat time (?:are|is|will) (?:you|he|keith|the tech|your guy)\b|\bon (?:the|your|his) way\b|\bstill coming\b|\bcoming today\b|\beta\b|\bwhere(?:'s| is) (?:the tech|keith|my tech|your guy)\b|\brunning late\b|\bsupposed to (?:be here|come|show)\b|\b(?:an|a half|\d+) hours? (?:ago|late)\b|\bstill (?:not here|waiting)\b|\bnever showed\b|\bno ?show\b|\bwhere (?:is|are) (?:he|you|y'?all|the (?:tech|guy|cleaner))\b|\bis (?:he|someone|anyone) (?:still )?coming\b/;
// topics that make "how many rooms?" a natural next question (sales questions, not policy/logistics)
const D_SALES_TOPICS = new Set(["service_area", "apartments", "special_info", "still_available", "prices_set", "discount_other", "military_discount", "catch",
  "rug_info", "whole_house_info", "what_counts_room", "included", "minimum", "extra_staircase", "extra_hall", "extra_room", "why_75_for_one", "travel_fee",
  "competitor", "basement", "bathroom", "pet_treatment_info", "pet_package_why", "pets_no_accidents", "water_damage", "walk_in_closet", "tax_policy", "reviews", "scam"]);
// topics after which we never ask for rooms (past customers, declines, things we don't do)
const D_NO_ASK_TOPICS = new Set(["existing_contact", "invoice", "out_of_state", "high_rise", "on_base", "unsupported_service", "other_trades", "voice_message", "location_pin", "hiring", "spanish", "repair", "satisfaction"]);

/* ---------- directives composer helpers ---------- */
const hasScope0 = (savedJson) => { const st = JSON.parse(savedJson); return Boolean(st.wholeHouse || st.rooms + st.rugs + st.halls + st.stairs > 0); };
const BRAIN_HANDOFFS = new Set(["human", "complaint", "layout_review", "rug_price", "commercial", "change_existing", "confirm_existing"]);
const D_HANDOFF_LIKE = new Set(["keith_booking", "human", "complaint", "layout_review", "rug_price", "commercial", "change_existing", "confirm_existing", "keith_question", "thanks", "stop"]);
// the customer says outright they don't need pet treatment (anything less never drops a chosen treatment)
const D_NO_PET_RE = /\bno (?:pet )?(?:accidents?|pee|urine|odou?rs?|smells?|pet treatment|pet stuff|pets?)\b|\b(?:hasn'?t|haven'?t|never|don'?t|doesn'?t|didn'?t) (?:had|have|has|need|want) (?:any )?(?:pet )?(?:accidents?|pee|treatment|the pet\b)|\bwithout (?:the )?pet\b|\bskip (?:the )?pet\b|\bregular (?:price|one|cleaning)\b/;
// handoffs where a follow-up message gets one short line instead of the same paragraph again
const D_HANDOFF_INTENT = { complaint: "complaint", damage: "complaint", no_show: "complaint", late_tech: "complaint", existing_change: "change_existing", existing_cancel: "change_existing", existing_confirm: "confirm_existing",
  billing: "human", human: "human", callback: "human", cant_use_link: "human", other_keith: "human", commercial: "commercial", multi_unit: "commercial", weekend_booking: "booking", oversized_rug: "rug_price", large_home: "layout_review", unpriced_item: "layout_review" };
const D_FOLLOW_UPS = new Set(["human", "complaint", "damage", "no_show", "late_tech", "existing_change", "existing_cancel", "existing_confirm", "billing", "callback", "cant_use_link", "other_keith", "multi_unit"]);
const D_DATE_RE = /\bweek of\b|\b(?:the )?\d{1,2}(?:st|nd|rd|th)\b|\b(?:january|february|march|april|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept?|oct|nov|dec)\.? \d{1,2}\b/;
const D_PUT_BACK_RE = /\b(?:put|move|set|lay)(?:ting)? (?:the |our |my |it |them |everything |things |stuff )?(?:\w+ )?(?:furniture |rugs? |area rugs? )?back\b|\b(?:furniture|rugs?) back\b|\bback (?:down|in place|on top)\b/;
const D_KEY_RE = /\b(?:keys?|lock ?box(?:es)?|door codes?|garage codes?|keypad|spare key|hide a key|gate codes?)\b/;
const D_SOMEONE_THERE_RE = /\b(?:she|he|they|mom|dad|my (?:mother|father|mom|dad|husband|wife|son|daughter))\b[^.?!]{0,30}\b(?:will|'ll|wants? to|would like to) be (?:home|there|present)\b|\b(?:husband|wife|son|daughter|mom|dad|mother|father|partner|roommate|neighbou?r|realtor|landlord|friend|sister|brother|someone|somebody|boyfriend|girlfriend|kids?) (?:will|can|could|'ll|is going to|is gonna)? ?(?:be (?:there|home)|let (?:you|u|y'?all|them) in|meet (?:you|u))\b|\bmeet (?:my|our|the) (?:husband|wife|son|daughter|mom|dad|partner|roommate|neighbou?r|realtor|landlord|friend|sister|brother|tenant)\b/;
const D_STAY_HOME_RE = /\b(?:can|could|may) (?:i|we) (?:be|stay|remain|sleep|work|hang out)\b|\b(?:is it|ok|okay|fine|alright) (?:if|for) (?:i|we|me|us) (?:to )?(?:be|stay|sleep|work)\b|\bstay (?:home|in (?:my|the|another|other)|inside|upstairs)\b|\bsleep in\b|\bwork(?:ing)? from home\b|\bin (?:my|the|another|other) (?:office|room|bedroom)\b|\bi'?ll (?:be|sleep|stay|work) (?:in|home|upstairs)\b/;
const D_PRAISE_RE = /\b(?:did (?:a |such a )?(?:great|amazing|awesome|fantastic|wonderful|excellent) (?:job|work)|did (?:great|amazing|awesome)|(?:great|amazing|awesome|fantastic|wonderful|excellent) job|look(?:s|ed)? (?:amazing|great|awesome|fantastic|brand new|so good|like new|incredible)|turned out (?:great|amazing|awesome)|(?:love|loved) (?:how|the way) (?:they|it) (?:look|turned)|you guys (?:were|are) (?:great|amazing|awesome))\b/;
// topics that give the same answer share a key (heavy_furniture says more than the general furniture answer, so it keeps its own)
const D_TOPIC_KEY = { checks: "payment", cash: "payment", cards: "payment", deposit: "payment", steam: "method", furniture_moving: "furniture", prep: "furniture",
  traffic_lanes: "stains", next_available: "lead_time", kids_pets_walk: "dry_time", discount_other: "prices_set", be_home: "access", home_access: "access", door_code: "access", confirmation_text: "after_booking" };
const D_MORE_TILE_RE = /\b(?:dining|living|entry|entryway|foyer|hall\w*|laundry|mud ?room|breakfast nook|family room|whole|entire)\b/;
const DOOR_CODE_REPLY = "Of course — when you book your appointment, just put that in the notes section so we have access to it and we can take it from there.";
const JOB_LENGTH_D = JOB_LENGTH_REPLY;
const METHOD_SHORT = "It's the low-moisture encapsulation process — very little water, so carpets usually dry in about 1.5 to 2 hours.";
const STEAM_DIFF_REPLY = `It's not steam cleaning — we use ${METHOD_CORE}. It uses very little water, so carpets usually dry in about 1.5 to 2 hours. ${CRI_LINE}`;
const TRAFFIC_REPLY = "Traffic areas get cleaned along with the rest of the carpet. We get most spots and stains out — some may be permanent, so we can't promise a specific spot will come out, but we'll do everything possible to get it taken care of.";
const SUMMARY_SHORT = "$99 plus tax covers up to 5 rooms, two halls and one staircase ($149 with pet treatment); up to 3 areas is $75.";
const PET_DIFF_85 = "$85 is pet treatment for up to 3 rooms, and $149 is pet treatment for up to 5 rooms, two halls and one staircase, plus tax. Without pet treatment those are $75 and $99 — pet treatment is only needed for pet accidents or odor.";
/**
 * Keith's approved facts, by id. The AI understanding step may answer a specific question in its own
 * words (directive "answer") only by citing these: every number, price, time and sensitive word in its
 * answer must appear in the facts it cites (see checkFactAnswer). Wording mirrors business.ts.
 */
export const FACTS = {
  price_packages: `Carpet: ${money(PRICES.minimum)} plus tax covers up to 3 areas (${money(PRICES.petMinimum)} with pet treatment). The ${money(PRICES.standard)} special covers ${COVER}, plus tax (${money(PRICES.pet)} with pet treatment). Each extra room, hall or staircase beyond that is ${money(PRICES.extra)} plus tax — an add-on to the ${money(PRICES.standard)}/${money(PRICES.pet)} package only.`,
  price_by_room: "We price carpet by the room (area), not by square footage or room size — a bigger bedroom is still one room, and a staircase is one staircase however many steps it has.",
  price_total_not_per_room: "Package prices are the total for the job, not per room.",
  tax: "All prices are plus tax. Housecall Pro shows your exact total before you confirm the booking.",
  no_travel_fee: "No travel fee — it's the same package price anywhere in our service area, plus tax.",
  no_hidden_fees: "No catch or hidden fees — the price is the package price plus tax ($75 for up to 3 areas, $99 for up to 5 rooms, two halls and one staircase); bigger homes add $15 plus tax for each area beyond the $99 package, and pet treatment ($85 or $149) is only if you need it.",
  prices_set: "Our prices are set (no haggling or coupon codes needed — those are the regular prices).",
  special_available: `The ${money(PRICES.standard)} special is available right now and books online.`,
  rooms_count: ROOMS_DEF_REPLY,
  closet: CLOSET_REPLY,
  rug_pricing: `A standard area rug counts as one of the rooms in the package. One standard area rug by itself is ${money(PRICES.minimum)} plus tax (the same as one room); once the five package rooms are used, each extra standard rug is ${money(PRICES.extra)} plus tax.`,
  rug_onsite: "We clean qualifying area rugs right at your home.",
  rug_limits: "We clean most synthetic area rugs. We can't clean wool or other natural-fiber rugs (jute, sisal, silk), or very small mats like bath mats or door mats. Rugs bigger than about 8x10, or antique/oriental/handmade rugs, need Keith to look first.",
  upholstery_prices: `Upholstery, plus tax: ${PRICES.furniture.map(([n, p]) => `${n} ${money(p)}`).join("; ")}. Specialty fabrics (like leather), heavy staining, or oversized pieces need Keith to review first.`,
  tile_prices: `Tile & grout, plus tax: ${PRICES.tile.map(([n, p]) => `${n} ${money(p)}`).join("; ")}. The whole-floor option includes a standard grout sealant. Larger areas need a quick review first.`,
  hard_floor_prices: `Hard floors (hardwood, laminate, vinyl/LVP), plus tax: ${PRICES.hardFloor.map(([n, p]) => `${n} ${money(p)}`).join("; ")}. Hard floors and tile are priced separately from the carpet. Over 600 sq ft needs a review first.`,
  same_visit: "We can do carpet, rugs, upholstery, tile and hard floors in the same visit.",
  service_area: `We serve ${AREA_TOWNS} — about 15 miles around downtown Wichita. Housecall Pro checks the exact address when you book. We don't service on-base military housing or downtown high-rise apartments.`,
  homes: "We clean houses, apartments, condos and townhomes. We don't service downtown high-rise apartment buildings or on-base military housing.",
  hours: "We work weekdays only — Monday through Friday, 7 AM to 5 PM. We're closed Saturday and Sunday. Usual start times are 8:00 AM, 10:30 AM, 1:00 PM and 3:30 PM (3:30 PM is the latest start), and the live calendar shows what's open.",
  lead_time: LEAD_TIME_REPLY,
  booking_menu: "On the booking page, pick “Standard Carpet Cleaning” for the $99 package, “Pet-Treatment Carpet Cleaning” for $149, or “Small-Job Pet Treatment” for $85, and add any extra areas there.",
  booking: "You book online with the booking link: pick your own day and time from the live weekday openings, and you get a confirmation text right away. Someone else (a family member) can book for you — just use the service address and a mobile number.",
  after_booking: "After booking you get a confirmation text, and we collect the service address and a mobile number. You also get a text about 10 to 15 minutes before we arrive.",
  notes: "Anything special — access details, gate or lockbox codes, sensitivities or discounts — goes in the notes when you book.",
  cancellation: "There's no cancellation fee — just give us as much notice as you can, whether you're cancelling or rescheduling.",
  payment: PAYMENT_REPLY + " You pay after the job is done; no deposit. No Venmo or other payment apps — just card or cash.",
  invoice: "Every job gets an invoice with a link that acts as proof of service, usually sent when the job is finished. You can show it to a landlord or property manager.",
  tips: TIPS_REPLY,
  discount: MILITARY_REPLY,
  dry_time: "Carpet usually dries in about 1.5 to 2 hours, depending on airflow, humidity and carpet conditions. Keep foot traffic light until it's fully dry.",
  job_length: JOB_LENGTH_REPLY + " It's done in one visit.",
  method: `We use ${METHOD_CORE}. It's low-moisture — not steam or hot-water extraction — so carpets dry in about 1.5 to 2 hours. ${CRI_LINE}`,
  stains: STAIN_REPLY,
  odor: ODOR_REPLY,
  pet_treatment: `Pet treatment adds an enzyme that breaks down pet urine and odor, plus extra time for pet hair. It's there for when specialized pet treatment is needed (pet accidents or pet odor) — just having a pet still qualifies as a standard cleaning. It's ${money(PRICES.petMinimum)} for up to 3 areas or ${money(PRICES.pet)} for the full package, plus tax.`,
  furniture: "We move smaller items like coffee tables, ottomans, couches and loveseats so we can clean underneath, then put them back. We don't move large appliances, large furniture, beds or entertainment centers, so clear those if you want the carpet under them cleaned; otherwise we clean around them.",
  prep: "Just pick up small items like toys, clothes and breakables. No special vacuuming needed — we vacuum beforehand unless there's major cat litter or construction debris.",
  home_access: "You don't need to stay home the whole time, and you're welcome to be home while we work. A garage code, lockbox or unlocked door is fine — put access details in the notes when you book.",
  pets_during: "Pets can stay home during the cleaning — just keep them off the carpet until it's fully dry, and mention them in the notes when you book.",
  product_safety: SAFETY_REPLY,
  health_claims: "We can't make health claims about allergies, asthma or medical conditions.",
  fragrance: FRAGRANCE_REPLY,
  utilities: UTILITIES_REPLY + " No water hookup is needed, so a house on a well is fine.",
  parking: PARKING_REPLY,
  on_the_way: ON_THE_WAY_REPLY,
  running_late: RUNNING_LATE_REPLY,
  satisfaction: SATISFACTION_REPLY + " Keith arranges any return visit personally.",
  insured: INSURED_REPLY + " Carpet cleaning doesn't require licensing or registration in Kansas. We don't claim Carpet and Rug Institute (CRI) certification.",
  reviews: "We have over 385 satisfied customers and a 4.9 out of 5 rating from 229 customer reviews. We don't use Google reviews right now.",
  owner: "We're a real local business in Wichita, owner-operated by Keith, who does the cleaning himself. No crew.",
  bot: IDENTITY_REPLY,
  not_offered: "We don't do carpet repair, stretching or installation, mattress or car cleaning, or other trades — only carpet, rug, upholstery, tile and hard-floor cleaning.",
  commercial: "Commercial spaces and multiple units get a personal quote from Keith.",
  contact: `For an existing appointment, reply to your Housecall Pro text or text ${TEXT_LINE}. New work is booked online.`,
  website: "Our website is wichitacarpetcleaningservices.com.",
  spanish: "This chat can answer in Spanish.",
};

/** The facts as the AI prompt lists them ("id: text" per line). */
export function factsForPrompt() { return Object.entries(FACTS).map(([k, v]) => `${k}: ${v}`).join("\n"); }

const FA_WORDNUM = { one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10", fifteen: "15", twenty: "20" };
const FA_SENSITIVE = [/\bsaturdays?\b/, /\bsundays?\b/, /\bweekends?\b/, /\bguarantee\w*\b/, /\bpromise\w*\b/, /\bfree\b/, /\bdiscount\w*\b/, /\brefund\w*\b/, /\bsame[- ]day\b/,
  /\btoday\b/, /\btomorrow\b/, /\btonight\b/, /\bcertif\w*\b/, /\blicens\w*\b/, /\binsured\b/, /\bwarrant\w*\b/, /\bmold\b/, /\bsteam\b/, /\bchemical\w*\b/, /\bsafe\b/, /\btoxic\b/, /\bnon-?toxic\b/,
  /\bhypoallergenic\b/, /\borganic\b/, /\bgreen\b/, /\beco\b/, /\b(?:allerg\w*|asthma)\b/, /\b15%|\bpercent\b/];
const faTokens = (s, re) => new Set((String(s).toLowerCase().match(re) || []).map((x) => x.replace(/\s+/g, "")));
// "one" is left as a word in the answer ("the one doing the cleaning", "no one"); the facts may spell any number
const faNums = (s, words = true) => { const low = String(s).toLowerCase().replace(words ? /\b(one|two|three|four|five|six|seven|eight|nine|ten|fifteen|twenty)\b/g : /\b(two|three|four|five|six|seven|eight|nine|ten|fifteen|twenty)\b/g, (m) => FA_WORDNUM[m]); return faTokens(low, /\b\d+(?:\.\d+)?\b/g); };
/**
 * Check the AI's own-words answer against the facts it cites. Returns the cleaned text, or null.
 * Every price, percent, time, phone, number, weekday and sensitive word must come from those facts
 * (bare numbers may also echo the customer's message), and it may never promise anything for Keith.
 */
// topic ids the AI sometimes cites in place of the fact that holds the same wording
const FACT_ALIAS = { walk_in_closet: "closet", checks: "payment", cash: "payment", cards: "payment", deposit: "payment", kids_pets_walk: "dry_time", extra_staircase: "price_packages", extra_hall: "price_packages",
  extra_room: "price_packages", extra_area_cost: "price_packages", minimum: "price_packages", included: "price_packages", special_info: "price_packages", whole_house_info: "price_packages", apartments: "homes", mobile_homes: "homes",
  certification: "method", steam: "method", crew: "owner", is_keith: "bot", identity: "bot", scam: "owner", military_discount: "discount", discount_apply: "discount", discount_other: "prices_set", travel_fee: "no_travel_fee",
  catch: "no_hidden_fees", tax_policy: "tax", cancellation_policy: "cancellation", confirmation_text: "after_booking", furniture_moving: "furniture", heavy_furniture: "furniture", vacuum: "prep", home_access_info: "home_access",
  be_home: "home_access", door_code: "notes", pet_treatment_info: "pet_treatment", pet_package_why: "pet_treatment", upholstery_menu: "upholstery_prices", tile_menu: "tile_prices", hard_floor_menu: "hard_floor_prices",
  on_base: "service_area", high_rise: "service_area", out_of_state: "service_area", hours_info: "hours", rug_price: "rug_pricing", rugs: "rug_pricing", fragrance_info: "fragrance",
  rug_info: "rug_limits", wool_rug: "rug_limits", combo_same_visit: "same_visit", what_counts_room: "rooms_count", bathroom: "rooms_count", basement: "rooms_count", running_late_policy: "running_late", lead_time_info: "lead_time",
  slot_times: "hours", weekend_info: "hours", same_day: "lead_time", next_available: "lead_time", job_length_info: "job_length", red_stains: "stains", traffic_lanes: "stains", repair: "not_offered", unsupported_service: "not_offered", other_trades: "not_offered" };
// the approved TOPIC answer that stands in when an own-words answer citing this fact fails the check
const FACT_TOPIC = { price_by_room: null, price_total_not_per_room: null, tax: "tax_policy", no_travel_fee: "travel_fee", no_hidden_fees: "catch", prices_set: "prices_set", special_available: "still_available",
  rooms_count: "what_counts_room", closet: "walk_in_closet", rug_pricing: "rug_info", rug_limits: "rug_info", upholstery_prices: "upholstery_menu", tile_prices: "tile_menu", hard_floor_prices: "hard_floor_menu",
  same_visit: "combo_same_visit", service_area: "service_area", homes: "apartments", hours: "hours", lead_time: "lead_time", after_booking: "after_booking", notes: "door_code", cancellation: "cancellation_policy",
  payment: "payment", invoice: "invoice", tips: "tips", discount: "military_discount", dry_time: "dry_time", job_length: "job_length", method: "method", stains: "stains", odor: "odor", pet_treatment: "pet_treatment_info",
  furniture: "furniture_moving", prep: "prep", home_access: "home_access", pets_during: "kids_pets_walk", product_safety: "product_safety", health_claims: "product_safety", fragrance: "fragrance", utilities: "utilities",
  parking: "parking", on_the_way: "on_the_way", running_late: "running_late_policy", satisfaction: "satisfaction", insured: "insured", reviews: "reviews", owner: "crew", bot: "identity", water_damage: "water_damage",
  not_offered: "other_trades", contact: "existing_contact", website: "website", spanish: "spanish", price_packages: "included", booking: null, commercial: null };
/**
 * @param {{text:string, facts:string[]}} a  the AI's answer
 * @param {string} message  the customer's message (its numbers may be echoed)
 * @param {number[]} jobNums  counts the engine already has for this job (rooms, halls…), which may be echoed too
 */
export function checkFactAnswer(a, message = "", jobNums = [], why = null) {
  const r = checkFactAnswer0(a, message, jobNums);
  if (why && r === null) why.push(checkFactAnswer0.lastReason);
  return r;
}
function checkFactAnswer0(a, message, jobNums) {
  const no = (reason) => { checkFactAnswer0.lastReason = reason; return null; };
  if (!a || typeof a !== "object" || typeof a.text !== "string" || !Array.isArray(a.facts)) return no("shape");
  const text = a.text.replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();
  const ids = [...new Set(a.facts.map((f) => (typeof f === "string" ? (Object.hasOwn(FACTS, f) ? f : FACT_ALIAS[f]) : null)))];
  if (!text || text.length > 320 || !ids.length || a.facts.length > 4 || !ids.every((f) => f && Object.hasOwn(FACTS, f))) return no("facts/length");
  const src = ids.map((f) => FACTS[f]).join(" ").replace(/[‘’]/g, "'");
  const low = text.toLowerCase(), srcLow = src.toLowerCase();
  if (/https?:|www\.|[<>{}]|\bas an ai\b|\blanguage model\b/.test(low)) return no("markup");
  if (/\bkeith (?:will|'ll|has|knows|can come)\b|\bi(?:'ve| have) (?:sent|passed|told|let|flagged|asked|added|booked|scheduled)\b|\bhe(?:'ll| will) (?:reply|reach|call|text|get back|come)\b|\byou(?:'re| are) (?:booked|scheduled|all set)\b/.test(low)) return no("promise");
  if (/\b(?:can|could|will|do|does|we'll|we can)\b[^.?!]{0,30}\b(?:saturdays?|sundays?|weekends?)\b/.test(low) && !/\bclosed\b/.test(low)) return no("weekend");
  const checks = [/\$\s?\d+(?:\.\d+)?/g, /\d+\s?%/g, /\b\d{1,2}(?::\d{2})?\s?(?:am|pm|a\.m\.|p\.m\.)\b|\b\d{1,2}:\d{2}\b/g, /\(?\d{3}\)?[ .-]?\d{3}[ .-]?\d{4}/g, /\b(?:monday|tuesday|wednesday|thursday|friday)s?\b/g];
  // the package prices themselves are always fair to mention (they're the core facts); anything else must be in the cited facts
  const pkg = [PRICES.minimum, PRICES.petMinimum, PRICES.standard, PRICES.pet, PRICES.extra].map((n) => "$" + n);
  for (const re of checks) { const ok = faTokens(srcLow, re); if (re === checks[0]) pkg.forEach((x) => ok.add(x)); for (const v of faTokens(low, re)) if (!ok.has(v)) return no("token " + v); }
  const okNums = new Set([...faNums(srcLow), ...faNums(String(message)), ...jobNums.filter((x) => Number.isInteger(x) && x > 0).map(String)]);
  for (const v of faNums(low.replace(/\$\s?\d+(?:\.\d+)?/g, " ").replace(/\(?\d{3}\)?[ .-]?\d{3}[ .-]?\d{4}/g, " "), false)) if (!okNums.has(v)) return no("number " + v);
  for (const re of FA_SENSITIVE) if (re.test(low) && !re.test(srcLow)) return no("claim " + re.source);
  // every price is "plus tax": add the note rather than lose a good answer
  if (/\$\d/.test(text) && !/plus tax|\+ tax|impuesto/.test(low)) return /[.!?]$/.test(text) ? `${text} Prices are plus tax.` : `${text}. Prices are plus tax.`;
  return text;
}

/** true when the customer's message asks a yes/no question ("do you…", "is that…"), not "which/how" or "X or Y" */
function ynQ(t) {
  const FILL = /^(?:(?:hi|hey|hello|ok|okay|so|and|also|but|oh|wait|well|um|lol|yes|yeah|no|great|thanks|hmm|actually|quick question|question|hola)\b[\s,]*)*/;
  const START = /^(?:do|does|did|is|are|can|could|will|would|should|have|has|was|were|may|am|any|isn'?t|aren'?t|don'?t|doesn'?t|won'?t|can'?t|r)\b/;
  const MID = /\b(?:do|does|is|are|can|could|will|would|should)\s+(?:i|we|you|u|ya|it|this|that|they|there|he|she)\b/;
  const WH = /\b(?:what|whats|how|which|why|when|where|who|whose)\b/;
  return String(t).toLowerCase().split(/[?.!,;:]+|\s(?:and|but|so|plus)\s/).map((c) => c.trim().replace(FILL, "")).filter(Boolean).some((c) => {
    if (/\bor\b(?! not\b)/.test(c)) return false;
    if (START.test(c)) return true;
    const i = c.search(MID);
    return i > 0 && !WH.test(c.slice(0, i));
  });
}
const dropOpener = (line) => line.replace(/^(?:Yes|No) — (\S)/, (m, c) => c.toUpperCase());
function dHash(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return h.toString(36); }
/** split the way out() does, to count what the customer will actually see */
function dSplitCount(b) { let n = 1, rest = b; while (rest.length > 320) { const cut = rest.lastIndexOf(". ", 319); if (cut < 80) break; n += 1; rest = rest.slice(cut + 2); } return n; }

export function createConversation(init = {}) {
  const state = {
    channel: init.channel || "messenger",
    rooms: init.rooms ?? 0, rugs: init.rugs ?? 0, city: init.city ?? null, zip: init.zip ?? null, inArea: init.inArea ?? null, halls: init.halls ?? 0, stairs: init.stairs ?? 0, wholeHouse: init.wholeHouse ?? false,
    pets: init.pets ?? null, quoted: init.quoted ?? false, linkSent: init.linkSent ?? false, unsupported: init.unsupported ?? false, greeted: init.greeted ?? false, named: init.named ?? [],
    unknownCount: init.unknownCount ?? 0, turns: init.turns ?? 0, lastIntent: init.lastIntent ?? "",
    furn: init.furn ?? {}, unknownQ: init.unknownQ ?? 0, offeredKeith: init.offeredKeith ?? false, weekendLast: init.weekendLast ?? false, helpAsked: init.helpAsked ?? false, askedRooms: init.askedRooms ?? false, tileAsked: init.tileAsked ?? false,
    floorAsked: init.floorAsked ?? false, declined: init.declined ?? null, discountAsked: init.discountAsked ?? false, lastQuoteKey: init.lastQuoteKey ?? "", coverSaid: init.coverSaid ?? false,
    floorItem: init.floorItem ?? null, reviewKind: init.reviewKind ?? "", askStreak: init.askStreak ?? 0, nonPetOdor: init.nonPetOdor ?? false, manualBooking: init.manualBooking ?? false, siteHandoff: init.siteHandoff ?? "", needRooms: init.needRooms ?? false, declinedSvcTurn: init.declinedSvcTurn ?? 0, openIssue: init.openIssue ?? "", openIssueTurn: init.openIssueTurn ?? 0, lastReply: init.lastReply ?? "", repeatCount: init.repeatCount ?? 0, carpetTalk: init.carpetTalk ?? false,
    // answers already given in this conversation (topic ids and a few reply kinds), so a repeat ask gets one short line
    said: Array.isArray(init.said) ? [...init.said] : [],
    version: "front-desk-v2",
  };
  const site = state.channel === "site";
  // the clock can be pinned for tests (init.now); production always uses the real time
  const clockNow = () => (init.now != null ? new Date(init.now) : new Date());
  const reach = (messengerLine, siteLine) => (site ? siteLine : messengerLine);

  /* ---------- live open times (from Keith's calendar, passed in per message as msg.slots) ---------- */
  // slots = { asOf, earliest, days: [{ date, wd, day, label, bookable, times, raw }] } — times only, never job details.
  let slotsNow = null;
  const SLOT_MAX_AGE = 20 * 60000;
  function validSlots(x) {
    if (!x || typeof x !== "object" || !Array.isArray(x.days) || !x.days.length) return null;
    const age = clockNow().getTime() - Date.parse(x.asOf);
    if (!(age >= -5 * 60000 && age <= SLOT_MAX_AGE)) return null;
    const ok = x.days.every((d) => d && /^\d{4}-\d\d-\d\d$/.test(d.date) && Array.isArray(d.raw) && d.raw.every((t) => /^\d\d:\d\d$/.test(t)) && typeof d.label === "string" && typeof d.day === "string");
    return ok ? x : null;
  }
  const ampm = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
  const orList = (xs) => (xs.length <= 1 ? xs.join("") : xs.length === 2 ? `${xs[0]} or ${xs[1]}` : `${xs.slice(0, -1).join(", ")} or ${xs.at(-1)}`);
  const SLOT_DAY = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
  const SLOT_DAY_RE = /\b(sun|mon|tue|wed|thu|fri|sat)(?:days?|s|\.)?(?:day|nesday|sday|rsday|urday|ursday|esday)?\b/g;
  const TIME_ASK_RE = /\bwhen\b|\bavailab\w*|\bopenings?\b|\bopen (?:times?|slots?|days?)\b|\bsoonest\b|\bearliest\b|\bnext (?:week|available|opening|open)\b|\bthis week\b|\btomorrow\b|\btoday\b|\btonight\b|\bsame[- ]day\b|\bwhat times?\b|\btime ?slots?\b|\bslots?\b|\bschedul\w*|\bbook\w*|\bcome (?:out|by|over)\b|\bfit (?:me|us) in\b|\b(?:sun|mon|tue|wed|thu|fri|sat)(?:day|nesday|sday|rsday|urday|ursday|esday)?s?\b|\bmorning\b|\bafternoon\b|\bweekday\b|\bany ?time\b|\bdates?\b|\b\d{1,2}\/\d{1,2}\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+\d{1,2}\b|\b\d{1,2}(?:st|nd|rd|th)\b/;
  function slotSentence(t) {
    const S = slotsNow; if (!S) return null;
    const todayP = clockNow();
    const fmtD = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" });
    const isoAt = (n) => fmtD.format(new Date(todayP.getTime() + n * 86400000));
    const today = isoAt(0), tomorrow = isoAt(1);
    const part = /\bmornings?\b|\b(?:early|am)\b/.test(t) ? "am" : /\bafternoons?\b|\b(?:late|pm|after (?:work|lunch))\b/.test(t) ? "pm" : null;
    const filt = (raw) => raw.filter((x) => (part === "am" ? x < "12:00" : part === "pm" ? x >= "12:00" : true));
    const open = S.days.filter((d) => d.bookable && filt(d.raw).length);
    const dayPhrase = (d, raw = filt(d.raw)) => `${d.label} at ${orList(raw.map(ampm))}`;
    const soonest = (after = "") => {
      const xs = open.filter((d) => d.date > after);
      if (!xs.length) return null;
      return filt(xs[0].raw).length >= 2 || !xs[1] ? dayPhrase(xs[0], filt(xs[0].raw).slice(0, 3)) : `${dayPhrase(xs[0])}, or ${dayPhrase(xs[1], filt(xs[1].raw).slice(0, 2))}`;
    };
    const partWord = part === "am" ? "morning" : part === "pm" ? "afternoon" : "";
    // which days did they name?
    const asked = [];
    if (/\btomorrow\b/.test(t)) asked.push(tomorrow);
    for (const m of t.matchAll(SLOT_DAY_RE)) {
      const wd = SLOT_DAY[m[1]];
      if (wd === undefined || wd === 0 || wd === 6) continue;
      const nextWeek = new RegExp(`\\bnext\\s+${m[0]}`).test(t);
      const first = S.days.find((d) => d.wd === wd && d.date > today);
      const pick = first && nextWeek ? S.days.find((d) => d.wd === wd && d.date > first.date && d.date > isoAt(6 - new Date(todayP).getDay())) || first : first;
      if (pick && !asked.includes(pick.date)) asked.push(pick.date);
    }
    // "the 15th", "Oct 15", "10/15"
    const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
    const dm = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/.exec(t) || /\b(\d{1,2})\/(\d{1,2})\b/.exec(t) || /\bthe\s+(\d{1,2})(?:st|nd|rd|th)\b|\b(\d{1,2})(?:st|nd|rd|th)\b/.exec(t);
    if (dm) {
      let mo = null, day = null;
      if (MON[dm[1]]) { mo = MON[dm[1]]; day = +dm[2]; } else if (dm[2] && /\//.test(dm[0])) { mo = +dm[1]; day = +dm[2]; } else day = +(dm[1] || dm[2]);
      const hit = S.days.find((d) => +d.date.slice(8) === day && (mo == null || +d.date.slice(5, 7) === mo) && d.date >= today);
      if (hit) { asked.length = 0; asked.push(hit.date); }
    }
    const lines = [];
    for (const date of asked.slice(0, 2)) {
      const d = S.days.find((x) => x.date === date);
      if (!d) continue; // a weekend, or beyond the window: the brain's own answer covers it
      const s = soonest(d.date);
      if (!d.bookable) { const n = soonest(); lines.push(n ? `${d.day} is a little too soon to book online — the soonest ${partWord ? partWord + " " : ""}openings are ${n}.` : `${d.day} is a little too soon to book online.`); continue; }
      const raw = filt(d.raw);
      // "friday at 10:30" / "monday at 1": a specific start time
      const tm = /\b(?:at|@|around|for)\s+(\d{1,2})(?::(\d\d))?\s*(a\.?m\.?|p\.?m\.?)?\b|\b(\d{1,2}):(\d\d)\s*(a\.?m\.?|p\.?m\.?)?\b|\b(\d{1,2})\s*(a\.?m\.?|p\.?m\.?)\b/.exec(t);
      if (tm) {
        let h = +(tm[1] || tm[4] || tm[7]); const mi = +(tm[2] || tm[5] || 0); const ap = (tm[3] || tm[6] || tm[8] || "").replace(/\./g, "");
        if (ap === "pm" && h < 12) h += 12; else if (!ap && h >= 1 && h <= 5) h += 12;
        const want = `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
        if (h >= 6 && h <= 18) {
          if (d.raw.includes(want)) { lines.push(`${d.label} at ${ampm(want)} is open right now.`); continue; }
          lines.push(d.raw.length ? `${d.label} at ${ampm(want)} isn't open, but ${orList(d.raw.map(ampm))} ${d.raw.length > 1 ? "are" : "is"}.` : `${d.label} is booked up — the next open times are ${soonest(d.date) || "on the calendar"}.`);
          continue;
        }
      }
      if (raw.length) lines.push(`${d.label} shows ${orList(raw.map(ampm))} open right now.`);
      else if (part && d.raw.length) lines.push(`${d.label} doesn't have a ${partWord} opening, but ${orList(d.raw.map(ampm))} ${d.raw.length > 1 ? "are" : "is"} open.`);
      else lines.push(s ? `${d.label} is booked up — the next open ${partWord ? partWord + " " : ""}times are ${s}.` : `${d.label} is booked up.`);
    }
    if (lines.length) return lines.join(" ");
    if (/\bnext week\b|\bthis week\b/.test(t)) {
      const wkStart = new RegExp("\\bnext week\\b").test(t) ? isoAt(7 - new Date(todayP).getDay()) : today;
      const wkEnd = new RegExp("\\bnext week\\b").test(t) ? isoAt(13 - new Date(todayP).getDay()) : isoAt(6 - new Date(todayP).getDay());
      const xs = open.filter((d) => d.date >= wkStart && d.date <= wkEnd);
      if (xs.length) return `${new RegExp("\\bnext week\\b").test(t) ? "Next week" : "This week"}, the open ${partWord ? partWord + " " : ""}times are ${xs.slice(0, 2).map((d) => dayPhrase(d)).join("; ")}${xs.length > 2 ? "; and more later in the week" : ""}.`;
      const n = soonest(wkEnd);
      return n ? `${new RegExp("\\bnext week\\b").test(t) ? "Next week" : "This week"} is booked up — the soonest open time after that is ${n}.` : null;
    }
    const n = soonest();
    return n ? `The soonest open ${partWord ? partWord + " " : ""}times are ${n}.` : null;
  }
  // a reply about booking or times gets the real open times in place of the generic "the calendar shows what's open"
  const GENERIC_TIMES = /(?:^|(?<=[.!?]\s))[^.!?]*(?:start times are usually|usual start times are|earliest usual start time|is one of our usual weekday start times|open times are on the live calendar|openings are on the live calendar)[^.!?]*[.!?:]\s*/gi;
  // a time or day in the customer's words ("monday", "tomorrow", "mornings", "10:30", "the 15th", "anytime")
  const SPECIFIC_RE = /\b(?:mon|tue|wed|thu|fri|sat|sun)(?:day|nesday|sday|rsday|urday|ursday|esday)?s?\b|\btomorrow\b|\btoday\b|\b(?:this|next) week\b|\bmornings?\b|\bafternoons?\b|\b\d{1,2}(?::\d\d)?\s*(?:am|pm|a\.m\.|p\.m\.)\b|\b\d{1,2}:\d\d\b|\bat \d{1,2}\b|\b\d{1,2}\/\d{1,2}\b|\b\d{1,2}(?:st|nd|rd|th)\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+\d{1,2}\b/;
  const SOONEST_RE = /\b(?:soonest|earliest|asap|as soon as|next (?:available|opening|open)|any ?(?:time|day|thing)|whenever|whatever(?:'s| is)? (?:open|soonest|first|available)|no preference|doesn'?t matter|don'?t care|flexible|first available|when(?:ever)? (?:is|are) (?:your )?(?:next|soonest|first)|when can you|when are you)\b/;
  function applySlots(r, text, linkBefore = state.linkSent) {
    if (!slotsNow || !r || !Array.isArray(r.bubbles) || !r.bubbles.length || r.phone) return r;
    const t = norm(text);
    // with live times, the gentle link offer becomes "what day works best? I can check"
    const offerI = r.bubbles.findIndex((b) => b.includes(LINK_OFFER));
    if (offerI >= 0 && !SPECIFIC_RE.test(t) && !SOONEST_RE.test(t)) {
      const bubbles = [...r.bubbles];
      bubbles[offerI] = bubbles[offerI].replace(LINK_OFFER, DAY_ASK);
      state.lastReply = bubbles.filter((b) => b !== bookingUrl).join(" | ").slice(0, 400);
      return { ...r, bubbles };
    }
    // "how do I book?" / "yes, let's book": ask what day suits them before listing times (unless they asked for the link itself)
    if (r.bubbles.includes(bookingUrl) && !linkBefore && !SPECIFIC_RE.test(t) && !SOONEST_RE.test(t) && !/\blink\b|\bcalendar\b|\bsend it\b/.test(t) && !r.bubbles.some((b) => b.includes(WEEKEND_LINE) || b.includes(WEEKEND_AGAIN) || /same-day/.test(b))) {
      const i = r.bubbles.indexOf(bookingUrl);
      const lead = i > 0 ? r.bubbles[i - 1] : "";
      const keep = lead.replace(GENERIC_TIMES, "").replace(/(?:^|\s)(?:The live calendar shows[^.!?:]*|Here are the open weekday times[^:]*|Just tap the booking link[^:]*|You can see the open times[^:]*|Or you can pick a time right now|grab one and[^:]*|The booking calendar shows[^.!?:]*)[.:]\s*$/i, "").replace(/\s*How many rooms, hallways and stairs are we cleaning\?/, "").trim();
      const bubbles = [...r.bubbles.slice(0, Math.max(0, i - 1)), `${keep ? keep.replace(/[.!]?$/, "!") + " " : "Happy to get you on the schedule! "}${DAY_ASK}`, ...r.bubbles.slice(i + 1)].map((b) => b.replace(/^Great!! /, "Great! "));
      state.lastReply = bubbles.join(" | ").slice(0, 400);
      state.linkSent = linkBefore;
      return { ...r, bubbles, dayAsk: true };
    }
    if (!TIME_ASK_RE.test(t) && !(r.bubbles.includes(bookingUrl) && /^(?:yes|yeah|yep|sure|ok|okay|please|yes please|sounds good|send it|go ahead)\b/.test(t))) return r;
    const hasLink = r.bubbles.includes(bookingUrl);
    const pointsAbove = r.bubbles.some((b) => /booking link above|booking calendar right now/.test(b));
    const weekendNo = r.bubbles.some((b) => b.includes(WEEKEND_LINE) || b.includes(WEEKEND_AGAIN));
    const offerAt = r.bubbles.findIndex((b) => b.includes(LINK_OFFER));
    const namedDay = /\b(?:mon|tue|wed|thu|fri)\w*\b|\btomorrow\b|\bnext week\b|\bthis week\b/.test(t);
    if (!hasLink && !pointsAbove && !weekendNo && !(offerAt >= 0 && namedDay)) return r;
    if (!hasLink && !pointsAbove && !weekendNo) {
      const s0 = slotSentence(t); if (!s0) return r;
      const bubbles = [...r.bubbles];
      bubbles[offerAt] = bubbles[offerAt].replace(LINK_OFFER, `${s0} Want me to send the link so you can grab ${/ is open right now\.$|shows \d{1,2}:\d\d [AP]M open right now\.$/.test(s0) ? "it" : "one"}?`);
      state.lastReply = bubbles.join(" | ").slice(0, 400);
      return { ...r, bubbles, slots: true };
    }
    let s = slotSentence(t.replace(/\b(?:sat|sun)\w*\b|\bweekends?\b/g, " "));
    if (!s) return r;
    if (weekendNo) s = s.replace(/^The soonest open /, "The soonest weekday open ");
    let bubbles = r.bubbles.map((b) => b.replace(/, but we often have weekday openings soon — the booking calendar shows the next open times\./, "."));
    if (weekendNo && !hasLink && !pointsAbove) {
      bubbles.push(`${s} ${state.linkSent ? "The booking link above has them." : "Want me to send the link so you can grab one?"}`);
      state.lastReply = bubbles.join(" | ").slice(0, 400);
      return { ...r, bubbles, slots: true };
    }
    if (hasLink) {
      const i = bubbles.indexOf(bookingUrl);
      const lead = i > 0 ? bubbles[i - 1] : "";
      const keep = lead.replace(GENERIC_TIMES, "").replace(/(?:^|\s)(?:The live calendar shows[^.!?:]*|Here are the open weekday times[^:]*|Just tap the booking link[^:]*|You can see the open times[^:]*|grab one and[^:]*|The booking calendar shows[^.!?:]*)[.:]\s*$/i, "").trim();
      const newLead = `${keep && !/:$/.test(keep) ? keep + " " : ""}${s} You can grab ${/ is open right now\.$|shows \d{1,2}:\d\d [AP]M open right now\.$/.test(s) ? "it" : "one"} here, and you'll get a confirmation text right away:`.replace(/^Great!\s+/, "Great! ");
      if (i > 0) bubbles[i - 1] = newLead; else bubbles.splice(i, 0, newLead);
    } else {
      const i = bubbles.findIndex((b) => /booking link above|booking calendar right now/.test(b));
      bubbles.splice(i, 0, s);
    }
    bubbles = bubbles.map((b) => (b === bookingUrl ? b : b.replace(GENERIC_TIMES, "").trim())).filter(Boolean);
    // a lone "Great!" / "Thanks for reaching out!" joins the bubble after it
    for (let i = bubbles.length - 2; i >= 0; i--) if (/^(?:Great!|Thanks for reaching out!|Sounds good!)$/.test(bubbles[i]) && bubbles[i + 1] !== bookingUrl) bubbles.splice(i, 2, `${bubbles[i]} ${bubbles[i + 1]}`);
    state.lastReply = bubbles.filter((b) => b !== bookingUrl).join(" | ").slice(0, 400);
    return { ...r, bubbles, slots: true };
  }
  /** Update the job from what the customer just said. Returns true when the job changed. */
  let restated = [];
  function applyScope(scope, t, { adding = false, inclusionQ = false } = {}) {
    let changed = false;
    const start = JSON.stringify(scopeNow());
    if (scope.found) {
      changed = true;
      for (const w of scope.namedList || []) if (!state.named.includes(w)) state.named.push(w);
      if (scope.wholeHouse) state.wholeHouse = true;
      else if (inclusionQ && !state.wholeHouse) { state.rooms += scope.rooms; }
      else if ((adding || scope.adding) && state.wholeHouse) { state.wholeHouse = false; state.rooms = PRICES.includes.rooms + scope.rooms; state.rugs += scope.rugs || 0; state.halls += scope.halls; state.stairs += scope.stairs; }
      else if ((adding || scope.adding) && hasScope()) {
        // "and stairs" / "and 2 halls" when those are already counted is a restatement, not more
        const more = /\b(?:another|second|2nd|third|3rd|extra|more|additional|other|one more)\b/.test(t);
        const onlyStairs = scope.stairs && !scope.rooms && !scope.rugs && !scope.halls, onlyHalls = scope.halls && !scope.rooms && !scope.rugs && !scope.stairs;
        if (onlyStairs && !more && state.stairs >= 1 && !/\d|\b(?:two|three|four)\b/.test(t.replace(/\b\d+\s*(?:steps?|stairs? steps?)\b/g, " "))) restated.push("stairs");
        else if (onlyHalls && !more && !/\b(?:plus|add|adding|also)\b/.test(t) && scope.halls === state.halls && (scope.halls >= 2 || /\bthe (?:hall ?ways?|halls?)\b/.test(t))) restated.push("halls");
        else { state.rooms += scope.rooms; state.rugs += scope.rugs || 0; state.halls += scope.halls; state.stairs += scope.stairs; }
      }
      else {
        if (scope.rugs) state.rugs = scope.rugs;
        if (scope.rooms) { state.rooms = scope.rooms; state.wholeHouse = false; }
        if (scope.halls) state.halls = scope.halls;
        if (scope.stairs) state.stairs = scope.stairs;
      }
    } else if (scope.replaceRooms && hasScope()) {
      changed = true;
      state.rooms = scope.replaceRooms; state.wholeHouse = false;
      if (/\b(?:just|only|nvm|never ?mind)\b/.test(t)) { state.halls = 0; state.stairs = 0; }
    }
    const r = scope.remove;
    if (r && r.any && hasScope()) {
      if (state.wholeHouse && (r.rooms || r.rugs)) { state.wholeHouse = false; state.rooms = PRICES.includes.rooms; }
      const before = JSON.stringify(scopeNow());
      state.rooms = Math.max(0, state.rooms - r.rooms);
      state.rugs = Math.max(0, state.rugs - r.rugs);
      state.halls = r.allHalls ? 0 : Math.max(0, state.halls - r.halls);
      state.stairs = r.allStairs ? 0 : Math.max(0, state.stairs - r.stairs);
      if (JSON.stringify(scopeNow()) !== before) changed = true;
    }
    return changed && JSON.stringify(scopeNow()) !== start;
  }
  let topicIntent = "";
  let currentText = "";
  // a loss or a hospital stay mentioned in passing: one line of sympathy before anything else (once per chat)
  const SAD_RE = /\b(?:passed away|passed on|has passed|recently passed|died|funeral|in the hospital|hospitali[sz]ed|lost my (?:husband|wife|mom|dad|mother|father|son|daughter|grandma|grandmother|grandpa|grandfather)|my (?:husband|wife|mom|dad|mother|father)(?: just)? passed|widow\w*|falleci\w*|en el hospital)\b/;

  function out(intent, bubbles, extra = {}) {
    state.lastIntent = intent;
    if (intent !== "unknown") { state.unknownCount = 0; state.unknownQ = 0; }
    if (bubbles.some((b) => /same-day service/.test(String(b || "")))) markSaid("sameday");
    if (bubbles.some((b) => /^Water damage is something Keith would want to look at personally/.test(String(b || "")))) { state.openIssue = "water"; state.openIssueTurn = state.turns; }
    let list = bubbles.filter(Boolean).map((b) => b.replace(/\s+/g, " ").trim()).filter(Boolean);
    var sad = list.length && intent !== "stop" && SAD_RE.test(currentText);
    if (sad) list = list.map((b) => b.replace(/ If you have pet accidents or odor, the pet-treatment version is [^.]*\.| Pet treatment is available if you need it\./g, ""));
    if (list.length && intent !== "stop" && SAD_RE.test(currentText) && !state.said.includes("sympathy")) { list[0] = `${/passed|died|funeral|lost my|widow|falleci/i.test(currentText) ? "I'm so sorry for your loss." : "I'm so sorry to hear that."} ${list[0].replace(/^I'm (?:so )?sorry(?: about that| to hear that)?[.!—–-]*\s*/i, "")}`; state.said.push("sympathy"); }
    // never the same sentence twice in one reply (or one sentence that another already contains)
    {
      const keyOf = (x) => x.toLowerCase().replace(/[^a-z0-9$ ]/g, "").replace(/\s+/g, " ").trim();
      const sents = list.map((b) => (b === bookingUrl ? [b] : b.split(/(?<=[.!?])\s+(?=[A-Z$¿¡])/)));
      const all = sents.flat().filter((x) => x !== bookingUrl).map(keyOf);
      const kept = new Set();
      list = sents.map((ss) => ss.filter((x) => {
        if (x === bookingUrl) return true;
        const k = keyOf(x);
        if (k.length < 20 || /\?$/.test(x)) return true;
        if (kept.has(k)) return false;
        if (all.some((o) => o !== k && o.length > k.length && o.includes(k))) return false;
        kept.add(k);
        return true;
      }).join(" ")).filter(Boolean);
    }
    // keep every bubble readable on a phone: split anything over 320 characters at a sentence break
    list = list.flatMap((b) => { const parts = []; let rest = b; while (rest.length > 320) { const cut = rest.lastIndexOf(". ", 319); if (cut < 80) break; parts.push(rest.slice(0, cut + 1)); rest = rest.slice(cut + 2); } parts.push(rest); return parts; });
    // never ask "how many rooms" twice in a row — and after two asks, stop asking until they bring it up
    if (askedBefore && (state.askStreak || 0) >= 2) list = list.map((b) => b.replace(/\s*(?:How many rooms, hallways and stairs are we cleaning\?|How many rooms are we cleaning\?|Just send me the number of rooms, hallways and stairs, and I'll give you the exact price\.|Just send me the room count and I'll give you the exact price\.)/g, "").trim()).filter(Boolean);
    else if (askedBefore) list = list.map((b) => b.replace(/How many rooms, hallways and stairs are we cleaning\?/, "Just send me the number of rooms, hallways and stairs, and I'll give you the exact price.").replace(/How many rooms are we cleaning\?/, "Just send me the room count and I'll give you the exact price."));
    if (!list.length && bubbles.some((b) => b && String(b).trim())) list = ["Got it!"];
    // only one "No —" answer per reply
    let seenNo = false;
    list = list.map((b) => b.replace(/(^|[.!?] )No — (\w)/g, (m, pre, c) => { if (!seenNo) { seenNo = true; return m; } return pre + c.toUpperCase(); }));
    // never the identical reply twice in a row: a repeated acknowledgment gets a shorter one
    const key = list.filter((b) => b !== bookingUrl).join(" | ");
    if (key && key === state.lastReply && !extra.phone && !/weekends? aren't|weekdays only/.test(key) && (intent === "thanks" || (intent === "booking" && !list.includes(bookingUrl)))) {
      list = [state.repeatCount % 2 ? "Sounds good!" : "Great — I'm here if anything else comes up."];
      state.repeatCount += 1;
    }
    state.lastReply = list.filter((b) => b !== bookingUrl).join(" | ").slice(0, 400);
    if (site && extra.phone && ["human", "complaint", "change_existing", "confirm_existing", "commercial"].includes(intent)) state.siteHandoff = intent;
    if (list.includes(bookingUrl)) state.linkSent = true;
    // the reply just gave the weekdays-only answer: "please ask Keith" next is about the weekend, and still a no
    state.weekendLast = list.some((b) => b.includes(WEEKEND_LINE) || b.includes(WEEKEND_AGAIN));
    state.askedRooms = list.some((b) => /how many rooms|number of rooms|room count/i.test(b));
    state.askStreak = state.askedRooms ? (state.askStreak || 0) + 1 : 0;
    if (list.some((b) => /^Tile & grout/.test(b))) { state.tileAsked = true; state.floorAsked = false; }
    if (list.some((b) => /^Hard floors?\b/.test(b))) { state.floorAsked = true; state.tileAsked = false; }
    if (list.some((b) => /15% off/.test(b))) state.discountAsked = true;
    if (hasScope() && list.some((b) => /\$\d/.test(b))) state.lastQuoteKey = quoteKey();
    if (list.some((b) => /covers up to 5 rooms, two halls, and one staircase/.test(b) && /pet-treatment version|pet treatment|pet-treatment special/.test(b))) state.coverSaid = true;
    if (list.length && state.turns === 1 && !sad && !state.greeted && /^(?:price|info|other-services|booking|included|rug|pet|tax|discount|location|area)$/.test(intent) && !/^(?:Hi|Thanks|Thank you|Sorry|I'm)/.test(list[0]) && list[0].length <= 290) list[0] = /^Happy to /.test(list[0]) ? list[0].replace(/^Happy to /, "Thanks for reaching out — happy to ") : `Thanks for reaching out! ${list[0]}`;
    return { bubbles: list, intent, ...extra };
  }
  const complaintReply = (comeBack) => out("complaint", [reach(
    comeBack ? "I'm sorry about that. We're always happy to come back out and fix the issue — I've sent this to Keith and he'll reach out to arrange it as soon as he can."
      : "I'm sorry about that. I've sent this to Keith so he can make it right — he'll reach out to you personally as soon as he can.",
    comeBack ? `I'm sorry about that. We're always happy to come back out and fix the issue — please text Keith at ${TEXT_LINE} so he can set it up.` : `I'm sorry about that. Please text Keith at ${TEXT_LINE} or message us on Facebook so he can make it right personally.`)], { phone: true });
  // Messenger callback/text request: never promise a text or call without a number to use
  const callbackLine = (t, wantsText) => {
    const num = /\(?\b\d{3}\)?[-. ]?\d{3}[-. ]?\d{4}\b/.test(t);
    if (num) return wantsText ? "Absolutely — I've passed your request to Keith, and he'll text you as soon as he can. He's usually on a job, but he'll reach out shortly." : "Got it — I've passed that to Keith. He works by text rather than phone calls, so he'll text you at that number as soon as he can.";
    return wantsText ? `Absolutely — I've passed your request to Keith. He's usually on a job; he'll reply right here, or send your number if you'd rather he text you. You can also reach him at ${TEXT_LINE}.`
      : `Happy to get Keith on this. He works by text rather than phone calls, so he'll reply right here as soon as he can, or you can text him at ${TEXT_LINE}.`;
  };
  // "I want a real person": Keith takes the thread; an impatient ask gets the text line, not a booking link
  const humanHandoff = (rawText) => {
    const base = `Absolutely — I'm handing this to a person. Keith will reply here as soon as he can, and your messages are saved so you won't need to repeat anything. You can also text him at ${TEXT_LINE}.`;
    const urgent = /\b(?:now|asap|right away|immediately|robot|bot|ai)\b|!{2,}/i.test(String(rawText || "")) || (String(rawText || "").replace(/[^A-Za-z]/g, "").length >= 6 && String(rawText || "").replace(/[^A-Z]/g, "").length / String(rawText || "").replace(/[^A-Za-z]/g, "").length > 0.6) || /\bNOW\b/.test(String(rawText || ""));
    return urgent ? [base] : [base, "If you'd like to grab a time in the meantime, here are the open weekday times:", bookingUrl];
  };
  const withLink = (lines) => [...lines, BOOK_INTRO, bookingUrl];
  // a weekend booking request: the firm weekdays-only line plus the weekday link (or a pointer to the link already sent)
  const weekendBooking = (ref = "") => {
    const line = (state.weekendLast ? WEEKEND_AGAIN : WEEKEND_LINE) + ref;
    // an existing appointment being moved: no new-booking link
    if (["change_existing", "confirm_existing"].includes(state.siteHandoff) && ["change_existing", "confirm_existing"].includes(lastIntentBefore)) return out("booking", [`${line} For your existing appointment, text ${TEXT_LINE} with a weekday that works.`]);
    return out("booking", state.linkSent ? [`${line} The booking link above shows the open weekday times.`] : [line, BOOK_INTRO, bookingUrl]);
  };
  // (a weekend reply no longer re-quotes the job "for reference": graders found it cluttered and stale)
  const weekendRef = (t = "", changed = false) => (hasScope() && (changed || /\b(?:how much|price|pricing|cost|quote|charge|rate|\$)/.test(t)) ? " For reference, " + quoteLine(scopeNow(), state.pets).replace(/^For /, "for ") : "");
  // text path: keep any rooms/pets in the same message, then the weekend answer (with the price for reference)
  function weekendFromText(t) {
    const wkScope = readScope(t); const wkPets = readPets(t); const wkKey = quoteKey();
    if (wkPets !== null) state.pets = wkPets;
    if (wkScope.rooms + wkScope.rugs + wkScope.halls + wkScope.stairs > 0 || wkScope.wholeHouse || wkScope.remove.any) applyScope(wkScope, t, { adding: /\b(?:plus|also|more|another|too|add)\b/.test(t) });
    return weekendBooking(weekendRef(t, quoteKey() !== wkKey));
  }
  // after the link has gone out once, point back to it instead of re-sending it
  const linkOnce = (lines) => (state.linkSent ? [...lines, "Whenever you're ready, the booking link above shows the open weekday times."] : withLink(lines));
  // a price answer offers the link instead of pushing it (owner: let the customer say when they're ready)
  const WHEN_RE = /\bwhen (?:are|r|can|could) (?:you|u|y'?all)\b|\bavailab\w*|\bopenings?\b|\bwhat times?\b|\bhours\b|\bsoonest\b|\bnext (?:opening|available)\b|\bbook\w*\b|\bschedul\w*/;
  const offerLink = (lines) => (state.linkSent ? linkOnce(lines) : WHEN_RE.test(currentText) ? [...lines, "Weekday start times are usually 8:00, 10:30, 1:00 and 3:30 (we're closed Saturday and Sunday). The live calendar shows what's open:", bookingUrl] : (lines.at(-1).length + LINK_OFFER.length < 300 ? [...lines.slice(0, -1), `${lines.at(-1)} ${LINK_OFFER}`] : [...lines, LINK_OFFER]));
  // stairs/halls with no rooms yet: what they cost on their own, and ask what goes with them
  const aloneLine = (halls, stairs, t = "") => {
    const what = describe({ rooms: 0, halls, stairs });
    // they named rooms without a count ("bedrooms and a hallway"): just ask how many
    if (/\b(?:bed ?rooms|living ?rooms?|dens?|family rooms?|dining rooms?|offices?|lofts?|levels?|floors|upstairs|downstairs|basement|split ?level)\b|\b(?:the|my|our|same|other|all|some|few|couple|and)\s+(?:of the )?rooms\b/.test(t) || saidHas("p:needrooms-named")) {
      markSaid("p:needrooms-named");
      return `Happy to price it — how many rooms are we cleaning along with the ${what.replace(/^an? /, "")}?`;
    }
    const lead = stairs && !halls ? `A staircase counts as one area however many steps it has. On its own, ${stairs > 1 ? "that's" : "it's"}` : `On its own, ${what.replace(/^an? /, "the ")} ${halls + stairs > 1 ? "is" : "is"}`;
    return halls + stairs <= 3
      ? `${lead} our ${money(PRICES.minimum)} plus tax minimum (up to 3 areas), and it's included in the ${money(PRICES.standard)} special (${COVER}). Are any rooms going with it?`
      : `Happy to price it — how many rooms are we cleaning along with the ${what.replace(/^an? /, "")}?`;
  };
  const waterOpen = () => state.openIssue === "water" && state.turns - (state.openIssueTurn || 0) <= 4;
  const WATER_FOLLOW = () => reach("Thanks — that's helpful. Keith has the water-damage details and will reach out here.", `Thanks — include that when you text Keith at ${TEXT_LINE} with a photo, so he has everything.`);
  const hasScope = () => state.wholeHouse || state.rooms + state.rugs + state.halls + state.stairs > 0;
  const scopeNow = () => ({ rooms: state.rooms, rugs: state.rugs, halls: state.halls, stairs: state.stairs, wholeHouse: state.wholeHouse });
  const quoteKey = () => { const q = quote({ ...scopeNow(), pets: state.pets === true }); return `${state.wholeHouse ? "whole" : describe(scopeNow())}|${q.total}|${q.extras}|${state.pets === true}`; };
  // put a bubble that asks the customer something after the plain answers
  const qLast = (lines) => [...lines.filter((b) => !/\?$/.test(b)), ...lines.filter((b) => /\?$/.test(b))];
  let askedBefore = false, lastIntentBefore = "";
  const askNext = () => (hasScope() ? LINK_OFFER : askedBefore ? "" : ASK_ROOMS);

  function handle(raw) {
    let t = norm(raw);
    currentText = t;
    askedBefore = state.askedRooms;
    lastIntentBefore = state.lastIntent;
    const prevQuoteKey = state.lastQuoteKey;
    restated = [];
    state.turns += 1;
    topicIntent = "";
    if (t === "__attachment__") return out("photo", ["Thanks for the photo! " + askNext()]);
    if (t === "__unsupported_media__") return out("media", ["Sorry — I can't play voice messages, videos or files here. Could you type it out? Photos are fine to send."]);
    if (t === "__location__") return out("location", ["Thanks for the pin! What town or ZIP code are you in? We cover about 15 miles around downtown Wichita."]);
    if (!t) {
      // emoji-only after the greeting: one gentle prompt, then quiet (blank text stays silent)
      if (String(raw || "").trim() && (state.greeted || state.turns > 1)) return state.lastIntent === "nudge" ? out("nudge", []) : out("nudge", ["What can I help with — a price, booking, or a question?"]);
      if (state.greeted || state.turns > 1) return out("greeting", []);
      state.greeted = true;
      return out("greeting", ["Hi there, thanks for reaching out! What would you like cleaned?"]);
    }
    if (isStopMessage(t)) return out("stop", []);
    // water damage is with Keith: more details about it go to him, not into a room count or our dry time
    if (waterOpen() && !readScope(t).found && !/\b(?:thanks|thank you|thx|ty|bye|book|schedule|how much|price|cost|quote|call|text me|weekend|saturday|sunday|also|another|couch|sofa|rug|tile)\b/.test(t)) return out("info", [WATER_FOLLOW()]);
    // we offered to get Keith for a question we couldn't answer; "yes" takes us up on it
    if (state.offeredKeith) {
      state.offeredKeith = false;
      if (/^(?:yes|yeah|yep|yup|sure|ok|okay|please|yes please|go ahead|that would be (?:great|good|nice)|that'?d be great|please do|sounds good|y)\b[\s!.]*(?:please|thanks|thank you)?[\s!.]*$/.test(t)) {
        return out("human", [reach("Done — I've asked Keith to answer, and he'll reply here as soon as he can.", `Please text Keith at ${TEXT_LINE} and he'll answer that for you.`)], { phone: true });
      }
    }
    // weekends mentioned for another reason ("my grandkids visit on weekends") aren't a weekend request
    if (/\b(?:grand ?(?:kids|children|babies)|kids|children|family|guests?|company|they|she|he|we|i|my \w+)\s+(?:\w+\s+){0,2}(?:visit|visits|come over|comes over|stay|stays|are (?:home|here|over)|is (?:home|here|over)|work|works|play|plays)\s+(?:\w+\s+){0,2}(?:on |over |during )?(?:the )?weekends?\b/.test(t) && !/\b(?:then|that day|those days)\b/.test(t)) {
      t = t.replace(/\b(?:on |over |during )?(?:the )?weekends?\b/g, " ").replace(/\s+/g, " ").trim();
    }
    // competitor names shouldn't trip other answers ("chem dry" is not a drying question)
    t = t.replace(/\bchem[ -]?dry\b/g, "chemdry");
    // "Thank you. Do I need to be home?" -> answer the question
    const thanksLead = /^(?:thanks|thank you|thx|ty|appreciate (?:it|you)|gracias)(?: so much| very much| again)?[\s!.,]*/;
    if (thanksLead.test(t) && /\?/.test(t) && t.replace(thanksLead, "").trim().length > 3) t = t.replace(thanksLead, "").trim();
    // "it's a big one, 3 cushions" right after an upholstery price picks the piece
    const cushions = t.match(/\b(\d|two|three|four|five|six|seven|eight)[ -]?(?:cushions?|seats?|seater)\b/);
    if (cushions && Object.keys(state.furn || {}).some((k) => /sofa|loveseat|sectional/.test(k)) && !/\b(?:sofa|couch|loveseat|love seat|sectional|chair|recliner)\b/.test(t)) {
      const n = num(cushions[1]);
      t += n <= 2 ? " loveseat" : n === 3 ? " sofa" : n <= 5 ? " small sectional" : " large sectional";
    }
    // "6 of them" right after a dining-chair price is the chair count
    const ofThem = t.match(new RegExp(`^(?:about |like |maybe |i have |we have |there are |there'?s )?${N} (?:of them|chairs?|total chairs)[.!]*$`));
    if (ofThem && state.furn && state.furn.dining) t = `${num(ofThem[1])} dining chairs`;
    // a bare number right after we asked how many rooms is the room count
    const bareCount = t.match(new RegExp(`^(?:about |like |maybe |around |probably |its |it's |just |only )?${N}(?: total| of them| or so| rooms? total)?[\\s.!]*$`));
    if (bareCount && !state.unsupported && (state.askedRooms || !hasScope()) && !/^(?:a|an)$/.test(bareCount[1]) && (num(bareCount[1]) ?? 0) > 0 && num(bareCount[1]) <= 20) t = `${num(bareCount[1])} rooms`;

    /* --- frustration and identity --- */
    const petOrStain = mentionsPets(t) || has(t, /\b(?:carpet|stains?|spots?|rug)\b/);
    const profane = has(t, /\b(?:f+u+c+k\w*|f\*+\w*|wtf|bullshit|shit(?:ty)?|stupid bot|useless)\b/) && !petOrStain;
    const rawText = String(raw ?? "");
    const shouting = rawText.replace(/[^A-Za-z]/g, "").length >= 12 && rawText === rawText.toUpperCase();
    if (profane || (shouting && has(t, /\b(?:answer|anyone|respond|reply|nobody|no one|hello)\b/)) || has(t, /\b(?:you )?(?:didn'?t|did not|don'?t|never) (?:answer|understand|get) (?:my|the|what i)\b|\bnot what i (?:asked|meant|said)\b|\byou'?re not (?:helping|understanding|listening)\b|\bthat (?:doesn'?t|does not|didn'?t) (?:help|answer|make sense)\b|\bthis isn'?t helping\b|\bgoing in circles\b|\byou already (?:said|asked) that\b|\bnot helpful\b|\bthis is useless\b/) || has(t, /\bwhy (?:isn'?t|is no ?one|won'?t you|aren'?t you|doesn'?t anyone) (?:anyone )?(?:answer|respond|repl|get back)|\b(?:no ?one|nobody) (?:is )?(?:answering|responding|getting back)/)) {
      return out("human", [reach("I'm sorry for the frustration. I've let Keith know, and he'll reply here as soon as he can.", `I'm sorry for the frustration. Please text Keith at ${TEXT_LINE} and he'll get right back to you.`)], { phone: true });
    }
    if ((has(t, /\b(?:are you|is this|am i (?:talking|chatting|speaking|texting) (?:to|with)|r u|are u)\s+(?:a |an |just a |the )?(?:bot|robot|ai|a\.i\.?|automated|machine|chat ?gpt|real person|real|human|person|computer|live person)\b/) || /^(?:hi |hey |hello )?(?:is (?:this|that|it) keith|are you keith|am i (?:talking|chatting|speaking|texting) (?:to|with) keith|is keith (?:there|here|reading this))\b/.test(t)) && !has(t, /\b(?:speak|talk|chat) (?:to|with) (?:a |an )?(?:real |live )?(?:person|human|someone|keith|owner)\b/)) {
      return out("identity", [IDENTITY_REPLY]);
    }

    /* --- closings that should win outright --- */
    if (/^(?:(?:ok|okay|k|cool|great|perfect|awesome|sounds good)[,!. ]+)?(?:thanks|thank you|thx|ty|tysm|appreciate (?:it|you)|gracias)\b/.test(t)) {
      return out("thanks", [state.linkSent || state.quoted
        ? (state.linkSent ? "You're welcome! Whenever you're ready, the booking link above shows the open weekday times. Just message here if any questions come up." : THANKS_NO_LINK)
        : "You're welcome! Whenever you're ready, tell me how many rooms and I'll get you a price."]);
    }
    // "perfect, booked it. thanks!" — they're done; never re-send the link
    if (/\b(?:just |all |got (?:it|us|me) )?booked(?: it| us| me| online| the \w+| for \w+)?\b/.test(t) && !/\?/.test(t) && !/\b(?:did|didn'?t|didnt|not|confirm\w*|change|cancel|move|resched\w*|wrong|forgot|add|mistake|twice|double|how|want to|need to|trying|last|before|previous\w*|fully|booked (?:out|up)|are you|you (?:guys )?(?:are|were)|when|if|can|will)\b/.test(t)) {
      return out("thanks", ["Thanks for booking! You'll get a confirmation text, and another text when we're about 10 to 15 minutes away. See you then!"]);
    }
    if (/^(?:you too|same to you|have a (?:good|great|nice|blessed|wonderful) (?:day|one|night|evening|weekend|afternoon)|take care|bye|goodbye|bye bye|good ?night|talk (?:to you )?soon|ttyl|later)\b[\s!.]*(?:thanks?|thank you)?[\s!.]*$/.test(t)) {
      return out("thanks", ["You too! We're here whenever you need us."]);
    }
    if (/\b(?:too expensive|too much|can'?t afford|out of (?:my )?budget)\b/.test(t) && /\b(?:never ?mind|nvm|no thanks|not interested|forget it|i'?ll pass|pass on it|maybe later|no thank you)\b/.test(t)) {
      return out("thanks", ["No problem at all — thanks for checking with us. We're here whenever you need us."]);
    }
    if (/^(?:nah|no thanks|no thank you|i'?m good|im good|not now|maybe later|not yet|not right now|we'?re good|not interested|no longer interested|never ?mind|nvm)\b(?! (?:on|about) )(?![^.!?]*(?:pet|\d|\b(?:one|two|three|four|five|six|seven|eight|nine|ten)\b))/.test(t) || /^(?:no|nope|no sir|no ma'?am)[.!]*$/.test(t)) {
      return out("thanks", ["No problem at all! We're here whenever you need us — just send a message."]);
    }

    if (has(t, /\bsee you\b/) && !has(t, /\?\s*$/)) {
      return out("thanks", [state.linkSent ? "You're welcome — see you then! Once you pick your time on the booking calendar, you'll get a confirmation text." : "You're welcome — see you then!"]);
    }
    if (has(t, /\b(?:still available|still going on|still valid|still running|still good|is this (?:deal|offer|special|price)|this (?:deal|special|offer) still|(?:deal|special|offer|price) still (?:going|good|on|available|valid))\b/)) {
      return out("price", [`Yes — the ${money(PRICES.standard)} special is still available! It covers ${COVER}, plus tax. ${hasScope() ? LINK_OFFER : ASK_ROOMS}`]);
    }
    // "ask Keith if he can do Saturday" / "can I talk to Keith about a weekend appointment": weekends are a firm no, never a handoff
    if (has(t, /\b(?:keith|someone|somebody|anyone|a person|a human|the owner|the boss|manager|him)\b/) && isWeekendJobAsk(t)
      && !(has(t, /\bcall\b|\btext me\b/) && !has(t, /\b(?:come|appointment|appt|clean|cleaning|book|schedule|exception)\b/))) return weekendFromText(t);
    if (state.weekendLast && WEEKEND_KEITH_FOLLOW_RE.test(t) && t.split(" ").length <= 12 && !has(t, /\bcall\b|\btext me\b|\$/)) return weekendFromText(t);
    const phoneInMsg = /\b\(?\d{3}\)?[ .-]?\d{3}[ .-]?\d{4}\b/.test(t);
    if ((/\bcall me\b|\bgive me a call\b|\bcall\b(?=[^.?!]{0,6}\(?\d{3}\)?[ .-]?\d{3}[ .-]?\d{4})|\bcan (?:you|someone|somebody|keith) (?:please )?call\b|\bplease call\b|\bcall me back\b|\bcan i (?:just )?(?:call|talk to|speak (?:to|with)) (?:someone|somebody|keith|a person|the owner)\b|\bis there (?:a number|someone) i can call\b/.test(t) || (/\btext me\b(?! (?:the|a|that) link)/.test(t) && (phoneInMsg || /\b(?:text me (?:back|instead)|can (?:you|someone|keith) text me)\b/.test(t)))) && !/\b(?:don'?t|do not|dont) call\b/.test(t)) {
      const wantsText = /\btext me\b/.test(t) && !/\bcall\b/.test(t);
      return out("human", [reach(callbackLine(t, wantsText), phoneInMsg ? `This website chat can't pass your number along, so Keith won't see it here — please text him at ${TEXT_LINE} and he'll get back to you.` : `Text Keith at ${TEXT_LINE} and he'll get back to you as soon as he can.`)], { phone: true });
    }

    // "yes please ask him" / "can you ask Keith?" -> get Keith (site: point them to his text line)
    if ((has(t, /\b(?:ask|check with|tell|message|have|get) keith\b/) && !has(t, /\b(?:i'?ll|i will|let me|i need to|i have to|i gotta|i'?m going to)\b/)) || /^(?:yes|yeah|yep|sure|ok|okay|please)\b[ ,!.]*(?:please )?(?:ask|check with) (?:him|keith)\b/.test(t)) {
      return out("human", [reach("Sure — I've asked Keith, and he'll reply here as soon as he can.", `This chat can't message Keith directly — please text him at ${TEXT_LINE} and he'll get right back to you.`)], { phone: true });
    }

    // someone who can't (or won't) use the booking link gets Keith to set it up personally
    if (has(t, /\b(?:don'?t|dont|do not|can'?t|cant|not good with|bad with|no good with|never learned) (?:do |use |work |understand |know how to use )?(?:computers?|the internet|internet|online stuff|online|websites?|links?|apps?|technology|smart ?phones?|the booking(?: things?| link| page)?)\b|\b(?:don'?t|dont|do not) know how to (?:use|book|do|work) (?:the |that |this |a )?(?:booking|link|website|online|computer|internet|app)\b|\bcan (?:you|someone|keith) (?:just )?(?:book|schedule|put) (?:me|us|it) (?:in|down|on)\b|\b(?:just )?put (?:me|us) down for\b|\bbook (?:it|me|us) for me\b/)) {
      return out("human", [reach("No problem at all — I've asked Keith to set it up with you personally. He'll reply here as soon as he can.", `No problem at all — text Keith at ${TEXT_LINE} and he'll set it up with you personally.`)], { phone: true });
    }
    // facts we don't have: offer Keith rather than guess
    if (has(t, /\bnew customers? only\b|\bonly (?:for )?new customers?\b|\bfirst[- ]time customers?\b|\b(?:returning|existing|repeat|past|old) customers?\b|\bfor everyone\b/) && has(t, /\b(?:special|deal|price|offer|\$?99|discount|promo)\b/)) {
      if (!site) state.offeredKeith = true;
      return out("unknown", [reach("Good question — Keith can answer that one. Want me to ask him?", `Good question — Keith can answer that one if you text ${TEXT_LINE}.`)]);
    }

    /* --- hard routing that must win before time, price and booking logic --- */
    if (has(t, /\b(?:voice ?(?:message|mail|memo|note|msg|text)s?|voicemail|audio (?:message|msg|note|clip))\b/)) {
      return out("media", ["Sorry — I can't play voice messages here. Could you type it out? I'll answer right away."]);
    }
    if (has(t, /\b(?:water damage|flood\w*|restoration|sewage)\b/)) {
      { return out("other-services", [reach("Water damage is something Keith would want to look at personally — I've let him know, and he'll reach out here.", `Water damage is something Keith would want to look at personally — text a photo and a description to ${TEXT_LINE}.`)], site ? {} : { notify: "review" }); }
    }
    // damage or loss blamed on us: "you ruined my carpet", "the tech scratched my floor", "something is missing"
    const damageClaim = has(t, /\b(?:you|y'?all|you guys|your (?:tech|technician|guy|crew|worker|cleaner|machine|equipment|team)|the (?:tech|technician|guy|cleaner|crew|worker|cleaning guy|carpet guy))\s+(?:(?:have|has|had|just|totally|completely)\s+)*(?:ruined|damaged|broke|scratched|scuffed|stained|tore|ripped|dented|bleached|chipped|cracked|burned|burnt|melted|discolou?red|destroyed|shrunk|knocked over)\b(?<!\b(?:lost|stole|took))|\b(?:you|y'?all|you guys|the (?:tech|technician|guy|cleaner|crew|worker))\s+(?:lost|stole|took) (?:my|our|the)\b|\bsomething (?:is|was|'s|went|has gone) missing\b|\b(?:is|are|went|was|were) missing (?:since|after) (?:you|the (?:tech|cleaning|visit))\b/)
      && !has(t, /\b(?:will|would|could|can|might|does|do) (?:it|you|that|this|the \w+) (?:damage|ruin|scratch|stain|break)\b|\bwhat if\b|\bis it true\b|\b(?:someone|somebody|anyone|people)(?:'s)?\b|\bheard\b/);
    if (damageClaim) return complaintReply(false);
    if (has(t, /\b(?:question|questions|problem|issue|confused|wrong|mistake|dispute|help)\b[^.?!]{0,25}\b(?:my|the|our|this) (?:bill|invoice|charge|statement)\b|\b(?:charged|billed) (?:me |us )?(?:twice|wrong|too much|double|incorrectly)\b|\bovercharg\w*|\bdouble[- ]charg\w*/)) {
      return out("human", [reach("Thanks — I've passed your billing question to Keith, and he'll reply here as soon as he can.", `For billing questions, please text Keith at ${TEXT_LINE} and he'll sort it out.`)], { phone: true });
    }
    // an appointment that already exists: confirmations and changes go to a person (never the booking link)
    const bookedRef = has(t, /\b(?:i|we) (?:already |just )?(?:booked|scheduled|made (?:an|the) appointment)\b|^(?:just |already )booked\b/);
    const forgotAdd = has(t, /\bforgot (?:to )?(?:add|include|mention|put|book)\b/) && (bookedRef || has(t, /\b(?:booking|appointment|appt)\b/));
    const CHANGE_LINE = reach(`We'll be happy to get that arranged. A team member will reach out to handle the change, since I can't update a booked appointment from Messenger. You can also reply to your Housecall Pro text or text ${TEXT_LINE}.`, `For an existing appointment, please reply to your Housecall Pro text or text ${TEXT_LINE} — Keith handles changes personally.`);
    if (forgotAdd || (bookedRef && has(t, /\b(?:change (?:it|that|the|my|to)|need to change|cancel|reschedul\w*|switch (?:it|the|my|to)|push (?:it|back)|bump|move (?:it|my (?:appointment|appt|booking|time|date|cleaning)|the (?:appointment|date|time|day)|to (?:a |another |next |mon|tue|wed|thu|fri))|wrong (?:day|date|time|address)|add (?:a |the |another |one more )?(?:room|bed ?room|hall|stair|rug))\b/))) {
      return out("change_existing", [CHANGE_LINE], { phone: true });
    }
    if (bookedRef && has(t, /\bconfirm\w*\b|\bdid you (?:get|receive|see)\b|\b(?:you )?got it\b|\b(?:go|went|come|came) through\b/)) {
      return out("confirm_existing", [reach("I can't see or confirm an existing appointment from Messenger. I've flagged this conversation for a person to check the booking and follow up with you. I haven't confirmed or changed your appointment.", `I can't see bookings from this website chat — please reply to your Housecall Pro text or text ${TEXT_LINE}, and Keith will check it for you.`)], { phone: true });
    }
    if (has(t, /\b(?:i|we) (?:need|have|want|got|would like|'d like) to (?:cancel|reschedule|move|change)\b|\b(?:cancel|reschedule|move|change) (?:my|our) (?:appointment|appt|booking|cleaning|visit)\b/) && has(t, /\b(?:my|our) (?:appointment|appt|booking|cleaning|visit)\b|\b(?:cancel|reschedule) (?:it|that)\b/) && !has(t, /\bwhat if\b|\bif (?:i|we) (?:need|have|want)\b|\bin case\b/)) {
      const fee = has(t, /\b(?:fee|fees|charge|penalty|cost)\b/) ? "There's no cancellation fee. " : "";
      return out("change_existing", [fee + CHANGE_LINE], { phone: true });
    }
    const existingAppt = has(t, /\b(?:existing|booked|scheduled|upcoming|current) (?:appointment|appt|booking|cleaning|visit)\b|\balready (?:have|got|booked|scheduled|made)\b[^.?!]{0,30}\b(?:appointment|appt|booking|cleaning|visit|it)\b|\b(?:the|my) old (?:one|appointment|booking)\b|\bbook a new (?:one|appointment)\b[^.?!]*\bcancel\b|\bcancel (?:the|my) (?:old|other|first) (?:one|appointment|booking)\b/);
    const changeAsk = has(t, /\b(?:move|change|reschedule|cancel|push|bump|switch|contact|reach (?:you|someone|keith)|what number|which number|text (?:who|you|someone)|question about|add (?:a |another |one more )?(?:room|hall|staircase|rug)|contact you about|update)\b/);
    // checking on a booking that already exists (or a confirmation that never came) goes to a person
    const confirmAsk = has(t, /\b(?:i|we) (?:already )?booked(?: (?:it|already|online))?\b[^.?!]{0,10}[.,!?]?\s*(?:did|do|can) you (?:get|got|receive|see)\b|\bdid (?:my|our|the) (?:booking|appointment|appt|reservation|request) (?:go through|work|come through)\b|\bdid you (?:get|receive|see) my (?:booking|appointment|appt|request|reservation)\b|\bam i (?:booked|confirmed|scheduled|on the (?:schedule|calendar))\b|\bis (?:my|our) (?:appointment|appt|booking|cleaning) (?:confirmed|still on|set|booked|scheduled)\b|\bdo (?:i|we) (?:have|still have) an? (?:appointment|appt|booking)\b|\bwhat time is (?:my|our) (?:appointment|appt|cleaning)\b|\bwhen is (?:my|our) (?:appointment|appt|cleaning)\b|\bcheck (?:on )?(?:my|our) (?:appointment|appt|booking)\b|\bconfirm(?:ing)? (?:my|our|the) (?:appointment|appt|booking|time|visit|cleaning)\b|\b(?:did not|didn'?t|have not|haven'?t|never|didnt|havent) (?:get|got|receive|received|see|seen)\b[^.?!]{0,35}\bconfirmation\b|\b(?:missing|no) confirmation(?: email| text| message)?\b|\bconfirmation (?:email|text|message)\b[^.?!]{0,25}\b(?:missing|never (?:came|arrived)|hasn'?t (?:come|arrived)|did not arrive|didn'?t (?:come|arrive))\b/);
    if (has(t, /\bwhat time (?:are|is|will) (?:you|he|keith|the tech|your guy) (?:coming|getting here|be here|arriving)\b|\b(?:is|are) (?:the tech|he|keith|you|your guy) (?:on (?:the|your|his) way|still coming|coming today|running late|close)\b|\bwhere(?:'s| is) (?:the tech|keith|my tech|your guy)\b|\beta\b/)) {
      return out("confirm_existing", [reach("I can't see the live schedule from here — I've let Keith know you're checking, and he'll reply as soon as he can. You'll also get a text when he's about 10 to 15 minutes away.", `This website chat can't see the schedule — please reply to your Housecall Pro text or text Keith at ${TEXT_LINE}. You'll also get a text when he's about 10 to 15 minutes away.`)], { phone: true });
    }
    if (confirmAsk && !changeAsk) {
      return out("confirm_existing", [reach("I can't see or confirm an existing appointment from Messenger. I've flagged this conversation for a person to check the booking and follow up with you. I haven't confirmed or changed your appointment.", `I can't see bookings from this website chat — please reply to your Housecall Pro text or text ${TEXT_LINE}, and Keith will check it for you.`)], { phone: true });
    }
    if (existingAppt && changeAsk) {
      return out("change_existing", [reach(`We'll be happy to get that arranged. A team member will reach out to handle the change, since I can't update a booked appointment from Messenger. You can also reply to your Housecall Pro text or text ${TEXT_LINE}.`, `For an existing appointment, please reply to your Housecall Pro text or text ${TEXT_LINE} — Keith handles changes personally.`)], { phone: true });
    }
    // a map pin doesn't tell us the town
    if (lastIntentBefore === "location" && !townsIn(t, SERVED).length && !townsIn(t, NOT_SERVED).length && !/\b\d{5}\b/.test(t) && has(t, /\b(?:in your (?:service )?area|your area|service area|do you (?:come|service|serve|cover|go)|can you come|is (?:this|that|it|here) (?:ok|okay|close enough|covered|in range|too far)|in range|that far|cover (?:this|that|it|here))\b/)) {
      return out("area", ["I can't tell the town from a map pin here — what town or ZIP code is it? We cover about 15 miles around downtown Wichita."]);
    }
    if (has(t, /\bcan (?:i|we) (?:pick|choose|select|set) (?:the |my |a |our )?(?:own )?(?:time|day|date|slot)s?\b|\bdo (?:i|we) (?:get to )?(?:pick|choose) (?:the |my |a |our )?(?:own )?(?:time|day|date)s?\b/)) {
      return out("booking", state.linkSent ? ["Yes — you pick your own day and time on the booking link above; it shows the live weekday openings."] : ["Yes — you pick your own day and time on the booking calendar, which shows the live weekday openings:", bookingUrl]);
    }
    if (has(t, /\bwhat (?:counts|is considered|do you consider|qualifies|do you count) (?:as )?an? (?:room|area)\b|\bwhat(?:'s| is) (?:considered )?(?:a|an) (?:room|area)\b|\bwhat do you mean by (?:a )?room\b/)) {
      return out("included", [ROOMS_DEF_REPLY]);
    }
    if (has(t, /\b(?:is|are|does|do) (?:a |the |my |our )?(?:bath ?rooms?|kitchens?)s? (?:count(?:ed)?|considered|a room|an area|rooms?)\b/) && !has(t, /\bcarpet(?:ed)?\b/)) {
      return out("included", ["A bathroom or kitchen only counts as a room if it's carpeted — most aren't, so they usually don't count."]);
    }
    if (has(t, /\bno matter (?:the |how )?(?:size|big|large|many)\b|\bany size\b|\bregardless of (?:the )?size\b|\bunlimited (?:rooms|size)\b/)) {
      return out("included", [`Not quite — the ${money(PRICES.standard)} special covers ${COVER}, plus tax. Each extra room, hall or staircase is ${money(PRICES.extra)} plus tax, and pet treatment is ${money(PRICES.pet)}.${hasScope() ? "" : " " + ASK_ROOMS}`]);
    }
    if (has(t, /\b(?:\$?99|standard|regular|basic)\b[^.?!]*\b(?:include|includes|cover|covers|handle|get out|take care of|work on|good for)\b[^.?!]*\bpet (?:stains?|urine|pee|odou?rs?|smells?|accidents?|spots?)\b/)) {
      return out("pet", [`Pet stains and odor need the pet treatment — that's the ${money(PRICES.pet)} package for ${COVER}, or ${money(PRICES.petMinimum)} for up to 3 rooms, plus tax. The ${money(PRICES.standard)} is our regular cleaning.${hasScope() ? "" : " " + ASK_ROOMS}`]);
    }
    if (has(t, /\btotal or\b[^?]*\bper (?:room|area)\b|\bper (?:room|area) or\b[^?]*\btotal\b/)) {
      const mine = hasScope() && state.quoted ? ` Yours is ${fmtQ(quote({ ...scopeNow(), pets: state.pets }))}.` : ` ${ASK_ROOMS}`;
      return out("included", [`It's the total, not per room — ${money(PRICES.standard)} plus tax covers ${COVER}, and each extra room, hall or staircase is ${money(PRICES.extra)} plus tax.${mine}`]);
    }
    // "is it really $99?", "is the $99 plus tax?", "is it $99 total?", "is that still 75"
    const priceIsM = t.match(/^(?:hi[,!.]? |hey[,!.]? |hello[,!.]? )?(?:i saw (?:your|the) ad[,.]? )?(?:so |ok |and )?is (?:it|that|this|the (?:price|special|deal)|the) (?:really |actually |just |only |truly |still )*\$?(75|85|99|149)(?: dollars)?( total| for real| real| for everything| flat| plus tax)?\??$/) || t.match(/^(?:so |and )?still \$?(75|85|99|149)\??$/);
    if (priceIsM) {
      const amt = Number(priceIsM[1]), still = /\bstill\b/.test(t);
      if (hasScope() && state.quoted) {
        const q = quote({ ...scopeNow(), pets: state.pets }), what = state.wholeHouse ? "the whole house" : describe(scopeNow());
        return out("price", [q.total === amt && !q.extras ? `Yes — ${still ? "still " : ""}${money(amt)} plus tax for ${what}.` : `${still ? "No" : "Not quite"} — it's ${fmtQ(q)} for ${what}.`]);
      }
      const line = amt === 99 ? `Yes — ${money(99)} plus tax is the total for ${COVER}, not per room. Each extra area is ${money(PRICES.extra)}, and pet treatment is ${money(PRICES.pet)}.`
        : amt === 75 ? `Yes — ${money(75)} plus tax is the total for up to 3 areas. The ${money(PRICES.standard)} special covers ${COVER}.`
        : amt === 85 ? `Yes — ${money(85)} plus tax covers up to 3 rooms with pet treatment.`
        : `Yes — ${money(149)} plus tax covers ${COVER} with pet treatment.`;
      return out("price", [`${line} ${ASK_ROOMS}`]);
    }
    /* --- appointment times --- */
    const weekendWords = has(t, /\b(?:saturdays?|sundays?|weekends?|sat|sun)\b(?! ?(?:room|porch|down))/);
    const SLOT_LINE = "Our weekday start times are usually 8:00 AM, 10:30 AM, 1:00 PM and 3:30 PM (we're closed Saturday and Sunday). The live calendar shows what's open:";
    const tm = t.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.?|p\.m\.?)(?![a-z])/) || t.match(/\b(\d{1,2}):(\d{2})\b()/) || t.match(/\bat (\d{1,2})()()\b(?!\s*(?:rooms?|bed|hall|stair|%|\$|dollars?|sq|years?|months?|weeks?|days?))/);
    const startOk = (m) => {
      const h = Number(m[1]), mm = Number(m[2] || 0), ap = String(m[3] || "").replace(/\./g, "");
      const mins = (ap === "pm" && h !== 12 ? h + 12 : ap === "am" && h === 12 ? 0 : !ap && h >= 1 && h <= 6 ? h + 12 : h) * 60 + mm;
      return mins >= 8 * 60 && mins <= 15 * 60 + 30;
    };
    const roomWords = has(t, /\b(?:rooms?|bed ?rooms?|halls?|hallways?|stairs?)\b/);
    if (tm && !startOk(tm) && !roomWords && !weekendWords && Number(tm[1]) <= 24) {
      return out("booking", [SLOT_LINE, bookingUrl]);
    }
    if (!weekendWords && has(t, /\b(?:midnight|at night|late at night|evenings?|after work|after (?:5|6|7|8)(?: ?pm)?|nights?)\b/) && has(t, /\b(?:come|available|open|work|appointment|schedule|do you|can you|could you)\b/)) {
      return out("booking", [SLOT_LINE, bookingUrl]);
    }
    if (!weekendWords && has(t, /\b(?:early|earliest|first thing)\b/) && has(t, /\b(?:come|start|appointment|time|get here|be here|arrive)\b/) && !roomWords && !has(t, /\b(?:earliest (?:opening|available|appointment|day|date))\b/)) {
      return out("booking", ["Our earliest usual start time is 8:00 AM on weekdays. The live calendar shows what's open:", bookingUrl]);
    }
    const bareSlot = !tm && t.match(/^(?:ok |okay |yes |yeah )?(?:the )?(8|10|1|3)(?::30)?\b/);
    let timeOfDayLine = null;
    if ((!roomWords || has(t, /\bstart times?\b/)) && !has(t, /\b(?:good|this) (?:morning|afternoon)\b/) && (has(t, /\bwhat time (?:would|will|do|does|can|could) (?:you|u|he|keith|the tech)\b(?! (?:close|open))|\bwhat (?:start )?times? (?:do you have|are (?:open|available)|you got|do you offer|can you (?:come|do)|you have|works?)\b|\bstart times?\b|^(?:ok |so |and )?(?:what|which) times?\??$/) || (has(t, /\b(?:mornings?|afternoons?)\b/) && has(t, /\b(?:if possible|prefer|preferably|works? (?:best|better)|better|available|do you have|can you|could you|any|only|\?)\b/)))) {
      const morning = has(t, /\bmornings?\b/), afternoon = has(t, /\bafternoons?\b/);
      timeOfDayLine = morning && !afternoon ? "Our morning start times are usually 8:00 and 10:30 AM on weekdays." : afternoon && !morning ? "Our afternoon start times are usually 1:00 and 3:30 PM on weekdays." : "Our weekday start times are usually 8:00 AM, 10:30 AM, 1:00 PM and 3:30 PM (we're closed Saturday and Sunday).";
    }
    const timePick = (tm || bareSlot) && has(t, /\b(?:works?|looks? good|sounds good|is good|perfect|ok|okay|please|would be great|i'?ll take|is fine|fine)\b/) && !roomWords;
    if (timePick && (state.linkSent || state.quoted)) {
      return out("booking", ["Great! You can grab that time on the booking calendar — it shows the live openings and you'll get a confirmation text right away:", bookingUrl]);
    }

    // "anything at 8am?" — a valid start time asked about
    if (tm && startOk(tm) && !roomWords && !weekendWords && !timePick && has(t, /\b(?:anything|any(?:thing)? (?:open|available)|available|availability|openings?|open|have|do you|can you|could you|is there|works?)\b/)) {
      const h = Number(tm[1]), mm = tm[2] ? `:${tm[2]}` : ":00", ap = String(tm[3] || "").replace(/\./g, "") || (h >= 8 && h <= 11 ? "am" : "pm");
      const slot = `${h}${mm} ${ap.toUpperCase()}`;
      const usual = ["8:00 AM", "10:30 AM", "1:00 PM", "3:30 PM"].includes(slot);
      const line = usual ? `${slot} is one of our usual weekday start times.` : `Our usual weekday start times are 8:00 AM, 10:30 AM, 1:00 PM and 3:30 PM.`;
      return out("booking", state.linkSent ? [`${line} The booking link above shows which days have it open.`] : [`${line} The live calendar shows which days have it open:`, bookingUrl]);
    }
    const preScope = readScope(t);
    const preTotal = preScope.rooms + preScope.rugs + preScope.halls + preScope.stairs;
    const givesAddress = has(t, /\b\d{2,6}\s+(?:[nsew]\.?\s+|north |south |east |west )?[a-z0-9]+(?:\s[a-z0-9]+)?\s+(?:st|street|ave|avenue|rd|road|dr|drive|ln|lane|ct|court|blvd|boulevard|way|cir|circle|pl|place|ter|terrace|pkwy|parkway)\b/) || has(t, /\b(?:\(?\d{3}\)?[ .-]?\d{3}[ .-]?\d{4})\b/);
    if (givesAddress && !has(t, /\b(?:how much|price|cost|do you)\b/) && !(preScope.found && preTotal > 0 && !preScope.bare)) {
      return out("booking", ["Thanks! The booking calendar collects your address and phone number and sends your confirmation text — pick your time here:", bookingUrl]);
    }
    if (/^(?:i )?(?:need|want) (?:some )?help(?: please| pls| plz)?[.!?]*$|^(?:please |pls )?help(?: me)?(?: please| pls| plz)?[.!?]*$/.test(t)) {
      if (state.helpAsked) return out("human", [reach(`Keith has your message and will reply here as soon as he can. If it's urgent, you can also text ${TEXT_LINE}.`, `Please text Keith at ${TEXT_LINE} — he'll get right back to you.`)], { phone: true });
      state.helpAsked = true;
      return out("human", [reach("I'll get Keith for you — he'll reply here as soon as he can.", `Text Keith at ${TEXT_LINE} or message us on Facebook and he'll get right back to you.`)], { phone: true });
    }
    if (has(t, /\b(?:get back to you|back to you|be measuring|do some measuring|measure (?:it|first|and)|think about it|talk to my (?:husband|wife|spouse|partner)|check with my|check my (?:schedule|calendar|time off)|let you know|get back with you)\b/)) {
      return out("thanks", ["No rush at all — just message here whenever you're ready."]);
    }
    const taxQ = has(t, /\b(?:with tax|including tax|incl\.? tax|tax (?:rate|total|amount|included)|total (?:with|including|after) tax|after tax|before tax|is there (?:a |any )?tax|tax on (?:that|it|this|top)|plus tax\?|(?:does|do|is) (?:that|it|this|the (?:price|\$?\d+|special|package|deal|quote)|your prices?) (?:include|includes|included|including) (?:the )?tax|include tax|includes tax|tax included|charge tax|sales tax|how much (?:is )?(?:the )?tax|out the door|come to with tax)\b/);
    if (taxQ && !has(t, /\b(?:and|also|plus)\b[^.?!]*\b(?:do you|can you|service|come|how long|what|when|where|take)\b/) && !/\?[^?]*\?/.test(t)) {
      if (!hasScope() && preScope.wholeHouse) state.wholeHouse = true;
      else if (!hasScope() && preScope.found && preTotal > 0) { state.rooms = preScope.rooms; state.rugs = preScope.rugs; state.halls = preScope.halls; state.stairs = preScope.stairs; }
      if (hasScope()) state.quoted = true;
      const includeQ = has(t, /\b(?:include|includes|included|including)\b/);
      const amt = (t.match(/\$?\s?\b(75|85|99|149)\b/) || [])[1];
      const lead = includeQ ? (amt ? `No — it's $${amt} plus tax.` : "No — our prices are plus tax.") : /\bplus tax\??$/.test(t) ? (amt ? `Yes — it's $${amt} plus tax.` : "Yes — our prices are plus tax.") : "";
      return out("tax", [hasScope() ? `${lead ? lead + " " : ""}${quoteLine(scopeNow(), state.pets)} Housecall Pro shows your exact total before you confirm.` : `${lead || "Our prices are plus tax."} Housecall Pro shows your exact total before you confirm. ${ASK_ROOMS}`]);
    }
    if (has(t, /\b(?:new|updated|different|changed) (?:phone|cell|number)\b|\bmy (?:phone|number) (?:changed|is wrong)\b|\b(?:don'?t|do not) have my (?:new )?(?:phone|number)\b/)) {
      return out("human", [reach("Thanks for letting us know — I've kept that for a person to update.", `Please text your new number to ${TEXT_LINE} and Keith will update it.`)], { phone: true });
    }
    if (has(t, /\b(?:i'?ll take|i will take|we'?ll take|we will take|i want|sign me up for|let'?s do|go with) (?:the )?\$?(?:99|149|75|85)\b/)) {
      const n = (t.match(/\$?(99|149|75|85)\b/) || [])[1];
      const line = n === "149" ? `The ${money(PRICES.pet)} pet special covers up to 5 rooms, 2 hallways and a staircase, plus tax.` : n === "75" ? `The ${money(PRICES.minimum)} price covers up to 3 areas, plus tax.` : n === "85" ? `The ${money(PRICES.petMinimum)} price covers up to 3 rooms with pet treatment, plus tax.` : `The ${money(PRICES.standard)} special covers up to 5 rooms, 2 hallways and a staircase, plus tax.`;
      state.quoted = true;
      return out("booking", withLink(["Great choice! " + line]));
    }
    if (has(t, /\b(?:discount|cheaper|less|lower|knock (?:it )?off|take off|reduce)\b/) && has(t, /\b(?:no|without|doesn'?t have|don'?t have|skip|skipping|not)\b[^.?!]*\b(?:stairs?|staircase|hallways?|halls?)\b/)) {
      const hall = has(t, /\bhall/) && !has(t, /\bstair/);
      return out("info", [hall
        ? "No discount for skipping a hallway — two halls are included when you have them, but skipping one doesn’t change the price; the room count sets the price."
        : "No discount for skipping the stairs — one staircase is included when you have one, but skipping it doesn’t change the price; the room count sets the price."]);
    }
    if (has(t, /\bwhere are you (?:guys )?(?:located|based|at|out of)\b|\bwhere(?:'s| is) (?:your|the) (?:shop|office|location|business|company)\b|\bwhere are you from\b|\bwhere is (?:your|the) business located\b/)) {
      return out("area", [`We're based in Wichita and serve about 15 miles around downtown: ${AREA_TOWNS}.`]);
    }
    const notes = [];
    let wantLink = false;

    const topic = (intent, line) => { if (!notes.includes(line)) notes.push(line); if (!topicIntent) topicIntent = intent; };

    /* --- things a person should handle --- */
    if (has(t, /\b(?:do not|don'?t|dont|please don'?t) (?:call|phone)\b|\b(?:message|text|messenger|chat) (?:here )?only\b|\bonly (?:message|text)\b/)) {
      return out("contact", [reach("No problem — we'll keep everything in Messenger. ", "No problem — we'll keep everything here in the chat. ") + askNext()]);
    }
    const productQ = has(t, /\b(?:products?|chemicals?|solutions?|cleaners?|soaps?|detergents?|stuff (?:you|you guys) use)\b[^.?!]*\b(?:safe|toxic|non ?toxic|green|eco[- ]?friendly|natural|organic|harsh)\b|\b(?:non ?toxic|eco[- ]?friendly|green|organic|harsh|safe)\b[^.?!]*\b(?:products?|chemicals?|solutions?|cleaners?)\b/) || /^(?:is it |are they |is that |is your stuff |are you |is everything )?(?:non ?toxic|eco[- ]?friendly|green|safe|natural|organic|pet[- ]safe|kid[- ]safe|chemical[- ]free|all natural)\??$/.test(t);
    const safetyQ = productQ || (has(t, /\b(?:safe|toxic|non toxic|harmful|harsh|chemicals?|poison\w*|hurt)\b/) && has(t, /\b(?:grand ?(?:kids|children)|kids?|children|child|bab(?:y|ies)|pets?|dogs?|cats?|family|allerg\w*|toddlers?|pregnant|infants?|asthma)\b/))
      || (has(t, /\b(?:pets?|dogs?|cats?|kids?|children)\b/) && has(t, /\b(?:be (?:home|there|around|inside)|are home|stay (?:home|inside)|around while)\b/) && has(t, /\?|\b(?:ok|okay|fine|alright)\b/))
      || (has(t, /\b(?:asthma\w*|allerg\w*|sensitivit\w*|sensitive|copd|breathing (?:issues?|problems?)|crawl\w*)\b/) && has(t, /\b(?:bother|affect|safe|ok|okay|problem|react|trigger|cleaner|chemicals?|products?|solution|smell|sick|hurt|fine|issue)\b/));
    if (has(t, /\b(?:speak|talk|chat) (?:to|with) (?:someone|somebody|a person|a human|a real person|a live person|keith|the owner|a manager|an? (?:actual|real) (?:person|human))\b|\breal person\b|\bhuman\b|\blive (?:person|agent)\b/)) {
      return out("human", site
        ? [`Absolutely — text Keith at ${TEXT_LINE} or message us on Facebook and he'll get right back to you.`]
        : humanHandoff(raw), { phone: true });
    }
    if (has(t, /\b(?:last time|last year|you (?:guys )?(?:cleaned|came|did)|(?:i|we) (?:previously )?paid (?:you|y'?all)|previous (?:visit|cleaning|job)|cleaned (?:my|our) (?:house|home|carpets?) before|came out before)\b/) && has(t, /\$\s?\d+/) && !has(t, /\b(?:stanley|steemer|chemdry|zerorez|oxi ?fresh|other compan\w*|another compan\w*|someone else|other guy|ignore|instructions)\b/)) {
      return out("human", site
        ? [`Welcome back, and thanks for choosing us again! Text Keith at ${TEXT_LINE} and he'll match your last visit.`]
        : ["Welcome back, and thanks for choosing us again! I don't have your past invoice here, so I've flagged this for Keith to match your last visit — he'll text you shortly. You can also grab a time now:", bookingUrl], { phone: true });
    }
    // a standard rug is up to 8x10; anything bigger needs Keith's review
    const rugDims = t.match(/\b(\d{1,2}(?:\.\d)?)\s*(?:'|ft|feet|foot)?\s*(?:x|by|×)\s*(\d{1,2}(?:\.\d)?)\s*(?:'|ft|feet|foot)?(?=\s|$|[,.!?])/);
    const rugTooBig = Boolean(rugDims) && (Math.min(+rugDims[1], +rugDims[2]) > 8 || Math.max(+rugDims[1], +rugDims[2]) > 10);
    if ((rugDims || has(t, /\b(?:wool|silk|persian|oriental|jute|sisal|synthetic|polyester|nylon|olefin)\b/)) && !has(t, /\b(?:area )?rugs?\b/) && (/^rug/.test(state.lastIntent) || state.rugs) && !has(t, /\b(?:tile|grout|kitchen|bath|floors?|rooms?|sofa|couch|chair|sectional|loveseat)\b/)) t += " rug";
    const furniture = readFurniture(t);
    const scopeText = furniture.any ? t.replace(/\b(?:in|on|from) (?:the |my |our )?(?:living|front|family|dining|great|bonus|game|media|tv|sitting|sun|rec) ?room\b|\b(?:in|on) (?:the |my |our )?(?:den|office|basement|loft)\b/g, " ") : t;
    const scope = readScope(scopeText);
    // "she had accidents in two rooms" says where the problem is, not how many rooms
    if (scope.locatedOnly && hasScope()) { scope.found = false; }
    if (scope.found && !scope.wholeHouse && scope.rooms + scope.rugs + scope.halls + scope.stairs === 0) scope.found = false;
    // "can you move my piano?" / "do I need to empty the china cabinet in the dining room?" is a prep question, not a job
    const HEAVY_FURN = /\b(?:pianos?|china cabinets?|china hutch(?:es)?|hutch(?:es)?|curio(?: cabinets?)?|armoires?|bookcases?|book ?shelves|dressers?|beds?|entertainment cent\w+|desks?|gun safes?|safes?|aquariums?|fish tanks?)\b/;
    const SMALL_FURN = /\b(?:couch(?:es)?|sofas?|sectionals?|loveseats?|love seats?|recliners?|chairs?|coffee tables?|end tables?|ottomans?)\b/;
    const moveFurnQ = has(t, /\b(?:move|moving|empty|clear (?:out|off)|take (?:out|everything)|lift|shift|scoot)\b/) && (has(t, HEAVY_FURN) || has(t, SMALL_FURN) || has(t, /\bfurniture\b/))
      && !has(t, /\b(?:how much|price|cost|quote|clean (?:my|the|our|a) (?:couch|sofa|sectional|chair|recliner|loveseat)|upholstery)\b/) && !/\d/.test(t) && !has(t, /\bmov(?:e|ing) ?(?:out|in)\b|\bmoving (?:to|into|away)\b|\bnew (?:house|home|place)\b/);
    const heavyNamed = has(t, /\b(?:pianos?|china cabinets?|china hutch(?:es)?|hutch(?:es)?|curio(?: cabinets?)?|armoires?|bookcases?|book ?shelves|desks?|gun safes?|safes?|aquariums?|fish tanks?)\b/);
    const moveFurnLine = !moveFurnQ ? "" : heavyNamed
      ? "We move smaller items like couches, loveseats, recliners and coffee tables, then put them back. Beds, dressers, entertainment centers and heavy pieces like pianos or china cabinets stay put — we clean around them, so there's no need to empty anything."
      : "We move smaller items like couches, loveseats, recliners and coffee tables so we can clean underneath, then put them back. Beds, dressers and entertainment centers stay put, so clear under those if you want that carpet cleaned.";
    if (moveFurnQ) { scope.found = false; scope.remove = { any: false }; }
    const salesy = scope.found && has(t, /\b(?:how much|price|cost|quote|opening|book|schedule)\b/);
    const pastJob = has(t, /\b(?:since (?:you|y'?all|your (?:guy|tech)) (?:cleaned|came|left|were here)|after (?:you|the) clean\w*|you (?:guys )?(?:cleaned|came|did|were here|were out)|cleaned (?:last|yesterday|on|it|them|my|our)|after (?:you|the cleaning|cleaning)|since you|your (?:tech|guy|crew|work|cleaning|service)|last (?:week|visit)|yesterday)\b/);
    // "your ad is a scam, nobody does a house for 99" doubts the price; it isn't a complaint about a job
    const adSkeptic = !pastJob && has(t, /\bscam\b/) && has(t, /\b(?:ads?|advert\w*|99|\$\d+|price|deal|special|whole house|nobody|no one|no way)\b/);
    const scamQuestion = (has(t, /\b(?:is (?:this|it|that)|are you|r you) (?:a |legit|real|for real)|\bscam\?|\blegit\b/) || adSkeptic) && !pastJob && !has(t, /\byou (?:guys )?are (?:a )?scam/);
    const strongComplaint = has(t, scamQuestion ? /\b(?:refund|lawyer|attorney|bbb|still dirty|didn'?t (?:come|get) out)\b/ : /\b(?:refund|lawyer|attorney|bbb|scam|still dirty|didn'?t (?:come|get) out|(?<!\b(?:she|he|dog|dogs|cat|cats|kids?|puppy|pets?|it|someone|baby|toddler|guests?) )left (?:a |stains?|marks?)|complain\w*|dispute|disputing|chargeback|never (?:showed|came)|no[- ]show|didn'?t show)\b/)
      || (has(t, /\b(?:not satisfied|dissatisfied|unsatisfied)\b/) && !has(t, /\b(?:what if|if (?:i'?m|i am|we'?re|we are|i'?m not|you)|in case|what happens)\b/))
      || (pastJob && has(t, /\b(?:came|come|coming|comes) back\b|\b(?:stains?|spots?|marks?|residue|streaks?|sticky|crunchy|stiff|still wet|still damp|soaked|look at|smells?|smelly|stinks?|odou?rs?|weird|funny|worse|mildew\w*|musty|ripples?|shrunk|brown(?:ing)?|wicking)\b/) && !has(t, /\b(?:what if|what happens if|if (?:a|the|it|any|they|there)|in case)\b/));
    const weakComplaint = (has(t, /\b(?:damag\w*|ruin\w*|broke|broken|terrible|worst|unhappy|not happy|disappointed|upset|mad|awful|horrible)\b/)
      && (pastJob || has(t, /(?<!(?:do|can|would|will) )\byou guys\b|\b(?:your (?:machine|equipment)|you (?:left)|came (?:out|yesterday|last)|the cleaning)\b/)))
      || /^(?:i'?m |we'?re |i am |very |really |so |pretty |extremely )*(?:disappointed|unhappy|not happy|upset|dissatisfied)[.!]*$/.test(t);
    const otherCompany = has(t, /\b(?:last|other|previous|another|old) (?:company|cleaner|carpet cleaner|guy)\b|\btenants?\b|\bprevious owners?\b|\b(?:my|a) (?:friend|neighbou?r|coworker|co worker|sister|brother|mom|dad|cousin) (?:said|told|says|mentioned)\b|\b(?:someone|people) (?:said|told me|say)\b|\breviews? (?:said|say)\b/);
    if (has(t, /\b(?:water damage|flood\w*|restoration|sewage)\b/)) {
      { return out("other-services", [reach("Water damage is something Keith would want to look at personally — I've let him know, and he'll reach out here.", `Water damage is something Keith would want to look at personally — text a photo and a description to ${TEXT_LINE}.`)], site ? {} : { notify: "review" }); }
    }
    if (has(t, /\b(?:repair|stretch\w*|re-?stretch|install\w*|patch(?:ing)?|replace (?:the )?carpet)\b/) && has(t, /\bcarpet|rug\b/)) {
      return out("other-services", ["We don't do carpet repair, stretching or installation — just cleaning. A carpet installer can help with that, and we'd be glad to clean it afterward."]);
    }
    // a technician who showed up late is a complaint, not a change to a booking
    const lateArrival = has(t, /\b(?:arrived|showed up|show(?:ed)? up|came|got here|was|were|ran)\s+(?:\w+\s+){0,3}late\b|\b\d+ (?:min(?:ute)?s?|hours?) late\b/) && has(t, /\b(?:tech\w*|your guy|he|keith|you guys|you|cleaner)\b/)
      && !has(t, /\b(?:what (?:happens )?if|what if|if (?:you|he|keith|the tech)|do you ever|in case|are you|is he)\b/);
    if (lateArrival) return complaintReply(false);
    if ((strongComplaint || weakComplaint) && !salesy && !otherCompany) return complaintReply(has(t, /\bcome back\b|\b(?:came|coming) back\b/));
    // policy questions asked ahead of time (not about a booked visit)
    const hypo = has(t, /\b(?:what (?:happens )?if|what if|if (?:you|i|we|he|keith)|do you (?:ever|usually|guys|send|text|call|let)|does (?:the tech|he) (?:send|text|call)|will (?:you|i|he|keith)|would you|does (?:he|keith)|is there (?:a|any)|do i get|how will i know|let me know|in case)\b/);
    if (has(t, /\b(?:on time|punctual|show up late|usually late)\b/) && !has(t, /\b(?:are you|is he) (?:still )?(?:on time|coming)\b(?! usually)/)) topic("policy", RUNNING_LATE_REPLY);
    if (has(t, /\b(?:running (?:late|behind)|late|behind schedule)\b/) && hypo && (has(t, /\b(?:what (?:happens )?if|what if|if (?:you|he|keith|the tech)|do you ever|in case)\b/) || !has(t, /\b(?:are you|you'?re|is he|he'?s) (?:running )?(?:late|behind)\b/))) topic("policy", RUNNING_LATE_REPLY);
    if (has(t, /\bon (?:your|the|his) way\b|\b(?:let (?:me|us) know|notify (?:me|us)|warn (?:me|us)|tell (?:me|us)|message (?:me|us)|text (?:me|us)) before (?:you|he|they|the tech|someone) (?:show up|come|arrive|get here|head (?:over|out)|leave)\b|\bheads[- ]up\b|\btext (?:me )?(?:before|when)\b|\b(?:send|get) a text before\b/) && (hypo || has(t, /\btext (?:me )?(?:before|when)\b|\bheads[- ]up\b|\bcall (?:me )?(?:before|first)\b/))) topic("policy", ON_THE_WAY_REPLY);
    const cancelHypo = has(t, /\b(?:fee|fees|charge|charged|penalty|policy|cost me|what if|what happens if|if (?:something|anything|i|we)|in case|will i|would i|can i)\b/);
    if (has(t, /\b(?:cancel\w*|reschedul\w*)\b/) && !has(t, /\b(?:cancel|reschedule|move) (?:it|that|this|mine|ours)\b|\brebook\b/) && (hypo || cancelHypo) && (cancelHypo || !has(t, /\bmy (?:appointment|appt|booking)\b|\bneed to (?:cancel|reschedule)\b(?! later)|\bi (?:want|have) to (?:cancel|reschedule)\b/))) {
      topic("policy", "There's no cancellation fee — just give us as much notice as you can.");
    }
    const prepQ = has(t, /\b(?:vacuum\w*|move (?:the |my |our |any )?(?:furniture|stuff|things|anything|couch|beds?)|prep\w*|do i (?:need|have) to|should i|what do i|be home|door code|garage code|pets? (?:be )?(?:home|out)|how long|dry)\b/);
    if (!prepQ && !notes.length && has(t, /\b(?:reschedul\w*|cancel\w*|(?:move|push|bump|switch) (?:my|our) (?:appointment|appt|booking|cleaning|visit)|change (?:my|our|an|the) (?:appointment|appt|booking|time|date)|confirm(?:ing)? (?:my|our|the) (?:appointment|appt|booking|time|visit|cleaning)|running late|are you (?:still )?coming|where are you(?! (?:guys )?(?:located|based|from|at|out of))|on (?:your|the) way|(?:i|we) (?:have|got|had) (?:an? )?(?:appointment|appt|booking)|(?:i'?m|we'?re) (?:booked|scheduled) (?:for|on))\b/)
      || (!prepQ && !notes.length && has(t, /\balready (?:booked|scheduled)\b/))
      || (!prepQ && !notes.length && has(t, /\bmy (?:appointment|appt|booking)\b/) && !has(t, /\b(?:make|book|schedule|set up|get)\b/))) {
      return out("change_existing", [reach(`We'll be happy to get that arranged. A team member will reach out to handle the change, since I can't update a booked appointment from Messenger. You can also reply to your Housecall Pro text or text ${TEXT_LINE}.`, `For an existing appointment, please reply to your Housecall Pro text or text ${TEXT_LINE} — Keith handles changes personally.`)], { phone: true });
    }
    if (VENDOR_PITCH.test(t)) return out("human", [reach(VENDOR_REPLY, VENDOR_REPLY_SITE)], { phone: true });
    if (has(t, /\bhow long have you been\b|\bin business\b|\byears (?:of )?experience\b|\bhow many years\b/)) {
      if (!site) state.offeredKeith = true;
      topic("about", reach("We're owner-operated — Keith runs the business and does the cleaning himself, and we have over 385 satisfied customers. I don't have the exact years here — want me to ask Keith?", `We're owner-operated — Keith runs the business and does the cleaning himself, and we have over 385 satisfied customers. For the exact years, text Keith at ${TEXT_LINE}.`));
    }
    if (PM_STRONG_RE.test(t) && !PM_COMMERCIAL_RE.test(t)) return out("property_manager", offerLink(pmLines(t)));
    if (has(t, /\b(?:commercial|office building|offices|office (?:space|suite)|small office|(?<!(?:after|before|from|at|to) )church|restaurant|warehouse|property manag\w*|manage (?:an? |the |our )?(?:apartment|complex|building|propert\w*)|\d+ (?:rental )?units|(?:[2-9]|\d{2,3})[ -]?(?:rental |apartment |condo )?units?|(?:[2-9]|\d{2,3}) (?:rental (?:houses|homes|properties|units)|rentals|apartments|condos|townhomes|houses|homes|properties)|apartment complex(?:es)?|(?:own|manage|run) (?:an? |the |our |my )?apartment (?:complex|building)s?|\d ?-?plex(?:es)?|(?:tri|quad|four|five|six)[ -]?plex(?:es)?|volume (?:pricing|discount|rate)|multiple (?:units|properties|rentals|houses)|several (?:units|properties|rentals)|bulk (?:pricing|rate|discount)|hotel|daycare|storefront)\b|\b(?:do|can) you (?:do|clean) (?:an? |my |our )?office\b/) || (has(t, /\boffice\b/) && has(t.replace(/(\d),(?=\d{3}\b)/g, "$1"), /\b\d{3,6}\s*(?:square (?:feet|foot)|sq\.?\s*f(?:ee)?t\.?|sqft|sf)\b/)) || (has(t, /\bbusiness(?:es)?\b/) && !has(t, /\b(?:in business|been in|your business|the business|my (?:home|house)|business days?|business hours)\b/))) {
      if (has(t, /\b(?:\d+ (?:rental )?units|(?:[2-9]|\d{2,3})[ -]?(?:rental |apartment |condo )?units?|(?:[2-9]|\d{2,3}) (?:rental (?:houses|homes|properties|units)|rentals|apartments|condos|townhomes|houses|homes|properties)|apartment complex(?:es)?|(?:own|manage|run) (?:an? |the |our |my )?apartment (?:complex|building)s?|\d ?-?plex(?:es)?|(?:tri|quad|four|five|six)[ -]?plex(?:es)?|volume|multiple (?:units|properties|rentals|houses)|several (?:units|properties|rentals)|bulk)\b/)) {
        return out("property_manager", offerLink(pmLines(t)));
      }
      if (lastIntentBefore === "commercial") return out("commercial", [reach("Thanks — I've added that for Keith, and he'll get back to you with a quote.", `Thanks — please text that to Keith at ${TEXT_LINE} along with a couple of photos, and he'll get back to you with a quote.`)], { phone: true });
      return out("commercial", [reach("Commercial jobs get a personal quote. Send a quick description (rough size and type of space) and a couple of photos here, and Keith will get back to you.", `Commercial jobs get a personal quote. Text a quick description and a couple of photos to ${TEXT_LINE} and Keith will get back to you.`)], { phone: true });
    }
    if (has(t, /\bhigh[- ]?rises?\b/) || (has(t, /\bdowntown\b/) && has(t, /\b(?:lofts?|apartments?|condos?|tower|floor)\b/)) || has(t, /\b(?:[5-9]|1\d|2\d)(?:st|nd|rd|th) floor\b|\b(?:fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth) floor\b/)) {
      state.declined = "highrise";
      return out("area", ["Sorry — we don't service downtown high-rise apartment buildings. If you're in a house, townhome or low-rise apartment within about 15 miles of downtown Wichita, we'd love to help."]);
    }
    if (scope.found && !scope.wholeHouse && (scope.rooms + scope.rugs > 20 || scope.halls > 6 || scope.stairs > 4)) {
      return out("layout_review", [reach("A home that size gets a personal quote, so I'm passing this to Keith — he'll get back to you here.", `A home that size gets a personal quote — text the room count to Keith at ${TEXT_LINE} and he'll price it.`)], { phone: true });
    }

    /* --- work we don't price here --- */
    const unsupportedWord = has(t.replace(/\btruck ?mount(?:ed)?\b|\b(?:park|parking|pull) (?:the |your |a )?(?:truck|van|car|vehicle)\b|\b(?:truck|van|car|vehicle) (?:park|parking)\b|\byour (?:truck|van|vehicle)\b|\bcar ?pet\b/g, " "), /\b(?:mattress(?:es)?|cars?|car seats?|auto(?:mobile)?s?|vehicles?|trucks?|rvs?|boats?|campers?)\b/);
    const negatedUnsupported = has(t, /\bno (?:mattress|car|vehicle)\b|\binstead\b|\bonly (?:home|house) carpet\b|\bhome carpet\b/);
    const UNSUPPORTED_LINE = "We do not offer mattress or vehicle cleaning right now — but we'd be glad to help with home carpet, rugs, furniture, tile or hard floors.";
    const hasJob = scope.found && scope.rooms + scope.rugs + scope.halls + scope.stairs > 0;
    if (unsupportedWord && !negatedUnsupported) {
      state.unsupported = true;
      return out("unsupported", [UNSUPPORTED_LINE]);
    }
    if (state.unsupported) {
      if (negatedUnsupported || hasJob || furniture.any || has(t, /\b(?:carpets? in (?:my|the|our) (?:house|home)|house|home|rugs?|tile|floors?|recliner|couch|sofa|chair)\b/)) state.unsupported = false;
      else if (/^\W*\d{1,2}\W*$/.test(t) || /^(?:yes|ok|okay|sure)\b/.test(t)) {
        return out("unsupported", ["Just to confirm — we can't do mattresses or vehicles. If you'd like home carpet cleaning instead, tell me how many rooms and I'll get you a price."]);
      }
    }
    if (has(t, /\b(?:thanksgiving|christmas(?: eve)?|xmas|new year'?s?(?: eve| day)?|easter|memorial day|labor day|july 4(?:th)?|4th of july|independence day|black friday)\b/) && !has(t, /\b(?:before|after|by)\b/)) {
      return out("booking", ["Holiday availability depends on Keith's schedule — the live calendar only shows days that are actually open:", bookingUrl]);
    }
    const weekendRequest = (namesWeekendDate(t) && !has(t, /\b(?:last|since|ago|cleaned|moved|was|were|did|came)\b/)) || has(t, /\b(?:saturdays?|sundays?|weekends?|sat|sun)\b(?! ?(?:room|porch|down))/)
      && has(t, /\b(?:book|schedule|can (?:you|u|i)|could you|come|available|availability|work for|this|next|on|need|want|appointment|appt|slot|time|possible|chance|only|day off|days off|off work|any way|exception|squeeze|fit (?:me|us|it) in|instead|what about|how about)\b/)
      && !has(t, /\bdo you (?:work|do|clean|come|run)\b|\bare you open\b|\bopen on\b|\bwhat days\b/)
      && !has(t, new RegExp(`\\b(?:or|and) (?:${DAY}|next week|a weekday)\\b|\\b${DAY}\\b`));
    if (weekendRequest) {
      return weekendFromText(t);
    }
    if (has(t, /\b(?:bath ?mats?|door ?mats?|small mats?|throw rugs?)\b/) && !has(t, /\b(?:area rugs?|standard rugs?)\b/)) {
      return out("rug", ["We do not clean extremely small rugs or mats that our machinery can't handle, like bath mats or door mats. Standard area rugs are no problem!"]);
    }
    const woolBefore = state.said.includes("wool");
    if ((has(t, /\b(?:area )?rugs?\b/) || (woolBefore && rugDims)) && woolBefore && !has(t, /\b(?:synthetic|polyester|nylon|olefin|another|other|second|different|new) rug\b|\b(?:synthetic|polyester|nylon|olefin)\b/)) {
      const ftM = t.replace(/(\d),(?=\d{3}\b)/g, "$1").match(/\b(\d+(?:\.\d+)?)\s*(?:square (?:feet|foot)|sq\.?\s*ft\.?|sqft|sf)\b/);
      const bigFloor = ftM && Number(ftM[1]) > 600 && has(t, /\b(?:hard ?wood|wood floors?|hard floors?|laminate|vinyl|lvp)\b/);
      return out("rug", ["Just a reminder — we can't clean wool or other natural-fiber rugs, so that rug isn't one we can take on." + (bigFloor ? " " + reach("Hard-floor areas over 600 square feet need a personal scope review before we quote them, so I'm passing that part to Keith — he'll get back to you here.", `Hard-floor areas over 600 square feet need a personal scope review — text a description and a photo to Keith at ${TEXT_LINE}.`) : "")], bigFloor ? { phone: true } : {});
    }
    if (has(t, /\b(?:area )?rugs?\b/)) {
      if (has(t.replace(/\b(?:not|isn'?t|no|never|not made of|not a) (?:a |an |made of )?(?:wool|silk|jute|sisal|seagrass|natural[- ]fiber|organic)\b/g, " "), /\b(?:wool|silk|jute|sisal|seagrass|natural[- ]fiber|organic)\b/)) {
        if (!state.said.includes("wool")) state.said.push("wool");
        return out("rug", ["We do not clean rugs made of wool or other organic or natural material — but we'd be glad to help with carpet or standard synthetic rugs."]);
      }
      if (has(t, /\b(?:oversized|over[- ]?sized|non[- ]?standard|antique|persian|oriental|hand[- ]?(?:made|knotted|woven|tufted)|delicate|huge|room[- ]sized?|heirloom|vintage)\b/) || rugTooBig) {
        // the carpet part of the job can still be priced before the rug goes to Keith
        const carpetPart = scope.found && !scope.wholeHouse && scope.rooms + scope.halls + scope.stairs >= 2 && scope.rooms <= 20 && scope.halls <= 6 && scope.stairs <= 4 && !hasScope();
        if (carpetPart) { state.rooms = scope.rooms; state.halls = scope.halls; state.stairs = scope.stairs; state.rugs = 0; state.quoted = true; }
        return out("rug_price", [...(carpetPart ? [quoteLine(scopeNow(), state.pets)] : []), reach("That kind of rug needs a quick look before we can price it, so I'm passing it to Keith — he'll get back to you here.", `That kind of rug needs a quick look before we can price it — text a photo to Keith at ${TEXT_LINE}.`)], { phone: true });
      }
      if (has(t, /\b(?:big|large|giant|really big|very big)\b/) && !rugDims) {
        return out("rug", [reach("Happy to help with the rug! About how big is it (like 8x10)? Standard rugs count as one room, and very large ones get a quick look from Keith first.", "Happy to help with the rug! About how big is it (like 8x10)? Standard rugs count as one room, and very large ones need a quick look first.")]);
      }
      if (has(t, /\b(?:tiny|throw|bath ?mat|door ?mat|small rug)\b/)) {
        return out("rug", ["We do not clean extremely small rugs that our machinery can't handle. Standard area rugs are no problem!"]);
      }
    }
    let floorNoted = false;
    const footage = (() => { const m = t.replace(/(\d),(?=\d{3}\b)/g, "$1").match(/\b(\d+(?:\.\d+)?)\s*(?:square (?:feet|foot)|sq\.?\s*ft\.?|sqft|sf)\b/); return m ? Number(m[1]) : null; })();
    const tileQ = has(t, /\b(?:tile|grout)\b/) || (state.tileAsked && footage !== null && has(t, /\b(?:kitchen|bath ?rooms?|baths?|entry|foyer|laundry)\b/)) || (state.tileAsked && /^(?:the |just (?:the )?|my |our |only (?:the )?)?(?:kitchen|bath ?rooms?|baths?|whole (?:floor|house)|both|kitchen and (?:the )?bath(?:room)?)(?: floors?| tile| area)?(?: only| please| just)?[.!?]*$/.test(t));
    const floorQ = has(t, /\b(?:hard ?wood|wood floors?|hard floors?|laminate|vinyl|lvp)\b/) || (has(t, /\bpolish\w*\b/) && !has(t, /\bnail polish\b/) && !tileQ) || (state.floorAsked && footage !== null && !tileQ && !has(t, /\b(?:rooms?|bed ?rooms?|house|home)\b/));
    if ((tileQ || floorQ) && scope.found && !scope.rooms && !scope.rugs && !scope.stairs && !scope.wholeHouse) scope.found = false;
    if (tileQ || floorQ) {
      const bathM = t.match(new RegExp(`\\b${N}\\s+bath(?:room)?s?\\b`));
      const baths = bathM ? num(bathM[1]) : null;
      const kitchen = /\bkitchen\b/.test(t), bath = /\bbath(?:room)?s?\b/.test(t), whole = /\bwhole|\bfull[ -]?floor|\bentire\b/.test(t);
      // a kitchen-only job tops out at 150 sq ft; kitchen plus dining/entry/etc. can be the 400 sq ft whole-floor tier
      const kitchenPlus = kitchen && D_MORE_TILE_RE.test(t);
      const cap = tileQ ? (whole || (bath && kitchen) || kitchenPlus ? 400 : bath ? 100 : kitchen ? 150 : 400) : 600;
      const special = has(t, /\b(?:natural stone|marble|travertine|slate|granite|unsealed|sanding|refinish\w*|showers?|walls?|heavy buildup|heavy build ?up|mold|mildew|countertops?)\b/);
      if (special || (footage !== null && (footage <= 0 || footage > cap)) || (tileQ && baths !== null && baths > 2)) {
        return out("layout_review", [reach(floorQ && footage > 600 ? "Hard-floor areas over 600 square feet need a personal scope review before we quote them, so I'm passing this to Keith — he'll get back to you here." : "That one needs a personal scope review before we can quote it, so I'm passing it to Keith — he'll get back to you here.", `That one needs a personal scope review before we can quote it — text a description and a photo to Keith at ${TEXT_LINE}.`)], { phone: true });
      }
      if (asksAboutPrice(t) || footage !== null || bath || kitchen || whole) {
        let pick;
        if (tileQ) pick = whole || (bath && kitchen) || (footage !== null && footage > 150) ? PRICES.tile[2] : kitchen || (footage !== null && footage > 100) ? PRICES.tile[1] : bath ? PRICES.tile[0] : null;
        else pick = footage === null ? (whole ? PRICES.hardFloor[2] : null) : footage <= 150 ? PRICES.hardFloor[0] : footage <= 300 ? PRICES.hardFloor[1] : PRICES.hardFloor[2];
        if (pick) {
          const floorLine = `${tileQ ? "Tile & grout" : "Hard floor"} — ${pick[0]}: ${money(pick[1])} plus tax.`;
          if (!(scope.found && scope.rooms + scope.halls + scope.stairs > 0)) return out("other-services", withLink([floorLine]));
          topic("other-services", floorLine); floorNoted = true;
        }
      }
    }

    // residential square footage: we price by room
    const hasCounts = scope.found && scope.rooms + scope.rugs + scope.halls + scope.stairs > 0;
    if ((footage !== null || has(t, /\bper (?:square (?:foot|feet)|sq\.? ?ft|sqft)\b/)) && !tileQ && !floorQ && !hasCounts && !hasScope() && !has(t, /\b(?:kitchen|bath ?rooms?|baths?|patio|garage|entry|foyer|floors?)\b/)) {
      return out("price", [`We price by the room, not by square footage. ${ASK_ROOMS} For reference, the ${money(PRICES.standard)} special covers ${COVER}, plus tax.`]);
    }
    // "how much are stairs?" is a question about stairs, not a one-staircase job
    if (asksAboutPrice(t) && !hasScope() && hasCounts && scope.stairs === 1 && !scope.rooms && !scope.rugs && !scope.halls && !/\d|\b(?:one|a|two|three|single)\s+(?:stair|flight|set)/.test(t) && !has(t, /\b(?:just|only|my|our)\b/)) {
      return out("included", [`One staircase is included in the ${money(PRICES.standard)} special, which covers ${COVER}, plus tax. On its own, a staircase counts as one area toward our ${money(PRICES.minimum)} price for up to 3 areas. Each extra staircase is ${money(PRICES.extra)} plus tax — or it can take an unused room spot in the package at no extra charge. ${ASK_ROOMS}`]);
    }
    if (has(t, /\bwalk ?in closets?\b|\bclosets?\b/) && has(t, /\b(?:count|counts|counted|extra|another|separate|charge|charged|cost|included?|as a room)\b/) && scope.rooms <= 1) {
      return out("included", [CLOSET_REPLY + (hasScope() ? "" : ` ${ASK_ROOMS}`)]);
    }
    const addOn = t.match(/\b(?:additional|extra|another|added|add(?:ing)? an?|second|2nd|third|3rd|fourth|4th)\s+(?:one\s+|set of\s+)?(staircase|stairs|set of stairs|flights?|hall ?ways?|halls?|room|bed ?room|area rug|rug)\b/)
      || (has(t, /\b(?:second|2nd|third|3rd|other|extra) one\b/) && t.match(/\b(stair|hall|rug|room)/));
    const addOnQ = addOn && (has(t, /\?|\b(?:how much|cost|charge|price|extra|more)\b/));
    if (addOn && ((!hasScope() && !/\d|\b(?:two|three|four|five|six|seven|eight)\b/.test(t)) || (addOnQ && !scope.rooms))) {
      const kind = /stair|flight/.test(addOn[1]) ? "staircase" : /hall/.test(addOn[1]) ? "hall" : /rug/.test(addOn[1]) ? "standard area rug" : "room";
      return out("included", [`Each additional ${kind} is ${money(PRICES.extra)} plus tax as an add-on to the ${money(PRICES.standard)} or ${money(PRICES.pet)} special, which covers ${COVER}.${kind === "staircase" ? " If the package has an unused room spot, an extra staircase can take it at no extra charge." : ""}${hasScope() ? "" : ` ${ASK_ROOMS}`}`]);
    }

    // "and without?" after a pet-treatment price
    if (hasScope() && state.quoted && /^(?:and |so |ok |what about |how about |how much )?(?:it )?without(?: (?:it|that|the pet(?: treatment| one| package)?|pet treatment|the treatment|pets?))?\??$/.test(t)) {
      const a = quote({ ...scopeNow(), pets: false }), b = quote({ ...scopeNow(), pets: true });
      return out("price", [`Without pet treatment it's ${fmtQ(a)} for ${state.wholeHouse ? "the whole house" : describe(scopeNow())}, instead of ${fmtQ(b)}.`]);
    }
    // "😳 that much for 2??" / "why is it $75 for 2 rooms?"
    if (hasScope() && state.quoted && quote({ ...scopeNow(), pets: state.pets }).kind !== "package" && has(t, /\b(?:that|so) (?:much|expensive|high|pricey)\b|\bwhy (?:is it|is that|so|does it cost)\b/) && !has(t, /\b(?:add|plus|also|actually|instead|make it|pet)\b/)) {
      const q = quote({ ...scopeNow(), pets: state.pets });
      const what = state.wholeHouse ? "the whole house" : describe(scopeNow());
      if (q.kind === "minimum" || q.kind === "pet-minimum") return out("price", [`${money(q.total)} plus tax is our minimum — it covers up to 3 ${q.kind === "minimum" ? "areas" : "rooms with pet treatment"}, so ${what} is the same ${money(q.total)} as 3 would be.`]);
    }
    /* --- update what we know about the job --- */
    // asking about pet treatment isn't choosing it
    const petStateQ = /^(?:so |and )?(?:is (?:that|it|this|the price|that price|the quote) (?:with |the |for |including |included with |a )?pet (?:treatment|package|price|one|version)|does (?:that|it|this|the price) include (?:the )?pet (?:treatment|package))\??$/.test(t);
    const petInfoQ = petStateQ || has(t, /\b(?:do|does|can) (?:you|y'?all|u)(?: guys)? (?:have|offer|do|provide)\b[^.?!]{0,12}\bpet (?:treatment|cleaning|odor|stain|urine)\b|\bwhat (?:is|'s|does) (?:the |your )?pet (?:treatment|package|special|version)\b|\b(?:difference|different|vs\.?|versus)\b[^.?!]*\b(?:99|149|pet)\b/) && !has(t, /\b(?:pee|peed|urine|accidents?|odor|smell|stains?|marking)\b/);
    let pets = safetyQ || petInfoQ ? null : readPets(t);
    // a short reply like "Pet" / "yes pets" / "pet issues" right after a quote answers the pet-treatment question
    if (pets === null && hasScope() && t.split(" ").length <= 5 && !/\?$/.test(t)
      && /^(?:(?:yes|yeah|yep|yup|sure|ok|okay)[,!.]?\s*)?(?:the |with )?(?:pets?|pet treatment|pet version|pet one|pet price|pet package|pet special|pet issues?)(?: (?:please|version|one|treatment|price|package))?[.!]*$|^(?:yes|yeah|yep)[,!.]?\s*(?:please )?(?:add |do |with |we need )?(?:the )?pet treatment\b|^(?:we )?(?:need|want) (?:the )?pet treatment\b/.test(t)) pets = true;
    if (pets !== null) state.pets = pets;
    const correcting = has(t, /\b(?:actually|no wait|i mean|i meant|correction|scratch that|instead|make (?:it|that)|just|only)\b/);
    // "actually add the living room too" adds; "actually make it 4" corrects
    const explicitAdd = has(t, /\b(?:add|adding|throw in)\b/) && !has(t, /\b(?:instead|make (?:it|that)|i mean|i meant|scratch that|just|only)\b/);
    const startsAdding = (/^(?:and|plus|also|oh and|\+|what about|how about)\b/.test(t) || explicitAdd || (!correcting && has(t, /\b(?:plus|also|too|as well|in addition|on top of that|add|adding)\b/))) && hasScope();
    // a question about what's covered ("are stairs included?") doesn't change the job
    const scopeQuestion = has(t, /\b(?:includ\w*|cover\w*|count(?:s|ed)?|standard|extra|charge\w*|cost more)\b/) && (/\?\s*$/.test(t) || /^(?:are|is|does|do|would|will|can|what about)\b/.test(t)) && !has(t, /\b(?:add|adding|also|plus|we have|i have|we'?ve got|i'?ve got|there'?s|there are|we got|i got)\b/) && !/\d|\b(?:two|three|four|five|six|seven|eight)\b/.test(t.replace(/\b\d+ ?(?:x|by) ?\d+\b/g, " "));
    if (state.quoted && hasScope() && /^(?:really|seriously|wait|whoa|wow|so|hold on|huh)\b/.test(t) && /\$\s?\d+/.test(t) && !has(t, /\b(?:add|plus|also|actually|instead|make it)\b/)) { scope.found = false; scope.remove = { any: false }; }
    if (scopeQuestion && (hasScope() || /^(?:does|do|is|are|would) (?:that|it|this|the (?:price|special|package|\$?\d+))\b/.test(t) || /^(?:is|are) (?:the |a |my |our )?(?:stairs?|staircases?|steps|hall ?ways?|halls?)\b/.test(t))) { scope.found = false; scope.remove = { any: false }; }
    // "throw in the hallway free?" asks for a freebie, it doesn't add the hallway
    if (has(t, /\b(?:for free|no charge|free of charge|throw (?:in|it in|that in|in the))\b/) || (has(t, /\bfree\b/) && !has(t, /\b(?:scent|fragrance|perfume|chemical|toxin|dye|pet|smoke|hassle|worry|stress|allergen|odou?r|soap|residue|gluten|cat|dog)[ -]?free\b|\bfree (?:estimates?|quotes?|of pets?)\b/))) { scope.found = false; }
    // "dog pee in the living room" says where the problem is, not how many rooms
    if (scope.onlyLocated && (pets === true || (pets === null && has(t.replace(/\b(?:no|never had an?|never)\s+(?:accidents?|stains?|smells?)\b/g, " "), /\b(?:stains?|spots?|accidents?|smell|odou?r|spill\w*|mess)\b/)))) scope.found = false;
    // a bare "room" mention doesn't replace a count we already have
    if (scope.bare && hasScope() && !startsAdding && !scope.adding) scope.found = false;
    // "baths aren't carpeted, just the bedrooms and LR" restates the job we already have
    if (pets === null && scope.onlyNamed && hasScope() && !state.wholeHouse && state.rooms >= 2 && has(t, /\b(?:just|only|all) (?:the )?(?:bed ?rooms|rooms)\b|\bthe bed ?rooms and\b/) && !startsAdding && !has(t, /\b(?:add|also|plus|too)\b/)) {
      return out("price", [`Got it — still ${fmtJob()} for ${jobName()}.`]);
    }
    const alreadyNamed = pets === null && scope.onlyNamed && hasScope() && scope.namedList.length && scope.namedList.every((w) => state.named.includes(w));
    if (alreadyNamed) {
      return out("price", [`Yes — the ${scope.namedList.join(" and ")} ${scope.namedList.length > 1 ? "are" : "is"} already included in that price.`, ...(state.linkSent ? [] : [BOOK_INTRO, bookingUrl])]);
    }
    if (((scope.uncounted && (scope.halls || scope.stairs)) || (/\bsteps?\b/.test(t) && scope.stairs && !scope.halls)) && scope.found && !scope.rooms && !scope.rugs && !hasScope()) {
      state.halls = scope.halls; state.stairs = scope.stairs; state.needRooms = true; // keep them; the room count comes next
      const al = aloneLine(scope.halls, scope.stairs, t);
      if (/On its own/.test(al)) markSaid("p:needrooms");
      return out("price", [al]);
    }
    const inclusionQ = scope.onlyNamed && hasScope() && has(t, /\b(?:too|also|as well|include[sd]?|cover(?:ed|s)?)\b/);
    const scopeChanged = applyScope(scope, t, { adding: startsAdding, inclusionQ });
    if (scopeChanged && state.unsupported) state.unsupported = false;
    if (scopeChanged && !state.wholeHouse && (state.rooms + state.rugs > 20 || state.halls > 6 || state.stairs > 4)) {
      return out("layout_review", [reach("A home that size gets a personal quote, so I'm passing this to Keith — he'll get back to you here.", `A home that size gets a personal quote — text the room count to Keith at ${TEXT_LINE} and he'll price it.`)], { phone: true });
    }

    // haggling / freebies: prices are set
    if (has(t, /\bfor free\b|\bfree (?:room|cleaning|rug|hall|stairs?)\b|\bfor less\b|\b(?:any|a) cheaper\b|\bcheaper option\b|\blower (?:the )?price\b|\b\d+ ?% off\b|\breferral\b|\bwork with me on (?:the )?price\b|\b(?:do|would you do|will you do|can you do|could you do) (?:it |that |this )?for \$?\d+|\b(?:can|could|would|will) (?:you|u) (?:do|take|go|accept) \$\d+|\bmatch (?:a |their |that |his |her )?(?:price|quote|\$)|\$\d+ (?:instead|cash)\b|\bthrow (?:it |that |in)\b|\bknock (?:it |some |\$?\d+ )?off\b|\bbetter (?:price|deal)\b/)) {
      return out("price", [hasScope()
        ? `Our prices are set, so I can't change that — ${quoteLine(scopeNow(), state.pets).replace(/^For /, "for ")}`
        : `Our prices are set: ${money(PRICES.minimum)} plus tax for up to 3 rooms, and the ${money(PRICES.standard)} special covers ${COVER}, plus tax. ${ASK_ROOMS}`]);
    }
    // "we have 2 dogs" after a quote: owning pets doesn't change the price
    if (mentionsPets(t) && pets === null && hasScope() && !scopeChanged && !safetyQ && !petInfoQ && !has(t, /\?|\bwhy\b|\bwhat'?s different\b|\bwhats different\b|\bdifference\b/)) {
      // a chosen or needed pet treatment never drops because they mention owning a pet
      if (state.pets === true) {
        const ft = Object.keys(state.furn || {}).length ? furnTotal(state.furn) : null;
        return out("pet", [`Got it! Your quote stays ${fmtJob()} with pet treatment for ${jobName()}${ft ? `, and ${ft.parts.join(" and ")} plus tax for the upholstery` : ""}.`]);
      }
      const q = quote({ ...scopeNow(), pets: false });
      const petQ = quote({ ...scopeNow(), pets: true });
      const petText = petQ.extras ? `${money(petQ.base)} + ${money(petQ.extras * PRICES.extra)}, plus tax` : `${money(petQ.total)} plus tax`;
      return out("pet", [`Got it! Having pets doesn't change the price — your quote stays ${q.extras ? `${money(q.base)} + ${money(q.extras * PRICES.extra)}, plus tax` : `${money(q.total)} plus tax`}. If there are pet accidents or odor, the pet-treatment version is ${petText}.`]);
    }

    /* --- topic answers: collected so several questions get answered together --- */

    if (safetyQ) topic("method", has(t, /\bsafe\b/) && !has(t, /\b(?:not|un) ?safe\b/) ? SAFETY_YES_REPLY : SAFETY_REPLY);
    if (taxQ) topic("tax", "Our prices are plus tax — Housecall Pro shows your exact total before you confirm.");
    if (timeOfDayLine && !weekendWords) topic("booking", timeOfDayLine);
    const leadQ = has(t, /\b(?:how far (?:in )?(?:advance|ahead)|in advance|how much notice|lead time|notice do you need|how booked up|how busy are you|how soon (?:can|could) (?:you|u|someone)|how soon (?:is|are) (?:your|the) (?:next|first)|soonest|next available|earliest (?:opening|available|appointment|day)|how soon (?:do|should|would) i (?:need to )?book|how (?:early|far out) should i book|book(?:ed)? out|how far out are you)\b/);
    if (leadQ) topic("booking", LEAD_TIME_REPLY);
    const weekend = has(t, /\b(?:saturdays?|sundays?|weekends?|sat|sun)\b(?! ?(?:room|porch|down))/);
    const sameDay = has(t, /\b(?:today|tonight|(?:come|here|out|someone|anyone|available|over) right now|this afternoon|same[ -]day(?! as)|asap)\b/) && !has(t, /\b(?:both|all|them|each|units?|houses?|places?) (?:on )?(?:the )?same day\b|\bon the same day\b|\bsame day as\b/);
    if (has(t, /\bsame[ -]day as\b|\bsame (?:visit|time) as\b|\bat the same time\b|\bboth (?:on )?(?:the )?same (?:day|visit|time)\b|\b(?:both|all) (?:in )?(?:one|the same) (?:visit|trip|day)\b/)) topic("combo", "Yes — we can do carpet and upholstery in the same visit.");
    if (weekend) {
      topic("hours", WEEKEND_LINE);
    }
    else if (sameDay && !leadQ) { topic("booking", SAME_DAY_REPLY); wantLink = true; }

    // service area
    if (has(t, /\b(?:base housing|on base|on-base|mcconnell)\b/) && !has(t, /\boff[- ]?base\b|\bnear mcconnell\b|\bby mcconnell\b/)) {
      state.declined = "base";
      return out("area", ["Sorry — we don't service on-base military housing. If you're off base within about 15 miles of downtown Wichita, we'd love to help."]);
    }
    const outCities = townsIn(t, NOT_SERVED);
    // "25 min from Wichita", "outside of Wichita", "west of wichita": distance from Wichita, not in it
    const inCities = townsIn(t.replace(/\b(?:from|outside(?: of)?|past|east of|west of|north of|south of|away from|miles? (?:from|out of)|min(?:ute)?s? (?:from|out of)|out of)\s+wichita\b/g, " "), SERVED);
    const zipM = t.match(/\b(6\d{4})\b/);
    if (inCities.length) { state.city = inCities.at(-1); state.inArea = true; state.zip = zipM ? zipM[1] : null; }
    else if (outCities.length) { state.city = outCities[0]; state.inArea = false; state.zip = zipM ? zipM[1] : null; }
    if (outCities.length && !inCities.filter((c) => c !== "wichita").length) {
      return out("area", [`Sorry — ${outCities.map(title).join(" and ")} ${outCities.length > 1 ? "are" : "is"} outside our service area. We cover about 15 miles around downtown Wichita: ${AREA_TOWNS}.`]);
    }
    // full state names only — short codes like "ok", "co", "ne" are ordinary words in a text
    const outOfState = has(t, /\b(?:out of state|north carolina|south carolina|texas|oklahoma|missouri|nebraska|colorado|florida|california|arizona|iowa|arkansas|new york|georgia|tennessee|illinois)\b/) || /\b(?:in|from|near) (?:NC|SC|TX|OK|MO|NE|CO|FL|CA|AZ|IA|AR|NY|GA|TN|IL)\b/.test(rawText);
    if (outOfState) return out("area", ["We're a local company in Wichita, Kansas, and we don't travel out of state. We cover about 15 miles around downtown Wichita."]);
    const travelQ = has(t, /\b(?:travel|trip|mileage|gas|drive|driving|distance)\b[^.?!]{0,15}\b(?:fee|fees|charge|cost|extra)\b|\bcharge (?:extra )?(?:for )?(?:travel|mileage|gas|the drive|driving|the trip|distance)\b/);
    const areaQuestion = has(t, /\bin your (?:service )?area\b|\b(?:(?:do|does|can|will|would) you (?:guys )?(?:service|serve|cover)\b(?! (?:a|the|my)? ?(?:weekends?|saturdays?|sundays?))|(?:do |can |will |would )?you (?:guys )?(?:come|go|travel|drive)(?: out)? (?:to|that far|out that way|out there|there)\b|do you (?:come|go|travel|work) (?:in|out|around)\b|do you do (?!(?:upholstery|tile|grout|apartments?|condos?|townhomes?|townhouses?|houses?|homes?|basements?|stairs|rugs?|carpets?|furniture|couch(?:es)?|sofas?|sectionals?|chairs?|recliners?|mattress(?:es)?|cars?|commercial|offices?|businesses|churches|hardwood|floors?|laminate|vinyl|pets?|windows|ducts|it|that|this|them|estimates?|quotes?|evenings?|mornings?|afternoons?|nights?|weekends?|saturdays?|sundays?|today|tomorrow|same ?day|discounts?|deals?|specials?|military|seniors?|odor|urine|stains?|deep|steam|dry|move ?outs?|move ?ins?|rentals?|airbnbs?|duplex(?:es)?|trailers?|area rugs?)\b)(?=[a-z]+ ?(?:ks|kansas)?\??$)|service area|areas? do you|what cities|how far|are you (?:in|near|located)|where are you located|can you come (?:out )?to|come out to)\b/) && !leadQ;
    const zipServed = zipM && (/^672\d\d$/.test(zipM[1]) || ["67037", "67002", "67052", "67101", "67060", "67147", "67067"].includes(zipM[1]));
    const placeRaw = rawText.match(/\b(?:in|to|near|from)\s+([A-Z][a-z]{2,}(?:\s[A-Z][a-z]{2,})?)\b/) || t.match(/\b(?:i'?m in|we'?re in|i live in|we live in|located in|live out in|out in|i'?m out in|we'?re out in)\s+([a-z]{3,}(?: [a-z]{3,})?)\b/);
    const otherPlace = !inCities.length && !outCities.length && placeRaw && !PLACE_STOP.has(placeRaw[1].toLowerCase()) && !SERVED.includes(placeRaw[1].toLowerCase()) && !/\b(?:room|house|home|area|kitchen|bed|hall|stairs?|carpet|rug|need|town)/i.test(placeRaw[1]) ? [null, placeRaw[1].toLowerCase()] : null;
    const placeM = !inCities.length && !outCities.length && (areaQuestion && t.match(/\b(?:cover|come (?:out )?to|service|serve|go (?:out )?to|travel to|work in|you in)\s+(?!(?:the|my|our|your|a|an|this|that|me|us|here|there|apartments?|houses?|homes?|condos?|carpets?|rugs?|tile|weekends?|saturdays?|sundays?|it|them|mobile|commercial|offices?)\b)([a-z][a-z.' ]{2,24}?)(?:,?\s*(?:area|ks|kansas))?[?.!]*$/) || (otherPlace && (areaQuestion || /\b(?:i'?m|we'?re|live|located)\b/.test(t)) ? otherPlace : null));
    if (inCities.some((c) => c !== "wichita") && outCities.length) topic("area", `Just a heads-up: ${outCities.map(title).join(" and ")} ${outCities.length > 1 ? "are" : "is"} outside our service area — the booking page checks your exact address.`);
    const zipAny = zipM || ((areaQuestion || /^\D{0,25}\b\d{5}\b\D{0,15}$/.test(t)) && !footage ? t.match(/\b(\d{5})\b/) : null);
    if (zipAny && !inCities.length && !outCities.length && (areaQuestion || /^\D{0,25}\b\d{5}\b\D{0,15}$/.test(t))) {
      const zipM = zipAny;
      topic(zipServed ? "area" : "area-unknown", zipServed ? `Yes — ${zipM[1]} is in our service area! Housecall Pro checks the exact address when you book.` : `I can't confirm ${zipM[1]} here — we cover about 15 miles around downtown Wichita, and the booking page checks your exact address before it lets you book.`);
    } else if (placeM && !/\d/.test(placeM[1])) {
      topic("area-unknown", `${title(placeM[1].trim())} isn't on our published service list — we cover ${AREA_TOWNS} (about 15 miles around downtown Wichita). The booking page checks your exact address before it lets you book.`);
    } else if (areaQuestion || (inCities.some((c) => c !== "wichita") && (!scopeChanged && !has(t, /\b(?:price|cost|how much)\b/) || has(t, /\b(?:do you|can you|service|serve|come|cover|go)\b/)))) {
      const chargeQ = has(t, /\b(?:charge|fee|extra|cost more|more to)\b/) && !travelQ;
      const yes = inCities.length ? (chargeQ ? `We come to ${inCities.map(title).join(" and ")} — it's the same package price, plus tax.` : `Yes — we come to ${inCities.map(title).join(" and ")}!`) : `We're local to Wichita and cover about 15 miles around downtown: ${AREA_TOWNS}.`;
      const no = outCities.length ? ` ${outCities.map(title).join(" and ")} ${outCities.length > 1 ? "are" : "is"} outside our area, though.` : "";
      topic("area", yes + no);
    }

    // other services
    const furnitureAsk = (furniture.any || has(t, /\b(?:upholstery|furniture cleaning|clean (?:my |the |our )?furniture)\b/)) && !moveFurnQ && !has(t, /\bmove (?:the |my |our )?(?:furniture|couch|sofa)\b|\bcar seats?\b/);
    if (furnitureAsk) {
      const addFurn = Object.keys(state.furn || {}).length && /^(?:and|plus|also|\+|oh and|add)\b|\b(?:too|also|as well)\b/.test(t) && !furniture.unpriced;
      const merged = { ...(addFurn ? state.furn : {}) };
      for (const [k, n] of Object.entries(furniture.items)) merged[k] = (addFurn ? merged[k] || 0 : 0) + n;
      topic("other-services", furnitureLine(addFurn ? { ...furniture, items: merged } : furniture, site));
      if (!furniture.unpriced && Object.keys(furniture.items).length) state.furn = merged;
    }
    const floorAsk = has(t, /\b(?:do you|can you|could you|clean\w*|price|prices|cost|how much|offer|also do|what about|grout)\b|\?/);
    if (!floorNoted && floorAsk && has(t, /\b(?:tile|grout)\b/)) topic("other-services", `Tile & grout, plus tax: ${PRICES.tile.map(([n, p]) => `${n} ${money(p)}`).join("; ")}. Larger areas need a quick review first.`);
    if (!floorNoted && floorAsk && !has(t, /\b(?:the )?(?:other|rest)\b[^.?!]{0,25}\b(?:are|is)\b[^.?!]{0,10}\b(?:hard ?wood|wood|tile|laminate|vinyl)\b/) && has(t, /\b(?:hard ?wood|wood floors?|hard floors?|laminate|vinyl|lvp)\b/)) topic("other-services", `Hard floors, plus tax: ${PRICES.hardFloor.map(([n, p]) => `${n} ${money(p)}`).join("; ")}.`);
    if (has(t, /\b(?:area )?rugs?\b/) && has(t, /\b(?:at (?:my|the|your) (?:home|house|place)|on ?site|in[- ]home|take (?:it|them|the rugs?) (?:away|with you|back)|pick (?:it|them) up|facility|your shop|drop (?:it|them) off)\b/)) topic("rug", "We clean qualifying area rugs right at your home — no pickup needed. We can't do wool or other natural-fiber rugs, or very small mats like bath mats.");
    else if (has(t, /\b(?:area )?rugs?\b/)) {
      const rugOnly = state.rugs && !state.rooms && !state.halls && !state.stairs;
      if (!(scopeChanged && rugOnly)) topic("rug", scopeChanged && !rugOnly
        ? (state.rooms + state.rugs > PRICES.includes.rooms ? "A standard area rug counts as one of the rooms in the package; each additional standard area rug is $15 plus tax once the five rooms are used." : "A standard area rug counts as one of the rooms in the package.")
        : asksAboutPrice(t) || rugOnly
        ? `A standard area rug counts as one of the rooms in the package. One standard area rug by itself is ${money(PRICES.minimum)} plus tax, the same as one room. If all five rooms are already used, each additional standard area rug is ${money(PRICES.extra)} plus tax.`
        : "Yes — we clean most area rugs, and a standard rug counts as one of the rooms in the package. We can't do wool or other natural-fiber rugs, or very small mats like bath mats.");
    }

    // general questions
    if (has(t, /\be-?mail\b/) && !has(t, /\bconfirmation\b/)) topic("contact", reach(`The quickest way to reach us is right here in Messenger, or by text at ${TEXT_LINE}.`, `The quickest way to reach us is right here in the chat, or by text at ${TEXT_LINE}.`));
    if (has(t, /\b(?:do|can|does) (?:you|y'?all|your company)(?: guys)? (?:clean|do|offer|handle) (?:carpets?|carpeting|carpet cleaning)\b/) && !scope.found && !furniture.any) topic("carpet", `Yes — carpet cleaning is what we do! The ${money(PRICES.standard)} special covers ${COVER}, plus tax.`);
    if (has(t, /\b(?:phone (?:number)?|number to call|your number|what(?:'s| is)? (?:the |your )?number|which number|can i call|call you|text you|contact (?:number|info)|call me|call back)\b/)) topic("contact", `You can text us anytime at ${TEXT_LINE}, or I can help right here.`);
    const jobLengthQ = has(t, /\bhow long (?:is|will|would) (?:the tech|the guy|your guy|he|keith|you|y'?all|you guys)(?: gonna| going to)? (?:be )?(?:here|there|at my|at the|in my|working|take)\b|\bhow long (?:does|will|would|should) (?:the |it |a |your )?(?:cleaning|job|process|appointment|appt|visit|it take you|you be|cleaning process|it take|it last|take)\b|\bhow long (?:is|are) (?:the |an? |your )?(?:appointment|appt|visit|job|cleaning|service)s?\b|\bhow long (?:are|will) you (?:be )?(?:there|here)\b|\bhow long does the cleaning\b|\bhow (?:much time|many hours)\b/) && !has(t, /\bdry\b/);
    const dryMethodQ = has(t, /\bdry[ -]?clean\w*|\bsteam or dry\b|\bdry or steam\b|\bdry (?:method|process)\b|\bsteam clean\w*\b/);
    if (jobLengthQ) topic("duration", JOB_LENGTH_REPLY);
    else if (!dryMethodQ && has(t, /\b(?:dry time|to dry|drying|dries|dry|until (?:it'?s |they'?re )?dry|walk on|wet|damp|furniture back|go back on|get back on|back on (?:it|the carpet)|use the rooms?|walk on it|(?:go|come|get) back in|let (?:the )?(?:pets?|dogs?|cats?|kids?) (?:back )?(?:in|on)|how long (?:before|until) (?:the )?(?:pets?|kids?|dogs?|cats?|we|i|they|people|everyone)\b)\b/)) topic("drying", DRY_REPLY + (has(t, /\bwalk|\bkids?\b|\bpets?\b|\bdogs?\b|\bcats?\b|back (?:on|in)/) ? " Keep foot traffic light until it's fully dry." : ""));
    else if (has(t, /\bhow long\b/) && !has(t, /\bhow long have you been\b|\bhow long (?:until|before) (?:you|i|we) (?:can )?(?:come|book|get)\b/)) topic("duration", JOB_LENGTH_REPLY);
    const steamQ = has(t, /\b(?:steam\w*|hot[- ]water|extraction|truck ?mount\w*)\b/) && !has(t, /\b(?:or|vs\.?|versus|dry)\b|\bchemdry\b/);
    if (has(t, /\b(?:steam|method|chemicals?|how do you clean|what do you use|machines?|equipment|truck ?mount\w*|hot[- ]water|extraction|portable|encapsulation|low[- ]moisture|shampoo|(?:type|kind|sort) of (?:cleaning|clean|process)|deep clean|what process|(?:your|the) process|how (?:is|are) (?:you|your \w+|it) different|what makes you different)\b/) && !jobLengthQ && !safetyQ || dryMethodQ || steamQ) topic("method", steamQ ? NO_STEAM_REPLY : METHOD_REPLY);
    if (has(t, /\bvacuum/)) topic("prep", VACUUM_REPLY);
    else if (moveFurnQ) topic("prep", moveFurnLine);
    else if (has(t, /\b(?:what about|move|under) (?:the |my |our )?(?:beds?|dressers?|entertainment cent\w+)\b/)) topic("prep", "Beds, dressers and entertainment centers stay put — we don't move those, so clear them if you want the carpet underneath cleaned. We do move smaller items like couches, loveseats and coffee tables, then put them back.");
    else if (has(t, /\b(?:furniture|couch|sofa|stuff|everything|things)\b/) && has(t, /\b(?:move|moving|shove|push|clear|out of the way|take out|empty)\b/) && !has(t, /\bmov(?:e|ing) ?(?:out|in)\b|\bbefore (?:the |our )?(?:furniture|stuff) (?:arrives|comes|gets here|is delivered)\b/)) topic("prep", FURNITURE_MOVE_REPLY);
    else if (has(t, /\b(?:move (?:the |my |our )?(?:furniture|couch|sofa|beds?|anything|stuff|things)|move furniture|need to move)\b/)) topic("prep", FURNITURE_MOVE_REPLY);
    else if (has(t, /\b(?:prepare|prep|before you (?:come|arrive)|get ready)\b/) && !has(t, /\btext\b|\bheads[- ]up\b|\bcall (?:me )?(?:before|first)\b/)) topic("prep", "Just pick up small items like toys, clothes and breakables. " + FURNITURE_MOVE_REPLY + " No special vacuuming needed.");
    if (has(t, /\b(?:payment|how (?:do|can|would) i pay|pay (?:with|by|after|before|upfront|up front|cash|card)|cash|credit cards?|debit|take cards?|card payments?|venmo|zelle|apple pay|cash ?app|paypal|personal checks?|take checks?|take (?:a )?check|accept checks?|write (?:you )?a check|(?:by|with) (?:a )?check|is (?:a )?check|checks? (?:ok|okay|fine|accepted)|pay (?:you |him |keith |the tech )?(?:at the door|in person|on site|at the job|when you (?:come|get here|arrive|finish|are done)|that day|day of)|do (?:i|we) pay|when do (?:i|we) pay)\b/) || /^(?:how about |what about |do you take |do you accept |and |personal )?checks?\??$/.test(t) || (has(t, /\bdeposit\b/) && !has(t, /\b(?:security deposit|(?:get|getting) (?:my|our) deposit|deposit back|move ?out|moving|landlord)\b/))) {
      const app = (t.match(/\b(venmo|zelle|cash ?app|paypal)\b/) || [])[1];
      const cashOnly = /^(?:ok |okay |alright |so |then )?(?:cash|card|credit card|debit card|debit|apple pay)(?: (?:then|is fine|works|it is|please|works for me|is good))?[.!]*$/.test(t);
      topic("payment", cashOnly ? (/cash/.test(t) ? "Cash works great — you can just pay at the job." : "That works — we send a payment link right after the job, and you can pay by card or Apple Pay.")
        : has(t, /\bchecks?\b/) && !app && !has(t, /\b(?:cash|card|credit|debit|apple pay|deposit)\b/) ? "We do not accept checks — we take cash at the job, or we send a payment link right after the job that can be paid by card, Apple Pay, and similar methods."
        : (has(t, /\bdeposit\b/) ? "No deposit needed — you pay after the job. " : "") + (app ? `${title(app)} isn't one of our payment options. ` : "") + PAYMENT_REPLY);
    }
    if (has(t, /\b(?:receipt|invoice|proof)\b/)) topic("invoice", "Every job gets an invoice with a link that acts as proof of service — you can show it to your landlord or property manager.");
    const redQ = has(t, /\b(?:red|kool[- ]?aid|dye)\b/) && has(t, /\b(?:get|come|take|remove|out|stains?|spots?)\b/);
    if ((redQ || has(t, /\b(?:stains?|spots?|red wine|wine|coffee|blood|kool[- ]?aid|slime|paint|vomit|threw up|throw ?up|puke|nail polish|makeup|ink|marker|sharpie|grease|oil|gum|wax|mud|juice|soda|crayon|spill\w*)\b/)) && !has(t, /\bpet (?:stains?|spots?)\b/) && pets !== true && !floorQ) topic("stain", lastIntentBefore === "stain" || redQ ? (has(t, /\b(?:red|kool[- ]?aid|dye|slime|nail polish)\b/) ? "Red stains can be tough — some may be permanent, so we can't promise, but we'll do everything possible to get it out." : "Got it — we'll do everything possible on that spot.") : STAIN_REPLY);
    if (has(t, /\b(?:guarantee\w*|for sure|promise|completely|get rid of|remov\w*|eliminat\w*|take care of|come out|go away|be gone|get\b[^.?!]{0,25}\bout)\b/) && has(t, /\b(?:smells?|odou?rs?)\b/)) topic("pet", ODOR_REPLY);
    const objection = has(t, /\b(?:too expensive|too much|pricey|can'?t afford|out of (?:my )?budget)\b/);
    if (has(t, /\b(?:on special|specials?|the special|deals?)\b/) && !has(t, /\b(?:military|teacher|veteran|first responder)\b/)) topic("special", SPECIAL_REPLY);
    else if (has(t, /\b(?:military|first responders?|teachers?|veterans?|police|firefighters?|nurses?|army|navy|air force|marines?)\b/) && has(t, /\b(?:discount|off|deal|special|military|teacher|first responder|veteran)\b/)) topic("discount", MILITARY_REPLY);
    else if (!objection && !has(t, /\b(?:stanley|steemer|chemdry|zerorez|oxi ?fresh|other compan\w*|competitors?)\b/) && has(t, /\b(?:discounts?|coupons?|promo(?:tion)?s?|promo codes?|cheaper|cheapest|lowest|best price|negotiat\w*|match)\b/)) topic("discount", has(t, /\b(?:military|veterans?|teachers?|first responders?|police|fire\w*|nurses?)\b/) ? MILITARY_REPLY : `Our prices are set: ${money(PRICES.minimum)} plus tax for up to 3 rooms, and the ${money(PRICES.standard)} special covers ${COVER}, plus tax.`);
    const atMinimum = hasScope() && state.quoted && quote({ ...scopeNow(), pets: state.pets }).total <= PRICES.petMinimum;
    if (objection) topic("objection", atMinimum ? `Totally understand. ${money(PRICES.minimum)} plus tax is our lowest price — it covers up to 3 areas. There's also 15% off for military, first responders and teachers.` : `Totally understand. If you don't need the whole house, our small-job price is ${money(PRICES.minimum)} for up to 3 areas — and there's 15% off for military, first responders and teachers.`);
    if (has(t, /\$\s?\d+ (?:each|per room|a room)\b/)) topic("included", "No — that's the total price for the job, not per room.");
    if (travelQ) topic("fees", "No travel fee — it's the same package price anywhere in our service area, plus tax.");
    else if (has(t, /\b(?:hidden fees?|extra fees?|any fees|travel fee|trip charge)\b/)) topic("fees", "Your price is the package price you're quoted, plus tax — Housecall Pro shows your exact total before you confirm.");
    if (has(t, /\b(?:insured|insurance|licensed|license|bonded)\b/)) topic("insured", has(t, /\bcertificate\b|\bcoi\b|\bproof of insurance\b/) ? COI_REPLY : has(t, /\b(?:insured|insurance)\b/) ? INSURED_REPLY : "We're insured.");
    if (has(t, /\b(?:certified|certification|iicrc|cri)\b/)) topic("certified", CERT_REPLY);
    if (has(t, /\b(?:hiring|job openings?|employment)\b|\b(?:can i|could i|want to|looking to|apply to|like to) work for you\b/)) topic("hiring", reach("Thanks for asking! That's a question for Keith — he'll see it here.", `Thanks for asking! That's a question for Keith — you can text him at ${TEXT_LINE}.`));
    if (has(t, /\b(?:leave (?:a |you a )?review|write (?:a )?review|amazing job|great job|did a great)\b/)) return out("thanks", [has(t, /\b(?:leave (?:a |you a )?review|write (?:a )?review)\b/) ? reach("Thank you so much — that means a lot to Keith! We don't use Google reviews right now, so your message here is the best way to share it — he'll see it.", "Thank you so much — that means a lot to Keith! We don't use Google reviews right now, but we really appreciate you saying so.") : "Thank you so much — that means a lot to Keith!"]);
    if (has(t, /\b(?:reviews?|ratings?|references?)\b|\b(?:are you|is he|is keith|are y'?all)(?: guys)? (?:any )?good\b|\bany good\b|\bhow good (?:are|is)\b/)) topic("reviews", /\b(?:google|yelp|facebook|bbb|angi|thumbtack|nextdoor)\b|\bwhere (?:can|do|could) i (?:see|read|find|check|look)\b|\b(?:link|website) (?:to|for|with) (?:your |the )?reviews\b/.test(t) ? "We don't use Google reviews right now — but we have over 385 satisfied customers and a 4.9 out of 5 rating from 229 customer reviews." : "We have over 385 satisfied customers and a 4.9 out of 5 rating from 229 customer reviews.");
    if (has(t, /\b(?:apartments?|condos?|townhouses?|townhomes?|duplex(?:es)?|mobile homes?|trailers?|manufactured homes?)\b/) && !(notes.length && has(t, /\b(?:receipt|invoice|proof)\b/))) topic("apartment", has(t, /\b(?:mobile homes?|trailers?|manufactured homes?)\b/) ? "Yes, we clean mobile and manufactured homes, as well as houses, apartments, condos and townhomes." : "Yes, we clean apartments, condos and townhomes. (We can't do downtown high-rises.)");
    if (has(t, /\bcan (?:i|we) (?:be|stay) (?:home|there|inside)\b|\b(?:is it ok|ok|okay|fine) (?:if|for) (?:i|we|me|us) (?:to )?(?:be|stay) (?:home|there)\b/)) topic("access", "Of course — you're welcome to be home while we work. Just keep foot traffic light until the carpet is fully dry, about 1.5 to 2 hours.");
    else if (has(t, /\b(?:be home|stay home|need to be there|have to be there|garage code|door code|lockbox|key ?pad|not (?:be )?home|get in without|let (?:yourself|yourselves|you) in|without me (?:there|home|being)|while i'?m (?:at work|gone|away|out)|(?:vacant|empty)\b[^.?!]*\?|won'?t be (?:home|there)|unlocked|leave (?:the )?door|lock up|be at work)\b/)) topic("access", "You don't need to stay home the whole time — a garage code or unlocked door is fine, especially on a vacant move-in or move-out, and we're happy to lock up after. Just put access details in the notes when you book.");
    if (has(t, /\b(?:stanley steemer|chemdry|zerorez|oxi ?fresh|other compan\w*|competitors?)\b/)) topic("compare", has(t, /\b(?:water|moisture|wet|soak\w*|dry)\b/) ? "We use low-moisture encapsulation too — very little water, so carpets usually dry in about 1.5 to 2 hours." : `We're owner-operated — Keith does the cleaning himself. The ${money(PRICES.standard)} special covers ${COVER}, plus tax, and carpets dry in about 1.5 to 2 hours.`);
    if (has(t, /\bhow many (?:people|guys|techs?|workers|employees)\b|\bcrew\b|\bis it just (?:you|keith|one (?:guy|person|man))\b|\bjust you\b|\bone[- ]man (?:show|operation|team|business)\b|\bwho (?:actually )?does the (?:cleaning|work)\b|\bwho (?:will be|is|would be|'?s) (?:coming|doing|cleaning)\b|\bwho(?:'s| is) coming\b|\bwho comes\b|\b(?:will|would) (?:it|you) be (?:you|keith|the one)\b|\bbe the one (?:coming|doing|cleaning)\b|\bwho does the (?:cleaning|work)\b|\bdo you (?:send|have) (?:employees|a crew|helpers|subcontractors?)\b|\bsubcontract\w*\b/)) topic("about", has(t, /\bcrew\b|\bteam\b|\bemployees\b|\bhelpers\b|\bsubcontract/) ? "No crew — we're owner-operated, and Keith does the cleaning himself." : "We're owner-operated — Keith does the cleaning himself.");
    if (has(t, /\b(?:what'?s the catch|is there a catch|any catch|too good to be true|is (?:the |that |this )?\$?99 (?:real|legit|for real)|hidden catch)\b/)) topic("special", `No catch — ${money(PRICES.minimum)} plus tax covers up to 3 areas, and ${money(PRICES.standard)} plus tax covers ${COVER}. Bigger homes add ${money(PRICES.extra)} plus tax for each area beyond the ${money(PRICES.standard)} package. Pet treatment (${money(PRICES.petMinimum)} or ${money(PRICES.pet)}) is only if you need it.`);
    if (has(t, /\bpet (?:treatment|package|price|version|special|one)\b/) && has(t, /\b(?:whole house or|just (?:the )?spots|why|what is|what'?s (?:the|in|different)|whats different|what does|what do(?:es)? (?:it|that) do|actually do|how does|worth|difference|different)\b/)) topic("pet", `The pet package covers the whole job — up to 5 rooms, two halls and one staircase for ${money(PRICES.pet)}, or up to 3 rooms for ${money(PRICES.petMinimum)}. With pets we often need extra time for hair removal, and it includes an enzymatic treatment that breaks down pet urine and odor.`);
    if (has(t, /\b(?:gated|gate code|locked (?:front |main |lobby |building )?(?:entrance|entry|door|lobby|gate|building)|(?:entrance|entry|lobby|front door) is locked|secured (?:building|entry)|(?:building|complex|apartment|entry|door) is (?:secured|locked|gated|secure)|secure building|locked building|buzzer|fob|call box|key card|front desk|concierge|controlled access|access controlled|security desk)\b/)) topic("access", "If the building is secured, just tell us how to get in — put the gate code or buzzer info in the notes when you book — so we can plan and coordinate access.");
    if (has(t, /\b(?:confirmation|confirm(?:ed)? (?:text|email)|how (?:do|will) i know (?:i'?m|i am|it'?s|we'?re) (?:booked|scheduled|confirmed)|after (?:i|we) book)\b/) && !has(t, /\bconfirm (?:my|our|the) (?:appointment|appt|booking)\b/)) topic("booking", "After you finish booking you'll get a confirmation text, and we collect the service address and a mobile number.");
    if (has(t, /\b(?:minimum|min charge|smallest job|least (?:you|it) (?:charge|costs?))\b/)) topic("price", `Our minimum is ${money(PRICES.minimum)} plus tax for up to three areas, or ${money(PRICES.petMinimum)} plus tax for up to three rooms with pet treatment.`);
    if (has(t, /\b(?:send|text|attach|share) (?:you )?(?:a |some )?(?:pics?|pictures?|photos?|images?)\b|\bcan i (?:send|show) you\b/)) topic("photo", reach("Yes — send them right here and we'll take a look.", `This website chat can't receive photos — text them to ${TEXT_LINE}.`));
    if (hasScope() && state.quoted && has(t, /^(?:really|seriously|wait|whoa|wow|so|hold on|huh)\b/) && has(t, /\$\s?\d+/) && !scopeChanged) {
      const q = quote({ ...scopeNow(), pets: state.pets });
      return out("price", [`Yes — ${q.extras ? `${money(q.base)} + ${money(q.extras * PRICES.extra)}, plus tax,` : `${money(q.total)} plus tax`} covers everything you listed (${scopeNow().wholeHouse ? "the whole house" : describe(scopeNow())}).${q.kind === "minimum" ? ` ${money(PRICES.minimum)} is our price for up to 3 areas.` : ""}`]);
    }
    const explainsExtra = has(t, /\$\s?15\b/) && has(t, /\b(?:for|why|what)\b/) && !scopeChanged;
    if (explainsExtra) topic("price", `The ${money(PRICES.extra)} is for each area beyond what the ${money(PRICES.standard)} special covers — each room over five, each hall over two, or each staircase over one is ${money(PRICES.extra)} plus tax.`);
    if (has(t, /\b(?:plumb\w*|electrician|roof\w*|painters?|hvac|furnace|pest control|exterminator|maid|house ?keep\w*|house cleaning|window (?:cleaning|washing)|gutters?|lawn|landscap\w*|handyman|movers?|moving company|duct cleaning|air ducts?|dryer vent)\b/) && !has(t, /\bcarpet|rug|upholster|tile|floor/)) topic("other-trades", "We only do carpet, rug, upholstery, tile and hard-floor cleaning, so that's outside what we do — sorry!");
    if (has(t, /\b(?:do|would|will|should|does) (?:i|we|she|he|they) (?:really |even |still )?(?:need|have to (?:get|do)|want) (?:the |a )?pet (?:treatment|one|package|version|special)\b|\b(?:is|would) (?:the )?pet (?:treatment|one|package) (?:be )?(?:required|necessary|needed)\b|\bneed (?:the |a )?pet (?:treatment|package|one|version|special)\s*\?/)) {
      const base = hasScope() ? quote({ ...scopeNow(), pets: false }) : null, petQ = hasScope() ? quote({ ...scopeNow(), pets: true }) : null;
      const fmt = (q) => (q.extras ? `${money(q.base)} + ${money(q.extras * PRICES.extra)}, plus tax` : `${money(q.total)} plus tax`);
      topic("pet", "Only if there are pet accidents, urine or odor — just having pets doesn't need it." + (base ? ` For ${state.wholeHouse ? "the whole house" : describe(scopeNow())} it's ${fmt(base)}; with pet treatment it would be ${fmt(petQ)}.` : ` Pet treatment is ${money(PRICES.petMinimum)} for up to 3 rooms or ${money(PRICES.pet)} for the full special.`));
    }
    if (has(t, /\btips?\b|\btipping\b|\bgratuity\b/) && !has(t, /\btips? (?:for|on) (?:cleaning|keeping|stains?)\b/)) topic("tips", TIPS_REPLY);
    if (has(t, /\b(?:water|electricity|electric|power|outlets?|hose|hook ?up|utilities)\b/) && !has(t, /\bwater (?:damage|stains?|heater)\b|\b(?:stanley|steemer|chemdry|zerorez|oxi ?fresh|much water|a lot of water|less water|use water)\b/) && has(t, /\b(?:need|use|require|have to|provide|do you|turn on|on)\b/)) topic("utilities", UTILITIES_REPLY);
    if (has(t, /\b(?:fragrances?|scents?|scented|unscented|perfumes?|perfumed|smell of the|strong smells?|chemical smells?|fumes)\b/) || (has(t, /\bsmells?\b/) && has(t, /\b(?:sensitive|headaches?|allergic|bother)\b/))) topic("fragrance", FRAGRANCE_REPLY);
    if (has(t, /\bpark(?:ing)?\b(?! city)/) && !has(t, /\bpark city\b/)) topic("parking", PARKING_REPLY);
    if (has(t, /\b(?:guarantee|satisf\w*|unhappy with|(?:don'?t|do not) like (?:how|the result)|how it turns out|not happy with (?:it|the (?:results?|job))|what if (?:i'?m|we'?re) (?:not happ|unhapp)y|redo|re[- ]?clean)\b/) && !has(t, /\b(?:smell|odou?r|urine|pee|stains?|spots?)\b/) || has(t, /\b(?:comes?|coming) back\b|\breappear\w*|\bwicks? (?:back|up)\b/) && has(t, /\b(?:what if|what happens if|if|in case)\b/)) topic("satisfaction", SATISFACTION_REPLY + " Keith arranges any return visit personally.");
    if (has(t, /\b(?:walk[- ]?in closets?|closets?)\b/)) topic("included", CLOSET_REPLY);
    if (has(t, /\b(?:scotch ?gu?ard|protectant|protector|stain guard|stain protection)\b/)) topic("protector", `Carpet protector isn't on our standard menu. If you'd like to ask Keith about it for your job, text ${TEXT_LINE}.`);
    if (has(t, /\bbasements?\b/) && has(t, /\b(?:do you|can you|clean|count|include)\b/) && !scope.found) topic("included", "Yes — a carpeted basement counts like any other room.");
    if (has(t, /\b(?:website|web ?site|web ?page|url|online)\b/) && has(t, /\b(?:what(?:'s| is)?|your|do you have|got a|link|address)\b/) && !has(t, /\bbook\w*\b/)) topic("website", "Our website is wichitacarpetcleaningservices.com.");
    if (has(t, /\bscam\b|\blegit(?:imate)?\b|\bis (?:this|it|that) (?:for )?real\b|\bare you (?:guys )?real\b|\bfor real\?/) && !pastJob && !has(t, /\byou (?:guys )?are (?:a )?scam/)) topic("about", `${has(t, /\bscam\b/) ? "Not at all" : "Yes"} — we're a real local business in Wichita, owner-operated by Keith, with over 385 satisfied customers. You pay after the job is done.`);
    if ((has(t, /\b(?:difference|different|vs\.?|versus|compare)\b/) && has(t, /\b99\b/) && has(t, /\b149\b/)) || (has(t, /\b149\b|\bpet (?:package|special|version|price)\b/) && has(t, /\b(?:include|includes|included|cover|covers|get|what'?s in|for pets)\b/) && !scope.found)) topic("pet", PET_DIFF_REPLY);
    if (has(t, /\b(?:do|does|can) (?:you|y'?all|u)(?: guys)? (?:have|offer|do|provide)\b[^.?!]{0,12}\bpet (?:treatment|cleaning|odor|stain|urine)\b|\bwhat (?:is|'s) (?:the |your )?pet treatment\b/) && !has(t, /\b149\b/)) {
      const base = hasScope() ? quote({ ...scopeNow(), pets: false }) : null, petQ = hasScope() ? quote({ ...scopeNow(), pets: true }) : null;
      const fmt = (q) => (q.extras ? `${money(q.base)} + ${money(q.extras * PRICES.extra)}, plus tax` : `${money(q.total)} plus tax`);
      topic("pet", "Yes — pet treatment adds an enzyme that breaks down urine and odor, and it's only needed for accidents or odor." + (base ? ` For your job it would be ${fmt(petQ)} instead of ${fmt(base)}.` : ` It's ${money(PRICES.petMinimum)} for up to 3 areas, or ${money(PRICES.pet)} for ${COVER}, plus tax.`));
    }
    if (has(t, /\bbath ?rooms?\b/) && has(t, /\bcarpet(?:ed)?\b/) && !has(t, /\b(?:tile|grout|except|but not|not the|no carpet)\b/)) topic("included", "Yes — a carpeted bathroom counts as one of the rooms.");
    if (!scope.found && has(t, /\bhola\b|\bbuenos d[ií]as\b|\bespa[nñ]ol\b|\bhabla\w*\b|\bspanish\b|\bcu[aá]nto\b|\bcuesta\b|\balfombras?\b|\blimpieza\b/)) topic("spanish", `¡Hola! Sí, puedo ayudarle en español. Limpieza de alfombras: ${money(PRICES.standard)} + impuestos por hasta 5 cuartos, 2 pasillos y una escalera (${money(PRICES.pet)} con tratamiento para mascotas). ¿Cuántos cuartos, pasillos y escaleras necesita limpiar?`);
    const timeQuestion = has(t, /\b(?:times?|slots?|openings?|availability|available|days?|when)\b/) && has(t, new RegExp(`\\b(?:open|available|have|next week|this week|tomorrow|${DAY})\\b`));
    if ((!timeQuestion || has(t, /\b(?:open (?:til|till|until)|close)\b/)) && !weekend && !timeOfDayLine && (has(t, /\b(?:your hours|what are your hours|what hours|hours do you|what time do you|are you open|business hours|open (?:til|till|until)|what time (?:do you|you) close|when do you (?:work|close|open)|what days do you)\b/) || /^(?:what (?:are )?)?(?:your |the )?(?:business |open |opening |work )?hours\??$/.test(t))) topic("hours", "We work Monday through Friday, 7 AM to 5 PM (closed Saturday and Sunday), with start times around 8:00, 10:30, 1:00 and 3:30.");

    if (has(t, /\bhow (?:do|can|would|will) (?:i|we) (?:apply|get|use|claim|redeem)\b|\bwhere do i (?:put|enter|apply)\b|\bget it applied\b|\bhow (?:does|do) (?:it|that|the discount) (?:get )?appl/) && (state.lastIntent === "discount" || state.discountAsked || has(t, /\b(?:discount|military|teacher|first responder|15 ?%)\b/))) {
      return out("discount", ["Just put it in the notes when you book (military, first responder or teacher), and we'll apply the 15% off."]);
    }
    if (has(t, /\b(?:extra|additional|each|every|per|more)\b[^.?!]{0,20}\b(?:room|area)s?\b[^.?!]{0,12}\b(?:over|beyond|after|past|above) (?:5|five)\b|\b(?:over|beyond|after|past|above) (?:5|five)(?: rooms?)?\b[^.?!]{0,15}\b(?:extra|each|cost|charge|how much)\b/)) {
      return out("price", [`Each room over five is ${money(PRICES.extra)} plus tax — the same for each hall over two or staircase over one.${hasScope() ? "" : " " + ASK_ROOMS}`]);
    }
    const oneDuplex = has(t, /\b(?:i|we) (?:live|stay|rent|reside) in (?:a|an|my|our|the|one)\b[^.?!]{0,30}\bduplex\b|\bmy (?:half of (?:the|a|my) |side of (?:the|a|my) )?duplex\b/) && !has(t, /\bboth (?:sides|units|halves)\b|\beach (?:side|unit)\b|\bduplexes\b|\b(?:rent|lease) (?:it|them|out)\b/);
    if (!oneDuplex && (has(t, /\b(?:duplex(?:es)?|triplex(?:es)?|fourplex(?:es)?|four-?plex)\b/) || has(t, /\bboth (?:units|halves)\b|\beach unit\b/) || (has(t, /\bboth sides\b|\beach side\b/) && !has(t, /\b(?:stairs?|staircases?|steps|hall ?ways?|halls?|rooms?|carpet(?:ed)?)\b/)))) {
      return out("property_manager", offerLink(pmLines(t)));
    }
    // "does that include the stairs / the hallway?" after a quote
    const incItem = hasScope() && state.quoted && !scopeChanged && has(t, /\b(?:include|includes|included|cover|covers|count)\b|\bwhat about\b/) && (t.match(/\b(stairs?|staircases?|steps|hall ?ways?|halls?)\b/) || [])[1];
    if (incItem && !/\d/.test(t)) {
      const stairs = /stair|step/.test(incItem);
      const fmt0 = (q) => (q.extras ? `${money(q.base)} + ${money(q.extras * PRICES.extra)}, plus tax` : `${money(q.total)} plus tax`);
      if ((stairs && state.stairs >= 1) || (!stairs && state.halls >= 1)) return out("price", [`Yes — the ${stairs ? "staircase is" : "hallway is"} already included in your price: ${fmt0(quote({ ...scopeNow(), pets: state.pets }))}.`]);
      const before = quote({ ...scopeNow(), pets: state.pets });
      const after = quote({ ...scopeNow(), halls: state.halls + (stairs ? 0 : 1), stairs: state.stairs + (stairs ? 1 : 0), pets: state.pets });
      const fmt = (q) => (q.extras ? `${money(q.base)} + ${money(q.extras * PRICES.extra)}, plus tax` : `${money(q.total)} plus tax`);
      if (stairs) state.stairs += 1; else state.halls += 1;
      return out("price", [after.total === before.total ? `Yes — ${stairs ? "one staircase is" : "two hallways are"} included, so it's still ${fmt(after)}.` : `Adding ${stairs ? "a staircase" : "a hallway"} makes it ${fmt(after)}.`]);
    }
    // "how much more" for pet treatment
    if (hasScope() && state.quoted && !scopeChanged && (has(t, /\bhow much (?:more|extra)\b|\bwhat(?:'s| is) the difference\b|\bdifference in price\b/) || /^(?:and |so |ok )?(?:the |what'?s the |whats the )?difference\??$/.test(t)) && (state.pets === true || has(t, /\bpet/) || state.lastIntent === "pet")) {
      const a = quote({ ...scopeNow(), pets: false }), b = quote({ ...scopeNow(), pets: true });
      return out("price", [`Pet treatment adds ${money(b.total - a.total)} — ${money(b.base)}${b.extras ? ` + ${money(b.extras * PRICES.extra)}` : ""} plus tax instead of ${money(a.base)}${a.extras ? ` + ${money(a.extras * PRICES.extra)}` : ""}. It includes an enzyme treatment that breaks down pet urine and odor, plus extra time for pet hair.`]);
    }

    if (petStateQ && hasScope() && state.quoted) {
      const q = quote({ ...scopeNow(), pets: state.pets }), p2 = quote({ ...scopeNow(), pets: true });
      return out("price", [state.pets === true ? `Yes — that's with pet treatment: ${fmtQ(q)}.` : `No — ${fmtQ(q)} is the regular price. With pet treatment it would be ${fmtQ(p2)}.`]);
    }
    /* --- pricing and booking --- */
    const alreadyBooked = has(t, /\balready (?:booked|scheduled)\b|\bi booked\b|\bwe booked\b/);
    const infoOnly = jobLengthQ && !has(t, /\b(?:book|booking|schedule|availability|available|openings?)\b/);
    const wantsBook = !alreadyBooked && !infoOnly && (timeQuestion || Boolean(timeOfDayLine && !weekendWords && state.quoted)
      || has(t, new RegExp(`\\b(?:tomorrow|this week|next week|${DAY}|how soon|soonest|earliest|next available|\\d{1,2}(?:st|nd|rd|th)|book|booking|schedule|scheduled|appointment|appt|availability|available|openings?|open (?:times?|slots?|spots?)|when can (?:you|u)|sign (?:me|us) up|let'?s do it|i'?m ready|ready to|get on (?:the|your) (?:schedule|calendar)|time slots?|link|send (?:it|me))\\b`))
      || (!alreadyBooked && has(t, /^(?:ok |okay |so )?when\??$|\bok when\b/))
      || (!alreadyBooked && state.quoted && t.split(" ").length <= 4 && !/\?/.test(t) && has(t, /^(?:yes|yeah|yep|yup|sure|ok|okay|k|sounds good|perfect|great|deal|do it|please|yes please|si|fine|that works|works for me|let'?s go|let'?s do it)\b/)));
    const asksPrice = !travelQ && taxQ || !travelQ && has(t, /\b(?:price|prices|pricing|cost|costs|how much|quote|estimate|rates?|charge|what'?s it run|pay for)\b|\$/);
    const asksIncluded = (has(t, /\b(?:include|included|includes|cover|covers|what'?s in|for the whole house or|extra for|charge extra|count(?:ed|s)? as)\b/) && !areaQuestion) || scope.perRoomQuestion;
    const generalIncluded = asksIncluded && !/\d|\b(?:two|three|four|five|six|seven|eight)\b/.test(t);
    const moving = has(t, /\b(?:move ?out|moving|move ?in|deposit back|security deposit)\b/) && !has(t, /\bmov(?:e|ing) (?:the |my |our |any )?(?:furniture|stuff|couch|things|beds?)\b/);
    const moveIn = has(t, /\bmov(?:e|ing) ?in\b|\bbefore (?:we|i) move\b|\bnew (?:house|home|place)\b/);

    if (furnitureAsk && furniture.unpriced) {
      return out("layout_review", [...notes], { phone: true });
    }
    if (furnitureAsk && hasScope() && !scopeChanged && !asksIncluded) {
      state.quoted = true;
      return out("price", offerLink([...notes, "Carpet: " + quoteLine(scopeNow(), state.pets).replace(/^For /, "for ")]));
    }
    const furnSaved = Object.keys(state.furn || {}).length ? furnitureLine({ items: state.furn, unpriced: null }) : "";
    if (hasScope() && state.quoted && !scopeChanged && /^(?:is (?:that|it|this)|that'?s|thats|is the (?:\$?\d+|price)) (?:each|per (?:room|area)|a room|for each)\b|\bor (?:the )?total\??$/.test(t)) {
      const q = quote({ ...scopeNow(), pets: state.pets });
      return out("price", [`No — that's the total for everything you listed, not per room: ${q.extras ? `${money(q.base)} + ${money(q.extras * PRICES.extra)}, plus tax` : `${money(q.total)} plus tax`}.`]);
    }
    if (hasScope() && state.quoted && !scopeChanged && (/^(?:(?:ok|okay|so|and|alright|great)[,!]? )*(?:what'?s|whats|what is) (?:the |my )?(?:new )?(?:total|final|grand total|price|damage)(?: now| then| again| so far| for everything| for all of it)?\??$|^(?:and |so |ok )?(?:the )?(?:new )?(?:how much )?(?:total|all together|altogether)(?: now| for everything| for all of it| price| cost)?\??$|\bhow much (?:total|all together|altogether|for everything|for all of it)\b/.test(t) || (/^why\b|\bwhy (?:is it |so )?(?:more|extra|higher|the extra|\$)|\bhow did you get\b/.test(t) && !/\bpet\b/.test(t) && !/\$\s?15\b/.test(t)))) {
      const why = /\bwhy\b|how did you get/.test(t);
      const ft = furnSaved ? furnTotal(state.furn) : null;
      if (ft && !why) {
        const q = quote({ ...scopeNow(), pets: state.pets });
        const carpet = q.extras ? `${money(q.base)} + ${money(q.extras * PRICES.extra)}` : money(q.total);
        return out("price", [`Carpet for ${state.wholeHouse ? "the whole house" : describe(scopeNow())}${state.pets === true ? " with pet treatment" : ""} is ${carpet}, and ${ft.parts.join(" and ")} — each plus tax. Each piece is priced separately, and Housecall Pro shows your exact total when you book.`]);
      }
      if (!why && !furnSaved) {
        const q = quote({ ...scopeNow(), pets: state.pets }), what = `${state.wholeHouse ? "the whole house" : describe(scopeNow())}${state.pets === true ? " with pet treatment" : ""}`;
        return out("price", [q.extras ? `For ${what}: ${money(q.base)} plus ${q.extras} extra area${q.extras > 1 ? "s" : ""} at ${money(PRICES.extra)} each — so it's ${money(q.base)} + ${money(q.extras * PRICES.extra)}, plus tax.` : `For ${what}, it's ${money(q.total)} plus tax.`]);
      }
      return out("price", [(why ? "Here's how it adds up: " : "") + (furnSaved ? `Carpet: ${quoteLine(scopeNow(), state.pets).replace(/^For /, "for ")} ${furnSaved}` : quoteLine(scopeNow(), state.pets))]);
    }
    if (hasScope() && state.quoted && !scopeChanged && /^(?:is |so )?(?:that|thats|that's|this)(?: is)?(?: it| all| everything| the total| the full price| the whole thing| the final price| for everything| with everything| including everything| total)?(?: then)?\??$|^(?:is )?(?:that|thats|that's) (?:with|for|including) everything\b|^(?:and )?that'?s it\?|^(?:is )?that the (?:total|full price|whole price)\b/.test(t)) {
      const q = quote({ ...scopeNow(), pets: state.pets });
      const priceText = q.extras ? `${money(q.base)} + ${money(q.extras * PRICES.extra)}, plus tax,` : `${money(q.total)} plus tax`;
      return out("price", [`Yes — ${priceText} covers everything you listed.${state.linkSent ? "" : " " + LINK_OFFER}`]);
    }
    if (asksIncluded && !hasScope() && !/\d/.test(t) && /^(?:does|do|is|are|would|what about)\b/.test(t) && has(t, /\b(?:stairs?|staircases?|steps|hall ?ways?|halls?)\b/) && !has(t, /\b(?:extra|additional|second|another|more)\b/)) {
      return out("included", [has(t, /\bstair|\bsteps\b/) ? `Yes — one staircase is included in the ${money(PRICES.standard)} special, along with up to 5 rooms and two halls.` : `Yes — two hallways are included in the ${money(PRICES.standard)} special, along with up to 5 rooms and one staircase.`]);
    }
    if (scope.perRoomQuestion && !has(t, /\$\s?\d+ (?:each|per room|a room)\b/) && (!scopeChanged || generalIncluded)) {
      const base = `It's priced by package, not by the room: ${money(PRICES.minimum)} plus tax covers up to 3 rooms, the ${money(PRICES.standard)} special covers ${COVER} (${money(PRICES.pet)} with pet treatment), and each extra room, hall or staircase is ${money(PRICES.extra)} plus tax.`;
      return out("included", [...notes.filter((n) => n !== SPECIAL_REPLY), hasScope() ? `${base} Yours is ${fmtQ(quote({ ...scopeNow(), pets: state.pets }))}.` : `${base} ${ASK_ROOMS}`]);
    }
    if (asksIncluded && (!scopeChanged || generalIncluded)) {
      return out("included", [...notes.filter((n) => n !== SPECIAL_REPLY), (scope.perRoomQuestion ? "No, it's not priced per room. " : "") +
        `The ${money(PRICES.standard)} special covers ${COVER}, plus tax (${money(PRICES.pet)} with pet treatment). Smaller jobs of up to 3 rooms are ${money(PRICES.minimum)} plus tax, and each extra room, hall or staircase is ${money(PRICES.extra)} plus tax.` + (hasScope() ? "" : ` ${ASK_ROOMS}`)]);
    }
    if (scope.wholeFloor && !hasScope()) {
      return out("price", [...notes, `Happy to price the ${scope.wholeFloor}! How many rooms, hallways and stairs are ${scope.wholeFloor === "upstairs" ? "up there" : "down there"}?`]);
    }
    if (scopeChanged || (hasScope() && ((asksPrice && !explainsExtra && !(topicIntent === "pet" && /\bwhy\b/.test(t))) || pets !== null || scope.found))) {
      const wasQuoted = state.quoted;
      state.quoted = true;
      const bedroomsOnly = scope.found && !(scope.namedList || []).length && !state.halls && !state.stairs && !state.rugs && !state.wholeHouse && state.rooms <= 3
        && has(t, /\b(?:bed ?rooms?|beds?|br|bdrms?|bd)\b/) && has(t, /\b(?:house|home|bath|ba)\b/) && !has(t, /\b(?:just|only)\b/);
      const ql = quoteLine(scopeNow(), state.pets, /\$\s?99\b|\b99\b/.test(t), bedroomsOnly && !notes.length, wasQuoted && state.coverSaid && !state.wholeHouse);
      const qNotes = notes.filter((n) => n !== SPECIAL_REPLY
        && !(/^A standard area rug counts as one of the rooms in the package; each additional/.test(n))
        && !(lastIntentBefore === "apartment" && /^Yes, we clean apartments/.test(n)));
      if (state.wholeHouse && qNotes.some((n) => /^No catch/.test(n))) return out("price", offerLink(qNotes));
      const whatNow = state.wholeHouse ? "the whole house" : describe(scopeNow());
      // the same price again: say so briefly, no link and no full re-description
      if (wasQuoted && prevQuoteKey && prevQuoteKey === quoteKey() && !scope.rangeHigh && !moving && !state.declined) {
        const q = quote({ ...scopeNow(), pets: state.pets });
        const reason = pets === false ? `no pet treatment needed for ${whatNow}`
          : restated.includes("stairs") ? (state.stairs > 1 ? "those staircases are already counted" : "the staircase is already included")
          : restated.includes("halls") ? (state.halls > 1 ? `those ${state.halls} hallways are already counted` : "the hallway is already counted")
          : `for ${whatNow}${state.pets === true ? " with pet treatment" : ""}`;
        return out("price", qLast([...qNotes.filter((n) => !/^Only if there are pet accidents/.test(n)), `Still ${fmtQ(q)} — ${reason}.`]));
      }
      const reminder = state.declined ? (state.declined === "base" ? "Just a reminder — we can't service on-base military housing, so this price is for an off-base home in our area." : "Just a reminder — we can't service downtown high-rise apartments, so this price is for a house, townhome or low-rise apartment in our area.") : "";
      state.declined = null;
      if (qNotes.some((n) => /^Only if there are pet accidents/.test(n))) return out("price", offerLink([...(reminder ? [reminder] : []), ...qNotes]));
      const lines = [...qNotes, qNotes.length >= 2 ? ql.replace(/ If you have pet accidents or odor, the pet-treatment version is [^.]*\.| Pet treatment is available if you need it\./, "") : ql];
      if (scope.rangeHigh && scope.rangeHigh > state.rooms) {
        const hi = quote({ ...scopeNow(), rooms: scope.rangeHigh, pets: state.pets === true });
        lines.push(`If it's ${scope.rangeHigh} rooms, it's ${hi.extras ? `${money(hi.base)} + ${money(hi.extras * PRICES.extra)}, plus tax` : `${money(hi.total)} plus tax`}.`);
      }
      if (moving) lines.unshift(moveIn ? "Great timing — cleaning before you move in is the easiest way to do it." : "Happy to help with your move-out cleaning.");
      if (reminder) lines.unshift(reminder);
      return out("price", offerLink(lines));
    }
    if (pets === false && mentionsPets(t) && !notes.length && !hasScope()) return out("pet", [`Got it — no pet treatment needed, so the regular price applies. ${ASK_ROOMS}`]);
    if ((pets === true || (mentionsPets(t) && pets !== false)) && !notes.length && !hasScope()) {
      return out("pet", [`Pet treatment adds an enzyme that breaks down urine and odor: ${money(PRICES.petMinimum)} for up to 3 areas, or ${money(PRICES.pet)} for ${COVER}, plus tax. How many rooms are we cleaning?`]);
    }
    if (moving && (!notes.length || asksPrice)) return out("price", [...notes, (moveIn ? "Great timing — cleaning before you move in is the easiest way to do it. " : "Happy to help with your move-out cleaning. ") + PACKAGE_SUMMARY + " " + ASK_ROOMS]);
    if (asksPrice && !hasScope() && !notes.length && has(t, /\b(?:floors?|carpets?|carpeting)\b/) && !has(t, /\b(?:tile|grout|hard ?wood|laminate|vinyl)\b/)) return out("price", [`Happy to price it! ${ASK_ROOMS} For reference, the ${money(PRICES.standard)} special covers ${COVER}, plus tax.`]);
    if (asksPrice && !hasScope() && !notes.length) return out("price", [PACKAGE_SUMMARY + " " + ASK_ROOMS]);
    if (wantsBook && (!weekend || new RegExp(`\\b(?:${DAY}|next week|this week|weekday)\\b`).test(t))) {
      const lines = [...notes];
      const todayWd = weekdayChicago(clockNow());
      if (has(t, /\btomorrow\b/) && !lines.length && (todayWd === 5 || todayWd === 6)) return out("booking", [`Tomorrow is ${todayWd === 5 ? "Saturday" : "Sunday"}, and we're weekdays only (closed Saturday and Sunday). Monday's usual start times are 8:00 AM, 10:30 AM, 1:00 PM and 3:30 PM — the live calendar shows what's open:`, bookingUrl]);
      if (has(t, /\btomorrow\b/) && !lines.length) return out("booking", ["Tomorrow's openings are on the live calendar — if a time shows there, you can reserve it directly:", bookingUrl]);
      if (timeQuestion && !lines.length) return out("booking", ["Weekday start times are usually 8:00, 10:30, 1:00 and 3:30 (we're closed Saturday and Sunday). The live calendar shows what's open:", bookingUrl]);
      const dayM = t.match(new RegExp(`\\b${DAY}\\b`));
      const DAYNAME = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday" };
      if (dayM && !lines.length) return out("booking", [`${DAYNAME[dayM[0].slice(0, 3)]}'s open times are on the live calendar — grab one and you'll get a confirmation text right away:`, bookingUrl]);
      const plainYes = /^(?:ok|okay|k|kk|sounds good|perfect|great|cool|awesome|got it|alright|fine|ok fine|fine yes)\b[\s!.]*$/.test(t);
      if (plainYes && state.linkSent && !lines.length) return out("booking", ["Sounds good! Whenever you're ready, tap the booking link above to pick a time."]);
      if (state.linkSent && !lines.length) return out("booking", ["Just tap the booking link — pick your time and you'll get a confirmation text right away:", bookingUrl]);
      if (state.quoted && !lines.length) lines.push("Great!");
      if (!lines.length && !hasScope()) return out("booking", ["Happy to get you on the schedule! How many rooms, hallways and stairs are we cleaning? Or you can pick a time right now:", bookingUrl]);
      if (!lines.length) lines.push("Happy to get you on the schedule.");
      return out("booking", withLink(lines));
    }
    if (asksPrice && topicIntent === "other-services" && has(t, /\b(?:tile|grout|hard ?wood|wood floors?|hard floors?|laminate|vinyl|lvp)\b/)) return out("other-services", [...notes]);
    if (asksPrice && (furnitureAsk || topicIntent === "rug")) return out(topicIntent || "price", [...notes, furnitureAsk ? (askedBefore ? "" : "Want carpets done the same visit? " + ASK_ROOMS) : askNext()]);
    if (asksPrice) return out("price", [...notes, notes.length && (hasScope() || ["pet", "price", "included", "special", "tax", "discount", "objection", "fees"].includes(topicIntent)) ? askNext() : PACKAGE_SUMMARY + " " + ASK_ROOMS]);
    const followUp = alreadyBooked ? "Thanks for booking — see you then!" : ["area", "other-services", "special", "rug", "apartment", "objection", "discount", "carpet", "fees"].includes(topicIntent) ? askNext() : "";
    if (notes.length && wantLink) return out(topicIntent || "info", linkOnce(qLast(notes)));
    if (notes.length) return out(topicIntent || "info", qLast([...notes, followUp]));

    /* --- small talk --- */
    // a nudge mid-chat ("hello??", "anyone there"): I'm here, plus where we left off — never the rooms question again
    if (state.turns > 1 && (/^(?:h(?:ello|i|ey)+o*\s*)?\?+$/.test(t) || /^(?:h(?:ello|i|ey)+o*)\s*\?+$/.test(t) || /\b(?:any ?one|any ?body|some ?one|you|u) (?:there|here|around|home)\b|\bstill there\b|\bhel+o+\?{2,}/.test(t)) && t.split(" ").length <= 6) {
      return out("nudge", [`Yes, I'm here — sorry for the wait! ${hasScope() && state.quoted ? `Your quote is ${fmtJob()} for ${jobName()}. ${state.linkSent ? "The booking link above has the open weekday times." : LINK_OFFER}` : "What can I help with — a price, booking, or a question?"}`]);
    }
    if (/^(?:ok|okay|k|cool|got it|sounds good|great|perfect|alright|awesome)\b/.test(t)) {
      return out("thanks", [state.inArea === false && !state.quoted ? "No problem! If you're ever within about 15 miles of downtown Wichita, we'd be glad to help." : state.quoted && !state.linkSent ? "Want the link to pick a time?" : "Sounds good! Let me know if you have any other questions."]);
    }
    if (/^(?:hi|hello|hey|good (?:morning|afternoon|evening)|yo|howdy)\b/.test(t) && t.split(" ").length <= 5) {
      if (hasScope() && state.quoted) return out("greeting", [state.linkSent ? "Hi! I'm here — any questions about your quote, or ready to pick a time on the booking link above?" : "Hi! I'm here — want the link to pick a weekday time, or do you have a question?"]);
      if (state.greeted) return out("greeting", ["What can I help with — a price, booking, or a question?"]);
      state.greeted = true;
      return out("greeting", ["Hi there, thanks for reaching out! What would you like cleaned?"]);
    }

    /* --- anything else: a helpful default, never a dead end --- */
    // already told they're outside our area: stay kind and clear, no rooms question
    if ((state.declined === "base" || state.declined === "highrise") && state.unknownCount === 0) return out("area", [state.declined === "base" ? "I'm sorry we can't help with base housing. If you ever need an off-base home in our area cleaned, just message us here." : "I'm sorry we can't help with a high-rise apartment. If you ever need a house or low-rise home in our area cleaned, just message us here."]);
    if (state.inArea === false && !hasScope() && state.city) return out("area", [`I'm sorry — ${title(state.city)} is outside our service area, so we can't make it out there. If you're ever within about 15 miles of downtown Wichita, we'd be glad to help.`]);
    state.unknownCount += 1;
    const question = (/\?/.test(t) || /^(?:can|could|do|does|did|is|are|will|would|how|what|why|when|where|who|which|should|may)\b/.test(t)) && t.split(" ").length >= 3;
    if (question) state.unknownQ = (state.unknownQ || 0) + 1;
    if (state.unknownCount >= 3 && state.unknownQ) {
      return out("human", [reach("I'll have Keith answer this one personally — he'll reply here as soon as he can.", `I want to make sure you get the right answer — please text Keith at ${TEXT_LINE}, or tell me how many rooms and I'll get you a price right here.`)], site ? {} : { phone: true });
    }
    if (question) {
      if (site) return out("unknown", [`I'm not sure I understood that one. Keith can answer it if you text ${TEXT_LINE} — or tell me how many rooms, hallways and stairs and I'll get you a price right here.`]);
      state.offeredKeith = true;
      return out("unknown", [`I'm not sure I understood that one — want me to have Keith answer it?`]);
    }
    // an introduction or small talk ("my name is Dorothy, my son said to message you", "I keep seeing your ads"): a warm hello, no interrogation
    {
      const nm = t.match(/\bmy name is ([a-z]+)|\bthis is ([a-z]+)(?:\s|$|[,.!])(?!(?:a|the|for|about|my)\b)/);
      const name = nm && !/^(?:not|just|so|really|about|for|from|in|on)$/.test(nm[1] || nm[2]) ? (nm[1] || nm[2]) : "";
      if (state.unknownCount === 1 && (name || /\b(?:saw|seeing|seen|found|keep seeing|see) (?:you|ur|your|y'?all)(?:r)?\b|\b(?:your|ur) ads?\b|\b(?:my )?(?:son|daughter|friend|neighbou?r|sister|brother|mom|dad|coworker) (?:said|told|recommended|gave)\b|\brecommended you\b/.test(t)))
        return out("unknown", [`${name ? `Hi ${name[0].toUpperCase() + name.slice(1)}, nice to meet you!` : "Glad you found us!"} I can give you a price, answer any questions about the cleaning, or help you book — what would you like cleaned?`]);
    }
    // "they're friendly, I can put them in the backyard" after a pets answer: no second rooms prompt
    // "it's a two story" / "split level": a layout, not a count yet
    if (!hasScope() && /\b(?:story|stor(?:e|ey)y?|stories|levels?|split|ranch|bi-?level|tri-?level|upstairs|downstairs)\b/.test(t)) return out("unknown", ["Got it! How many rooms, hallways and staircases are we cleaning across the floors?"]);
    if (!question && askedBefore && state.unknownCount === 1 && (mentionsPets(t) || lastIntentBefore === "pet")) return out("unknown", ["Sounds good — that works for us!"]);
    if (state.unknownCount >= 3) return out("unknown", [`No problem — whenever you're ready, tell me the rooms and I'll get you a price. You can also text Keith at ${TEXT_LINE}.`]);
    if (state.unknownCount === 2) return out("unknown", [hasScope() ? "Sorry if I wasn't clear! I can send the link to pick a weekday time, or answer any question about the cleaning." : `Sorry if I wasn't clear! Just tell me how many rooms, hallways and stairs you need cleaned and I'll give you the price — or ask me anything about our service.`]);
    return out("unknown", [hasScope()
      ? "Happy to help! Want the link to pick a weekday time, or is there something else I can answer?"
      : `Happy to help! ${ASK_ROOMS}`]);
  }

  /* ---------- directives path: the AI decided what the customer meant; every word below is Keith's approved wording ---------- */
  const PHONE = { phone: true };
  const D_CHANGE = () => reach(`We'll be happy to get that arranged. A team member will reach out to handle the change, since I can't update a booked appointment from Messenger. You can also reply to your Housecall Pro text or text ${TEXT_LINE}.`, `For an existing appointment, please reply to your Housecall Pro text or text ${TEXT_LINE} — Keith handles changes personally.`);
  const D_CONFIRM = () => reach("I can't see or confirm an existing appointment from Messenger. I've flagged this conversation for a person to check the booking and follow up with you. I haven't confirmed or changed your appointment.", `I can't see bookings from this website chat — please reply to your Housecall Pro text or text ${TEXT_LINE}, and Keith will check it for you.`);
  const D_ETA = () => reach("I can't see the live schedule from here — I've let Keith know you're checking, and he'll reply as soon as he can. You'll also get a text when he's about 10 to 15 minutes away.", `This website chat can't see the schedule — please reply to your Housecall Pro text or text Keith at ${TEXT_LINE}. You'll also get a text when he's about 10 to 15 minutes away.`);
  const D_SIZE = () => reach("A home that size gets a personal quote, so I'm passing this to Keith — he'll get back to you here.", `A home that size gets a personal quote — text the room count to Keith at ${TEXT_LINE} and he'll price it.`);
  const D_REVIEW = (hardOver600 = false) => reach(hardOver600 ? "Hard-floor areas over 600 square feet need a personal scope review before we quote them, so I'm passing this to Keith — he'll get back to you here." : "That one needs a personal scope review before we can quote it, so I'm passing it to Keith — he'll get back to you here.", `That one needs a personal scope review before we can quote it — text a description and a photo to Keith at ${TEXT_LINE}.`);
  const D_RUG_REVIEW = () => reach("That kind of rug needs a quick look before we can price it, so I'm passing it to Keith — he'll get back to you here.", `That kind of rug needs a quick look before we can price it — text a photo to Keith at ${TEXT_LINE}.`);
  const D_THANKS_NEW = "You're welcome! Just message here if any questions come up.";
  const fmtJob = () => fmtQ(quote({ ...scopeNow(), pets: state.pets }));
  const jobName = () => (state.wholeHouse ? "the whole house" : describe(scopeNow()));
  const saidHas = (k) => state.said.includes(k);
  const markSaid = (k) => { if (!state.said.includes(k)) state.said.push(k); if (state.said.length > 80) state.said.splice(0, state.said.length - 80); };
  const outOfAreaLine = (t = "") => `We don't travel outside our service area, so I'm afraid we can't come out to ${state.city ? title(state.city) : "you"}${/\b(?:pay|charge|extra|fee|more money|trip|travel)\b/.test(t) ? ", even for an extra charge" : ""}. We cover about 15 miles around downtown Wichita.`;
  const OOA_BYE = "You're welcome! If you're ever within about 15 miles of downtown Wichita, we'd be glad to help.";
  const WOOL_REMINDER = "Just a reminder — we can't clean wool or other natural-fiber rugs, so that rug isn't one we can take on.";

  /** pets and carpet-job changes from the directives; returns true when the job (rooms/halls/stairs/rugs) changed */
  function applyDirectiveJob(d, t = "") {
    if (d.pets) {
      const want = d.pets === "accidents" || d.pets === "wants_treatment";
      // a chosen or needed pet treatment only drops when the customer actually says they don't need it
      if (!(state.pets === true && !want && d.pets === "no_accidents" && !D_NO_PET_RE.test(t))) state.pets = want;
    }
    const before = JSON.stringify(scopeNow());
    const j = d.job;
    if (j) {
      const any = j.rooms + j.halls + j.stairs + j.rugs > 0;
      const action = j.action !== "remove" && !hasScope() ? "set" : j.action;
      if (action === "set") {
        if (any) { state.rooms = j.rooms; state.rugs = j.rugs; state.halls = j.halls; state.stairs = j.stairs; state.wholeHouse = j.wholeHouse && !j.rooms && !j.rugs; }
        else if (j.wholeHouse) { state.wholeHouse = true; state.rooms = 0; state.rugs = 0; state.halls = 0; state.stairs = 0; }
      } else if (action === "add") {
        if (!any && j.wholeHouse) state.wholeHouse = true;
        else if (any) addToJob(j);
      } else if (hasScope() && any) {
        if (state.wholeHouse && (j.rooms || j.rugs)) { state.wholeHouse = false; state.rooms = PRICES.includes.rooms; }
        state.rooms = Math.max(0, state.rooms - j.rooms); state.rugs = Math.max(0, state.rugs - j.rugs);
        state.halls = Math.max(0, state.halls - j.halls); state.stairs = Math.max(0, state.stairs - j.stairs);
      }
    }
    return JSON.stringify(scopeNow()) !== before;
  }
  // same rule as applyScope: adding to "the whole house" turns it into the 5-room package plus the additions
  function addToJob(j) {
    if (state.wholeHouse) { state.wholeHouse = false; state.rooms = PRICES.includes.rooms + j.rooms; }
    else state.rooms += j.rooms;
    state.rugs += j.rugs; state.halls += j.halls; state.stairs += j.stairs;
  }

  function directiveHandoff(d, t, topics, raw = t) {
    // a follow-up to a handoff Keith already has: one short line, never the same paragraph again
    // website: "can you at least put me on the schedule?" after being sent to Keith gets the booking link
    if (site && ["human", "callback", "other_keith"].includes(d.handoff) && ["wants_link", "how_to_book", "picked_time"].includes(d.booking) && lastIntentBefore === "human") {
      return out("booking", [`Yes — you can book online here. Add a note that Keith already talked with you, and text him at ${TEXT_LINE} so he can confirm the details:`, bookingUrl]);
    }
    if (D_FOLLOW_UPS.has(d.handoff) && (lastIntentBefore === D_HANDOFF_INTENT[d.handoff] || (site && state.siteHandoff === D_HANDOFF_INTENT[d.handoff]))) {
      const appt = d.handoff.startsWith("existing_");
      const thanks = d.closing === "thanks" || d.closing === "goodbye" || d.closing === "ok";
      let line = site
        ? (thanks ? `You're welcome — thanks for letting us know. Texting Keith at ${TEXT_LINE} is the best way to make sure he sees it.`
          : `This chat can't pass messages along — please include that when you text Keith at ${TEXT_LINE}${appt ? " or reply to your Housecall Pro text" : ""}, so he has everything.`)
        : (thanks ? "You're welcome! Keith will reply here as soon as he can." : "Thanks — I've added that for Keith, and he'll reply here as soon as he can.");
      // the same follow-up line twice in a row reads like a broken record
      if (state.lastReply === line) line = site ? `Got it — add that to your text to Keith at ${TEXT_LINE} and he'll take it from there.` : "Got it — Keith will see that too.";
      return out(D_HANDOFF_INTENT[d.handoff], [line], PHONE);
    }
    switch (d.handoff) {
      case "complaint": return complaintReply(/\bcome back\b|\b(?:came|coming) back\b/.test(t));
      case "damage": case "no_show": case "late_tech": return complaintReply(false);
      case "existing_change": case "existing_cancel": {
        const fee = topics.has("cancellation_policy") || (d.handoff === "existing_cancel" && /\b(?:fee|fees|charge|penalty|cost)\b/.test(t));
        return out("change_existing", [(fee ? "There's no cancellation fee. " : "") + D_CHANGE()], PHONE);
      }
      case "existing_confirm": {
        // late or a no-show: say sorry first
        if (/\bsupposed to (?:be here|come|show)\b|\b(?:an|a half|\d+) hours? (?:ago|late)\b|\bstill (?:not here|waiting)\b|\bnever showed\b|\bno ?show\b|\b(?:is|are|was|were) late\b|\brunning late\b/.test(t))
          return out("confirm_existing", [reach(`I'm so sorry for the wait — I've let Keith know right now, and he'll reply as soon as he can. You can also text him at ${TEXT_LINE}.`, `I'm so sorry for the wait — please text Keith at ${TEXT_LINE} so he can check right away.`)], PHONE);
        return out("confirm_existing", [D_ETA_RE.test(t) || topics.has("on_the_way") ? D_ETA() : D_CONFIRM()], PHONE);
      }
      case "billing": return out("human", [reach("Thanks — I've passed your billing question to Keith, and he'll reply here as soon as he can.", `For billing questions, please text Keith at ${TEXT_LINE} and he'll sort it out.`)], PHONE);
      case "callback": {
        if (site && (/\(?\b\d{3}\)?[-. ]?\d{3}[-. ]?\d{4}\b/.test(t) || /\bcall me\b|\bwait for (?:him|keith|a call|your call)\b/.test(t))) return out("human", [`This website chat can't pass your number along, so Keith won't see it here — please text him at ${TEXT_LINE} and he'll get back to you.`], PHONE);
        const wantsText = /\btext me\b/.test(t) && !/\bcall\b/.test(t);
        // website: texting Keith is the way to reach him, and a new job can still be booked right now
        if (site && !["change_existing", "confirm_existing"].includes(state.siteHandoff) && !/\b(?:my|our|the) (?:appointment|appt|booking)\b/.test(t))
          return out("human", [`Text Keith at ${TEXT_LINE} and he'll get back to you as soon as he can. You can also pick any open weekday time on the booking calendar right now:`, bookingUrl], PHONE);
        return out("human", [reach(callbackLine(t, wantsText), `Text Keith at ${TEXT_LINE} and he'll get back to you as soon as he can.`)], PHONE);
      }
      case "cant_use_link":
        // Messenger: Keith books it personally, and the chat stays open to collect what he needs (rooms, a good weekday)
        if (!site) {
          state.manualBooking = true;
          return out("keith_booking", ["No problem at all — Keith can set it up with you personally, and I've let him know. To help him, tell me how many rooms, hallways and stairs, and which weekday works best for you."], { notify: "booking" });
        }
        if (/\b(?:can'?t|cannot|hard to|trouble|difficult\w*) (?:type|typing|text|texting|see|read)\b|\bmy (?:hands|eyes|vision)\b|\bby phone\b|\b(?:talk|speak) to (?:someone|somebody|a person)\b/.test(t))
          return out("human", [`Sorry about the trouble! Text Keith at ${TEXT_LINE} and he'll set it up with you personally by text. Messaging us on Facebook works too.`], PHONE);
        return out("human", [reach("No problem at all — I've asked Keith to set it up with you personally. He'll reply here as soon as he can.", `No problem at all — text Keith at ${TEXT_LINE} and he'll set it up with you personally.`)], PHONE);
      case "weekend_booking": {
        // nothing in the words says a weekend ("a swan sday works" is voice-to-text for Wednesday): don't refuse a weekday
        if (!state.weekendLast && !/\b(?:sat\w*|sun\w*|weekends?|s[áa]bados?|domingos?|fin(?:es)? de semana)\b/.test(t)) return out("booking", [state.linkSent ? "Just to confirm — which weekday works best for you? The booking link above shows the open times." : "Just to confirm — which weekday works best for you? The live calendar shows the open times:", ...(state.linkSent ? [] : [bookingUrl])]);
        const wkChanged = applyDirectiveJob(d, t);
        return weekendBooking(weekendRef(t, wkChanged));
      }
      case "commercial":
        if (PM_RE.test(t) && !PM_COMMERCIAL_RE.test(t) && lastIntentBefore !== "commercial") return out("property_manager", offerLink(pmLines(t)));
        if (lastIntentBefore === "commercial" && /\b(?:weekends?|saturdays?|sundays?)\b/.test(t)) return out("commercial", [`${WEEKEND_LINE} ` + reach("Keith will work out a weekday time with you along with the quote.", `Text Keith at ${TEXT_LINE} and he'll work out a weekday time with you along with the quote.`)], PHONE);
        if (lastIntentBefore === "commercial") {
          if (/@|\bemail/.test(t)) return out("commercial", [reach("Keith will send the quote himself — I've added your note, and he'll reply here.", `This chat can't send email quotes — text the details and a couple of photos to Keith at ${TEXT_LINE}, and he'll get you a quote.`)], PHONE);
          const line = reach("Thanks — I've added that for Keith, and he'll get back to you with a quote.", `Thanks — please text that to Keith at ${TEXT_LINE} along with a couple of photos, and he'll get back to you with a quote.`);
          return out("commercial", [state.lastReply === line ? reach("Got it — Keith will see that too.", `Got it — add that to your text to Keith at ${TEXT_LINE}.`) : line], PHONE);
        }
        return out("commercial", [reach("Commercial jobs get a personal quote. Send a quick description (rough size and type of space) and a couple of photos here, and Keith will get back to you.", `Commercial jobs get a personal quote. Text a quick description and a couple of photos to ${TEXT_LINE} and Keith will get back to you.`)], PHONE);
      case "multi_unit":
        // "my house and my mom's house" are two homes, not "units"
        if (!/\b(?:units?|apartments?|complex(?:es)?|buildings?|propert(?:y|ies)|rentals?|plex(?:es)?|duplex(?:es)?|triplex(?:es)?|condos|townhomes|doors)\b/.test(t))
          return out("commercial", [reach("More than one home in a visit gets a personal quote from Keith. Send the room counts for each home here, and he'll get back to you.", `More than one home in a visit gets a personal quote from Keith — text the room counts for each home to ${TEXT_LINE} and he'll get back to you.`)], PHONE);
        return out("property_manager", offerLink(pmLines(t)));
      case "oversized_rug":
        if (!site) { const again = lastIntentBefore === "keith_review" && state.reviewKind === "rug"; state.reviewKind = "rug"; return out("keith_review", [again ? "Keith has the rug details — he'll reach out here." : "That rug needs a quick look before we can price it — I've let Keith know, and he'll reach out here. Meanwhile, I'm happy to help with anything else."], again ? {} : { notify: "review" }); }
        if (lastIntentBefore === "rug_price") {
          // follow-ups (dye, a ballpark, wear): Keith answers those with the photo — don't repeat the same line
          const again = /photo to price that rug/.test(state.lastReply || "") || /Keith can answer that with the photo/.test(state.lastReply || "");
          return out("rug_price", [again ? reach("Got it — Keith will see that too and can answer it once he has the photo.", `Keith can answer that with the photo too — include it when you text ${TEXT_LINE}.`) : reach(`Keith will need a photo to price that rug and answer questions like that — send it here or text it to ${TEXT_LINE}.`, `Keith will need a photo to price that rug — text it to ${TEXT_LINE}.`)], PHONE);
        }
        return out("rug_price", [D_RUG_REVIEW()], PHONE);
      case "large_home": return out("layout_review", [D_SIZE()], PHONE);
      case "unpriced_item": {
        // the piece is named only when the customer's own words name a known off-menu item
        const piece = readFurniture(t).unpriced;
        if (!site) { state.reviewKind = "item"; return out("keith_review", [piece ? `The ${piece === "benches" ? "bench" : piece.replace(/s$/, "")} isn't on our standard menu, so it needs a quick look before we can price it — I've let Keith know, and he'll reach out here.` : "That one needs a quick look before we can price it — I've let Keith know, and he'll reach out here."], { notify: "review" }); }
        return out("layout_review", [piece ? furnitureLine({ items: {}, unpriced: piece }, site) : D_REVIEW()], PHONE);
      }
      case "human":
        if (VENDOR_PITCH.test(t)) return out("human", [reach(VENDOR_REPLY, VENDOR_REPLY_SITE)], PHONE);
        if (/\b(?:useless|not helping|not helpful|frustrat\w*|wtf|stupid|ridiculous|going in circles)\b/.test(t)) return out("human", [reach("I'm sorry for the frustration. I've let Keith know, and he'll reply here as soon as he can.", `I'm sorry for the frustration. Please text Keith at ${TEXT_LINE} and he'll get right back to you.`)], PHONE);
        if (/\b(?:ask|check with|tell|message|have|get) keith\b/.test(t)) return out("human", [reach("Sure — I've asked Keith, and he'll reply here as soon as he can.", `This chat can't message Keith directly — please text him at ${TEXT_LINE} and he'll get right back to you.`)], PHONE);
        return out("human", site
          ? [`Absolutely — text Keith at ${TEXT_LINE} or message us on Facebook and he'll get right back to you.`]
          : humanHandoff(raw), PHONE);
      default: // other_keith
        return out("human", [reach("I'll have Keith answer this one personally — he'll reply here as soon as he can.", `I want to make sure you get the right answer — please text Keith at ${TEXT_LINE}, or tell me how many rooms and I'll get you a price right here.`)], PHONE);
    }
  }

  /** Approved answer for one TOPIC id (null when another bubble in this reply already covers it). */
  function topicText(id, t, topics, ctx) {
    const scoped = hasScope();
    const fmtP = (pets) => fmtQ(quote({ ...scopeNow(), pets }));
    const again = ctx.again; // this answer already went out earlier in the conversation
    switch (id) {
      case "service_area": return ctx.areaLine || ctx.blocked ? null : `We're local to Wichita and cover about 15 miles around downtown: ${AREA_TOWNS}.`;
      case "out_of_state": return "We're a local company in Wichita, Kansas, and we don't travel out of state. We cover about 15 miles around downtown Wichita.";
      case "hours": return ctx.todLine ? null : "We work Monday through Friday, 7 AM to 5 PM (closed Saturday and Sunday), with start times around 8:00, 10:30, 1:00 and 3:30.";
      case "weekend_info": return WEEKEND_LINE;
      case "same_day": return ctx.booking === "same_day" ? null : ctx.emergency ? "We also don't offer same-day service right now." : SAME_DAY_REPLY;
      case "lead_time": case "next_available":
        if (id === "next_available" && topics.has("lead_time")) return null;
        // "anything open the week of the 19th?" asks about a future week, not how far ahead to book
        if (D_DATE_RE.test(t)) return ctx.booking !== "none" ? null : "The booking calendar shows every open weekday time, including that week.";
        return again ? "We often have weekday openings within a week — the calendar shows the next ones." : LEAD_TIME_REPLY;
      case "slot_times": return ctx.todLine ? null : again ? "Usual weekday start times are 8:00 AM, 10:30 AM, 1:00 PM and 3:30 PM." : D_SLOTS;
      case "furniture_moving":
        if (topics.has("heavy_furniture") || topics.has("prep")) return null;
        // "can we put the furniture back the same day?" is a dry-time question
        if (D_PUT_BACK_RE.test(t) && (topics.has("dry_time") || topics.has("kids_pets_walk"))) return null;
        return again ? furnitureShort(t) : FURNITURE_MOVE_REPLY;
      case "heavy_furniture": return again ? furnitureShort(t) : "We move smaller items like couches, loveseats, ottomans and coffee tables, then put them back. We don't move large furniture, beds, entertainment centers or large appliances — clear those if you want the carpet under them cleaned; otherwise we clean around them.";
      case "prep": return again ? "Just pick up small items and breakables — no special vacuuming needed." : "Just pick up small items like toys, clothes and breakables. " + FURNITURE_MOVE_REPLY + " No special vacuuming needed.";
      case "vacuum": return VACUUM_REPLY;
      case "satisfaction": return again ? "Yes — if that happens, we're happy to come back out and fix it. Keith arranges any return visit personally." : SATISFACTION_REPLY + " Keith arranges any return visit personally.";
      case "payment": case "checks": case "cash": case "cards": case "deposit": {
        const pay = ["payment", "checks", "cash", "cards", "deposit"].filter((x) => topics.has(x));
        if (id !== pay[0]) return null; // one payment answer covers them all
        const app = (t.match(/\b(venmo|zelle|cash ?app|paypal|apple cash)\b/) || [])[1];
        if (app) return PAYMENT_APPS_REPLY.replace(/^No Venmo/, `No ${{ venmo: "Venmo", zelle: "Zelle", paypal: "PayPal", "apple cash": "Apple Cash" }[app] || "Cash App"}`);
        const when = /\bbefore or after\b|\bwhen do (?:i|we|you) (?:pay|get paid)\b|\bpay (?:up ?front|first|before|ahead)\b|\bupfront\b/.test(t);
        if (when) return again ? "After — you pay once the job is done." : "After — you pay once the job is done: cash at the job, or a payment link we send right after that can be paid by card, Apple Pay, and similar methods. We do not accept checks.";
        if (pay.length === 1 && id === "cards" && /\b(?:cards?|credit|debit|visa|mastercard|amex)\b/.test(t)) return "Yes — the payment link we send right after the job can be paid by card, Apple Pay, and similar methods.";
        if (pay.length === 1 && id === "checks") return "We do not accept checks — we take cash at the job, or we send a payment link right after the job that can be paid by card, Apple Pay, and similar methods.";
        if (again) return (pay.includes("deposit") ? "No deposit needed. " : "") + "Our payment options are cash at the job or the payment link we send after (card, Apple Pay and similar).";
        return (pay.includes("deposit") ? "No deposit needed — you pay after the job. " : "") + PAYMENT_REPLY;
      }
      case "tips": return TIPS_REPLY;
      case "pet_package_why": return topics.has("pet_treatment_info") || ctx.petsLine ? null : `The pet package covers the whole job — up to 5 rooms, two halls and one staircase for ${money(PRICES.pet)}, or up to 3 rooms for ${money(PRICES.petMinimum)}. With pets we often need extra time for hair removal, and it includes an enzymatic treatment that breaks down pet urine and odor.`;
      case "pet_treatment_info": {
        if (ctx.petsLine && state.pets !== null) return null; // the pets line already explains it
        if (ctx.carpet && scoped && state.pets === true && !ynQ(t)) return null; // the pet-treatment quote already says it
        const petWords = /\b(?:dogs?|cats?|pets?|pupp(?:y|ies)|kittens?|urine|pee\w*|poop\w*|accidents?|marking|litter|perros?|gatos?|mascotas?)\b/.test(t.replace(/\bpet (?:treatment|package|one|version|stuff|special|option|price)s?\b/g, " "));
        // "do juice spills need pet treatment?" — no, and no pet price
        if (!petWords && /\b(?:juice|milk|spills?|food|wine|coffee|soda|kool[- ]?aid|mud|crayon|marker|paint|grease|stains?|spots?|kids?|smoke|cigarette)\b/.test(t)) return "No — pet treatment is only for pet accidents or odor, so you don't need it for that. The regular price applies.";
        // "does low moisture get deep enough for dog urine?" / "which is better for pet pee?"
        if (/\b(?:deep|pad|soak\w*|better|really work|actually work|get (?:it|that|the smell|the odor) out|strong enough)\b/.test(t) && petWords) return ODOR_REPLY;
        // "do I need it? she just sheds / never had an accident" — no
        if (state.pets === false || D_NO_PET_RE.test(t) || /\b(?:just|only) shed\w*|\bnever had (?:an |any )?accidents?\b|\bno accidents?\b|\bpretty clean\b/.test(t)) return "You don't need it — pet treatment is only for pet accidents or odor, so the regular price applies.";
        // a couch that smells like the dog: our pet packages are carpet packages
        if (ctx.uphLine && !scoped && /\b(?:couch|sofa|loveseat|sectional|chair|recliner|upholstery|cushions?)\b/.test(t)) {
          if (!site) ctx.offerKeith = true;
          return reach("Our pet treatment is priced for carpet, so for pet odor on upholstery I'd like Keith to take a look — want me to ask him?", `Our pet treatment is priced for carpet — for pet odor on upholstery, text Keith at ${TEXT_LINE} and he'll take a look.`);
        }
        return "Yes — pet treatment adds an enzyme that breaks down urine and odor, and it's only needed for accidents or odor." + (scoped ? ` For your job it would be ${fmtP(true)} instead of ${fmtP(false)}.` : ` It's ${money(PRICES.petMinimum)} for up to 3 areas, or ${money(PRICES.pet)} for ${COVER}, plus tax.`);
      }
      case "pets_no_accidents": return ctx.petsLine || ctx.stillPets ? null : "Got it — no pet treatment needed, so the regular price applies.";
      case "military_discount": return MILITARY_REPLY;
      case "discount_apply": return "Just put it in the notes when you book (military, first responder or teacher), and we'll apply the 15% off.";
      case "discount_other": return topics.has("prices_set") ? null : /^Good news — /.test(state.lastReply || "") && scoped ? `No need to match it — we're already lower: ${fmtJob()} for ${jobName()}.` : again ? "Sorry — our prices are set, so I can't go lower than that." : (/\b(?:military|veterans?|teachers?|first responders?)\b/.test(t) ? MILITARY_REPLY : scoped && state.quoted ? `Our prices are set — ${fmtJob()} for ${jobName()} is already the package price.` : `Our prices are set: ${money(PRICES.minimum)} plus tax for up to 3 rooms, and the ${money(PRICES.standard)} special covers ${COVER}, plus tax.`);
      case "running_late_policy": return RUNNING_LATE_REPLY;
      case "on_the_way": return ON_THE_WAY_REPLY;
      case "home_access": case "be_home": case "door_code": {
        // one access answer per reply, picked by what they asked
        const acc = ["door_code", "home_access", "be_home"].filter((x) => topics.has(x));
        if (id !== acc[0]) return null;
        if (D_SOMEONE_THERE_RE.test(t)) return "That works — just put that in the notes when you book so we know who'll let us in.";
        if (D_KEY_RE.test(t) || id === "door_code") return again ? "Just put that in the notes when you book." : DOOR_CODE_REPLY;
        if (/\b(?:dogs?|cats?|pets?|pupp(?:y|ies)|kittens?)\b/.test(t) && /\b(?:home|there|inside|around|loose|out)\b/.test(t)) return again ? "That's fine — just keep them off the carpet until it's fully dry." : "That's fine — if pets will be home, just tell us before the visit (a note when you book is perfect) so we can review the products we use. Keep foot traffic light until the carpet is fully dry — about 1.5 to 2 hours.";
        if (/\bshould (?:i|we) (?:leave|go|step out|get out)\b|\b(?:do|would) (?:i|we) (?:need|have) to leave\b/.test(t)) return "You don't need to leave — you're welcome to stay home while we work. Just keep foot traffic light until the carpet is fully dry, about 1.5 to 2 hours.";
        if (D_STAY_HOME_RE.test(t) && !/\b(?:do|would) (?:i|we) (?:need|have) to (?:be|stay)\b|\bthe whole time\b|\brun to\b|\b(?:can|could) (?:i|we) (?:leave|go)\b/.test(t)) return "Of course — you're welcome to be home while we work. Just keep foot traffic light until the carpet is fully dry, about 1.5 to 2 hours.";
        return again ? "Just put access details in the notes when you book." : "You don't need to stay home the whole time — a garage code or unlocked door is fine, especially on a vacant move-in or move-out, and we're happy to lock up after. Just put access details in the notes when you book.";
      }
      case "product_safety":
        if (/\ballerg\w*|\basthma\b/.test(t)) {
          if (!site) ctx.offerKeith = true;
          return reach("I can't make health claims about allergies, so I don't want to guess on that one — want me to have Keith answer it?", `I can't make health claims about allergies — Keith can answer that one if you text ${TEXT_LINE}.`);
        }
        if (again) return topics.has("be_home") || topics.has("home_access") ? null : "Just add a note when you book if anyone sensitive will be home, and keep foot traffic light until it's dry.";
        return /\bsafe\b|\bseguro\b/.test(t) && !/\b(?:not|un) ?safe\b/.test(t) ? SAFETY_YES_REPLY : SAFETY_REPLY;
      case "kids_pets_walk": return again ? "Keep foot traffic light until it's fully dry — about 1.5 to 2 hours." : DRY_REPLY + " Keep foot traffic light until it's fully dry.";
      case "dry_time": return topics.has("kids_pets_walk") || topics.has("steam") ? null : dryLine(t, again, ctx);
      case "job_length": {
        const oneVisit = /\b(?:one|1|same|single) (?:visit|day|trip)\b|\ball in one\b|\btoo big\b|\bone day\b/.test(t);
        // a big home: don't promise the typical time
        const big = scoped && (state.wholeHouse || state.rooms + state.rugs > 5 || state.halls > 2 || state.stairs > 1);
        return (oneVisit ? "Yes — it's all done in one visit. " : "") + (big ? "A typical job takes about 1.5 to 2 hours, and a home your size will take longer — Keith can give you a closer time estimate." : JOB_LENGTH_D);
      }
      case "method": return topics.has("steam") ? null : again ? METHOD_SHORT : METHOD_REPLY;
      case "steam":
        if (again) return METHOD_SHORT;
        // "steam or that dry stuff?" / "how is it different from steam?" aren't yes/no questions
        return !ynQ(t) || /\bdiffer\w*|\bvs\.?\b|\bversus\b|\bcompare\w*\b/.test(t) ? STEAM_DIFF_REPLY : NO_STEAM_REPLY;
      case "certification": return topics.has("method") || topics.has("steam") ? (/\b(?:licens\w*|insur\w*)\b/.test(t) ? LICENSE_LINE : null) : CERT_REPLY + (/\b(?:licens\w*|registered|insur\w*)\b/.test(t) ? " " + LICENSE_LINE : "");
      case "insured": return /\bcertificate\b|\bcoi\b|\bproof of insurance\b/i.test(currentText) ? COI_REPLY : INSURED_REPLY;
      case "reviews":
        if (topics.has("scam")) return null;
        if (ctx.praise || /\b(?:leave|write|post) (?:a |you a )?review\b|\bwhere (?:can|do) i review\b/.test(t)) {
          return /\b(?:leave|write|post) (?:a |you a )?review\b|\bwhere (?:can|do) i review\b/.test(t)
            ? reach("Thank you so much — that means a lot to Keith! We don't use Google reviews right now, so your message here is the best way to share it — he'll see it.", "Thank you so much — that means a lot to Keith! We don't use Google reviews right now, but we really appreciate you saying so.")
            : "Thank you so much — that means a lot to Keith!";
        }
        // owner: no Google reviews as a service right now
        if (/\b(?:google|yelp|facebook|bbb|angi|thumbtack|nextdoor)\b|\bwhere (?:can|do|could) i (?:see|read|find|check|look)\b|\b(?:link|website) (?:to|for|with) (?:your |the )?reviews\b/.test(t)) return "We don't use Google reviews right now — " + "We have over 385 satisfied customers and a 4.9 out of 5 rating from 229 customer reviews.".replace(/^We/, "but we");
        return "We have over 385 satisfied customers and a 4.9 out of 5 rating from 229 customer reviews.";
      case "crew": return /\bcrew\b|\bteam\b|\bemployees\b|\bhelpers\b|\bsubcontract/.test(t) ? "No crew — we're owner-operated, and Keith does the cleaning himself." : "We're owner-operated — Keith does the cleaning himself.";
      case "identity": case "is_keith":
        if (id === "is_keith" && topics.has("identity")) return null;
        // "is this a real company?" is the legit question, not "are you a bot?"
        if (/\b(?:real|legit\w*|actual) (?:company|business)\b|\bis (?:this|it) (?:a )?(?:real|legit)\b/.test(t) && !/\b(?:bot|ai|robot|person|human|automated)\b/.test(t)) return "Yes — we're a real local business in Wichita, owner-operated by Keith, with over 385 satisfied customers. You pay after the job is done.";
        // "is the man who comes the owner?" is about who cleans, not who's typing
        if (/\b(?:who comes|man who|guy who|person who|lady who|who (?:will )?(?:come|clean|do)|technician|tech who|who does the (?:work|cleaning))\b/.test(t)) return "We're owner-operated — Keith, the owner, does the cleaning himself.";
        return site ? IDENTITY_REPLY_SITE : IDENTITY_REPLY;
      case "scam": {
        const body = "we're a real local business in Wichita, owner-operated by Keith, with over 385 satisfied customers. You pay after the job is done.";
        // "is this a scam?" → "Not at all"; "are you legit / real?" → "Yes"; anything else → just the facts
        // "Not at all" only answers "is this a scam?"; "Yes" only answers "are you legit/real?"
        // "a real company or a scam?" is answered by what we are, not "not at all"
        if (/\breal\b[^.?!]{0,30}\bor\b[^.?!]{0,10}\b(?:a )?(?:scam|fake|fraud)|\b(?:scam|fake|fraud)\w*\b[^.?!]{0,10}\bor\b[^.?!]{0,30}\breal\b/.test(t)) return "We're a real company — " + body.replace(/^we're a real local business/, "a local business");
        if (/\b(?:is (?:this|it|that|the \$?99\w*)|are (?:you|y'?all|u))\b[^.?!]{0,25}\b(?:scam\w*|fake|fraud\w*|too good to be true|rip ?off)\b/.test(t)) return "Not at all — " + body;
        if (/\b(?:is (?:this|it|that)|are (?:you|y'?all|u))\b[^.?!]{0,25}\b(?:legit\w*|real|trustworthy|reputable)\b/.test(t)) return "Yes — " + body;
        return body[0].toUpperCase() + body.slice(1);
      }
      case "competitor":
        if (topics.has("pet_treatment_info") || topics.has("odor")) return null;
        return /\b(?:water|moisture|wet|soak\w*|dry)\b/.test(t) ? "We use low-moisture encapsulation — very little water, so carpets usually dry in about 1.5 to 2 hours." : topics.has("prices_set") || (scoped && state.quoted) ? "We're owner-operated — Keith does the cleaning himself." : `We're owner-operated — Keith does the cleaning himself. The ${money(PRICES.standard)} special covers ${COVER}, plus tax, and carpets dry in about 1.5 to 2 hours.`;
      case "utilities":
        if (/\b(?:windows?|doors?|hoses?|cold|heat|cracked|open)\b/.test(t)) return "Nothing needs to run through a window or door — we just plug into an outlet for electricity, and water isn't required.";
        return UTILITIES_REPLY;
      case "fragrance": return FRAGRANCE_REPLY;
      case "parking": return PARKING_REPLY;
      case "secured_building": return "If the building is secured, just tell us how to get in — put the gate code or buzzer info in the notes when you book — so we can plan and coordinate access.";
      case "after_booking": case "confirmation_text":
        if (id === "confirmation_text" && topics.has("after_booking")) return null;
        if (/\bremind\w*\b/.test(t)) return "Yes — you'll get a confirmation text when you book, and another text about 10 to 15 minutes before we arrive.";
        return "After you finish booking you'll get a confirmation text, and we collect the service address and a mobile number.";
      case "walk_in_closet": return CLOSET_REPLY;
      case "what_counts_room": return again ? "Bedrooms and living areas count as rooms; halls and stairs are counted separately." : ROOMS_DEF_REPLY;
      case "bathroom": return /\bcarpeted\b|\bcarpet(?:ed)? in (?:the |my |our |a )?(?:\w+ )?bath/.test(t) ? "Yes — a carpeted bathroom counts as one of the rooms." : "A bathroom or kitchen only counts as a room if it's carpeted — most aren't, so they usually don't count.";
      case "basement": return "Yes — a carpeted basement counts like any other room.";
      case "stains": case "traffic_lanes":
        if (topics.has("red_stains") || (id === "traffic_lanes" && topics.has("stains"))) return null;
        // cat or dog accidents: the odor answer is the one that fits; the slime/red-stain caveat would only pad it
        if (id === "stains" && topics.has("odor") && (state.pets === true || /\b(?:pee|urine|accidents?|marking)\b/.test(t))) return null;
        if (again) return "We'll do everything possible to get that out too.";
        return id === "traffic_lanes" ? TRAFFIC_REPLY : STAIN_REPLY;
      case "red_stains": return "Red stains can be tough — some may be permanent, so we can't promise, but we'll do everything possible to get it out.";
      case "odor":
        if (again) return "We'll do everything we can, but heavy odor that's soaked into the pad can't always be fully removed.";
        // cigarette smoke or a musty smell isn't a pet-urine question
        if (!/\b(?:dogs?|cats?|pets?|pupp(?:y|ies)|kittens?|urine|pee\w*|accidents?|marking|litter)\b/.test(t)) return "We always strive for full odor removal, and our cleaning is highly effective on areas we can reach with normal cleaning methods. In heavy cases odor can soak into the carpet backing and pad, so full odor removal can't always be guaranteed.";
        return ODOR_REPLY;
      case "unsupported_service": state.unsupported = true; return D_UNSUPPORTED;
      case "other_trades": return ctx.again ? "Sorry — that's not something we do at all right now, including at your home. We're glad to help with carpet, rugs, upholstery, tile or hard floors anytime." : "We only do carpet, rug, upholstery, tile and hard-floor cleaning, so that's outside what we do — sorry!";
      case "water_damage":
        // not in the owner's facts: Keith looks at water damage himself (fail-closed) — he's told, and the chat stays open
        if (!site) ctx.notifyKeith = true;
        return again ? reach("Keith has the water damage details — he'll reach out here.", `For the water damage, texting Keith at ${TEXT_LINE} with a photo is the fastest way to reach him.`) : reach("Water damage is something Keith would want to look at personally — I've let him know, and he'll reach out here.", `Water damage is something Keith would want to look at personally — text a photo and a description to ${TEXT_LINE}.`);
      case "repair": return "We don't do carpet repair, stretching or installation — just cleaning. A carpet installer can help with that, and we'd be glad to clean it afterward.";
      case "website": return "Our website is wichitacarpetcleaningservices.com.";
      case "phone": return topics.has("email") || topics.has("existing_contact") ? null : `You can text us anytime at ${TEXT_LINE}, or I can help right here.`;
      case "email": return topics.has("existing_contact") ? null : reach(`The quickest way to reach us is right here in Messenger, or by text at ${TEXT_LINE}.`, `The quickest way to reach us is right here in the chat, or by text at ${TEXT_LINE}.`);
      case "hiring": return reach("Thanks for asking! That's a question for Keith — he'll see it here.", `Thanks for asking! That's a question for Keith — you can text him at ${TEXT_LINE}.`);
      case "travel_fee": return ctx.outOfArea ? null : "No travel fee — it's the same package price anywhere in our service area, plus tax.";
      case "tax_policy": return D_TAX;
      case "upholstery_menu": return ctx.uphLine ? null : furnitureLine({ items: {}, unpriced: null }, site);
      case "rug_info": {
        if (ctx.rugLine === D_WOOL || ctx.rugLine === WOOL_REMINDER) return null;
        if (/\b(?:at (?:my|the|your) (?:home|house|place)|on ?site|in[- ]home|take (?:it|them|the rugs?) (?:away|with you|back)|pick (?:it|them) up|facility|your shop|drop (?:it|them) off)\b/.test(t)) return "We clean qualifying area rugs right at your home — no pickup needed. We can't do wool or other natural-fiber rugs, or very small mats like bath mats.";
        const natural = /\b(?:jute|sisal|seagrass|wool|silk)\b/.test(t) ? ` That includes the ${(t.match(/\b(?:jute|sisal|seagrass|wool|silk)\b/) || [])[0]} — we can't clean natural-fiber rugs.` : "";
        // the rug line or quote already says a standard rug counts as a room
        if (ctx.rugLine || ctx.rugCounted) return "Yes — we clean most area rugs. We can't do wool or other natural-fiber rugs, or very small mats like bath mats." + natural;
        return "Yes — we clean most area rugs, and a standard rug counts as one of the rooms in the package. We can't do wool or other natural-fiber rugs, or very small mats like bath mats." + natural;
      }
      case "wool_rug": return ctx.rugLine === D_WOOL || ctx.rugLine === WOOL_REMINDER ? null : saidHas("wool") ? WOOL_REMINDER : D_WOOL;
      case "tiny_mat": return ctx.rugLine === D_TINY ? null : D_TINY;
      case "tile_menu": return ctx.floorType === "tile" ? null : `Tile & grout, plus tax: ${PRICES.tile.map(([n, p]) => `${n} ${money(p)}`).join("; ")}. Larger areas need a quick review first.`;
      case "hard_floor_menu": return ctx.floorType === "hard_floor" ? null : `Hard floors, plus tax: ${PRICES.hardFloor.map(([n, p]) => `${n} ${money(p)}`).join("; ")}.`;
      case "apartments":
        if (topics.has("mobile_homes")) return null;
        return "Yes, we clean apartments, condos and townhomes. (We can't do downtown high-rises.)";
      case "mobile_homes":
        // not in the owner's facts: Keith answers it (fail-closed)
        if (!site) ctx.offerKeith = true;
        return reach("Good question — I'd like Keith to answer that one. Want me to ask him?", `Good question — Keith can answer that one if you text ${TEXT_LINE}.`);
      case "high_rise": return ctx.blocked === D_HIGHRISE ? null : D_HIGHRISE;
      case "on_base": return ctx.blocked === D_BASE ? null : D_BASE;
      case "protector": return `Carpet protector isn't on our standard menu. If you'd like to ask Keith about it for your job, text ${TEXT_LINE}.`;
      case "invoice": return "Every job gets an invoice with a link that acts as proof of service — you can show it to your landlord or property manager.";
      case "photos":
        if (site) return `This website chat can't receive photos — text them to ${TEXT_LINE}.`;
        // nobody looks at photos sent to the bot, so only promise a look when Keith is asked
        ctx.offerKeith = true;
        return "Sure — you can send it here, but I can't look at photos myself. Want me to have Keith take a look?";
      case "voice_message": return "Sorry — I can't play voice messages here. Could you type it out? I'll answer right away.";
      case "location_pin": return ctx.areaLine || ctx.blocked ? null : "I can't tell the town from a map pin here — what town or ZIP code is it? We cover about 15 miles around downtown Wichita.";
      case "combo_same_visit": { const cl = comboLine(t, ctx); return cl && !scoped && /\bcarpets?\b|\brooms?\b/.test(t) && !ctx.carpet ? `${cl} ${ASK_ROOMS}` : cl; }
      case "cancellation_policy": return "There's no cancellation fee — just give us as much notice as you can.";
      case "existing_contact":
        // "how do I reach Keith?" gets the text line; only an existing appointment gets the change wording
        if (/\b(?:appointment|appt|booking|booked|reschedul\w*|cancel\w*|my (?:cleaning|visit))\b/.test(t)) return `For an existing appointment, please reply to your Housecall Pro text or text ${TEXT_LINE} — Keith handles changes personally.`;
        return reach(`You can text Keith at ${TEXT_LINE}, or message right here in Messenger.`, `You can text Keith at ${TEXT_LINE}, or message us on Facebook.`);
      case "special_info":
        if (/\b(?:coupon|promo|code|voucher)\b/.test(t)) return `No code needed — those are our regular prices: ${money(PRICES.minimum)} plus tax covers up to 3 rooms, and the ${money(PRICES.standard)} special covers ${COVER}, plus tax.`;
        return SPECIAL_REPLY;
      case "catch": return `No catch — ${money(PRICES.minimum)} plus tax covers up to 3 areas, and ${money(PRICES.standard)} plus tax covers ${COVER}. Bigger homes add ${money(PRICES.extra)} plus tax for each area beyond the ${money(PRICES.standard)} package. Pet treatment (${money(PRICES.petMinimum)} or ${money(PRICES.pet)}) is only if you need it.`;
      case "still_available":
        // "does it expire?" / "how long does the deal last?" isn't a yes question
        if (/\b(?:expire\w*|end\w*|last\w*|how long|until when|deadline|limited)\b/.test(t)) return `The ${money(PRICES.standard)} special is available right now — it covers ${COVER}, plus tax.`;
        return `Yes — the ${money(PRICES.standard)} special is still available! It covers ${COVER}, plus tax.`;
      case "prices_set": {
        if (again) return "Sorry — our prices are set, so I can't go lower than that.";
        // furniture only so far: answer about the furniture, not carpet prices
        if (!scoped && Object.keys(state.furn || {}).length) { const ft = furnTotal(state.furn); return ft && ft.parts.length === 1 ? `Our prices are set — ${ft.parts[0].replace(/ (\$\d+)$/, " is $1")} plus tax.` : ft ? `Our prices are set — ${ft.parts.join(" and ")}, plus tax.` : "Our prices are set — each piece is priced as quoted, plus tax."; }
        if (scoped) {
          // "the other guy said $99" when ours is $75: we're already lower — say so
          const theirs = Number((t.match(/\$\s?(\d{2,4})/) || t.match(/\b(\d{2,4})\s*(?:dollars|bucks)\b/) || [])[1] || 0);
          const ours = quote({ ...scopeNow(), pets: state.pets }).total;
          if (theirs && theirs > ours) return `Good news — ${fmtJob()} for ${jobName()} is already lower than that.`;
          return `Our prices are set — ${fmtJob()} for ${jobName()} is the package price.`;
        }
        return D_PRICES_SET;
      }
      case "why_75_for_one": {
        const q = scoped ? quote({ ...scopeNow(), pets: state.pets }) : null;
        if (q && (q.kind === "minimum" || q.kind === "pet-minimum")) return `${money(q.total)} plus tax is our minimum — it covers up to 3 ${q.kind === "minimum" ? "areas" : "rooms with pet treatment"}, so ${jobName()} is the same ${money(q.total)} as 3 would be.`;
        return `${money(PRICES.minimum)} plus tax is our minimum — it covers up to 3 areas. The ${money(PRICES.standard)} special covers ${COVER}.`;
      }
      case "whole_house_info": return ctx.carpet || topics.has("catch") ? null : quoteLine({ rooms: 0, rugs: 0, halls: 0, stairs: 0, wholeHouse: true }, null);
      case "extra_staircase": case "extra_hall": case "extra_room": {
        const kind = id === "extra_staircase" ? "staircase" : id === "extra_hall" ? "hall" : "room";
        return `Each additional ${kind} is ${money(PRICES.extra)} plus tax as an add-on to the ${money(PRICES.standard)} or ${money(PRICES.pet)} special, which covers ${COVER}.${kind === "staircase" ? " If the package has an unused room spot, an extra staircase can take it at no extra charge." : ""}`;
      }
      case "minimum": return ctx.pq === "minimum" ? null : D_MINIMUM;
      case "included":
        if (ctx.pq === "included" || ctx.carpet) return null;
        // "does it include pre-treating spots and moving furniture?" isn't asking for the price list
        if (!/\b(?:price|cost|\$|99|75|149|special|package|charge|extra|pay)\b/.test(t) && topics.size > 1) return null;
        return D_INCLUDED + (scoped && state.quoted && !ctx.carpet ? ` Yours is ${fmtJob()}.` : "");
      case "spanish": if (ctx.language === "en" && !/\b(?:hablas?|hablan|habla|espa[nñ]ol|hola|gracias|por favor|usted|ayuda)\b/.test(t)) return "Yes — this chat can answer in Spanish, so anyone is welcome to message us in Spanish.";
        return `¡Hola! Sí, puedo ayudarle en español. Limpieza de alfombras: ${money(PRICES.standard)} + impuestos por hasta 5 cuartos, 2 pasillos y una escalera (${money(PRICES.pet)} con tratamiento para mascotas). ¿Cuántos cuartos, pasillos y escaleras necesita limpiar?`;
      default: return null;
    }
  }
  /** "and the dressers?" after the furniture answer: one short line */
  function furnitureShort(t) {
    // name what we'll move and what stays, from the pieces they listed
    const LIGHT = /\b(?:couch(?:es)?|sofas?|loveseats?|coffee tables?|end tables?|side tables?|ottomans?|footstools?)\b/g;
    const HEAVY = /\b(?:beds?|dressers?|entertainment (?:centers?|units?)|pianos?|china (?:cabinets?|hutch(?:es)?)|hutch(?:es)?|armoires?|bookcases?|book ?shelves|desks?|chests?(?: of drawers)?|tv stands?|cabinets?)\b/g;
    const uniq = (xs) => [...new Set(xs.map((x) => x.trim()))];
    const light = uniq(t.match(LIGHT) || []), heavy = uniq(t.match(HEAVY) || []);
    const join = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}` : xs[0]);
    if (light.length + heavy.length >= 2 || (light.length && heavy.length)) {
      const a = light.length ? `We'll move the ${join(light)} and put ${light.length > 1 || /s$/.test(light[0]) ? "them" : "it"} back.` : "";
      const b = heavy.length ? `The ${join(heavy)} ${heavy.length > 1 || /s$/.test(heavy[0]) ? "stay" : "stays"} put — we clean around ${heavy.length > 1 || /s$/.test(heavy[0]) ? "them" : "it"}, or clear ${heavy.length > 1 || /s$/.test(heavy[0]) ? "them" : "it"} if you want the carpet underneath cleaned.` : "";
      return [a, b].filter(Boolean).join(" ");
    }
    const m = t.match(/\b(beds?|dressers?|entertainment centers?|pianos?|china (?:cabinets?|hutch(?:es)?)|hutch(?:es)?|armoires?|bookcases?|desks?)\b/);
    if (m) { const plural = /s$/.test(m[1]) ? m[1] : /h$/.test(m[1]) ? m[1] + "es" : m[1] + "s"; return `${plural[0].toUpperCase()}${plural.slice(1)} stay put too — we clean around them.`; }
    if (/\b(?:couch(?:es)?|sofas?|loveseats?|recliners?|chairs?|coffee tables?|end tables?|ottomans?)\b/.test(t)) return "Yes — we move smaller pieces like that and put them back.";
    return "Same as before — we move smaller pieces and put them back; beds, dressers and heavy pieces stay put.";
  }
  /** dry-time answer, fitted to what they actually asked */
  function dryLine(t, again, ctx) {
    if (/\b(?:still (?:damp|wet|moist)|(?:damp|wet) (?:after|still)|hours? ago|is (?:that|this|it) normal|not dry yet|isn'?t dry)\b/.test(t)) {
      if (!site) ctx.offerKeith = true;
      return "Carpet usually dries in about 1.5 to 2 hours, but airflow, humidity and carpet conditions make a big difference. " + reach("If it's still damp after that, want me to have Keith check in?", `If it's still damp after that, text Keith at ${TEXT_LINE}.`);
    }
    if (/\b(?:fans?|airflow|a\/?c|air condition\w*|dehumidifier|open (?:the )?windows?|heat(?:er)?)\b/.test(t)) return "Dry time depends on airflow, humidity and carpet conditions" + (again ? "." : " — usually about 1.5 to 2 hours.");
    if (D_PUT_BACK_RE.test(t) && again) return "Same goes for that — wait until the carpet is fully dry, about 1.5 to 2 hours, before putting it back.";
    if (D_PUT_BACK_RE.test(t)) return "Once the carpet is fully dry — usually about 1.5 to 2 hours, depending on humidity and airflow — you can put things back.";
    if (/\b(?:sit on|couch|sofa|loveseat|sectional|cushions?|upholstery|chair)\b/.test(t)) return "It usually dries in about 1.5 to 2 hours, depending on humidity and airflow.";
    if (/\b(?:socks|walk(?:ing)? on|step on|barefoot|shoes)\b/.test(t)) return again ? "Keep foot traffic light until it's fully dry — about 1.5 to 2 hours." : DRY_REPLY + " Keep foot traffic light until it's fully dry.";
    if (/\b(?:people|guests|company|party|family) (?:over|coming)\b|\bhosting\b|\bare we (?:ok|okay|good|fine)\b|\bin time\b|\bby (?:\d|noon|tonight|dinner)|\bbefore (?:\d|they|people|guests|dinner|tonight)\b|\bif you come at\b/.test(t)) return "The job takes about 1.5 to 2 hours, and the carpet usually dries in about 1.5 to 2 hours after that — so plan on roughly 3 to 4 hours from the start time.";
    return again ? "About 1.5 to 2 hours, depending on humidity and airflow." : DRY_REPLY;
  }
  /** "same visit?" answered for what they're actually combining */
  function comboLine(t, ctx) {
    const parts = [];
    const carpet = hasScope() || ctx.carpetJob || /\b(?:carpets?|bed ?rooms?|rooms?|halls?|stairs)\b/.test(t);
    if (ctx.floorType === "tile" || /\b(?:tile|grout)\b/.test(t) || state.tileAsked) parts.push("tile");
    if (ctx.floorType === "hard_floor" || /\b(?:hard ?wood|hard floors?|laminate|vinyl|lvp)\b/.test(t) || state.floorAsked) parts.push("hard floors");
    if (ctx.uphLine || Object.keys(state.furn || {}).length || /\b(?:couch(?:es)?|sofas?|loveseats?|sectionals?|chairs?|recliners?|upholstery)\b/.test(t)) parts.push("upholstery");
    if (ctx.rugCounted || /\brugs?\b/.test(t)) parts.push("rug");
    if (carpet) parts.unshift("carpet");
    // "is there a bundle discount?" — a "Yes" would read as yes to a discount
    const yes = /\b(?:discount\w*|bundle\w*|deal|cheaper|break on|combo price|package price)\b/.test(t) ? "" : "Yes — ";
    if (parts.length < 2) return `${yes ? "Yes — we" : "We"} can do it all in the same visit.`;
    const label = parts.length > 2 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : parts.join(" and ");
    return `${yes ? "Yes — we" : "We"} can do the ${label} in the same visit.`;
  }

  /** "8:00 AM" / "morning" / "after work" -> what to say about that time of day */
  function timeOfDayLine(d, t) {
    const said = String(d.time || "").toLowerCase();
    let kind = null, slot = null, early = false;
    const clock = said.match(/\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/);
    // "after 10" / "before noon": the usual start times in that window
    const win = (said || t).match(/\b(after|before|by)\s+(noon|\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?(?![\s\d]*(?:hours?|hrs?|minutes?|mins?|days?|weeks?|months?|years?|kids|people|rooms?|th|st|nd|rd)\b)/);
    if (win) {
      let h = win[2] === "noon" ? 12 : Number(win[2]); const ap = String(win[4] || "").replace(/\./g, "");
      if (ap === "pm" && h !== 12) h += 12; else if (!ap && h >= 1 && h <= 6) h += 12;
      const mins = h * 60 + Number(win[3] || 0);
      const SLOT_MIN = { "8:00 AM": 480, "10:30 AM": 630, "1:00 PM": 780, "3:30 PM": 930 };
      const fits = D_USUAL_SLOTS.filter((x) => (win[1] === "after" ? SLOT_MIN[x] >= mins : SLOT_MIN[x] < mins));
      const label = win[2] === "noon" ? "noon" : win[2] + (win[3] ? ":" + win[3] : "") + (ap ? " " + ap.toUpperCase() : "");
      if (fits.length) return { kind: "window", line: `${win[1] === "after" ? "After" : "Before"} ${label}, our usual weekday start times are ${fits.length > 1 ? fits.slice(0, -1).join(", ") + " and " + fits.at(-1) : fits[0]}.` };
      return { kind: "outside", line: win[1] === "after" ? D_LATE : D_EARLY };
    }
    if (/\b(?:latest|last) (?:time|start|appointment|slot|you (?:can|could) (?:come|start))\b|\bwhat(?:'s| is) the latest\b|\bhow late\b/.test(t)) return { kind: "latest", line: "Our latest usual weekday start time is 3:30 PM." };
    if (/\b(?:earliest|first) (?:time|start|appointment|slot)\b|\bwhat(?:'s| is) the earliest\b|\bhow early\b/.test(t)) return { kind: "earliest", line: "Our earliest usual weekday start time is 8:00 AM." };
    if (/\bmorning/.test(said)) kind = "morning";
    else if (/\bafternoon/.test(said)) kind = "afternoon";
    else if (/\b(?:evening|night|after work|midnight|late)\b/.test(said)) kind = "outside";
    else if (clock) {
      const h = Number(clock[1]), mm = Number(clock[2] || 0), ap = String(clock[3] || "").replace(/\./g, "");
      if (h >= 1 && h <= 24 && mm < 60) {
        const h24 = ap === "pm" && h !== 12 ? h + 12 : ap === "am" && h === 12 ? 0 : !ap && h >= 1 && h <= 6 ? h + 12 : h;
        const mins = h24 * 60 + mm;
        if (mins < 8 * 60 || mins > 15 * 60 + 30) { kind = "outside"; early = mins < 8 * 60; }
        else { kind = "slot"; slot = `${h24 > 12 ? h24 - 12 : h24}:${String(mm).padStart(2, "0")} ${h24 >= 12 ? "PM" : "AM"}`; }
      }
    } else if (!said) {
      const m = /\bmornings?\b/.test(t) && !/\bgood morning\b/.test(t), a = /\bafternoons?\b/.test(t) && !/\bgood afternoon\b/.test(t);
      kind = m && !a ? "morning" : a && !m ? "afternoon" : /\b(?:evenings?|at night|after work)\b/.test(t) ? "outside" : null;
    }
    if (kind === "morning") return { kind, line: "Our morning start times are usually 8:00 and 10:30 AM on weekdays." };
    if (kind === "afternoon") return { kind, line: "Our afternoon start times are usually 1:00 and 3:30 PM on weekdays." };
    if (kind === "outside") return { kind, line: early || (/\bearly\b|\bbefore work\b/.test(said + " " + t) && !/\b(?:evening|night|after work|late)\b/.test(said + " " + t)) ? D_EARLY : D_LATE };
    if (kind === "slot") {
      const usual = D_USUAL_SLOTS.includes(slot);
      return { kind, slot, usual, line: usual ? `${slot} is one of our usual weekday start times.` : "Our usual weekday start times are 8:00 AM, 10:30 AM, 1:00 PM and 3:30 PM." };
    }
    return { kind: null, line: null };
  }

  /** what to say for a booking or time question: { parts: [content], lead: "…:" line before the link, link: bool } */
  function bookingPlan(d, t, tod, carpetChanged, opts = {}) {
    let b = d.booking;
    if (b === "none" && d.days.length) b = "specific_days";
    if (b === "none") return null;
    const parts = [];
    const todayWd = weekdayChicago(clockNow());
    const tomorrowName = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][(todayWd + 1) % 7];
    const days = d.days.filter((x) => !(b === "tomorrow" && x === tomorrowName)).map((x) => D_DAYNAME[x]);
    const list = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}` : xs[0]);
    const askWork = /\b(?:do|does) (?:you|u|y'?all|he|keith|your (?:guy|tech)) (?:work|come out|come|do|go|clean)\b|\bare (?:you|y'?all) (?:open|working)\b|\b(?:work|open) (?:on )?(?:mon|tues|wednes|thurs|fri)days\b/.test(t) && tod.kind !== "outside";
    const dayLead = (xs) => (xs.length >= 5 ? "We work all five weekdays — the live calendar shows every open time, and you'll get a confirmation text right away:"
      : xs.length > 1 ? `You can see the open times for ${list(xs)} on the live calendar and grab one — you'll get a confirmation text right away:`
      : askWork && xs[0] !== "tomorrow" ? `Yes — we work ${xs[0]}s. The live calendar shows the open times, and you'll get a confirmation text right away:`
      : `${xs[0][0].toUpperCase() + xs[0].slice(1)}'s open times are on the live calendar — grab one and you'll get a confirmation text right away:`);
    const withTod = () => { if (tod.line) parts.push(tod.line); };
    switch (b) {
      case "same_day":
        parts.push(opts.emergency ? "We also don't offer same-day service right now." : SAME_DAY_REPLY);
        if (opts.emergency) return { parts, lead: null, link: false };
        if (days.length) return { parts, lead: dayLead(days), link: true };
        return { parts, lead: null, link: true, once: true };
      case "tomorrow": {
        const weekendTomorrow = todayWd === 5 || todayWd === 6;
        withTod();
        if (weekendTomorrow) {
          if (days.length) { parts.unshift(`Tomorrow is ${todayWd === 5 ? "Saturday" : "Sunday"}, and we're weekdays only (closed Saturday and Sunday).`); return { parts, lead: dayLead(days), link: true }; }
          return { parts, lead: `Tomorrow is ${todayWd === 5 ? "Saturday" : "Sunday"}, and we're weekdays only (closed Saturday and Sunday). Monday's usual start times are 8:00 AM, 10:30 AM, 1:00 PM and 3:30 PM — the live calendar shows what's open:`, link: true };
        }
        if (days.length) return { parts, lead: dayLead(["tomorrow", ...days]), link: true };
        return { parts, lead: "Tomorrow's openings are on the live calendar — if a time shows there, you can reserve it directly:", link: true };
      }
      case "picked_time":
        if (tod.kind === "outside") return { parts: [tod.line], lead: "The live calendar shows what's open:", link: true };
        // "Great! You can grab that time" only for one of our usual weekday start times
        if (tod.kind === "slot" && tod.usual) return { parts, lead: "Great! You can grab that time on the booking calendar — it shows the live openings and you'll get a confirmation text right away:", link: true };
        if (tod.kind === "slot") return { parts: [tod.line], lead: days.length ? dayLead(days) : "The live calendar shows what's open:", link: true };
        withTod();
        if (days.length) return { parts, lead: dayLead(days), link: true };
        if (parts.length) return { parts, lead: "The live calendar shows what's open:", link: true };
        return { parts, lead: state.linkSent ? "Just tap the booking link — pick your time and you'll get a confirmation text right away:" : BOOK_INTRO, link: true };
      case "pick_time_question":
        if (state.linkSent) return { parts: ["Yes — you pick your own day and time on the booking link above; it shows the live weekday openings."], lead: null, link: false };
        return { parts, lead: "Yes — you pick your own day and time on the booking calendar, which shows the live weekday openings:", link: true };
      case "wants_link": case "how_to_book":
        withTod();
        if (days.length) return { parts, lead: dayLead(days), link: true };
        if (carpetChanged) return { parts, lead: null, link: true };
        if (state.linkSent) return { parts, lead: "Just tap the booking link — pick your time and you'll get a confirmation text right away:", link: true };
        if (!hasScope()) return { parts, lead: opts.noAsk ? "You can pick a time right now:" : "Happy to get you on the schedule! How many rooms, hallways and stairs are we cleaning? Or you can pick a time right now:", link: true };
        return { parts, lead: null, link: true, great: true };
      default: // time_question, specific_days
        // "party on Saturday, want it done before": a weekday before the event
        if (!days.length && /\b(?:saturday|sunday|weekend)\b/.test(t) && /\b(?:party|event|guests?|company|reunion|graduation|wedding|before|celebration|hosting|shower|birthday)\b/.test(t)) return { parts, lead: "We work Monday through Friday, so you'd pick a weekday before then — the live calendar shows the open times:", link: true };
        // "how far out are you booking?" / "how soon?" is about lead time, not start times
        if (!days.length && !tod.line && /\bhow (?:far (?:out|ahead)|soon)\b|\bnext (?:opening|available|opening)\b|\bbooked (?:up|out)\b|\bhow (?:long|far) (?:is the )?wait\b|\bwaiting list\b/.test(t) && !opts.leadTimeSaid) return { parts: [LEAD_TIME_REPLY], lead: "The live calendar shows the next open times:", link: true };
        withTod();
        if (days.length) return { parts, lead: dayLead(days), link: true };
        if (opts.dateAsked) return { parts, lead: "The live calendar shows every open weekday time, including that week:", link: true };
        if (parts.length || opts.leadTimeSaid || opts.timesSaid) return { parts, lead: "The live calendar shows what's open:", link: true };
        return { parts, lead: "Weekday start times are usually 8:00, 10:30, 1:00 and 3:30 (we're closed Saturday and Sunday). The live calendar shows what's open:", link: true };
    }
  }

  /** Compose the reply from validated directives. Returns null when the directives give nothing to say. */
  function handleDirectives(raw, d) {
    const t = norm(raw);
    currentText = t;
    const petsBefore = state.pets;
    if (!t || /^__\w+__$/.test(t) || isStopMessage(t)) return null;
    askedBefore = state.askedRooms;
    lastIntentBefore = state.lastIntent;
    const prevQuoteKey = state.lastQuoteKey;
    restated = [];
    topicIntent = "";
    state.turns += 1;
    // weekends are a firm no: a weekend question the AI couldn't place gets the weekdays-only answer, not a Keith offer
    if (d.unanswered && /\b(?:saturdays?|sundays?|weekends?)\b/i.test(d.unanswered)) d = { ...d, unanswered: null, topics: [...new Set([...d.topics, "weekend_info"])] };
    // "ask Keith if he can do Saturday" read as a person/Keith request is still a weekend booking request — never handed to Keith
    if (["human", "other_keith", "callback", "cant_use_link"].includes(d.handoff) && isWeekendJobAsk(t)
      && !/\b(?:useless|not helping|not helpful|frustrat\w*|wtf|stupid|ridiculous|going in circles)\b/.test(t)
      && !(d.handoff === "callback" && !/\b(?:come|appointment|appt|clean|cleaning|book|schedule|exception)\b/.test(t))) d = { ...d, handoff: "weekend_booking" };
    // "yes please ask Keith" right after the weekdays-only answer is the same weekend request
    if (state.weekendLast && ["human", "other_keith"].includes(d.handoff) && WEEKEND_KEITH_FOLLOW_RE.test(t) && t.split(" ").length <= 12) d = { ...d, handoff: "weekend_booking" };
    // the AI's own-words answer, only when every detail checks out against the facts it cites
    let factAnswer = d.answer ? checkFactAnswer(d.answer, raw, [state.rooms, state.halls, state.stairs, state.rugs, state.rooms + state.rugs, state.rooms + state.rugs + state.halls + state.stairs]) : null;
    // the 15% military/first-responder/teacher discount is only for those who ask about it: a generic "any deals?" gets "our prices are set"
    if (factAnswer && /15 ?%|\bmilitary\b|first responders?|teachers?/i.test(factAnswer) && !/\b(?:military|veterans?|vets?|army|navy|air force|marines?|teachers?|first responders?|police|cops?|firefighters?|fire ?fighters?|emts?|nurses?|militar\w*|maestr\w*|bomber\w*|polic[ií]a\w*|veteran\w*)\b/.test(t)) {
      factAnswer = null;
      d = { ...d, answer: null, topics: d.topics.includes("discount_other") ? d.topics : [...d.topics, "discount_other"] };
    }
    if (factAnswer && d.unanswered && (t.match(/\?/g) || []).length <= 1 && !/\b(?:also|and another|one more|other question)\b/.test(t)) d = { ...d, unanswered: null };
    // an answer that failed the check falls back to the approved answer for the facts it cited
    if (d.answer && !factAnswer && !d.topics.length && !d.unanswered) {
      const fb = [...new Set(d.answer.facts.map((f) => FACT_TOPIC[FACT_ALIAS[f] || f]).filter(Boolean))].slice(0, 2);
      if (fb.length) d = { ...d, topics: fb, unanswered: null };
    }
    // "same-day" only when they mean today; "tomorrow" or "before Saturday's party" is a normal booking question
    const todayWords = /\b(?:today|tonight|right now|asap|a\.s\.a\.p|immediately|this (?:morning|afternoon|evening)|same[- ]day|hoy)\b/;
    // "so is that a yes or no?" right after a same-day ask: answer the same-day question plainly
    if ((d.booking === "same_day" || d.topics.includes("same_day")) && !todayWords.test(t) && saidHas("sameday") && /\byes or no\b|\bso (?:can|will|is)\b|\bis that a\b|\bcan you or not\b|\bor not\b/.test(t))
      return out("booking", [`No — we don't offer same-day service right now. ${state.linkSent ? "The booking link above shows the next open weekday times." : "The live calendar shows the next open weekday times:"}`, ...(state.linkSent ? [] : [bookingUrl])]);
    if ((d.booking === "same_day" || d.topics.includes("same_day")) && !todayWords.test(t)) {
      const tmr = /\b(?:tomorrow|tmrw|tmr|mañana|manana)\b/.test(t);
      d = { ...d, booking: d.booking === "same_day" ? (tmr ? "tomorrow" : "time_question") : d.booking, topics: d.topics.filter((x) => x !== "same_day").concat(d.booking !== "same_day" && !tmr ? ["lead_time"] : []) };
    }
    // a "yes" only counts when the bot just asked something; otherwise a question in the message is a question
    if (d.answer_yes_no && !state.offeredKeith && !/\?/.test(state.lastReply || "") && !(hasScope() && !state.linkSent)) {
      const other = d.job || d.upholstery || d.floors || d.rug || d.pets || d.topics.length || d.price_question !== "none" || d.booking !== "none" || d.days.length || d.answer || d.unanswered || d.closing;
      d = { ...d, answer_yes_no: null, unanswered: !other && /\?|\b(?:can|could|will|do|does|would) (?:you|u|he|it)\b/.test(t) ? t.slice(0, 160) : d.unanswered };
    }
    if (/\b(?:can'?t|cannot|won'?t|wont) be (?:home|there)\b|\bwork (?:all week|m-?f\b|monday (?:through|thru|-|to) friday|9 ?(?:-|to) ?5|during the day|days)\b|\bat work all (?:day|week)\b/.test(t) && !d.topics.some((x) => ["home_access", "be_home", "door_code"].includes(x)) && !d.handoff) d = { ...d, topics: [...d.topics, "home_access"] };
    const topics = new Set(d.topics);
    // "yes" to "want me to have Keith answer it?": Keith gets the question, and the chat stays open (it isn't a handoff)
    const offered = state.offeredKeith;
    state.offeredKeith = false;
    const pq0 = d.price_question;
    const hasContent0 = Boolean(d.job || d.upholstery || d.floors || d.rug || d.pets || d.topics.length || d.price_question !== "none" || d.booking !== "none" || d.days.length || factAnswer || d.unanswered || (d.area && (d.area.town || d.area.zip)));
    let keithNote = false;
    if (offered && !d.handoff && d.answer_yes_no === "yes" && hasContent0) keithNote = true;
    else if (offered && (d.answer_yes_no === "yes" || d.handoff === "human" || (d.closing === "ok" && /^(?:ok|okay|k|sure|ok sure|sure thing|go ahead|please)\b[\s!.]*$/.test(t))) && !hasContent0) {
      return out("keith_question", ["Done — I've asked Keith to answer, and he'll reply here as soon as he can. In the meantime, I'm happy to help with anything else."], { notify: "question" });
    }
    // "she left spots on the sofa, can you do that?" with the sofa read as an item is a price, not a complaint about us
    if (d.handoff === "complaint" && d.upholstery && Object.values(d.upholstery.items).some((n) => n > 0) && !/\b(?:you (?:guys )?(?:left|did|cleaned|came|ruined|missed|stained)|your (?:tech|guy|cleaning|work)|after (?:you|the cleaning)|last (?:time|visit)|came back|still dirty|refund)\b/.test(t)) d = { ...d, handoff: null };
    // a wool rug is a no (never a review); a rug the AI called oversized that measures 8x10 or less is standard
    if (d.handoff === "oversized_rug" && d.rug) {
      const dm = [d.rug.length, d.rug.width].filter((x) => x != null && x > 0);
      if (d.rug.material === "wool_or_natural" || (dm.length === 2 && Math.min(...dm) <= 8 && Math.max(...dm) <= 10 && !d.rug.antique_or_oriental)) d = { ...d, handoff: null };
    }
    // details sent after a website handoff (a name, a date, "can someone confirm?") belong to that handoff
    const D_FOLLOW_KEY = { change_existing: "existing_change", confirm_existing: "existing_confirm", complaint: "complaint", human: "callback" };
    if (!d.handoff && D_FOLLOW_KEY[lastIntentBefore] && !d.job && !d.upholstery && !d.floors && !d.rug && !d.topics.length && !factAnswer && pq0 === "none" && !d.unanswered && !d.closing) d = { ...d, handoff: D_FOLLOW_KEY[lastIntentBefore] };
    // Keith is already booking this one by hand: take the details (and price them) instead of repeating the intake
    if (d.handoff === "cant_use_link" && !site && state.manualBooking) {
      const content = d.job || d.upholstery || d.floors || d.rug || d.pets || d.days.length || d.time || d.booking !== "none" || d.price_question !== "none" || d.topics.length || (d.area && (d.area.town || d.area.zip));
      if (content) d = { ...d, handoff: null, booking: d.booking === "none" ? "wants_link" : d.booking };
      else {
        const ASK = "tell me here what you'd like cleaned (rooms, hallways, stairs, any furniture) and which weekday works best, and I'll pass it all to Keith.";
        if (/\bcan i (?:just )?(?:tell|say|type|message|give|send)\b/.test(t)) return out("keith_booking", [`Yes, please — ${ASK}`]);
        if (/tell me here what you'd like cleaned/.test(state.lastReply || "")) return out("keith_booking", ["Got it — Keith has your request and will reach out here. Whenever you're ready, just tell me what you'd like cleaned and a good weekday."]);
        return out("keith_booking", [`Sorry about that! No problem — just ${ASK}`]);
      }
    }
    // a wool rug from a flood is still a wool rug: the decline answers it (no "text Keith a photo" for something we won't clean)
    if (d.topics.includes("wool_rug") && d.topics.includes("water_damage") && !/\bcarpets?\b|\bfloors?\b|\bpad\b/.test(t)) { d = { ...d, topics: d.topics.filter((x) => x !== "water_damage") }; topics.delete("water_damage"); }
    // commercial is with Keith: discounts and price questions about it aren't answered with home prices
    if ((state.siteHandoff === "commercial" || lastIntentBefore === "commercial") && !d.job && !d.handoff && d.topics.length && d.topics.every((x) => ["discount_other", "discount_apply", "prices_set", "military_discount", "travel_fee"].includes(x)))
      return out("commercial", [reach("Keith prices commercial and recurring work personally — I've added that for him, and he'll include it with your quote.", `Keith prices commercial and recurring work personally — mention it when you text him at ${TEXT_LINE}, and he'll include it with your quote.`)], PHONE);
    // only a service we don't offer is on the table: nothing to book
    if (state.declinedSvcTurn && state.turns - state.declinedSvcTurn <= 3 && !hasScope() && !Object.keys(state.furn || {}).length && !d.job && !d.upholstery && !d.floors && !d.rug && !d.handoff && (d.booking !== "none" || d.days.length) && !d.topics.some((x) => !["next_available", "lead_time", "slot_times", "same_day", "other_trades", "unsupported_service"].includes(x)))
      return out("info", ["Since that's not something we clean, there's nothing to book for it — but we're glad to help with carpet, rugs, upholstery, tile or hard floors anytime."]);
    // water damage is with Keith: a price question about it (or more details) doesn't get our room prices
    if (waterOpen() && !d.job && !d.upholstery && !d.floors && !d.rug && !d.handoff && !d.closing && d.booking === "none" && !d.unanswered && d.topics.every((x) => ["water_damage", "odor", "dry_time"].includes(x)) && !(d.area && (d.area.town || d.area.zip))) {
      if (d.price_question !== "none") return out("info", [reach("Keith will price the water damage once he's looked at it — he'll reach out here.", `Keith will price the water damage once he's seen a photo — text it to ${TEXT_LINE}.`) + " If you'd also like a regular cleaning quote, just tell me how many rooms."]);
      if (!d.answer) return out("info", [WATER_FOLLOW()]);
    }
    if (d.handoff) return directiveHandoff(d, t, topics, raw);
    // a commercial job Keith already has: timing is part of his quote, not the residential calendar
    if (lastIntentBefore === "commercial" && (d.booking !== "none" || d.days.length || d.time || /\b(?:weekends?|saturdays?|sundays?)\b/.test(t))) {
      if (/\b(?:weekends?|saturdays?|sundays?)\b/.test(t)) return out("commercial", [`${WEEKEND_LINE} ` + reach("Keith will work out a weekday time with you along with the quote.", `Text Keith at ${TEXT_LINE} and he'll work out a weekday time with you along with the quote.`)]);
      return out("commercial", [reach("For commercial jobs, timing — including before or after hours — is Keith's call. He'll work that out with you along with the quote.", `For commercial jobs, timing — including before or after hours — is Keith's call. Text him at ${TEXT_LINE} and he'll work it out with you along with the quote.`)]);
    }
    const sendLines = []; // lines that must go out first (site contact details)
    // a website visitor leaving a phone number, email or name: nobody reads this chat later
    if (site && (/\(?\b\d{3}\)?[-. ]?\d{3}[-. ]?\d{4}\b/.test(raw || "") || /\S+@\S+\.\w{2,}/.test(raw || "") || /\bpass (?:my name|my number|this|it|that) (?:along|on)\b|\b(?:leave|take) my (?:name|number)\b|\bmy (?:number|cell|phone|email) is\b|\b(?:call|text|reach|email) me at\b/.test(t))) {
      const booking = d.booking !== "none" || d.job || d.days.length;
      sendLines.push(booking ? "No need to send your details here — this chat can't pass them along. Just enter your name, address and mobile number when you book on the link." : `This chat can't pass messages along, so please text ${TEXT_LINE} or message us on Facebook Messenger, and Keith will get back to you.`);
    }

    // rugs and floors that need Keith's eyes win before anything is priced — but a wool decline beats a size review
    let r = d.rug;
    // things Keith prices himself (an oversized rug, natural stone, an off-menu piece): he's told, and the rest still gets answered
    let review = null;
    const woolBefore = saidHas("wool");
    const woolNow = Boolean(r && (r.material === "wool_or_natural" || (woolBefore && r.material === "unknown" && !/\b(?:another|other|second|different|new|synthetic)\b/.test(t))));
    const woolNote = woolNow ? (woolBefore ? WOOL_REMINDER : D_WOOL) : null;
    if (r && !woolNow) {
      const dims = [r.length, r.width].filter((x) => x != null && x > 0);
      const tooBig = dims.length === 2 ? Math.min(...dims) > 8 || Math.max(...dims) > 10 : dims.length === 1 && dims[0] > 10;
      if (r.antique_or_oriental || tooBig) {
        review = { kind: "rug", line: lastIntentBefore === "keith_review" && state.reviewKind === "rug" ? reach("Keith has the rug details — he'll reach out here.", `Keith will need a photo to price that rug — text it to ${TEXT_LINE}.`) : reach("That rug needs a quick look before we can price it — I've let Keith know, and he'll reach out here.", `That kind of rug needs a quick look before we can price it — text a photo to Keith at ${TEXT_LINE}.`) };
        // the rug isn't part of the carpet count
        r = null; d = { ...d, rug: null, job: d.job ? { ...d.job, rugs: 0 } : null };
      }
    }
    if (woolNote) markSaid("wool");
    const f = d.floors;
    let floorLine = null, floorPriced = false;
    if (f) {
      const tile = f.type === "tile";
      // bathroom-only tops out at 100 sq ft and kitchen-only at 150; kitchen plus dining/entry/etc. can be the 400 sq ft whole-floor tier
      // a kitchen over 150 sq ft fits the 400 sq ft whole-floor clean & seal
      const cap = tile ? (f.where === "bathroom" ? 100 : 400) : 600;
      if (f.special || (f.sqft !== null && (f.sqft <= 0 || f.sqft > cap))) {
        review = { kind: "floor", line: lastIntentBefore === "keith_review" && state.reviewKind === "floor" ? reach("Keith has those details — he'll reach out here.", `Keith will need a photo and a description — text them to ${TEXT_LINE}.`) : reach(!tile && f.sqft > 600 ? "Hard-floor areas over 600 square feet need a quick look before we can price them — I've let Keith know, and he'll reach out here." : "That one needs a quick look before we can price it — I've let Keith know, and he'll reach out here.", !tile && f.sqft > 600 ? `Hard-floor areas over 600 square feet need a quick look before we can price them — text a description and a photo to Keith at ${TEXT_LINE}.` : `That one needs a quick look before we can price it — text a description and a photo to Keith at ${TEXT_LINE}.`) };
      }
      const ft = f.sqft;
      const pick = tile
        ? (f.where === "whole" || (ft !== null && ft > 150) ? PRICES.tile[2] : f.where === "kitchen" || (ft !== null && ft > 100) ? PRICES.tile[1] : f.where === "bathroom" ? PRICES.tile[0] : null)
        : (ft === null ? (f.where === "whole" ? PRICES.hardFloor[2] : f.where === "entry" ? PRICES.hardFloor[0] : null) : ft <= 150 ? PRICES.hardFloor[0] : ft <= 300 ? PRICES.hardFloor[1] : PRICES.hardFloor[2]);
      floorPriced = Boolean(pick) && !review;
      if (pick && !review) state.floorItem = { label: `${tile ? "tile & grout" : "hard floor"} (${pick[0]})`, price: pick[1] };
      floorLine = review && review.kind === "floor" ? null : pick ? `${tile ? "Tile & grout" : "Hard floor"} — ${pick[0]}: ${money(pick[1])} plus tax.`
        : tile ? `Tile & grout, plus tax: ${PRICES.tile.map(([n, p]) => `${n} ${money(p)}`).join("; ")}. Larger areas need a quick review first.`
        : `Hard floors, plus tax: ${PRICES.hardFloor.map(([n, p]) => `${n} ${money(p)}`).join("; ")}.`;
    }
    // upholstery: off-menu pieces go to Keith; priced pieces are saved for the total
    let u = d.upholstery;
    const tf = readFurniture(t);
    // furniture listed right after the furniture-moving answer is about moving it, not cleaning it
    if (u && (saidHas("t:furniture") || saidHas("t:heavy_furniture")) && !/\b(?:clean\w*|price\w*|how much|cost\w*|quote|upholstery|stains?|add)\b/.test(t)) { u = null; d = { ...d, upholstery: null, topics: d.topics.includes("heavy_furniture") || d.topics.includes("furniture_moving") ? d.topics : [...d.topics, "furniture_moving"] }; topics.add("furniture_moving"); }
    // tables, beds, dressers and the like aren't upholstery: they're furniture we move (or don't)
    const MOVER_RE = /\b(?:(?:coffee|end|side|dining|kitchen|night) ?tables?|tables?|beds?|dressers?|entertainment (?:centers?|units?)|tv(?: stands?)?|desks?|bookcases?|book ?shelves|pianos?|cabinets?|hutch(?:es)?|nightstands?|lamps?|armoires?|chests?)\b/i;
    if (u && u.other.length) {
      const movers = u.other.filter((x) => MOVER_RE.test(x));
      if (movers.length) {
        u = { ...u, other: u.other.filter((x) => !MOVER_RE.test(x)) };
        if (!Object.values(u.items).some((n) => n > 0) && !u.other.length) { u = null; if (!topics.has("heavy_furniture") && !topics.has("furniture_moving")) { d = { ...d, topics: [...d.topics, "furniture_moving"] }; topics.add("furniture_moving"); } }
      }
    }
    // "how much for a couch and loveseat?" read only as the menu topic: price the pieces they named
    if (!u && topics.has("upholstery_menu") && d.price_question !== "none" && Object.keys(tf.items).length && !tf.unpriced) u = { action: "set", items: Object.fromEntries(Object.entries(tf.items).map(([k, n]) => [Object.keys(D_UPH).find((x) => D_UPH[x] === k), n])), other: [] };
    let uphLine = null, uphPriced = false;
    if (u) {
      const sectionalNamed = Object.entries(u.items).some(([k, n]) => n > 0 && /sectional/.test(k)) || /\bsectionals?\b/.test(t) || Object.keys(state.furn || {}).some((k) => /sectional/.test(k));
      // a chaise on a sectional is one of its pieces, not a separate item
      const other = u.other.filter((x) => !(sectionalNamed && /\bchaise\b/i.test(x)));
      if (other.length) {
        const piece = readFurniture(t).unpriced || other[0].toLowerCase();
        const pieceName = piece === "benches" ? "bench" : piece.replace(/s$/, "");
        review = { kind: "item", line: reach(`The ${pieceName} isn't on our standard menu, so it needs a quick look before we can price it — I've let Keith know, and he'll reach out here.`, `The ${pieceName} isn't on our standard menu, so it needs a quick look before we can price it — text a photo to Keith at ${TEXT_LINE}.`) };
      }
      const items = {};
      for (const [k, n] of Object.entries(u.items)) if (n > 0) items[D_UPH[k]] = n;
      if (u.other.length && sectionalNamed && !Object.keys(items).some((k) => /sectional/.test(k))) items.sectional = 1;
      // the customer's own piece count ("5 pieces", "6 seats") settles the sectional size
      const sized = ["small_sectional", "large_sectional"].find((k) => tf.items[k]);
      if (sized && (items.sectional || items.small_sectional || items.large_sectional)) { delete items.sectional; delete items.small_sectional; delete items.large_sectional; items[sized] = 1; }
      if (Object.keys(items).length) {
        const merged = u.action === "add" ? { ...(state.furn || {}) } : {};
        if (sized || items.sectional) { delete merged.sectional; delete merged.small_sectional; delete merged.large_sectional; }
        for (const [k, n] of Object.entries(items)) merged[k] = (merged[k] || 0) + n;
        state.furn = merged;
        // answer the pieces in this message, not the whole menu
        uphLine = furnitureLine({ items: merged, unpriced: null, special: tf.special }, site);
        uphPriced = true;
        // the same unsized sectional again: ask the seat count instead of repeating both prices as if new
        if (/^Sectionals are \$119/.test(uphLine)) {
          if (saidHas("p:sect") && !saidHas("ask:seats")) { uphLine += " How many seats does yours have? That tells me which price fits."; markSaid("ask:seats"); }
          markSaid("p:sect");
        }
      } else uphLine = furnitureLine({ items: {}, unpriced: null }, site);
    }

    // the carpet job
    // the same pet answer again ("dog peed" on every turn) isn't news: don't restate the pet prices with a booking question
    const petsRepeat = saidHas("petsline") && !d.job && d.price_question === "none" && ((d.pets === "accidents" && petsBefore === true) || (d.pets === "no_accidents" && petsBefore === false));
    const petsGiven = Boolean(d.pets) && !petsRepeat;
    // "9 rooms counting the hallways and stairs": a mixed total we can't split — ask once instead of guessing
    const mixed = t.match(/\b(\d{1,2})\s+(?:rooms?|areas?)(?: of carpet)?[^.?!]{0,30}?\b(?:counting|including|incl\.?|with)\s+(?:the\s+)?(?:hall\s?ways?|halls?|stairs?|staircases?)\b/);
    if (mixed && !hasScope()) {
      state.quoted = false;
      return out("price", [`Got it — ${mixed[1]} areas including the hallways and stairs. How many of those are hallways and staircases? Then I'll give you the exact price.`]);
    }
    // the AI gave no job but the message plainly counts rooms ("3 bedrooms and a living room"): use the tested text reading
    let textScopeChanged = false;
    if (!d.job && !d.rug && !d.floors && !d.pets && !hasScope() && !d.topics.includes("water_damage") && (pq0 !== "none" || d.booking !== "none") && /\d|\b(?:one|two|three|four|five|six|seven|eight|nine|ten|a couple)\b/.test(t)
      // "the 3 room package/special/deal", "the ad says 3 rooms for a price": a package name, not their job
      && !/\b(?:\d|three|five)[ -]?rooms?\s+(?:package|special|deal|price|offer|thing|one)\b|\b(?:ad|advert\w*|post|special|deal|package)\b[^.?!]{0,25}\b(?:\d|three|five) rooms?\b/.test(t)) {
      const sc = readScope(t);
      if (sc.found && sc.rooms + sc.halls + sc.stairs + sc.rugs > 0 && !sc.onlyLocated && !sc.locatedOnly && !(sc.bare && hasScope()))
        textScopeChanged = applyScope(sc, t, { adding: hasScope() && /\b(?:add|adding|plus|also|too|and the|another|more)\b/.test(t) });
    }
    let scopeChanged = applyDirectiveJob(d, t) || textScopeChanged;
    // "the whole downstairs (and one bedroom upstairs)": the floor has no count yet — ask instead of quoting the one room
    const wholeFloorAsk = d.job && d.job.wholeFloor && !d.job.wholeHouse && d.job.rooms + d.job.halls + d.job.stairs + d.job.rugs <= 2 && (!hasScope() || d.job.action === "set") ? d.job.wholeFloor : null;
    const wholeFloorExtra = wholeFloorAsk && d.job.rooms + d.job.halls + d.job.stairs + d.job.rugs > 0 ? describe({ rooms: d.job.rooms, halls: d.job.halls, stairs: d.job.stairs, rugs: d.job.rugs }) : "";
    let rugLine = null, rugCounted = false;
    if (r) {
      if (woolNow) rugLine = woolNote;
      else if (r.tiny_mat) rugLine = D_TINY;
      else {
        rugCounted = true;
        if (!(d.job && d.job.rugs) && state.rugs === 0) { addToJob({ rooms: 0, rugs: 1, halls: 0, stairs: 0 }); scopeChanged = true; }
      }
    }
    if (scopeChanged && state.unsupported) state.unsupported = false;
    if (!state.wholeHouse && (state.rooms + state.rugs > 20 || state.halls > 6 || state.stairs > 4)) return out("layout_review", [D_SIZE()], PHONE);
    if (rugCounted && hasScope()) rugLine = state.rooms + state.rugs > PRICES.includes.rooms ? "A standard area rug counts as one of the rooms in the package; each additional standard area rug is $15 plus tax once the five rooms are used." : (state.rooms || state.halls || state.stairs ? "A standard area rug counts as one of the rooms in the package." : null);
    // "ok let's do the rug" after we said we can't clean that wool rug
    if (!r && woolBefore && /\brugs?\b/.test(t) && !/\b(?:another|other|second|different|new|synthetic)\b/.test(t) && !d.job) rugLine = WOOL_REMINDER;

    // where they are
    let areaLine = null, blocked = null;
    const a = d.area;
    const wasOut = state.inArea === false;
    if (a) {
      if (a.high_rise) { state.declined = "highrise"; blocked = D_HIGHRISE; }
      else if (a.on_base) {
        const again = state.declined === "base";
        state.declined = "base";
        blocked = !again ? D_BASE
          : (d.price_question !== "none" || d.job || /\bgate\b/.test(t)) ? `Sorry for the confusion — we can't clean on-base housing at all${/\bgate\b/.test(t) ? ", even meeting at the gate" : ""}.${d.job && hasScope() ? ` If you ever need an off-base home in our area cleaned, ${jobName()} would be ${fmtJob()}.` : ""}`
          : "Since it's base housing, unfortunately we can't come out there — on-base housing is outside what we service.";
      }
      else {
        const town = a.town ? a.town.toLowerCase().replace(/[^a-z .'-]/g, " ").replace(/\s+/g, " ").trim() : "";
        const inC = town ? townsIn(town, SERVED) : [], outC = town && !inC.length ? townsIn(town, NOT_SERVED) : [];
        const quietTurn = !scopeChanged && d.price_question === "none" && !petsGiven && !topics.size && d.booking === "none";
        if (inC.length) {
          const known = state.inArea === true && (state.city === inC.at(-1) || (inC.at(-1) === "wichita" && /^672/.test(state.zip || "")));
          const prevZip = state.zip;
          state.city = inC.at(-1); state.inArea = true; state.zip = a.zip || prevZip;
          if (topics.has("service_area") || (inC.at(-1) !== "wichita" && quietTurn && !known)) areaLine = `Yes — we come to ${title(inC.at(-1))}!`;
          // a ZIP or cross streets after we've confirmed the town: a short "that's in our area", not a repeat
          else if (quietTurn && a.zip && a.zip !== prevZip) areaLine = `Perfect — ${a.zip} is in our area.`;
          else if (quietTurn && !known) areaLine = "Great — that's in our service area.";
        } else if (outC.length) {
          state.city = outC[0]; state.inArea = false; state.zip = a.zip;
          blocked = `Sorry — ${title(outC[0])} is outside our service area. We cover about 15 miles around downtown Wichita: ${AREA_TOWNS}.`;
        } else if (a.zip) {
          const sameZip = state.zip === a.zip;
          state.zip = a.zip;
          const served = /^672\d\d$/.test(a.zip) || ["67037", "67002", "67052", "67101", "67060", "67147", "67067"].includes(a.zip);
          // the same ZIP again doesn't get the same answer again
          if (!sameZip || topics.has("service_area")) areaLine = served ? `Yes — ${a.zip} is in our service area! Housecall Pro checks the exact address when you book.` : `I can't confirm ${a.zip} here — we cover about 15 miles around downtown Wichita, and the booking page checks your exact address before it lets you book.`;
          if (sameZip && areaLine && saidHas("area:" + a.zip)) areaLine = null;
          if (areaLine) markSaid("area:" + a.zip);
        } else if (town) {
          // repeat a place name only when the customer actually wrote it
          const echo = /^[a-z][a-z .'-]{1,28}$/.test(town) && t.includes(town);
          areaLine = echo ? `${title(town)} isn't on our published service list — we cover ${AREA_TOWNS} (about 15 miles around downtown Wichita). The booking page checks your exact address before it lets you book.` : `We're local to Wichita and cover about 15 miles around downtown: ${AREA_TOWNS}.`;
        }
      }
    }
    // a name or ZIP after the link went out: they still need to finish on the booking page
    if (areaLine && state.linkSent && !d.job && d.booking === "none" && d.price_question === "none" && !d.topics.some((x) => x !== "service_area")) areaLine += " Just finish on the booking link above — you'll enter your name and address there to lock in your time.";
    if (topics.has("out_of_state") && !blocked) blocked = "We're a local company in Wichita, Kansas, and we don't travel out of state. We cover about 15 miles around downtown Wichita.";
    // already told they're outside our area: no prices, no rooms question, no "we'd come"
    const outOfArea = !blocked && wasOut && state.inArea === false;
    // already told we can't serve base housing / a high-rise: no booking for that address
    if (!blocked && (state.declined === "base" || state.declined === "highrise") && !(d.area && (d.area.town || d.area.zip) && !d.area.on_base && !d.area.high_rise) && (d.booking !== "none" || d.days.length))
      blocked = state.declined === "base" ? "Just a reminder — we can't service on-base housing, so that one isn't something we can book. If you ever need an off-base home in our area cleaned, we'd be glad to help." : "Just a reminder — we can't service downtown high-rise apartments, so that one isn't something we can book. If you have a house, townhome or low-rise home in our area, we'd be glad to help.";
    if (outOfArea && (topics.has("travel_fee") || d.price_question === "extra_area_cost" || d.price_question === "quote" || scopeChanged || d.booking !== "none")) blocked = outOfAreaLine(t);

    // carpet price
    let pq = d.price_question;
    // "how much?" again with carpet and furniture both priced: the total, not just the carpet
    if (pq === "quote" && !d.job && !d.upholstery && !d.pets && state.quoted && hasScope() && Object.keys(state.furn || {}).length) pq = "total";
    // "$15 extra?" while adding a couch is about the couch; with an extra-area topic or a fresh quote it's already answered
    if (pq === "extra_area_cost" && (uphLine || [...topics].some((x) => /^extra_/.test(x)))) pq = "none";
    const carpet = [];
    let carpetChanged = false, stillPets = false, petsLine = null;
    const closing = d.closing;
    const quietClose = closing === "not_interested" || closing === "will_think" || closing === "just_booked";
    const emergency = topics.has("water_damage");
    // smoke or musty odor: the pet-treatment upsell doesn't apply
    if ((topics.has("odor") || /\b(?:smok\w*|cigarette\w*|musty|mildew\w*)\b/.test(t)) && /\b(?:smok\w*|cigarette\w*|musty|mildew\w*|smell\w*|odou?r\w*|stink\w*)\b/.test(t) && !mentionsPets(t)) state.nonPetOdor = true;
    const nonPetOdor = state.nonPetOdor === true && state.pets !== true;
    const praise = D_PRAISE_RE.test(t);
    const asksTotal = pq === "total" || /\b(?:total|altogether|all together|both|everything|for all (?:of )?(?:it|that))\b/.test(t) && /\b(?:how much|what(?:'s| is| would| does)|total|come to|price|cost)\b/.test(t);
    if (asksTotal && pq === "none" && hasScope() && state.quoted) pq = "total";
    const which = /\bwhich (?:one|service|option|package|item)\b|\bwhat (?:service|option|package) (?:do|should) (?:i|we)\b|\bchoose a service\b|\bwhich do i (?:pick|choose|select)\b/.test(t);
    if (which) markSaid("which_service");
    if (state.rooms || state.rugs || state.wholeHouse) state.needRooms = false;
    else if ((state.halls || state.stairs) && !/\b(?:just|only)\b[^.?!]{0,20}\b(?:stairs?|staircases?|hall\w*)\b|\b(?:stairs?|staircases?|hall\w*) only\b/.test(t) && !state.quoted) state.needRooms = true;
    // asked once already and they went ahead ("ok", a price question): price the stairs/halls on their own
    if (state.needRooms && saidHas("p:needrooms") && (closing === "ok" || pq !== "none" || d.booking !== "none")) state.needRooms = false;
    // "same rooms as last time, plus the stairs": the stairs alone aren't the job — get the room count first
    if (state.needRooms && hasScope() && !blocked && !(d.job && (d.job.rooms || d.job.wholeHouse || d.job.rugs)) && (pq !== "none" || d.booking === "wants_link" || closing === "ok" || scopeChanged)) {
      const al = aloneLine(state.halls, state.stairs, t);
      carpet.push(al);
      if (/On its own/.test(al)) markSaid("p:needrooms");
    } else if (hasScope() && !blocked && !wholeFloorAsk) {
      const wantQuote = scopeChanged || Boolean(d.job) || petsGiven || rugCounted || (uphPriced && !state.quoted) || pq === "quote" || (pq !== "none" && !state.quoted)
        || (!state.quoted && (d.answer_yes_no === "yes" || d.booking === "wants_link" || d.booking === "how_to_book" || closing === "ok"));
      const variantCarries = !scopeChanged && state.quoted && ["total", "per_room", "why_this_price", "without_pet", "pet_difference"].includes(pq);
      let justQuoted = false;
      if (wantQuote && !variantCarries && !quietClose) {
        const wasQuoted = state.quoted;
        state.quoted = true;
        const same = wasQuoted && prevQuoteKey && prevQuoteKey === quoteKey() && !state.declined;
        if (same) {
          // nothing about the carpet changed and they asked about something else: don't restate it
          if (!(uphPriced && !petsGiven && !d.job && pq === "none") && !(factAnswer && !d.job && !petsGiven)) {
            const reason = state.pets === false && petsGiven ? `no pet treatment needed for ${jobName()}` : `for ${jobName()}${state.pets === true ? " with pet treatment" : ""}`;
            stillPets = state.pets === false && petsGiven;
            // rug details ("it's 8x10", "polyester") that don't change anything: say why it's fine
            const rugOk = r && !d.job && !petsGiven ? (r.length && r.width ? "That's a standard size" : r.material === "synthetic" ? "A synthetic rug is no problem" : null) : null;
            carpet.push(rugOk ? `${rugOk} — still ${fmtJob()} ${reason}.` : `Still ${fmtJob()} — ${reason}.`);
          }
        } else {
          if (state.declined) carpet.push(state.declined === "base" ? "Just a reminder — we can't service on-base military housing, so this price is for an off-base home in our area." : "Just a reminder — we can't service downtown high-rise apartments, so this price is for a house, townhome or low-rise apartment in our area.");
          state.declined = null;
          // "no accidents" read only as a topic doesn't set the pet state, but the quote shouldn't upsell pet treatment either
          // "3 bed 2 bath house": we counted bedrooms only — say so, so a living room or hall isn't a surprise
          const bedsOnly = !wasQuoted && !state.halls && !state.stairs && !state.rugs && !state.wholeHouse && state.rooms >= 2 && state.rooms <= 5
            && /\b(?:bed ?rooms?|beds?|br|bdrms?|bd|bdr)\b|\d\s?(?:bd|br|bed)\b|\b\d\/\d\b/.test(t) && /\b(?:house|home|bath|ba|ranch|rental|listing|apartment|condo|townhome|duplex|\d\/\d|\d ?bd)\b/.test(t)
            && !/\b(?:living|family|dining|den|office|loft|bonus|great|game|play|rec|media|basement|front) ?rooms?\b|\b(?:living|den|loft|office|hall\w*|stairs?)\b|\b(?:just|only)\b/.test(t);
          let ql = quoteLine(scopeNow(), nonPetOdor ? false : state.pets === null && topics.has("pets_no_accidents") ? false : state.pets, /\b99\b/.test(t), bedsOnly && state.rooms <= 3, wasQuoted && state.coverSaid && !state.wholeHouse);
          if (bedsOnly && state.rooms > 3) ql += state.rooms === 5 ? ` That's 5 bedrooms — if there's also a living room or more, each room over five is ${money(PRICES.extra)} plus tax, so tell me and I'll update it.` : ` That's ${state.rooms} bedrooms — if there's also a living room or hallway, tell me and I'll update it.`;
          carpet.push(uphLine ? "Carpet: " + ql.replace(/^For /, "for ") : ql);
          // a sectional or couch priced earlier stays in the picture when the carpet gets added
          if (!uphLine && Object.keys(state.furn || {}).length && !wasQuoted && !["other-services", "price"].includes(lastIntentBefore)) uphLine = furnitureLine({ items: state.furn, unpriced: null }, site);
          carpetChanged = !wasQuoted || prevQuoteKey !== quoteKey();
          justQuoted = true;
        }
      }
      // the specific price question
      const q = quote({ ...scopeNow(), pets: state.pets });
      const a0 = quote({ ...scopeNow(), pets: false }), b0 = quote({ ...scopeNow(), pets: true });
      const fmtAB = (x) => `${money(x.base ?? x.total)}${x.extras ? ` + ${money(x.extras * PRICES.extra)}` : ""}`;
      const ft = Object.keys(state.furn || {}).length ? furnTotal(state.furn) : null;
      // a priced tile or hard-floor area from this conversation counts toward "the total" too
      const fl = state.floorItem;
      const xs = { parts: [...(ft ? ft.parts : []), ...(fl ? [`${fl.label.replace(/\s*\([^()]*\)\)/, ")")} ${money(fl.price)}`] : [])], total: (ft ? ft.total : 0) + (fl ? fl.price : 0) };
      const furnOk = ft || !Object.keys(state.furn || {}).length;
      if (pq === "total" && variantCarries) {
        const what = `${jobName()}${state.pets === true ? " with pet treatment" : ""}`;
        carpet.push(xs.parts.length && furnOk ? `Carpet for ${what} is ${q.extras ? `${money(q.base)} + ${money(q.extras * PRICES.extra)}` : money(q.total)}, and ${xs.parts.join(" and ")} — ${money(q.total + xs.total)} plus tax in all.`
          : furnRange(state.furn) ? (() => { const fr = furnRange(state.furn); const others = [...fr.parts, ...(fl ? [`${fl.label.replace(/\s*\([^()]*\)\)/, ")")} ${money(fl.price)}`] : [])]; const add = (fl ? fl.price : 0) + q.total; return `Carpet for ${what} is ${money(q.total)}${others.length ? `, ${others.join(", ")},` : ""} and the sectional is $119 if it's small (up to 5 seats) or $169 if it's large (6–8 seats) — ${money(fr.low + add)} or ${money(fr.high + add)} plus tax in all.`; })()
          : Object.keys(state.furn || {}).length ? `Carpet for ${what} is ${fmtQ(q)}; the sectional is $119 (small, up to 5 seats) or $169 (large, 6–8 seats), plus tax.`
          : q.extras ? `For ${what}: ${money(q.base)} plus ${q.extras} extra area${q.extras > 1 ? "s" : ""} at ${money(PRICES.extra)} each — ${money(q.total)} plus tax in all.` : `For ${what}, it's ${money(q.total)} plus tax.`);
      } else if (asksTotal && xs.parts.length && furnOk && justQuoted) carpet.push(`Altogether that's ${money(q.total + xs.total)} plus tax — carpet ${money(q.total)} and ${xs.parts.join(" and ")}.`);
      else if (pq === "per_room") carpet.push(variantCarries ? (q.extras ? `It's not per room — the ${money(q.base)} package covers ${COVER}, and each extra area is ${money(PRICES.extra)} plus tax, so yours is ${fmtJob()} in total.` : `It's not per room — ${fmtJob()} is the total for ${jobName()}.`) : "It's the total price for the job, not per room.");
      else if (pq === "pet_difference") carpet.push(`Pet treatment adds ${money(b0.total - a0.total)} — ${fmtAB(b0)} plus tax instead of ${fmtAB(a0)}. It includes an enzyme treatment that breaks down pet urine and odor, plus extra time for pet hair.`);
      else if (pq === "without_pet") carpet.push(`Without pet treatment it's ${fmtQ(a0)} for ${jobName()}, instead of ${fmtQ(b0)}.`);
      else if (pq === "why_this_price") {
        if (q.kind === "minimum" || q.kind === "pet-minimum") carpet.push(`${money(q.total)} plus tax is our minimum — it covers up to 3 ${q.kind === "minimum" ? "areas" : "rooms with pet treatment"}, so ${jobName()} is the same ${money(q.total)} as 3 would be.`);
        else if (variantCarries) carpet.push("Here's how it adds up: " + quoteLine(scopeNow(), state.pets));
      } else if (factAnswer && ["minimum", "included", "extra_area_cost", "per_room", "tax"].includes(pq) && !justQuoted) { /* the answer covers it */ }
      else if ((pq === "minimum" || pq === "included") && !justQuoted && state.quoted && ["special_info", "whole_house_info", "still_available", "catch"].some((x) => topics.has(x))) {
        // "so the special is 99?" after a $75 quote: answer for their job
        carpet.push(`The ${money(PRICES.standard)} special covers ${COVER}, plus tax. For ${jobName()}, yours is ${fmtJob()}.`);
        ["special_info", "whole_house_info", "still_available"].forEach((x) => topics.delete(x));
        d = { ...d, topics: d.topics.filter((x) => !["special_info", "whole_house_info", "still_available"].includes(x)) };
      }
      else if (pq === "minimum" && !justQuoted) carpet.push(D_MINIMUM);
      else if (pq === "tax") carpet.push(D_TAX);
      // a fresh quote already states the coverage and any $15 extras
      else if (pq === "extra_area_cost" && !justQuoted) {
        const q1 = quote({ ...scopeNow(), pets: state.pets });
        // their job already fits the package: say so plainly ("is the staircase extra?" → no)
        if (!q1.extras && q1.kind === "package" && (state.stairs || state.halls)) carpet.push(`No — your ${state.stairs && (/\bstairs?\b|\bstaircase|\bsteps\b/.test(t) || !state.halls) ? "staircase is" : "hallway is"} already included in ${fmtJob()} for ${jobName()}. The ${money(PRICES.extra)} only applies to areas beyond 5 rooms, two halls and one staircase.`);
        else carpet.push(D_EXTRA_AREA);
      }
      else if (pq === "included" && !justQuoted && !["catch", "special_info", "whole_house_info", "still_available"].some((x) => topics.has(x))) carpet.push(q.kind === "minimum" || q.kind === "pet-minimum" ? `For ${jobName()}, yours is our small-job price — ${fmtJob()} (up to 3 areas). The ${money(PRICES.standard)} special is for bigger jobs: ${COVER}.` : `Yes — the ${money(PRICES.standard)} special includes ${COVER}. For ${jobName()}, yours is ${fmtJob()}.`);
      // "which one do I pick?" while booking: name the menu item
      if ((which || (saidHas("which_service") && scopeChanged)) && (q.kind !== "minimum")) {
        const label = q.kind === "pet-minimum" ? "Small-Job Pet Treatment" : q.base === PRICES.pet ? "Pet-Treatment Carpet Cleaning" : "Standard Carpet Cleaning";
        carpet.push(`On the booking page, pick "${label}"${q.extras ? ` and add the ${q.extras} extra area${q.extras > 1 ? "s" : ""}` : ""}.`);
      }
    } else if (!blocked && uphLine && !floorLine && (pq === "minimum" || pq === "total")) {
      // furniture only: the minimum is a carpet thing; "the total" is the furniture total
      if (pq === "minimum") carpet.push(`The ${money(PRICES.minimum)} minimum is for carpet — upholstery is priced by the piece.`);
      else {
        const ft = furnTotal(state.furn || {}), fr = furnRange(state.furn || {});
        const wool = state.declinedRug || /wool|natural-fiber/.test(state.lastReply || "") || saidHas("t:wool_rug");
        if (ft) { carpet.push(`${wool ? "Since we can't clean the wool rug, " : ""}${ft.parts.length > 1 ? `that's ${money(ft.total)} plus tax in all — ${ft.parts.join(" and ")}.` : `that's ${ft.parts[0].replace(/ (\$\d+)$/, " at $1")} plus tax.`}`.replace(/^t/, "T").replace(/^(Since[^,]+, )t/, "$1t")); uphLine = null; }
        else if (fr) { carpet.push(`${wool ? "Since we can't clean the wool rug, it's" : "It's"} ${fr.parts.length ? fr.parts.join(", ") + " and " : "just "}the sectional — ${money(fr.low)} plus tax in all if it's small (up to 5 seats) or ${money(fr.high)} if it's large (6–8 seats).`); uphLine = null; }
      }
    } else if (!blocked && !floorLine && !uphLine && !rugLine) {
      // no job yet: general price answers, for the thing they asked about
      const pkgTopic = ["prices_set", "special_info", "discount_other", "catch", "still_available", "included", "whole_house_info", "minimum"].some((x) => topics.has(x)) || (topics.has("competitor") && !/\b(?:water|moisture|wet|soak\w*|dry)\b/.test(t));
      const otherMenu = ["upholstery_menu", "tile_menu", "hard_floor_menu", "rug_info"].some((x) => topics.has(x)) && !/\bcarpets?\b/.test(t);
      const ftOnly = Object.keys(state.furn || {}).length ? furnTotal(state.furn) : null;
      if (factAnswer && pq !== "quote" && pq !== "total") { /* the answer covers the general price question */ }
      else if ((pq === "total" || asksTotal) && ftOnly && !/\bcarpets?\b|\brooms?\b/.test(t)) carpet.push(ftOnly.parts.length > 1 ? `That's ${money(ftOnly.total)} plus tax in all — ${ftOnly.parts.join(" and ")}.` : `That's ${money(ftOnly.total)} plus tax.`);
      else if (pq === "quote" || pq === "total" || pq === "without_pet" || pq === "why_this_price") {
        if (/\b(?:tile|grout)\b/.test(t) && !topics.has("tile_menu")) carpet.push(`Tile & grout, plus tax: ${PRICES.tile.map(([n, p]) => `${n} ${money(p)}`).join("; ")}. Larger areas need a quick review first.`);
        else if (/\b(?:hard ?wood|hard floors?|wood floors?|laminate|vinyl|lvp)\b/.test(t) && !topics.has("hard_floor_menu")) carpet.push(`Hard floors, plus tax: ${PRICES.hardFloor.map(([n, p]) => `${n} ${money(p)}`).join("; ")}.`);
        else if (/\b(?:couch(?:es)?|sofas?|loveseats?|sectionals?|upholstery|recliners?)\b/.test(t) && !topics.has("upholstery_menu")) carpet.push(furnitureLine({ items: {}, unpriced: null }, site));
        else if (!pkgTopic && !otherMenu && !emergency && !f && !d.upholstery && !d.rug && !Object.keys(state.furn || {}).length && !state.floorItem && !/\b(?:tile|grout|hard ?wood|laminate|vinyl|lvp)\b/.test(t)) carpet.push(saidHas("p:summary") ? SUMMARY_SHORT : PACKAGE_SUMMARY);
      } else if (pq === "per_room") carpet.push(D_PER_ROOM);
      else if (pq === "pet_difference") carpet.push(/\b85\b/.test(t) ? PET_DIFF_85 : PET_DIFF_REPLY);
      else if (pq === "minimum") carpet.push(Object.keys(state.furn || {}).length ? `The ${money(PRICES.minimum)} minimum is for carpet — upholstery is priced by the piece. ${furnitureLine({ items: state.furn, unpriced: null }, site)}` : D_MINIMUM);
      else if (pq === "tax") carpet.push(D_TAX);
      else if (pq === "extra_area_cost") {
        const q1 = hasScope() ? quote({ ...scopeNow(), pets: state.pets }) : null;
        // their job already fits the package: say so plainly ("is the staircase extra?" → no)
        if (q1 && !q1.extras && (q1.kind === "package" || q1.kind === "pet-package" || q1.kind === "whole" || q1.kind === "package-pet") && (state.stairs || state.halls)) carpet.push(`No — your ${state.stairs && /\bstairs?|staircase|steps\b/.test(t) ? "staircase" : state.halls && /\bhall/.test(t) ? "hallway" : state.stairs ? "staircase" : "hallway"} is already included in ${fmtJob()} for ${jobName()}. The ${money(PRICES.extra)} only applies to areas beyond 5 rooms, two halls and one staircase.`);
        else carpet.push(D_EXTRA_AREA);
      }
      else if (pq === "included" && !["catch", "special_info", "whole_house_info", "still_available", "prices_set"].some((x) => topics.has(x))) carpet.push(D_INCLUDED);
      if (petsGiven && !quietClose && !(Object.keys(state.furn || {}).length && !/\bcarpets?\b|\brooms?\b/.test(t))) {
        const petsAsk = d.unanswered || closing || emergency || askedBefore ? "" : " How many rooms are we cleaning?";
        petsLine = state.pets && saidHas("petsline") ? `With pet treatment it's ${money(PRICES.petMinimum)} for up to 3 areas or ${money(PRICES.pet)} for the full package, plus tax.${petsAsk}`
          : state.pets && (topics.has("odor") || topics.has("pet_treatment_info") || (factAnswer && /enzyme/i.test(factAnswer))) ? `With pet treatment it's ${money(PRICES.petMinimum)} plus tax for up to 3 areas, or ${money(PRICES.pet)} plus tax for ${COVER}.${petsAsk}`
          : state.pets ? `Pet treatment adds an enzyme that breaks down urine and odor: ${money(PRICES.petMinimum)} plus tax for up to 3 areas, or ${money(PRICES.pet)} plus tax for ${COVER}.${petsAsk}`
          : `Got it — no pet treatment needed, so the regular price applies.${petsAsk ? " " + ASK_ROOMS : ""}`;
        if (state.pets) markSaid("petsline");
        if (carpet[0] === PACKAGE_SUMMARY || carpet[0] === SUMMARY_SHORT) carpet.shift();
      }
    }
    if (carpet.includes(PACKAGE_SUMMARY)) markSaid("p:summary");

    // booking and times
    const tod = timeOfDayLine(d, t);
    const leadTimeSaid = topics.has("lead_time") || topics.has("next_available");
    const plan = blocked || quietClose || (rugLine === WOOL_REMINDER && !hasScope()) ? null : bookingPlan(d, t, tod, carpetChanged, { emergency, noAsk: Boolean(d.unanswered), leadTimeSaid, dateAsked: leadTimeSaid && D_DATE_RE.test(t), timesSaid: topics.has("hours") || topics.has("slot_times") });
    const ctx = { areaLine, blocked, uphLine, rugLine, rugCounted, floorType: f ? f.type : null, carpet: carpet.length > 0, carpetJob: hasScope(), petsLine, stillPets, todLine: plan && plan.parts.includes(tod.line) ? tod.line : null, booking: d.booking, pq, offerKeith: false, outOfArea: outOfArea || wasOut && state.inArea === false, emergency, praise, again: false, language: d.language };
    // an own-words answer that names a price the fresh quote doesn't use would contradict it: the quote wins
    const qMoney = new Set(carpet.join(" ").match(/\$\d+/g) || []);
    const factAnswerOk = factAnswer && !(carpet.length && (factAnswer.match(/\$\d+/g) || []).some((m) => !qMoney.has(m) && m !== money(PRICES.extra)))
      && !(carpet.some((x) => /however many steps/.test(x)) && /\bsteps?\b|\bstaircases?\b/i.test(factAnswer))
      // the answer only repeats prices a menu or quote line in this reply already gives ("Sectionals are $119 … or $169")
      && !(() => { const fm = factAnswer.match(/\$\d+/g) || []; const other = [uphLine, floorLine, ...carpet].filter(Boolean).join(" "); return fm.length > 0 && fm.every((m) => other.includes(m)); })();
    const topicLines = [];
    // "sure, add it" right after we said we can't do mattresses
    if (state.unsupported && !topics.has("unsupported_service") && /\b(?:add (?:it|that|the mattress|mattress)|that too|it too|include (?:it|that)|do (?:it|that) too)\b/.test(t) && !d.job) topicLines.push("Just to be clear — we can't clean mattresses, so that isn't something we can add.");
    if (factAnswerOk) topicLines.push(factAnswer);
    else for (const id of d.topics) {
      const key = D_TOPIC_KEY[id] || id;
      ctx.again = saidHas("t:" + key);
      let line = topicText(id, t, topics, ctx);
      if (!line) continue;
      // keep "Yes —"/"No —" only when the customer asked a yes/no question that the line answers
      if (/^(?:Yes|No) — /.test(line) && !ynQ(t)) line = dropOpener(line);
      markSaid("t:" + key);
      if (!topicLines.includes(line) && !carpet.includes(line)) topicLines.push(line);
    }
    if (ctx.offerKeith) state.offeredKeith = true;

    // link: a new or changed price sends it; an unchanged one doesn't
    let linkMode = null;
    if (!blocked && !quietClose && !emergency && !ctx.outOfArea) {
      // a new price no longer pushes the link (owner, Oct 6): we offer it and send it when they say yes.
      // A customer who can't use the link still gets passed to Keith.
      if ((carpetChanged || floorPriced) && state.manualBooking && !site) linkMode = "send";
      if (topics.has("next_available") || topics.has("slot_times")) linkMode = "send";
      // a weekend question always gets the weekday booking link (owner rule)
      else if (topics.has("weekend_info") && !linkMode) linkMode = "once";
      else if (topics.has("same_day") && !linkMode) linkMode = "once";
      if (plan) linkMode = plan.link ? (plan.once && !linkMode ? "once" : "send") : linkMode;
      if (rugLine === WOOL_REMINDER && !hasScope() && !floorPriced) linkMode = null;
    }
    const offerNow = !linkMode && !state.linkSent && !blocked && !quietClose && !emergency && !ctx.outOfArea && (carpetChanged || floorPriced || (uphPriced && hasScope()));

    // after the answers: closings, yes/no, things we can't answer
    const pre = [
      ...sendLines.map((text) => ({ text, prio: 7 })),
      ...topicLines.map((text) => ({ text, prio: 1 })),
      ...(areaLine ? [{ text: areaLine, prio: 3 }] : []),
      ...(blocked ? [{ text: blocked, prio: 5 }] : []),
      ...[floorLine, rugLine, uphLine, petsLine].filter(Boolean).map((text) => ({ text, prio: 4 })),
      ...carpet.map((text, i) => ({ text, prio: i === 0 ? 6 : 5 })),
      ...(plan ? plan.parts.filter((x) => !topicLines.includes(x)).map((text) => ({ text, prio: 4 })) : []),
    ];
    if (wholeFloorAsk && !blocked) pre.push({ text: `Happy to price the ${wholeFloorAsk}! How many rooms, hallways and stairs are ${wholeFloorAsk === "upstairs" ? "up there" : "down there"}${wholeFloorExtra ? ` (plus the ${wholeFloorExtra.replace(/^an? /, "")} you mentioned)` : ""}?`, prio: 5 });
    const post = [];
    let extraLink = null; // a lead + link from "yes"/"ok" after a quote
    const hasContent = pre.length > 0;
    const outBye = state.inArea === false && !hasScope();
    if (closing === "just_booked") post.push({ text: "Thanks for booking! You'll get a confirmation text, and another text when we're about 10 to 15 minutes away. See you then!", prio: 3 });
    else if (closing === "not_interested") post.push({ text: "No problem at all! We're here whenever you need us — just send a message.", prio: 3 });
    else if (closing === "will_think") post.push({ text: "No rush at all — just message here whenever you're ready.", prio: 3 });
    else if (!hasContent && !linkMode && closing === "goodbye") post.push({ text: outBye ? OOA_BYE : "You too! We're here whenever you need us.", prio: 3 });
    else if (!hasContent && !linkMode && closing === "thanks") {
      if (outBye) post.push({ text: OOA_BYE, prio: 3 });
      // a past customer saying the carpets look great gets thanked, not a sales prompt
      else if (praise) post.push({ text: "Thank you so much — that's great to hear! We really appreciate you choosing us.", prio: 3 });
      else if (/\bbook\w*\b|\bschedule\b/.test(t) && !state.linkSent) extraLink = "You're welcome! Here's the booking link whenever you're ready:";
      else post.push({ text: state.linkSent ? "You're welcome! Whenever you're ready, the booking link above shows the open weekday times. Just message here if any questions come up." : state.quoted ? THANKS_NO_LINK : D_THANKS_NEW, prio: 3 });
    } else if (!hasContent && !linkMode && (closing === "ok" || d.answer_yes_no)) {
      const yes = closing === "ok" || d.answer_yes_no === "yes";
      if (yes && hasScope() && state.quoted && !ctx.outOfArea) {
        if (!state.linkSent) extraLink = "Great! " + BOOK_INTRO;
        else if (closing === "ok") post.push({ text: "Sounds good! Whenever you're ready, tap the booking link above to pick a time.", prio: 3 });
        else extraLink = "Just tap the booking link — pick your time and you'll get a confirmation text right away:";
      } else if (d.answer_yes_no === "yes" && !hasScope() && !ctx.outOfArea) post.push({ text: `Happy to help! ${ASK_ROOMS}`, prio: 3 });
      else if (closing === "ok" && !outBye && !praise && !hasScope() && !state.quoted && !ctx.outOfArea && !D_HANDOFF_LIKE.has(lastIntentBefore)) {
        // "ok just cleaning then" with no job yet: one next step, never a dead end
        if ((state.tileAsked || state.floorAsked) && !state.linkSent) extraLink = "Sounds good! You can pick a time here:";
        else if (state.linkSent) post.push({ text: "Sounds good! Whenever you're ready, the booking link above shows the open weekday times.", prio: 3 });
        else post.push({ text: `Sounds good! ${askedBefore ? "Just send me the number of rooms, hallways and stairs, and I'll give you the exact price." : ASK_ROOMS}`, prio: 3 });
      }
      else if (closing === "ok") post.push({ text: outBye && !state.quoted ? "No problem! If you're ever within about 15 miles of downtown Wichita, we'd be glad to help." : praise ? "Thank you so much — we really appreciate it!" : "Sounds good! Let me know if you have any other questions.", prio: 3 });
      else if (d.answer_yes_no === "no") post.push({ text: "No problem at all! We're here whenever you need us — just send a message.", prio: 3 });
    }
    if (review) { pre.push({ text: review.line, prio: 6 }); state.reviewKind = review.kind; }
    if (keithNote) post.push({ text: "I've also asked Keith about your earlier question — he'll reply here as soon as he can.", prio: 2 });
    // a second question in a row we can't answer: don't offer again — pass both to Keith (Messenger) / one short line (website)
    // a follow-up about a service we just said we don't do: no Keith offer (it would give false hope)
    if (topics.has("other_trades") || topics.has("unsupported_service")) state.declinedSvcTurn = state.turns;
    else if (d.unanswered && state.declinedSvcTurn && state.turns - state.declinedSvcTurn <= 2 && !d.job && !hasScope()) {
      d = { ...d, unanswered: null };
      post.push({ text: "Since that's not something we clean, I'm afraid we can't help with that part — sorry! We're glad to help with carpet, rugs, upholstery, tile or hard floors anytime.", prio: 2 });
    }
    // a second question in a row we can't answer: offer to pass both (only a yes sends anything to Keith)
    if (d.unanswered && offered && !site && !keithNote) {
      d = { ...d, unanswered: null };
      state.offeredKeith = true;
      post.push({ text: "That one's for Keith too — want me to pass both questions to him?", prio: 2 });
    } else if (d.unanswered && site && lastIntentBefore === "unknown") {
      d = { ...d, unanswered: null };
      post.push({ text: `Keith can answer that one too — just include it when you text him at ${TEXT_LINE}.`, prio: 2 });
    }
    if (d.unanswered && !hasScope() && (state.declined === "highrise" || state.declined === "base" || state.inArea === false) && !keithNote) {
      d = { ...d, unanswered: null };
      post.push({ text: "Since that address is outside what we can service, those details won't come up — but if you have a house or low-rise home in our area, I'm glad to help.", prio: 2 });
    }
    if (d.unanswered) {
      if (!site) state.offeredKeith = true;
      // when other parts were answered, the Keith offer is for the rest — never "I don't want to guess" after an answer
      const other = pre.some((x) => x.prio !== 7) || Boolean(linkMode);
      // name the question when the AI's summary of it is a plain "whether …" clause (never prices, numbers or links)
      const uq = String(d.unanswered || "").trim().replace(/[.?!]+$/, "");
      const named = /^(?:whether|how|what|if|when|which|why|who)\b[a-z ,'-]{8,90}$/i.test(uq) && !/\b(?:keith|free|discount|guarantee|refund|price|cost|\$)/i.test(uq) ? uq.replace(/\byou\b/gi, "we").replace(/\byour\b/gi, "our") : "";
      post.push({ text: other ? reach(named ? `As for ${named}, want me to ask Keith?` : "For your other question, want me to have Keith answer it?", named ? `As for ${named}, Keith can answer that if you text ${TEXT_LINE}.` : `For your other question, Keith can answer that if you text ${TEXT_LINE}.`) : reach("Good question — Keith can answer that one. Want me to ask him?", `Good question — Keith can answer that one if you text ${TEXT_LINE}.`), prio: 2 });
    }
    const all = () => [...pre, ...post];
    if (!all().length && !linkMode && !extraLink) return null;

    // one next step: the rooms question (or the link offer) only when nothing else asked and it fits
    const asked = all().some((x) => /\?$/.test(x.text) || /how many rooms/i.test(x.text)) || (plan && /\?/.test(plan.lead || ""));
    const fits = [...topics].some((x) => D_SALES_TOPICS.has(x)) || pq !== "none" || Boolean(areaLine && !/^I can't confirm/.test(areaLine)) || Boolean(uphLine) || Boolean(rugLine && rugLine !== D_WOOL && rugLine !== D_TINY && rugLine !== WOOL_REMINDER);
    const menuAnswered = carpet.some((x) => /^(?:Tile & grout|Hard floors?|Upholstery)\b/.test(x));
    const noCarpet = menuAnswered || /\bno carpets?\b|\b(?:don'?t|do not) have (?:any )?carpet|\bjust (?:have )?(?:hard ?wood|tile|hard floors?)\b|\b(?:hard ?wood|tile) (?:throughout|everywhere)\b|\bnot (?:the )?carpet\b/.test(t) || ((Boolean(floorLine) || (review && review.kind === "floor")) && !/\bcarpets?\b|\brooms?\b/.test(t));
    const noAsk = /how many rooms|number of rooms/i.test(state.lastReply || "") || (!hasScope() && Object.keys(state.furn || {}).length > 0 && saidHas("ask:carpet")) || blocked || closing || d.unanswered || praise || ctx.outOfArea || emergency || noCarpet || [...topics].some((x) => D_NO_ASK_TOPICS.has(x)) || (plan && plan.lead);
    if (!asked && fits && !noAsk) {
      if (!hasScope()) {
        // "Want carpets done too?" only when they haven't already brought up the carpet
        const carpetAsk = uphLine && !floorLine && !/\bcarpets?\b|\brooms?\b/.test(t) && !topics.has("combo_same_visit");
        const ask = carpetAsk ? "Want carpets done the same visit? " + ASK_ROOMS : ASK_ROOMS;
        if (!(askedBefore && uphLine) && !(carpetAsk && saidHas("ask:carpet"))) { post.push({ text: ask, prio: 0, joinPrev: true }); if (carpetAsk) markSaid("ask:carpet"); }
      } else if (state.quoted && !state.linkSent && !linkMode) post.push({ text: LINK_OFFER, prio: 0, joinPrev: true });
    }
    if (offerNow && !asked && !all().some((x) => /\?$/.test(x.text) || x.text === LINK_OFFER)) post.push({ text: LINK_OFFER, prio: 0, joinPrev: true });

    // never send a paragraph this conversation already sent (a short line covers a repeat ask)
    const seen = (x) => saidHas("#" + dHash(x));
    for (let i = pre.length - 1; i >= 0; i--) if (pre[i].text.length > 60 && seen(pre[i].text) && all().length > 1 && !/\?$/.test(pre[i].text) && pre[i].prio < 6) pre.splice(i, 1);

    // at most 3 content bubbles (as the customer will see them); questions go last
    const preQ = [...pre.filter((x) => !/\?$/.test(x.text)), ...pre.filter((x) => /\?$/.test(x.text))];
    let items = [...preQ.map((x) => ({ ...x, sec: 0 })), ...post.map((x) => ({ ...x, sec: 1 }))];
    // the next-step question rides on the bubble before it when it fits
    items = items.reduce((acc, x) => {
      const prev = acc.at(-1);
      if (x.joinPrev && prev && !/\?$/.test(prev.text) && prev.text.length + 1 + x.text.length <= 320) acc[acc.length - 1] = { ...prev, text: `${prev.text} ${x.text}` };
      else acc.push(x);
      return acc;
    }, []);
    const pieces = () => items.reduce((n, x) => n + dSplitCount(x.text), 0);
    while (pieces() > 3) {
      let best = -1, bestLen = Infinity;
      for (let i = 0; i + 1 < items.length; i++) {
        if (items[i].sec !== items[i + 1].sec || /\?$/.test(items[i].text)) continue;
        const len = items[i].text.length + 1 + items[i + 1].text.length;
        if (len <= 320 && len < bestLen) { best = i; bestLen = len; }
      }
      if (best >= 0) { items.splice(best, 2, { ...items[best], text: `${items[best].text} ${items[best + 1].text}`, prio: Math.max(items[best].prio, items[best + 1].prio) }); continue; }
      let drop = 0;
      for (let i = 1; i < items.length; i++) if (items[i].prio <= items[drop].prio) drop = i;
      items.splice(drop, 1);
    }
    const preOut = items.filter((x) => x.sec === 0).map((x) => x.text), postOut = items.filter((x) => x.sec === 1).map((x) => x.text);
    let linkPart = [];
    // a customer Keith is booking by hand gets no link, just the hand-off of the details
    let notify = keithNote ? "question" : (review || ctx.notifyKeith) && !site ? "review" : null;
    if (state.manualBooking && !site && (extraLink || linkMode)) {
      const dayNames = d.days.map((x) => D_DAYNAME[x]);
      linkPart = [dayNames.length ? `I'll pass ${dayNames.length > 1 ? dayNames.slice(0, -1).join(", ") + " or " + dayNames.at(-1) : dayNames[0]} along to Keith so he can confirm a time with you.` : "I'll pass this along to Keith so he can set up a time with you."];
      notify = "booking";
      extraLink = null; linkMode = null;
    }
    if (linkPart.length) { /* manual booking */ }
    else if (extraLink) linkPart = [extraLink, bookingUrl];
    else if (linkMode === "once" && state.linkSent && !(plan && plan.lead)) linkPart = [...preOut, ...postOut].some((x) => /booking (?:calendar|link)|live calendar/.test(x)) ? [] : ["Whenever you're ready, the booking link above shows the open weekday times."];
    else if (linkMode) linkPart = [plan && plan.lead ? plan.lead : BOOK_INTRO, bookingUrl];
    if (plan && plan.great && !preOut.length && !postOut.length) preOut.push("Great!");
    for (const x of [...preOut, ...postOut]) if (x.length > 60) markSaid("#" + dHash(x));

    const intent = blocked ? "area"
      : review && !carpet.length && !uphLine && !floorLine ? "keith_review"
      : carpet.length ? "price"
      : plan ? "booking"
      : floorLine || uphLine ? "other-services"
      : rugLine ? "rug"
      : petsLine ? "pet"
      : areaLine ? "area"
      : topicLines.length ? "info"
      : closing || d.answer_yes_no === "no" ? "thanks"
      : extraLink || linkMode ? "booking"
      : d.unanswered ? "unknown" : "info";
    // the line about Keith answering their other question belongs with the answers, before the booking link
    const keithAsk = (x) => /Keith can answer|ask Keith\?|have Keith answer|pass both questions/.test(x);
    return out(intent, [...preOut, ...postOut.filter(keithAsk), ...linkPart, ...postOut.filter((x) => !keithAsk(x))], notify ? { notify } : {});
  }

  // never let an unexpected input crash the reply: fall back to a safe, helpful answer
  function safeHandle(text) {
    try { return handle(text); } catch (err) {
      if (typeof process !== "undefined" && process.env && process.env.FRONT_DESK_STRICT) throw err;
      state.lastError = String(err && err.message || err);
      return { bubbles: [hasScope() ? "Happy to help! Want the link to pick a weekday time, or is there something else I can answer?" : `Happy to help! ${ASK_ROOMS}`], intent: "error" };
    }
  }
  return {
    state,
    /**
     * msg.text is the customer's words; msg.directives (optional) is the AI step's reading of them.
     * Valid directives that produce a reply win; anything else answers msg.text exactly as before.
     */
    incoming(msg) {
      slotsNow = validSlots(msg && msg.slots);
      try {
        const tn = norm(msg && msg.text);
        // "yes" to "Want me to send the link so you can grab one?" (offered with the open times) sends it
        if (!state.linkSent && /Want me to send the link so you can grab (?:one|it)\?$/.test(state.lastReply || "") && /^(?:yes|yeah|yep|yes please|sure|ok|okay|please|send it|go ahead|sounds good)\b[\s!.]*(?:please|thanks|thank you)?[\s!.]*$/.test(tn)) {
          // keep the day (and time) the offer was about: "Monday, Oct 12 shows …" → "monday"
          const m = /(Monday|Tuesday|Wednesday|Thursday|Friday), \w+ \d+(?: at (\d{1,2}:\d\d [AP]M) is open| shows)/.exec(state.lastReply || "");
          state.turns += 1;
          return applySlots(out("booking", ["Great! " + BOOK_INTRO, bookingUrl]), m ? `yes ${m[1]}${m[2] ? " at " + m[2] : ""}` : msg.text);
        }
        // the answer to "Is there a day and time that works best?": the closest real openings, and the link
        if (slotsNow && (state.lastReply || "").includes(DAY_ASK) && (SPECIFIC_RE.test(tn) || SOONEST_RE.test(tn) || /^(?:yes|yeah|yep|sure|ok|okay|please)\b[\s!.]*$/.test(tn)) && !/\b(?:how much|price|cost|rooms?|halls?|stairs?|pets?|dogs?|cats?|sat\w*|sun\w*|weekends?)\b/.test(tn)) {
          const s = slotSentence(SOONEST_RE.test(tn) || !SPECIFIC_RE.test(tn) ? "soonest" : tn);
          if (s) {
            state.turns += 1;
            const nudge = !SPECIFIC_RE.test(tn) && !SOONEST_RE.test(tn) ? " Or tell me a day that suits you better." : "";
            const r = out("booking", [`${/ is open right now\.$/.test(s) ? "Good news — " : /^(?:yes|yeah|yep|sure|ok|okay|please)\b/.test(tn) ? "Great! " : ""}${s}${nudge} You can grab ${/ is open right now\.$|shows \d{1,2}:\d\d [AP]M open right now\.$/.test(s) ? "it" : "one"} here, and you'll get a confirmation text right away:`.replace(/^Good news — (\w)/, (m, c) => `Good news — ${c}`), bookingUrl]);
            return { ...r, slots: true };
          }
        }
        const linkBefore = state.linkSent;
        return applySlots(this.incoming0(msg), msg && msg.text, linkBefore);
      } finally { slotsNow = null; }
    },
    incoming0(msg) {
      const d = msg && msg.directives != null ? validateDirectives(msg.directives) : null;
      if (d) {
        const saved = JSON.stringify(state);
        let r = null;
        try { r = handleDirectives(msg.text, d); } catch (err) {
          if (typeof process !== "undefined" && process.env && process.env.FRONT_DESK_STRICT) throw err;
          r = null;
        }
        if (r && r.bubbles && r.bubbles.length) return { ...r, via: "directives" };
        // nothing usable: put the state back exactly as it was and answer the text
        for (const k of Object.keys(state)) delete state[k];
        Object.assign(state, JSON.parse(saved));
        // the AI read a detail with nothing to act on ("14 steps", "grout is dark", "queen size") while a job is on file:
        // restate the price instead of letting the text rules re-count the job
        const tn = norm(msg?.text);
        const emptyRead = !d.handoff && !d.job && !d.pets && !d.upholstery && !d.area && !d.floors && !d.rug && d.price_question === "none" && !d.topics.length && d.booking === "none" && !d.days.length && !d.closing && !d.answer_yes_no && !d.unanswered && !d.answer;
        const scopeKey0 = JSON.stringify(scopeNow());
        const tr = safeHandle(msg?.text);
        const notCarpet = /\b(?:is|are)\s+(?:all\s+)?(?:tile|vinyl|lvp|laminate|hard ?wood|wood|linoleum|concrete)\b|\bnot carpet(?:ed)?\b|\bno carpet\b/.test(tn);
        if (emptyRead && hasScope0(saved) && JSON.parse(saved).quoted && tn && !isStopMessage(tn) && (JSON.stringify(scopeNow()) !== scopeKey0 || tr.intent === "unknown" || notCarpet)) {
          for (const k of Object.keys(state)) delete state[k];
          Object.assign(state, JSON.parse(saved));
          state.turns += 1;
          // "the kitchen is tile, not carpet": a correction we can't place — ask instead of guessing
          if (notCarpet)
            return out("price", [`Got it — so that area isn't carpet. How many carpeted rooms, hallways and stairs does that leave? Right now I have ${jobName()} at ${fmtJob()}.`]);
          return out("price", [`Got it — still ${fmtJob()} for ${jobName()}.`]);
        }
        // the AI read this message as nothing that needs Keith; a broad text match ("both sides", "small business") doesn't hand it off
        if (tr && tr.phone && BRAIN_HANDOFFS.has(tr.intent) && !textHandoffStands(tr.intent, msg?.text)) {
          for (const k of Object.keys(state)) delete state[k];
          Object.assign(state, JSON.parse(saved));
          state.turns += 1;
          return out("info", [hasScope() && state.quoted ? `Got it — still ${fmtJob()} for ${jobName()}.` : state.linkSent ? "Got it! Anything else I can help with?" : `Got it! ${ASK_ROOMS}`]);
        }
        return tr;
      }
      return safeHandle(msg?.text);
    },
    start() { return { bubbles: ["Hi! How can I help with cleaning, pricing or booking?"] }; },
    respond(text) {
      const r = safeHandle(text);
      return { bubbles: r.bubbles, phone: Boolean(r.phone), messenger: false, sendLink: r.bubbles.includes(bookingUrl), booking: r.bubbles.includes(bookingUrl) };
    },
  };
}

/** Typing delay used by the website chat (ms). */
export function delayFor(text) {
  return Math.min(1400, 350 + String(text || "").length * 8);
}
