/**
 * One situation, many wordings. We do not write a new script for each sentence.
 * Rank by meaning cues; conversation.js already knows how to answer the canonical line.
 */

export const situations = [
  {
    id: "prep",
    canonical: "what do I need to do to get ready",
    cues: [
      "get ready",
      "getting ready",
      "to get ready",
      "what do i need to do",
      "what should i do",
      "what do you need me to do",
      "how do i prepare",
      "how should i prepare",
      "before you come",
      "before you arrive",
      "before yall",
      "before y'all",
      "when yall show",
      "when you show up",
      "house is set",
      "gotta do",
      "got to do",
      "anything i should do",
      "ready for you",
      "ready for us",
      "pick up before",
    ],
  },
  {
    id: "move-furniture",
    canonical: "do you move the couch",
    cues: [
      "do you move",
      "will you move",
      "you guys move",
      "yall move",
      "move the couch",
      "move the sofa",
      "move furniture",
      "move the furniture",
      "clean under",
      "underneath the",
      "shift the couch",
      "lift the couch",
    ],
  },
  {
    id: "closet",
    canonical: "are closets included",
    cues: [
      "closet",
      "closets",
      "walk in",
      "walk-in",
      "does the closet count",
      "closet a room",
      "closet extra",
      "closet additional",
    ],
  },
  {
    id: "home",
    canonical: "do I need to be home",
    cues: [
      "need to be home",
      "have to be home",
      "have to be there",
      "need to be there",
      "someone have to be",
      "anyone need to be",
      "can i leave",
      "can i go to work",
      "won't be home",
      "not going to be there",
      "leave a key",
      "hide a key",
      "hidden key",
      "garage code",
      "gate code",
      "lockbox",
      "empty house",
      "vacant",
      "can't be there",
      "cant be there",
      "not present",
    ],
  },
  {
    id: "pet-loss",
    canonical: "our pet died and there's odor",
    cues: [
      "died",
      "passed away",
      "put down",
      "put to sleep",
      "lost our dog",
      "lost our cat",
      "lost my dog",
      "lost my cat",
      "lost our pet",
    ],
  },
  {
    id: "last-appointment",
    canonical: "what's your last appointment",
    cues: [
      "last appointment",
      "latest appointment",
      "last daily appointment",
      "how late",
      "last slot",
      "latest you can come",
      "last time you can come",
      "end of the day",
      "3:30",
      "330",
      "4pm",
      "4 pm",
    ],
  },
  {
    id: "closing",
    canonical: "we don't have our closing date yet",
    cues: [
      "closing date",
      "haven't closed",
      "havent closed",
      "not closed yet",
      "when we close",
      "when i close",
      "we close",
      "closing on",
      "possession",
      "get the keys",
      "we're buying",
      "we are buying",
      "realtor",
      "escrow",
      "free to clean",
      "move in",
      "move-in",
      "no date yet",
      "don't have a date",
      "hold a day",
      "waiting on closing",
      "waiting to close",
      "get the house",
      "don't have the keys",
      "before we move",
      "buying a house",
    ],
  },
  {
    id: "hours",
    canonical: "what are your hours",
    cues: [
      "hours",
      "are you open",
      "what time",
      "business hours",
      "when are you open",
      "your schedule",
      "scheduling",
      "appointment times",
      "what times",
    ],
  },
  {
    id: "same-day",
    canonical: "can you come today",
    cues: ["today", "same day", "same-day", "asap", "right away", "this afternoon"],
  },
  {
    id: "weekend",
    canonical: "saturday please",
    cues: ["saturday", "sunday", "weekend"],
  },
  {
    id: "stain",
    canonical: "will you get the stain out",
    cues: ["stain", "spot", "wine", "coffee", "will it come out", "get it out"],
  },
  {
    id: "area",
    canonical: "service area",
    cues: ["do you come", "do you serve", "service area", "out to", "in my town", "how far"],
  },
  {
    id: "drying",
    canonical: "how long to dry",
    cues: ["how long to dry", "when can we walk", "still wet", "drying time"],
  },
  {
    id: "payment",
    canonical: "how do I pay",
    cues: [
      "how do i pay",
      "how does payment",
      "what about payment",
      "what do you take",
      "cash or card",
      "do you take cash",
      "do you take card",
      "credit card",
      "forms of payment",
      "when do i pay",
      "pay you there",
      "is there a deposit",
      "venmo",
      "paypal",
      "do you take checks",
      "do you accept checks",
      "pay with a check",
      "pay by check",
      "what about checks",
    ],
  },
  {
    id: "human",
    canonical: "talk to a person",
    cues: ["real person", "talk to someone", "call me", "phone number"],
  },
  {
    id: "price",
    canonical: "how much",
    cues: [
      "how much",
      "what's the damage",
      "whats the damage",
      "ballpark",
      "what do you charge",
      "what's the cost",
      "whats the cost",
      "quote",
    ],
  },
  {
    id: "included",
    canonical: "what is included",
    cues: ["what is included", "what's included", "what do i get", "what is in the"],
  },
];

export function scoreSituation(situation, text) {
  const spoken = String(text || "").toLowerCase();
  if (situation.id === "pet-loss" && !/\b(pet|dog|cat|puppy|kitten|pup)\b/.test(spoken)) {
    return { score: 0, hits: [] };
  }
  if (situation.id === "price" && /\b(sofa|couch|loveseat|furniture|upholstery|recliner|sectional)\b/.test(spoken)) {
    return { score: 0, hits: [] };
  }
  if (
    (situation.id === "move-furniture" || situation.id === "prep") &&
    /move[- ]?in|before we move|after (?:i|we|they) move|closing|realtor|escrow|keys/.test(spoken) &&
    !/\b(couch|sofa|furniture|underneath|get ready)\b/.test(spoken)
  ) {
    return { score: 0, hits: [] };
  }
  let score = 0;
  const hits = [];
  for (const cue of situation.cues) {
    if (spoken.includes(cue)) {
      const weight = 1 + cue.trim().split(/\s+/).length;
      score += weight;
      hits.push(cue);
    }
  }
  return { score, hits };
}

export function pickSituation(text) {
  let best = null;
  for (const situation of situations) {
    const { score, hits } = scoreSituation(situation, text);
    if (!best || score > best.score) best = { ...situation, score, hits };
  }
  if (!best || best.score < 2.5) return null;
  return best;
}
