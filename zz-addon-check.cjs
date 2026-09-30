// Throwaway end-to-end check for the personalisation add-ons. Lives in the
// repo root only because Node resolves `playwright` from the script's own
// directory (CLAUDE.md section 9). Delete after the run.
const { chromium } = require("playwright");
const fs = require("node:fs");

const BASE = "http://localhost:3000";
const HANDLE = "the-peek-kompanion-tote";

const env = Object.fromEntries(
  fs
    .readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    })
);
let domain = env.SHOPIFY_STORE_DOMAIN;
if (!domain.startsWith("http")) domain = "https://" + domain;
const token = env.SHOPIFY_STOREFRONT_ACCESS_TOKEN || env.SHOPIFY_STOREFRONT_PUBLIC_TOKEN;

async function shopifyCart(cartId) {
  const r = await fetch(`${domain}/api/2026-07/graphql.json`, {
    method: "POST",
    headers: { "content-type": "application/json", "X-Shopify-Storefront-Access-Token": token },
    body: JSON.stringify({
      query: `query($id:ID!){cart(id:$id){totalQuantity cost{totalAmount{amount}} lines(first:50){nodes{id quantity attributes{key value} merchandise{...on ProductVariant{title product{title}}} ... on CartLine{parentRelationship{parent{id}}}}}}}`,
      variables: { id: cartId },
    }),
  });
  const j = await r.json();
  const cart = j.data.cart;
  const short = (id) => id.split("/").pop().slice(0, 6);
  return {
    totalQuantity: cart.totalQuantity,
    total: cart.cost.totalAmount.amount,
    lines: cart.lines.nodes.map((n) => ({
      id: short(n.id),
      parent: n.parentRelationship ? short(n.parentRelationship.parent.id) : null,
      product: n.merchandise.product.title,
      variant: n.merchandise.title,
      qty: n.quantity,
      attrs: n.attributes.map((a) => `${a.key}=${a.key.startsWith("_") ? "…" : a.value}`).join(","),
    })),
  };
}

