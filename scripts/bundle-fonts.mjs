import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fonts=[['Pixelify Sans','pixelify-sans.ttf','400 700'],['Press Start 2P','press-start-2p.ttf','400']];
const css=fonts.map(([family,file,weight])=>{
 const bytes=fs.readFileSync(path.join(root,'public/assets/fonts',file));
 return `@font-face{font-family:'${family}';src:url('data:font/ttf;base64,${bytes.toString('base64')}') format('truetype');font-weight:${weight};font-display:swap;}`;
}).join('\n');
fs.writeFileSync(path.join(root,'src/arcade-fonts.generated.css'),css+'\n');
console.log('Bundled pixel font data into widget CSS.');
