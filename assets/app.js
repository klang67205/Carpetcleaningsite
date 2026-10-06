/**
 * Live site drop-in. For real understanding, point the page at the Node host
 * with <meta name="concierge-api" content="https://YOUR-HOST"> so talk goes
 * through the language model. Without that, this file uses the local book only.
 */
import { applyBookingAttribution } from "./booking-attribution.js";

let activeBookingUrl = "";
let bookingUrl = "";
let delayFor = () => 600;
let createWebsiteConversation;
let requestReply;
let replyEntries;
let interpretDirectives;
let polishBubbles;
let polishRequest;
let withPolish;
let interpretUrl = "";
let polishUrl = "";
let messengerUrl = "https://m.me/wichitacarpetcleaningservices";
let smsUrl = "sms:+13162328111";
let assistantModulePromise;

const STORE_KEY = "wccs-chat-v1";
const MAX_SAVED = 150;
// The same text sent again within this window is a double tap, not a new message.
const DOUBLE_TAP_MS = 1500;
// The AI endpoints only answer the live site, so other hosts (local tests, previews) skip them unless
// the chat element sets data-interpret-url / data-polish-url (an empty value turns that step off).
const LIVE_SITE = /^(?:www\.)?wichitacarpetcleaningservices\.com$/i;
// Same breakpoints as the full-screen phone sheet in reliability.css.
const SHEET_QUERY = "(max-width: 480px), (max-width: 850px) and (max-height: 560px)";
const KINDS = ["v", "g", "b", "a"];
const validEntry = (entry) => Array.isArray(entry) && KINDS.includes(entry[0]);

function loadAssistant() {
  if (!assistantModulePromise) {
    assistantModulePromise = Promise.all([
      import("./front-desk.js"),
      import("./site-response.js"),
    ]).then(([conversationModule, websiteModule]) => {
      bookingUrl = conversationModule.bookingUrl;
      delayFor = conversationModule.delayFor;
      createWebsiteConversation = websiteModule.createWebsiteConversation;
      requestReply = websiteModule.requestReply;
      replyEntries = websiteModule.replyEntries;
      interpretDirectives = websiteModule.interpretDirectives;
      polishBubbles = websiteModule.polishBubbles;
      polishRequest = websiteModule.polishRequest;
      withPolish = websiteModule.withPolish;
      interpretUrl = websiteModule.INTERPRET_URL;
      polishUrl = websiteModule.POLISH_URL;
      messengerUrl = websiteModule.messengerUrl;
      smsUrl = websiteModule.smsUrl;
    }).catch((error) => {
      assistantModulePromise = undefined;
      throw error;
    });
  }
  return assistantModulePromise;
}

function readSaved() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORE_KEY) || "null");
    return saved && Array.isArray(saved.t) ? saved : null;
  } catch {
    return null;
  }
}

function writeSaved(value) {
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify(value));
  } catch {
    // Storage can be full or blocked (private mode); the chat still works without it.
  }
}

function actionLink(label, href) {
  const link = document.createElement("a");
  link.className = "concierge-book";
  link.href = href;
  link.textContent = label;
  // Web links open in a new tab so the conversation stays put; sms: hands off to the phone app.
  if (/^https?:/i.test(href)) {
    link.target = "_blank";
    link.rel = "noopener";
  }
  return link;
}

// Transcript entries: ["v", text] visitor (a third item marks a message still waiting for its reply:
// 1 = not answered yet, [entries] = reply worked out, these parts not shown yet), ["g", text] assistant, ["b"] booking button, ["a", [[label, href], ...]] buttons.
function renderEntry(entry) {
  const [kind, value] = entry;
  if (kind === "v" || kind === "g") {
    const p = document.createElement("p");
    p.className = `concierge-message ${kind === "v" ? "visitor" : "guide"}`;
    p.textContent = value;
    return p;
  }
  const row = document.createElement("div");
  row.className = "concierge-actions";
  const links = kind === "b" ? [["See open times in Housecall Pro", activeBookingUrl]] : value || [];
  for (const [label, href] of links) row.append(actionLink(label, href));
  return row;
}

