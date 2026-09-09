import { readFileSync, existsSync } from 'node:fs';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const expected = ['36104bbb2c7d409a8293445c570b5f8b?v2=true','mailto:info@wichitacarpetcleaningservices.com','facebook.com/wichitacarpetcleaningservices','$99','$149','$15','5 rooms','2 hallways','1 standard staircase'];
for (const value of expected) if (!html.includes(value)) throw new Error(`Missing: ${value}`);
for (const path of ['../CNAME','../robots.txt','../sitemap.xml','../assets/styles.css','../assets/app.js']) if (!existsSync(new URL(path, import.meta.url))) throw new Error(`Missing file: ${path}`);
for (const value of ['Oxi Fresh','CRI certified','CRI approved','zero residue','no mold risk','permanently eliminate']) if (html.toLowerCase().includes(value.toLowerCase())) throw new Error(`Unsupported public claim: ${value}`);
for (const page of ['../privacy-policy/index.html','../terms-of-service/index.html','../accessibility/index.html']) { const text=readFileSync(new URL(page, import.meta.url),'utf8'); if (/href="tel:/i.test(text)||/\bcall\s*</i.test(text)) throw new Error(`Unexpected public call path: ${page}`); }
const businessSchema = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)?.[1];
if (!businessSchema) throw new Error('Missing LocalBusiness schema');
const schema = JSON.parse(businessSchema);
if (schema.openingHoursSpecification?.[0]?.opens !== '07:00') throw new Error('Structured hours do not match the business schedule');
if (!schema.sameAs?.includes('https://www.facebook.com/wichitacarpetcleaningservices')) throw new Error('Structured Facebook link missing');
if (schema.hasOfferCatalog?.itemListElement?.length !== 3) throw new Error('Structured offer catalog missing');
const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
if(new Set(ids).size!==ids.length) throw new Error('Duplicate IDs');
console.log('Site checks passed.');
