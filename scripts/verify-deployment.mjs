import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
const origin = 'https://commandor.ai';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
async function list(dir, prefix = '') {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = prefix + entry.name;
    if (entry.isDirectory()) result.push(...await list(`${dir}/${entry.name}`, `${file}/`));
    else if (entry.isFile() && !['_headers', '_redirects'].includes(file)) result.push(file);
    else if (!entry.isFile()) throw new Error(`Unexpected artifact entry: ${file}`);
  }
  return result.sort();
}
const manifest = await Promise.all((await list('dist')).map(async file => [file, hash(await readFile(`dist/${file}`))]));
assert(manifest.some(([f]) => f === 'index.html') && manifest.some(([f]) => f === 'privacy/index.html'));
async function verify() {
  let deployment;
  if (process.env.GITHUB_SHA) {
    const { GITHUB_SHA, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN } = process.env;
    assert(/^[a-f0-9]{40}$/.test(GITHUB_SHA), 'Invalid expected commit');
    assert(CLOUDFLARE_ACCOUNT_ID && CLOUDFLARE_API_TOKEN, 'Missing release credentials');
    const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects/commandor-web`, { headers: { Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}` }, signal: AbortSignal.timeout(10000) });
    assert.equal(r.status, 200, 'Cloudflare verification status');
    const data = await r.json(); assert.equal(data.success, true);
    const d = data.result.canonical_deployment;
    assert.equal(d?.environment, 'production'); assert.equal(d?.latest_stage?.status, 'success');
    assert.equal(d?.deployment_trigger?.metadata?.branch, 'main');
    assert.equal(d?.deployment_trigger?.metadata?.commit_hash, GITHUB_SHA, 'Production commit differs from workflow');
    deployment = d.id;
  }
  for (const [file, expected] of manifest) {
    const path = '/' + (file.endsWith('index.html') ? file.slice(0, -10) : file);
    const r = await fetch(origin + path, { signal: AbortSignal.timeout(10000) });
    assert.equal(r.status, 200, path);
    assert.equal(hash(Buffer.from(await r.arrayBuffer())), expected, `Production bytes differ: ${path}`);
  }
  console.log(`PASS: ${manifest.length} production files${deployment ? `; deployment ${deployment}, main ${process.env.GITHUB_SHA}` : ''}`);
}
for (let attempt = 1; attempt <= 6; attempt++) {
  try { await verify(); break; }
  catch (error) {
    if (attempt === 6) throw error;
    console.error(`Verification attempt ${attempt}: ${error.message}`);
    await delay(3000);
  }
}
