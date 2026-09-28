import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createConversation } from '../assets/conversation.js';
import { forWebsite, requestReply, bookingUrl, createWebsiteConversation } from '../assets/site-response.js';
const answer = input => forWebsite(createConversation({ channel: 'site' }).respond(input));
const text = result => result.bubbles.join(' ');
for (const [input, expected] of [
  ['How much for an extra hallway?', /hallway.*\$15/],
  ['How much for an additional staircase?', /staircase.*\$15/],
  ['I have 5 rooms and 3 halls how much?', /\$114 plus tax/],
  ['I have 6 rooms, 4 hallways and 2 staircases how much?', /\$159 plus tax/],
  ['I have 6 rooms, 4 hallways and 2 staircases with pet treatment how much?', /\$209 plus tax/],
  ['How much for bathroom tile?', /100 square feet.*two standard bathrooms/],
  ['How much for kitchen grout?', /150 square feet/],
  ['How much for whole floor tile?', /400 square feet/],
  ['How much for 700 square feet of hard floor?', /outside.*scope.*individual review/],
  ['How much for hardwood cleaning?', /\$79.*150.*\$139.*300.*\$239.*600/],
]) test(`Aligned pricing: ${input}`, () => assert.match(text(createWebsiteConversation().respond(input)), expected));

for (const input of ['I have a complaint. How much for bathroom tile?', 'I want a human. How much for bathroom tile?', 'How much for 3 bathrooms, 90 square feet of tile?', 'How much for 700 square feet of hard floor?', 'How much for 1,000 square feet of tile?', 'How much for marble tile?']) {
  test(`Pricing never overrides review: ${input}`, () => {
    const result = createWebsiteConversation().respond(input);
    assert.equal(result.handoff, true);
    assert.equal(result.sendLink, false);
    assert.equal(result.booking, false);
    assert.ok(!result.bubbles.includes(bookingUrl));
    assert.doesNotMatch(text(result), /how many rooms|\$75|\$99|\$149/);
  });
}

test('Small pet package is $85 and cannot send customers to a missing booking option', () => {
  const result = createWebsiteConversation().respond('I have 2 rooms with pet stains how much?');
  assert.match(text(result), /\$85 plus tax/);
  assert.equal(result.handoff, true);
  assert.equal(result.sendLink, false);
  assert.ok(!result.bubbles.includes(bookingUrl));
});

test('Small packages do not promise free halls and stairs', () => {
  const result = createWebsiteConversation().respond('How much for 3 rooms and 2 hallways?');
  assert.match(text(result), /scope before confirming/);
  assert.equal(result.handoff, true);
});
for (const [input, expected] of [
  ['What does $99 include?', /\$99.*five rooms, two halls, and one stair/i],
  ['I have 7 rooms how much?', /\$129/],
  ['How much is pet treatment?', /\$149/],
  ['What does a sofa cost?', /\$89/],
  ['How much is a recliner?', /\$39/],
  ['Price for a large sectional?', /\$169/],
  ['How much is bathroom tile cleaning?', /\$99/],
  ['What does kitchen grout cleaning cost?', /\$129/],
  ['Price for 300 square feet of hard floor?', /\$139/],
  ['do you take checks?', /don.t currently accept checks/i],
  ['do you offer a teacher discount?', /15 percent/i],
  ['what payment do you accept?', /major cards.*cash/i],
  ['can you come today?', /don.t do same.day/i],
  ['are you open Saturday?', /don.t run Saturday or Sunday/i],
]) test(input, () => assert.match(text(answer(input)), expected));
for (const input of ['Do you serve Newton?', 'Do you clean on base?', 'Do you serve McConnell AFB?']) {
  test(`No booking for excluded area: ${input}`, () => {
    const result = answer(input);
    assert.equal(result.booking, false);
    assert.ok(!result.bubbles.includes(bookingUrl));
  });
}
for (const input of ['I need a human', 'cancel my appointment', 'I need a quote for my office', 'Do you offer refunds?', 'You damaged my carpet', 'is it safe for allergies?']) {
  test(`Real handoff: ${input}`, () => {
    const result = answer(input);
    assert.equal(result.handoff, true);
    assert.equal(result.booking, false);
    assert.match(text(result), /cannot send your request/);
    assert.doesNotMatch(text(result), /here in Messenger|message us here|I.ll look at it myself|about how many rooms should we count/);
  });
}
test('Room-count context survives multiple turns', () => {
  const chat = createConversation({ channel: 'site' });
  chat.respond('How much is standard cleaning?');
  assert.match(text(forWebsite(chat.respond('what about 8 rooms?'))), /\$144/);
});
test('Price and pet scope stay intact during handoff', () => {
  const result = forWebsite({ bubbles: ['$149 plus tax.', 'Send a photo here in Messenger.', bookingUrl], phone: true, booking: true });
  assert.match(text(result), /\$149 plus tax/);
  assert.ok(!result.bubbles.includes(bookingUrl));
});
test('Empty and malformed remote replies fail visibly', () => {
  for (const result of [null, {}, { bubbles: [] }, { bubbles: [''] }, { bubbles: ['   '] }, { bubbles: [null] }, { bubbles: 'wrong' }]) assert.throws(() => forWebsite(result));
});

