#!/usr/bin/env node
/**
 * Single source of truth: public/manifest.json version.{major,minor,patch}
 * Must match package.json "version", package-lock root "version", and POKEREM_VERSION in src/releaseMeta.ts
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function readJson(p) {
  return JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
}

const manifest = readJson('public/manifest.json');
const v = manifest.version;
if (!v || typeof v.major !== 'number') {
  console.error('public/manifest.json: missing version.major/minor/patch');
  process.exit(1);
}
const canonical = `${v.major}.${v.minor}.${v.patch}`;

const pkg = readJson('package.json');
const lock = readJson('package-lock.json');
const lockRoot = lock.version;
const lockPkg = lock.packages?.['']?.version;

const metaPath = path.join(root, 'src/releaseMeta.ts');
const meta = fs.readFileSync(metaPath, 'utf8');
const m = meta.match(/export const POKEREM_VERSION = ['"]([^'"]+)['"]/);
const metaVer = m?.[1];

const rows = [
  ['public/manifest.json (canonical)', canonical],
  ['package.json version', pkg.version],
  ['package-lock.json root .version', lockRoot],
  ["package-lock.json packages[''].version", lockPkg],
  ['src/releaseMeta.ts POKEREM_VERSION', metaVer],
];

let ok = true;
for (const [label, val] of rows) {
  const match = val === canonical;
  if (!match) ok = false;
  console.log(`${match ? '✓' : '✗'} ${label}: ${val ?? '(missing)'}`);
}

if (!ok) {
  console.error('\nMismatch: bump public/manifest.json first, then align package.json, npm install --package-lock-only, and src/releaseMeta.ts POKEREM_VERSION.');
  process.exit(1);
}

console.log('\nAll plugin release versions aligned on', canonical);
process.exit(0);
