import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { webcrypto } from "node:crypto";

const crypto = webcrypto;
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(ROOT, "chapters");
const PASS = process.env.PASS;
if (!PASS) { console.error("PASS environment variable required (the secret passphrase)."); process.exit(1); }
const ITER = 120000;

function b64(buf) { return Buffer.from(buf).toString("base64"); }

async function deriveKey(pass, salt) {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey("raw", enc.encode(pass), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: ITER, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function main() {
  if (!fs.existsSync(DIR)) { console.error("no chapters/ dir"); process.exit(1); }
  const files = fs.readdirSync(DIR).filter(f => /^\d+-.+\.txt$/.test(f));
  const chapters = [];
  for (const f of files) {
    const m = f.match(/^(\d+)-(.+)\.txt$/);
    const num = parseInt(m[1], 10);
    const slug = m[2];
    const text = fs.readFileSync(path.join(DIR, f), "utf8");
    const lines = text.split("\n");
    const title = lines[0] || "";
    const meta = lines[1] || "";
    const content = lines.slice(3).join("\n").trim();
    const payload = JSON.stringify({ title, meta, content });

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(PASS, salt);
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(payload));
    const blob = b64(salt) + ":" + b64(iv) + ":" + b64(ct);
    const encFile = `${num}-${slug}.enc`;
    fs.writeFileSync(path.join(DIR, encFile), blob);
    chapters.push({ number: num, file: encFile });
    console.log("encrypted", encFile);
  }
  chapters.sort((a, b) => a.number - b.number);
  fs.writeFileSync(path.join(DIR, "manifest.json"), JSON.stringify({ encrypted: true, chapters }, null, 2));
  console.log(`\nwrote encrypted manifest: ${chapters.length} chapter(s)`);
  console.log("PASSPHRASE used to encrypt — you'll need it to open the reader.");
}

main().catch(e => { console.error(e); process.exit(1); });
