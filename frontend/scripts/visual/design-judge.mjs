// Judge a rendered screenshot against the approved mockup + known-good references
// using the Claude vision API. Exits 0 (pass) / 1 (fail) / 2 (error). Prints the verdict.
// Usage: node scripts/visual/design-judge.mjs --render=<png> --mockup=<png> --ref=<png> [--ref=<png>...]
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const vals = (k) => args.filter((a) => a.startsWith(`--${k}=`)).map((a) => a.slice(k.length + 3));
const renderPath = vals('render')[0];
const mockupPath = vals('mockup')[0];
const refPaths = vals('ref');
if (!renderPath || !mockupPath) { console.error('need --render and --mockup'); process.exit(2); }

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) { console.error('ANTHROPIC_API_KEY not set'); process.exit(2); }

const img = (p) => ({
  type: 'image',
  source: { type: 'base64', media_type: 'image/png', data: readFileSync(p).toString('base64') },
});

const content = [
  { type: 'text', text:
    "REFERENCE SCREENSHOTS — real, current, correct FRED pages. Use them as the bar for the app's " +
    "established design language (color, typography, spacing, header style) and for how much top space " +
    'the notch/safe-area gets:' },
  ...refPaths.map(img),
  { type: 'text', text: 'APPROVED MOCKUP — the design the builder was asked to implement for this story:' },
  img(mockupPath),
  { type: 'text', text: 'ACTUAL RENDER — what the app produced on an iPhone-sized viewport:' },
  img(renderPath),
  { type: 'text', text:
    'Judge the ACTUAL RENDER. It must (a) match the APPROVED MOCKUP and (b) fit the established design ' +
    'language and notch/safe-area spacing shown in the references. Fail ONLY on clear, describable drift — ' +
    'wrong spacing, color, font, radius, alignment, missing/extra elements, content overflow/clipping, or ' +
    'header/notch spacing that is obviously off. Do not fail on subjective taste or sub-pixel differences. ' +
    'Return verdict "pass" or "fail", a one-line summary, and a list of concrete, builder-actionable drift ' +
    'items (empty when pass).' },
];

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    verdict: { type: 'string', enum: ['pass', 'fail'] },
    summary: { type: 'string' },
    drift: { type: 'array', items: { type: 'string' } },
  },
  required: ['verdict', 'summary', 'drift'],
};

const res = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    model: 'claude-opus-4-8',
    max_tokens: 1024,
    output_config: { format: { type: 'json_schema', schema: SCHEMA } },
    messages: [{ role: 'user', content }],
  }),
});

if (!res.ok) { console.error(`API ${res.status}: ${await res.text()}`); process.exit(2); }
const data = await res.json();
if (data.stop_reason === 'refusal') { console.error('vision request refused'); process.exit(2); }
const text = (data.content || []).find((b) => b.type === 'text')?.text;
if (!text) { console.error('no text block in response'); process.exit(2); }
const out = JSON.parse(text);

console.log(`verdict: ${out.verdict}`);
console.log(`summary: ${out.summary}`);
if (out.drift?.length) { console.log('drift:'); out.drift.forEach((d) => console.log(`  - ${d}`)); }
process.exit(out.verdict === 'pass' ? 0 : 1);
