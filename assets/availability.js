// Open appointment times from Keith's calendar (a private iCal feed that Housecall Pro keeps up to date
// through its Google Calendar sync). Pure functions, no dependencies: the bot fetches the feed on the server
// and hands the brain only the open TIMES — never names, addresses or job details.

export const TZ = "America/Chicago";

// Mirrors Housecall Pro → Settings → Booking → General ("Set specific start time" + "Earliest availability").
// Keep these in step with Housecall Pro: the booking page is what finally decides.
export const SCHEDULE = {
  startTimes: { 1: ["10:30", "13:00", "15:30"], 2: ["08:00", "10:30", "13:00", "15:30"], 3: ["08:00", "10:30", "13:00", "15:30"], 4: ["08:00", "10:30", "13:00", "15:30"], 5: ["08:00", "10:30"] },
  earliestDays: 2, // online booking opens this many calendar days out
  horizonDays: 21, // how far ahead we look
  lastSlotMinutes: 150, // a start time with no later start that day blocks this long
};

/* ---------- Chicago time helpers ---------- */
const fmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", weekday: "short" });
const WD = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
export function chicagoParts(ms) {
  const p = Object.fromEntries(fmt.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute, s: +p.second, wd: WD[p.weekday] };
}
/** UTC ms for a wall-clock time in Chicago (handles DST). */
export function chicagoToUtc(y, mo, d, h = 0, mi = 0, s = 0) {
  let guess = Date.UTC(y, mo - 1, d, h, mi, s);
  for (let i = 0; i < 3; i++) {
    const p = chicagoParts(guess);
    const shown = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s);
    guess += Date.UTC(y, mo - 1, d, h, mi, s) - shown;
  }
  return guess;
}
const ymd = (y, mo, d) => `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const addDays = (y, mo, d, n) => { const t = new Date(Date.UTC(y, mo - 1, d + n)); return [t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()]; };

/* ---------- iCal parsing (what Google's secret address returns) ---------- */
function unfold(text) { return String(text || "").replace(/\r\n/g, "\n").replace(/\n[ \t]/g, ""); }
function parseLine(line) {
  const i = line.indexOf(":"); if (i < 0) return null;
  const head = line.slice(0, i), value = line.slice(i + 1);
  const [name, ...ps] = head.split(";");
  const params = Object.fromEntries(ps.map((p) => { const j = p.indexOf("="); return [p.slice(0, j).toUpperCase(), p.slice(j + 1).replace(/^"|"$/g, "")]; }));
  return { name: name.toUpperCase(), params, value };
}
/** An iCal date/time → { ms, allDay }. Times with TZID other than Chicago are treated as UTC offsets via Intl when possible. */
function parseWhen(value, params) {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(String(value).trim());
  if (!m) return null;
  const [, y, mo, d, h, mi, s, z] = m;
  if (h === undefined || params.VALUE === "DATE") return { ms: chicagoToUtc(+y, +mo, +d), allDay: true };
  if (z) return { ms: Date.UTC(+y, +mo - 1, +d, +h, +mi, +(s || 0)), allDay: false };
  const tz = params.TZID;
  if (tz && tz !== TZ) {
    try {
      const f = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
      let g = Date.UTC(+y, +mo - 1, +d, +h, +mi, +(s || 0));
      for (let i = 0; i < 3; i++) { const p = Object.fromEntries(f.formatToParts(new Date(g)).map((x) => [x.type, x.value])); g += Date.UTC(+y, +mo - 1, +d, +h, +mi, +(s || 0)) - Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second); }
      return { ms: g, allDay: false };
    } catch { /* unknown zone: fall through to Chicago */ }
  }
  return { ms: chicagoToUtc(+y, +mo, +d, +h, +mi, +(s || 0)), allDay: false };
}
const DUR = /^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/;
function durationMs(v) { const m = DUR.exec(String(v || "")); if (!m) return 0; const [, w, d, h, mi, s] = m.map((x) => +(x || 0)); return ((((w * 7 + d) * 24 + h) * 60 + mi) * 60 + s) * 1000; }

const BYDAY = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
/** Expand a simple RRULE (DAILY / WEEKLY with BYDAY, INTERVAL, COUNT, UNTIL) inside [from, to). */
function expand(ev, from, to) {
  if (!ev.rrule) return [ev];
  const r = Object.fromEntries(ev.rrule.split(";").map((x) => x.split("=")));
  const freq = r.FREQ, interval = +(r.INTERVAL || 1), count = r.COUNT ? +r.COUNT : Infinity;
  const until = r.UNTIL ? parseWhen(r.UNTIL, {})?.ms ?? Infinity : Infinity;
  if (freq !== "DAILY" && freq !== "WEEKLY") return [ev]; // monthly/yearly: only the first instance is used
  const start = chicagoParts(ev.start), len = ev.end - ev.start;
  const days = freq === "WEEKLY" ? (r.BYDAY ? r.BYDAY.split(",").map((x) => BYDAY[x.slice(-2)]) : [start.wd]) : null;
  const out = []; let n = 0;
  for (let i = 0; i < 800 && n < count; i++) {
    const [y, mo, d] = addDays(start.y, start.mo, start.d, i);
    const ms = ev.allDay ? chicagoToUtc(y, mo, d) : chicagoToUtc(y, mo, d, start.h, start.mi, start.s);
    if (ms > until || ms >= to) break;
    const wd = new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
    let hit;
    if (freq === "DAILY") hit = i % interval === 0;
    else { const week = Math.floor((i + start.wd) / 7); hit = days.includes(wd) && week % interval === 0; }
    if (!hit) continue;
    n++;
    if (ev.exdates.has(ms)) continue;
    if (ms + len > from) out.push({ ...ev, start: ms, end: ms + len });
  }
  return out;
}

/** Busy intervals [{start, end}] (UTC ms) from an iCal feed, within [from, to). Free/"show as available" events are skipped. */
export function busyFromIcs(icsText, from, to) {
  const lines = unfold(icsText).split("\n");
  const events = []; let cur = null; let depth = 0;
  for (const raw of lines) {
    const line = raw.trimEnd(); if (!line) continue;
    if (line === "BEGIN:VEVENT") { cur = { exdates: new Set(), transparent: false, cancelled: false }; depth = 0; continue; }
    if (!cur) continue;
    if (/^BEGIN:/.test(line)) { depth++; continue; }
    if (/^END:/.test(line) && depth > 0) { depth--; continue; }
    if (line === "END:VEVENT") { events.push(cur); cur = null; continue; }
    if (depth > 0) continue; // inside VALARM etc.
    const p = parseLine(line); if (!p) continue;
    if (p.name === "DTSTART") { const w = parseWhen(p.value, p.params); if (w) { cur.start = w.ms; cur.allDay = w.allDay; } }
    else if (p.name === "DTEND") { const w = parseWhen(p.value, p.params); if (w) cur.end = w.ms; }
    else if (p.name === "DURATION") cur.duration = durationMs(p.value);
    else if (p.name === "RRULE") cur.rrule = p.value;
    else if (p.name === "EXDATE") for (const v of p.value.split(",")) { const w = parseWhen(v, p.params); if (w) cur.exdates.add(w.ms); }
    else if (p.name === "TRANSP") cur.transparent = p.value.trim().toUpperCase() === "TRANSPARENT";
    else if (p.name === "STATUS") cur.cancelled = p.value.trim().toUpperCase() === "CANCELLED";
    else if (p.name === "RECURRENCE-ID") cur.recurrenceId = true;
  }
  const busy = [];
  for (const ev of events) {
    if (ev.start == null || ev.transparent || ev.cancelled) continue;
    if (ev.end == null) ev.end = ev.start + (ev.duration || (ev.allDay ? 86400000 : 15 * 60000));
    if (ev.end <= ev.start) ev.end = ev.start + 15 * 60000;
    for (const x of expand(ev, from, to)) if (x.end > from && x.start < to) busy.push({ start: x.start, end: x.end });
  }
  return busy.sort((a, b) => a.start - b.start);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const clock = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")}`; };

