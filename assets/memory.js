/**
 * Dialogue memory. Keep slots and a short fact list so a short
 * follow-up still means something after a restart.
 */

export function emptyMemory() {
  return {
    lastJob: null,
    lastConstraint: null,
    closingOpen: false,
    holdOpen: false,
    firstName: null,
    slots: {},
    facts: [],
  };
}

export function guessFirstName(spoken) {
  const match = String(spoken || "")
    .toLowerCase()
    .match(/\b(?:i(?:'m| am)|this is|my name is|name'?s)\s+([a-z]{2,18})\b/);
  if (!match) return null;
  const skip = new Set(["the", "just", "here", "ready", "looking", "wondering", "trying"]);
  if (skip.has(match[1])) return null;
  return match[1][0].toUpperCase() + match[1].slice(1);
}

export function syncMemory(state) {
  if (!state.memory) state.memory = emptyMemory();
  const memory = state.memory;
  if (!state.firstName && memory.firstName) state.firstName = memory.firstName;
  memory.slots = {
    city: state.city || null,
    zip: state.zip || null,
    rooms: state.rooms ?? null,
    halls: state.halls ?? null,
    stairs: state.stairs ?? null,
    pet: Boolean(state.pet),
    petAnswered: Boolean(state.petAnswered),
    rug: Boolean(state.rug),
    weekday: state.weekday || null,
    inArea: state.inArea,
    sentLink: Boolean(state.sentLink),
    homeAnswered: Boolean(state.homeAnswered),
    serviceDiscount: Boolean(state.serviceDiscount),
    stage: state.stage || null,
  };
  const facts = [];
  if (state.firstName) facts.push(`name ${state.firstName}`);
  if (state.city && state.city !== "county") facts.push(`city ${state.city}`);
  if (state.zip) facts.push(`zip ${state.zip}`);
  if (state.rooms) facts.push(`${state.rooms} rooms`);
  if (state.halls != null) facts.push(`${state.halls} halls`);
  if (state.stairs != null) facts.push(`${state.stairs} stairs`);
  if (state.rug) facts.push("rug substitute");
  if (state.petAnswered) facts.push(state.pet ? "pet treatment" : "no pet issues");
  if (state.weekday) facts.push(state.weekday);
  if (state.homeAnswered) facts.push("access notes");
  if (state.sentLink) facts.push("booking link sent");
  if (state.serviceDiscount) facts.push("15 percent service discount — notes when they book");
  if (state.inArea === false) facts.push("out of area");
  memory.facts = facts;
  memory.firstName = state.firstName || memory.firstName || null;
  return memory;
}

export function rememberPlan(state, plan) {
  if (!state.memory) state.memory = emptyMemory();
  if (!plan) return syncMemory(state);
  state.memory.lastJob = plan.job || plan.intent || null;
  state.memory.lastConstraint = plan.constraint || null;
  if (plan.job === "closing" || plan.intent === "closing") state.memory.closingOpen = true;
  if (plan.job === "hold" || plan.intent === "hold") state.memory.holdOpen = true;
  return syncMemory(state);
}

export function followupJob(spoken, memory) {
  if (!memory || !spoken) return null;
  if (/^(ok|okay|yes|yeah|send it|send the link|that works|please)[.! ]*$/.test(spoken)) {
    if (memory.closingOpen) return "closing";
    if (memory.holdOpen) return "hold";
  }
  return null;
}

export function recallBits(state) {
  const memory = state?.memory || emptyMemory();
  return memory.facts || [];
}
