const path = require("path");
const fs = require("fs");

// Load .env manually to avoid dotenv v17 noisy logging
const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

const ORG = process.env.ADO_ORG;
const PROJECT = process.env.ADO_PROJECT;
const PAT = process.env.ADO_PAT;

if (!PAT) {
  console.error("Error: ADO_PAT not set. Check .env file at", path.resolve(__dirname, "../.env"));
  process.exit(1);
}

const BASE = `https://dev.azure.com/${ORG}`;
const AUTH = "Basic " + Buffer.from(`:${PAT}`).toString("base64");

async function request(url, { method = "GET", body, contentType = "application/json" } = {}) {
  const headers = { Authorization: AUTH };
  if (body) headers["Content-Type"] = contentType;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg = typeof data === "object" ? JSON.stringify(data, null, 2) : data;
    throw new Error(`HTTP ${res.status}: ${msg}`);
  }
  return data;
}

// PATCH with JSON Patch content type (for work item operations)
async function patchWorkItem(url, patchDoc) {
  const headers = {
    Authorization: AUTH,
    "Content-Type": "application/json-patch+json",
  };
  const res = await fetch(url, {
    method: "PATCH",
    headers,
    body: JSON.stringify(patchDoc),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg = typeof data === "object" ? JSON.stringify(data, null, 2) : data;
    throw new Error(`HTTP ${res.status}: ${msg}`);
  }
  return data;
}

module.exports = { request, patchWorkItem, BASE, ORG, PROJECT };
