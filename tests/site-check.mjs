import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const styles = readFileSync(resolve(root, 'assets/styles.css'), 'utf8');
for (const value of ['$99', '$149', '$15', '5 rooms', '2 hallways', '1 standard staircase', 'assets/reliability.css', 'id="contact"', 'role="log"']) assert.ok(html.includes(value), `Missing ${value}`);
for (const value of ['CRI certified', 'CRI approved', 'zero residue', 'no mold risk', 'permanently eliminate']) assert.ok(!html.toLowerCase().includes(value.toLowerCase()), `Unsupported claim: ${value}`);
const schemas = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(match => JSON.parse(match[1]));
const business = schemas.find(schema => schema['@type'] === 'LocalBusiness');
assert.equal(business.openingHoursSpecification[0].opens, '07:00');
assert.equal(business.areaServed.geo.geoRadius, '24140');
assert.equal(business.priceRange, '$75–$149+');
assert.equal(business.telephone, '+13162328111');
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
const confirmation = readFileSync(resolve(root, 'booking-confirmed/index.html'), 'utf8');
assert.ok(confirmation.includes('sms:+13162328111'));
assert.ok(confirmation.includes('(316) 232-8111'));
for (const file of readdirSync(resolve(root, 'assets')).filter(name => name.endsWith('.js'))) {
  const code = readFileSync(resolve(root, 'assets', file), 'utf8');
  for (const [, path] of code.matchAll(/from\s+["'](\.[^"']+)["']/g)) assert.ok(existsSync(resolve(root, 'assets', path)), `Broken module import in ${file}`);
}
const css = readFileSync(resolve(root, 'assets/reliability.css'), 'utf8');
assert.match(css, /\.button\s*\{\s*color:\s*var\(--ink\)/);
assert.match(css, /\.concierge-panel\[hidden\]/);
console.log('Public-page, approved pricing, catalog scope, structured-data, local-link and module checks passed.');
