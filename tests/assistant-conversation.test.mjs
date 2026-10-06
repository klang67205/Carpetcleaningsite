import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createConversation, bookingUrl } from '../assets/front-desk.js';
import { requestReply, createWebsiteConversation } from '../assets/site-response.js';
const text = result => result.bubbles.join(' ');

// Owner scorecard (same cases the Messenger bot must pass). Messenger-only call requests are skipped here.
const C = [
 ["interested", ["Interested"], {has:["How many rooms"], not:["Keith"]}],
 ["learn more (old ad button)", ["I'd like to learn more"], {has:["How many rooms"], not:["passing"]}],
 ["yes alone", ["Yes"], {has:["How many rooms"]}],
 ["3br+hall = $99", ["How much would it be for three bedrooms and a hallway"], {has:["$99"], not:["$75 plus"], link:true}],
 ["add front room", ["How much would it be for three bedrooms and a hallway","And front room"], {has:["4 rooms","$99"], not:["$114"], link:true}],
 ["Tonya flow pet", ["How much would it be for three bedrooms and a hallway","And front room","Pet"], {has:["$149"], link:true}],
 ["when can you clean", ["when can you clean"], {link:true, not:["Commercial"]}],
 ["QR how much", ["How much for mine?"], {has:["$99","How many rooms"]}],
 ["QR how much then 4+hall", ["How much for mine?","4 rooms and a hallway"], {has:["$99"], link:true}],
 ["QR included", ["What's included?"], {has:["5 rooms","$149","$15"]}],
 ["QR how do I book", ["How do I book?"], {link:true}],
 ["I have pets", ["I have pets"], {has:["$149","$85"], not:["Keith"]}],
 ["pets then rooms", ["I have pets","3 bedrooms and living room, dog pee spots"], {has:["$149"], link:true}],
 ["see open times", ["See open times"], {link:true}],
 ["dog 3br saturday", ["hi i have 3 bedrooms and a dog, can you come saturday and whats the price"], {has:["$75","Keith"]}],
 ["speak to someone", ["I'm ready I would just like to speak to someone"], {}],
 ["phone number", ["do u have a phone number"], {has:["232-8111"]}],
 ["steam", ["Do you steam clean"], {has:["low-moisture","BrushPro"]}],
 ["wellington", ["Do you come to Wellington?"], {has:["outside"]}],
 ["goddard", ["Do you service Goddard?"], {has:["Yes","Goddard"]}],
 ["6br 2h stairs", ["I have 6 bedrooms, 2 hallways and stairs, how much"], {has:["$99 + $15, plus tax"], link:true}],
 ["2 bedrooms", ["Just need 2 bedrooms done. price?"], {has:["$75"], link:true}],
 ["weekends?", ["Do you do weekends"], {has:["weekdays"]}],
 ["repeat customer", ["Hi! Just checking if you have availability to clean my carpets again","You have cleaned my house before and it was $170"], {not:["prep","vacuum"]}],
 ["couch", ["How much to clean a couch too?"], {has:["sofa $89"]}],
 ["move out 3br", ["Moving out next week need carpets done for deposit, 3 bedrooms"], {has:["move-out","$75"], link:true}],
 ["dry", ["how long until dry"], {has:["1.5"]}],
 ["base", ["I live on McConnell base housing"], {has:["on-base"]}],
 ["4 rooms then book", ["4 rooms","ok sounds good how do I book"], {link:true}],
 ["tomorrow", ["Can you come tomorrow?"], {link:true}],
 ["what does 99 include", ["what does the 99 include"], {has:["5 rooms","two halls"]}],
 ["urine guarantee", ["will it get the cat urine smell out for sure?"], {has:["enzyme"]}],
 ["thanks after quote", ["4 rooms no pets","thanks!"], {has:["welcome"]}],
 ["no pets quote", ["5 rooms 2 halls no pets"], {has:["$99"], not:["pet-treatment version"], link:true}],
 ["whole house", ["how much for my whole house"], {has:["$99"]}],
 ["8 rooms", ["8 rooms"], {has:["$99 + $45, plus tax"], link:true}],
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
 ["park city price", ["I'm in Park City, how much for 4 rooms and a hall"], {has:["$99"], link:true}],
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

test('Website chat never claims it notified Keith', () => {
  for (const input of ['I need to talk to a real person', 'you guys came yesterday and it is still dirty, I want a refund', 'I need to reschedule my appointment', 'do you do commercial office building carpet', 'Can I book Saturday?', 'You cleaned my house last time and it was $170']) {
    const result = createWebsiteConversation().respond(input);
    assert.doesNotMatch(text(result), /I've sent|I’ve sent|passing (?:this|your|it)|flagged this/i, input);
    assert.match(text(result), /232-8111|Messenger|Facebook/, input);
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

test('Website chat offers booking once the customer has a price', () => {
  const result = createWebsiteConversation().respond('4 bedrooms and a hallway, how much?');
  assert.equal(result.handoff, false);
  assert.ok(result.bubbles.includes(bookingUrl));
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
