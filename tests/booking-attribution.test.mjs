import assert from "node:assert/strict";
import { test } from "node:test";
import { bookingUrl } from "../assets/book-lines.js";
import { bookingUrlForVisit, facebookBookingUrl, isFacebookVisit, websiteBookingUrl } from "../assets/booking-attribution.js";

test("ordinary visitors receive the HCP website attribute", () => {
  assert.equal(bookingUrlForVisit({ search: "?utm_source=google" }), websiteBookingUrl);
  assert.equal(websiteBookingUrl, `${bookingUrl}&attr=10858`);
});

test("Facebook UTM visitors receive the HCP Facebook attribute", () => {
  assert.equal(bookingUrlForVisit({ search: "?utm_source=facebook" }), facebookBookingUrl);
});

test("Meta click IDs and Instagram referrals count as Facebook campaign traffic", () => {
  assert.equal(isFacebookVisit("?fbclid=abc", ""), true);
  assert.equal(isFacebookVisit("", "https://l.facebook.com/link"), true);
  assert.equal(isFacebookVisit("", "https://www.instagram.com/"), true);
});

test("the campaign source survives same-session navigation", () => {
  assert.equal(bookingUrlForVisit({ rememberedSource: "facebook" }), facebookBookingUrl);
});

test("lookalike domains are rejected", () => {
  assert.equal(isFacebookVisit("", "https://facebook.com.example.test/"), false);
});
