const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  for (const [label, w, h] of [
    ["mobile", 375, 800],
    ["tablet", 768, 900],
    ["desktop", 1280, 900],
    ["wide", 1728, 1000],
  ]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.goto("http://localhost:3000/product/flow-throw-pillow", {
      waitUntil: "networkidle",
      timeout: 90000,
    });
    const info = await page.evaluate(() => {
      const h1 = document.querySelector("h1");
      const row = h1.parentElement;
      const img = row.querySelector("img");
      return {
        row: Math.round(row.getBoundingClientRect().width),
        h1: Math.round(h1.getBoundingClientRect().width),
        icon: img ? Math.round(img.getBoundingClientRect().width) : null,
        h1Lines: Math.round(
          h1.getBoundingClientRect().height /
            parseFloat(getComputedStyle(h1).lineHeight)
        ),
      };
    });
    console.log(
      `${label.padEnd(8)} vw=${String(w).padStart(4)}  row=${String(info.row).padStart(4)}  h1=${String(
        info.h1
      ).padStart(4)}  icon=${info.icon}  h1Lines=${info.h1Lines}`
    );
    await page.close();
  }
  await browser.close();
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
