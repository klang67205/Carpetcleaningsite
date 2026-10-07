// AI layer on the website: the bot's /api/interpret endpoint reads the visitor's message into
// directives for this page's own brain, and /api/polish may reword the brain's approved reply (checked
// again here). Every failure must quietly fall back to the visitor's own words and the approved reply.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  interpretDirectives, polishBubbles, polishRequest, withPolish, createWebsiteConversation,
  INTERPRET_URL, POLISH_URL, INTERPRET_TIMEOUT_MS, POLISH_TIMEOUT_MS, bookingUrl,
  openTimes, OPEN_TIMES_URL,
} from '../assets/site-response.js';
import { slotsFromIcs } from '../assets/availability.js';

const URL_ = 'https://bot.test/api/interpret';
const PURL = 'https://bot.test/api/polish';
const QUOTE = { language: 'en', confidence: 0.95, job: { action: 'set', rooms: 4, stairs: 1 }, price_question: 'quote' };
const payload = { message: 'hw much for 4 bedrms and stars', job: { rooms: 0 }, lastBot: 'Hi!', recent: ['bot: Hi!'] };
const DRAFT = ["For 4 rooms and a staircase, that's our $99 whole-house special — $99 plus tax."];
const polishPayload = { message: 'hw much for 4 bedrms and stars', draft: DRAFT, link: true, language: 'en', recent: [] };
const reply = (body, ok = true) => async () => ({ ok, json: async () => body });
const appCode = readFileSync(new URL('../assets/app.js', import.meta.url), 'utf8');

test('Endpoint URLs and timeouts match the bot deployment', () => {
  assert.equal(INTERPRET_URL, 'https://wichita-messenger-bot-deploy.vercel.app/api/interpret');
  assert.equal(POLISH_URL, 'https://wichita-messenger-bot-deploy.vercel.app/api/polish');
  assert.equal(INTERPRET_TIMEOUT_MS, 8000);
  assert.equal(POLISH_TIMEOUT_MS, 7000);
});

test('Directives that come back in time are used; the request carries message, job, lastBot and recent', async () => {
  const calls = [];
  const fetcher = async (url, options) => { calls.push([url, options]); return { ok: true, json: async () => ({ directives: QUOTE, language: 'en' }) }; };
  assert.deepEqual(await interpretDirectives(URL_, payload, fetcher), { directives: QUOTE, language: 'en' });
  const [url, options] = calls[0];
  assert.equal(url, URL_);
  assert.equal(options.method, 'POST');
  assert.equal(options.headers['Content-Type'], 'application/json');
  assert.equal(options.credentials, 'omit');
  assert.ok(options.signal, 'request can be aborted');
  assert.deepEqual(JSON.parse(options.body), payload);
});

const fallbacks = [
  ['directives null (endpoint limited or unsure)', reply({ directives: null })],
  ['HTTP error', reply({ directives: QUOTE }, false)],
  ['network error / CORS block', async () => { throw new TypeError('Failed to fetch'); }],
  ['malformed JSON', async () => ({ ok: true, json: async () => { throw new SyntaxError('bad json'); } })],
  ['directives the brain rejects (low confidence)', reply({ directives: { ...QUOTE, confidence: 0.2 } })],
  ['directives the brain rejects (unknown topic)', reply({ directives: { ...QUOTE, topics: ['free_cleaning'] } })],
  ['directives as a string', reply({ directives: 'rooms 4' })],
  ['directives as an array', reply({ directives: [QUOTE] })],
  ['empty body', reply(null)],
];
for (const [name, fetcher] of fallbacks) {
  test(`Falls back to the visitor's words: ${name}`, async () => {
    assert.equal(await interpretDirectives(URL_, payload, fetcher), null);
  });
}

test('A slow endpoint is abandoned at the timeout (aborted, no error)', async () => {
  let aborted = false;
  const fetcher = (url, options) => new Promise((resolve, reject) => {
    options.signal.addEventListener('abort', () => { aborted = true; reject(new DOMException('aborted', 'AbortError')); }, { once: true });
  });
  const started = Date.now();
  assert.equal(await interpretDirectives(URL_, payload, fetcher, 60), null);
  assert.ok(Date.now() - started < 1000);
  assert.equal(aborted, true);
  assert.equal(await polishBubbles(PURL, polishPayload, () => new Promise(() => {}), 60), null, 'polish too, even if the request ignores abort');
});