for (const [input, expected] of [
  ['How much for a sofa and loveseat?', [/sofa.*loveseat/i, /\$149/]],
  ['How much for a sofa and recliner?', [/sofa: \$89/i, /recliner.*\$39/i, /not a confirmed combined total/i]],
  ['How much for a loveseat and recliner?', [/loveseat: \$79/i, /recliner.*\$39/i]],
  ['How much for a sofa, loveseat and recliner?', [/\$179/, /sofa.*loveseat.*chair or recliner/i]],
  ['How much for a small sectional and sofa?', [/sofa: \$89/i, /sectional.*\$119/i]],
  ['How much for complete seating?', [/\$179/, /one standard sofa, one loveseat, and one chair or recliner/i]],
  ['How much for an accent chair?', [/\$39/, /accent chair/i]],
  ['How much for a dining chair?', [/\$19/, /dining chair/i]],
  ['How much for a sofa and two love seats?', [/sofa: \$89/, /loveseat: \$79/, /not a confirmed combined total/]],
  ['How much for a sofa, loveseat, recliner and dining chair?', [/sofa.*loveseat.*\$149/, /recliner.*\$39/, /dining chair: \$19/, /not a confirmed combined total/]],
  ['How much for 2 accent chairs?', [/accent chair: \$39/, /not a confirmed combined total/]],
  ['How much for two recliners?', [/recliner.*\$39/, /not a confirmed combined total/]],
  ['How much for two loveseats?', [/loveseat: \$79/, /not a confirmed combined total/]],
  ['How much for a small sectional and six dining chairs?', [/small sectional.*\$119/, /dining chair: \$19/]],
  ['How much for a small sectional and large sofa?', [/small sectional.*\$119/, /sofa: \$89/]],
  ['How much for a sofa and loveseats?', [/sofa: \$89/, /loveseat: \$79/, /not a confirmed combined total/]],
  ['How much for complete seating and an extra sofa?', [/Complete Seating Package.*\$179/, /sofa: \$89/, /not a confirmed combined total/]],
]) test(`Complete furniture scope: ${input}`, () => {
  const result = createWebsiteConversation().respond(input);
  for (const pattern of expected) assert.match(text(result), pattern);
  assert.doesNotMatch(text(result), /about how many rooms should we count/);
  assert.equal(result.sendLink, true);
  assert.ok(result.bubbles.includes(bookingUrl));
});
test('Unrelated furniture sizes cannot upgrade a small sectional', () => {
  for (const input of ['How much for a small sectional and six dining chairs?', 'How much for a small sectional and large sofa?']) {
    assert.doesNotMatch(text(createWebsiteConversation().respond(input)), /\$169|large sectional/);
  }
});
test('Excluded furniture is not added to a package', () => {
  const reply = text(createWebsiteConversation().respond('How much for a sofa and loveseat, no recliner?'));
  assert.match(reply, /\$149/);
  assert.doesNotMatch(reply, /\$179|one chair or recliner/);
});
test('Unpriced furniture is acknowledged and referred without a partial-package quote', () => {
  const result = createWebsiteConversation().respond('How much for a sofa, loveseat and ottoman?');
  assert.match(text(result), /ottoman/);
  assert.match(text(result), /cannot send your request/);
  assert.doesNotMatch(text(result), /\$149|about how many rooms/);
  assert.equal(result.handoff, true);
  assert.equal(result.sendLink, false);
  assert.ok(!result.bubbles.includes(bookingUrl));
});
for (const first of ['I need a human', 'You damaged my carpet', 'where is my receipt?', 'I texted you', 'cancel my appointment']) {
  test(`Support context is not a sales intake: ${first}`, () => {
    const chat = createWebsiteConversation();
    assert.equal(chat.respond(first).handoff, true);
    for (const followup of ['What does that mean?', 'Can I send photos here?', 'My appointment is tomorrow', 'I still need help']) {
      const result = chat.respond(followup);
      assert.equal(result.handoff, true);
      assert.match(text(result), /cannot send your request/);
      assert.doesNotMatch(text(result), /what do you need cleaned|about how many rooms|you.re booked/i);
    }
    assert.match(text(chat.respond('How much is standard cleaning?')), /\$99/);
  });
}
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