/**
 * Open start times for the next weeks.
 * → { asOf, earliest: "YYYY-MM-DD", days: [{ date, wd, day: "Thursday", label: "Thursday, Oct 9", times: ["10:30","1:00"], raw: ["10:30","13:00"] }] }
 * Every working day in the window is listed (times: [] when full) so "is Thursday open?" can be answered either way.
 */
export function openSlots(busy, now = Date.now(), schedule = SCHEDULE) {
  const today = chicagoParts(now);
  const days = [];
  const [ey, emo, ed] = addDays(today.y, today.mo, today.d, schedule.earliestDays);
  for (let i = 0; i <= schedule.horizonDays; i++) {
    const [y, mo, d] = addDays(today.y, today.mo, today.d, i);
    const wd = new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
    const starts = schedule.startTimes[wd];
    if (!starts) continue;
    const date = ymd(y, mo, d);
    const bookable = date >= ymd(ey, emo, ed);
    const raw = [];
    if (bookable) starts.forEach((t, k) => {
      const [h, mi] = t.split(":").map(Number);
      const s = chicagoToUtc(y, mo, d, h, mi);
      const next = starts[k + 1] ? chicagoToUtc(y, mo, d, ...starts[k + 1].split(":").map(Number)) : s + schedule.lastSlotMinutes * 60000;
      if (s > now && !busy.some((b) => b.start < next && b.end > s)) raw.push(t);
    });
    days.push({ date, wd, day: DAYS[wd], label: `${DAYS[wd]}, ${MONTHS[mo - 1]} ${d}`, bookable, times: raw.map(clock), raw });
  }
  return { asOf: new Date(now).toISOString(), earliest: ymd(ey, emo, ed), days };
}

/** One call for the server: feed text → open slots. */
export function slotsFromIcs(icsText, now = Date.now(), schedule = SCHEDULE) {
  const to = now + (schedule.horizonDays + 2) * 86400000;
  return openSlots(busyFromIcs(icsText, now - 86400000, to), now, schedule);
}
