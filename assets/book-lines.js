/** Shared speech. One book, many callers. */

export const bookingUrl =
  "https://book.housecallpro.com/book/Wichita-Carpet-Cleaning-Services/36104bbb2c7d409a8293445c570b5f8b?v2=true";

export const CLOSE_OFFER =
  "As soon as you get your closing date and know when it’s free to clean, click this link and find that availability — you can get it reserved right there. Typically if it’s a few days ahead of time we have availabilities ready to go.";

export const HOLD_OFFER =
  "As soon as you know the day you want, click this link and find that availability — you can get it reserved right there. Typically if it’s a few days ahead of time we have availabilities ready to go.";

export const MOVE_LINE =
  "We do move smaller items like couches and love seats, clean underneath them, and then return them to the original location. However, we do not move larger furniture items like entertainment centers, sectionals, beds, dressers, etc. If you would like to move those items prior to our arrival, then we’d gladly clean under them.";

export const PAY_LINE =
  "We would love to make payment easy. After the job is completed we can send a link. The link provides an invoice and accepts all major cards. If you choose to pay with cash we can accept that at the same time as the service.";

export const CHECK_NO = "That’s the list — we don’t currently accept checks.";

/** Payment checks only — never “check the ZIP / schedule / availability”. */
export function asksAboutChecks(spoken) {
  const s = String(spoken || "").toLowerCase();
  if (!/\bche(?:ck|que)s?\b/.test(s)) return false;
  if (
    /\bcheck(?:ing)? (?:the |our |your )?(?:zip|schedule|availability|calendar|times?|hours|area|map|website|link|notes|inbox)\b/.test(
      s,
    )
  ) {
    return false;
  }
  if (/\b(?:let me|i(?:'ll| will)|please) check\b/.test(s) && !/\b(?:pay|payment|cash|card)\b/.test(s)) {
    return false;
  }
  return (
    /\b(?:take|accept) (?:a )?(?:personal )?che(?:ck|que)s?\b/.test(s) ||
    /\bpay (?:by|with|via) (?:a )?che(?:ck|que)s?\b/.test(s) ||
    /\bche(?:ck|que)s? (?:ok|okay|fine|accepted|alright|work)\??\b/.test(s) ||
    /\bwrite (?:a |you a )?che(?:ck|que)\b/.test(s) ||
    /\bwhat about (?:a )?che(?:ck|que)s?\b/.test(s) ||
    /\bcan i (?:write|give|leave|pay) (?:a |you a )?che(?:ck|que)\b/.test(s) ||
    /^che(?:ck|que)s?\??$/.test(s.trim()) ||
    (/\b(?:personal )?che(?:ck|que)s?\b/.test(s) && /\b(?:pay|payment|invoice|cash|card)\b/.test(s))
  );
}

export function paymentSpeech(spoken) {
  const s = String(spoken || "").toLowerCase();
  if (/venmo|paypal|zelle|cash app/.test(s)) {
    return `${PAY_LINE} That’s the list — we don’t take Venmo or PayPal.`;
  }
  if (asksAboutChecks(s)) {
    return `${PAY_LINE} ${CHECK_NO}`;
  }
  if (/deposit/.test(s)) {
    return `${PAY_LINE} There’s no deposit to set up ahead of time.`;
  }
  return PAY_LINE;
}

export const ODOR_LINE =
  "We can’t promise in every case that odor that has set in can always be removed if it has worked into the padding or the subfloor, but we do promise to do the best job possible trying.";

export const LAST_LINE =
  "The last opening varies by weekday and the appointments already scheduled. The booking page shows every opening currently available.";

export const PHONE = "(316) 232-8111";

export const TEXT_US = `We would love to talk — text ${PHONE} or keep talking here in Messenger and we’ll take care of you.`;

export const TEXT_PHOTO = `We would love to look at it — send the date and a photo here in Messenger.`;

export const RUG_LINE =
  "We would love to help. A rug can take the place of a room — some are too small for our machine, but most are fine, and we don’t clean wool rugs. When you book, put anything that’s not normally in the package in the notes if it’s being substituted.";

export const WOOL_RUG_LINE =
  "We would love to take care of the house, but we don’t clean wool rugs at this time.";

export const WOOL_LINE =
  "We would love to take care of it. Wool, berber, and natural fibers we want to see first on the visit — we won’t book those as a regular clean until we’ve looked at them. We don’t clean wool rugs at this time.";

export const RUG_NOTES =
  "Put the rug — or anything else that isn’t normally in the package — in the notes if you’re substituting it.";

export const DISCOUNT_LINE =
  "We would love to honor that. It’s 15 percent for military, first responders, and teachers — when you book, put that in the notes so we can apply it.";

export const DISCOUNT_NOTES =
  "Put military, first responder, or teacher in the notes when you book so we can apply the 15 percent.";

/** Only when they ask for this discount. Never volunteer it. Not on-base housing. */
export function asksServiceDiscount(spoken) {
  const s = String(spoken || "").toLowerCase();
  if (/on[\s-]?base|military\s+housing|mcconnell(?:\s+afb)?|base housing/.test(s)) return false;
  const group =
    /\b(?:military|veterans?|\bvets?\b|active duty|first responders?|firefighters?|fire fighters?|police(?: officers?)?|sheriff|deputy|emts?\b|paramedics?|teachers?|educators?)\b/;
  const ask = /\b(?:discount|deal|percent|% off|off for|rate for|price break)\b/;
  if (group.test(s) && ask.test(s)) return true;
  if (/\bdiscount for (?:the )?(?:military|veterans?|teachers?|first respond)/.test(s)) return true;
  if (/\b(?:military|veteran|teacher|first.?respond)\w* (?:discount|deal|rate)\b/.test(s)) return true;
  return false;
}

export const CANCEL_LINE =
  `We understand plans change. There is no cancellation fee, but please give as much notice as possible. For an existing appointment, reply to your Housecall Pro text or text ${PHONE}. The change is not final until we confirm it.`;

export const NO_CONFIRM_MAIL =
  "We would love to keep that simple — after booking, watch for the confirmation text from our scheduling system. Reply to that text or message us here if you need something changed.";

export const LEAD_SCOPE =
  "If you’d like to get it scheduled, about how many rooms should we count?";

export const LIVE_TIMES =
  "The booking page shows every available time currently open.";

export const LEAD_TIMES = LIVE_TIMES;

export function howToBook(state) {
  const extras = [];
  if (state?.rug) extras.push(RUG_NOTES);
  if (state?.serviceDiscount) extras.push(DISCOUNT_NOTES);
  const extra = extras.length ? ` ${extras.join(" ")}` : "";
  return [`We’d love to help — click this link. ${LIVE_TIMES}${extra}`, bookingUrl];
}

export function loveCannot(cannot) {
  return `We’d love to help — ${cannot}.`;
}

export function weekendLead() {
  return "We would love to help — we just don’t run Saturday or Sunday.";
}

export function sameDayLead() {
  return "We would love to get it cleaned for you — we just don’t do same-day.";
}
