import { bookingUrl } from "./book-lines.js";

export const websiteBookingUrl = `${bookingUrl}&attr=10858`;
export const facebookBookingUrl = `${bookingUrl}&attr=10856`;
export const emailBookingUrl = `${bookingUrl}&attr=11097`;
export const googleProfileBookingUrl = `${bookingUrl}&attr=11099`;

// utm_source values for owned channels: outreach emails and the Google Business Profile links.
export function campaignSource(search = "") {
  const source = (new URLSearchParams(search).get("utm_source") || "").toLowerCase();
  if (/^(email|outreach|newsletter)$/.test(source)) return "email";
  if (/^(gbp|google_business|google-business|googlebusiness)$/.test(source)) return "google";
  return "";
}

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
  const source = isFacebookVisit(search, referrer) ? "facebook" : campaignSource(search) || rememberedSource;
  if (source === "facebook") return facebookBookingUrl;
  if (source === "email") return emailBookingUrl;
  if (source === "google") return googleProfileBookingUrl;
  return websiteBookingUrl;
}

export function applyBookingAttribution(root = document) {
  let rememberedSource = "";
  try {
    rememberedSource = sessionStorage.getItem("booking-source") || "";
    const current = isFacebookVisit(location.search, document.referrer) ? "facebook" : campaignSource(location.search);
    if (current) {
      rememberedSource = current;
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
  root.querySelectorAll(`a[href="${bookingUrl}"], a[href="${websiteBookingUrl}"]`).forEach((link) => {
    link.href = destination;
  });
  return destination;
}
