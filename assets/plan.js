/**
 * Policy planner. Hear is meaning. Plan is what we do.
 * Ordered rules, then secondaries, then speech.
 */

import {
  CLOSE_OFFER,
  HOLD_OFFER,
  LAST_LINE,
  MOVE_LINE,
  ODOR_LINE,
  PAY_LINE,
  PHONE,
  TEXT_PHOTO,
  TEXT_US,
  CANCEL_LINE,
  NO_CONFIRM_MAIL,
  bookingUrl,
  loveCannot,
  sameDayLead,
  weekendLead,
} from "./book-lines.js";
import { hear, primaryJob } from "./hear.js";
import { followupJob } from "./memory.js";

function spokenOf(heard, text, original) {
  return heard?.spoken || `${text || ""} ${original || ""}`.toLowerCase();
}

export function constraintOf(heard, spoken) {
  if (heard.weekend) return "weekend";
  if (heard.sameDay) return "same-day";
  if (heard.noDate || /don'?t have (?:the |our |a )?(?:keys|date|closing)|house isn'?t|not free|still occupied/.test(spoken)) {
    return "no_date";
  }
  if (heard.hold) return "hold";
  if (heard.firmWeekday) return "firm_weekday";
  return null;
}

function closingSpeech(constraint) {
  if (constraint === "weekend") {
    return {
      want: "a clean on the weekend around closing",
      cannot: "we just don’t run Saturday or Sunday",
      offer: CLOSE_OFFER,
      bubbles: [weekendLead(), CLOSE_OFFER],
      sendLink: true,
      linkOnly: true,
    };
  }
  if (constraint === "same-day") {
    return {
      want: "a same-day clean around closing",
      cannot: "we just don’t do same-day",
      offer: CLOSE_OFFER,
      bubbles: [sameDayLead(), CLOSE_OFFER],
      sendLink: true,
      linkOnly: true,
    };
  }
  if (constraint === "firm_weekday") {
    return {
      want: "a weekday they already named around closing",
      cannot: "",
      offer: "If that day the house is free to clean, click this link and reserve it there.",
      bubbles: [
        "We’d love to help — if that day the house is free to clean, click this link. All of the availabilities and times are up to the minute.",
      ],
      sendLink: true,
      linkOnly: true,
    };
  }
  return {
    want: "a clean around closing or move-in, before they have a firm free day",
    cannot: "we can’t lock a day until you know when the house is free to clean",
    offer: CLOSE_OFFER,
    bubbles: [loveCannot("we can’t lock a day until you know when the house is free to clean"), CLOSE_OFFER],
    sendLink: true,
    linkOnly: true,
  };
}

function holdSpeech(constraint) {
  if (constraint === "weekend") {
    return {
      want: "a weekend day held",
      cannot: "we just don’t run Saturday or Sunday",
      offer: HOLD_OFFER,
      bubbles: [weekendLead(), HOLD_OFFER],
      sendLink: true,
      linkOnly: true,
    };
  }
  return {
    want: "a day held before they can actually book it",
    cannot: "we can’t hold a day on the side",
    offer: HOLD_OFFER,
    bubbles: [loveCannot("we can’t hold a day on the side"), HOLD_OFFER],
    sendLink: true,
    linkOnly: true,
  };
}

