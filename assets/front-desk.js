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
  tile: [["bathroom (up to 100 sq ft)", 99], ["kitchen (up to 150 sq ft)", 129], ["whole-floor clean & seal (up to 400 sq ft)", 259]],
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
const ROOM_WORD = "(?:bed ?rooms?|bed ?rms?|bedrms?|bdrms?|bdr|bds?|beds?|br|rooms?|rms|carpeted rooms?|areas?(?! ?rugs?)|living(?: ?rooms?)?|family ?rooms?|dining ?rooms?|dens?|offices?|lofts?|lrs?|frs?|cuartos?|rec[aá]maras?|habitaciones?)";
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
  [/\bgive me a ring\b|\bring me\b/g, "call me"], [/\bparking (?:spot|space)s?\b/g, "parking"], [/\b(?:rugs? )?runners?\b/g, "rug"], [/\bkitchen chairs?\b/g, (m) => (m.endsWith("s") ? "dining chairs" : "dining chair")],
];
function norm(text) {
  let t = String(text ?? "").slice(0, 2000).normalize("NFKD").replace(/[̀-ͯ​-‏‪-‮⁠﻿️⃣]/g, "")
    .replace(/👍|👌|✅|🙂👍/g, " ok ").toLowerCase().replace(/[’‘`]/g, "'").replace(/[“”]/g, '"')
    .replace(/([a-z])-(?=[a-z])/g, "$1 ").replace(/\s+/g, " ").trim();
  for (const [re, to] of TYPOS) t = t.replace(re, to);
  return t.replace(/\s+/g, " ").trim();
}
const has = (t, re) => re.test(t);
const money = (n) => `$${n}`;

/* ---------- reading the customer's message ---------- */

export function readScope(t) {
  // "the 6th room", "2nd bedroom" name a room, they don't count rooms
  t = t.replace(/\b\d+(?:st|nd|rd|th) (?:bed ?)?room\b/g, " ")
    // common typos
    .replace(/\b(and|the|plus|&|with) stars\b/g, "$1 stairs").replace(/\bhall way(s?)\b/g, "hallway$1").replace(/\bbedrm(s?)\b/g, "bedroom$1").replace(/\bbed rooms\b/g, "bedrooms")
    .replace(new RegExp(`\\b(just|only) ${N} of the (bed ?)?rooms\\b`, "g"), "$1 $2 rooms");
  // removals: "remove one bedroom", "take off 2 rooms", "no stairs", "skip the halls", "one less room"
  const remove = { rooms: 0, halls: 0, stairs: 0, rugs: 0, allHalls: false, allStairs: false, any: false };
  const ITEM = "(bed ?rooms?|rooms?|hall ?ways?|halls?|stair ?cases?|stairs?|steps|flights?|area rugs?|rugs?)";
  const remRe = new RegExp(`\\b(?:remove|take off|take out|minus|subtract|drop|skip(?:ping)?|forget(?: about)?|without|leave (?:off|out)|nix|exclude|except|cross off|scratch|no|don'?t need|do not need|not doing|not the)\\s+(?:the\\s+|a\\s+|an\\s+|any\\s+|my\\s+|our\\s+)?(?:${N}\\s+)?(?:of the\\s+)?${ITEM}\\b|\\b${N}\\s+(?:less|fewer)\\s+${ITEM}\\b|\\b${ITEM}\\s+(?:removed|taken off)\\b`, "g");
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
  for (const m of scan.matchAll(new RegExp(`\\b${N}\\s*(more |extra |additional |other )?${ROOM_ADJ}${ROOM_WORD}\\b`, "g"))) {
    if (/^(?:a|an)$/.test(m[1]) && perRoomQuestion) continue;
    const before = scan.slice(Math.max(0, m.index - 22), m.index);
    if (/\b(?:don'?t|doesn'?t|do not|does not|not|isn'?t|aren'?t|never|no longer) (?:have |got |really |actually )*$/.test(before)) continue;
    if (/\b(?:in|on|from|across|through|throughout|of) (?:the |that |this |my |our )?$/.test(before) && (found || /^(?:a|an|one|1)$/.test(m[1]))) continue;
    rooms += num(m[1]) ?? 0; found = true; if (m[2]) adding = true;
  }

  // named single rooms: "living room", "front room", "lr", and bare "living"/"dining" in a list
  const NAMED = /\b(?:living|front|family|dining|great|bonus|game|play|sun|media|rec|tv|sitting|computer|craft|exercise|laundry|guest|master|primary)\s?rooms?\b|\b(?:den|office|loft|basement|nursery|study|lr|fr)\b|\b(?:living|dining)\b(?!\s?(?:rooms?|chairs?|table|here|in|at|with|area rug))/g;
  const numberedBedrooms = new RegExp(`\\b${N}\\s*(?:more |extra |additional )?${ROOM_ADJ}(?:bed ?rooms?|bdrms?|bdr|bds?|beds?|br)\\b`).test(t);
  const namedList = [];
  for (const m of t.matchAll(NAMED)) {
    const w = m[0];
    const before = t.slice(Math.max(0, m.index - 24), m.index);
    const bare = /^(?:living|dining)$/.test(w);
    if (bare && !/(?:,|\band|&|\+|plus|the|my|our|\d|beds?|bedrooms?|br)\s*$/.test(before) && !/^\s*(?:,|and\b|&|\+)/.test(t.slice(m.index + w.length))) continue;
    if (new RegExp(`${N}\\s*(?:more |extra |additional |other )?${ROOM_ADJ}$`).test(before)) { namedList.push(w.replace(/\s+/g, " ")); continue; } // already counted with its number
    if (rooms > 0 && /\b(?:in|on|down in|up in) (?:the |my |our )?$/.test(before) && /^(?:basement|loft|bonus ?room|upstairs|downstairs)$/.test(w)) continue;
    if (/^\W*(?:is carpeted,? |is all carpet,? )?(?:it'?s |is |which is |that'?s )(?:one|a|just one|just a) (?:big |large |open |huge |single )*room\b/.test(t.slice(m.index + w.length, m.index + w.length + 50))) continue; // "basement is one big room" // "2 more rooms in the basement"
    namedList.push(w.replace(/\s+/g, " "));
    if (new RegExp(`\\b(?:except|not|minus|but not|excluding) (?:the )?${w}\\b`).test(t)) continue;
    if (/\b(?:guest|master|primary)\s?rooms?\b/.test(w) && numberedBedrooms) continue; // already counted as a bedroom
    if (/\b(?:in|on|from|of) (?:the |my |our |that |this )?$/.test(before)) located += 1;
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
  if (!listCounted && !perRoomQuestion && /\bbed ?room\b/.test(t) && !numberedBedrooms && !inRoom && !/\b(?:a|one|1|each|per) bed ?room\b/.test(t.replace(/\bbed ?rooms\b/g, ""))) { rooms += 1; found = true; bare = !rooms || rooms === 1; }
  else if (!rooms && !perRoomQuestion && !inRoom && /\b(?:bed ?room|room)\b/.test(t) && !/\brooms\b/.test(t)) { rooms += 1; found = true; bare = true; }
  // standard area rugs: each counts as one of the rooms in the package
  let rugs = 0;
  const rug = t.match(new RegExp(`\\b(?:${N}\\s+)?(?:standard |small |medium |large )?(?:area )?rugs?\\b`));
  if (rug && (found || rug[1] || /\b(?:and|plus|with)\b[^.]*\brugs?\b/.test(t) || /\b(?:how much|price|cost)\b/.test(t) || (/\b(?:need|needs|cleaned|just|only|my|\d+ ?x ?\d+|regular|polyester|synthetic|nylon|olefin)\b/.test(t) && !/\bdo you\b/.test(t)))) { rugs = rug[1] ? (num(rug[1]) ?? 1) : 1; found = true; }
  // hallways
  const hm = t.match(new RegExp(`\\b${N}\\s*(?:more |extra |additional )?(?:hall ?ways?|halls?)\\b`));
  const ORD = { second: 2, "2nd": 2, third: 3, "3rd": 3, fourth: 4, "4th": 4 };
  const hOrd = t.match(/\b(second|2nd|third|3rd|fourth|4th) (?:hall ?way|hall)\b/), sOrd = t.match(/\b(second|2nd|third|3rd|fourth|4th) (?:stair ?case|set of stairs|flight(?: of stairs)?|stairs)\b/);
  if (hOrd) { halls = ORD[hOrd[1]]; found = true; }
  else if (hm) { halls = num(hm[1]) ?? 1; found = true; }
  else if (/\b(?:hall ?ways?|halls?)\b/.test(t)) { halls = /\b(?:hall ?ways|halls)\b/.test(t) ? 2 : 1; found = true; }
  // stairs
  const sm = t.match(new RegExp(`\\b${N}\\s*(?:more |extra |additional )?(?:(?:short|small|big|long|full|half|little|separate|different) )?(?:stair ?cases?|flights?(?: of stairs)?|sets? of stairs|stair ?ways?)\\b`));
  if (sOrd) { stairs = ORD[sOrd[1]]; found = true; }
  else if (sm) { stairs = num(sm[1]) ?? 1; found = true; }
  else if (/\b(?:stairs?|stair ?cases?|steps)\b/.test(t)) { stairs = 1; found = true; }
  // "make it 5", "nvm just 3", "only 2" -> replace room count
  const replace = t.match(new RegExp(`\\b(?:make it|just|only|nvm|never ?mind|actually|no wait|wait|sorry|oops|correction|i meant|i mean|scratch that)[,!.]?\\s*(?:it'?s |its |make it |just |only )?${N}\\b(?!\\s+of\\b)(?!\\s*(?:hall|stair|min|hour|pm|am|dollar|\\$))`));
  const addMore = t.match(new RegExp(`^(?:and|plus|\\+)\\s*${N}\\s*more\\b`)) || (/^(?:and |ok |oh |also )?(?:add|adding|plus|throw in|include) (?:a |the |one )?(?:third|fourth|fifth|sixth|seventh|another|one more|1 more|extra)(?: (?:bed ?)?room| one)?\b/.test(t) && !/\b(?:hall|stair|rug)/.test(t) ? [null, "1"] : null);
  const noN = t.match(new RegExp(`^no[,!. ]+(?:it'?s |its |make it )?${N}(?:\\s*rooms?)?[.!]*$`));
  const replaceRooms = (replace || noN) && !found ? num((replace || noN)[1]) : null;
  // several counts plus a correction word: the last stated count wins ("3 rooms, no wait 5, actually 4")
  const countRe = new RegExp(`\\b${N}\\s*(?:more |extra |additional |other )?${ROOM_ADJ}${ROOM_WORD}\\b`, "g");
  const corrections = [...t.matchAll(/\b(?:no wait|wait no|wait|actually|i mean|i meant|correction|sorry|scratch that|make (?:it|that)|oops|no)\b[,!.]?\s*/g)];
  if (found && corrections.length && (t.match(countRe) || []).length + (/\d|\b(?:one|two|three|four|five|six|seven|eight|nine|ten)\b/.test(t.slice(corrections.at(-1).index)) ? 1 : 0) > 1) {
    const tail = t.slice(corrections.at(-1).index + corrections.at(-1)[0].length);
    const tc = tail.match(new RegExp(`^(?:it'?s |its |make it |just |only )?${N}`)) || tail.match(countRe.source ? new RegExp(countRe.source) : /$^/);
    const n = tc ? num(tc[1]) : null;
    if (n && !new RegExp(`^${N}\\s*(?:hall|stair|flight|rug)`).test(tail)) { rooms = n + (rugs || 0) * 0; rangeHigh = 0; }
  }
  if (addMore && !found) { rooms = num(addMore[1]) ?? 0; found = true; adding = true; }
  const whole = /\bwhole (?:house|home|downstairs|upstairs|place|thing)\b|\bentire (?:house|home)\b|\ball (?:the )?(?:carpets?|rooms)\b/.test(t);
  if (whole && !rooms) return { wholeHouse: true, found: true, rooms: 0, rugs, halls, stairs, adding: false, perRoomQuestion, rangeHigh: 0, namedList: [], remove };
  return { remove, found, rooms, rugs, halls, stairs, adding, replaceRooms, perRoomQuestion, rangeHigh, namedList, bare: bare && !halls && !stairs && !rugs,
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
  t = t.replace(/\b(?:do|would|will|should|does) (?:i|we|she|he|they) (?:really |even |still )?(?:need|have to (?:get|do)|want) (?:the |a )?pet (?:treatment|one|package|version|special)\b|\b(?:is|would) (?:the )?pet (?:treatment|one|package) (?:be )?(?:required|necessary|needed)\b|\bneed pet treatment\s*\?/g, " ");
  if (/\bnever ?mind (?:on |about )?(?:the )?pet\b|\b(?:skip|drop|forget|cancel|no need for|don'?t need) (?:the )?pet (?:treatment|one|package)\b/.test(t)) return false;
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
  const extras = Math.max(0, rooms - PRICES.includes.rooms) + Math.max(0, halls - PRICES.includes.halls) + Math.max(0, stairs - PRICES.includes.stairs);
  const base = pets === true ? PRICES.pet : PRICES.standard;
  return { kind: "package", base, total: base + extras * PRICES.extra, extras, pets };
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

function quoteLine(scope, pets, mention99 = false, bedroomsOnly = false) {
  const q = quote({ ...scope, pets });
  const what = scope.wholeHouse ? "the whole house" : describe(scope);
  if (q.kind === "minimum") {
    return `For ${what}, it's ${money(PRICES.minimum)} plus tax — that's our price for up to 3 ${scope.halls || scope.stairs ? "areas" : "rooms"}.` + (mention99 ? ` The ${money(PRICES.standard)} special covers up to 5 rooms, two halls, and one staircase.` : "") +
      (bedroomsOnly ? ` If there's also a living room, hallway or stairs, tell me and I'll update it — the ${money(PRICES.standard)} special covers ${COVER}.` : "") +
      (pets === null ? " Pet treatment is available if you need it." : "");
  }
  if (q.kind === "pet-minimum") return `For ${what} with pet treatment, it's ${money(PRICES.petMinimum)} plus tax (pet treatment for up to 3 rooms).`;
  const pkg = q.base === PRICES.pet ? `${money(PRICES.pet)} pet-treatment special` : `${money(PRICES.standard)} whole-house special`;
  if (scope.wholeHouse) {
    return `For the whole house, our ${pkg} is ${money(q.total)} plus tax and covers ${COVER} — each area beyond that is ${money(PRICES.extra)}.` +
      (pets === null ? ` With pet treatment it's ${money(PRICES.pet)}.` : "");
  }
  let line;
  if (q.extras) {
    const overRooms = Math.max(0, (scope.rooms || 0) + (scope.rugs || 0) - PRICES.includes.rooms);
    const overRugs = Math.min(scope.rugs || 0, overRooms), overPlain = overRooms - overRugs;
    const why = [];
    if (overPlain) why.push(`each room over five is an additional ${money(PRICES.extra)} plus tax`);
    if (overRugs) why.push(`each additional standard area rug is ${money(PRICES.extra)} plus tax`);
    if ((scope.halls || 0) > PRICES.includes.halls) why.push(`each additional hall is ${money(PRICES.extra)} plus tax`);
    if ((scope.stairs || 0) > PRICES.includes.stairs) why.push(`each additional staircase is ${money(PRICES.extra)} plus tax`);
    const anyRugs = overRugs > 0;
    const sum = anyRugs && q.extras <= 4 ? `${money(q.base)} + ${Array(q.extras).fill(money(PRICES.extra)).join(" + ")}` : `${money(q.base)} + ${money(q.extras * PRICES.extra)}`;
    line = `For ${what}: the ${pkg} covers ${COVER}, and ${why.join("; ")} — so it's ${sum}, plus tax.`;
  } else {
    line = `For ${what}, that's our ${pkg} — ${money(q.total)} plus tax. It covers ${COVER}.`;
  }
  if (pets === null) line += q.extras
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
    if (f.key.endsWith("sectional")) sawSectional = true;
    items[f.key] = f.each ? (num(m[1]) ?? 1) : 1;
  }
  if (items.sectional) {
    const seats = t.match(/\b(\d{1,2}|three|four|five|six|seven|eight|nine|ten)[ -]?(?:seats?|seater|seated|pieces?|sections?|cushions?)\b/) || t.match(/\b(?:seats?|seater|sections?|pieces?)\s*(?:is |are |of )?(\d{1,2}|three|four|five|six|seven|eight|nine|ten)\b/);
    const n = seats ? num(seats[1]) : null;
    if (n) { delete items.sectional; items[n >= 6 ? "large_sectional" : "small_sectional"] = 1; }
  }
  const unpriced = (t.match(UNPRICED_FURN) || [])[0] || null;
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
  const special = f.special ? " Specialty fabrics like leather or velvet, heavy staining, or oversized pieces may need a quick review before the price is final — feel free to send a photo." : "";
  if (it.sofa && it.loveseat && it.chair) {
    const more = extrasAfterSet({ sofa: it.sofa - 1, loveseat: it.loveseat - 1, chair: it.chair - 1 });
    return `A sofa, loveseat and chair or recliner is our complete seating package — ${money(179)} plus tax.` + (more.length ? ` Plus ${more.join(" and ")}, plus tax. Those are per-item prices, not a confirmed combined total.` : "") + special;
  }
  if (it.sofa && it.loveseat && !it.dining && !Object.keys(it).some((k) => k.endsWith("sectional"))) {
    const more = extrasAfterSet({ sofa: it.sofa - 1, loveseat: it.loveseat - 1 });
    return `A sofa and loveseat together are ${money(149)} plus tax.` + (more.length ? ` Plus ${more.join(" and ")}, plus tax. Those are per-item prices, not a confirmed combined total.` : "") + special;
  }
  const parts = [];
  for (const [k, n] of Object.entries(it)) {
    const f2 = FURN.find((x) => x.key === k);
    if (!f2) continue;
    if (f2.price == null) { parts.push("sectionals are $119 for a small one (up to 5 seats) or $169 for a large one (6–8 seats)"); continue; }
    parts.push(f2.each && n > 1 ? `${n} ${f2.key === "dining" ? "dining chairs" : f2.key === "chair" ? "recliners or accent chairs" : f2.label + "s"} at ${money(f2.price)} each` : `${f2.label} ${money(f2.price)}`);
  }
  if (!parts.length) return `Upholstery, plus tax: ${PRICES.furniture.map(([n, p]) => `${n} ${money(p)}`).join(", ")}. Very large pieces or special fabrics may need a quick look.`;
  const multi = parts.length > 1;
  return `Upholstery, plus tax: ${parts.join("; ")}.` + (multi ? " Those are per-item prices, not a confirmed combined total." : "") + special;
}

/* ---------- the conversation ---------- */

const METHOD_REPLY = "We use low-moisture encapsulation with a BrushPro counter-rotating brush. We pretreat the carpet, then agitate the fibers to loosen soil without soaking the carpet. Wichita Carpet Cleaning Services does not claim Carpet and Rug Institute (CRI) certification or endorsement.";
const DRY_REPLY = "Carpet dry time is about 1.5 to 2 hours. It typically dries in that window, though humidity, airflow, and carpet conditions can change that.";
const PAYMENT_REPLY = "We can take cash at the job, or we send a payment link right after the job is completed. That link can be paid by card, Apple Pay, and similar methods. We do not accept checks.";
const LICENSE_REPLY = "Carpet cleaning does not require licensing or registration in Kansas. We are insured.";
const JOB_LENGTH_REPLY = "It should take about 1.5 to 2 hours to finish everything up.";
const VACUUM_REPLY = "You do not need to do special vacuuming — just pick up large debris. We typically vacuum beforehand unless there is major cat litter or construction debris.";
const FURNITURE_MOVE_REPLY = "We move smaller items like couches, loveseats and coffee tables so we can clean underneath, then put them back. Beds, dressers and entertainment centers stay put, so clear those if you want the carpet under them cleaned.";
const SATISFACTION_REPLY = "If you're not satisfied, we're always happy to come back out and fix the issue.";
const LEAD_TIME_REPLY = "We recommend booking at least a week ahead, and we often have weekday openings sooner. We don't offer same-day service right now.";
const TIPS_REPLY = "Technicians do accept tips if you'd like to leave one, but it's absolutely not expected. Either way, we're glad to take care of the job.";
const UTILITIES_REPLY = "We do need electricity for our equipment, but water is not required. If an outlet is easy to reach, that's all we need from you.";
const FRAGRANCE_REPLY = "If you're sensitive to fragrances, just put that in the notes when you book. We have products designed for that and will plan around it.";
const PARKING_REPLY = "No special parking needed — street or driveway parking that works for your home is all we need.";
const RUNNING_LATE_REPLY = "If we're running behind schedule, we'll reach out as soon as we realize it. We almost always arrive within about 10 minutes of the appointment time.";
const ON_THE_WAY_REPLY = "Yes — you'll get a text about 10 to 15 minutes before we arrive, once we're headed your way.";
const CLOSET_REPLY = "A walk-in closet doesn't count as an extra area.";
const SAFETY_REPLY = "If children, pets, or anyone with a product sensitivity will be home, just tell us before the visit (a note when you book is perfect) so we can review the products we use. Keep foot traffic light until the carpet is fully dry — about 1.5 to 2 hours.";
const MILITARY_REPLY = "Yes — we offer 15% off for military, first responders, and teachers. Please put that in the notes when you book so we can apply it.";
const IDENTITY_REPLY = "I'm the automated assistant for Wichita Carpet Cleaning Services — I can give you a price and get you booked, or get Keith (the owner) if you need him.";
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

const PACKAGE_SUMMARY = `The ${money(PRICES.standard)} special covers ${COVER}, plus tax. With pet treatment it's ${money(PRICES.pet)}. Smaller jobs (up to 3 areas) are ${money(PRICES.minimum)}.`;
const ASK_ROOMS = "How many rooms, hallways and stairs are we cleaning?";
const BOOK_INTRO = "Here are the open weekday times — pick one and you'll get a confirmation text right away:";
const DAY = "(?:mon|monday|tue|tues|tuesday|wed|weds|wednesday|thu|thur|thurs|thursday|fri|friday)";

export function createConversation(init = {}) {
  const state = {
    channel: init.channel || "messenger",
    rooms: init.rooms ?? 0, rugs: init.rugs ?? 0, city: init.city ?? null, zip: init.zip ?? null, inArea: init.inArea ?? null, halls: init.halls ?? 0, stairs: init.stairs ?? 0, wholeHouse: init.wholeHouse ?? false,
    pets: init.pets ?? null, quoted: init.quoted ?? false, linkSent: init.linkSent ?? false, unsupported: init.unsupported ?? false, greeted: init.greeted ?? false, named: init.named ?? [],
    unknownCount: init.unknownCount ?? 0, turns: init.turns ?? 0, lastIntent: init.lastIntent ?? "",
    furn: init.furn ?? {}, unknownQ: init.unknownQ ?? 0, offeredKeith: init.offeredKeith ?? false, helpAsked: init.helpAsked ?? false, askedRooms: init.askedRooms ?? false, tileAsked: init.tileAsked ?? false,
    version: "front-desk-v2",
  };
  const site = state.channel === "site";
  const reach = (messengerLine, siteLine) => (site ? siteLine : messengerLine);
  /** Update the job from what the customer just said. Returns true when the job changed. */
  function applyScope(scope, t, { adding = false, inclusionQ = false } = {}) {
    let changed = false;
    if (scope.found) {
      changed = true;
      for (const w of scope.namedList || []) if (!state.named.includes(w)) state.named.push(w);
      if (scope.wholeHouse) state.wholeHouse = true;
      else if (inclusionQ && !state.wholeHouse) { state.rooms += scope.rooms; }
      else if ((adding || scope.adding) && state.wholeHouse) { state.wholeHouse = false; state.rooms = PRICES.includes.rooms + scope.rooms; state.rugs += scope.rugs || 0; state.halls += scope.halls; state.stairs += scope.stairs; }
      else if ((adding || scope.adding) && hasScope()) { state.rooms += scope.rooms; state.rugs += scope.rugs || 0; state.halls += scope.halls; state.stairs += scope.stairs; }
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
    return changed;
  }
  let topicIntent = "";

  function out(intent, bubbles, extra = {}) {
    state.lastIntent = intent;
    if (intent !== "unknown") { state.unknownCount = 0; state.unknownQ = 0; }
    const list = bubbles.filter(Boolean).map((b) => b.replace(/\s+/g, " ").trim()).filter(Boolean);
    if (list.includes(bookingUrl)) state.linkSent = true;
    state.askedRooms = list.some((b) => /how many rooms/i.test(b));
    if (list.some((b) => /^Tile & grout/.test(b))) state.tileAsked = true;
    return { bubbles: list, intent, ...extra };
  }
  const withLink = (lines) => [...lines, BOOK_INTRO, bookingUrl];
  // after the link has gone out once, point back to it instead of re-sending it
  const linkOnce = (lines) => (state.linkSent ? [...lines, "Whenever you're ready, the booking link above shows the open weekday times."] : withLink(lines));
  const hasScope = () => state.wholeHouse || state.rooms + state.rugs + state.halls + state.stairs > 0;
  const scopeNow = () => ({ rooms: state.rooms, rugs: state.rugs, halls: state.halls, stairs: state.stairs, wholeHouse: state.wholeHouse });
  const askNext = () => (hasScope() ? "Want the link to pick a weekday time?" : ASK_ROOMS);

  function handle(raw) {
    let t = norm(raw);
    state.turns += 1;
    topicIntent = "";
    if (t === "__attachment__") return out("photo", ["Thanks for the photo! " + askNext()]);
    if (!t) {
      if (state.greeted || state.turns > 1) return out("greeting", []);
      state.greeted = true;
      return out("greeting", ["Hi! What would you like cleaned?"]);
    }
    if ((/^(?:please )?stop(?: it| now)?(?:[\s!.,]+stop)*[\s!.,]*(?:please)?$/.test(t) || /\b(?:unsubscribe|opt[ -]?out|(?:stop|quit|don'?t keep|no more) (?:messaging|texting|contacting|sending|bugging|spamming|messages to) me|stop (?:the )?messages|remove me|take me off|leave me alone)\b/.test(t)) && !/\bcall me\b/.test(t)) {
      return out("stop", []);
    }
    // we offered to get Keith for a question we couldn't answer; "yes" takes us up on it
    if (state.offeredKeith) {
      state.offeredKeith = false;
      if (/^(?:yes|yeah|yep|yup|sure|ok|okay|please|yes please|go ahead|that would be (?:great|good|nice)|that'?d be great|please do|sounds good|y)\b[\s!.]*(?:please|thanks|thank you)?[\s!.]*$/.test(t)) {
        return out("human", [reach("Done — I've asked Keith to answer, and he'll reply here as soon as he can.", `Please text Keith at ${TEXT_LINE} and he'll answer that for you.`)], { phone: true });
      }
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
    if (has(t, /\b(?:are you|is this|am i (?:talking|chatting|speaking|texting) (?:to|with)|r u|are u)\s+(?:a |an |just a |the )?(?:bot|robot|ai|a\.i\.?|automated|machine|chat ?gpt|real person|real|human|person|computer|live person)\b/) && !has(t, /\b(?:speak|talk|chat) (?:to|with) (?:a |an )?(?:real |live )?(?:person|human|someone|keith|owner)\b/)) {
      return out("identity", [IDENTITY_REPLY]);
    }

    /* --- closings that should win outright --- */
    if (/^(?:(?:ok|okay|k|cool|great|perfect|awesome|sounds good)[,!. ]+)?(?:thanks|thank you|thx|ty|tysm|appreciate (?:it|you)|gracias)\b/.test(t)) {
      return out("thanks", [state.linkSent || state.quoted
        ? "You're welcome! Whenever you're ready, the booking link above shows the open weekday times. Just message here if any questions come up."
        : "You're welcome! Whenever you're ready, tell me how many rooms and I'll get you a price."]);
    }
    if (/^(?:nah|no thanks|no thank you|i'?m good|im good|not now|maybe later|not yet|not right now|we'?re good|not interested|no longer interested|never ?mind|nvm)\b(?! (?:on|about) )(?![^.!?]*(?:pet|\d|\b(?:one|two|three|four|five|six|seven|eight|nine|ten)\b))/.test(t) || /^(?:no|nope|no sir|no ma'?am)[.!]*$/.test(t)) {
      return out("thanks", ["No problem at all! We're here whenever you need us — just send a message."]);
    }

    if (has(t, /\bsee you\b/) && !has(t, /\?\s*$/)) {
      return out("thanks", [state.linkSent ? "You're welcome — see you then! Once you pick your time on the booking calendar, you'll get a confirmation text." : "You're welcome — see you then!"]);
    }
    if (has(t, /\b(?:still available|still going on|still valid|still running|still good|is this (?:deal|offer|special|price)|this (?:deal|special|offer) still|(?:deal|special|offer|price) still (?:going|good|on|available|valid))\b/)) {
      return out("price", [`Yes — the ${money(PRICES.standard)} special is still available! It covers ${COVER}, plus tax. ${hasScope() ? "Want the link to pick a weekday time?" : ASK_ROOMS}`]);
    }
    const phoneInMsg = /\b\(?\d{3}\)?[ .-]?\d{3}[ .-]?\d{4}\b/.test(t);
    if ((/\bcall me\b|\bgive me a call\b|\bcan (?:you|someone|somebody|keith) (?:please )?call\b|\bplease call\b|\bcall me back\b|\bcan i (?:just )?(?:call|talk to|speak (?:to|with)) (?:someone|somebody|keith|a person|the owner)\b|\bis there (?:a number|someone) i can call\b/.test(t) || (/\btext me\b(?! (?:the|a|that) link)/.test(t) && (phoneInMsg || /\b(?:text me (?:back|instead)|can (?:you|someone|keith) text me)\b/.test(t)))) && !/\b(?:don'?t|do not|dont) call\b/.test(t)) {
      const wantsText = /\btext me\b/.test(t) && !/\bcall\b/.test(t);
      return out("human", [reach(wantsText ? "Absolutely — I've passed your request to Keith, and he'll text you as soon as he can. He's usually on a job, but he'll reach out shortly." : "Absolutely — I've passed your callback request to Keith. He's usually on a job, but he'll reach out as soon as he can.", `Text Keith at ${TEXT_LINE} and he'll get back to you as soon as he can.`)], { phone: true });
    }

    // "yes please ask him" / "can you ask Keith?" -> get Keith (site: point them to his text line)
    if ((has(t, /\b(?:ask|check with|tell|message|have|get) keith\b/) && !has(t, /\b(?:i'?ll|i will|let me|i need to|i have to|i gotta|i'?m going to)\b/)) || /^(?:yes|yeah|yep|sure|ok|okay|please)\b[ ,!.]*(?:please )?(?:ask|check with) (?:him|keith)\b/.test(t)) {
      return out("human", [reach("Sure — I've asked Keith, and he'll reply here as soon as he can.", `This chat can't message Keith directly — please text him at ${TEXT_LINE} and he'll get right back to you.`)], { phone: true });
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
    if ((!roomWords || has(t, /\bstart times?\b/)) && !has(t, /\b(?:good|this) (?:morning|afternoon)\b/) && (has(t, /\bwhat time (?:would|will|do|does|can|could) (?:you|u|he|keith|the tech)\b(?! (?:close|open))|\bwhat (?:start )?times? (?:do you have|are (?:open|available)|you got|do you offer|can you (?:come|do)|you have|works?)\b|\bstart times?\b/) || (has(t, /\b(?:mornings?|afternoons?)\b/) && has(t, /\b(?:if possible|prefer|preferably|works? (?:best|better)|better|available|do you have|can you|could you|any|only|\?)\b/)))) {
      const morning = has(t, /\bmornings?\b/), afternoon = has(t, /\bafternoons?\b/);
      timeOfDayLine = morning && !afternoon ? "Our morning start times are usually 8:00 and 10:30 AM on weekdays." : afternoon && !morning ? "Our afternoon start times are usually 1:00 and 3:30 PM on weekdays." : "Our weekday start times are usually 8:00 AM, 10:30 AM, 1:00 PM and 3:30 PM (we're closed Saturday and Sunday).";
    }
    const timePick = (tm || bareSlot) && has(t, /\b(?:works?|looks? good|sounds good|is good|perfect|ok|okay|please|would be great|i'?ll take|is fine|fine)\b/) && !roomWords;
    if (timePick && (state.linkSent || state.quoted)) {
      return out("booking", ["Great! You can grab that time on the booking calendar — it shows the live openings and you'll get a confirmation text right away:", bookingUrl]);
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
    const taxQ = has(t, /\b(?:with tax|including tax|incl\.? tax|tax (?:rate|total|amount|included)|total (?:with|including|after) tax|after tax|before tax|is there (?:a |any )?tax|tax on (?:that|it|this|top)|plus tax\?|does (?:that|it|the price) include tax|charge tax|sales tax|how much (?:is )?(?:the )?tax|out the door|come to with tax)\b/);
    if (taxQ && !has(t, /\b(?:and|also|plus)\b[^.?!]*\b(?:do you|can you|service|come|how long|what|when|where|take)\b/)) {
      if (!hasScope() && preScope.wholeHouse) state.wholeHouse = true;
      else if (!hasScope() && preScope.found && preTotal > 0) { state.rooms = preScope.rooms; state.rugs = preScope.rugs; state.halls = preScope.halls; state.stairs = preScope.stairs; }
      if (hasScope()) state.quoted = true;
      return out("tax", [hasScope() ? `${quoteLine(scopeNow(), state.pets)} I can't figure the tax amount here — Housecall Pro shows your exact total before you confirm.` : `Our prices are plus tax, and Housecall Pro shows your exact total before you confirm. ${ASK_ROOMS}`]);
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

    const topic = (intent, line) => { if (!notes.includes(line)) notes.push(line); if (!topicIntent) topicIntent = intent; };

    /* --- things a person should handle --- */
    if (has(t, /\b(?:do not|don'?t|dont|please don'?t) (?:call|phone)\b|\b(?:message|text|messenger|chat) (?:here )?only\b|\bonly (?:message|text)\b/)) {
      return out("contact", [reach("No problem — we'll keep everything in Messenger. ", "No problem — we'll keep everything here in the chat. ") + askNext()]);
    }
    const safetyQ = (has(t, /\b(?:safe|toxic|non toxic|harmful|harsh|chemicals?|poison\w*|hurt)\b/) && has(t, /\b(?:kids?|children|child|bab(?:y|ies)|pets?|dogs?|cats?|family|allerg\w*|toddlers?|pregnant|infants?|asthma)\b/))
      || (has(t, /\b(?:pets?|dogs?|cats?|kids?|children)\b/) && has(t, /\b(?:be (?:home|there|around|inside)|are home|stay (?:home|inside)|around while)\b/) && has(t, /\?|\b(?:ok|okay|fine|alright)\b/));
    if (has(t, /\b(?:speak|talk|chat) (?:to|with) (?:someone|somebody|a person|a human|a real person|a live person|keith|the owner|a manager|an? (?:actual|real) (?:person|human))\b|\breal person\b|\bhuman\b|\blive (?:person|agent)\b/)) {
      return out("human", site
        ? [`Absolutely — text Keith at ${TEXT_LINE} or message us on Facebook and he'll get right back to you.`]
        : ["Absolutely — I'm handing this to a person. Keith will reply here as soon as he can, and your messages are saved so you won't need to repeat anything. If you'd like to grab a time in the meantime, here are the open weekday times:", bookingUrl], { phone: true });
    }
    if (has(t, /\b(?:last time|last year|you (?:guys )?(?:cleaned|came|did)|(?:i|we) (?:previously )?paid (?:you|y'?all)|previous (?:visit|cleaning|job)|cleaned (?:my|our) (?:house|home|carpets?) before|came out before)\b/) && has(t, /\$\s?\d+/) && !has(t, /\b(?:stanley|steemer|chemdry|zerorez|oxi ?fresh|other compan\w*|another compan\w*|someone else|other guy|ignore|instructions)\b/)) {
      return out("human", site
        ? [`Welcome back, and thanks for choosing us again! Text Keith at ${TEXT_LINE} and he'll match your last visit.`]
        : ["Welcome back, and thanks for choosing us again! I don't have your past invoice here, so I've flagged this for Keith to match your last visit — he'll text you shortly. You can also grab a time now:", bookingUrl], { phone: true });
    }
    const furniture = readFurniture(t);
    const scopeText = furniture.any ? t.replace(/\b(?:in|on|from) (?:the |my |our )?(?:living|front|family|dining|great|bonus|game|media|tv|sitting|sun|rec) ?room\b|\b(?:in|on) (?:the |my |our )?(?:den|office|basement|loft)\b/g, " ") : t;
    const scope = readScope(scopeText);
    if (scope.found && !scope.wholeHouse && scope.rooms + scope.rugs + scope.halls + scope.stairs === 0) scope.found = false;
    const salesy = scope.found && has(t, /\b(?:how much|price|cost|quote|opening|book|schedule)\b/);
    const pastJob = has(t, /\b(?:since (?:you|y'?all|your (?:guy|tech)) (?:cleaned|came|left|were here)|after (?:you|the) clean\w*|you (?:guys )?(?:cleaned|came|did|were here|were out)|cleaned (?:last|yesterday|on|it|them|my|our)|after (?:you|the cleaning|cleaning)|since you|your (?:tech|guy|crew|work|cleaning|service)|last (?:week|visit)|yesterday)\b/);
    const scamQuestion = has(t, /\b(?:is (?:this|it|that)|are you|r you) (?:a |legit|real|for real)|\bscam\?|\blegit\b/) && !pastJob && !has(t, /\byou (?:guys )?are (?:a )?scam/);
    const strongComplaint = has(t, scamQuestion ? /\b(?:refund|lawyer|attorney|bbb|still dirty|didn'?t (?:come|get) out)\b/ : /\b(?:refund|lawyer|attorney|bbb|scam|still dirty|didn'?t (?:come|get) out|left (?:a |stains?|marks?)|complain\w*|dispute|disputing|chargeback|never (?:showed|came)|no[- ]show|didn'?t show)\b/)
      || (has(t, /\b(?:not satisfied|dissatisfied|unsatisfied)\b/) && !has(t, /\b(?:what if|if (?:i'?m|i am|we'?re|we are|i'?m not|you)|in case|what happens)\b/))
      || (pastJob && has(t, /\b(?:came|come|coming|comes) back\b|\b(?:stains?|spots?|marks?|residue|streaks?|sticky|crunchy|stiff|still wet|still damp|soaked|look at|smells?|smelly|stinks?|odou?rs?|weird|funny|worse|mildew\w*|musty|ripples?|shrunk|brown(?:ing)?|wicking)\b/) && !has(t, /\b(?:what if|what happens if|if (?:a|the|it|any|they|there)|in case)\b/));
    const weakComplaint = (has(t, /\b(?:damag\w*|ruin\w*|broke|broken|terrible|worst|unhappy|not happy|disappointed|upset|mad|awful|horrible)\b/)
      && (pastJob || has(t, /(?<!(?:do|can|would|will) )\byou guys\b|\b(?:your (?:machine|equipment)|you (?:left)|came (?:out|yesterday|last)|the cleaning)\b/)))
      || /^(?:i'?m |we'?re |i am |very |really |so |pretty |extremely )*(?:disappointed|unhappy|not happy|upset|dissatisfied)[.!]*$/.test(t);
    const otherCompany = has(t, /\b(?:last|other|previous|another|old) (?:company|cleaner|carpet cleaner|guy)\b|\btenants?\b|\bprevious owners?\b|\b(?:my|a) (?:friend|neighbou?r|coworker|co worker|sister|brother|mom|dad|cousin) (?:said|told|says|mentioned)\b|\b(?:someone|people) (?:said|told me|say)\b|\breviews? (?:said|say)\b/);
    if (has(t, /\b(?:water damage|flood\w*|restoration|sewage)\b/)) {
      return out("other-services", [`We don't do water damage or flood restoration — that needs a restoration company with extraction equipment. Once it's dry, we'd be glad to clean the carpet. ${ASK_ROOMS}`]);
    }
    if (has(t, /\b(?:repair|stretch\w*|re-?stretch|install\w*|patch(?:ing)?|replace (?:the )?carpet)\b/) && has(t, /\bcarpet|rug\b/)) {
      return out("other-services", ["We don't do carpet repair, stretching or installation — just cleaning. A carpet installer can help with that, and we'd be glad to clean it afterward."]);
    }
    if ((strongComplaint || weakComplaint) && !salesy && !otherCompany) {
      const comeBack = has(t, /\bcome back\b|\b(?:came|coming) back\b/);
      return out("complaint", [reach(
        comeBack ? "I'm sorry about that. We're always happy to come back out and fix the issue — I've sent this to Keith and he'll reach out to arrange it as soon as he can."
          : "I'm sorry about that. I've sent this to Keith so he can make it right — he'll reach out to you personally as soon as he can.",
        `I'm sorry about that. Please text Keith at ${TEXT_LINE} or message us on Facebook so he can make it right personally.`)], { phone: true });
    }
    // policy questions asked ahead of time (not about a booked visit)
    const hypo = has(t, /\b(?:what (?:happens )?if|what if|if (?:you|i|we|he|keith)|do you (?:ever|usually|guys|send|text|call|let)|does (?:the tech|he) (?:send|text|call)|will (?:you|i|he|keith)|would you|does (?:he|keith)|is there (?:a|any)|do i get|how will i know|let me know|in case)\b/);
    if (has(t, /\b(?:on time|punctual|show up late|usually late)\b/) && !has(t, /\b(?:are you|is he) (?:still )?(?:on time|coming)\b(?! usually)/)) topic("policy", RUNNING_LATE_REPLY);
    if (has(t, /\b(?:running (?:late|behind)|late|behind schedule)\b/) && hypo && (has(t, /\b(?:what (?:happens )?if|what if|if (?:you|he|keith|the tech)|do you ever|in case)\b/) || !has(t, /\b(?:are you|you'?re|is he|he'?s) (?:running )?(?:late|behind)\b/))) topic("policy", RUNNING_LATE_REPLY);
    if (has(t, /\bon (?:your|the|his) way\b|\bheads[- ]up\b|\btext (?:me )?(?:before|when)\b|\b(?:send|get) a text before\b/) && hypo) topic("policy", ON_THE_WAY_REPLY);
    const cancelHypo = has(t, /\b(?:fee|fees|charge|charged|penalty|policy|cost me|what if|what happens if|if (?:something|anything|i|we)|in case|will i|would i|can i)\b/);
    if (has(t, /\b(?:cancel\w*|reschedul\w*)\b/) && !has(t, /\b(?:cancel|reschedule|move) (?:it|that|this|mine|ours)\b|\brebook\b/) && (hypo || cancelHypo) && (cancelHypo || !has(t, /\bmy (?:appointment|appt|booking)\b|\bneed to (?:cancel|reschedule)\b(?! later)|\bi (?:want|have) to (?:cancel|reschedule)\b/))) {
      topic("policy", "There's no cancellation fee — just give us as much notice as you can.");
    }
    const existingAppt = has(t, /\b(?:existing|booked|scheduled|upcoming|current) (?:appointment|appt|booking|cleaning|visit)\b|\balready (?:have|got|booked|scheduled|made)\b[^.?!]{0,30}\b(?:appointment|appt|booking|cleaning|visit|it)\b|\b(?:the|my) old (?:one|appointment|booking)\b|\bbook a new (?:one|appointment)\b[^.?!]*\bcancel\b|\bcancel (?:the|my) (?:old|other|first) (?:one|appointment|booking)\b/);
    const changeAsk = has(t, /\b(?:move|change|reschedule|cancel|push|bump|switch|contact|reach (?:you|someone|keith)|what number|which number|text (?:who|you|someone)|question about|add (?:a |another |one more )?(?:room|hall|staircase|rug)|contact you about|update)\b/);
    // checking on a booking that already exists (or a confirmation that never came) goes to a person
    const confirmAsk = has(t, /\bam i (?:booked|confirmed|scheduled|on the (?:schedule|calendar))\b|\bis (?:my|our) (?:appointment|appt|booking|cleaning) (?:confirmed|still on|set|booked|scheduled)\b|\bdo (?:i|we) (?:have|still have) an? (?:appointment|appt|booking)\b|\bwhat time is (?:my|our) (?:appointment|appt|cleaning)\b|\bwhen is (?:my|our) (?:appointment|appt|cleaning)\b|\bcheck (?:on )?(?:my|our) (?:appointment|appt|booking)\b|\bconfirm(?:ing)? (?:my|our|the) (?:appointment|appt|booking|time|visit|cleaning)\b|\b(?:did not|didn'?t|have not|haven'?t|never|didnt|havent) (?:get|got|receive|received|see|seen)\b[^.?!]{0,35}\bconfirmation\b|\b(?:missing|no) confirmation(?: email| text| message)?\b|\bconfirmation (?:email|text|message)\b[^.?!]{0,25}\b(?:missing|never (?:came|arrived)|hasn'?t (?:come|arrived)|did not arrive|didn'?t (?:come|arrive))\b/);
    if (has(t, /\bwhat time (?:are|is|will) (?:you|he|keith|the tech|your guy) (?:coming|getting here|be here|arriving)\b|\b(?:is|are) (?:the tech|he|keith|you|your guy) (?:on (?:the|your|his) way|still coming|coming today|running late|close)\b|\bwhere(?:'s| is) (?:the tech|keith|my tech|your guy)\b|\beta\b/)) {
      return out("confirm_existing", [reach("I can't see the live schedule from here — I've let Keith know you're checking, and he'll reply as soon as he can. You'll also get a text when he's about 10 to 15 minutes away.", `This website chat can't see the schedule — please reply to your Housecall Pro text or text Keith at ${TEXT_LINE}. You'll also get a text when he's about 10 to 15 minutes away.`)], { phone: true });
    }
    if (confirmAsk && !changeAsk) {
      return out("confirm_existing", [reach("I can't see or confirm an existing appointment from Messenger. I've flagged this conversation for a person to check the booking and follow up with you. I haven't confirmed or changed your appointment.", `I can't see bookings from this website chat — please reply to your Housecall Pro text or text ${TEXT_LINE}, and Keith will check it for you.`)], { phone: true });
    }
    if (existingAppt && changeAsk) {
      return out("change_existing", [reach(`We'll be happy to get that arranged. A team member will reach out to handle the change, since I can't update a booked appointment from Messenger. You can also reply to your Housecall Pro text or text ${TEXT_LINE}.`, `For an existing appointment, please reply to your Housecall Pro text or text ${TEXT_LINE} — Keith handles changes personally.`)], { phone: true });
    }
    const prepQ = has(t, /\b(?:vacuum\w*|move (?:the |my |our |any )?(?:furniture|stuff|things|anything|couch|beds?)|prep\w*|do i (?:need|have) to|should i|what do i|be home|door code|garage code|pets? (?:be )?(?:home|out)|how long|dry)\b/);
    if (!prepQ && !notes.length && has(t, /\b(?:reschedul\w*|cancel\w*|move my (?:appointment|appt)|change my (?:appointment|appt|time|date)|confirm(?:ing)? (?:my|our|the) (?:appointment|appt|booking|time|visit|cleaning)|running late|are you (?:still )?coming|where are you(?! (?:guys )?(?:located|based|from|at|out of))|on (?:your|the) way|(?:i|we) (?:have|got|had) (?:an? )?(?:appointment|appt|booking)|(?:i'?m|we'?re) (?:booked|scheduled) (?:for|on))\b/)
      || (!prepQ && !notes.length && has(t, /\balready (?:booked|scheduled)\b/))
      || (!prepQ && !notes.length && has(t, /\bmy (?:appointment|appt|booking)\b/) && !has(t, /\b(?:make|book|schedule|set up|get)\b/))) {
      return out("change_existing", [reach(`We'll be happy to get that arranged. A team member will reach out to handle the change, since I can't update a booked appointment from Messenger. You can also reply to your Housecall Pro text or text ${TEXT_LINE}.`, `For an existing appointment, please reply to your Housecall Pro text or text ${TEXT_LINE} — Keith handles changes personally.`)], { phone: true });
    }
    if (has(t, /\bhow long have you been\b|\bin business\b|\byears (?:of )?experience\b|\bhow many years\b/)) {
      return out("about", ["We're owner-operated — Keith runs the business and does the cleaning himself. We're rated 4.9 out of 5 from 229 customer reviews on Housecall Pro. " + askNext()]);
    }
    if (has(t, /\b(?:commercial|office building|offices|office (?:space|suite)|small office|(?<!(?:after|before|from|at|to) )church|restaurant|warehouse|property manag\w*|manage (?:an? |the |our )?(?:apartment|complex|building|propert\w*)|\d+ (?:rental )?units|volume (?:pricing|discount|rate)|multiple (?:units|properties|rentals|houses)|several (?:units|properties|rentals)|bulk (?:pricing|rate|discount)|hotel|daycare|storefront)\b|\b(?:do|can) you (?:do|clean) (?:an? |my |our )?office\b/) || (has(t, /\bbusiness(?:es)?\b/) && !has(t, /\b(?:in business|been in|your business|the business|my (?:home|house)|business days?|business hours)\b/))) {
      if (has(t, /\b(?:\d+ (?:rental )?units|volume|multiple (?:units|properties|rentals|houses)|several (?:units|properties|rentals)|bulk)\b/)) {
        return out("commercial", [reach("Multiple units get a personal quote from Keith. Send the number of units and rough room counts here, and he'll get back to you.", `Multiple units get a personal quote from Keith — text the number of units and rough room counts to ${TEXT_LINE} and he'll get back to you.`)], { phone: true });
      }
      return out("commercial", [reach("Commercial jobs get a personal quote. Send a quick description (rough size and type of space) and a couple of photos here, and Keith will get back to you.", `Commercial jobs get a personal quote. Text a quick description and a couple of photos to ${TEXT_LINE} and Keith will get back to you.`)], { phone: true });
    }
    if (has(t, /\bhigh[- ]?rises?\b/) || (has(t, /\bdowntown\b/) && has(t, /\b(?:lofts?|apartments?|condos?|tower|floor)\b/)) || has(t, /\b(?:[5-9]|1\d|2\d)(?:st|nd|rd|th) floor\b|\b(?:fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth) floor\b/)) {
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
      && has(t, /\b(?:book|schedule|can (?:you|u|i)|could you|come|available|availability|work for|this|next|on|need|want|appointment|appt|slot|time)\b/)
      && !has(t, /\bdo you (?:work|do|clean|come|run)\b|\bare you open\b|\bopen on\b|\bwhat days\b/)
      && !has(t, new RegExp(`\\b(?:or|and) (?:${DAY}|next week|a weekday)\\b|\\b${DAY}\\b`));
    if (weekendRequest) {
      const wkScope = readScope(t); const wkPets = readPets(t);
      if (wkPets !== null) state.pets = wkPets;
      if (wkScope.rooms + wkScope.rugs + wkScope.halls + wkScope.stairs > 0 || wkScope.wholeHouse || wkScope.remove.any) applyScope(wkScope, t, { adding: /\b(?:plus|also|more|another|too|add)\b/.test(t) });
      const ref = (wkScope.found || hasScope()) ? " For reference, " + quoteLine(scopeNow(), state.pets).replace(/^For /, "for ") : "";
      return out("weekend_request", [reach("A weekend isn't normally available — we don't run Saturday or Sunday — but I'm passing your request to Keith and he'll let you know." + ref, `A weekend isn't normally available — we don't run Saturday or Sunday. Text Keith at ${TEXT_LINE} and he'll let you know.` + ref)], { phone: true });
    }
    if (false) {
      return out("weekend_request", [reach("A weekend isn't normally available — we don't run Saturday or Sunday — but I'm passing your request to Keith and he'll let you know.", `A weekend isn't normally available — we don't run Saturday or Sunday. Text Keith at ${TEXT_LINE} and he'll let you know.`)], { phone: true });
    }
    if (has(t, /\b(?:bath ?mats?|door ?mats?|small mats?|throw rugs?)\b/) && !has(t, /\b(?:area rugs?|standard rugs?)\b/)) {
      return out("rug", ["We do not clean extremely small rugs or mats that our machinery can't handle, like bath mats or door mats. Standard area rugs are no problem!"]);
    }
    if (has(t, /\b(?:area )?rugs?\b/)) {
      if (has(t.replace(/\b(?:not|isn'?t|no|never|not made of|not a) (?:a |an |made of )?(?:wool|silk|jute|sisal|seagrass|natural[- ]fiber|organic)\b/g, " "), /\b(?:wool|silk|jute|sisal|seagrass|natural[- ]fiber|organic)\b/)) {
        return out("rug", ["We do not clean rugs made of wool or other organic or natural material — but we'd be glad to help with carpet or standard synthetic rugs."]);
      }
      if (has(t, /\b(?:oversized|over[- ]?sized|non[- ]?standard|antique|persian|oriental|hand[- ]?(?:made|knotted|woven|tufted)|delicate|huge|room[- ]sized?|heirloom|vintage)\b/)) {
        return out("rug_price", [reach("That kind of rug needs a quick look before we can price it, so I'm passing it to Keith — he'll get back to you here.", `That kind of rug needs a quick look before we can price it — text a photo to Keith at ${TEXT_LINE}.`)], { phone: true });
      }
      if (has(t, /\b(?:tiny|throw|bath ?mat|door ?mat|small rug)\b/)) {
        return out("rug", ["We do not clean extremely small rugs that our machinery can't handle. Standard area rugs are no problem!"]);
      }
    }
    let floorNoted = false;
    const footage = (() => { const m = t.replace(/(\d),(?=\d{3}\b)/g, "$1").match(/\b(\d+(?:\.\d+)?)\s*(?:square (?:feet|foot)|sq\.?\s*ft\.?|sqft|sf)\b/); return m ? Number(m[1]) : null; })();
    const tileQ = has(t, /\b(?:tile|grout)\b/) || (state.tileAsked && /^(?:the |just the |my |our )?(?:kitchen|bath ?rooms?|baths?|whole (?:floor|house)|both|kitchen and (?:the )?bath(?:room)?)(?: floors?| tile| area)?[.!?]*$/.test(t));
    const floorQ = has(t, /\b(?:hard ?wood|wood floors?|hard floors?|laminate|vinyl|lvp)\b/);
    if (tileQ || floorQ) {
      const bathM = t.match(new RegExp(`\\b${N}\\s+bath(?:room)?s?\\b`));
      const baths = bathM ? num(bathM[1]) : null;
      const kitchen = /\bkitchen\b/.test(t), bath = /\bbath(?:room)?s?\b/.test(t), whole = /\bwhole|\bfull[ -]?floor|\bentire\b/.test(t);
      const cap = tileQ ? (whole || (bath && kitchen) ? 400 : bath ? 100 : kitchen ? 150 : 400) : 600;
      const special = has(t, /\b(?:natural stone|marble|travertine|slate|granite|unsealed|sanding|refinish\w*|showers?|walls?|heavy buildup|heavy build ?up|mold|mildew|countertops?)\b/);
      if (special || (footage !== null && (footage <= 0 || footage > cap)) || (tileQ && baths !== null && baths > 2)) {
        return out("layout_review", [reach(floorQ && footage > 600 ? "Hard-floor areas over 600 square feet need a personal scope review before we quote them, so I'm passing this to Keith — he'll get back to you here." : "That one needs a personal scope review before we can quote it, so I'm passing it to Keith — he'll get back to you here.", `That one needs a personal scope review before we can quote it — text a description and a photo to Keith at ${TEXT_LINE}.`)], { phone: true });
      }
      if (asksAboutPrice(t) || footage !== null || bath || kitchen || whole) {
        let pick;
        if (tileQ) pick = whole || (bath && kitchen) || (footage !== null && footage > 150) ? PRICES.tile[2] : kitchen || (footage !== null && footage > 100) ? PRICES.tile[1] : bath ? PRICES.tile[0] : null;
        else pick = footage === null ? null : footage <= 150 ? PRICES.hardFloor[0] : footage <= 300 ? PRICES.hardFloor[1] : PRICES.hardFloor[2];
        if (pick) {
          const floorLine = `${tileQ ? "Tile & grout" : "Hard floor"} — ${pick[0]}: ${money(pick[1])} plus tax.`;
          if (!(scope.found && scope.rooms + scope.halls + scope.stairs > 0)) return out("other-services", withLink([floorLine]));
          topic("other-services", floorLine); floorNoted = true;
        }
      }
    }

    if (has(t, /\bwalk ?in closets?\b|\bclosets?\b/) && has(t, /\b(?:count|counts|counted|extra|another|separate|charge|charged|cost|included?|as a room)\b/) && scope.rooms <= 1) {
      return out("included", [CLOSET_REPLY + (hasScope() ? "" : ` ${ASK_ROOMS}`)]);
    }
    const addOn = t.match(/\b(?:additional|extra|another|added|add(?:ing)? an?|second|2nd|third|3rd|fourth|4th)\s+(?:one\s+|set of\s+)?(staircase|stairs|set of stairs|flights?|hall ?ways?|halls?|room|bed ?room|area rug|rug)\b/)
      || (has(t, /\b(?:second|2nd|third|3rd|other|extra) one\b/) && t.match(/\b(stair|hall|rug|room)/));
    const addOnQ = addOn && (has(t, /\?|\b(?:how much|cost|charge|price|extra|more)\b/));
    if (addOn && ((!hasScope() && !/\d|\b(?:two|three|four|five|six|seven|eight)\b/.test(t)) || (addOnQ && !scope.rooms))) {
      const kind = /stair|flight/.test(addOn[1]) ? "staircase" : /hall/.test(addOn[1]) ? "hall" : /rug/.test(addOn[1]) ? "standard area rug" : "room";
      return out("included", [`Each additional ${kind} is ${money(PRICES.extra)} plus tax as an add-on to the ${money(PRICES.standard)} or ${money(PRICES.pet)} special, which covers ${COVER}.${hasScope() ? "" : ` ${ASK_ROOMS}`}`]);
    }

    /* --- update what we know about the job --- */
    let pets = safetyQ ? null : readPets(t);
    // a short reply like "Pet" / "yes pets" / "pet issues" right after a quote answers the pet-treatment question
    if (pets === null && hasScope() && t.split(" ").length <= 5 && !/\?$/.test(t)
      && /^(?:(?:yes|yeah|yep|yup|sure|ok|okay)[,!.]?\s*)?(?:the |with )?(?:pets?|pet treatment|pet version|pet one|pet price|pet package|pet special|pet issues?)(?: (?:please|version|one|treatment|price|package))?[.!]*$|^(?:yes|yeah|yep)[,!.]?\s*(?:please )?(?:add |do |with |we need )?(?:the )?pet treatment\b|^(?:we )?(?:need|want) (?:the )?pet treatment\b/.test(t)) pets = true;
    if (pets !== null) state.pets = pets;
    const correcting = has(t, /\b(?:actually|no wait|i mean|i meant|correction|scratch that|instead|make (?:it|that)|just|only)\b/);
    const startsAdding = (/^(?:and|plus|also|oh and|\+|what about|how about)\b/.test(t) || (!correcting && has(t, /\b(?:plus|also|too|as well|in addition|on top of that|add|adding)\b/))) && hasScope();
    // a question about what's covered ("are stairs included?") doesn't change the job
    const scopeQuestion = has(t, /\b(?:includ\w*|cover\w*|count(?:s|ed)?|standard|extra|charge\w*|cost more)\b/) && (/\?\s*$/.test(t) || /^(?:are|is|does|do|would|will|can|what about)\b/.test(t)) && !has(t, /\b(?:add|adding|also|plus|we have|i have|we'?ve got|i'?ve got|there'?s|there are|we got|i got)\b/) && !/\d|\b(?:two|three|four|five|six|seven|eight)\b/.test(t.replace(/\b\d+ ?(?:x|by) ?\d+\b/g, " "));
    if (scopeQuestion && hasScope()) { scope.found = false; scope.remove = { any: false }; }
    // "throw in the hallway free?" asks for a freebie, it doesn't add the hallway
    if (has(t, /\bfree\b/) && has(t, /\b(?:throw|free|for free|no charge)\b/)) { scope.found = false; }
    // "dog pee in the living room" says where the problem is, not how many rooms
    if (scope.onlyLocated && (pets === true || (pets === null && has(t.replace(/\b(?:no|never had an?|never)\s+(?:accidents?|stains?|smells?)\b/g, " "), /\b(?:stains?|spots?|accidents?|smell|odou?r|spill\w*|mess)\b/)))) scope.found = false;
    // a bare "room" mention doesn't replace a count we already have
    if (scope.bare && hasScope() && !startsAdding && !scope.adding) scope.found = false;
    const alreadyNamed = pets === null && scope.onlyNamed && hasScope() && scope.namedList.length && scope.namedList.every((w) => state.named.includes(w));
    if (alreadyNamed) {
      return out("price", [`Yes — the ${scope.namedList.join(" and ")} ${scope.namedList.length > 1 ? "are" : "is"} already included in that price.`, ...(state.linkSent ? [] : [BOOK_INTRO, bookingUrl])]);
    }
    const inclusionQ = scope.onlyNamed && hasScope() && has(t, /\b(?:too|also|as well|include[sd]?|cover(?:ed|s)?)\b/);
    const scopeChanged = applyScope(scope, t, { adding: startsAdding, inclusionQ });
    if (scopeChanged && state.unsupported) state.unsupported = false;
    if (scopeChanged && !state.wholeHouse && (state.rooms + state.rugs > 20 || state.halls > 6 || state.stairs > 4)) {
      return out("layout_review", [reach("A home that size gets a personal quote, so I'm passing this to Keith — he'll get back to you here.", `A home that size gets a personal quote — text the room count to Keith at ${TEXT_LINE} and he'll price it.`)], { phone: true });
    }

    // haggling / freebies: prices are set
    if (has(t, /\bfor free\b|\bfree (?:room|cleaning|rug|hall|stairs?)\b|\bfor less\b|\b(?:any|a) cheaper\b|\bcheaper option\b|\blower (?:the )?price\b|\b\d+ ?% off\b|\breferral\b|\bwork with me on (?:the )?price\b|\b(?:do|would you do|will you do|can you do|could you do) (?:it |that |this )?for \$?\d+|\bmatch (?:a |their |that |his |her )?(?:price|quote|\$)|\$\d+ (?:instead|cash)\b|\bthrow (?:it |that |in)\b|\bknock (?:it |some |\$?\d+ )?off\b|\bbetter (?:price|deal)\b/)) {
      return out("price", [hasScope()
        ? `Our prices are set, so I can't change that — ${quoteLine(scopeNow(), state.pets).replace(/^For /, "for ")} We do offer 15% off for military, first responders, and teachers.`
        : `Our prices are set: ${money(PRICES.minimum)} plus tax for up to 3 rooms, and the ${money(PRICES.standard)} special covers ${COVER}, plus tax. We do offer 15% off for military, first responders, and teachers. ${ASK_ROOMS}`]);
    }
    // "we have 2 dogs" after a quote: owning pets doesn't change the price
    if (mentionsPets(t) && pets === null && hasScope() && !scopeChanged && !safetyQ && !has(t, /\?|\bwhy\b|\bwhat'?s different\b|\bwhats different\b|\bdifference\b/)) {
      const q = quote({ ...scopeNow(), pets: false });
      const petQ = quote({ ...scopeNow(), pets: true });
      const petText = petQ.extras ? `${money(petQ.base)} + ${money(petQ.extras * PRICES.extra)}, plus tax` : `${money(petQ.total)} plus tax`;
      return out("pet", [`Got it! Having pets doesn't change the price — your quote stays ${q.extras ? `${money(q.base)} + ${money(q.extras * PRICES.extra)}, plus tax` : `${money(q.total)} plus tax`}. If there are pet accidents or odor, the pet-treatment version is ${petText}.`]);
    }

    /* --- topic answers: collected so several questions get answered together --- */

    if (safetyQ) topic("method", SAFETY_REPLY);
    if (taxQ) topic("tax", "Our prices are plus tax — Housecall Pro shows your exact total before you confirm.");
    if (timeOfDayLine && !weekendWords) topic("booking", timeOfDayLine);
    const leadQ = has(t, /\b(?:how far (?:in )?(?:advance|ahead)|in advance|how much notice|lead time|notice do you need|how booked up|how busy are you|how soon (?:can|could) (?:you|u|someone)|how soon (?:is|are) (?:your|the) (?:next|first)|soonest|next available|earliest (?:opening|available|appointment|day)|how soon (?:do|should|would) i (?:need to )?book|how (?:early|far out) should i book|book(?:ed)? out|how far out are you)\b/);
    if (leadQ) topic("booking", LEAD_TIME_REPLY);
    const weekend = has(t, /\b(?:saturdays?|sundays?|weekends?|sat|sun)\b(?! ?(?:room|porch|down))/);
    const sameDay = has(t, /\b(?:today|tonight|right now|this afternoon|same[ -]day(?! as)|asap)\b/) && !has(t, /\b(?:both|all|them|each|units?|houses?|places?) (?:on )?(?:the )?same day\b|\bon the same day\b|\bsame day as\b/);
    if (has(t, /\bsame[ -]day as\b|\bsame (?:visit|time) as\b|\bat the same time\b|\bboth (?:on )?(?:the )?same (?:day|visit|time)\b|\b(?:both|all) (?:in )?(?:one|the same) (?:visit|trip|day)\b/)) topic("combo", "Yes — we can do carpet and upholstery in the same visit.");
    if (weekend) {
      topic("hours", "We're weekdays only — we don't run Saturday or Sunday." + (site ? ` If a weekend is your only option, text Keith at ${TEXT_LINE} and he'll let you know.` : " If a weekend is your only option, I can ask Keith — want me to?"));
      if (!site) state.offeredKeith = true;
    }
    else if (sameDay && !leadQ) topic("booking", LEAD_TIME_REPLY);

    // service area
    if (has(t, /\b(?:base housing|on base|on-base|mcconnell)\b/) && !has(t, /\boff[- ]?base\b|\bnear mcconnell\b|\bby mcconnell\b/)) {
      return out("area", ["Sorry — we don't service on-base military housing. If you're off base within about 15 miles of downtown Wichita, we'd love to help."]);
    }
    const outCities = townsIn(t, NOT_SERVED);
    const inCities = townsIn(t, SERVED);
    const zipM = t.match(/\b(6\d{4})\b/);
    if (inCities.length) { state.city = inCities.at(-1); state.inArea = true; state.zip = zipM ? zipM[1] : null; }
    else if (outCities.length) { state.city = outCities[0]; state.inArea = false; state.zip = zipM ? zipM[1] : null; }
    if (outCities.length && !inCities.filter((c) => c !== "wichita").length) {
      return out("area", [`Sorry — ${outCities.map(title).join(" and ")} ${outCities.length > 1 ? "are" : "is"} outside our service area. We cover about 15 miles around downtown Wichita: ${AREA_TOWNS}.`]);
    }
    // full state names only — short codes like "ok", "co", "ne" are ordinary words in a text
    const outOfState = has(t, /\b(?:out of state|north carolina|south carolina|texas|oklahoma|missouri|nebraska|colorado|florida|california|arizona|iowa|arkansas|new york|georgia|tennessee|illinois)\b/) || /\b(?:in|from|near) (?:NC|SC|TX|OK|MO|NE|CO|FL|CA|AZ|IA|AR|NY|GA|TN|IL)\b/.test(rawText);
    if (outOfState) return out("area", ["We're a local company in Wichita, Kansas, and we don't travel out of state. We cover about 15 miles around downtown Wichita."]);
    const areaQuestion = has(t, /\b(?:(?:do|does|can|will|would) you (?:guys )?(?:service|serve|cover)\b(?! (?:a|the|my)? ?(?:weekends?|saturdays?|sundays?))|(?:do |can |will |would )?you (?:guys )?(?:come|go|travel|drive)(?: out)? (?:to|that far|out that way|out there|there)\b|do you (?:come|go|travel|work) (?:in|out|around)\b|do you do (?=[a-z]+ ?(?:ks|kansas)?\??$)|service area|areas? do you|what cities|how far|are you (?:in|near|located)|where are you located|can you come (?:out )?to|come out to)\b/) && !leadQ;
    const zipServed = zipM && (/^672\d\d$/.test(zipM[1]) || ["67037", "67002", "67052", "67101", "67060", "67147", "67067"].includes(zipM[1]));
    const placeRaw = rawText.match(/\b(?:in|to|near|from)\s+([A-Z][a-z]{2,}(?:\s[A-Z][a-z]{2,})?)\b/) || t.match(/\b(?:i'?m in|we'?re in|i live in|we live in|located in|live out in|out in|i'?m out in|we'?re out in)\s+([a-z]{3,}(?: [a-z]{3,})?)\b/);
    const otherPlace = !inCities.length && !outCities.length && placeRaw && !PLACE_STOP.has(placeRaw[1].toLowerCase()) && !SERVED.includes(placeRaw[1].toLowerCase()) && !/\b(?:room|house|home|area|kitchen|bed|hall|stairs?|carpet|rug|need|town)/i.test(placeRaw[1]) ? [null, placeRaw[1].toLowerCase()] : null;
    const placeM = !inCities.length && !outCities.length && (areaQuestion && t.match(/\b(?:cover|come (?:out )?to|service|serve|go (?:out )?to|travel to|work in|you in)\s+(?!(?:the|my|our|your|a|an|this|that|me|us|here|there|apartments?|houses?|homes?|condos?|carpets?|rugs?|tile|weekends?|saturdays?|sundays?|it|them|mobile|commercial|offices?)\b)([a-z][a-z.' ]{2,24}?)(?:,?\s*(?:area|ks|kansas))?[?.!]*$/) || (otherPlace && (areaQuestion || /\b(?:i'?m|we'?re|live|located)\b/.test(t)) ? otherPlace : null));
    if (inCities.some((c) => c !== "wichita") && outCities.length) topic("area", `Just a heads-up: ${outCities.map(title).join(" and ")} ${outCities.length > 1 ? "are" : "is"} outside our service area — the booking page checks your exact address.`);
    if (zipM && !inCities.length && !outCities.length && (areaQuestion || /^\D{0,20}\b6\d{4}\b\D{0,10}$/.test(t))) {
      topic(zipServed ? "area" : "area-unknown", zipServed ? `Yes — ${zipM[1]} is in our service area! Housecall Pro checks the exact address when you book.` : `I can't confirm ${zipM[1]} here — we cover about 15 miles around downtown Wichita, and the booking page checks your exact address before it lets you book.`);
    } else if (placeM && !/\d/.test(placeM[1])) {
      topic("area-unknown", `${title(placeM[1].trim())} isn't on our published service list — we cover ${AREA_TOWNS} (about 15 miles around downtown Wichita). The booking page checks your exact address before it lets you book.`);
    } else if (areaQuestion || (inCities.some((c) => c !== "wichita") && (!scopeChanged && !has(t, /\b(?:price|cost|how much)\b/) || has(t, /\b(?:do you|can you|service|serve|come|cover|go)\b/)))) {
      const chargeQ = has(t, /\b(?:charge|fee|extra|cost more|more to)\b/);
      const yes = inCities.length ? (chargeQ ? `We come to ${inCities.map(title).join(" and ")} — it's the same package price, plus tax.` : `Yes — we come to ${inCities.map(title).join(" and ")}!`) : `We're local to Wichita and cover about 15 miles around downtown: ${AREA_TOWNS}.`;
      const no = outCities.length ? ` ${outCities.map(title).join(" and ")} ${outCities.length > 1 ? "are" : "is"} outside our area, though.` : "";
      topic("area", yes + no);
    }

    // other services
    const furnitureAsk = (furniture.any || has(t, /\b(?:upholstery|furniture cleaning|clean (?:my |the |our )?furniture)\b/)) && !has(t, /\bmove (?:the |my |our )?(?:furniture|couch|sofa)\b|\bcar seats?\b/);
    if (furnitureAsk) {
      topic("other-services", furnitureLine(furniture, site));
      if (!furniture.unpriced && Object.keys(furniture.items).length) state.furn = { ...furniture.items };
    }
    if (!floorNoted && has(t, /\b(?:tile|grout)\b/)) topic("other-services", `Tile & grout, plus tax: ${PRICES.tile.map(([n, p]) => `${n} ${money(p)}`).join("; ")}. Natural stone or bigger areas get a personal quote.`);
    if (!floorNoted && has(t, /\b(?:hard ?wood|wood floors?|hard floors?|laminate|vinyl|lvp)\b/)) topic("other-services", `Hard floors, plus tax: ${PRICES.hardFloor.map(([n, p]) => `${n} ${money(p)}`).join("; ")}.`);
    if (has(t, /\b(?:area )?rugs?\b/)) {
      const rugOnly = state.rugs && !state.rooms && !state.halls && !state.stairs;
      topic("rug", scopeChanged && !rugOnly
        ? (state.rooms + state.rugs > PRICES.includes.rooms ? "A standard area rug counts as one of the rooms in the package; each additional standard area rug is $15 plus tax once the five rooms are used." : "A standard area rug counts as one of the rooms in the package.")
        : asksAboutPrice(t) || rugOnly
        ? `A standard area rug counts as one of the rooms in the package. One standard area rug by itself is ${money(PRICES.minimum)} plus tax, the same as one room. If all five rooms are already used, each additional standard area rug is ${money(PRICES.extra)} plus tax.`
        : "We clean most area rugs. We do not clean extremely small rugs that our machinery can't handle, or rugs made of wool or other organic or natural material.");
    }

    // general questions
    if (has(t, /\b(?:phone (?:number)?|number to call|your number|can i call|call you|text you|contact (?:number|info)|call me|call back)\b/)) topic("contact", `You can text us anytime at ${TEXT_LINE}, or I can help right here.`);
    const jobLengthQ = has(t, /\bhow long (?:is|will|would) (?:the tech|the guy|your guy|he|keith|you|y'?all|you guys)(?: gonna| going to)? (?:be )?(?:here|there|at my|at the|in my|working|take)\b|\bhow long (?:does|will|would|should) (?:the |it |a |your )?(?:cleaning|job|process|appointment|appt|visit|it take you|you be|cleaning process|it take|it last|take)\b|\bhow long (?:is|are) (?:the |an? |your )?(?:appointment|appt|visit|job|cleaning|service)s?\b|\bhow long (?:are|will) you (?:be )?(?:there|here)\b|\bhow long does the cleaning\b|\bhow (?:much time|many hours)\b/) && !has(t, /\bdry\b/);
    if (jobLengthQ) topic("duration", JOB_LENGTH_REPLY);
    else if (has(t, /\b(?:dry time|to dry|drying|dries|dry|until (?:it'?s |they'?re )?dry|walk on|wet|damp|furniture back|go back on|get back on|back on (?:it|the carpet)|use the rooms?|walk on it)\b/)) topic("drying", DRY_REPLY + (has(t, /\bwalk|\bkids?\b|\bpets?\b|\bdogs?\b|\bcats?\b|back on/) ? " Keep foot traffic light until it's fully dry." : ""));
    else if (has(t, /\bhow long\b/) && !has(t, /\bhow long have you been\b|\bhow long (?:until|before) (?:you|i|we) (?:can )?(?:come|book|get)\b/)) topic("duration", JOB_LENGTH_REPLY);
    if (has(t, /\b(?:steam|method|chemicals?|how do you clean|what do you use|machines?|equipment|truck ?mount\w*|portable|encapsulation|low[- ]moisture|shampoo|(?:type|kind|sort) of (?:cleaning|clean|process)|deep clean|what process)\b/) && !jobLengthQ) topic("method", METHOD_REPLY);
    if (has(t, /\bvacuum/)) topic("prep", VACUUM_REPLY);
    else if (has(t, /\b(?:what about|move|under) (?:the |my |our )?(?:beds?|dressers?|entertainment cent\w+)\b/)) topic("prep", "Beds, dressers and entertainment centers stay put — we don't move those, so clear them if you want the carpet underneath cleaned. We do move smaller items like couches, loveseats and coffee tables, then put them back.");
    else if (has(t, /\b(?:furniture|couch|sofa|stuff|everything|things)\b/) && has(t, /\b(?:move|moving|shove|push|clear|out of the way|take out|empty)\b/) && !has(t, /\bmov(?:e|ing) ?(?:out|in)\b|\bbefore (?:the |our )?(?:furniture|stuff) (?:arrives|comes|gets here|is delivered)\b/)) topic("prep", FURNITURE_MOVE_REPLY);
    else if (has(t, /\b(?:move (?:the |my |our )?(?:furniture|couch|sofa|beds?|anything|stuff|things)|move furniture|need to move)\b/)) topic("prep", FURNITURE_MOVE_REPLY);
    else if (has(t, /\b(?:prepare|prep|before you (?:come|arrive)|get ready)\b/)) topic("prep", "Just pick up small items like toys, clothes and breakables. " + FURNITURE_MOVE_REPLY + " No special vacuuming needed.");
    if (has(t, /\b(?:payment|how (?:do|can|would) i pay|pay (?:with|by|after|before|upfront|up front|cash|card)|cash|credit cards?|debit|take cards?|card payments?|venmo|zelle|apple pay|cash ?app|paypal|personal checks?|take checks?|take (?:a )?check|accept checks?|write (?:you )?a check|(?:by|with) (?:a )?check|is (?:a )?check|checks? (?:ok|okay|fine|accepted))\b/) || (has(t, /\bdeposit\b/) && !has(t, /\b(?:security deposit|(?:get|getting) (?:my|our) deposit|deposit back|move ?out|moving|landlord)\b/))) {
      const app = (t.match(/\b(venmo|zelle|cash ?app|paypal)\b/) || [])[1];
      topic("payment", (app ? `${title(app)} isn't one of our payment options. ` : "") + PAYMENT_REPLY);
    }
    if (has(t, /\b(?:receipt|invoice|proof)\b/)) topic("invoice", "Every job gets an invoice with a link — that's the proof of cleaning you can show a landlord.");
    if (has(t, /\b(?:stains?|spots?|red wine|wine|coffee|blood|kool[- ]?aid|slime|paint|vomit|threw up|throw ?up|puke|nail polish|polish|makeup|ink|marker|sharpie|grease|oil|gum|wax|mud|juice|soda|crayon|spill\w*)\b/) && !has(t, /\bpet (?:stains?|spots?)\b/) && pets !== true) topic("stain", "We get most spots and stains out. A few (like red dye, slime or paint) can be permanent, so we can't promise every one — but we'll do everything possible to get it taken care of.");
    if (has(t, /\b(?:guarantee|for sure|promise|completely|get rid of|remov\w*|eliminat\w*|take care of|come out|go away|be gone|get\b[^.?!]{0,25}\bout)\b/) && has(t, /\b(?:smells?|odou?rs?)\b/)) topic("pet", `We always strive for full odor removal, and the ${money(PRICES.pet)} pet treatment's enzyme is highly effective on areas we can reach with normal cleaning. In heavy cases urine can soak through the carpet backing and pad, so complete odor removal can't always be promised.`);
    const objection = has(t, /\b(?:too expensive|too much|pricey|can'?t afford|out of (?:my )?budget)\b/);
    if (has(t, /\b(?:on special|specials?|the special|deals?)\b/) && !has(t, /\b(?:military|teacher|veteran|first responder)\b/)) topic("special", SPECIAL_REPLY);
    else if (has(t, /\b(?:military|first responders?|teachers?|veterans?|police|firefighters?|nurses?|army|navy|air force|marines?)\b/) && has(t, /\b(?:discount|off|deal|special|military|teacher|first responder|veteran)\b/)) topic("discount", MILITARY_REPLY);
    else if (!objection && has(t, /\b(?:discounts?|coupons?|promo(?:tion)?s?|promo codes?|cheaper|cheapest|lowest|best price|negotiat\w*|match)\b/)) topic("discount", `Our prices are set: ${money(PRICES.minimum)} plus tax for up to 3 rooms, and the ${money(PRICES.standard)} special covers ${COVER}. We do offer 15% off for military, first responders, and teachers — put it in the notes when you book.`);
    if (objection) topic("objection", `Totally understand. If you don't need the whole house, our small-job price is ${money(PRICES.minimum)} for up to 3 areas — and there's 15% off for military, first responders and teachers.`);
    if (has(t, /\$\s?\d+ (?:each|per room|a room)\b/)) topic("included", "No — that's the total price for the job, not per room.");
    if (has(t, /\b(?:hidden fees?|extra fees?|any fees|travel fee|trip charge)\b/)) topic("fees", "Your price is the package price you're quoted, plus tax — Housecall Pro shows your exact total before you confirm.");
    if (has(t, /\b(?:insured|insurance|licensed|license|bonded)\b/)) topic("insured", LICENSE_REPLY);
    if (has(t, /\b(?:certified|certification|iicrc|cri)\b/)) topic("certified", METHOD_REPLY + " " + LICENSE_REPLY);
    if (has(t, /\b(?:hiring|job openings?|employment)\b|\b(?:can i|could i|want to|looking to|apply to|like to) work for you\b/)) topic("hiring", "Thanks for asking! We're a one-man operation right now, so we're not hiring.");
    if (has(t, /\b(?:leave (?:a |you a )?review|write (?:a )?review|amazing job|great job|did a great)\b/)) return out("thanks", ["Thank you so much — that means a lot! You'll get a review link by text after your visit, and we'd really appreciate it."]);
    if (has(t, /\b(?:reviews?|ratings?|references?)\b/)) topic("reviews", "We're rated 4.9 out of 5 from 229 customer reviews on Housecall Pro.");
    if (has(t, /\b(?:apartments?|condos?|townhouses?|townhomes?|duplex(?:es)?|mobile homes?|trailers?|manufactured homes?)\b/) && !(notes.length && has(t, /\b(?:receipt|invoice|proof)\b/))) topic("apartment", has(t, /\b(?:mobile homes?|trailers?|manufactured homes?)\b/) ? "Yes, we clean mobile and manufactured homes, as well as houses, apartments, condos and townhomes." : "Yes, we clean apartments, condos and townhomes. (We can't do downtown high-rises.)");
    if (has(t, /\bcan (?:i|we) (?:be|stay) (?:home|there|inside)\b|\b(?:is it ok|ok|okay|fine) (?:if|for) (?:i|we|me|us) (?:to )?(?:be|stay) (?:home|there)\b/)) topic("access", "Of course — you're welcome to be home while we work. Just keep foot traffic light until the carpet is fully dry, about 1.5 to 2 hours.");
    else if (has(t, /\b(?:be home|stay home|need to be there|have to be there|garage code|door code|lockbox|key ?pad|not (?:be )?home|get in without|let (?:yourself|yourselves|you) in|without me (?:there|home|being)|while i'?m (?:at work|gone|away|out)|(?:vacant|empty)\b[^.?!]*\?|won'?t be (?:home|there)|unlocked|leave (?:the )?door|lock up|be at work)\b/)) topic("access", "You don't need to stay home the whole time — a garage code or unlocked door is fine, especially on a vacant move-in or move-out, and we're happy to lock up after. Just put access details in the notes when you book.");
    if (has(t, /\b(?:stanley steemer|chemdry|zerorez|oxi ?fresh|other compan\w*|competitors?)\b/)) topic("compare", `We're owner-operated — Keith does the cleaning himself. The ${money(PRICES.standard)} special covers ${COVER}, plus tax, and carpets dry in about 1.5 to 2 hours.`);
    if (has(t, /\bhow many (?:people|guys|techs?|workers|employees)\b|\bbig crew\b|\bwho (?:actually )?does the (?:cleaning|work)\b|\bwho (?:will be|is|would be|'?s) (?:coming|doing|cleaning)\b|\bwho(?:'s| is) coming\b|\bwho comes\b|\b(?:will|would) (?:it|you) be (?:you|keith|the one)\b|\bbe the one (?:coming|doing|cleaning)\b|\bwho does the (?:cleaning|work)\b|\bdo you (?:send|have) (?:employees|a crew|helpers|subcontractors?)\b|\bsubcontract\w*\b/)) topic("about", "Yes — we're owner-operated, and Keith normally does the cleaning himself.");
    if (has(t, /\b(?:what'?s the catch|is there a catch|any catch|too good to be true|is (?:the |that |this )?\$?99 (?:real|legit|for real)|is (?:this|it) legit|hidden catch)\b/)) topic("special", `No catch — ${money(PRICES.standard)} plus tax covers ${COVER}. Bigger homes add ${money(PRICES.extra)} per extra area, and pet treatment is ${money(PRICES.pet)}.`);
    if (has(t, /\bpet (?:treatment|package|price|version|special|one)\b/) && has(t, /\b(?:whole house or|just (?:the )?spots|why|what is|what'?s (?:the|in|different)|whats different|what does|what do(?:es)? (?:it|that) do|actually do|how does|worth|difference|different)\b/)) topic("pet", `The pet package covers the whole job — up to 5 rooms, two halls and one staircase for ${money(PRICES.pet)}, or up to 3 rooms for ${money(PRICES.petMinimum)}. With pets we often need extra time for hair removal, and it includes an enzymatic treatment that breaks down pet urine and odor.`);
    if (has(t, /\b(?:gated|gate code|secured (?:building|entry)|locked building|buzzer|fob|call box|key card|front desk|concierge|controlled access|access controlled|security desk)\b/)) topic("access", "If the building is secured, just tell us how to get in — put the gate code or buzzer info in the notes when you book — so we can plan and coordinate access.");
    if (has(t, /\b(?:confirmation|confirm(?:ed)? (?:text|email)|how (?:do|will) i know (?:i'?m|i am|it'?s|we'?re) (?:booked|scheduled|confirmed)|after (?:i|we) book)\b/) && !has(t, /\bconfirm (?:my|our|the) (?:appointment|appt|booking)\b/)) topic("booking", "After you finish booking you'll get a confirmation text, and we collect the service address and a mobile number.");
    if (has(t, /\b(?:minimum|min charge|smallest job|least (?:you|it) (?:charge|costs?))\b/)) topic("price", `Our minimum is ${money(PRICES.minimum)} plus tax for up to three areas, or ${money(PRICES.petMinimum)} plus tax for up to three rooms with pet treatment.`);
    if (has(t, /\b(?:send|text|attach|share) (?:you )?(?:a |some )?(?:pics?|pictures?|photos?|images?)\b|\bcan i (?:send|show) you\b/)) topic("photo", reach("Yes — send them right here and we'll take a look.", `This website chat can't receive photos — text them to ${TEXT_LINE}.`));
    if (hasScope() && state.quoted && has(t, /^(?:really|seriously|wait|so)\b/) && has(t, /\$\s?\d+/) && !scopeChanged) topic("price", `Yes — ${quoteLine(scopeNow(), state.pets)}`);
    const explainsExtra = has(t, /\$\s?15\b/) && has(t, /\b(?:for|why|what)\b/) && !scopeChanged;
    if (explainsExtra) topic("price", `The ${money(PRICES.extra)} is for each area beyond what the ${money(PRICES.standard)} special covers — each room over five, each hall over two, or each staircase over one is ${money(PRICES.extra)} plus tax.`);
    if (has(t, /\b(?:plumb\w*|electrician|roof\w*|painters?|hvac|furnace|pest control|exterminator|maid|house ?keep\w*|house cleaning|window (?:cleaning|washing)|gutters?|lawn|landscap\w*|handyman|movers?|moving company|duct cleaning|air ducts?|dryer vent)\b/) && !has(t, /\bcarpet|rug|upholster|tile|floor/)) topic("other-trades", "We only do carpet, rug, upholstery, tile and hard-floor cleaning, so that's outside what we do — sorry!");
    if (has(t, /\b(?:do|would|will|should|does) (?:i|we|she|he|they) (?:really |even |still )?(?:need|have to (?:get|do)|want) (?:the |a )?pet (?:treatment|one|package|version|special)\b|\b(?:is|would) (?:the )?pet (?:treatment|one|package) (?:be )?(?:required|necessary|needed)\b|\bneed pet treatment\s*\?/)) {
      const base = hasScope() ? quote({ ...scopeNow(), pets: false }) : null, petQ = hasScope() ? quote({ ...scopeNow(), pets: true }) : null;
      const fmt = (q) => (q.extras ? `${money(q.base)} + ${money(q.extras * PRICES.extra)}, plus tax` : `${money(q.total)} plus tax`);
      topic("pet", "Only if there are pet accidents, urine or odor — just having pets doesn't need it." + (base ? ` Your quote stays ${fmt(base)}; with pet treatment it would be ${fmt(petQ)}.` : ` Pet treatment is ${money(PRICES.petMinimum)} for up to 3 rooms or ${money(PRICES.pet)} for the full special.`));
    }
    if (has(t, /\btips?\b|\btipping\b|\bgratuity\b/) && !has(t, /\btips? (?:for|on) (?:cleaning|keeping|stains?)\b/)) topic("tips", TIPS_REPLY);
    if (has(t, /\b(?:water|electricity|electric|power|outlets?|hose|hook ?up|utilities)\b/) && !has(t, /\bwater (?:damage|stains?|heater)\b/) && has(t, /\b(?:need|use|require|have to|provide|do you|turn on|on)\b/)) topic("utilities", UTILITIES_REPLY);
    if (has(t, /\b(?:fragrances?|scents?|scented|unscented|perfumes?|perfumed|smell of the|strong smells?|chemical smells?|fumes)\b/) || (has(t, /\bsmells?\b/) && has(t, /\b(?:sensitive|headaches?|allergic|bother)\b/))) topic("fragrance", FRAGRANCE_REPLY);
    if (has(t, /\bpark(?:ing)?\b(?! city)/) && !has(t, /\bpark city\b/)) topic("parking", PARKING_REPLY);
    if (has(t, /\b(?:guarantee|satisf\w*|unhappy with|(?:don'?t|do not) like (?:how|the result)|how it turns out|not happy with (?:it|the (?:results?|job))|what if (?:i'?m|we'?re) (?:not happ|unhapp)y|redo|re[- ]?clean)\b/) && !has(t, /\b(?:smell|odou?r|urine|pee|stains?|spots?)\b/) || has(t, /\b(?:comes?|coming) back\b|\breappear\w*|\bwicks? (?:back|up)\b/) && has(t, /\b(?:what if|what happens if|if|in case)\b/)) topic("satisfaction", SATISFACTION_REPLY + " Keith arranges any return visit personally.");
    if (has(t, /\b(?:walk[- ]?in closets?|closets?)\b/)) topic("included", CLOSET_REPLY);
    if (has(t, /\b(?:scotch ?gu?ard|protectant|protector|stain guard|stain protection)\b/)) topic("protector", `Carpet protector isn't on our standard menu. If you'd like to ask Keith about it for your job, text ${TEXT_LINE}.`);
    if (has(t, /\bbath ?rooms?\b/) && has(t, /\bcarpet(?:ed)?\b/) && !has(t, /\b(?:tile|grout|except|but not|not the|no carpet)\b/)) topic("included", "Yes — a carpeted bathroom counts as one of the rooms.");
    if (!scope.found && has(t, /\bhola\b|\bbuenos d[ií]as\b|\bespañol\b|\bspanish\b|\bcu[aá]nto\b|\bcuesta\b|\balfombras?\b|\blimpieza\b/)) topic("spanish", `¡Hola! Limpieza de alfombras: ${money(PRICES.standard)} + impuestos por hasta 5 cuartos, 2 pasillos y una escalera (${money(PRICES.pet)} con tratamiento para mascotas).`);
    const timeQuestion = has(t, /\b(?:times?|slots?|openings?|availability|available|days?|when)\b/) && has(t, new RegExp(`\\b(?:open|available|have|next week|this week|tomorrow|${DAY})\\b`));
    if ((!timeQuestion || has(t, /\b(?:open (?:til|till|until)|close)\b/)) && !weekend && has(t, /\b(?:your hours|what are your hours|what hours|hours do you|what time do you|are you open|business hours|open (?:til|till|until)|what time (?:do you|you) close|when do you (?:work|close|open)|what days do you)\b/)) topic("hours", "We work Monday through Friday, 7 AM to 5 PM (closed Saturday and Sunday), with start times around 8:00, 10:30, 1:00 and 3:30.");

    /* --- pricing and booking --- */
    const alreadyBooked = has(t, /\balready (?:booked|scheduled)\b|\bi booked\b|\bwe booked\b/);
    const infoOnly = jobLengthQ && !has(t, /\b(?:book|booking|schedule|availability|available|openings?)\b/);
    const wantsBook = !alreadyBooked && !infoOnly && (timeQuestion || Boolean(timeOfDayLine && !weekendWords)
      || has(t, new RegExp(`\\b(?:tomorrow|this week|next week|${DAY}|how soon|soonest|earliest|next available|\\d{1,2}(?:st|nd|rd|th)|book|booking|schedule|scheduled|appointment|appt|availability|available|openings?|open (?:times?|slots?|spots?)|when can (?:you|u)|sign (?:me|us) up|let'?s do it|i'?m ready|ready to|get on (?:the|your) (?:schedule|calendar)|time slots?|link|send (?:it|me))\\b`))
      || (!alreadyBooked && has(t, /^(?:ok |okay |so )?when\??$|\bok when\b/))
      || (!alreadyBooked && state.quoted && t.split(" ").length <= 4 && !/\?/.test(t) && has(t, /^(?:yes|yeah|yep|yup|sure|ok|okay|k|sounds good|perfect|great|deal|do it|please|yes please|si|fine|that works|works for me|let'?s go|let'?s do it)\b/)));
    const asksPrice = taxQ || has(t, /\b(?:price|prices|pricing|cost|costs|how much|quote|estimate|rates?|charge|what'?s it run|pay for)\b|\$/);
    const asksIncluded = (has(t, /\b(?:include|included|includes|cover|covers|what'?s in|for the whole house or|extra for|charge extra|count(?:ed|s)? as)\b/) && !areaQuestion) || scope.perRoomQuestion;
    const generalIncluded = asksIncluded && !/\d|\b(?:two|three|four|five|six|seven|eight)\b/.test(t);
    const moving = has(t, /\b(?:move ?out|moving|move ?in|deposit back|security deposit)\b/) && !has(t, /\bmov(?:e|ing) (?:the |my |our |any )?(?:furniture|stuff|couch|things|beds?)\b/);
    const moveIn = has(t, /\bmov(?:e|ing) ?in\b|\bbefore (?:we|i) move\b|\bnew (?:house|home|place)\b/);

    if (furnitureAsk && furniture.unpriced) {
      return out("layout_review", [...notes], { phone: true });
    }
    if (furnitureAsk && hasScope() && !scopeChanged && !asksIncluded) {
      state.quoted = true;
      return out("price", linkOnce([...notes, "Carpet: " + quoteLine(scopeNow(), state.pets).replace(/^For /, "for ")]));
    }
    const furnSaved = Object.keys(state.furn || {}).length ? furnitureLine({ items: state.furn, unpriced: null }) : "";
    if (hasScope() && state.quoted && !scopeChanged && /^(?:is (?:that|it|this)|that'?s|thats|is the (?:\$?\d+|price)) (?:each|per (?:room|area)|a room|for each)\b|\bor (?:the )?total\??$/.test(t)) {
      const q = quote({ ...scopeNow(), pets: state.pets });
      return out("price", [`No — that's the total for everything you listed, not per room: ${q.extras ? `${money(q.base)} + ${money(q.extras * PRICES.extra)}, plus tax` : `${money(q.total)} plus tax`}.`]);
    }
    if (hasScope() && state.quoted && !scopeChanged && (/^(?:(?:ok|okay|so|and|alright|great)[,!]? )*(?:what'?s|whats|what is) (?:the |my )?(?:total|final|grand total|price|damage)\??$|^(?:how much )?(?:total|all together|altogether)\??$|\bhow much (?:total|all together|altogether|for everything|for all of it)\b/.test(t) || (/^why\b|\bwhy (?:is it |so )?(?:more|extra|higher|the extra|\$)|\bhow did you get\b/.test(t) && !/\bpet\b/.test(t) && !/\$\s?15\b/.test(t)))) {
      const why = /\bwhy\b|how did you get/.test(t);
      return out("price", [(why ? "Here's how it adds up: " : "") + (furnSaved ? `Carpet: ${quoteLine(scopeNow(), state.pets).replace(/^For /, "for ")} ${furnSaved}` : quoteLine(scopeNow(), state.pets))]);
    }
    if (hasScope() && state.quoted && !scopeChanged && /^(?:is |so )?(?:that|thats|that's|this)(?: is)?(?: it| all| everything| the total| the full price| the whole thing| the final price| for everything| with everything| including everything| total)?(?: then)?\??$|^(?:is )?(?:that|thats|that's) (?:with|for|including) everything\b|^(?:and )?that'?s it\?|^(?:is )?that the (?:total|full price|whole price)\b/.test(t)) {
      const q = quote({ ...scopeNow(), pets: state.pets });
      const priceText = q.extras ? `${money(q.base)} + ${money(q.extras * PRICES.extra)}, plus tax,` : `${money(q.total)} plus tax`;
      return out("price", [`Yes — ${priceText} covers everything you listed.${state.linkSent ? "" : " Want the link to pick a weekday time?"}`]);
    }
    if (asksIncluded && (!scopeChanged || generalIncluded)) {
      return out("included", [...notes.filter((n) => n !== SPECIAL_REPLY), (scope.perRoomQuestion ? "No, it's not priced per room. " : "") +
        `The ${money(PRICES.standard)} special covers ${COVER}, plus tax (${money(PRICES.pet)} with pet treatment). Smaller jobs of up to 3 rooms are ${money(PRICES.minimum)} plus tax, and each extra room, hall or staircase is ${money(PRICES.extra)} plus tax.` + (hasScope() ? "" : ` ${ASK_ROOMS}`)]);
    }
    if (scopeChanged || (hasScope() && ((asksPrice && !explainsExtra && !(topicIntent === "pet" && /\bwhy\b/.test(t))) || pets !== null))) {
      state.quoted = true;
      const bedroomsOnly = scope.found && !(scope.namedList || []).length && !state.halls && !state.stairs && !state.rugs && !state.wholeHouse && state.rooms <= 3
        && has(t, /\b(?:bed ?rooms?|beds?|br|bdrms?|bd)\b/) && has(t, /\b(?:house|home|bath|ba)\b/) && !has(t, /\b(?:just|only)\b/);
      const ql = quoteLine(scopeNow(), state.pets, /\$\s?99\b|\b99\b/.test(t), bedroomsOnly && !notes.length);
      const lines = [...notes, notes.length >= 2 ? ql.replace(/ If you have pet accidents or odor, the pet-treatment version is [^.]*\.| Pet treatment is available if you need it\./, "") : ql];
      if (scope.rangeHigh && scope.rangeHigh > state.rooms) {
        const hi = quote({ ...scopeNow(), rooms: scope.rangeHigh, pets: state.pets === true });
        lines.push(`If it's ${scope.rangeHigh} rooms, it's ${hi.extras ? `${money(hi.base)} + ${money(hi.extras * PRICES.extra)}, plus tax` : `${money(hi.total)} plus tax`}.`);
      }
      if (moving) lines.unshift(moveIn ? "Great timing — cleaning before you move in is the easiest way to do it." : "Perfect for a move-out — we'll have it fresh for the walkthrough.");
      return out("price", withLink(lines));
    }
    if ((pets === true || (mentionsPets(t) && pets !== false)) && !notes.length && !hasScope()) {
      return out("pet", [`We see a lot of pet homes! Pet treatment adds an enzyme that breaks down urine and odor: ${money(PRICES.petMinimum)} for up to 3 areas, or ${money(PRICES.pet)} for ${COVER}, plus tax. How many rooms are we cleaning?`]);
    }
    if (moving && (!notes.length || asksPrice)) return out("price", [...notes, (moveIn ? "Great timing — cleaning before you move in is the easiest way to do it. " : "Perfect for a move-out — we'll have it fresh for the walkthrough. ") + PACKAGE_SUMMARY + " " + ASK_ROOMS]);
    if (asksPrice && !hasScope() && !notes.length && has(t, /\b(?:floors?|carpets?|carpeting)\b/) && !has(t, /\b(?:tile|grout|hard ?wood|laminate|vinyl)\b/)) return out("price", [`Happy to price it! ${ASK_ROOMS} For reference, the ${money(PRICES.standard)} special covers ${COVER}, plus tax.`]);
    if (asksPrice && !hasScope() && !notes.length) return out("price", [PACKAGE_SUMMARY + " " + ASK_ROOMS]);
    if (wantsBook && (!weekend || new RegExp(`\\b(?:${DAY}|next week|this week|weekday)\\b`).test(t))) {
      const lines = [...notes];
      if (has(t, /\btomorrow\b/) && !lines.length) return out("booking", ["Tomorrow's openings are on the live calendar — if a time shows there, you can reserve it directly:", bookingUrl]);
      if (timeQuestion && !lines.length) return out("booking", ["Weekday start times are usually 8:00, 10:30, 1:00 and 3:30 (we're closed Saturday and Sunday). The live calendar shows what's open:", bookingUrl]);
      const dayM = t.match(new RegExp(`\\b${DAY}\\b`));
      const DAYNAME = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday" };
      if (dayM && !lines.length) return out("booking", [`We work weekdays — ${DAYNAME[dayM[0].slice(0, 3)]}'s open times are on the live calendar, and you'll get a confirmation text right away:`, bookingUrl]);
      const plainYes = /^(?:ok|okay|k|kk|sounds good|perfect|great|cool|awesome|got it|alright|fine|ok fine|fine yes)\b[\s!.]*$/.test(t);
      if (plainYes && state.linkSent && !lines.length) return out("booking", ["Sounds good! Just pick your time on the booking link above — you'll get a confirmation text right away."]);
      if (state.quoted && !lines.length) lines.push("Great!");
      if (!lines.length && !hasScope()) return out("booking", ["Happy to get you on the schedule! How many rooms, hallways and stairs are we cleaning? Or you can pick a time right now:", bookingUrl]);
      if (!lines.length) lines.push("Happy to get you on the schedule.");
      return out("booking", withLink(lines));
    }
    if (asksPrice && topicIntent === "other-services" && has(t, /\b(?:tile|grout|hard ?wood|wood floors?|hard floors?|laminate|vinyl|lvp)\b/)) return out("other-services", [...notes]);
    if (asksPrice && (furnitureAsk || topicIntent === "rug")) return out(topicIntent || "price", [...notes, furnitureAsk ? "Want carpets done the same visit? " + ASK_ROOMS : askNext()]);
    if (asksPrice) return out("price", [...notes, notes.length && hasScope() ? askNext() : PACKAGE_SUMMARY + " " + ASK_ROOMS]);
    const followUp = alreadyBooked ? "Thanks for booking — see you then!" : ["area", "other-services", "special", "rug", "spanish", "apartment", "objection", "discount"].includes(topicIntent) ? askNext() : "";
    if (notes.length) return out(topicIntent || "info", [...notes, followUp]);

    /* --- small talk --- */
    if (/^(?:ok|okay|k|cool|got it|sounds good|great|perfect|alright|awesome)\b/.test(t)) {
      return out("thanks", [state.inArea === false && !state.quoted ? "No problem! If you're ever within about 15 miles of downtown Wichita, we'd be glad to help." : state.quoted && !state.linkSent ? "Want the link to pick a time?" : "Sounds good! Let me know if you have any other questions."]);
    }
    if (/^(?:hi|hello|hey|good (?:morning|afternoon|evening)|yo|howdy)\b/.test(t) && t.split(" ").length <= 5) {
      if (state.greeted) return out("greeting", ["What can I help with — a price, booking, or a question?"]);
      state.greeted = true;
      return out("greeting", ["Hi! What would you like cleaned?"]);
    }

    /* --- anything else: a helpful default, never a dead end --- */
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
    if (state.unknownCount >= 3) return out("unknown", [`No problem — whenever you're ready, tell me the rooms and I'll get you a price. You can also text Keith at ${TEXT_LINE}.`]);
    if (state.unknownCount === 2) return out("unknown", [hasScope() ? "Sorry if I wasn't clear! I can send the link to pick a weekday time, or answer any question about the cleaning." : `Sorry if I wasn't clear! Just tell me how many rooms, hallways and stairs you need cleaned and I'll give you the price — or ask me anything about our service.`]);
    return out("unknown", [hasScope()
      ? "Happy to help! Want the link to pick a weekday time, or is there something else I can answer?"
      : `Happy to help! ${ASK_ROOMS}`]);
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
    incoming(msg) { return safeHandle(msg?.text); },
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
