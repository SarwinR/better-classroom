#!/usr/bin/env node

import { readFileSync } from "node:fs";

const apiBase = "https://api.addons.microsoftedge.microsoft.com";

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required configuration: ${name}`);
  return value;
}

async function responseBody(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function request(url, options, expected) {
  const response = await fetch(url, options);
  const body = await responseBody(response);
  if (!expected.includes(response.status)) {
    throw new Error(`Edge API ${response.status}: ${JSON.stringify(body)}`);
  }
  return { response, body };
}

function operationId(location) {
  if (!location) throw new Error("Edge API returned no operation Location header");
  return location.replace(/\/$/, "").split("/").at(-1);
}

async function poll(url, headers, label) {
  for (let attempt = 1; attempt <= 60; attempt += 1) {
    const { body } = await request(url, { headers }, [200, 202]);
    if (body.status === "Succeeded") {
      console.log(`${label} succeeded.`);
      return;
    }
    if (body.status && body.status !== "InProgress") {
      throw new Error(`${label} failed: ${JSON.stringify(body)}`);
    }
    if (attempt === 60) break;
    await new Promise((resolve) => setTimeout(resolve, 10_000));
  }
  throw new Error(`${label} timed out after 10 minutes`);
}

const clientId = required("EDGE_CLIENT_ID");
const apiKey = required("EDGE_API_KEY");
const productId = required("EDGE_PRODUCT_ID");
const zipPath = required("EXTENSION_ZIP");
const version = required("RELEASE_VERSION");
const productPath = `/v1/products/${encodeURIComponent(productId)}/submissions`;
const authHeaders = {
  Authorization: `ApiKey ${apiKey}`,
  "X-ClientID": clientId,
};

console.log("Uploading package to Microsoft Edge Add-ons...");
const upload = await request(`${apiBase}${productPath}/draft/package`, {
  method: "POST",
  headers: { ...authHeaders, "Content-Type": "application/zip" },
  body: readFileSync(zipPath),
}, [202]);
const uploadId = operationId(upload.response.headers.get("location"));
await poll(
  `${apiBase}${productPath}/draft/package/operations/${encodeURIComponent(uploadId)}`,
  authHeaders,
  "Edge upload",
);

console.log("Submitting Edge package for certification...");
const submission = await request(`${apiBase}${productPath}`, {
  method: "POST",
  headers: { ...authHeaders, "Content-Type": "application/json" },
  body: JSON.stringify({
    notes: `Better Classroom v${version}. Automated package update from GitHub Actions.`,
  }),
}, [202]);
const submissionId = operationId(submission.response.headers.get("location"));
await poll(
  `${apiBase}${productPath}/operations/${encodeURIComponent(submissionId)}`,
  authHeaders,
  "Edge submission",
);
console.log("Edge submission accepted.");
