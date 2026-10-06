import { bookingUrl, messengerUrl, smsUrl, createConversation } from './front-desk.js';

// The website cannot deliver messages to the company or modify appointments.
export function forWebsite(result) {
  if (!result || !Array.isArray(result.bubbles) || !result.bubbles.length || !result.bubbles.every(text => typeof text === 'string' && text.trim().length > 0)) {
    throw new Error('Invalid assistant response');
  }
  const handoff = Boolean(result.phone || result.messenger) || result.bubbles.some(text => /^I do not have a verified catalog price/.test(text));
  const furniture = result.bubbles.some(text => /^Furniture cleaning, plus applicable tax:|^The Complete Seating Package/.test(text));
  const bubbles = result.bubbles
    .filter(text => !handoff || !/about how many rooms should we count|click this link|current to the minute|^https:\/\/book\./i.test(text))
    .map(text => text
      .replace(furniture ? /^.*about how many rooms should we count.*$/i : /$^/, 'For furniture, choose the Furniture Cleaning category in the booking catalog. Contact the company if you need help selecting the scope.')
      .replace(/keep talking here in Messenger/gi, 'open Messenger to contact the company')
      .replace(/here in Messenger/gi, 'in Messenger using the link below')
      .replace(/message us here/gi, 'contact the company in Messenger using the link below')
      .replace(/I[’']ll look at it myself\./gi, 'The company will need to review your request.')
    );
  if (handoff) bubbles.push('This website chat cannot send your request, receive photos, or change a booking. Text (316) 232-8111 or open Messenger to contact the company.');
  else if (furniture && !bubbles.includes(bookingUrl)) bubbles.push(bookingUrl);
  return { ...result, bubbles, handoff, sendLink: handoff ? false : furniture || result.sendLink, booking: handoff ? false : result.booking };
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

export function createWebsiteConversation() {
  // The front-desk brain already speaks for the website (channel "site"): it never claims it
  // notified anyone, and its handoffs point to the text line and Messenger.
  const conversation = createConversation({ channel: 'site' });
  return {
    start: () => forWebsite(conversation.start()),
    respond: input => forWebsite(conversation.respond(input)),
  };
}
