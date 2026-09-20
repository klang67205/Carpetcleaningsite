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

export const ODOR_LINE =
  "We can’t promise in every case that odor that has set in can always be removed if it has worked into the padding or the subfloor, but we do promise to do the best job possible trying.";

export const LAST_LINE =
  "We would love to get you on the schedule. Our last daily appointment is at 3:30 — that’s the last start we take.";

export const PHONE = "(316) 209-2176";

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

export const CANCEL_LINE =
  "We would love to make that easy. If you give us 24 hours’ notice there’s no fee. Same-day cancellation has a $25 fee. Text (316) 209-2176 or message us here and we’ll take care of it.";

export const NO_CONFIRM_MAIL =
  "We would love to keep that simple — we don’t send a confirmation email. The booking on the link is your reservation. Text (316) 209-2176 or message us here if you need something changed.";

export const LEAD_SCOPE =
  "If you’d like to get it scheduled, about how many rooms should we count?";

export const LEAD_TIMES =
  "All of the availabilities and times are up to the minute on the link.";

export function loveCannot(cannot) {
  return `We’d love to help — ${cannot}.`;
}

export function weekendLead() {
  return "We would love to help — we just don’t run Saturday or Sunday.";
}

export function sameDayLead() {
  return "We would love to get it cleaned for you — we just don’t do same-day.";
}
