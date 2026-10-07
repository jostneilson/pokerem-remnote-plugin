import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'public/manifest.json'),'utf8'));
const {major,minor,patch}=manifest.version;
const prefix=`https://remnoteplugins.com/${manifest.id}/${major}.${minor}.${patch}/`;
const readme=fs.readFileSync(path.join(root,'README.md'),'utf8');
const urls=[...readme.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map(m=>m[1]);
if(!urls.length) throw new Error('Marketplace README has no screenshots');
let failed=false;
for(const url of urls){
 if(!url.startsWith(prefix)){console.error('Wrong listing image host/version:',url);failed=true;continue;}
 const relative=url.slice(prefix.length);
 const file=path.join(root,'public',relative);
 if(!fs.existsSync(file)){console.error('Missing current-release screenshot:',relative);failed=true;continue;}
 const bytes=fs.readFileSync(file);
 const valid=bytes[0]===0xff&&bytes[1]===0xd8 || bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
 if(!valid){console.error('Not a valid JPG/PNG signature:',relative);failed=true;continue;}
 console.log('Bundled image:',relative,bytes.length,'bytes');
}
if(failed) process.exit(1);
console.log('All listing screenshots are present and use release-specific absolute URLs. Verify public rendering after marketplace upload.');
