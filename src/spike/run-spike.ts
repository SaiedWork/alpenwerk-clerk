// THROWAWAY: Day-1 browser feasibility spike. Remove after the decision gate.
import chromium from "@sparticuz/chromium";
import { chromium as playwright } from "playwright-core";

const DEFAULT_LOCAL_CHROME =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

export type SpikeResult = {
  screenshot: Buffer;
  timingsMs: {
    launch: number;
    login: number;
    screenshot: number;
    total: number;
  };
  welcomeText: string;
};

/** Opens `${baseUrl}/spike-login`, logs in, and returns a JPEG of the welcome page. */
export async function runSpike(baseUrl: string): Promise<SpikeResult> {
  const t0 = Date.now();
  // Local: macOS/Windows cannot run the bundled Linux binary, so use a local Chrome.
  const isServerless = Boolean(process.env.VERCEL);
  const browser = await playwright.launch({
    args: isServerless ? chromium.args : [],
    executablePath: isServerless
      ? await chromium.executablePath()
      : (process.env.LOCAL_CHROME_PATH ?? DEFAULT_LOCAL_CHROME),
    headless: true,
  });
  const launched = Date.now();
  try {
    const context = await browser.newContext({
      viewport: { width: 1100, height: 700 },
    });
    const page = await context.newPage();
    await page.goto(`${baseUrl}/spike-login`);
    await page.getByTestId("username").fill("demo");
    await page.getByTestId("password").fill("demo");
    await page.getByTestId("submit").click();
    await page.getByTestId("welcome").waitFor();
    const welcomeText = (await page.getByTestId("welcome").textContent()) ?? "";
    const loggedIn = Date.now();
    const screenshot = await page.screenshot({ type: "jpeg", quality: 60 });
    const done = Date.now();
    return {
      screenshot,
      welcomeText,
      timingsMs: {
        launch: launched - t0,
        login: loggedIn - launched,
        screenshot: done - loggedIn,
        total: done - t0,
      },
    };
  } finally {
    await browser.close();
  }
}
