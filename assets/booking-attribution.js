import { bookingUrl } from "./book-lines.js";

export const facebookBookingUrl = `${bookingUrl}&attr=10856`;

export function isFacebookVisit(search = "", referrer = "") {
  const params = new URLSearchParams(search);
  const source = (params.get("utm_source") || "").toLowerCase();
  if (/^(facebook|fb|instagram|ig|meta)$/.test(source) || params.has("fbclid")) return true;

  try {
    const host = new URL(referrer).hostname.toLowerCase();
    return /(^|\.)(facebook\.com|instagram\.com)$/.test(host);
  } catch {
    return false;
  }
}

export function bookingUrlForVisit({ search = "", referrer = "", rememberedSource = "" } = {}) {
  return isFacebookVisit(search, referrer) || rememberedSource === "facebook"
    ? facebookBookingUrl
    : bookingUrl;
}

export function applyBookingAttribution(root = document) {
  let rememberedSource = "";
  try {
    rememberedSource = sessionStorage.getItem("booking-source") || "";
    if (isFacebookVisit(location.search, document.referrer)) {
      rememberedSource = "facebook";
      sessionStorage.setItem("booking-source", rememberedSource);
    }
  } catch {
    // Booking still works when storage is unavailable.
  }

  const destination = bookingUrlForVisit({
    search: location.search,
    referrer: document.referrer,
    rememberedSource,
  });
  root.querySelectorAll(`a[href="${bookingUrl}"]`).forEach((link) => {
    link.href = destination;
  });
  return destination;
}
