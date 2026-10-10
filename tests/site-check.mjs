import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const styles = readFileSync(resolve(root, 'assets/styles.css'), 'utf8');
const websiteBookingUrl = 'https://book.housecallpro.com/book/Wichita-Carpet-Cleaning-Services/36104bbb2c7d409a8293445c570b5f8b?v2=true&attr=10858';
for (const value of ['$99', '$149', '$15', '5 rooms', '2 hallways', '1 standard staircase', 'assets/reliability.css', 'id="contact"', 'role="log"']) assert.ok(html.includes(value), `Missing ${value}`);
for (const value of ['id="results"', 'assets/results/hall-before-after.jpg', 'assets/results/room-before-after.jpg', 'assets/results/spot-before-after.jpg', 'real completed carpet-cleaning work']) assert.ok(html.includes(value), `Missing authentic result proof: ${value}`);
for (const asset of ['hall-before-after.jpg', 'room-before-after.jpg', 'spot-before-after.jpg']) assert.ok(existsSync(resolve(root, 'assets', 'results', asset)), `Missing result image: ${asset}`);
const bookingLinks = [...html.matchAll(/href="(https:\/\/book\.housecallpro\.com[^"]+)"/g)].map(match => match[1].replaceAll('&amp;', '&'));
assert.ok(bookingLinks.length >= 4, 'Homepage must retain prominent booking paths');
assert.ok(bookingLinks.every(link => link === websiteBookingUrl), 'Every static booking link must use the HCP website attribute');
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
assert.equal(business.logo, 'https://wichitacarpetcleaningservices.com/assets/brand-mark.svg');
assert.equal(business.url, 'https://wichitacarpetcleaningservices.com/');
assert.equal(business['@id'], 'https://wichitacarpetcleaningservices.com/#business');
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
const servicePages = [
  'services/pet-treatment/index.html',
  'services/upholstery-cleaning/index.html',
  'services/tile-grout-cleaning/index.html',
  'services/hard-floor-cleaning/index.html',
];
const guidePages = ['low-moisture-carpet-cleaning/index.html', 'service-area/index.html', 'appointment-preparation/index.html', 'property-managers/index.html', 'derby-carpet-cleaning/index.html', 'how-long-does-carpet-take-to-dry/index.html', 'pet-urine-carpet-cleaning/index.html', 'how-often-to-clean-carpet/index.html', 'move-out-carpet-cleaning/index.html', 'commercial-carpet-cleaning/index.html'];
const pages = ['index.html', '404.html', 'booking-confirmed/index.html', 'privacy-policy/index.html', 'terms-of-service/index.html', 'data-deletion/index.html', 'accessibility/index.html', ...servicePages, ...guidePages];
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

for (const page of [...servicePages, ...guidePages]) {
  const content = readFileSync(resolve(root, page), 'utf8');
  for (const value of ['og:site_name', 'og:image', 'og:image:alt', 'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']) {
    assert.ok(content.includes(value), `Missing branded social preview metadata (${value}) in ${page}`);
  }
}

