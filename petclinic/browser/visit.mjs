import { existsSync } from "node:fs";
import { chromium, devices } from "playwright";

// Every ~minute: a free-plan visitor opens the chat page, clicks an example question,
// waits for the answer, looks at the vet list, and sometimes starts a second chat.
// Web Analytics records the page views and custom events. Speed Insights beacons are
// blocked: its free tier (10,000 events per 30 days) is shared by the whole team, and
// running out pauses collection for every project.
// Hard stop: after STOP_AT the loop exits, whatever the configuration.
const STOP_AT = new Date("2026-11-07T22:00:00Z"); // Friday 7 Nov, 23:00 Europe/Berlin
// Every synthetic visit carries utm_source=synthetic, so analytics can tell it apart.
const TARGET_URL = withUtm(process.env.TARGET_URL ?? "https://petclinic-agent.vercel.app/");
const INTERVAL_MS = Number(process.env.INTERVAL_MS ?? 60_000);
const PROFILES = [devices["Desktop Chrome"], devices["Pixel 7"], devices["iPhone 15"], devices["Desktop Edge"]];

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
  const jitter = Math.random() * 15_000;
  await new Promise((resolve) => setTimeout(resolve, Math.max(0, INTERVAL_MS - (Date.now() - started)) + jitter));
}
console.log(JSON.stringify({ msg: "stopped", stopAt: STOP_AT.toISOString() }));

async function visit() {
  // Vercel's Analytics and Speed Insights scripts skip browsers that report
  // navigator.webdriver; this is our own demo site, so we turn that flag off.
  const browser = await chromium.launch({ args: ["--disable-blink-features=AutomationControlled"] });
  try {
    const index = Math.floor(Math.random() * PROFILES.length);
    const profile = PROFILES[index];
    // Four returning visitors, one per device profile: each keeps its cookies between
    // visits, so the chat history's anonymous Supabase sign-in happens once per visitor.
    const state = `/tmp/visitor-${index}.json`;
    const context = await browser.newContext({
      ...profile,
      locale: "en-GB",
      storageState: existsSync(state) ? state : undefined,
    });
    await context.route(/\/vitals$/, (route) => route.abort());
    const page = await context.newPage();

    await page.goto(TARGET_URL, { waitUntil: "load" });
    await askExample(page);

    await page.goto(withUtm(new URL("/vets", TARGET_URL).href), { waitUntil: "load" });
    await page.waitForTimeout(2_000 + Math.random() * 3_000);

    if (Math.random() < 0.5) {
      await page.goto(withUtm(new URL("/s", TARGET_URL).href), { waitUntil: "load" });
      await askExample(page);
    }
    // Leaving the page flushes the analytics beacons.
    await page.goto("about:blank");
    await context.storageState({ path: state });
    await context.close();
    console.log(JSON.stringify({ msg: "visit done", profile: profile.userAgent.slice(0, 40) }));
  } finally {
    await browser.close();
  }
}

async function askExample(page) {
  const examples = page.locator("main button.rounded-2xl");
  await examples.first().waitFor({ timeout: 20_000 });
  const count = await examples.count();
  await examples.nth(Math.floor(Math.random() * count)).click();
  // The answer always ends with the upgrade hint on the free plan.
  await page.getByText("Sign in for Premium to book visits", { exact: false }).last().waitFor({ timeout: 30_000 });
  await page.waitForTimeout(1_000 + Math.random() * 2_000);
}

function withUtm(url) {
  const u = new URL(url);
  u.searchParams.set("utm_source", "synthetic");
  return u.href;
}