test('No request without an endpoint, a fetch, a message, or for messages over 1000 characters', async () => {
  let calls = 0;
  const fetcher = async () => { calls += 1; return { ok: true, json: async () => ({ directives: QUOTE, bubbles: DRAFT }) }; };
  assert.equal(await interpretDirectives('', payload, fetcher), null);
  assert.equal(await interpretDirectives(URL_, { ...payload, message: '  ' }, fetcher), null);
  assert.equal(await interpretDirectives(URL_, { ...payload, message: 'x'.repeat(1001) }, fetcher), null);
  assert.equal(await interpretDirectives(URL_, payload, undefined), null);
  assert.equal(await polishBubbles(PURL, { ...polishPayload, draft: [] }, fetcher), null);
  assert.equal(await polishBubbles('', polishPayload, fetcher), null);
  assert.equal(calls, 0);
});

test('Polished bubbles are used only when they pass the writer checks here too', async () => {
  const good = ["4 rooms and a staircase come to the $99 whole-house special — $99 plus tax. Pick a time here:"];
  assert.deepEqual(await polishBubbles(PURL, polishPayload, reply({ bubbles: good })), good);
  for (const bad of [
    ["That's $89 plus tax."],
    ["Saturday works! $99 plus tax for 4 rooms and a staircase."],
    ["I've passed this to Keith and he'll reply here. $99 plus tax for 4 rooms and a staircase."],
    ["Book at https://evil.example — $99 plus tax."],
    ['a', 'b', 'c', 'd'],
  ]) assert.equal(await polishBubbles(PURL, polishPayload, reply({ bubbles: bad })), null, bad.join(' '));
  assert.equal(await polishBubbles(PURL, polishPayload, reply({ bubbles: null })), null);
  assert.equal(await polishBubbles(PURL, polishPayload, reply({ bubbles: good }, false)), null);
});

test('Only non-handoff replies are reworded (handoffs only to translate), and the booking link stays last', () => {
  const result = { bubbles: [...DRAFT, "Here are the open weekday times — pick one and you'll get a confirmation text right away:", bookingUrl], handoff: false };
  assert.deepEqual(polishRequest('how much', result, 'en', ['bot: Hi!']), { message: 'how much', draft: DRAFT, link: true, language: 'en', recent: ['bot: Hi!'] });
  assert.deepEqual(withPolish(result, ['Reworded.']).bubbles, ['Reworded.', bookingUrl]);
  const handoff = { bubbles: ['Please text Keith at (316) 232-8111.'], handoff: true };
  assert.equal(polishRequest('you ruined my rug', handoff, 'en'), null);
  assert.equal(polishRequest('arruinaron mi alfombra', handoff, 'es').language, 'es');
  assert.equal(polishRequest('x', { bubbles: [bookingUrl] }, 'en'), null);
});

test('The website conversation exposes a read-only job summary, the last reply and recent lines', () => {
  const chat = createWebsiteConversation();
  chat.start();
  assert.match(chat.lastBot(), /How can I help/);
  assert.deepEqual(chat.job(), { rooms: 0, halls: 0, stairs: 0, rugs: 0, wholeHouse: false, pets: null, quoted: false, linkSent: false });
  chat.respond('4 rooms, 1 staircase. how much?');
  const job = chat.job();
  assert.equal(job.rooms, 4);
  assert.equal(job.stairs, 1);
  assert.equal(job.quoted, true);
  assert.match(chat.lastBot(), /\$99/);
  assert.doesNotMatch(chat.lastBot(), /housecallpro/, 'booking link is left out of lastBot');
  job.rooms = 99;
  assert.equal(chat.job().rooms, 4, 'changing the summary does not change the conversation');
  assert.deepEqual(chat.recent().map(line => line.split(':')[0]), ['bot', 'customer', 'bot']);
  chat.shown(['Reworded reply.', bookingUrl]);
  assert.equal(chat.lastBot(), 'Reworded reply.');
  assert.equal(chat.recent().at(-1), 'bot: Reworded reply.');
});

test('Contact and access details never go into the recent lines', () => {
  const chat = createWebsiteConversation();
  chat.start();
  chat.respond('my number is 316-555-0142');
  chat.respond('gate code is 4417');
  chat.respond('email me at jo@example.com');
  assert.doesNotMatch(chat.recent().join(' '), /555|4417|jo@/);
});