for (const page of guidePages) {
  const content = readFileSync(resolve(root, page), 'utf8');
  const pageSchemas = [...content.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(match => JSON.parse(match[1]));
  const serviceSchema = pageSchemas.find(schema => schema['@type'] === 'Service');
  assert.ok(content.includes('../assets/service-pages.css'), `Missing guide-page visual system in ${page}`);
  assert.ok(content.includes('../assets/app.js'), `Missing booking attribution in ${page}`);
  assert.ok(content.includes(websiteBookingUrl), `Missing attributed booking path in ${page}`);
  assert.match(content, /Owner-operated|owner-operated/, `Missing local ownership proof in ${page}`);
  assert.ok(pageSchemas.length, `Missing structured data in ${page}`);
  if (serviceSchema) {
    assert.equal(serviceSchema.provider['@id'], 'https://wichitacarpetcleaningservices.com/#business');
    assert.match(serviceSchema.url, /^https:\/\/wichitacarpetcleaningservices\.com\//);
  } else {
    const webPageSchema = pageSchemas.find(schema => schema['@type'] === 'WebPage');
    assert.ok(webPageSchema, `Missing WebPage structured data in ${page}`);
    assert.equal(webPageSchema.about['@id'], 'https://wichitacarpetcleaningservices.com/#business');
  }
}
const methodGuide = readFileSync(resolve(root, 'low-moisture-carpet-cleaning/index.html'), 'utf8');
for (const value of ['1.5–2 hours', 'Counter-rotating', 'Permanent stain or odor removal cannot be promised', '$75', '$99', '$149', '$15']) assert.ok(methodGuide.includes(value), `Missing method-guide detail: ${value}`);
for (const value of ['one-hour dry', '95% less water', 'safe for kids', 'safe for pets', 'zero residue', 'no mold']) assert.doesNotMatch(methodGuide, new RegExp(value, 'i'), `Unsupported method-guide claim: ${value}`);
assert.doesNotMatch(methodGuide, /subsequent vacuum|later vacuum|carpet is vacuumed/i, 'Method guide must not imply that the customer receives unfinished carpet');
assert.doesNotMatch(html, /subsequent vacuum|later vacuum|carpet is finished with professional vacuuming/i, 'Homepage must not imply that the customer receives unfinished carpet');
const areaGuide = readFileSync(resolve(root, 'service-area/index.html'), 'utf8');
for (const value of ['Wichita', 'Derby', 'Andover', 'Goddard', 'Maize', 'Newton is outside', 'On-base military housing is not serviced']) assert.ok(areaGuide.includes(value), `Missing service-area detail: ${value}`);
assert.match(html, /<h1>Wichita-area carpet cleaning\./, 'Homepage must describe the broader Wichita-area coverage accurately');
const sitemap = readFileSync(resolve(root, 'sitemap.xml'), 'utf8');
for (const path of ['/low-moisture-carpet-cleaning/', '/service-area/', '/appointment-preparation/', '/property-managers/', '/derby-carpet-cleaning/', '/how-long-does-carpet-take-to-dry/', '/pet-urine-carpet-cleaning/', '/how-often-to-clean-carpet/', '/move-out-carpet-cleaning/']) assert.ok(sitemap.includes(`https://wichitacarpetcleaningservices.com${path}`), `Missing sitemap entry: ${path}`);
const preparationGuide = readFileSync(resolve(root, 'appointment-preparation/index.html'), 'utf8');
for (const value of ['Clear loose items', 'Protect breakables', 'Plan furniture', 'Keep pets comfortable', 'There is no cancellation fee']) assert.ok(preparationGuide.includes(value), `Missing preparation guidance: ${value}`);
assert.doesNotMatch(preparationGuide, /must (?:crate|remove)|pets? away|required to vacuum/i, 'Preparation guide must remain helpful rather than bossy');
const confirmationPage = readFileSync(resolve(root, 'booking-confirmed/index.html'), 'utf8');
assert.doesNotMatch(confirmationPage, /Secure pets|Move heavy furniture/, 'Booking confirmation must keep preparation guidance calm and optional');

for (const page of servicePages) {
  const content = readFileSync(resolve(root, page), 'utf8');
  const pageSchemas = [...content.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(match => JSON.parse(match[1]));
  const serviceSchema = pageSchemas.find(schema => schema['@type'] === 'Service');
  assert.match(content, /<link rel="canonical" href="https:\/\/wichitacarpetcleaningservices\.com\/services\//, `Missing apex canonical in ${page}`);
  assert.ok(content.includes('../../assets/service-pages.css'), `Missing service-page visual system in ${page}`);
  assert.ok(content.includes('../../assets/app.js'), `Missing booking attribution in ${page}`);
  assert.ok(content.includes(websiteBookingUrl), `Missing attributed booking path in ${page}`);
  assert.match(content, /Owner-operated|owner-operated/, `Missing local ownership proof in ${page}`);
  assert.match(content, /plus applicable tax/i, `Missing tax disclosure in ${page}`);
  assert.ok(serviceSchema, `Missing Service structured data in ${page}`);
  assert.equal(serviceSchema.provider['@id'], 'https://wichitacarpetcleaningservices.com/#business');
  assert.equal(serviceSchema.offers.priceCurrency, 'USD');
  assert.match(serviceSchema.url, /^https:\/\/wichitacarpetcleaningservices\.com\/services\//);
}

assert.doesNotMatch(html, /https:\/\/www\.wichitacarpetcleaningservices\.com/i, 'Homepage metadata must use the canonical apex domain');
assert.doesNotMatch(readFileSync(resolve(root, 'sitemap.xml'), 'utf8'), /https:\/\/www\.wichitacarpetcleaningservices\.com/i, 'Sitemap must use the canonical apex domain');
assert.doesNotMatch(readFileSync(resolve(root, 'robots.txt'), 'utf8'), /https:\/\/www\.wichitacarpetcleaningservices\.com/i, 'Robots sitemap reference must use the canonical apex domain');
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
assert.ok(recoveryPage.includes('http-equiv="refresh" content="2; url=/"'), '404 page must recover even when scripts are unavailable');
assert.ok(recoveryPage.includes('href="/assets/styles.css"'), '404 assets must work at nested obsolete paths');
assert.ok(recoveryPage.includes('src="/assets/brand-mark.svg"'), '404 logo must work at nested obsolete paths');
assert.match(recoveryScript, /new URL\("\/", current\.origin\)/, 'Missing-route recovery must return to the public homepage');
assert.match(recoveryScript, /destination\.search = current\.search/, 'Missing-route recovery must preserve campaign query parameters');
assert.match(recoveryScript, /sessionStorage\.setItem\("booking-source", "facebook"\)/, 'Missing-route recovery must preserve Facebook attribution');
assert.match(recoveryScript, /location\.replace\(destination\.href\)/, 'Missing-route recovery must replace the dead route');
assert.match(readFileSync(resolve(root, 'sitemap.xml'), 'utf8'), /<lastmod>2026-10-01<\/lastmod>/);
const confirmationCss = readFileSync(resolve(root, 'assets/confirmation.css'), 'utf8');
assert.ok(confirmationCss.includes('.confirmation-page *{letter-spacing:0}'), 'Confirmation page must use normal letter spacing');
assert.ok(confirmationCss.includes('.confirmation-actions .button{color:var(--ink)}'), 'Confirmation primary button must keep dark text on lime');
for (const file of readdirSync(resolve(root, 'assets')).filter(name => name.endsWith('.js'))) {
  const code = readFileSync(resolve(root, 'assets', file), 'utf8');
  assert.doesNotMatch(code, /(?:\$25|24-hour).{0,40}cancell|cancell.{0,40}(?:\$25|24-hour)/i, `Retired cancellation fee policy in ${file}`);
  assert.doesNotMatch(code, /(?:\+?1[ .-]?)?\(?316\)?[ .-]?209[ .-]?2176/, `Private owner phone exposed in ${file}`);
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

const managerGuide = readFileSync(resolve(root, 'property-managers/index.html'), 'utf8');
for (const value of ['$75', '$85', '$99', '$149', '$15', 'Openings start two days out', 'One unit per booking', 'Payment is due on receipt', 'certificate of insurance', 'Permanent stain or odor removal cannot be promised', 'plus applicable tax']) assert.ok(managerGuide.includes(value), `Missing property-manager detail: ${value}`);
for (const value of ['same day', 'same-day', 'volume', 'discount', 'free unit', 'net 30', 'monthly invoic', 'photos of every']) assert.doesNotMatch(managerGuide, new RegExp(value, 'i'), `Property-manager page must not promise: ${value}`);

const derbyPage = readFileSync(resolve(root, 'derby-carpet-cleaning/index.html'), 'utf8');
for (const value of ['$75', '$85', '$99', '$149', '$15', 'plus applicable tax', 'Monday through Friday', '1.5–2 hours', 'Derby']) assert.ok(derbyPage.includes(value), `Missing Derby page detail: ${value}`);
for (const value of ['discount', '% off', 'call us', 'free estimate']) assert.ok(!derbyPage.toLowerCase().includes(value), `Unapproved Derby page claim: ${value}`);
assert.ok(areaGuide.includes('href="../derby-carpet-cleaning/"'), 'Service area must link the Derby page');
const dryGuide = readFileSync(resolve(root, 'how-long-does-carpet-take-to-dry/index.html'), 'utf8');
for (const value of ['1.5 to 2 hours', 'not guaranteed', '$99', '$149', 'plus applicable tax'.replace('plus', 'Plus')]) assert.ok(dryGuide.includes(value), `Missing dry-time guide detail: ${value}`);
for (const value of ['one-hour dry', 'safe for kids', 'safe for pets', 'no mold']) assert.doesNotMatch(dryGuide, new RegExp(value, 'i'), `Unsupported dry-time claim: ${value}`);
for (const slug of ['pet-urine-carpet-cleaning', 'how-often-to-clean-carpet', 'move-out-carpet-cleaning']) {
  const guide = readFileSync(resolve(root, `${slug}/index.html`), 'utf8');
  for (const value of ['$99', '$149', 'Plus applicable tax', 'Monday through Friday', 'FAQPage']) assert.ok(guide.includes(value), `Missing ${slug} detail: ${value}`);
  for (const value of ['guarantee', 'safe for kids', 'safe for pets', 'no mold', 'allerg', 'discount', '% off']) assert.doesNotMatch(guide, new RegExp(value, 'i'), `Unsupported claim in ${slug}: ${value}`);
}
