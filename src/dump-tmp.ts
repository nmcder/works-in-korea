import { closeBrowser, snapshotPage } from './lib/browser.js';
for (const url of process.argv.slice(2)) {
  const p = await snapshotPage(url);
  console.log(`\n===== ${url}`);
  if (!p.ok || !p.html) { console.log('열지 못함:', p.blockedReason ?? p.error); continue; }
  console.log((p.visibleText ?? '').replace(/\s+/g, ' ').slice(0, 1600));
}
await closeBrowser();
