#!/usr/bin/env node

import { readFileSync } from "node:fs";

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

async function request(url, options, expected = [200]) {
  const response = await fetch(url, options);
  const body = await responseBody(response);
  if (!expected.includes(response.status)) {
    throw new Error(`Chrome API ${response.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

const clientId = required("CHROME_CLIENT_ID");
const clientSecret = required("CHROME_CLIENT_SECRET");
const refreshToken = required("CHROME_REFRESH_TOKEN");
const publisherId = required("CHROME_PUBLISHER_ID");
const extensionId = required("CHROME_EXTENSION_ID");
const zipPath = required("EXTENSION_ZIP");

const tokenBody = new URLSearchParams({
  client_id: clientId,
  client_secret: clientSecret,
  refresh_token: refreshToken,
  grant_type: "refresh_token",
});
const token = await request("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: tokenBody,
});
if (!token.access_token) throw new Error("Chrome authentication returned no access token");

const item = `publishers/${encodeURIComponent(publisherId)}/items/${encodeURIComponent(extensionId)}`;
const headers = { Authorization: `Bearer ${token.access_token}` };
const uploadUrl = `https://chromewebstore.googleapis.com/upload/v2/${item}:upload`;
const statusUrl = `https://chromewebstore.googleapis.com/v2/${item}:fetchStatus`;
const publishUrl = `https://chromewebstore.googleapis.com/v2/${item}:publish`;

console.log("Uploading package to Chrome Web Store...");
const upload = await request(uploadUrl, {
  method: "POST",
  headers: { ...headers, "Content-Type": "application/zip" },
  body: readFileSync(zipPath),
});

let uploadState = upload.uploadState;
let uploadStatus = upload;
for (let attempt = 1; uploadState === "IN_PROGRESS" && attempt <= 30; attempt += 1) {
  await new Promise((resolve) => setTimeout(resolve, 10_000));
  uploadStatus = await request(statusUrl, { headers });
  uploadState = uploadStatus.lastAsyncUploadState ?? uploadState;
}
if (uploadState !== "SUCCEEDED") {
  throw new Error(`Chrome upload did not succeed: ${JSON.stringify(uploadStatus)}`);
}

console.log("Submitting Chrome package for review...");
await request(publishUrl, { method: "POST", headers });
console.log("Chrome submission accepted.");