const results = [];
const check = (name, pass, detail = "") => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
};

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addInitScript(() => {
    localStorage.setItem("kozy:newsletter", JSON.stringify({ state: "subscribed", at: Date.now() }));
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
  page.on("pageerror", (e) => consoleErrors.push(String(e)));

  // 1. An add-on product has no page.
  const addonPage = await page.goto(`${BASE}/product/personalized-initials`);
  check("add-on product page 404s", addonPage.status() === 404, `status ${addonPage.status()}`);

  // 2. Product page shows the picker.
  await page.goto(`${BASE}/product/${HANDLE}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !document.querySelector("[data-loader]"), null, { timeout: 30000 });
  const cards = page.locator("fieldset:has(legend:text('Make it yours')) input[type=checkbox]");
  await cards.first().waitFor({ timeout: 20000 });
  check("picker shows both add-ons", (await cards.count()) === 2, `${await cards.count()} checkboxes`);

  // Pick a size so the button is live.
  const sizeButton = page.locator("fieldset:has(legend) button[aria-pressed]").first();
  await sizeButton.click();
  await page.waitForTimeout(300);

  // 3. Ticked initials with nothing typed blocks the add.
  await page.getByLabel("Add Your Initials").check();
  await page.getByRole("button", { name: "Add to cart" }).click();
  const alert = page.locator("[role=alert]", { hasText: "Add your initials" });
  check("empty initials blocked with a message", await alert.isVisible().catch(() => false));

  // 4. Typing filters to A-Z, uppercase, max 6.
  const field = page.locator("[data-addon-field]");
  await field.fill("");
  await field.pressSequentially("k.f 1ñé&abcdefgh");
  const typed = await field.inputValue();
  check("initials field filters to A-Z, max 6", typed === "KFABCD", `got "${typed}"`);
  await field.fill("");
  await field.pressSequentially("kf");

  // 5. Add with initials + gift box.
  await page.getByLabel("Add a Gift Box").check();
  const totalText = await page.locator("p:has-text('Total with extras')").innerText();
  check("running total shown", /Total with extras/.test(totalText), totalText.replace(/\s+/g, " "));
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.waitForFunction(
    () => document.querySelector("[role=dialog]")?.textContent?.includes("KF"),
    null,
    { timeout: 30000 }
  );
  // Wait for the server-confirmed line (remove buttons enabled).
  await page.waitForFunction(
    () => [...document.querySelectorAll("[role=dialog] button[aria-label^='Remove']")].every((b) => !b.disabled),
    null,
    { timeout: 30000 }
  );
  await page.waitForTimeout(800);

  const cookies = await context.cookies();
  const cartId = decodeURIComponent(cookies.find((c) => c.name === "cartId")?.value || "");
  let cart = await shopifyCart(cartId);
  console.log(JSON.stringify(cart, null, 1));
  const parentA = cart.lines.find((l) => !l.parent && l.attrs.startsWith("_kozy_line"));
  const kidsA = cart.lines.filter((l) => l.parent === parentA?.id);
  check(
    "Shopify cart: tote with Initials=KF and gift box nested",
    parentA && kidsA.length === 2 && kidsA.some((k) => k.attrs === "Initials=KF") && kidsA.some((k) => k.product === "Kozy Gift Box"),
  );
  check("picker cleared after a successful add", !(await page.getByLabel("Add Your Initials").isChecked()));

  // 6. Same variant again with different initials -> a separate line.
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);
  await page.getByLabel("Add Your Initials").check();
  await page.locator("[data-addon-field]").pressSequentially("ab");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.waitForFunction(
    () => document.querySelector("[role=dialog]")?.textContent?.includes("AB"),
    null,
    { timeout: 30000 }
  );
  await page.waitForFunction(
    () => [...document.querySelectorAll("[role=dialog] button[aria-label^='Remove']")].every((b) => !b.disabled),
    null,
    { timeout: 30000 }
  );
  await page.waitForTimeout(800);
  cart = await shopifyCart(cartId);
  const parents = cart.lines.filter((l) => !l.parent);
  check("second tote with other initials is its own line", parents.length === 2, `${parents.length} parent lines`);
  const headerCount = await page.locator("[role=dialog] .eyebrow").first().innerText();
  check("drawer counts Kompanions, not add-on lines", /· 2\b/.test(headerCount), headerCount);

  // 7. Quantity + on the KF line moves its per-unit add-ons with it.
  const kfRow = page.locator("[role=dialog] li", { hasText: "KF" }).first();
  await kfRow.getByRole("button", { name: "Increase item quantity" }).click();
  await page.waitForTimeout(2500);
  cart = await shopifyCart(cartId);
  const kfParent = cart.lines.find((l) => cart.lines.some((k) => k.parent === l.id && k.attrs === "Initials=KF"));
  const kfKids = cart.lines.filter((l) => l.parent === kfParent?.id);
  check(
    "quantity 2 syncs both add-ons to 2",
    kfParent?.qty === 2 && kfKids.every((k) => k.qty === 2),
    `parent ${kfParent?.qty}, kids ${kfKids.map((k) => k.qty).join("/")}`
  );

  // 8. Remove only the gift box from the KF line.
  await kfRow.getByRole("button", { name: /Remove Kozy Gift Box from/ }).click();
  await page.waitForTimeout(2500);
  cart = await shopifyCart(cartId);
  const kfKidsAfter = cart.lines.filter((l) => l.parent === kfParent?.id);
  check(
    "removing only the gift box keeps tote + initials",
    kfKidsAfter.length === 1 && kfKidsAfter[0].attrs === "Initials=KF",
    kfKidsAfter.map((k) => k.product).join(",")
  );

  // 9. Remove the AB tote: its initials go with it.
  const abRow = page.locator("[role=dialog] li", { hasText: "AB" }).first();
  await abRow.getByRole("button", { name: /^Remove The Peek Kompanion Tote from cart$/ }).click();
  await page.waitForTimeout(2500);
  cart = await shopifyCart(cartId);
  check(
    "removing a tote removes its add-ons",
    !cart.lines.some((l) => l.attrs === "Initials=AB") && cart.lines.filter((l) => !l.parent).length === 1,
    JSON.stringify(cart.lines.map((l) => `${l.product}:${l.qty}`))
  );

  // 10. Search does not list the add-on products.
  await page.goto(`${BASE}/search?q=initials`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !document.querySelector("[data-loader]"), null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  const leaked = await page.locator("a[href='/product/personalized-initials'], a[href='/product/kozy-gift-box']").count();
  check("add-on products never listed in search", leaked === 0, `${leaked} links`);

  check("no console errors", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));

  // 11. Layout sweep of the open picker.
  const widths = [320, 360, 390, 414, 768, 1024, 1440, 1920];
  const overflow = [];
  for (const width of widths) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    await ctx.addCookies([{ name: "kozy_is_mobile", value: width < 768 ? "1" : "0", url: BASE }]);
    await ctx.addInitScript(() => {
      localStorage.setItem("kozy:newsletter", JSON.stringify({ state: "subscribed", at: Date.now() }));
    });
    const p = await ctx.newPage();
    await p.goto(`${BASE}/product/${HANDLE}`, { waitUntil: "domcontentloaded" });
    await p.waitForFunction(() => !document.querySelector("[data-loader]"), null, { timeout: 30000 });
    await p.getByLabel("Add Your Initials").check();
    await p.getByLabel("Add a Gift Box").check();
    await p.waitForTimeout(300);
    const ok = await p.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth);
    const fieldBox = await p.locator("[data-addon-field]").boundingBox();
    if (!ok || !fieldBox || fieldBox.x + fieldBox.width > width) overflow.push(width);
    if (width === 390 || width === 1440) {
      const panel = p.locator("fieldset:has(legend:text('Make it yours'))");
      await panel.scrollIntoViewIfNeeded();
      await panel.screenshot({ path: `C:/Users/User/AppData/Local/Temp/claude/e--Codebase-Personal-kozy-living/2013ec34-6a71-4d01-a510-23f0cdaebcca/scratchpad/picker-${width}.png` });
    }
    await ctx.close();
  }
  check("no horizontal overflow across widths", overflow.length === 0, overflow.join(","));

  // Drawer picture for the record.
  await page.goto(`${BASE}/product/${HANDLE}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !document.querySelector("[data-loader]"), null, { timeout: 30000 });
  await page.getByRole("button", { name: "Open cart" }).first().click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "C:/Users/User/AppData/Local/Temp/claude/e--Codebase-Personal-kozy-living/2013ec34-6a71-4d01-a510-23f0cdaebcca/scratchpad/drawer.png" });

  await browser.close();
  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