function initializePage() {
  activeBookingUrl = applyBookingAttribution();
  const apiHost = (document.querySelector('meta[name="concierge-api"]')?.content || "").replace(/\/$/, "");
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
  document.querySelectorAll("details").forEach((item) =>
    item.addEventListener("toggle", () => {
      if (item.open)
        document.querySelectorAll("details[open]").forEach((other) => {
          if (other !== item) other.open = false;
        });
    }),
  );

  const concierge = document.querySelector(".concierge");
  if (!concierge) return;
  const launch = concierge.querySelector(".concierge-launch");
  const panel = concierge.querySelector(".concierge-panel");
  const close = concierge.querySelector(".concierge-close");
  const messages = concierge.querySelector(".concierge-messages");
  const prompts = concierge.querySelector(".concierge-prompts");
  const form = concierge.querySelector(".concierge-form");
  const input = concierge.querySelector("input");
  if (!panel.hasAttribute("role")) panel.setAttribute("role", "dialog");
  if (!panel.hasAttribute("aria-label") && !panel.hasAttribute("aria-labelledby")) panel.setAttribute("aria-label", "Customer assistant chat");
  if (!panel.hasAttribute("tabindex")) panel.tabIndex = -1;
  concierge.querySelectorAll('.concierge-notice a[href^="http"]').forEach((link) => {
    link.target = "_blank";
    link.rel = "noopener";
  });

  // Keep the phone layout sized to the visible area when the on-screen keyboard opens.
  const viewport = window.visualViewport;
  if (viewport) {
    const fit = () => {
      concierge.style.setProperty("--concierge-vh", `${Math.round(viewport.height)}px`);
      concierge.style.setProperty("--concierge-top", `${Math.round(viewport.offsetTop)}px`);
    };
    viewport.addEventListener("resize", fit);
    viewport.addEventListener("scroll", fit);
    fit();
  }

  const saved = readSaved();
  const sessionId = (saved && typeof saved.id === "string" && saved.id) || "site-" + Math.random().toString(36).slice(2, 10);
  const transcript = [];
  const restoredVisitorTexts = [];
  // Visitor messages that were still waiting for a reply when the page reloaded.
  const unanswered = [];
  let conversation;
  let started = false;
  let pending = 0;
  let queue = Promise.resolve();
  let lastAsk = { text: "", at: 0 };

  const scrollDown = () => { messages.scrollTop = messages.scrollHeight; };
  const markChatted = () => concierge.classList.add("concierge-chatted");
  const save = () => writeSaved({ k: 2, id: sessionId, o: !panel.hidden, t: transcript.slice(-MAX_SAVED) });
  const add = (entry) => {
    transcript.push(entry);
    messages.append(renderEntry(entry));
    scrollDown();
    save();
  };

  for (const raw of saved?.t || []) {
    if (!validEntry(raw)) continue;
    const entry = raw[0] === "v" ? ["v", raw[1]] : raw;
    // A fourth item is how the assistant read the message (never shown): {d: directives} from the AI
    // step, or (older saves) the plain-English wording it answered.
    const reading = raw[3] && typeof raw[3] === "object" && !Array.isArray(raw[3]) && raw[3].d && typeof raw[3].d === "object" ? { d: raw[3].d } : typeof raw[3] === "string" ? raw[3] : undefined;
    if (raw[0] === "v" && raw[2] !== 1 && reading !== undefined) { entry[2] = 0; entry[3] = reading; }
    transcript.push(entry);
    messages.append(renderEntry(entry));
    if (entry[0] !== "v") continue;
    if (raw[2] === 1) {
      entry[2] = 1;
      unanswered.push(entry);
      continue; // never reached the assistant, so it is asked for real when the chat opens
    }
    restoredVisitorTexts.push(typeof entry[3] === "string" ? [entry[3]] : [entry[1], entry[3] ? entry[3].d : undefined]);
    if (Array.isArray(raw[2])) {
      entry[2] = raw[2].filter(validEntry);
      unanswered.push(entry);
    }
  }
  // Transcripts saved before replies were tracked: trailing visitor messages never got an answer.
  if (saved && saved.k !== 2) {
    for (let i = transcript.length - 1; i >= 0 && transcript[i][0] === "v"; i -= 1) {
      transcript[i][2] = 1;
      unanswered.unshift(transcript[i]);
      restoredVisitorTexts.pop();
    }
  }
  if (transcript.some((entry) => entry[0] === "v")) markChatted();

  const ensureConversation = () => {
    if (conversation) return;
    conversation = createWebsiteConversation();
    // After a reload, quietly replay the visitor's earlier messages so the local assistant
    // remembers the job (rooms, pets) without showing anything again.
    if (!apiHost && restoredVisitorTexts.length) {
      try {
        conversation.start();
        for (const [text, directives] of restoredVisitorTexts) conversation.respond(text, directives);
      } catch {
        conversation = createWebsiteConversation();
      }
    }
  };

  const contactLinks = () => [["Text the company", smsUrl], ["Open Messenger", messengerUrl]];

  // Shows a reply part by part. `owner` is the visitor message being answered: it keeps the parts
  // not shown yet, so a reload mid-reply finishes the reply instead of asking again.
  const play = async (entries, owner) => {
    if (owner) { owner[2] = entries.slice(); save(); }
    for (const entry of entries) {
      if (entry[0] !== "a") {
        const typing = document.createElement("p");
        typing.className = "concierge-message typing";
        typing.textContent = "•••";
        typing.setAttribute("aria-hidden", "true");
        messages.append(typing);
        scrollDown();
        await new Promise((resolve) => setTimeout(resolve, delayFor(entry[0] === "b" ? bookingUrl : entry[1])));
        typing.remove();
      }
      if (owner) owner[2].shift();
      add(entry);
    }
  };
  const answered = (owner) => {
    if (owner[3] !== undefined) owner[2] = 0;
    else owner.length = 2;
    save();
  };

  const setBusy = (value) => {
    messages.setAttribute("aria-busy", String(value));
  };
  setBusy(false);

  const recover = () => {
    messages.querySelectorAll(".typing").forEach((node) => node.remove());
    add(["g", "The assistant could not respond. Your appointment has not been changed. You can still book through Housecall Pro, text the company, or open Messenger."]);
    add(["a", [["Book in Housecall Pro", activeBookingUrl], ...contactLinks()]]);
  };

  // Replies run one at a time, in order. Visitors can keep typing while the assistant is "typing".
  const enqueue = (job, settle) => {
    pending += 1;
    setBusy(true);
    queue = queue
      .then(job)
      .catch(recover)
      .finally(() => {
        settle?.();
        pending -= 1;
        if (!pending) setBusy(false);
      });
    return queue;
  };

  // Where the AI steps live ("" = skip that step).
  const endpoint = (override, live) => {
    if (typeof override === "string") return override.trim();
    return LIVE_SITE.test(location.hostname) ? live : "";
  };
  const understandingUrl = () => endpoint(concierge.dataset.interpretUrl, interpretUrl);
  const rewordUrl = () => endpoint(concierge.dataset.polishUrl, polishUrl);
  // Shows "•••" while an AI step runs.
  const whileTyping = async (work) => {
    const typing = document.createElement("p");
    typing.className = "concierge-message typing";
    typing.textContent = "•••";
    typing.setAttribute("aria-hidden", "true");
    messages.append(typing);
    scrollDown();
    try {
      return await work();
    } catch {
      return null;
    } finally {
      typing.remove();
    }
  };
  // The AI's reading of the visitor's words, or null (the local assistant then answers their own words,
  // exactly as before). The visitor's bubble always shows what they typed.
  const understand = (said) => {
    const url = understandingUrl();
    if (!url || typeof interpretDirectives !== "function") return Promise.resolve(null);
    return whileTyping(() => interpretDirectives(url, { message: said, job: conversation.job(), lastBot: conversation.lastBot(), recent: conversation.recent() }));
  };
  // The approved reply, reworded to fit the visitor's message when that passes every check.
  const reword = async (said, result, language, recent) => {
    const url = rewordUrl();
    if (!url || typeof polishBubbles !== "function") return result;
    const request = polishRequest(said, result, language, recent);
    if (!request) return result;
    const bubbles = await whileTyping(() => polishBubbles(url, request));
    if (!bubbles) return result;
    conversation.shown(bubbles);
    return withPolish(result, bubbles);
  };

  const answer = (entry) => enqueue(async () => {
    await loadAssistant();
    ensureConversation();
    if (Array.isArray(entry[2])) return play(entry[2].slice(), entry);
    let result;
    if (apiHost) result = await requestReply(apiHost, sessionId, entry[1]);
    else {
      const recent = conversation.recent();
      const read = await understand(entry[1]);
      if (read) entry[3] = { d: read.directives };
      result = conversation.respond(entry[1], read ? read.directives : undefined);
      result = await reword(entry[1], result, read ? read.language : "en", recent);
    }
    await play(replyEntries(result), entry);
  }, () => answered(entry));

  const ask = (raw) => {
    const q = String(raw || "").trim();
    if (!q) return;
    const now = Date.now();
    if (q === lastAsk.text && now - lastAsk.at < DOUBLE_TAP_MS) return;
    lastAsk = { text: q, at: now };
    input.value = "";
    const entry = ["v", q, 1];
    add(entry);
    markChatted();
    answer(entry);
  };

  prompts?.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => ask(button.dataset.prompt));
  });

  const finePointer = () => {
    try {
      return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    } catch {
      return true;
    }
  };

  // Phone sheet: opening adds a history step so the phone's Back button closes the chat
  // instead of leaving the page; closing with × or Escape takes that step back off.
  const sheet = () => {
    try {
      return window.matchMedia(SHEET_QUERY).matches;
    } catch {
      return false;
    }
  };
  const onChatStep = () => Boolean(history.state && history.state.wccsChat);
  let chatStep = false;

  const open = () => {
    panel.hidden = false;
    launch.setAttribute("aria-expanded", "true");
    if (sheet() && !onChatStep()) {
      try {
        const state = history.state && typeof history.state === "object" ? history.state : {};
        history.pushState({ ...state, wccsChat: true }, "");
      } catch {
        // History can be locked down in embedded views; Back then simply leaves the page.
      }
    }
    chatStep = onChatStep();
    save();
    // Only jump into the text box on desktop; on phones that would pop the keyboard over the chat.
    if (finePointer()) input.focus({ preventScroll: true });
    else panel.focus({ preventScroll: true });
    scrollDown();
    if (!started && !transcript.length) {
      started = true;
      enqueue(async () => {
        await loadAssistant();
        ensureConversation();
        const result = apiHost ? await requestReply(apiHost, sessionId, "", true) : conversation.start();
        await play(replyEntries(result));
      });
    }
    // Answer, in order and once, anything the visitor sent just before a reload.
    for (const entry of unanswered.splice(0)) answer(entry);
  };
  const shut = (fromHistory = false) => {
    panel.hidden = true;
    launch.setAttribute("aria-expanded", "false");
    launch.focus();
    save();
    const hadStep = chatStep;
    chatStep = false;
    if (fromHistory !== true && hadStep && onChatStep()) history.back();
  };
  // Desktop never adds a step, so its Back button (and in-page # links) leave the chat alone.
  window.addEventListener("popstate", () => {
    if (!panel.hidden && chatStep && !onChatStep()) shut(true);
  });

  launch.addEventListener("click", () => (panel.hidden ? open() : shut()));
  close.addEventListener("click", () => shut());
  concierge.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) { event.preventDefault(); shut(); }
  });
  // Tab cycles inside the open chat instead of falling off the end of the page.
  panel.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const items = [...panel.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      .filter((el) => el.getClientRects().length > 0);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === panel)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); }
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    ask(input.value);
  });
  // A reload in the same tab brings the chat back the way the visitor left it.
  if (saved && saved.o) open();
}

if (typeof document !== "undefined") initializePage();
