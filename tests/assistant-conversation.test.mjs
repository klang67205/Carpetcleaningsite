import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createConversation, bookingUrl } from '../assets/front-desk.js';
import { requestReply, createWebsiteConversation } from '../assets/site-response.js';
const text = result => result.bubbles.join(' ');

// Owner scorecard (same cases the Messenger bot must pass). Messenger-only call requests are skipped here.
const C = [
 ["interested", ["Interested"], {has:["How many rooms"], not:["The owner"]}],
 ["learn more (old ad button)", ["I'd like to learn more"], {has:["How many rooms"], not:["passing"]}],
 ["yes alone", ["Yes"], {has:["How many rooms"]}],
 ["3br+hall = $99", ["How much would it be for three bedrooms and a hallway"], {has:["send the booking link","$99"], not:["$75 plus"], link:false}],
 ["add front room", ["How much would it be for three bedrooms and a hallway","And front room"], {has:["send the booking link","4 rooms","$99"], not:["$114"], link:false}],
 ["Tonya flow pet", ["How much would it be for three bedrooms and a hallway","And front room","Pet"], {has:["send the booking link","$149"], link:false}],
 ["when can you clean", ["when can you clean"], {link:true, not:["Commercial"]}],
 ["QR how much", ["How much for mine?"], {has:["$99","How many rooms"]}],
 ["QR how much then 4+hall", ["How much for mine?","4 rooms and a hallway"], {has:["send the booking link","$99"], link:false}],
 ["QR included", ["What's included?"], {has:["5 rooms","$149","$15"]}],
 ["QR how do I book", ["How do I book?"], {link:true}],
 ["I have pets", ["I have pets"], {has:["$149","$85"], not:["The owner"]}],
 ["pets then rooms", ["I have pets","3 bedrooms and living room, dog pee spots"], {has:["send the booking link","$149"], link:false}],
 ["see open times", ["See open times"], {link:true}],
 ["dog 3br saturday", ["hi i have 3 bedrooms and a dog, can you come saturday and whats the price"], {has:["$75","weekdays only (Monday–Friday) — we're closed Saturday and Sunday"], not:["The owner"], link:true}],
 ["speak to someone", ["I'm ready I would just like to speak to someone"], {}],
 ["phone number", ["do u have a phone number"], {has:["232-8111"]}],
 ["steam", ["Do you steam clean"], {has:["low-moisture","BrushPro"]}],
 ["wellington", ["Do you come to Wellington?"], {has:["outside"]}],
 ["goddard", ["Do you service Goddard?"], {has:["Yes","Goddard"]}],
 ["6br 2h stairs", ["I have 6 bedrooms, 2 hallways and stairs, how much"], {has:["send the booking link","$99 + $15, plus tax"], link:false}],
 ["2 bedrooms", ["Just need 2 bedrooms done. price?"], {has:["send the booking link","$75"], link:false}],
 ["weekends?", ["Do you do weekends"], {has:["weekdays only (Monday–Friday) — we're closed Saturday and Sunday"], not:["The owner","232-8111"]}],
 ["repeat customer", ["Hi! Just checking if you have availability to clean my carpets again","You have cleaned my house before and it was $170"], {not:["prep","vacuum"]}],
 ["couch", ["How much to clean a couch too?"], {has:["sofa is $89"]}],
 ["move out 3br", ["Moving out next week need carpets done for deposit, 3 bedrooms"], {has:["send the booking link","move-out","$75"], link:false}],
 ["dry", ["how long until dry"], {has:["1.5"]}],
 ["base", ["I live on McConnell base housing"], {has:["on-base"]}],
 ["4 rooms then book", ["4 rooms","ok sounds good how do I book"], {link:true}],
 ["tomorrow", ["Can you come tomorrow?"], {link:true}],
 ["what does 99 include", ["what does the 99 include"], {has:["5 rooms","two halls"]}],
 ["urine guarantee", ["will it get the cat urine smell out for sure?"], {has:["enzyme"]}],
 ["thanks after quote", ["4 rooms no pets","thanks!"], {has:["welcome"]}],
 ["no pets quote", ["5 rooms 2 halls no pets"], {has:["send the booking link","$99"], not:["pet-treatment version"], link:false}],
 ["whole house", ["how much for my whole house"], {has:["$99"]}],
 ["8 rooms", ["8 rooms"], {has:["send the booking link","$99 + $45, plus tax"], link:false}],
 ["1 room", ["just one room"], {has:["$75"]}],
 ["1 room pet", ["one bedroom the cat peed"], {has:["$85"]}],
 ["3 rooms + stairs pets", ["3 bedrooms and stairs, we have dogs"], {has:["$149"]}],
 ["complaint", ["you guys came yesterday and the stain is still there, not happy"], {}],
 ["reschedule", ["I need to reschedule my appointment"], {}],
 ["commercial", ["do you do commercial office building carpet"], {}],
 ["tile", ["how much for tile and grout in kitchen"], {has:["$129"]}],
 ["hardwood", ["do you do hardwood floors"], {has:["$79"]}],
 ["rug", ["can you clean an area rug"], {has:["rug"]}],
 ["mattress", ["do you clean mattresses"], {has:["do not offer mattress"]}],
 ["payment", ["do you take card?"], {has:["card"]}],
 ["military", ["any military discount?"], {has:["15%"]}],
 ["move furniture", ["do you move furniture?"], {has:["couches"]}],
 ["hello", ["Hello"], {has:["What would you like cleaned"]}],
 ["park city price", ["I'm in Park City, how much for 4 rooms and a hall"], {has:["send the booking link","$99"], link:false}],
 ["kids pets safe", ["is it safe for my kids and pets"], {has:["product","dry"], not:["safe for"]}],
 ["today", ["can you come today?"], {has:["same-day"]}],
 ["call me", ["can you call me 316-555-1212"], {call:true}],
 ["quote then yes", ["4 rooms","yes"], {link:true}],
 ["stairs only add", ["4 rooms","and stairs"], {has:["4 rooms and a staircase","$99"]}],
 ["two hallways phrase", ["3 bedrooms, living room, 2 hallways"], {has:["$99"]}],
 ["price?", ["Price?"], {has:["$99","How many rooms"]}],
 ["what time slots", ["what times do you have open next week"], {link:true}],
 ["newton", ["do you go to newton"], {has:["outside"]}],
];
for (const [name, msgs, chk] of C) {
  if (chk.call) continue;
  test(`Scorecard: ${name}`, () => {
    const chat = createConversation({ channel: 'messenger' });
    let r; for (const m of msgs) r = chat.incoming({ text: m });
    for (const h of chk.has || []) assert.ok(text(r).includes(h), `missing ${h}: ${text(r)}`);
    for (const h of chk.not || []) assert.ok(!text(r).includes(h), `has ${h}: ${text(r)}`);
    if (chk.link) assert.ok(r.bubbles.includes(bookingUrl), 'no booking link');
  });
}

