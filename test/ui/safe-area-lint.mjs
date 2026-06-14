#!/usr/bin/env node
/**
 * FRED safe-area static linter — the always-on net under Phase 3.
 *
 * Runs with ZERO network and ZERO browser. Pure SCSS/HTML analysis. This is the
 * floor of device-visual fidelity: even when neither headless Chrome nor the iOS
 * Simulator is available in the sandbox, this still catches the FRED-124 class of
 * bug by reasoning about the source.
 *
 * RULE (the FRED-124 rule):
 *   Any element that pins itself to the TOP of the screen — `position: fixed`/`sticky`
 *   with top:0, OR a bespoke header <div> that is a direct child of <ion-header> (Ionic
 *   does NOT auto-apply safe-area insets to a custom div inside ion-header) — MUST
 *   account for env(safe-area-inset-top). If its only top spacing is a small hardcoded
 *   pixel value (< 44px, the notch height) and the rule/selector contains no
 *   safe-area-inset-top, flag it.
 *
 * This would have caught change-bank-account.page.scss:27 (.blue-hero-header has
 * `padding: 10px 20px 40px 20px`, no safe-area-inset-top) the moment FRED-124 was built.
 *
 * Usage:
 *   node test/ui/safe-area-lint.mjs --files="frontend/src/app/change-bank-account/*.scss,...html"
 *   node test/ui/safe-area-lint.mjs                 # lint everything under frontend/src
 *
 * Exit code: 0 = clean, 1 = at least one safe-area offender found.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, extname } from 'node:path';

const NOTCH_MIN = 44; // px — below this, top spacing cannot clear a notch/Dynamic Island

// Global utility classes that supply env(safe-area-inset-top) from global.scss.
// An element carrying one of these is already safe even if its component SCSS never mentions insets.
const GLOBAL_SAFE_TOP_CLASSES = ['safe-area-top'];

function arg(name, dflt) {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : dflt;
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) { if (name !== 'node_modules') walk(p, out); }
    else if (['.scss', '.css', '.html'].includes(extname(p))) out.push(p);
  }
  return out;
}

// Split SCSS into top-level rule blocks (selector + body) — naive but effective.
function ruleBlocks(scss) {
  const blocks = [];
  let depth = 0, buf = '', selStart = 0;
  for (let i = 0; i < scss.length; i++) {
    const c = scss[i];
    buf += c;
    if (c === '{') {
      if (depth === 0) selStart = buf.lastIndexOf('}') + 1;
      depth++;
    } else if (c === '}') {
      depth--;
      if (depth === 0) {
        const block = buf.slice(selStart).trim();
        const sel = block.slice(0, block.indexOf('{')).trim();
        blocks.push({ selector: sel, body: block, index: i });
      }
    }
  }
  return blocks;
}

function lineOf(text, idx) { return text.slice(0, idx).split('\n').length; }

const offenders = [];

function lintScss(file, text) {
  const blocks = ruleBlocks(text);
  for (const b of blocks) {
    const body = b.body;
    const isTopPinned =
      /position\s*:\s*(fixed|sticky)/.test(body) &&
      (/\btop\s*:\s*0(px|%)?\b/.test(body) || /\.hero|header|toolbar|nav|status-?bar/i.test(b.selector));
    const looksLikeHeader =
      /(^|[\s.>])(ion-header|.*hero-header|custom-profile-header|app-header|page-header)\b/i.test(b.selector);
    if (!isTopPinned && !looksLikeHeader) continue;

    // A rule FOR a global safe-top utility class itself supplies env(safe-area-inset-top)
    // at the global level; don't flag the utility's own component-side declaration.
    if (GLOBAL_SAFE_TOP_CLASSES.some(c => b.selector.includes('.' + c))) continue;

    const hasSafeTop = /safe-area-inset-top/.test(body);
    if (hasSafeTop) continue; // good citizen

    // does it have any *small* hardcoded top spacing that would leave it under the notch?
    const padTop = [...body.matchAll(/padding(-top)?\s*:\s*([0-9.]+)px/g)].map(m => parseFloat(m[2]));
    const marginTop = [...body.matchAll(/margin-top\s*:\s*([0-9.]+)px/g)].map(m => parseFloat(m[1]));
    const smallestTop = Math.min(...[...padTop, ...marginTop, Infinity]);

    // If it pins to top / is a header AND lacks safe-area-inset-top AND its top spacing is
    // either absent or smaller than a notch, it cannot clear the notch.
    if (smallestTop < NOTCH_MIN) {
      offenders.push({
        file, line: lineOf(text, b.index),
        selector: b.selector.replace(/\s+/g, ' ').slice(0, 80),
        reason: smallestTop === Infinity
          ? 'top-pinned/header with no safe-area-inset-top and no top spacing'
          : `top spacing ${smallestTop}px < ${NOTCH_MIN}px notch and no safe-area-inset-top`,
      });
    }
  }
}

function lintHtml(file, text) {
  // Flag a bespoke <div> placed directly inside <ion-header> (Ionic won't inset it).
  // We only RECORD this; the SCSS lint decides severity. But a hero div in ion-header
  // with no matching safe-area rule anywhere in its sibling SCSS is the FRED-124 shape.
  const m = text.match(/<ion-header[^>]*>\s*<div([^>]*)>/i);
  if (m) {
    const clsAttr = (m[1].match(/class\s*=\s*"([^"]*)"/) || [])[1] || '';
    const classList = clsAttr.split(/\s+/);
    if (classList.some(c => GLOBAL_SAFE_TOP_CLASSES.includes(c))) return; // safe via global utility class
    const cls = clsAttr || '(no class)';
    offenders.push({
      file, line: lineOf(text, m.index),
      selector: `ion-header > div.${cls}`,
      reason: 'bespoke header <div> inside <ion-header> — Ionic does NOT auto-apply ' +
              'safe-area-inset-top here; verify its SCSS adds padding-top: env(safe-area-inset-top)',
      advisory: true,
    });
  }
}

function main() {
  const filesArg = arg('files', '');
  let files;
  if (filesArg) {
    files = filesArg.split(',').map(f => resolve(f.trim())).filter(Boolean);
  } else {
    files = walk(resolve('frontend/src'));
  }

  for (const f of files) {
    let text;
    try { text = readFileSync(f, 'utf8'); } catch { continue; }
    if (extname(f) === '.html') lintHtml(f, text);
    else lintScss(f, text);
  }

  // Pair HTML advisories with SCSS hard-flags: a header div in ion-header is only a HARD
  // failure if the sibling SCSS has no safe-area-inset-top at all.
  const hard = offenders.filter(o => !o.advisory);
  const advisories = offenders.filter(o => o.advisory).filter(adv => {
    const dir = adv.file.replace(/\.page\.html$/, '');
    const sib = files.find(f => f.startsWith(dir) && f.endsWith('.scss'));
    if (!sib) return true;
    return !readFileSync(sib, 'utf8').includes('safe-area-inset-top');
  });

  const all = [...hard, ...advisories];
  if (all.length === 0) {
    console.log('[safe-area-lint] clean — no top-pinned element is missing safe-area-inset-top');
    process.exit(0);
  }
  console.error('[safe-area-lint] SAFE-AREA OFFENDERS (FRED-124 class):');
  for (const o of all) {
    console.error(`  ${o.file}:${o.line}`);
    console.error(`     selector: ${o.selector}`);
    console.error(`     ${o.reason}`);
  }
  // Hard offenders fail the gate; pure advisories (paired & unresolved) also fail,
  // because an un-inset header div in ion-header is exactly the shipped FRED-124 bug.
  process.exit(1);
}

main();