test('Directives price the misread message; the text path answers without them', () => {
  const raw = 'wat u charge 4 the master, the 2 kids rms n the den + stares';
  const withAI = createWebsiteConversation();
  withAI.start();
  assert.match(withAI.respond(raw, QUOTE).bubbles.join(' '), /4 rooms and a staircase[\s\S]*\$99 plus tax/);
  const without = createWebsiteConversation();
  without.start();
  assert.deepEqual(without.respond(raw).bubbles, createWebsiteConversation().respond(raw).bubbles);
});

test("A clear complaint in the visitor's words stands, whatever the AI read; the AI can never end the chat", () => {
  const chat = createWebsiteConversation();
  chat.start();
  const complaint = chat.respond('you guys did a terrible job last time', QUOTE);
  assert.doesNotMatch(complaint.bubbles.join(' '), /\$99/);
  assert.match(complaint.bubbles.join(' '), /232-8111/);
  assert.equal(complaint.handoff, true);

  const stop = createWebsiteConversation();
  stop.start();
  assert.match(stop.respond('how much for 3 rooms', { language: 'en', confidence: 0.95, handoff: 'stop' }).bubbles.join(' '), /\$75/);
});

test('Directives the brain cannot use leave the conversation exactly as the text path would', () => {
  const a = createWebsiteConversation();
  const b = createWebsiteConversation();
  a.start(); b.start();
  const bad = { language: 'en', confidence: 0.1 };
  assert.deepEqual(a.respond('3 rooms please', bad).bubbles, b.respond('3 rooms please').bubbles);
  assert.deepEqual(a.job(), b.job());
});

test('The page answers with directives but always shows the visitor their own words', () => {
  assert.match(appCode, /const entry = \["v", q, 1\]/, 'the visitor bubble is their own text');
  assert.match(appCode, /const \[read, slots\] = await Promise\.all\(\[understand\(entry\[1\]\), liveTimes\(\)\]\);/);
  assert.match(appCode, /result = conversation\.respond\(entry\[1\], read \? read\.directives : undefined, slots \|\| undefined\);/);
  assert.match(appCode, /result = await reword\(entry\[1\], result, read \? read\.language : "en", recent\);/);
  assert.match(appCode, /if \(read\) entry\[3\] = \{ d: read\.directives \};/, 'the reading is saved so a reload replays it');
  assert.match(appCode, /concierge\.dataset\.interpretUrl/, 'tests can point the chat at a stub endpoint');
  assert.match(appCode, /concierge\.dataset\.polishUrl/);
  assert.match(appCode, /LIVE_SITE\.test\(location\.hostname\) \? live : ""/, 'only the live site calls the endpoints by default');
  assert.match(appCode, /conversation\.respond\(text, directives\)/, 'reload replays what the assistant actually read');
});

test('Live open times: the endpoint is optional, and real times are said word for word', async () => {
  assert.equal(OPEN_TIMES_URL, 'https://wichita-messenger-bot-deploy.vercel.app/api/open-times');
  const slots = slotsFromIcs('BEGIN:VCALENDAR\nEND:VCALENDAR', Date.now());
  assert.deepEqual(await openTimes('https://bot.test/api/open-times', reply({ slots })), slots);
  for (const bad of [reply({ slots: null }), reply({ slots: 'x' }), reply({ slots }, false), async () => { throw new TypeError('offline'); }]) {
    assert.equal(await openTimes('https://bot.test/api/open-times', bad), null);
  }
  assert.equal(await openTimes('', reply({ slots })), null);
  const chat = createWebsiteConversation();
  chat.start();
  const result = chat.respond('when is your next opening?', undefined, slots);
  assert.match(result.bubbles.join(' '), /soonest open times are \w+day, \w+ \d+ at/);
  assert.ok(result.bubbles.includes(bookingUrl));
  assert.equal(result.slots, true);
  assert.equal(polishRequest('when is your next opening?', result, 'en'), null, 'exact times are never reworded');
  assert.ok(polishRequest('cuando tienen citas?', result, 'es'), 'but they are translated');
  const plain = createWebsiteConversation();
  plain.start();
  assert.doesNotMatch(plain.respond('when is your next opening?').bubbles.join(' '), /soonest open times/, 'without times: as before');
});
