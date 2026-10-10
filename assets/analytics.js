// Google Analytics 4 for wichitacarpetcleaningservices.com (measurement ID G-D70MFL2JGQ).
// Loads after the page has finished loading so it never slows the first view.
// Counts page views plus three events: booking-link clicks (generate_lead), assistant opens (open_chat)
// and the post-booking confirmation page (booking_confirmed). No names, phone numbers or emails are sent.
const ID = "G-D70MFL2JGQ";
window.dataLayer = window.dataLayer || [];
function gtag() { window.dataLayer.push(arguments); }
window.gtag = window.gtag || gtag;
gtag("js", new Date());
gtag("config", ID);

function load() {
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${ID}`;
  document.head.appendChild(script);
}
if (document.readyState === "complete") setTimeout(load, 1);
else window.addEventListener("load", () => setTimeout(load, 1));

document.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;
  const booking = target.closest('a[href*="book.housecallpro.com"]');
  if (booking) gtag("event", "generate_lead", { method: "booking_link", link_text: booking.textContent.trim().slice(0, 60), transport_type: "beacon" });
  if (target.closest("[data-open-chat], .concierge-launch")) gtag("event", "open_chat");
}, { capture: true });

if (location.pathname.startsWith("/booking-confirmed")) gtag("event", "booking_confirmed");
