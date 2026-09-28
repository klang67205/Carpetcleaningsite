import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const styles = readFileSync(resolve(root, 'assets/styles.css'), 'utf8');
const websiteBookingUrl = 'https://book.housecallpro.com/book/Wichita-Carpet-Cleaning-Services/36104bbb2c7d409a8293445c570b5f8b?v2=true&attr=10858';
for (const value of ['$99', '$149', '$15', '5 rooms', '2 hallways', '1 standard staircase', 'assets/reliability.css', 'id="contact"', 'role="log"']) assert.ok(html.includes(value), `Missing ${value}`);
assert.equal([...html.matchAll(/href="https:\/\/book\.housecallpro\.com\/book\/Wichita-Carpet-Cleaning-Services\/36104bbb2c7d409a8293445c570b5f8b\?v2=true(?:&amp;|&)attr=10858"/g)].length, 11, 'Every static booking link must use the HCP website attribute');
assert.ok(html.includes(`href="${websiteBookingUrl}"`), 'Website-attributed booking link missing');
for (const value of ['CRI certified', 'CRI approved', 'zero residue', 'no mold risk', 'permanently eliminate']) assert.ok(!html.toLowerCase().includes(value.toLowerCase()), `Unsupported claim: ${value}`);
const schemas = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(match => JSON.parse(match[1]));
const business = schemas.find(schema => schema['@type'] === 'LocalBusiness');
assert.equal(business.openingHoursSpecification[0].opens, '07:00');
assert.equal(business.areaServed.geo.geoRadius, '24140');
assert.equal(business.priceRange, '$75–$149+');
assert.equal(business.telephone, '+13162328111');
assert.equal(business.address, undefined, 'Private business address must not be published in structured data');
assert.equal(business.email, undefined, 'Broken domain email must not be published in structured data');
assert.equal(business.logo, 'https://www.wichitacarpetcleaningservices.com/assets/brand-mark.svg');
assert.deepEqual(business.hasOfferCatalog.itemListElement.map(offer => offer.price), ['75', '85', '99', '149', '15']);
assert.match(business.hasOfferCatalog.itemListElement[4].description, /area, room, hallway, or staircase/);
for (const value of ['og:site_name', 'og:image:width', 'og:image:height', 'og:image:alt', 'twitter:card', 'twitter:image:alt']) assert.ok(html.includes(`property="${value}"`) || html.includes(`name="${value}"`), `Missing social metadata: ${value}`);
assert.ok(html.includes('rel="preload" as="image" href="assets/carpet-contours.webp"'), 'Hero preload must use the optimized WebP asset');
assert.match(styles, /url\("carpet-contours\.webp"\)/, 'Hero background must use the optimized WebP asset');
assert.doesNotMatch(styles, /url\("carpet-contours\.png"\)/, 'Stylesheet must not download the 2.35 MB PNG hero');
assert.ok(html.includes('Both smaller packages are available in online booking.'));
assert.ok(!html.includes('not currently listed in online booking'));
assert.ok(html.includes('sms:+13162328111'));
assert.ok(html.includes('(316) 232-8111'));
assert.ok(!html.includes('(316) 209-2176'));
for (const value of ['$75', '$85', '$19', '$39', '$79', '$89', '$119', '$169', '$179', '$129', '$259', '$139', '$239', '100 sq. ft.', '150 sq. ft.', '300 sq. ft.', '400 sq. ft.', '600 sq. ft.']) assert.ok(html.includes(value), `Missing verified catalog detail: ${value}`);
assert.ok(!/hall(?:way)?s?[^.]{0,40}\$10/.test(html), 'Retired hallway price');
assert.ok(html.includes('Appointments are available Monday through Friday only.'));
assert.ok(html.includes('On-base military housing is not serviced'));
assert.ok(!/href="(?:tel:|mailto:)/i.test(html), 'Do not add unverified contact details');
const pages = ['index.html', '404.html', 'booking-confirmed/index.html', 'privacy-policy/index.html', 'terms-of-service/index.html', 'data-deletion/index.html', 'accessibility/index.html'];
for (const page of pages) {
  const content = readFileSync(resolve(root, page), 'utf8');
  assert.doesNotMatch(content, /Manage Appointment/i, `Unsupported Housecall Pro management link claim in ${page}`);
  assert.doesNotMatch(content, /info@wichitacarpetcleaningservices\.com/i, `Broken domain email exposed in ${page}`);
  assert.doesNotMatch(content, /href="mailto:/i, `Email link exposed in ${page}`);
  assert.doesNotMatch(content, /streetAddress|PostalAddress/i, `Private business address metadata exposed in ${page}`);
  assert.doesNotMatch(content, /(?:\+?1[ .-]?)?\(?316\)?[ .-]?209[ .-]?2176/, `Private owner phone exposed in ${page}`);
  for (const [, scheme, phone] of content.matchAll(/href="(sms:|tel:)([^"?]+)/gi)) {
    assert.equal(scheme.toLowerCase(), 'sms:', `Unapproved phone-call link in ${page}`);
    assert.equal(phone, '+13162328111', `Unmanaged customer phone link in ${page}`);
  }
  const ids = [...content.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size, `Duplicate IDs: ${page}`);
  for (const [, raw] of content.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (/^(?:https?:|mailto:|tel:|sms:|data:)/.test(raw)) continue;
    const [path, hash] = raw.split('#');
    const target = path ? resolve(path.startsWith('/') ? root : dirname(resolve(root, page)), path.replace(/^\//, '').split('?')[0]) : resolve(root, page);
    assert.ok(existsSync(target), `Broken local link ${raw} in ${page}`);
    if (!path && hash) assert.ok(ids.includes(hash), `Missing anchor ${raw} in ${page}`);
  }
}
const deletion = readFileSync(resolve(root, 'data-deletion/index.html'), 'utf8');
assert.ok(deletion.includes('reply to the Housecall Pro text or text <strong>(316) 232-8111</strong>'));
assert.ok(deletion.includes('does not change or cancel an appointment until the company confirms it'));
const confirmation = readFileSync(resolve(root, 'booking-confirmed/index.html'), 'utf8');
assert.ok(confirmation.includes('sms:+13162328111'));
assert.ok(confirmation.includes('(316) 232-8111'));
assert.ok(confirmation.includes('../assets/year.js'), 'Confirmation page must use the lightweight year helper');
assert.ok(!confirmation.includes('../assets/app.js'), 'Confirmation page must not load the full assistant');
assert.ok(!readFileSync(resolve(root, '404.html'), 'utf8').includes('assets/app.js'), '404 page must not load the full assistant');
const recoveryPage = readFileSync(resolve(root, '404.html'), 'utf8');
const recoveryScript = readFileSync(resolve(root, 'assets/recover-missing-route.js'), 'utf8');
assert.ok(recoveryPage.includes('src="/assets/recover-missing-route.js"'), '404 page must recover obsolete public links');
assert.ok(recoveryPage.includes('href="/assets/styles.css"'), '404 assets must work at nested obsolete paths');
assert.ok(recoveryPage.includes('src="/assets/brand-mark.svg"'), '404 logo must work at nested obsolete paths');
assert.match(recoveryScript, /new URL\("\/", current\.origin\)/, 'Missing-route recovery must return to the public homepage');
assert.match(recoveryScript, /destination\.search = current\.search/, 'Missing-route recovery must preserve campaign query parameters');
assert.match(recoveryScript, /sessionStorage\.setItem\("booking-source", "facebook"\)/, 'Missing-route recovery must preserve Facebook attribution');
assert.match(recoveryScript, /location\.replace\(destination\.href\)/, 'Missing-route recovery must replace the dead route');
assert.match(readFileSync(resolve(root, 'sitemap.xml'), 'utf8'), /<lastmod>2026-09-28<\/lastmod>/);
const confirmationCss = readFileSync(resolve(root, 'assets/confirmation.css'), 'utf8');
assert.ok(confirmationCss.includes('.confirmation-page *{letter-spacing:0}'), 'Confirmation page must use normal letter spacing');
assert.ok(confirmationCss.includes('.confirmation-actions .button{color:var(--ink)}'), 'Confirmation primary button must keep dark text on lime');
for (const file of readdirSync(resolve(root, 'assets')).filter(name => name.endsWith('.js'))) {
  const code = readFileSync(resolve(root, 'assets', file), 'utf8');
  assert.doesNotMatch(code, /(?:\$25|24-hour).{0,40}cancell|cancell.{0,40}(?:\$25|24-hour)/i, `Retired cancellation fee policy in ${file}`);
  for (const [, path] of code.matchAll(/from\s+["'](\.[^"']+)["']/g)) assert.ok(existsSync(resolve(root, 'assets', path)), `Broken module import in ${file}`);
}
for (const page of pages) {
  const content = readFileSync(resolve(root, page), 'utf8');
  assert.doesNotMatch(content, /(?:\$25|24-hour).{0,80}cancell|cancell.{0,80}(?:\$25|24-hour)/i, `Retired cancellation fee policy in ${page}`);
  for (const url of content.matchAll(/href="(https:\/\/book\.housecallpro\.com\/book\/Wichita-Carpet-Cleaning-Services\/36104bbb2c7d409a8293445c570b5f8b\?[^"#]+)"/g)) {
    assert.match(url[1], /(?:&|&amp;)attr=10858(?:&|$)/, `Unattributed Housecall Pro booking link in ${page}`);
  }
}
assert.match(readFileSync(resolve(root, 'assets/book-lines.js'), 'utf8'), /There is no cancellation fee/);
const css = readFileSync(resolve(root, 'assets/reliability.css'), 'utf8');
for (const value of ['--radius: 8px', 'body * { letter-spacing: 0 !important; }', '.choice { border-radius: 8px; }', '.concierge-form input, .concierge-form button { border-radius: 8px; }']) {
  assert.ok(css.includes(value), `Missing presentation safeguard: ${value}`);
}
assert.match(css, /\.button\s*\{\s*color:\s*var\(--ink\)/);
assert.match(css, /\.concierge-panel\[hidden\]/);
console.log('Public-page, approved pricing, catalog scope, structured-data, local-link and module checks passed.');
