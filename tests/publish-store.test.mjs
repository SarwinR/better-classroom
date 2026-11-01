import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkConfig, publishStore } from '../scripts/publish-store.mjs';

const env = {
  CHROME_PUBLISHER_ID: 'publisher', CHROME_EXTENSION_ID: 'maibneeahfkanhakkogkbcakcadjejkl',
  CHROME_CLIENT_ID: 'client', CHROME_CLIENT_SECRET: 'secret', CHROME_REFRESH_TOKEN: 'refresh',
  EDGE_PRODUCT_ID: 'product', EDGE_CLIENT_ID: 'edge-client', EDGE_API_KEY: 'edge-secret',
};
function harness(responses) {
  const calls = [], reports = [];
  return {
    calls, reports,
    options: { env, wait: async () => {}, attempts: 3, report: message => reports.push(message),
      fetchImpl: async (url, options) => {
        calls.push({ url, ...options });
        const next = responses.shift();
        assert.ok(next, `unexpected request ${url}`);
        return new Response(JSON.stringify(next.body ?? {}), { status: next.status ?? 200, headers: next.headers });
      },
    },
  };
}
const token = { body: { access_token: 'access-token' } };
const upload = { body: { uploadState: 'SUCCEEDED', crxVersion: '1.1.9' } };

test('configuration rejects missing secrets, unknown stores and unsafe IDs', () => {
  assert.throws(() => checkConfig('chrome', {}), /Missing configuration/);
  assert.throws(() => checkConfig('unknown', env), /Store must/);
  assert.throws(() => checkConfig('edge', { ...env, EDGE_PRODUCT_ID: '../other' }), /Invalid/);
  assert.throws(() => checkConfig('chrome', { ...env, CHROME_EXTENSION_ID: 'wrong' }), /Invalid/);
});

test('Chrome refreshes OAuth, uploads raw ZIP, and submits for normal review', async () => {
  const h = harness([token, {}, upload, { body: { state: 'PENDING_REVIEW' } }]);
  const zip = Buffer.from('zip');
  await publishStore('chrome', zip, '1.1.9', h.options);
  assert.equal(h.calls.length, 4);
  assert.equal(h.calls[0].body.get('grant_type'), 'refresh_token');
  assert.equal(h.calls[2].body, zip);
  assert.equal(h.calls[2].url, 'https://chromewebstore.googleapis.com/upload/v2/publishers/publisher/items/maibneeahfkanhakkogkbcakcadjejkl:upload');
  assert.deepEqual(JSON.parse(h.calls[3].body), { publishType: 'DEFAULT_PUBLISH', skipReview: false, blockOnWarnings: true });
  assert.ok(h.reports[0].includes('PENDING_REVIEW'));
});

test('Chrome polls asynchronous upload processing before publishing', async () => {
  const h = harness([token, {}, { body: { uploadState: 'IN_PROGRESS' } },
    { body: { lastAsyncUploadState: 'IN_PROGRESS' } }, { body: { lastAsyncUploadState: 'SUCCEEDED' } }, { body: { state: 'PENDING_REVIEW' } }]);
  await publishStore('chrome', Buffer.from('zip'), '1.1.9', h.options);
  assert.equal(h.calls.length, 6);
  assert.ok(h.calls[5].url.endsWith(':publish'));
});

for (const state of ['FAILED', 'UPLOAD_STATE_UNSPECIFIED']) {
  test(`Chrome refuses to publish after upload state ${state}`, async () => {
    const h = harness([token, {}, { body: { uploadState: state } }]);
    await assert.rejects(publishStore('chrome', Buffer.from('zip'), '1.1.9', h.options), /upload did not succeed/);
    assert.equal(h.calls.length, 3);
  });
}

test('Chrome stops on asynchronous failure or an uploaded version mismatch', async () => {
  for (const replies of [
    [{ body: { uploadState: 'IN_PROGRESS' } }, { body: { lastAsyncUploadState: 'FAILED' } }],
    [{ body: { uploadState: 'SUCCEEDED', crxVersion: '1.1.8' } }],
  ]) {
    const h = harness([token, {}, ...replies]);
    await assert.rejects(publishStore('chrome', Buffer.from('zip'), '1.1.9', h.options));
    assert.ok(!h.calls.some(call => call.url.endsWith(':publish')));
  }
});

