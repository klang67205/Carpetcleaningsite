import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
const root = new URL('..', import.meta.url).pathname.slice(1);
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.xml':'application/xml','.txt':'text/plain'};
createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';try{const file=join(root,p);if(!statSync(file).isFile())throw 0;res.writeHead(200,{'content-type':types[extname(file)]||'application/octet-stream'});res.end(readFileSync(file));}catch{res.writeHead(404);res.end('Not found');}}).listen(4173,'127.0.0.1');
