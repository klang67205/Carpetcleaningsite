import { readFileSync, existsSync } from 'node:fs';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const expected = ['36104bbb2c7d409a8293445c570b5f8b?v2=true','tel:3162092176','mailto:info@wichitacarpetcleaningservices.com','facebook.com/wichitacarpetcleaningservices','$99','$149','$15','5 rooms','2 hallways','1 standard staircase'];
for (const value of expected) if (!html.includes(value)) throw new Error(`Missing: ${value}`);
for (const path of ['../CNAME','../robots.txt','../sitemap.xml','../assets/styles.css','../assets/app.js']) if (!existsSync(new URL(path, import.meta.url))) throw new Error(`Missing file: ${path}`);
for (const value of ['Oxi Fresh','CRI certified','CRI approved','zero residue','no mold risk','permanently eliminate']) if (html.toLowerCase().includes(value.toLowerCase())) throw new Error(`Unsupported public claim: ${value}`);
const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
if(new Set(ids).size!==ids.length) throw new Error('Duplicate IDs');
console.log('Site checks passed.');
