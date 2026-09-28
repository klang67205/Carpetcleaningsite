import { bookingUrl, messengerUrl, createConversation } from './conversation.js';

// The website cannot deliver messages to the company or modify appointments.
export function forWebsite(result) {
  if (!result || !Array.isArray(result.bubbles) || !result.bubbles.length || !result.bubbles.every(text => typeof text === 'string' && text.trim().length > 0)) {
    throw new Error('Invalid assistant response');
  }
  const handoff = Boolean(result.phone || result.messenger) || result.bubbles.some(text => /^I do not have a verified catalog price|not currently listed in the online booking menu|scope before confirming that small-package total/.test(text));
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
  if (handoff) bubbles.push('This website chat cannot send your request, receive photos, or change a booking. Open Messenger to contact the company.');
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

export { bookingUrl, messengerUrl };

export function createWebsiteConversation() {
  const conversation = createConversation({ channel: 'site' });
  let support = false;
  return {
    start: () => forWebsite(conversation.start()),
    respond: input => {
      const needsPerson = /\b(?:complaint|refund)\b|\b(?:want|need|speak to|talk to) (?:a |an |the )?(?:human|person|manager|owner)\b/i.test(input);
      if (needsPerson) {
        support = true;
        return forWebsite({ bubbles: ['A person needs to handle this request. Contact the company directly in Messenger.'], phone: true });
      }
      const spoken = String(input).toLowerCase().replace(/(\d),(?=\d{3}\b)/g, '$1');
      const footage = spoken.match(/\b(\d+(?:\.\d+)?)\s*(?:square (?:feet|foot)|sq\.?\s*ft\.?|sqft|sf)\b/);
      const size = footage ? Number(footage[1]) : null;
      const bathroom = spoken.match(/\b(\d+|one|two|three|four|five|six)\s+bathrooms?\b/);
      const counts = {one: 1, two: 2, three: 3, four: 4, five: 5, six: 6};
      const bathrooms = bathroom ? counts[bathroom[1]] ?? Number(bathroom[1]) : null;
      const tile = /\b(?:tile|grout)\b/.test(spoken);
      const hard = /\bhard[ -]?(?:wood|floors?)\b|\bwood floors?\b/.test(spoken);
      const whole = /\bwhole|\bfull[ -]?floor/.test(spoken);
      const kitchen = /\bkitchen\b/.test(spoken);
      const bath = /\bbathrooms?\b/.test(spoken);
      const cap = tile ? whole || bath && kitchen ? 400 : bath ? 100 : kitchen ? 150 : 400 : 600;
      const outsideFloorScope = (tile || hard) && (size !== null && (size <= 0 || size > cap) || tile && bath && !whole && !kitchen && bathrooms > 2 || /\b(?:natural stone|marble|unsealed|sanding|refinish)/.test(spoken));
      if (outsideFloorScope && /\b(?:price|pricing|cost|how much|quote|package)\b/.test(spoken)) {
        support = true;
        return forWebsite({ bubbles: ['The floor area, bathroom count, or surface you described is outside the standard package scope and needs individual review before a price can be confirmed.'], phone: true });
      }
      const existingSupport = /\breceipt\b|where.{0,20}invoice|i (?:already )?(?:texted|messaged)|missed my message|sent (?:a |you a )?(?:housecall|message)|can i (?:send|upload).{0,15}photos?/i.test(input);
      const newSales = /\b(?:new|another) (?:booking|cleaning|appointment)|\b(?:service area|hours|book a cleaning)\b/i.test(input)
        || /\b(?:price|cost|how much)\b/i.test(input) && /\b(?:cleaning|carpet|pet|sofas?|couches?|love\s?seats?|chairs?|recliners?|sectionals?|furniture|tile|grout|floor)\b/i.test(input);
      if (existingSupport || support && !newSales) {
        support = true;
        return forWebsite({ bubbles: ['For an existing visit, receipt, or follow-up, contact the company directly in Messenger. Do not enter appointment details or access codes in this website chat.'], phone: true });
      }
      const result = forWebsite(conversation.respond(input));
      support = result.handoff;
      return result;
    },
  };
}
