/**
 * Live site drop-in. For real understanding, point the page at the Node host
 * with <meta name="concierge-api" content="https://YOUR-HOST"> so talk goes
 * through the language model. Without that, this file uses the local book only.
 */
import { bookingUrl, delayFor } from "./conversation.js";
import { createWebsiteConversation, requestReply, messengerUrl, smsUrl } from "./site-response.js";
import { applyBookingAttribution } from "./booking-attribution.js";

let activeBookingUrl = bookingUrl;

function linkify(text) {
  const p = document.createElement("p");
  p.className = "concierge-message guide";
  if (text === bookingUrl) {
    const a = document.createElement("a");
    a.href = activeBookingUrl;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.textContent = "See available appointments in Housecall Pro";
    a.style.cssText = "color:#102b22;word-break:break-all;font-weight:600;text-decoration:underline";
    p.append(a);
    return p;
  }
  p.textContent = text;
  return p;
}

function initializePage() {
  activeBookingUrl = applyBookingAttribution();
  const apiHost = (document.querySelector('meta[name="concierge-api"]')?.content || "").replace(/\/$/, "");
  const sessionId = "site-" + Math.random().toString(36).slice(2, 10);
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
  prompts?.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', () => ask(button.dataset.prompt));
  });

  const conversation = createWebsiteConversation();
  let busy = false;

  const addVisitor = (text) => {
    const el = document.createElement("p");
    el.className = "concierge-message visitor";
    el.textContent = text;
    messages.append(el);
    messages.scrollTop = messages.scrollHeight;
  };

  const play = async (result) => {
    for (const text of result.bubbles || []) {
      const typing = document.createElement("p");
      typing.className = "concierge-message typing";
      typing.textContent = "•••";
      typing.setAttribute('aria-hidden', 'true');
      messages.append(typing);
      messages.scrollTop = messages.scrollHeight;
      await new Promise((resolve) => setTimeout(resolve, delayFor(text)));
      typing.remove();
      messages.append(linkify(text));
      messages.scrollTop = messages.scrollHeight;
    }
    if (result.handoff) {
      const link = document.createElement('a');
      link.className = 'concierge-book';
      link.href = smsUrl;
      link.textContent = 'Text the company';
      messages.append(link);
      const messengerLink = document.createElement('a');
      messengerLink.className = 'concierge-book';
      messengerLink.href = messengerUrl;
      messengerLink.textContent = 'Open Messenger';
      messages.append(messengerLink);
      messages.scrollTop = messages.scrollHeight;
    }
  };

  const askRemote = async (text, reset = false) => {
    return requestReply(apiHost, sessionId, text, reset);
  };

  const setBusy = value => {
    busy = value;
    form.querySelector('button').disabled = value;
    prompts?.querySelectorAll('button').forEach(button => { button.disabled = value; });
    messages.setAttribute('aria-busy', String(value));
  };
  const recover = () => {
    messages.querySelectorAll('.typing').forEach(node => node.remove());
    messages.append(linkify('The assistant could not respond. Your appointment has not been changed. You can still book through Housecall Pro, text the company, or open Messenger.'));
    for (const [href, label] of [[activeBookingUrl, 'Book in Housecall Pro'], [smsUrl, 'Text the company'], [messengerUrl, 'Open Messenger']]) {
      const link = document.createElement('a');
      link.href = href;
      link.className = 'concierge-book';
      link.textContent = label;
      messages.append(link);
    }
    messages.scrollTop = messages.scrollHeight;
  };

  const ask = async (q) => {
    if (busy || !q) return;
    setBusy(true);
    addVisitor(q);
    input.value = "";
    try {
      const result = apiHost ? await askRemote(q) : conversation.respond(q);
      await play(result);
    } catch {
      recover();
    } finally {
      setBusy(false);
    }
  };

  const open = async () => {
    panel.hidden = false;
    launch.setAttribute("aria-expanded", "true");
    input.focus();
    if (!messages.children.length && !busy) {
      setBusy(true);
      try {
        const result = apiHost ? await askRemote("", true) : conversation.start();
        await play(result);
      } catch {
        recover();
      } finally {
        setBusy(false);
      }
    }
  };
  const shut = () => {
    panel.hidden = true;
    launch.setAttribute("aria-expanded", "false");
    launch.focus();
  };

  launch.addEventListener("click", () => (panel.hidden ? open() : shut()));
  close.addEventListener("click", shut);
  concierge.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) { event.preventDefault(); shut(); }
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    ask(input.value.trim());
  });
}

if (typeof document !== "undefined") initializePage();
