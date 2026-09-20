/**
 * Always-on reasoning layer. No API key required.
 * Hear → plan (policy) → want / cannot / offer.
 */

import { CLOSE_OFFER, HOLD_OFFER } from "./book-lines.js";
import { hear, primaryJob } from "./hear.js";
import { planTurn } from "./plan.js";

export { CLOSE_OFFER, HOLD_OFFER };

export function isClosingAsk(text, intents = [], heard = null) {
  if (intents.includes("closing")) return true;
  const h = heard || hear(text);
  return primaryJob(h) === "closing";
}

export function isHoldAsk(text, intents = [], heard = null) {
  if (isClosingAsk(text, intents, heard)) return false;
  const h = heard || hear(text);
  return primaryJob(h) === "hold" || (h.hold && !h.closingStory);
}

export function think({ text, original = "", intents = [], heard = null, state = {}, memory = null }) {
  const plan = planTurn({ text, original, intents, heard, state, memory });
  if (!plan?.bubbles?.length) return null;
  return {
    intent: plan.job || "reason",
    want: plan.want,
    cannot: plan.cannot,
    offer: plan.offer,
    sendLink: Boolean(plan.sendLink),
    linkOnly: Boolean(plan.linkOnly || plan.sendLink),
    phone: Boolean(plan.phone),
    bubbles: plan.bubbles,
    constraint: plan.constraint,
    plan,
  };
}
