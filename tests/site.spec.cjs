const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const configSource = fs.readFileSync(path.join(root, "assets", "config.js"), "utf8");
const consentKey = "xh-analytics-consent";
const endpoint = "https://script.google.com/macros/s/XploreTestEndpoint/exec";

async function configureForms(page, url = endpoint) {
  await page.route("**/assets/config.js", (route) => route.fulfill({
    contentType: "text/javascript",
    body: configSource.replace(/enquiryEndpoint: "[^"]*"/, `enquiryEndpoint: ${JSON.stringify(url)}`),
  }));
}

async function fillEnquiry(page, audience = "partner") {
  const form = page.locator(`#${audience}-enquiry`);
  await form.locator("[name=name]").fill("Example Person");
  await form.locator("[name=email]").fill("person@example.com");
  if (audience === "partner") {
    await form.locator("[name=company]").fill("Example Company");
    await form.locator("[name=relationship]").selectOption("As a client");
    await form.locator("[name=focus]").selectOption("AI-enabled workflows");
    await form.locator("[name=outcome]").fill("We want to simplify a repetitive workflow and make our platform more reliable.");
  } else {
    await form.locator("[name=location]").fill("Canada / Eastern Time");
    await form.locator("[name=engagement]").selectOption("Open to either");
    await form.locator('[name=skills][value="Workflow automation"]').check();
    await form.locator("[name=story]").fill("I worked with a team to diagnose a difficult workflow and build a more reliable process.");
  }
  await form.locator("[name=consent]").check();
  return form;
}

