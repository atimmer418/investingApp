#!/usr/bin/env node
// Run from frontend/ directory: npm run subset-icons
// Re-run whenever you add a new icon to a template.
// If you return an icon name from a TS function (not a template literal), add it to DYNAMIC_ICONS below.

import { readFile, writeFile, readdir, stat, access } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync, execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND_ROOT = resolve(__dirname, '..');
const SOURCE_FONT = join(__dirname, 'material-symbols-source.woff2');
const OUTPUT_FONT = join(FRONTEND_ROOT, 'src', 'assets', 'fonts', 'material-symbols-outlined.woff2');
const SRC_DIR = join(FRONTEND_ROOT, 'src');
const VENV_DIR = join(__dirname, '.venv');

// Icons returned by TS functions as string literals — not detectable by HTML scanning.
// Add new ones here when needed (e.g. from iconForState(), dynamic class bindings).
const DYNAMIC_ICONS = ['check', 'arrow_upward', 'lock', 'schedule'];

async function* walkHtml(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) yield* walkHtml(p);
    else if (entry.name.endsWith('.html')) yield p;
  }
}

async function findIcons() {
  const icons = new Set(DYNAMIC_ICONS);
  // Matches: class="material-symbols-outlined [optional extra classes]" [optional attrs] > icon_name <
  const pattern = /class="[^"]*material-symbols-outlined[^"]*"[^>]*>\s*([a-z][a-z0-9_]*)\s*</g;
  for await (const file of walkHtml(SRC_DIR)) {
    const content = await readFile(file, 'utf8');
    for (const m of content.matchAll(pattern)) icons.add(m[1]);
  }
  return [...icons].sort();
}

async function ensurePyftsubset() {
  const pyftsubset = join(VENV_DIR, 'bin', 'pyftsubset');
  try {
    await access(pyftsubset);
  } catch {
    console.log('First run: setting up fonttools venv (one-time, ~5 s)...');
    execSync(`python3 -m venv "${VENV_DIR}"`, { stdio: 'inherit' });
    execSync(`"${join(VENV_DIR, 'bin', 'pip')}" install fonttools brotli -q`, { stdio: 'inherit' });
  }
  return pyftsubset;
}

async function main() {
  const icons = await findIcons();
  console.log(`\nFound ${icons.length} Material Symbols icons:`);
  for (const name of icons) console.log(`  ${name}`);

  const pyftsubset = await ensurePyftsubset();
  const sourceStat = await stat(SOURCE_FONT);
  console.log(`\nSource: ${(sourceStat.size / 1024 / 1024).toFixed(2)} MB`);

  console.log('Subsetting...');
  execFileSync(pyftsubset, [
    SOURCE_FONT,
    `--output-file=${OUTPUT_FONT}`,
    '--flavor=woff2',
    // --text: include letter glyphs needed to form the ligature input sequences
    `--text=${icons.join(' ')}`,
    // --glyphs: explicitly include the icon glyphs (targets of the ligature lookups)
    `--glyphs=${icons.join(',')}`,
    '--no-layout-closure',      // don't expand to ALL icons reachable via GSUB
    '--layout-features=liga,rlig,calt',
    '--no-hinting',
  ], { stdio: 'pipe' });

  const outStat = await stat(OUTPUT_FONT);
  console.log(`Subset:  ${(outStat.size / 1024).toFixed(1)} KB`);
  console.log(`Written: src/assets/fonts/material-symbols-outlined.woff2`);
  console.log('\nDone. Run "npx cap sync ios" to deploy to device.\n');
}

main().catch(err => {
  console.error('\nError:', err.message || err);
  process.exit(1);
});
