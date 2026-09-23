const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 1920, height: 1000 } });
  await c.addInitScript(() => { localStorage.setItem("kozy:newsletter", JSON.stringify({ state: "subscribed", at: Date.now() })); sessionStorage.setItem("kozy:loaded", "1"); });
  const p = await c.newPage();
  await p.goto("http://localhost:3000/", { waitUntil: "commit" });
  await p.waitForFunction(() => !document.querySelector(".loader"), null, { timeout: 60000 });
  const s = p.locator('section[aria-labelledby="statement"]');
  await s.scrollIntoViewIfNeeded(); await p.waitForTimeout(6000);
  await p.screenshot({ path: process.env.OUT + "/lookbook-p1b.png" });
  await b.close();
})();
