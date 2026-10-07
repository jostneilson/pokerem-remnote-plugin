import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'public/manifest.json'),'utf8'));
const repo=new URL(manifest.repoUrl);
if(repo.hostname!=='github.com') throw new Error('Expected GitHub repository');
const prefix=`https://raw.githubusercontent.com${repo.pathname}/`;
const readme=fs.readFileSync(path.join(root,'README.md'),'utf8');
const urls=[...readme.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map(m=>m[1]);
if(!urls.length) throw new Error('Marketplace README has no screenshots');
let failed=false;
for(const url of urls){
 try {
  if(!url.startsWith(prefix)) throw new Error('Wrong listing image host/repository');
  const match=url.slice(prefix.length).match(/^([a-f0-9]{40})\/(public\/assets\/screenshots\/[a-z0-9-]+\.(jpg|png))$/);
  if(!match) throw new Error('Image must be pinned to a full commit SHA and screenshot path');
  const [,commit,relative,extension]=match;
  const bytes=fs.readFileSync(path.join(root,relative));
  const valid=extension==='jpg'?bytes[0]===0xff&&bytes[1]===0xd8:bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if(!valid) throw new Error('Image signature does not match its extension');
  if(process.argv.includes('--remote')){
   const response=await fetch(url,{signal:AbortSignal.timeout(20000)});
   if(!response.ok) throw new Error(`Public image returned HTTP ${response.status}`);
   if(!response.headers.get('content-type')?.startsWith('image/')) throw new Error('Public response is not an image');
   if(!Buffer.from(await response.arrayBuffer()).equals(bytes)) throw new Error('Public image differs from bundled image');
   console.log('Public image verified:',relative);
  } else console.log('Bundled image:',relative,bytes.length,'bytes');
 }catch(error){console.error(url,error.message);failed=true;}
}
if(failed) process.exit(1);
console.log('All listing screenshots verified. Confirm image rendering in the RemNote listing after upload.');
