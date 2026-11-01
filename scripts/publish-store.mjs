#!/usr/bin/env node
import { readFileSync, appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const required = {
  chrome: ['CHROME_PUBLISHER_ID', 'CHROME_EXTENSION_ID', 'CHROME_CLIENT_ID', 'CHROME_CLIENT_SECRET', 'CHROME_REFRESH_TOKEN'],
  edge: ['EDGE_PRODUCT_ID', 'EDGE_CLIENT_ID', 'EDGE_API_KEY'],
};

export function checkConfig(store, env = process.env) {
  if (!required[store]) throw new Error('Store must be chrome or edge');
  const missing = required[store].filter(key => !env[key]?.trim());
  if (missing.length) throw new Error(`Missing configuration: ${missing.join(', ')}`);
  const id = store === 'chrome' ? env.CHROME_PUBLISHER_ID : env.EDGE_PRODUCT_ID;
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error('Invalid publisher/product ID');
  if (store === 'chrome' && !/^[a-p]{32}$/.test(env.CHROME_EXTENSION_ID)) throw new Error('Invalid Chrome extension ID');
}

export async function publishStore(store, zip, version, {
  env = process.env, fetchImpl = fetch, wait = sleep, attempts = 60,
  report = message => {
    console.log(message);
    if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, `${message}\n\n`);
  },
} = {}) {
  checkConfig(store, env);
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Invalid release version');
  async function request(url, options = {}, expected = 200) {
    let response;
    try {
      response = await fetchImpl(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(30000) });
    } catch {
      throw new Error('Store request failed or timed out. Check the store dashboard before retrying.');
    }
    // Do not log response bodies: authentication endpoints can echo credentials.
    if (response.status !== expected) throw new Error(`Store request returned HTTP ${response.status}. Check the store dashboard before retrying.`);
    return response;
  }
  async function json(response) {
    try {
      return await response.json();
    } catch {
      throw new Error('Store returned invalid JSON; check the dashboard before retrying.');
    }
  }
  async function poll(read, done) {
    for (let i = 0; i < attempts; i++) {
      const result = await read();
      if (done(result)) return result;
      if (i + 1 < attempts) await wait(10000);
    }
    throw new Error('Store processing timed out. Check the recorded operation in the dashboard before retrying.');
  }

  if (store === 'chrome') {
    const tokenResponse = await request('https://oauth2.googleapis.com/token', {
      method: 'POST', body: new URLSearchParams({
        grant_type: 'refresh_token', client_id: env.CHROME_CLIENT_ID,
        client_secret: env.CHROME_CLIENT_SECRET, refresh_token: env.CHROME_REFRESH_TOKEN,
      }),
    });
    const token = (await json(tokenResponse)).access_token;
    if (typeof token !== 'string' || !token) throw new Error('OAuth response did not contain an access token');
    const headers = { Authorization: `Bearer ${token}` };
    const name = `publishers/${env.CHROME_PUBLISHER_ID}/items/${env.CHROME_EXTENSION_ID}`;
    const base = `https://chromewebstore.googleapis.com/v2/${name}`;
    const status = await json(await request(`${base}:fetchStatus`, { headers }));
    const channels = revision => revision?.distributionChannels || [];
    const includesVersion = revision => channels(revision).some(channel => channel.crxVersion === version);
    if (includesVersion(status.publishedItemRevisionStatus)) {
      report(`Chrome ${version}: already published; no changes made.`);
      return;
    }
    const submitted = status.submittedItemRevisionStatus;
    if (submitted && ['PENDING_REVIEW', 'STAGED'].includes(submitted.state)) {
      if (includesVersion(submitted)) {
        report(`Chrome ${version}: already ${submitted.state}; no changes made.`);
        return;
      }
      throw new Error('Another Chrome version is pending review or staged. Resolve it in the dashboard first.');
    }
    let upload = await json(await request(`https://chromewebstore.googleapis.com/upload/v2/${name}:upload`, {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/zip' }, body: zip,
    }));
    const uploadState = data => data.uploadState || data.lastAsyncUploadState;
    if (['IN_PROGRESS', 'UPLOAD_IN_PROGRESS'].includes(uploadState(upload))) {
      upload = await poll(async () => json(await request(`${base}:fetchStatus`, { headers })), data => {
        const state = uploadState(data);
        if (['IN_PROGRESS', 'UPLOAD_IN_PROGRESS'].includes(state)) return false;
        if (state !== 'SUCCEEDED') throw new Error('Chrome upload did not succeed; submission stopped');
        return true;
      });
    }
    if (uploadState(upload) !== 'SUCCEEDED') throw new Error('Chrome upload did not succeed; submission stopped');
    if (upload.crxVersion && upload.crxVersion !== version) throw new Error('Chrome uploaded version does not match the release');
    const result = await json(await request(`${base}:publish`, {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ publishType: 'DEFAULT_PUBLISH', skipReview: false, blockOnWarnings: true }),
    }));
    if (!['PENDING_REVIEW', 'PUBLISHED', 'PUBLISHED_TO_TESTERS'].includes(result.state)) {
      throw new Error('Chrome returned an unexpected submission state; check the dashboard');
    }
    report(`Chrome ${version}: ${result.state}. Store review still applies; this is not proof of public availability.`);
    return;
  }

  const headers = { Authorization: `ApiKey ${env.EDGE_API_KEY}`, 'X-ClientID': env.EDGE_CLIENT_ID };
  const base = `https://api.addons.microsoftedge.microsoft.com/v1/products/${env.EDGE_PRODUCT_ID}/submissions`;
  function operationId(response) {
    const location = response.headers.get('location');
    // Never follow a server-provided URL with our credentials. Extract only its ID.
    const id = location?.split('/').filter(Boolean).at(-1);
    if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error('Edge did not return a valid operation ID');
    return id;
  }
  async function waitForEdge(url) {
    await poll(async () => json(await request(url, { headers })), data => {
      if (data.status === 'InProgress') return false;
      if (data.status !== 'Succeeded') throw new Error('Edge operation did not succeed; check the dashboard');
      return true;
    });
  }
  const upload = await request(`${base}/draft/package`, {
    method: 'POST', headers: { ...headers, 'Content-Type': 'application/zip' }, body: zip,
  }, 202);
  const uploadId = operationId(upload);
  report(`Edge ${version}: upload operation ${uploadId} accepted.`);
  await waitForEdge(`${base}/draft/package/operations/${uploadId}`);
  const submission = await request(base, {
    method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes: `Better Classroom ${version}. Bug fixes and improvements; see the matching GitHub release.` }),
  }, 202);
  const publishId = operationId(submission);
  report(`Edge ${version}: submission operation ${publishId} accepted.`);
  await waitForEdge(`${base}/operations/${publishId}`);
  report(`Edge ${version}: submission processing succeeded. Check Partner Center for certification and public availability.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [store, path, version] = process.argv.slice(2);
    if (path === '--check-config') checkConfig(store);
    else await publishStore(store, readFileSync(path), version);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
