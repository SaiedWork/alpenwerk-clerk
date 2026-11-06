import chromium from "@sparticuz/chromium";
import { chromium as playwright, type Browser } from "playwright-core";
import { env } from "@/lib/env";

const DEFAULT_LOCAL_CHROME =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/**
 * Starts Chromium. On Vercel that is the binary bundled by `@sparticuz/chromium`; locally it is
 * the installed Chrome (the bundled Linux binary cannot run on macOS/Windows).
 */
export async function launchBrowser(): Promise<Browser> {
  const serverless = Boolean(env.VERCEL);
  return playwright.launch({
    headless: true,
    args: serverless ? chromium.args : [],
    executablePath: serverless
      ? await chromium.executablePath()
      : (env.LOCAL_CHROME_PATH ?? DEFAULT_LOCAL_CHROME),
  });
}