async function acknowledge(route, result) {
  await route.fulfill({
    contentType: "application/json",
    headers: { "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify(result),
  });
}

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

test("unconnected on-site forms disable sending, offer email, and restore focus", async ({ page }) => {
  await configureForms(page, "");
  await page.goto("/");
  await dismissAnalytics(page);
  const partner = page.locator(".hero [data-form=partner]");
  await partner.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("Nothing entered here will be sent");
  await expect(page.locator("#partner-enquiry [type=submit]")).toBeDisabled();
  await expect(page.getByRole("dialog").getByRole("link", { name: "harshkumar.bhalodia@gmail.com" }).first()).toHaveAttribute("href", "mailto:harshkumar.bhalodia@gmail.com");
  await page.keyboard.press("Escape");
  await expect(partner).toBeFocused();
  await page.locator(".workforce-card [data-form=workforce]").click();
  await expect(page.getByRole("dialog")).toContainText("Your next chapter");
  await page.getByRole("button", { name: "Close enquiry form", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
});

test("all enquiry buttons stay on site and disclose no form-provider branding", async ({ page, context }) => {
  await configureForms(page);
  await page.goto("/");
  await dismissAnalytics(page);
  for (const audience of ["partner", "workforce"]) {
    const links = page.locator(`[data-form=${audience}]`);
    for (const link of await links.all()) {
      await expect(link).toHaveAttribute("href", "#connect");
      await expect(link).not.toHaveAttribute("target");
      await expect(link).toHaveAttribute("aria-haspopup", "dialog");
    }
    await page.locator(`.connect-card [data-form=${audience}]`).click();
    await expect(page.locator(`#${audience}-enquiry`)).toBeVisible();
    await expect(page.locator(`#${audience}-enquiry [type=submit]`)).toBeEnabled();
    await expect(page.getByRole("dialog")).not.toContainText("Google");
    await page.getByRole("button", { name: "Close enquiry form", exact: true }).click();
  }
  expect(context.pages()).toHaveLength(1);
});

for (const url of ["javascript:alert(1)", "https://script.google.com/macros/s/Test/dev", "https://script.google.com.evil.example/macros/s/Test/exec"]) {
  test(`rejects unsafe or non-deployed endpoint: ${url}`, async ({ page }) => {
    const errors = [];
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    await configureForms(page, url);
    await page.goto("/");
    await dismissAnalytics(page);
    await page.locator(".hero [data-form=partner]").click();
    await expect(page.locator("#partner-enquiry [type=submit]")).toBeDisabled();
    expect(errors.some((message) => message.includes("endpoint configuration is invalid"))).toBe(true);
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

test("production tracks only form openings and confirmed submissions, with no answers or duplicate page views", async ({ page }) => {
  const requests = await mockProduction(page);
  await configureForms(page);
  await page.route(endpoint, (route) => {
    const payload = JSON.parse(new URLSearchParams(route.request().postData()).get("payload"));
    return acknowledge(route, { ok: true, requestId: payload.requestId });
  });
  await page.goto("https://xplorehorizons.com/");
  await page.getByRole("button", { name: "Accept analytics", exact: true }).click();
  await expect.poll(() => requests.length).toBe(1);
  await page.getByRole("button", { name: "Cookie preferences", exact: true }).click();
  await page.getByRole("button", { name: "Accept analytics", exact: true }).click();
  await page.locator(".hero [data-form=partner]").click();
  const form = await fillEnquiry(page);
  await form.getByRole("button", { name: "Start a conversation" }).click();
  await expect(form.locator(".form-success")).toBeVisible();
  const events = await page.evaluate(() => window.dataLayer.map((entry) => Array.from(entry)).filter((entry) => entry[0] === "event"));
  expect(events.filter((entry) => entry[1] === "page_view")).toHaveLength(1);
  expect(events.filter((entry) => entry[1] === "contact_form_open")).toEqual([
    ["event", "contact_form_open", { audience: "partner" }],
  ]);
  expect(events.filter((entry) => entry[1] === "contact_form_submit")).toEqual([
    ["event", "contact_form_submit", { audience: "partner" }],
  ]);
  expect(JSON.stringify(events)).not.toContain("person@example.com");
  expect(JSON.stringify(events)).not.toContain("requestId");
  expect(requests).toHaveLength(1);
});

test("reduced-motion preference disables decorative motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  expect(await page.locator(".horizon-art").evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe("auto");
});

test("home, selected services, dialog, and privacy pass automated WCAG AA checks", async ({ page }) => {
  await configureForms(page);
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
  await page.getByRole("button", { name: "Close enquiry form", exact: true }).click();
  await page.locator(".workforce-card [data-form=workforce]").click();
  await audit();
  await page.getByRole("button", { name: "Close enquiry form", exact: true }).click();
  await page.goto("/privacy.html");
  await audit();
});

for (const audience of ["partner", "workforce"]) {
  test(`${audience} submits on site and shows success only after a matching acknowledgement`, async ({ page, context }) => {
    await configureForms(page);
    const submissions = [];
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    await page.route(endpoint, async (route) => {
      expect(route.request().method()).toBe("POST");
      const payload = JSON.parse(new URLSearchParams(route.request().postData()).get("payload"));
      submissions.push(payload);
      await gate;
      await acknowledge(route, { ok: true, requestId: payload.requestId });
    });
    await page.goto("/");
    await dismissAnalytics(page);
    await page.locator(`.connect-card [data-form=${audience}]`).click();
    const form = await fillEnquiry(page, audience);
    await form.locator("[type=submit]").click();
    await expect.poll(() => submissions.length).toBe(1);
    await expect(form.locator(".form-success")).toBeHidden();
    await expect(form.locator("[type=submit]")).toBeDisabled();
    release();
    await expect(form.locator(".form-success")).toBeVisible();
    await expect(form.locator(".receipt-reference")).toHaveText(submissions[0].requestId);
    expect(submissions[0].audience).toBe(audience);
    expect(submissions[0].consent).toBe(true);
    expect(submissions[0].privacyVersion).toBe("2026-10-27");
    expect(context.pages()).toHaveLength(1);
    await expect(page).toHaveURL("http://127.0.0.1:4173/");
  });
}

test("network failures preserve the draft and reuse its reference on retry", async ({ page }) => {
  await configureForms(page);
  const submissions = [];
  await page.route(endpoint, async (route) => {
    const payload = JSON.parse(new URLSearchParams(route.request().postData()).get("payload"));
    submissions.push(payload);
    if (submissions.length === 1) return route.abort("failed");
    await acknowledge(route, { ok: true, requestId: payload.requestId });
  });
  await page.goto("/");
  await dismissAnalytics(page);
  await page.locator(".hero [data-form=partner]").click();
  const form = await fillEnquiry(page);
  await form.locator("[type=submit]").click();
  await expect(form.locator(".form-status")).toContainText("couldn't confirm delivery");
  await expect(form.locator(".form-success")).toBeHidden();
  await expect(form.locator("[name=email]")).toHaveValue("person@example.com");
  await expect(form.locator("[name=email]")).toBeDisabled();
  await page.getByRole("button", { name: "Close enquiry form", exact: true }).click();
  await page.locator(".hero [data-form=partner]").click();
  await form.getByRole("button", { name: "Check / retry delivery" }).click();
  await expect(form.locator(".form-success")).toBeVisible();
  expect(submissions).toHaveLength(2);
  expect(submissions[1]).toEqual(submissions[0]);
});

test("server rejection keeps the draft editable and never shows success", async ({ page }) => {
  await configureForms(page);
  await page.route(endpoint, (route) => acknowledge(route, { ok: false, code: "invalid", field: "email" }));
  await page.goto("/");
  await dismissAnalytics(page);
  await page.locator(".hero [data-form=partner]").click();
  const form = await fillEnquiry(page);
  await form.locator("[type=submit]").click();
  await expect(form.locator(".form-status")).toContainText("not accepted");
  await expect(form.locator("[name=email]")).toBeEnabled();
  await expect(form.locator("[name=email]")).toHaveValue("person@example.com");
  await expect(form.locator(".form-success")).toBeHidden();
});

test("a 45-second timeout shows unconfirmed delivery and preserves the same draft", async ({ page }) => {
  await configureForms(page);
  await page.clock.install();
  await page.route(endpoint, () => {});
  await page.goto("/");
  await dismissAnalytics(page);
  await page.locator(".hero [data-form=partner]").click();
  const form = await fillEnquiry(page);
  const request = page.waitForRequest(endpoint);
  await form.locator("[type=submit]").click();
  await request;
  await page.clock.fastForward(45001);
  await expect(form.locator(".form-status")).toContainText("couldn't confirm delivery");
  await expect(form.locator("[name=email]")).toHaveValue("person@example.com");
  await expect(form.locator(".form-success")).toBeHidden();
});

test("mismatched acknowledgement is treated as unconfirmed, not success", async ({ page }) => {
  await configureForms(page);
  await page.route(endpoint, (route) => acknowledge(route, { ok: true, requestId: "unrelated" }));
  await page.goto("/");
  await dismissAnalytics(page);
  await page.locator(".hero [data-form=partner]").click();
  const form = await fillEnquiry(page);
  await form.locator("[type=submit]").click();
  await expect(form.locator(".form-status")).toContainText("couldn't confirm delivery");
  await expect(form.locator(".form-success")).toBeHidden();
});

test("client validation blocks blank context, bad email, missing consent, and missing strengths", async ({ page }) => {
  await configureForms(page);
  const submissions = [];
  await page.route(endpoint, (route) => { submissions.push(route.request().postData()); return route.abort(); });
  await page.goto("/");
  await dismissAnalytics(page);
  await page.locator(".hero [data-form=partner]").click();
  let form = await fillEnquiry(page);
  for (const [field, value] of [["email", "person@invalid"], ["outcome", " ".repeat(40)]]) {
    await form.locator(`[name=${field}]`).fill(value);
    await form.locator("[type=submit]").click();
    expect(await form.locator(`[name=${field}]`).evaluate((input) => input.validity.valid)).toBe(false);
    form = await fillEnquiry(page);
  }
  await form.locator("[name=consent]").uncheck();
  await form.locator("[type=submit]").click();
  expect(submissions).toHaveLength(0);
  await page.getByRole("button", { name: "Close enquiry form", exact: true }).click();
  await page.locator(".workforce-card [data-form=workforce]").click();
  form = await fillEnquiry(page, "workforce");
  await form.locator('[name=skills][value="Workflow automation"]').uncheck();
  await form.locator("[type=submit]").click();
  expect(await form.locator("[name=skills]").first().evaluate((input) => input.validity.valid)).toBe(false);
  expect(submissions).toHaveLength(0);
});

test("service calls to action preselect the matching enquiry focus", async ({ page }) => {
  await configureForms(page);
  await page.goto("/");
  await dismissAnalytics(page);
  await page.locator("#tab-cost").click();
  await page.locator("#journey-cost [data-form=partner]").click();
  await expect(page.locator("#partner-focus")).toHaveValue("AI cost and planning");
});

for (const width of [320, 390, 768, 1440]) {
  test(`both native forms fit and remain usable at ${width}px`, async ({ page }) => {
    await configureForms(page);
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    await dismissAnalytics(page);
    for (const audience of ["partner", "workforce"]) {
      await page.locator(`.connect-card [data-form=${audience}]`).click();
      expect(await page.locator("#form-dialog").evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
      await expect(page.locator(`#${audience}-enquiry [type=submit]`)).toBeEnabled();
      await page.keyboard.press("Escape");
    }
  });
}

test("native field names and option values match the setup script schema", async ({ page }) => {
  const vm = require("node:vm");
  const source = fs.readFileSync(path.join(root, "google-apps-script", "Code.gs"), "utf8");
  const schema = vm.runInNewContext(source + "\nJSON.stringify(XH.forms)");
  await page.goto("/");
  for (const [audience, definition] of Object.entries(JSON.parse(schema))) {
    const form = page.locator(`#${audience}-enquiry`);
    for (const field of definition.fields) {
      const inputs = form.locator(`[name="${field.key}"]`);
      expect(await inputs.count()).toBe(field.type === "checkbox" ? field.options.length : 1);
      if (field.options) {
        const options = field.type === "checkbox"
          ? await inputs.evaluateAll((elements) => elements.map((element) => element.value))
          : await inputs.locator("option").evaluateAll((elements) => elements.map((element) => element.value).filter(Boolean));
        expect(options).toEqual(field.options);
      }
    }
  }
});
