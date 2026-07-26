import { chromium } from "@playwright/test";

const OUT = process.env.OUT_DIR ?? ".";
const BASE = process.env.BASE ?? "http://localhost:3100";

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(BASE);
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("server not ready");
}

await waitForServer();

// 環境にプリインストールされた Chromium を使う場合は PW_EXECUTABLE を指定
const browser = await chromium.launch(
  process.env.PW_EXECUTABLE
    ? { executablePath: process.env.PW_EXECUTABLE }
    : {}
);

async function listShot(name, colorScheme, viewport) {
  const ctx = await browser.newContext({
    colorScheme,
    viewport,
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForSelector("text=ほしいもの合計");
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `${OUT}/shot-${name}.png`, fullPage: true });
  await ctx.close();
  console.log("shot", name);
}

async function sheetShot(name, colorScheme) {
  const ctx = await browser.newContext({
    colorScheme,
    viewport: { width: 440, height: 956 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "追加" }).first().click();
  await page.waitForSelector("text=ほしいものを追加");
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/shot-${name}.png` });
  await ctx.close();
  console.log("shot", name);
}

await listShot("mobile-light", "light", { width: 440, height: 956 });
await listShot("mobile-dark", "dark", { width: 440, height: 956 });
await listShot("desktop-light", "light", { width: 1024, height: 900 });
await sheetShot("sheet-light", "light");
await sheetShot("sheet-dark", "dark");

await browser.close();
console.log("done");
