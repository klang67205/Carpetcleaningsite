import { bookingUrl, messengerUrl, smsUrl, createConversation, validateDirectives, textHandoffStands } from './front-desk.js';
import { checkPolished } from './writer-guard.js';

// A reply that tells the visitor to text the company or use Messenger gets the Text/Messenger buttons.
export const mentionsContact = (bubbles = []) => bubbles.some(text => /232[ .-]?8111|messenger/i.test(String(text)));

// The website cannot deliver messages to the company or modify appointments.
export function forWebsite(result) {
  if (!result || !Array.isArray(result.bubbles) || !result.bubbles.length || !result.bubbles.every(text => typeof text === 'string' && text.trim().length > 0)) {
    throw new Error('Invalid assistant response');
  }
  const handoff = Boolean(result.phone || result.messenger) || result.bubbles.some(text => /^I do not have a verified catalog price/.test(text));
  const furniture = result.bubbles.some(text => /^Furniture cleaning, plus applicable tax:|^The Complete Seating Package/.test(text));
  // a handoff reply that also offers the booking calendar keeps its link
  const keepLink = result.bubbles.some(text => /booking calendar right now:$/.test(text));
  const bubbles = result.bubbles
    .filter(text => !handoff || !/about how many rooms should we count|click this link|current to the minute|^https:\/\/book\./i.test(text) || (keepLink && text === bookingUrl))
    .map(text => text
      .replace(furniture ? /^.*about how many rooms should we count.*$/i : /$^/, 'For furniture, choose the Furniture Cleaning category in the booking catalog. Contact the company if you need help selecting the scope.')
      .replace(/keep talking here in Messenger/gi, 'open Messenger to contact the company')
      .replace(/here in Messenger/gi, 'in Messenger using the link below')
      .replace(/message us here/gi, 'contact the company in Messenger using the link below')
      .replace(/I[’']ll look at it myself\./gi, 'The company will need to review your request.')
    );
  // the brain's site replies already say how to reach Keith; add the generic note only when one doesn't
  if (handoff && !mentionsContact(bubbles)) bubbles.push('This website chat cannot send your request, receive photos, or change a booking. Text (316) 232-8111 or open Messenger to contact the company.');
  else if (furniture && !bubbles.includes(bookingUrl)) bubbles.push(bookingUrl);
  return { ...result, bubbles, handoff, contact: handoff || mentionsContact(bubbles), sendLink: handoff ? keepLink : furniture || result.sendLink, booking: handoff ? keepLink : result.booking };
}

export async function requestReply(host, sessionId, text, reset = false, fetcher = fetch) {
  const response = await fetcher(`${host}${reset ? '/preview/reset' : '/preview/message'}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, text }),
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error('Assistant unavailable');
  return forWebsite((await response.json()).result);
}

export { bookingUrl, messengerUrl, smsUrl };

export const contactLinks = () => [['Text the company', smsUrl], ['Open Messenger', messengerUrl]];

// Lay a reply out as chat entries so each button sits next to the text it belongs to:
// the booking button where its link was, and one set of Text/Messenger buttons right after
// the (last) bubble that mentions texting or Messenger. ["g", text] bubble, ["b"] booking, ["a", links] buttons.
export function replyEntries(result) {
  const bubbles = (result && result.bubbles) || [];
  const entries = bubbles.map(text => (text === bookingUrl ? ['b'] : ['g', text]));
  if (result && (result.handoff || result.contact)) {
    let at = -1;
    bubbles.forEach((text, i) => { if (text !== bookingUrl && mentionsContact([text])) at = i; });
    entries.splice(at < 0 ? entries.length : at + 1, 0, ['a', contactLinks()]);
  }
  return entries;
}

// AI layer (optional). The bot's /api/interpret endpoint reads the visitor's message into
// "directives" for this page's own front-desk brain, which still sets every price and handoff and
// writes the reply from approved wording. /api/polish may then reword that approved reply; it is
// checked again here (writer-guard) before it is shown. Any failure, odd answer or slow answer means
// "use their words" and the approved reply, exactly as without the AI.
export const INTERPRET_URL = 'https://wichita-messenger-bot-deploy.vercel.app/api/interpret';
export const POLISH_URL = 'https://wichita-messenger-bot-deploy.vercel.app/api/polish';
export const INTERPRET_TIMEOUT_MS = 8000;
export const POLISH_TIMEOUT_MS = 7000;
// Keith's open start times (from his calendar; times only). Optional like the AI steps.
export const OPEN_TIMES_URL = 'https://wichita-messenger-bot-deploy.vercel.app/api/open-times';
export const OPEN_TIMES_TIMEOUT_MS = 4000;
// The endpoint refuses longer messages, so they are not sent at all.
const MAX_MESSAGE = 1000;
const RECENT_LINES = 6;
// Contact and access details never go to the AI.
const PRIVATE_LINE = /\b\d{3}\D{0,3}\d{3}\D{0,2}\d{4}\b|@|\b(?:gate|door|garage|lock ?box|alarm|access)\s*code\b/i;
// The brain's own booking lead-in; the polished reply leads into the link itself.
const BOOK_INTRO = /^Here are the open weekday times/;
// Brain intents that stay with a person (mirrors the Messenger bot's list).
const HANDOFF_INTENTS = new Set(['human', 'complaint', 'layout_review', 'rug_price', 'commercial', 'change_existing', 'confirm_existing']);

/** POST JSON; resolves to the parsed body or null. Never rejects and never waits longer than `timeoutMs`. */
function postJson(url, payload, fetcher, timeoutMs) {
  if (!url || typeof fetcher !== 'function') return Promise.resolve(null);
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  let timer;
  const deadline = new Promise(resolve => {
    timer = setTimeout(() => { controller?.abort(); resolve(null); }, timeoutMs);
  });
  const request = (async () => {
    try {
      const response = await fetcher(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller?.signal,
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
      });
      if (!response || !response.ok) return null;
      const data = await response.json();
      return data && typeof data === 'object' && !Array.isArray(data) ? data : null;
    } catch {
      return null;
    }
  })();
  return Promise.race([request, deadline]).finally(() => clearTimeout(timer));
}

const usableMessage = payload => payload && typeof payload.message === 'string' && payload.message.trim() && payload.message.length <= MAX_MESSAGE;

/** Resolves to {directives, language} the brain accepts, or null. */
export async function interpretDirectives(url, payload, fetcher = globalThis.fetch, timeoutMs = INTERPRET_TIMEOUT_MS) {
  if (!usableMessage(payload)) return null;
  const data = await postJson(url, payload, fetcher, timeoutMs);
  const directives = data && data.directives;
  if (!directives || typeof directives !== 'object' || Array.isArray(directives) || !validateDirectives(directives)) return null;
  return { directives, language: data.language === 'es' ? 'es' : 'en' };
}

/** Resolves to reworded bubbles that pass every writer-guard check against the draft, or null. */
export async function polishBubbles(url, payload, fetcher = globalThis.fetch, timeoutMs = POLISH_TIMEOUT_MS) {
  if (!usableMessage(payload) || !Array.isArray(payload.draft) || !payload.draft.length) return null;
  const data = await postJson(url, payload, fetcher, timeoutMs);
  if (!data || !Array.isArray(data.bubbles)) return null;
  const check = checkPolished({ bubbles: data.bubbles }, { draft: payload.draft, channel: 'site', link: Boolean(payload.link), message: payload.message, language: payload.language });
  return check.ok ? check.bubbles : null;
}

/** Resolves to the open-times object the brain accepts ({asOf, days: [...]}) or null. */
export async function openTimes(url, fetcher = globalThis.fetch, timeoutMs = OPEN_TIMES_TIMEOUT_MS) {
  const data = await postJson(url, {}, fetcher, timeoutMs);
  const slots = data && data.slots;
  if (!slots || typeof slots !== 'object' || Array.isArray(slots) || !Array.isArray(slots.days) || typeof slots.asOf !== 'string') return null;
  return slots;
}

/** What to send /api/polish for a reply, or null when it should be shown as is (handoffs stay word for word, unless translated). */
export function polishRequest(message, result, language = 'en', recent = []) {
  // handoffs and replies with live open times stay word for word (unless translated)
  if (!result || !Array.isArray(result.bubbles) || ((result.handoff || result.slots) && language !== 'es')) return null;
  const link = result.bubbles.includes(bookingUrl);
  const draft = result.bubbles.filter(text => text !== bookingUrl && !BOOK_INTRO.test(text));
  if (!draft.length) return null;
  return { message, draft, link, language: language === 'es' ? 'es' : 'en', recent };
}

/** The reply with the polished wording in place of the draft (the booking link stays last). */
export const withPolish = (result, bubbles) => ({ ...result, bubbles: [...bubbles, ...(result.bubbles.includes(bookingUrl) ? [bookingUrl] : [])] });

export function createWebsiteConversation() {
  // The front-desk brain already speaks for the website (channel "site"): it never claims it
  // notified anyone, and its handoffs point to the text line and Messenger.
  const conversation = createConversation({ channel: 'site' });
  const state = conversation.state;
  let lastBot = '';
  const recent = [];
  const note = (who, text) => {
    const line = String(text || '').replace(/\s+/g, ' ').trim();
    if (!line || PRIVATE_LINE.test(line)) return;
    recent.push(`${who}: ${line}`.slice(0, 300));
    while (recent.length > RECENT_LINES) recent.shift();
  };
  const remember = (result, said) => {
    lastBot = result.bubbles.filter(text => text !== bookingUrl).join(' ').slice(0, 600);
    if (said !== undefined) note('customer', said);
    note('bot', lastBot);
    return result;
  };
  const shape = r => ({ bubbles: r.bubbles, phone: Boolean(r.phone), messenger: false, sendLink: r.bubbles.includes(bookingUrl), booking: r.bubbles.includes(bookingUrl), slots: Boolean(r.slots) });
  const snapshot = () => JSON.stringify(state);
  const restore = saved => { for (const key of Object.keys(state)) delete state[key]; Object.assign(state, JSON.parse(saved)); };
  // The visitor's words, or the AI's reading of them. A clear complaint, an existing appointment or a
  // request for a person in the visitor's own words always stands; the AI reading can never end the chat.
  const reply = (text, directives, slots) => {
    if (!directives) return conversation.incoming({ text, slots });
    const before = snapshot();
    const raw = conversation.incoming({ text, slots });
    const rawIntent = String(state.lastIntent || '');
    if (rawIntent === 'stop' || (HANDOFF_INTENTS.has(rawIntent) && textHandoffStands(rawIntent, text))) return raw;
    const rawState = snapshot();
    restore(before);
    let viaAI = null;
    try { viaAI = conversation.incoming({ text, directives, slots }); } catch { viaAI = null; }
    if (viaAI && Array.isArray(viaAI.bubbles) && viaAI.bubbles.length && String(state.lastIntent || '') !== 'stop') return viaAI;
    restore(rawState);
    return raw;
  };
  return {
    start: () => remember(forWebsite(conversation.start())),
    // slots (optional): Keith's open start times from /api/open-times
    respond: (input, directives, slots) => remember(forWebsite(shape(reply(input, directives, slots))), input),
    // After the reply was reworded: remember what the visitor actually saw.
    shown: bubbles => {
      const line = bubbles.filter(text => text !== bookingUrl).join(' ');
      if (recent.length && recent[recent.length - 1].startsWith('bot: ')) recent.pop();
      lastBot = line.slice(0, 600);
      note('bot', lastBot);
    },
    // Read-only summary of what the brain knows about the job (a fresh copy each call).
    job: () => {
      const s = state;
      return { rooms: s.rooms, halls: s.halls, stairs: s.stairs, rugs: s.rugs, wholeHouse: s.wholeHouse, pets: s.pets, quoted: s.quoted, linkSent: s.linkSent };
    },
    // The assistant's previous reply as one line (booking link left out).
    lastBot: () => lastBot,
    // Earlier lines of this chat for the AI (contact and access details left out).
    recent: () => recent.slice(),
  };
}
