import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
const config=JSON.parse(await readFile(new URL('../web/vercel.json',import.meta.url),'utf8'));
createServer(async(req,res)=>{
 const pathname=new URL(req.url,'http://127.0.0.1').pathname;
 const file={'/':'index.html','/index.html':'index.html','/styles.css':'styles.css','/workbench.js':'workbench.js'}[pathname];
 if(!file){res.writeHead(404);return res.end();}
 for(const h of config.headers[0].headers)res.setHeader(h.key,h.value);
 res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':'application/javascript');
 res.end(await readFile(new URL('../web/'+file,import.meta.url)));
}).listen(4187,'127.0.0.1');