export function planTurn({ text, original = "", intents = [], heard = null, state = {}, memory = null }) {
  const h = heard || hear(text, original);
  const spoken = spokenOf(h, text, original);
  const constraint = constraintOf(h, spoken);
  const jobHint = primaryJob(h) || followupJob(spoken, memory || state.memory);

  const paymentQuestion =
    /cash or card|how do (?:i|yall|you all|you) (?:get )?pay|how does payment|what do you take|do you take (?:cash|card)|forms of payment|venmo|paypal|apple pay|is there a deposit|get paid/.test(
      spoken,
    );
  const homeQuestion =
    /(?:need|have) to be (?:home|there|present)|do i (?:need|have) to be|can i (?:leave|go to work)|won'?t be (?:home|there)|will not be (?:home|there)|not be (?:home|there)/.test(
      spoken,
    ) && !/can you come|could you come/.test(spoken);
  const lastSlotQuestion = h.lastSlot && /last|how late|after 4|4\s*p|too late|latest/.test(spoken);
  const furnitureQuestion = h.askingWhatWeMove || (h.furnitureMove && /should i move|do i move|entertainment|sectional/.test(spoken));
  const includedQuestion = /what(?:'s| is) included|what(?:'s| is) in the|included in the/.test(spoken);
  const closetQuestion = /\bclosets?\b|walk-?in/.test(spoken);
  const fleasQuestion = /\bfleas?\b|bed ?bugs|ticks/.test(spoken);
  const humanQuestion = /are you (?:a )?bot|real person|talk to (?:a )?(?:person|human|keith)|call me|phone number|\bkeith\b/.test(
    spoken,
  );
  const cancelQuestion = /\bcancel/.test(spoken);
  const confirmQuestion = /confirmation|never came|didn'?t get (?:a |the )?confirm/.test(spoken);
  const rescheduleQuestion = /resched|change (?:the )?(?:appointment|day|time)/.test(spoken);
  const damageQuestion = /ruined|damage|refund|bleach|worse after/.test(spoken);
  const odorAsk = /smell|odor|pee|urine|stink/.test(spoken);
  const out =
    state.inArea === false ||
    /\bnewton\b|\bmulvane\b|\baugusta\b|\bhutchinson\b|\bsalina\b/.test(spoken);

  const extras = [];
  let plan = {
    job: jobHint,
    constraint,
    want: "",
    cannot: "",
    offer: "",
    sendLink: false,
    linkOnly: false,
    phone: false,
    bubbles: null,
  };

  if (out && (h.closingStory || h.sameDay || /book|rooms|cash|card|closing/.test(spoken))) {
    const city = /\bnewton\b/.test(spoken)
      ? "Newton"
      : /\bmulvane\b/.test(spoken)
        ? "Mulvane"
        : /\baugusta\b/.test(spoken)
          ? "Augusta"
          : "that spot";
    plan = {
      job: "area",
      constraint: "out_of_area",
      want: "a visit outside the ring",
      cannot: `${city} sits outside our usual 15-mile ring`,
      offer: "If you’re on the Wichita side of it, send the ZIP and we’ll tell you straight.",
      bubbles: [
        `We would love to get out there, but ${city} sits outside our usual 15-mile ring. If you’re on the Wichita side of it, send the ZIP and we’ll tell you straight.`,
      ],
      sendLink: false,
      linkOnly: false,
    };
    return finish(plan, extras, spoken);
  }

  if (damageQuestion) {
    plan = {
      job: "damage",
      constraint: h.sameDay ? "same-day" : constraint,
      want: "a refund or a same-day fix after a bad visit",
      cannot: h.sameDay ? "we just don’t do same-day" : "refunds aren’t automatic",
      offer: TEXT_PHOTO,
      phone: true,
      bubbles: [
        "I’m sorry that happened.",
        h.sameDay
          ? `We just don’t do same-day, and refunds aren’t automatic — we look at them one by one. ${TEXT_PHOTO} I’ll look at it myself.`
          : `Refunds aren’t automatic — we look at them one by one after the visit. ${TEXT_PHOTO} I’ll look at it myself.`,
      ],
    };
    return finish(plan, extras, spoken);
  }

  if (fleasQuestion) {
    plan = {
      job: "fleas",
      want: "flea or pest treatment",
      cannot: "we’re not a pest company",
      offer: "A clean helps; it doesn’t treat fleas. Call your exterminator first.",
      bubbles: [
        "We would love to help the house, but we’re not a pest company. A clean helps; it doesn’t treat fleas or bed bugs. Please call your exterminator first, then we’d be glad to clean.",
      ],
    };
    if (odorAsk) extras.push(`If you still want the odor looked at after that, pet treatment is $149 plus tax for the five-room size. ${ODOR_LINE}`);
    return finish(plan, extras, spoken);
  }

  if (lastSlotQuestion && !h.sameDay) {
    plan = {
      job: "hours",
      constraint: "last",
      want: "the last start we take",
      cannot: "we don’t start after 3:30",
      offer: LAST_LINE,
      bubbles: [LAST_LINE],
    };
    if (h.closingStory && !h.firmWeekday) extras.push(CLOSE_OFFER);
    return finish(plan, extras, spoken);
  }

  if (humanQuestion) {
    plan = {
      job: "human",
      want: paymentQuestion ? "a person, and how to pay" : "a person",
      cannot: /venmo|paypal/.test(spoken) ? "we don’t take Venmo or PayPal" : "",
      offer: TEXT_US,
      phone: true,
      bubbles: [TEXT_US],
    };
    if (paymentQuestion || /venmo|paypal/.test(spoken)) {
      extras.push(/venmo|paypal/.test(spoken) ? `${PAY_LINE} That’s the list — we don’t take Venmo or PayPal.` : PAY_LINE);
    }
    return finish(plan, extras, spoken);
  }

  if (paymentQuestion) {
    plan = {
      job: "payment",
      want: "how to pay",
      cannot: /venmo|paypal/.test(spoken) ? "we don’t take Venmo or PayPal" : "",
      offer: PAY_LINE,
      bubbles: [/venmo|paypal/.test(spoken) ? `${PAY_LINE} That’s the list — we don’t take Venmo or PayPal.` : PAY_LINE],
    };
    return finish(plan, extras, spoken);
  }

  if (cancelQuestion) {
    plan = {
      job: "cancel",
      want: "to cancel",
      cannot: "same-day cancellation has a $25 fee",
      offer: CANCEL_LINE,
      phone: true,
      bubbles: [CANCEL_LINE],
    };
    return finish(plan, extras, spoken);
  }

  if (confirmQuestion || (rescheduleQuestion && h.closingStory)) {
    const bubbles = [];
    if (confirmQuestion) {
      bubbles.push(
        NO_CONFIRM_MAIL,
      );
    }
    if (h.closingStory && !h.firmWeekday) {
      bubbles.push(loveCannot("we can’t lock a day until you know when the house is free to clean"));
      bubbles.push(CLOSE_OFFER);
    } else if (rescheduleQuestion) {
      bubbles.push(
        `Of course — we would love to get you a better time. Text ${PHONE} or message us here and we’ll take care of it.`,
      );
    }
    plan = {
      job: confirmQuestion ? "confirmation" : "reschedule",
      constraint: h.closingStory ? "no_date" : constraint,
      want: "a confirmation or a day change around closing",
      cannot: h.closingStory ? "we can’t lock a mystery day" : "",
      offer: CLOSE_OFFER,
      phone: true,
      sendLink: Boolean(h.closingStory && !h.firmWeekday),
      linkOnly: Boolean(h.closingStory && !h.firmWeekday),
      bubbles,
    };
    return finish(plan, extras, spoken);
  }

  if (includedQuestion || (closetQuestion && /\d+\s*rooms?|\$\s*99|99/.test(spoken))) {
    const extrasRooms = /6 rooms|six rooms/.test(spoken);
    plan = {
      job: "included",
      want: "what the $99 covers",
      cannot: extrasRooms ? "six rooms are not the five-room book" : "",
      offer: "Five rooms, two halls, one stair are in the $99. Extra rooms $15. Closets stay in the room.",
      bubbles: [
        extrasRooms
          ? "We would love to get it cleaned for you. Our pricing is $99 plus tax for five rooms, two halls, and one stair, then $15 for the extra room — so six rooms is $114 plus tax. Two halls and one stair are in that price; extra beyond that I’ll look at on site. Closets are included in the room and do not count as an additional area."
          : "We would love to get it cleaned for you. Our pricing is $75 plus tax up to three rooms, and $99 plus tax for five rooms, two halls, and one stair. Extra rooms are $15 after five. Closets are included in the room and do not count as an additional area.",
      ],
    };
    return finish(plan, extras, spoken);
  }

  if (closetQuestion && !furnitureQuestion && !h.closingStory) {
    plan = {
      job: "closet",
      want: "whether closets count extra",
      cannot: "",
      offer: "Closets are included in the room.",
      bubbles: [
        "We would love to get those rooms done — closets are included in the room and do not count as an additional area.",
      ],
    };
    return finish(plan, extras, spoken);
  }

  if (furnitureQuestion) {
    plan = {
      job: "prep",
      constraint: h.hold ? "hold" : constraint,
      want: "what they move and what we move",
      cannot: "we do not move entertainment centers, sectionals, beds, or dressers",
      offer: MOVE_LINE,
      bubbles: [
        /get ready|before you come|should i/.test(spoken)
          ? `To get ready, just pick up the small stuff — toys, clothes, breakables — so we can get to the carpet. ${MOVE_LINE}`
          : MOVE_LINE,
      ],
    };
    if (h.hold) extras.push(loveCannot("we can’t hold a day on the side"), HOLD_OFFER);
    if (homeQuestion) {
      extras.push(
        "You don’t have to be there — vacant or not — as long as we have a way to get in and lock up, and you’re comfortable with that. If you leave a garage code or hide a key, put that in the notes section when you book and we can take it from there.",
      );
    }
    if (h.firmWeekday) {
      extras.push("If that day the house is free to clean, click this link. All of the availabilities and times are up to the minute.");
      plan.sendLink = true;
      plan.linkOnly = true;
    }
    if (h.hold) {
      plan.sendLink = true;
      plan.linkOnly = true;
    }
    return finish(plan, extras, spoken);
  }

  const furniturePrice =
    /\b(couch|sofa|loveseat|sectional|recliner|furniture)\b/.test(spoken) &&
    /how much|price|pricing|cost/.test(spoken);
  if (furniturePrice && !h.askingWhatWeMove) {
    const rooms = (spoken.match(/\b(\d{1,2})\s*rooms?\b/) || spoken.match(/living room/)) 
      ? (spoken.match(/\b(\d{1,2})\s*rooms?\b/) ? Number(spoken.match(/\b(\d{1,2})\s*rooms?\b/)[1]) : 1)
      : null;
    const carpet =
      rooms && rooms <= 3
        ? `We would love to help. Unfortunately our furniture cleaning process is priced differently than our carpet cleaning, but with just ${rooms} room${rooms === 1 ? "" : "s"} we could certainly cover that for our minimum charge of $75 plus tax.`
        : rooms
          ? `We would love to help. Unfortunately our furniture cleaning process is priced differently than our carpet cleaning. The carpet for those rooms would be $${99 + Math.max(0, rooms - 5) * 15} plus tax.`
          : "We would love to get that cleaned for you. Our pricing is $89 plus tax for a sofa.";
    plan = {
      job: "other-services",
      want: "a furniture and carpet price",
      cannot: "furniture is not the carpet book",
      offer: carpet,
      bubbles: [carpet],
    };
    if (/not be home|won'?t be|aren't there|vacant/.test(spoken)) {
      extras.push(
        "You don’t have to be there — vacant or not — as long as we have a way to get in and lock up, and you’re comfortable with that. If you leave a garage code or hide a key, put that in the notes section when you book and we can take it from there.",
      );
    }
    return finish(plan, extras, spoken);
  }

  if (h.weekend && !h.closingStory) {
    plan = {
      job: "weekend",
      constraint: "weekend",
      want: "a Saturday or Sunday visit",
      cannot: "we just don’t run Saturday or Sunday",
      offer: "A weekday is when we can take care of you.",
      bubbles: ["We would love to help — we just don’t run Saturday or Sunday. A weekday is when we can take care of you."],
    };
    const rooms = spoken.match(/\b(\d{1,2})\s*rooms?\b/);
    if (rooms) {
      const n = Number(rooms[1]);
      const dollars = n <= 3 ? 75 : 99 + Math.max(0, n - 5) * 15;
      extras.push(`We would love to get those rooms cleaned for you. Our pricing is $${dollars} plus tax, and that would cover those areas.`);
    }
    return finish(plan, extras, spoken);
  }

  if (homeQuestion && jobHint !== "closing") {
    return { job: "home", constraint, bubbles: null };
  }

  if (jobHint === "payment" || jobHint === "price" || jobHint === "home" || jobHint === "furniture") {
    if (!(jobHint === "furniture" && h.hold)) return { job: jobHint, constraint, bubbles: null };
  }

  if (h.sameDay && (h.closingStory || /can you come|garage code|vacant|bought/.test(spoken))) {
    const speech = closingSpeech("same-day");
    plan = { job: h.closingStory ? "closing" : "same-day", constraint: "same-day", ...speech };
    if (h.closingStory && !h.firmWeekday && plan.bubbles[1] !== CLOSE_OFFER) {
      /* already has CLOSE_OFFER */
    }
    if (!h.closingStory) {
      plan = {
        job: "same-day",
        constraint: "same-day",
        want: "today or tomorrow",
        cannot: "we just don’t do same-day",
        offer: "The link has all of the up-to-the-minute availabilities.",
        bubbles: [sameDayLead()],
        sendLink: false,
      };
    }
    return finish(plan, extras, spoken);
  }

  if (h.closingStory) {
    const use = constraint === "weekend" || constraint === "same-day" || constraint === "firm_weekday" ? constraint : "no_date";
    plan = { job: "closing", constraint: use, ...closingSpeech(use) };
    if (odorAsk) extras.push(`For the odor, pet treatment is $149 plus tax for the five-room size. ${ODOR_LINE}`);
    return finish(plan, extras, spoken);
  }

  if (h.hold || jobHint === "hold") {
    plan = { job: "hold", constraint: constraint === "weekend" ? "weekend" : "hold", ...holdSpeech(constraint) };
    if (furnitureQuestion) extras.push(MOVE_LINE);
    return finish(plan, extras, spoken);
  }

  if (intents.includes("closing") && !jobHint) {
    plan = { job: "closing", constraint: "no_date", ...closingSpeech("no_date") };
    return finish(plan, extras, spoken);
  }

  return { job: jobHint, constraint, bubbles: null, extras };
}

function finish(plan, extras, spoken) {
  const bubbles = [...(plan.bubbles || [])];
  for (const extra of extras) {
    if (extra && !bubbles.includes(extra)) bubbles.push(extra);
  }
  if (plan.sendLink && !bubbles.includes(bookingUrl) && plan.job !== "area") bubbles.push(bookingUrl);
  plan.bubbles = bubbles;
  plan.spoken = spoken;
  return plan;
}

export { CLOSE_OFFER, HOLD_OFFER };
