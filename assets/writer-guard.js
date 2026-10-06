// Code checks on the AI-polished reply. If anything fails, the engine's approved draft is sent instead.
// The AI may only rephrase: every price, time, number, phone, day and policy word must already be in the draft.
const norm = (s) => String(s || "").replace(/[‘’]/g, "'").replace(/[“”]/g, '"');

const MONEY = /\$\s?\d+(?:\.\d+)?/g;
const PERCENT = /\d+\s?%/g;
const TIME = /\b\d{1,2}(?::\d{2})?\s?(?:am|pm|a\.m\.|p\.m\.)\b|\b\d{1,2}:\d{2}\b/gi;
const PHONE = /\(?\d{3}\)?[ .-]?\d{3}[ .-]?\d{4}/g;
const NUMBER = /\b\d+(?:\.\d+)?\b/g;
const SENSITIVE = [
  /\bsaturdays?\b/i, /\bsundays?\b/i, /\bweekends?\b/i, /\bguarantee\w*\b/i, /\bpromise\w*\b/i, /\bfree\b/i,
  /\bdiscount\w*\b/i, /\brefund\w*\b/i, /\bsame[- ]day\b/i, /\btoday\b/i, /\btomorrow\b/i, /\btonight\b/i,
  /\bkeith (?:will|'ll|has|knows)\b/i, /\bi(?:'ve| have) (?:sent|passed|told|let|flagged|asked)\b/i, /\bhe(?:'ll| will) (?:reply|reach|call|text|get back)\b/i,
  /\bs[áa]bados?\b/i, /\bdomingos?\b/i, /\bfin(?:es)? de semana\b/i, /\bgarant\w*\b/i, /\bprome\w*\b/i, /\bgratis\b/i, /\bdescuento\w*\b/i, /\breembols\w*\b/i, /\bhoy\b/i, /\bma[ñn]ana\b/i,
  /\bcertif\w*\b/i, /\blicens\w*\b/i, /\binsured\b/i, /\bwarrant\w*\b/i, /\bmold\b/i, /\bsteam\b/i, /\bchemical\w*\b/i, /\bsafe\b/i,
  // result promises the owner never makes
  /\bbrighten\w*\b/i, /\b(?:like|as good as) new\b/i, /\blook(?:s)? (?:brand )?new\b/i, /\b(?:stains?|spots?|odou?r|smell|it|that|they)\s+(?:will|should|would|'ll)?\s*comes? (?:right )?out\b/i, /\bno problem getting\b/i, /\bdefinitely\b/i, /\b100 ?%/i,
];
const DAYS = /\b(?:monday|tuesday|wednesday|thursday|friday)s?\b/gi;

const setOf = (text, re) => new Set((norm(text).toLowerCase().match(re) || []).map((x) => x.replace(/\s+/g, "")));
const WORDNUM = { one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10", fifteen: "15", twenty: "20" };
const digitsFor = (s) => norm(s).toLowerCase().replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|fifteen|twenty)\b/g, (m) => WORDNUM[m]);
const WEEKEND_YES = /\b(?:can|could|will|do|does|we'll|we can|works?|open|podemos|puedo|puede|pueden|vamos|abrimos|trabajamos|s[ií])\b[^.?!]{0,30}\b(?:saturdays?|sundays?|weekends?|s[áa]bados?|domingos?|fin(?:es)? de semana)\b/i;

/**
 * @param {{bubbles:string[]}} out  AI output
 * @param {{draft:string[], channel:string, link:boolean, message?:string}} ctx
 * @returns {{ok:true, bubbles:string[]} | {ok:false, reason:string}}
 */
export function checkPolished(out, ctx) {
  if (!out || !Array.isArray(out.bubbles)) return { ok: false, reason: "shape" };
  const bubbles = out.bubbles.map((b) => (typeof b === "string" ? b.replace(/\s+/g, " ").trim() : "")).filter(Boolean);
  if (!bubbles.length || bubbles.length > 3) return { ok: false, reason: "count" };
  if (bubbles.some((b) => b.length > 320)) return { ok: false, reason: "length" };
  const text = norm(bubbles.join(" ")), draft = norm(ctx.draft.join(" "));
  if (/https?:\/\/|www\.|\.com\b/i.test(text) && !/\.com\b/i.test(draft)) return { ok: false, reason: "url" };
  if (/[<>{}]|\bas an ai\b|\blanguage model\b/i.test(text)) return { ok: false, reason: "markup" };
  for (const re of [MONEY, PERCENT, TIME, PHONE, DAYS]) {
    // a weekday the customer named may be echoed (the availability check below still applies)
    const allowed = re === DAYS ? new Set([...setOf(draft, re), ...setOf(ctx.message || "", re)]) : setOf(draft, re);
    for (const v of setOf(text, re)) if (!allowed.has(v)) return { ok: false, reason: `new ${re.source.slice(0, 12)} ${v}` };
  }
  // bare numbers (counts, hours, sq ft) must come from the draft (spelled-out numbers count) or echo the customer's message
  const msg = norm(ctx.message || "");
  const draftNums = new Set([...setOf(digitsFor(draft), NUMBER), ...setOf(digitsFor(msg).replace(MONEY, " "), NUMBER)]);
  for (const v of setOf(text.replace(PHONE, " ").replace(MONEY, " "), NUMBER)) if (!draftNums.has(v)) return { ok: false, reason: `new number ${v}` };
  // a Spanish reply translates the draft's English words: "sábado" is fine when the draft says "Saturday"
  const EN_FOR_ES = [[/s[áa]bado/i, /saturday/i], [/domingo/i, /sunday/i], [/fin(?:es)? de semana/i, /weekend|saturday|sunday/i], [/garant/i, /guarantee/i], [/gratis/i, /free/i], [/descuento/i, /discount/i], [/reembols/i, /refund/i], [/\bhoy\b/i, /today|same[- ]day/i], [/ma[ñn]ana/i, /tomorrow/i], [/prome/i, /promise/i]];
  for (const re of SENSITIVE) {
    if (!re.test(text) || re.test(draft)) continue;
    const hit = (text.match(re) || [""])[0];
    const pair = EN_FOR_ES.find(([es]) => es.test(hit));
    if (pair && pair[1].test(draft) && !(WEEKEND_YES.test(text) && !/closed|cerrad/i.test(text))) continue;
    // a weekend the customer mentioned may be echoed ("before Saturday"), never offered
    if (/s[áa]bado|domingo|saturday|sunday|weekend|fin(?:es)? de semana/.test(re.source) && re.test(msg) && !WEEKEND_YES.test(text)) continue;
    return { ok: false, reason: `new claim ${re.source}` };
  }
  if (WEEKEND_YES.test(text) && !/closed|cerrad/i.test(text)) return { ok: false, reason: "weekend offer" };
  // the bot is the automated assistant: it never speaks as Keith
  if (/\bi(?:'m| am) keith\b|\bi own\b|\bi do (?:the|all the|my own) cleaning\b|\bmyself\b|\bmy (?:business|company|equipment|machine)\b/i.test(text) && !/\bi(?:'m| am) keith\b|\bmyself\b/i.test(draft)) return { ok: false, reason: "keith voice" };
  // never imply a booking exists
  if (/\byou(?:'re| are) (?:all set|booked|confirmed|scheduled|on the (?:schedule|calendar))\b|\b(?:i|we)(?:'ve| have) (?:booked|scheduled|reserved) you\b|\bsee you (?:then|soon|on)\b/i.test(text) && !/\byou(?:'re| are) (?:all set|booked)\b/i.test(draft)) return { ok: false, reason: "booking claim" };
  // never imply a slot is open: the bot can't see the calendar ("Thursday and Friday both work!")
  if (/\b(?:both|all|either|those|these|they)\s+(?:days?\s+)?(?:work|works|are open|are available|are free)\b|\bworks? (?:great|for us|perfectly)\b/i.test(text) && !/\bworks? (?:great|for us)\b|\bboth work\b/i.test(draft)) return { ok: false, reason: "availability claim" };
  // a per-unit price the draft doesn't state ("$99 per bathroom")
  if (/\$\d+\s*(?:per|each|a|\/)\s*(?:room|bathroom|bath|area|hall(?:way)?|stair(?:case)?|step|rug|piece|seat|cushion|sq ?ft|square foot)\b|\bper (?:room|bathroom|area|sq ?ft|square foot)\b/i.test(text) && !/\$\d+\s*(?:per|each|a|\/)\s*(?:room|bathroom|bath|area|hall(?:way)?|stair(?:case)?|step|rug|piece|seat|cushion|sq ?ft|square foot)\b|\bper (?:room|bathroom|area|sq ?ft|square foot)\b|\beach\b/i.test(draft)) return { ok: false, reason: "new per-unit price" };
  // room/hall/stair counts must match the draft's ("4 rooms" when the draft says 5)
  const COUNT = /\b(\d+)\s+(rooms?|bedrooms?|hall(?:way)?s?|stair(?:case)?s?|rugs?)\b/gi;
  const draftCounts = new Set([...draft.matchAll(COUNT)].map((m) => `${m[1]} ${m[2].toLowerCase().replace(/s$/, "").replace(/^bed/, "")}`));
  for (const m of text.matchAll(COUNT)) { const k = `${m[1]} ${m[2].toLowerCase().replace(/s$/, "").replace(/^bed/, "")}`; if (!draftCounts.has(k) && !(k.endsWith(" room") && [...draftCounts].some((x) => x.startsWith(m[1] + " ")))) return { ok: false, reason: `count changed ${k}` }; }
  // a "pick a time here:" lead-in with no link after it
  if (!ctx.link && /(?:pick|grab|choose|book) (?:a|your) (?:time|spot|day)\b[^.?!]*:\s*$|\btap (?:the )?(?:booking )?link below\b|\bhere:\s*$/i.test(text)) return { ok: false, reason: "lead without link" };
  // never imply a slot is open: the bot can't see the calendar
  if (/\b(?:monday|tuesday|wednesday|thursday|friday|that|it|this|tomorrow) (?:works|is (?:open|available|free))\b|\bwe(?:'re| are) (?:open|available|free) (?:on|that|then)\b|\bsee you (?:on|then|monday|tuesday|wednesday|thursday|friday)\b/i.test(text) && !/\b(?:works|is open|is available)\b/i.test(draft)) return { ok: false, reason: "availability claim" };
  // "Friday's available" / "Friday is open"
  if (/\b(?:monday|tuesday|wednesday|thursday|friday|tomorrow)(?:'s| is| are)?\s+(?:wide )?(?:open|available|free)\b|\b(?:available|open(?:ings)?) (?:on |this |next )?(?:monday|tuesday|wednesday|thursday|friday)\b/i.test(text) && !/\b(?:is|are) (?:open|available)\b/i.test(draft)) return { ok: false, reason: "availability claim" };
  // a conditional pet upsell must keep its condition ("If you have pet accidents or odor … $149"); having pets alone never means $149
  if (/\bif (?:you have |there (?:are|is) )?(?:pet )?(?:accidents?|urine|odou?r)\b|\bpet accidents or odou?r\b/i.test(draft) && /\$(?:149|85)\b/.test(text) && !/accident|odou?r|urine|pee|olor|orina|accidente/i.test(text)) return { ok: false, reason: "pet condition dropped" };
  // never add a yes/no answer the draft doesn't give
  if (/^(?:yes|yep|yeah|no|nope|s[ií])\b/i.test(text.trim()) && !/^(?:yes|no)\b|(?:^|[.!?] )(?:yes|no) —/i.test(draft.trim())) return { ok: false, reason: "new yes/no" };
  // start times and other times must all survive
  { const keep = setOf(draft, TIME), got = setOf(text, TIME); for (const v of keep) if (!got.has(v)) return { ok: false, reason: `dropped time ${v}` }; }
  // a reply that ends on a colon needs a link after it
  if (!ctx.link && /:\s*$/.test(text)) return { ok: false, reason: "lead without link" };
  // "$114 total" must stay "$114 plus tax"
  if (/\$\d+(?:\.\d+)?\s+(?:total|in total|altogether|in all)\b(?!,? plus tax)/i.test(text)) return { ok: false, reason: "dropped plus tax" };
  // "the booking link above" is how a customer finds the times again: keep the pointer
  if (/booking link above/i.test(draft) && !/\blink\b|\benlace\b/i.test(text)) return { ok: false, reason: "dropped link pointer" };
  // the assistant can't go check anything: no "let me check / I can see if"
  if (/\b(?:let me|i(?:'ll| will| can)|i'?m going to) (?:check|look into|find out|see if|look up|confirm)\b/i.test(text) && !/\b(?:check|look into|find out|see if|confirm)\b/i.test(draft)) return { ok: false, reason: "new claim check" };
  // never claim Keith or the crew speaks Spanish; a Spanish reply must actually be in Spanish
  if (/\bhabl\w* (?:espa[ñn]ol|ingl[eé]s)\b|\bspeaks? spanish\b|\bse habla\b/i.test(text) && !/spanish|espa[ñn]ol/i.test(draft)) return { ok: false, reason: "new claim spanish" };
  if (ctx.language === "es" && ((" " + text.toLowerCase() + " ").match(/\s(?:el|la|los|las|es|para|con|por|que|y|de|su|sus|más|mas|una?|le|lo|se|cuartos?|alfombras?|impuestos)\s/g) || []).length < 3) return { ok: false, reason: "not spanish" };
  // pet treatment is only in a quote when the draft puts it there
  if (/\bwith (?:the )?pet treatment\b|\bcon (?:el )?tratamiento\b/i.test(text) && !/\bwith (?:the )?pet treatment\b|\bpet[- ]treatment (?:special|version|package)\b/i.test(draft)) return { ok: false, reason: "new claim pet treatment" };
  // keep the line about Keith when the draft has one (an unanswered question, an offer to ask him)
  if (/\bkeith\b/i.test(draft) && /keith can answer|want me to ask (?:him|keith)|(?:i've|i have) asked keith|(?:text|message) (?:keith|him)|let keith know|keith (?:will|'ll|can) /i.test(draft) && !/\bkeith\b/i.test(text)) return { ok: false, reason: "dropped keith line" };
  // every price in the draft must survive (quotes can't silently disappear)
  // (the customer's own quote and totals; an optional upsell like "the pet-treatment version is $149" may be dropped)
  const quoteSentences = draft.split(/(?<=[.!?])\s+/).filter((x) => /\$\d/.test(x) && !/^if you have pet/i.test(x) && (/\bfor (?:\d+|a|an|the|your)\b/i.test(x) || /^still\b/i.test(x) || /\bin all\b|\baltogether\b/i.test(x) || /\bis \$\d+ plus tax\b/i.test(x)));
  const have = setOf(text, MONEY);
  for (const v of setOf(quoteSentences.join(" "), MONEY)) if (!have.has(v)) return { ok: false, reason: `dropped price ${v}` };
  if (/plus tax/i.test(draft) && /\$\s?\d/.test(text) && !/plus tax|\+ tax|impuesto/i.test(text)) return { ok: false, reason: "dropped plus tax" };
  MONEY.lastIndex = 0;
  if (ctx.channel === "site" && /\b(?:i(?:'ve| have)|we(?:'ve| have)) (?:sent|passed|notified|let|told|flagged)\b|\bhe(?:'ll| will) (?:reply|get back) (?:to you )?here\b|\b(?:i can|i'll|let me) (?:connect you|get keith|have keith|ask keith|pass)\b/i.test(text)) return { ok: false, reason: "site claim" };
  return { ok: true, bubbles };
}

/** The guard's reason in words the writer can act on. */
export function explainGuard(reason = "") {
  if (/^dropped price (\S+)/.test(reason)) return `You left out the price ${reason.split(" ")[2]} from the draft. Keep every price for the customer's job exactly as written.`;
  if (/^dropped plus tax/.test(reason)) return "You wrote a price without \"plus tax\". Every price must keep \"plus tax\".";
  if (/^new number (\S+)/.test(reason)) return `You added the number ${reason.split(" ")[2]}, which isn't in the draft or the customer's message. Use only numbers from the draft.`;
  if (/^new claim/.test(reason)) return `You added a word or claim the draft doesn't make (${reason.replace(/^new claim /, "").replace(/\\b|\(\?:|\)|\?|\\w\*|s\?/g, "")}). Don't add it.`;
  if (/^new /.test(reason)) return `You added a price, time, day or phone number (${reason.split(" ").slice(2).join(" ")}) that isn't in the draft. Use only what the draft says.`;
  if (/availability/.test(reason)) return "You implied a day or time is open. The bot can't see the calendar — only the booking link shows openings.";
  if (/weekend/.test(reason)) return "You implied a weekend is possible. We're closed Saturday and Sunday.";
  if (/length|count/.test(reason)) return "Too long: use 1 to 3 bubbles of at most 300 characters each.";
  if (/site claim/.test(reason)) return "On the website chat, never say you passed anything to Keith.";
  if (/per-unit/.test(reason)) return "You stated a per-room/per-item price the draft doesn't state. Keep prices exactly as the draft words them.";
  if (/count changed/.test(reason)) return `You changed a count (${reason.replace("count changed ", "")}). Keep the counts exactly as in the draft.`;
  if (/^dropped time/.test(reason)) return `You left out the time ${reason.split(" ")[2]}. Keep every time from the draft.`;
  if (/pet condition/.test(reason)) return "You mentioned the pet-treatment price without its condition. Keep \"if you have pet accidents or odor\" — having pets alone is the regular price.";
  if (/new yes\/no/.test(reason)) return "You started with Yes/No, but the draft doesn't answer yes or no. Don't add one.";
  if (/not spanish/.test(reason)) return "The customer writes in Spanish: write the whole reply in Spanish.";
  if (/dropped link pointer/.test(reason)) return "You left out the pointer to the booking link above. Keep it — that's where the open times are.";
  if (/dropped keith line/.test(reason)) return "You left out the sentence about Keith. Keep it.";
  if (/lead without link/.test(reason)) return "You ended with a \"pick a time here:\" lead-in, but no link follows this reply. Don't point to a link.";
  if (/booking claim/.test(reason)) return "You implied the customer is already booked. Only picking a time on the booking link books it.";
  if (/keith voice/.test(reason)) return "Never speak as Keith. You are the automated assistant; refer to Keith in the third person.";
  return `Your reply was rejected (${reason}). Stay closer to the draft.`;
}

