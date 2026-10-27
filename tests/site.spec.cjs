const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const configSource = fs.readFileSync(path.join(root, "assets", "config.js"), "utf8");
const consentKey = "xh-analytics-consent";

async function dismissAnalytics(page) {
  await page.getByRole("button", { name: "No thanks", exact: true }).click();
}

test("local assets, internal anchors, metadata, and image dimensions are valid", async ({ page, request }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page).toHaveTitle(/Xplore Horizons Inc/);
  expect(await page.locator("h1").count()).toBe(1);
  const links = await page.locator("[href], [src]").evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("href") || element.getAttribute("src"))
  );
  for (const link of new Set(links)) {
    if (link.startsWith("#")) {
      await expect(page.locator(link)).toHaveCount(1);
    } else if (!/^(https?:|mailto:)/.test(link)) {
      expect((await request.get(link)).status(), link).toBe(200);
    }
  }
  expect(await page.locator("img").evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth > 0))).toBe(true);
  expect((await request.get("/assets/social-card.png")).status()).toBe(200);
  expect(errors).toEqual([]);
});

for (const width of [320, 390, 768, 1024, 1440]) {
  test(`no horizontal overflow or unreadable hidden content at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await dismissAnalytics(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator(".partner-card")).toBeVisible();
    await expect(page.locator(".workforce-card")).toBeVisible();
  });
}

test("service explorer supports all choices, deep links, and keyboard navigation", async ({ page }) => {
  await page.goto("/#journey-cost");
  await dismissAnalytics(page);
  await expect(page.locator("#journey-cost")).toBeVisible();
  const tabs = page.getByRole("tab");
  for (let index = 0; index < 6; index += 1) {
    await tabs.nth(index).click();
    await expect(tabs.nth(index)).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel")).toHaveCount(1);
  }
  await tabs.last().press("Home");
  await expect(tabs.first()).toBeFocused();
  await tabs.first().press("ArrowDown");
  await expect(tabs.nth(1)).toBeFocused();
  await tabs.nth(1).press("End");
  await expect(tabs.last()).toBeFocused();
  await tabs.last().press("ArrowDown");
  await expect(tabs.first()).toBeFocused();
});

test("mobile navigation opens, closes after a link, and supports Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await dismissAnalytics(page);
  const menu = page.getByRole("button", { name: "Menu" });
  await menu.click();
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("navigation").getByRole("link", { name: "Our people" }).click();
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await menu.click();
  await menu.press("Escape");
  await expect(menu).toBeFocused();
  await expect(menu).toHaveAttribute("aria-expanded", "false");
});

test("form placeholders are honest, dismissible, and restore focus", async ({ page }) => {
  await page.goto("/");
  await dismissAnalytics(page);
  const partner = page.locator(".hero [data-form=partner]");
  await partner.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("No information has been collected");
  await page.keyboard.press("Escape");
  await expect(partner).toBeFocused();
  await page.locator(".workforce-card [data-form=workforce]").click();
  await expect(page.getByRole("dialog")).toContainText("Your next chapter");
  await page.getByRole("button", { name: "Got it" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
});

test("configured forms open safe responder URLs without submitting data", async ({ page }) => {
  await page.route("**/assets/config.js", (route) => route.fulfill({
    contentType: "text/javascript",
    body: configSource.replace('partnerFormUrl: ""', 'partnerFormUrl: "https://forms.gle/PartnerTest123"')
      .replace('workforceFormUrl: ""', 'workforceFormUrl: "https://docs.google.com/forms/d/e/Test123/viewform"'),
  }));
  await page.goto("/");
  for (const audience of ["partner", "workforce"]) {
    const links = page.locator(`[data-form=${audience}]`);
    for (const link of await links.all()) {
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", "noopener noreferrer");
      await expect(link.locator(".sr-only")).toHaveText("(opens Google Forms in a new tab)");
      if (await link.isVisible()) await expect(link).toHaveAccessibleName(/opens Google Forms in a new tab/);
      expect(await link.getAttribute("href")).toMatch(/^https:\/\/(forms.gle|docs.google.com)/);
    }
    await expect(page.locator(`[data-form-note=${audience}]`)).toHaveText("Opens Google Forms in a new tab.");
  }
});

for (const url of ["javascript:alert(1)", "https://docs.google.com/forms/d/Test/edit", "https://forms.gle.evil.example/Test"]) {
  test(`rejects unsafe or non-responder form URL: ${url}`, async ({ page }) => {
    const errors = [];
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    await page.route("**/assets/config.js", (route) => route.fulfill({
      contentType: "text/javascript",
      body: configSource.replace('partnerFormUrl: ""', `partnerFormUrl: "${url}"`),
    }));
    await page.goto("/");
    await dismissAnalytics(page);
    await page.locator(".hero [data-form=partner]").click();
    await expect(page.getByRole("dialog")).toContainText("temporarily unavailable");
    expect(errors.some((message) => message.includes("invalid form URL"))).toBe(true);
  });
}

test("FAQs work with keyboard and do not require JavaScript", async ({ page }) => {
  await page.goto("/");
  await dismissAnalytics(page);
  const question = page.locator("summary").first();
  await question.focus();
  await question.press("Enter");
  await expect(page.locator("details").first()).toHaveAttribute("open", "");
});

test("without JavaScript all service descriptions and enquiry status remain readable", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4173/");
  for (const panel of await page.locator(".journey-panel").all()) await expect(panel).toBeVisible();
  await expect(page.locator("noscript")).toBeVisible();
  await expect(page.getByRole("navigation")).toBeVisible();
  expect(await page.locator('script[src*="googletagmanager"]').count()).toBe(0);
  await context.close();
});

test("consent persists on both pages and local preview never requests Analytics", async ({ page }) => {
  const googleRequests = [];
  page.on("request", (request) => {
    if (/google-analytics|googletagmanager/.test(request.url())) googleRequests.push(request.url());
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Accept analytics", exact: true }).click();
  await expect(page.locator(".cookie-banner")).toBeHidden();
  expect(await page.evaluate((key) => localStorage.getItem(key), consentKey)).toBe("granted");
  await page.goto("/privacy.html");
  await expect(page.locator(".cookie-banner")).toBeHidden();
  await page.getByRole("button", { name: "Cookie preferences", exact: true }).first().click();
  await dismissAnalytics(page);
  await page.reload();
  await expect(page.locator(".cookie-banner")).toBeHidden();
  expect(await page.evaluate((key) => localStorage.getItem(key), consentKey)).toBe("denied");
  expect(googleRequests).toEqual([]);
});

async function mockProduction(page) {
  const googleRequests = [];
  await page.route("https://xplorehorizons.com/**", async (route) => {
    const url = new URL(route.request().url());
    const response = await route.fetch({ url: `http://127.0.0.1:4173${url.pathname}` });
    await route.fulfill({ response });
  });
  await page.route(/https:\/\/(www\.googletagmanager\.com|.*google-analytics\.com)\/.*/, (route) => {
    googleRequests.push(route.request().url());
    return route.fulfill({ contentType: "text/javascript", body: "/* Analytics stub: no data sent. */" });
  });
  return googleRequests;
}