test('Chrome retries do not resubmit the same published or pending version', async () => {
  for (const status of [
    { publishedItemRevisionStatus: { distributionChannels: [{ crxVersion: '1.1.9' }] } },
    { submittedItemRevisionStatus: { state: 'PENDING_REVIEW', distributionChannels: [{ crxVersion: '1.1.9' }] } },
  ]) {
    const h = harness([token, { body: status }]);
    await publishStore('chrome', Buffer.from('zip'), '1.1.9', h.options);
    assert.equal(h.calls.length, 2);
    assert.match(h.reports[0], /already/);
  }
});

test('Chrome does not overwrite another version pending review', async () => {
  const h = harness([token, { body: { submittedItemRevisionStatus: { state: 'PENDING_REVIEW', distributionChannels: [{ crxVersion: '1.2.0' }] } } }]);
  await assert.rejects(publishStore('chrome', Buffer.from('zip'), '1.1.9', h.options), /Another Chrome version/);
  assert.equal(h.calls.length, 2);
});

test('HTTP errors suppress response bodies and are never blindly retried', async () => {
  const h = harness([{ status: 401, body: { error: 'secret refresh access-token' } }]);
  await assert.rejects(publishStore('chrome', Buffer.from('zip'), '1.1.9', h.options), error => {
    assert.match(error.message, /HTTP 401/);
    assert.ok(!error.message.includes('secret'));
    return true;
  });
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].redirect, 'error');
});

test('Edge uses API-key authentication, polls uploads, and checks submission processing', async () => {
  const h = harness([
    { status: 202, headers: { Location: 'upload-id' } },
    { body: { status: 'InProgress' } }, { body: { status: 'Succeeded' } },
    { status: 202, headers: { Location: 'publish-id' } },
    { body: { status: 'Succeeded' } },
  ]);
  await publishStore('edge', Buffer.from('zip'), '1.1.9', h.options);
  assert.equal(h.calls[0].headers.Authorization, 'ApiKey edge-secret');
  assert.equal(h.calls[0].headers['X-ClientID'], 'edge-client');
  assert.ok(h.calls[1].url.endsWith('/draft/package/operations/upload-id'));
  assert.ok(h.calls[4].url.endsWith('/submissions/operations/publish-id'));
  assert.equal(JSON.parse(h.calls[3].body).notes.startsWith('Better Classroom 1.1.9.'), true);
  assert.match(h.reports.at(-1), /certification and public availability/);
});

test('Edge never submits when upload processing fails', async () => {
  const h = harness([{ status: 202, headers: { Location: 'upload-id' } }, { body: { status: 'Failed' } }]);
  await assert.rejects(publishStore('edge', Buffer.from('zip'), '1.1.9', h.options), /did not succeed/);
  assert.equal(h.calls.length, 2);
});

test('Edge does not follow operation URLs to another origin', async () => {
  const h = harness([{ status: 202, headers: { Location: 'https://other.example/operations/upload-id' } },
    { body: { status: 'Succeeded' } }, { status: 202, headers: { Location: 'publish-id' } }, { body: { status: 'Succeeded' } }]);
  await publishStore('edge', Buffer.from('zip'), '1.1.9', h.options);
  assert.ok(h.calls.every(call => call.url.startsWith('https://api.addons.microsoftedge.microsoft.com/')));
});

test('Edge missing operation IDs and bounded polling timeouts fail clearly', async () => {
  const missing = harness([{ status: 202 }]);
  await assert.rejects(publishStore('edge', Buffer.from('zip'), '1.1.9', missing.options), /operation ID/);
  const timeout = harness([{ status: 202, headers: { Location: 'upload-id' } }, ...Array.from({ length: 3 }, () => ({ body: { status: 'InProgress' } }))]);
  await assert.rejects(publishStore('edge', Buffer.from('zip'), '1.1.9', timeout.options), /timed out/);
  assert.equal(timeout.calls.length, 4);
});

test('malformed authentication responses do not expose response contents', async () => {
  const h = harness([]);
  h.options.fetchImpl = async () => new Response('private-secret-not-json', { status: 200 });
  await assert.rejects(publishStore('chrome', Buffer.from('zip'), '1.1.9', h.options), error => {
    assert.match(error.message, /invalid JSON/);
    assert.ok(!error.message.includes('private-secret'));
    return true;
  });
});
