import assert from "node:assert/strict";
import { test } from "node:test";
import { bookingUrl } from "../assets/book-lines.js";
import { bookingUrlForVisit, campaignSource, emailBookingUrl, facebookBookingUrl, googleProfileBookingUrl, isFacebookVisit, websiteBookingUrl } from "../assets/booking-attribution.js";

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

test("outreach email visitors receive the HCP email-outreach attribute", () => {
  assert.equal(bookingUrlForVisit({ search: "?utm_source=email&utm_campaign=pm-outreach" }), emailBookingUrl);
  assert.equal(emailBookingUrl, `${bookingUrl}&attr=11097`);
  assert.equal(bookingUrlForVisit({ rememberedSource: "email" }), emailBookingUrl);
});

test("Google Business Profile visitors receive the HCP Google attribute; plain Google search stays website", () => {
  assert.equal(bookingUrlForVisit({ search: "?utm_source=gbp" }), googleProfileBookingUrl);
  assert.equal(googleProfileBookingUrl, `${bookingUrl}&attr=11099`);
  assert.equal(campaignSource("?utm_source=google"), "");
});