test('Website chat never claims it notified the owner', () => {
  for (const input of ['I need to talk to a real person', 'you guys came yesterday and it is still dirty, I want a refund', 'I need to reschedule my appointment', 'do you do commercial office building carpet', 'You cleaned my house last time and it was $170']) {
    const result = createWebsiteConversation().respond(input);
    assert.doesNotMatch(text(result), /I've sent|I’ve sent|passing (?:this|your|it)|flagged this/i, input);
    assert.match(text(result), /232-8111|Messenger|Facebook/, input);
  }
});

test('Weekend requests are a firm no: weekdays-only line and the weekday booking link, never the owner', () => {
  for (const input of ['Can I book Saturday?', 'Can you come this Saturday?', 'can you ask keith if he can do sunday?']) {
    const result = createWebsiteConversation().respond(input);
    assert.ok(text(result).includes("weekdays only (Monday–Friday) — we're closed Saturday and Sunday"), input);
    assert.ok(result.bubbles.includes(bookingUrl), `${input}: weekday booking link`);
    assert.doesNotMatch(text(result), /the owner|232-8111|I've sent|I’ve sent|passing (?:this|your|it)/i, input);
    assert.equal(Boolean(result.phone), false, `${input}: not a handoff`);
  }
});

test('Website prices match the owner price list', () => {
  const say = input => text(createWebsiteConversation().respond(input));
  assert.match(say('How much for 3 bedrooms and a hallway?'), /\$99/);
  assert.match(say('just 2 rooms'), /\$75/);
  assert.match(say('2 rooms with dog pee'), /\$85/);
  assert.match(say('8 rooms'), /\$99 \+ \$45, plus tax/);
  assert.match(say('whole house with pets'), /\$149/);
  assert.match(say('How much for an accent chair?'), /\$39/);
});

test('Website chat offers booking once the customer has a price, and sends it when they say yes', () => {
  const chat = createWebsiteConversation();
  const result = chat.respond('4 bedrooms and a hallway, how much?');
  assert.equal(result.handoff, false);
  assert.ok(!result.bubbles.includes(bookingUrl), 'the price alone does not push the link');
  assert.match(result.bubbles.join(' '), /send the booking link/);
  assert.ok(chat.respond('yes please').bubbles.includes(bookingUrl));
});

test('Network request has a timeout and validated response', async () => {
  await requestReply('https://example.test', 'test', 'hello', false, async (url, options) => {
    assert.equal(url, 'https://example.test/preview/message');
    assert.ok(options.signal instanceof AbortSignal);
    assert.equal(JSON.parse(options.body).text, 'hello');
    return { ok: true, json: async () => ({ result: { bubbles: ['Hello'] } }) };
  });
});
test('HTTP errors, malformed payloads, network errors and timeouts reject', async () => {
  for (const fetcher of [
    async () => ({ ok: false }),
    async () => ({ ok: true, json: async () => ({}) }),
    async () => { throw new Error('offline'); },
    async () => { throw new DOMException('timed out', 'TimeoutError'); },
  ]) await assert.rejects(() => requestReply('https://example.test', 'test', '', false, fetcher));
});

// Website chat UI safeguards (assets/app.js, index.html, reliability.css).
import { readFileSync } from 'node:fs';
import { mentionsContact, replyEntries } from '../assets/site-response.js';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const homepage = read('index.html');
const appCode = read('assets/app.js');
const chatCss = read('assets/reliability.css');

test('Every suggested prompt gets a sensible website reply', () => {
  const prompts = [...homepage.matchAll(/data-prompt="([^"]+)"/g)].map(match => match[1]);
  assert.ok(prompts.length >= 4);
  assert.ok(prompts.includes('I need to change my appointment'), 'Change my appointment must ask about an existing appointment');
  for (const prompt of prompts) createWebsiteConversation().respond(prompt);
  const change = createWebsiteConversation().respond('I need to change my appointment');
  assert.equal(change.handoff, true);
  assert.ok(!change.bubbles.includes(bookingUrl), 'Existing-appointment changes must not get a new-booking link');
  assert.match(text(change), /232-8111/);
});

test('Replies that send visitors to text or Messenger carry the contact buttons once', () => {
  assert.equal(mentionsContact(['Text (316) 232-8111 anytime']), true);
  assert.equal(mentionsContact(['Open Messenger to reach us']), true);
  assert.equal(mentionsContact(['$99 plus tax']), false);
  assert.equal(createWebsiteConversation().respond('do u have a phone number').contact, true);
  assert.equal(createWebsiteConversation().respond('4 bedrooms and a hallway, how much?').contact, false);
  assert.equal(createWebsiteConversation().respond('I need to talk to a real person').contact, true);
  for (const q of ['do u have a phone number', 'I need to talk to a real person', '3 rooms, can I text you']) {
    const entries = replyEntries(createWebsiteConversation().respond(q));
    assert.equal(entries.filter(entry => entry[0] === 'a').length, 1, `${q}: one set of contact buttons`);
  }
  // a weekend request is answered here (weekdays only) with the booking button, not sent to text/Messenger
  const weekend = replyEntries(createWebsiteConversation().respond('Can you come this Saturday?'));
  assert.equal(weekend.filter(entry => entry[0] === 'a').length, 0, 'weekend: no contact buttons');
  assert.equal(weekend.filter(entry => entry[0] === 'b').length, 1, 'weekend: one booking button');
  assert.equal(replyEntries(createWebsiteConversation().respond('4 bedrooms and a hallway, how much?')).filter(entry => entry[0] === 'a').length, 0);
  assert.match(appCode, /play\(replyEntries\(result\), entry\)/, 'Replies are laid out by replyEntries');
});

test('Each chat button sits next to the text it belongs to', () => {
  const contact = '(316) 232-8111';
  const layout = replyEntries({ bubbles: ['You can text us anytime at ' + contact + '.', 'For 3 rooms it is $75 plus tax.', 'Here are the open times:', bookingUrl], contact: true });
  assert.deepEqual(layout.map(entry => entry[0]), ['g', 'a', 'g', 'g', 'b'], 'Text/Messenger right after the texting bubble, booking where its link was');
  assert.deepEqual(layout[1][1].map(link => link[0]), ['Text the company', 'Open Messenger']);
  const live = replyEntries(createWebsiteConversation().respond('3 rooms, can I text you? when are you available'));
  const kinds = live.map(entry => entry[0]);
  assert.equal(kinds.at(-1), 'b', 'Booking button stays at the end, where the link was');
  assert.match(live[kinds.indexOf('a') - 1][1], /232-8111|Messenger/i, 'Contact buttons follow the bubble that mentions texting');
  assert.deepEqual(replyEntries({ bubbles: ['Weekdays only.'], handoff: true }).map(entry => entry[0]), ['g', 'a'], 'No mention: buttons go at the end');
  assert.deepEqual(replyEntries({ bubbles: ['$99 plus tax', bookingUrl] }).map(entry => entry[0]), ['g', 'b']);
});

test('Chat survives a reload and the phone Back button', () => {
  assert.match(appCode, /const entry = \["v", q, 1\]/, 'Visitor messages are saved as waiting until answered');
  assert.match(appCode, /for \(const entry of unanswered\.splice\(0\)\) answer\(entry\)/, 'Messages left unanswered by a reload are answered once, in order, on reopen');
  assert.match(appCode, /if \(saved && saved\.o\) open\(\)/, 'An open chat reopens after a reload in the same tab');
  assert.match(appCode, /history\.pushState\(\{ \.\.\.state, wccsChat: true \}/, 'Phone sheet adds a history step');
  assert.match(appCode, /addEventListener\("popstate"/, 'Back closes the chat');
  assert.match(appCode, /hadStep && onChatStep\(\)\) history\.back\(\)/, 'Closing with × removes the history step');
  assert.match(appCode, /\(max-width: 480px\), \(max-width: 850px\) and \(max-height: 560px\)/);
  assert.match(chatCss, /\(max-width: 480px\), \(max-width: 850px\) and \(max-height: 560px\)/, 'JS and CSS agree on the phone sheet');
});

test('Chat UI keeps working while the assistant is typing', () => {
  assert.doesNotMatch(appCode, /\.disabled = value/, 'Send and prompt buttons must stay usable while a reply plays');
  assert.match(appCode, /const enqueue = /, 'Messages typed during a reply must be queued');
  assert.match(appCode, /DOUBLE_TAP_MS/, 'A double tap must not send twice');
  assert.match(appCode, /sessionStorage\.setItem/, 'The conversation should survive a reload in the same tab');
  assert.match(appCode, /\(hover: hover\) and \(pointer: fine\)/, 'Only desktop pointers auto-focus the chat input');
});

test('Chat links open safely and buttons are easy to tap', () => {
  assert.doesNotMatch(appCode, /break-all/, 'Booking link must not break mid-word');
  assert.match(appCode, /link\.target = "_blank";\s*link\.rel = "noopener";/);
  assert.match(homepage, /class="concierge-panel"[^>]*role="dialog"[^>]*aria-label="[^"]+"/);
  assert.match(homepage, /<a href="https:\/\/m\.me\/wichitacarpetcleaningservices" target="_blank" rel="noopener">/);
  assert.match(chatCss, /\.concierge-prompts button \{ min-height: 44px;/);
  assert.match(chatCss, /\.concierge-notice a \{[^}]*line-height: 44px;/);
  assert.match(chatCss, /\.concierge-book \{[^}]*min-height: 48px;/);
  assert.match(chatCss, /\.concierge-message \{ overflow-wrap: anywhere; \}/);
  assert.match(chatCss, /\.concierge-chatted \.concierge-prompts \{ display: none; \}/);
  assert.match(chatCss, /@media \(max-width: 480px\), \(max-height: 700px\) \{\s*\.concierge-chatted \.concierge-prompts \{ display: none; \}/, 'Prompt buttons step aside after the first message on every phone');
  assert.match(chatCss, /@media \(min-width: 851px\) \{\s*\.concierge-panel \{ max-height: max\(320px, calc\(100dvh - 190px\)\); \}/, 'Desktop chat stays below the header Book now button');
});
