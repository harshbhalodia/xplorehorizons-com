"use strict";

const { chromium } = require("@playwright/test");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(path.resolve(__dirname, "..", "assets", "social-card.svg")).href);
    await page.screenshot({ path: path.resolve(__dirname, "..", "assets", "social-card.png") });
    console.log("Rendered assets\\social-card.png (1200 x 630).");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error("Social card rendering failed:", error);
  process.exitCode = 1;
});
