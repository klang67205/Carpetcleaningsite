/**
 * Live site drop-in. For real understanding, point the page at the Node host
 * with <meta name="concierge-api" content="https://YOUR-HOST"> so talk goes
 * through the language model. Without that, this file uses the local book only.
 */
import { bookingUrl, createConversation, delayFor } from "./conversation.js";

function linkify(text) {
  const p = document.createElement("p");
  p.className = "concierge-message guide";
  if (text === bookingUrl) {
    const a = document.createElement("a");
    a.href = bookingUrl;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.textContent = bookingUrl;
    a.style.cssText = "color:#102b22;word-break:break-all;font-weight:600;text-decoration:underline";
    p.append(a);
    return p;
  }
  p.textContent = text;
  return p;
}

function initializePage() {
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
  if (prompts) prompts.remove();

  const conversation = createConversation({ channel: "site" });
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
      messages.append(typing);
      messages.scrollTop = messages.scrollHeight;
      await new Promise((resolve) => setTimeout(resolve, delayFor(text)));
      typing.remove();
      messages.append(linkify(text));
      messages.scrollTop = messages.scrollHeight;
    }
  };

  const askRemote = async (text, reset = false) => {
    const path = reset ? "/preview/reset" : "/preview/message";
    const response = await fetch(`${apiHost}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, text }),
    });
    const data = await response.json();
    return data.result;
  };

  const ask = async (q) => {
    if (busy || !q) return;
    busy = true;
    addVisitor(q);
    input.value = "";
    const result = apiHost ? await askRemote(q) : conversation.respond(q);
    await play(result);
    busy = false;
    input.focus();
  };

  const open = async () => {
    panel.hidden = false;
    launch.setAttribute("aria-expanded", "true");
    if (!messages.children.length) {
      const result = apiHost ? await askRemote("", true) : conversation.start();
      await play(result);
    }
    input.focus();
  };
  const shut = () => {
    panel.hidden = true;
    launch.setAttribute("aria-expanded", "false");
    launch.focus();
  };

  launch.addEventListener("click", () => (panel.hidden ? open() : shut()));
  close.addEventListener("click", shut);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    ask(input.value.trim());
  });
}

if (typeof document !== "undefined") initializePage();
