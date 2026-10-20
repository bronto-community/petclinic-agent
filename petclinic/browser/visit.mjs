import { chromium, devices } from "playwright";

// Every ~5 minutes: open the chat page as an anonymous visitor (free plan), click an
// example question, wait for the answer, sometimes start a new chat, then leave.
// Hard stop: after STOP_AT the loop exits, whatever the configuration.
const STOP_AT = new Date("2026-10-23T22:00:00Z"); // Saturday 24 Oct, 00:00 Europe/Berlin
// Every synthetic visit carries utm_source=synthetic, so analytics can tell it apart.
const TARGET_URL = withUtm(process.env.TARGET_URL ?? "https://petclinic-agent.vercel.app/");
const INTERVAL_MS = 5 * 60_000;
const PROFILES = [devices["Desktop Chrome"], devices["Pixel 7"], devices["iPhone 15"]];

// ONCE=1 runs a single visit, for testing.
if (process.env.ONCE) {
  await visit();
  process.exit(0);
}

while (Date.now() < STOP_AT.getTime()) {
  const started = Date.now();
  try {
    await visit();
  } catch (error) {
    console.error(JSON.stringify({ msg: "visit failed", error: String(error) }));
  }
  const jitter = Math.random() * 60_000;
  await new Promise((resolve) => setTimeout(resolve, Math.max(0, INTERVAL_MS - (Date.now() - started)) + jitter));
}
console.log(JSON.stringify({ msg: "stopped", stopAt: STOP_AT.toISOString() }));

async function visit() {
  // Vercel's Analytics and Speed Insights scripts skip browsers that report
  // navigator.webdriver; this is our own demo site, so we turn that flag off.
  const browser = await chromium.launch({ args: ["--disable-blink-features=AutomationControlled"] });
  try {
    const profile = PROFILES[Math.floor(Math.random() * PROFILES.length)];
    const context = await browser.newContext({ ...profile, locale: "en-GB" });
    const page = await context.newPage();
    await page.goto(TARGET_URL, { waitUntil: "load" });

    const examples = page.locator("main button.rounded-2xl");
    await examples.first().waitFor({ timeout: 20_000 });
    const count = await examples.count();
    await examples.nth(Math.floor(Math.random() * count)).click();
    // The answer always ends with the upgrade hint on the free plan.
    await page.getByText("Sign in for Premium to book visits", { exact: false }).last().waitFor({ timeout: 30_000 });

    if (Math.random() < 0.5) {
      await page.goto(withUtm(new URL("/s", TARGET_URL).href), { waitUntil: "load" });
      await page.locator("main button.rounded-2xl").first().click();
      await page.waitForTimeout(5_000);
    }
    // Leaving the page flushes the Web Vitals beacons.
    await page.goto("about:blank");
    await context.close();
    console.log(JSON.stringify({ msg: "visit done", profile: profile.userAgent.slice(0, 40) }));
  } finally {
    await browser.close();
  }
}

function withUtm(url) {
  const u = new URL(url);
  u.searchParams.set("utm_source", "synthetic");
  return u.href;
}