test("production Analytics is opt-in, sanitized, and fully unloaded on withdrawal", async ({ page }) => {
  const requests = await mockProduction(page);
  await page.goto("https://xplorehorizons.com/?email=private@example.com#secret");
  expect(requests).toEqual([]);
  await page.getByRole("button", { name: "Accept analytics", exact: true }).click();
  await expect.poll(() => requests.length).toBe(1);
  const calls = await page.evaluate(() => window.dataLayer.map((entry) => Array.from(entry)));
  const configuration = calls.find((entry) => entry[0] === "config");
  expect(configuration[1]).toBe("G-53C3364357");
  expect(configuration[2].page_location).toBe("https://xplorehorizons.com/");
  expect(configuration[2].page_referrer).toBe("");
  expect(configuration[2].allow_google_signals).toBe(false);
  expect(calls.filter((entry) => entry[1] === "page_view").length).toBe(1);
  await page.context().addCookies([{ name: "_ga", value: "test", domain: ".xplorehorizons.com", path: "/" }]);
  await page.getByRole("button", { name: "Cookie preferences", exact: true }).click();
  await Promise.all([page.waitForEvent("load"), dismissAnalytics(page)]);
  expect(await page.locator('script[src*="googletagmanager"]').count()).toBe(0);
  expect((await page.context().cookies()).some((cookie) => cookie.name === "_ga")).toBe(false);
  expect(requests.length).toBe(1);
});

test("blocked preference storage does not break navigation or enquiry dialogs", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() { throw new DOMException("Blocked for test", "SecurityError"); },
    });
  });
  await page.goto("/");
  await dismissAnalytics(page);
  await expect(page.locator("#site-status")).toContainText("browser prevented saving");
  await page.locator(".hero [data-form=partner]").click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("production tracks configured form opens, never placeholder clicks or duplicate page views", async ({ page, context }) => {
  const requests = await mockProduction(page);
  await page.route("**/assets/config.js", (route) => route.fulfill({
    contentType: "text/javascript",
    body: configSource.replace('partnerFormUrl: ""', 'partnerFormUrl: "https://forms.gle/PartnerTest123"'),
  }));
  await context.route("https://forms.gle/**", (route) => route.fulfill({
    contentType: "text/html", body: "<title>Local form stub</title>",
  }));
  await page.goto("https://xplorehorizons.com/");
  await page.getByRole("button", { name: "Accept analytics", exact: true }).click();
  await expect.poll(() => requests.length).toBe(1);
  await page.getByRole("button", { name: "Cookie preferences", exact: true }).click();
  await page.getByRole("button", { name: "Accept analytics", exact: true }).click();
  const popupPromise = page.waitForEvent("popup");
  await page.locator(".hero [data-form=partner]").click();
  const popup = await popupPromise;
  await expect(popup).toHaveTitle("Local form stub");
  await popup.close();
  await page.locator(".workforce-card [data-form=workforce]").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const events = await page.evaluate(() => window.dataLayer.map((entry) => Array.from(entry)).filter((entry) => entry[0] === "event"));
  expect(events.filter((entry) => entry[1] === "page_view")).toHaveLength(1);
  expect(events.filter((entry) => entry[1] === "contact_form_open")).toEqual([
    ["event", "contact_form_open", { audience: "partner" }],
  ]);
  expect(requests).toHaveLength(1);
});

test("reduced-motion preference disables decorative motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  expect(await page.locator(".horizon-art").evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe("auto");
});

test("home, selected services, dialog, and privacy pass automated WCAG AA checks", async ({ page }) => {
  await page.goto("/");
  const audit = async () => {
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(results.violations.map((violation) => ({
      id: violation.id,
      nodes: violation.nodes.map((node) => ({ target: node.target, message: node.failureSummary })),
    }))).toEqual([]);
  };
  await audit();
  await dismissAnalytics(page);
  for (const tab of await page.getByRole("tab").all()) {
    await tab.click();
    await audit();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await audit();
  await page.locator(".hero [data-form=partner]").click();
  await audit();
  await page.goto("/privacy.html");
  await audit();
});
