/**
 * Grounding critic. After we speak, check the book.
 * If a reply invents a promise or drops a required fact, replace it.
 */

import { bookingUrl } from "./book-lines.js";

const FORBIDDEN = [
  { re: /venmo|paypal/i, unless: /don'?t take venmo|do not take venmo/i, why: "named a payment we do not take" },
  { re: /current availabilities/i, unless: /how do i book|send the/i, why: "stacked the generic book dump on a reasoned reply" },
  { re: /happy to|the right place|keith with/i, why: "banned voice" },
  { re: /text a photo to|photo to \(316|photo to 316/i, why: "asked them to text a photo to the phone" },
];

export function critique(plan, bubbles) {
  const said = (bubbles || []).join(" ");
  const fails = [];
  if (!said.trim()) fails.push("empty");
  for (const rule of FORBIDDEN) {
    if (rule.re.test(said) && !(rule.unless && rule.unless.test(said))) fails.push(rule.why);
  }
  if (plan?.sendLink && plan.job !== "area" && !said.includes("housecallpro")) {
    fails.push("promised a reserve path without the link");
  }
  if (plan?.job === "area" && said.includes(bookingUrl)) {
    fails.push("sent a book link outside the service area");
  }
  if (plan?.job === "closing" && plan.constraint === "no_date" && !/closing date|free to clean/i.test(said)) {
    fails.push("closing with no date missed the reserve speech");
  }
  if (plan?.constraint === "weekend" && !/saturday or sunday/i.test(said)) {
    fails.push("weekend ask did not name Sat/Sun");
  }
  if (plan?.constraint === "same-day" && !/same-day/i.test(said)) {
    fails.push("same-day ask did not refuse same-day");
  }
  if ((bubbles || []).filter((line) => line === bookingUrl).length > 1) {
    fails.push("duplicate booking link");
  }
  return { ok: fails.length === 0, fails, said };
}

export function ground(plan, bubbles) {
  const check = critique(plan, bubbles);
  if (check.ok) return bubbles;
  if (plan?.bubbles?.length) return plan.bubbles;
  return bubbles;
}
