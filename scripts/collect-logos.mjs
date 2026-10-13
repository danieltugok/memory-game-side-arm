// Builds src/assets/cardsOnDeck.json from the SIDEARM client sites listed in scripts/schools.txt.
// For each site it reads the homepage, finds the site logo (images/logos/site/site.png),
// checks the logo URL actually serves an image and records { name, logo }.
// Usage: npm run collect-logos
import { readFile, writeFile } from "node:fs/promises";

const SCHOOLS_FILE = new URL("./schools.txt", import.meta.url);
const OUTPUT_FILE = new URL("../src/assets/cardsOnDeck.json", import.meta.url);
// The multiplayer server is deployed on its own (only the server/ folder), so it gets a copy
const SERVER_COPY = new URL("../server/cardsOnDeck.json", import.meta.url);
const CONCURRENCY = 5;
const TIMEOUT_MS = 20000;
const HEADERS = { "User-Agent": "Mozilla/5.0 (SideArm Match logo collector)" };

const CDN_LOGO_RE =
  /https?:\/\/[a-z0-9]+\.cloudfront\.net\/sidearm\.(?:nextgen\.)?sites\/[^/"'\s]+\/images\/logos\/site\/site\.png/i;

const fetchWithTimeout = (url, options = {}) =>
  fetch(url, { headers: HEADERS, redirect: "follow", signal: AbortSignal.timeout(TIMEOUT_MS), ...options });

const cleanName = (title, domain) => {
  const name = (title || "")
    .split(/\s+[-|–]\s+/)[0]
    .replace(/\s+Athletics?$/i, "")
    .trim();
  return name || domain;
};

const isImage = async (url) => {
  try {
    const res = await fetchWithTimeout(url);
    const type = res.headers.get("content-type") || "";
    await res.body?.cancel();
    return res.ok && type.startsWith("image/");
  } catch {
    return false;
  }
};

const collect = async (domain) => {
  const res = await fetchWithTimeout(`https://${domain}/`);
  if (!res.ok) throw new Error(`homepage returned ${res.status}`);
  const html = await res.text();
  const decoded = html.replace(/%2f/gi, "/").replace(/%3a/gi, ":").replace(/\\\//g, "/");

  const siteName = decoded.match(/<meta[^>]+property="og:site_name"[^>]+content="([^"]+)"/i)?.[1];
  const title = decoded.match(/<title>([^<]+)<\/title>/i)?.[1];
  const name = cleanName(siteName || title, domain);

  // Prefer the CDN URL; fall back to the site's own relative path.
  const candidates = [decoded.match(CDN_LOGO_RE)?.[0], new URL("/images/logos/site/site.png", res.url).href].filter(Boolean);
  for (const logo of candidates) {
    if (await isImage(logo)) return { name, logo };
  }
  throw new Error("no working site logo found");
};

const domains = (await readFile(SCHOOLS_FILE, "utf8"))
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#"));

const results = [];
const queue = [...domains];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const domain = queue.shift();
      try {
        const card = await collect(domain);
        results.push({ domain, ...card });
        console.log(`ok    ${domain} -> ${card.name}`);
      } catch (err) {
        console.log(`skip  ${domain}: ${err.message}`);
      }
    }
  })
);

// Keep schools.txt order and drop duplicate logos.
const seen = new Set();
const deck = results
  .sort((a, b) => domains.indexOf(a.domain) - domains.indexOf(b.domain))
  .filter(({ logo }) => !seen.has(logo) && seen.add(logo))
  .map(({ name, logo }) => ({ name, logo }));

if (deck.length < 12) {
  console.error(`Only ${deck.length} logos found; the game needs at least 12. Not writing ${OUTPUT_FILE.pathname}.`);
  process.exit(1);
}

const json = JSON.stringify(deck, null, 2) + "\n";
await writeFile(OUTPUT_FILE, json);
await writeFile(SERVER_COPY, json);
console.log(`\nWrote ${deck.length} logos to src/assets/cardsOnDeck.json and server/cardsOnDeck.json (${domains.length - deck.length} skipped).`);
