// Shows Keith's next open start time near the booking buttons. Read-only, start times only.
// Hidden unless the live feed answers quickly; Housecall Pro's booking page stays the final word.
const URL_ = 'https://wichita-messenger-bot-deploy.vercel.app/api/open-times';
const ampm = raw => { const [h, m] = raw.split(':').map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
export function nextOpening(slots) {
  if (!slots || !Array.isArray(slots.days)) return null;
  const day = slots.days.find(d => d && d.bookable !== false && Array.isArray(d.raw) && d.raw.length && d.label);
  return day ? `${day.label} at ${ampm(day.raw[0])}` : null;
}
async function run() {
  const spots = document.querySelectorAll('[data-next-opening]');
  if (!spots.length) return;
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 4000);
  try {
    const r = await fetch(URL_, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', signal: ctl.signal });
    const text = nextOpening((await r.json()).slots);
    if (!text) return;
    spots.forEach(el => { const out = el.querySelector('[data-next-opening-text]'); if (out) out.textContent = text; el.hidden = false; });
  } catch { /* stay hidden */ } finally { clearTimeout(t); }
}
if (typeof document !== 'undefined') run();
