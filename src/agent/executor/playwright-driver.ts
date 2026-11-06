import type { Browser, BrowserContext, Page } from "playwright-core";
import type { LegacySnapshot } from "@/agent/rules/types";
import { t } from "@/lib/i18n-de";
import type { LegacyDriver } from "./driver";
import { LegacyDriverError } from "./errors";
import { extractPolicyPage } from "./extract-policy-page";
import { parsePolicyPage, RAW_TEXT_KEYS } from "./parse-policy";
import type { ScreenshotSink } from "./screenshot-sink";

const VIEWPORT = { width: 1100, height: 700 };
const JPEG_QUALITY = 60;
const ACTION_TIMEOUT_MS = 15_000;

export interface PlaywrightDriverOptions {
  /** `LEGACY_BASE_URL`, e.g. `https://host/legacy`. */
  baseUrl: string;
  user: string | undefined;
  password: string | undefined;
  caseId: string;
  /** Pipeline step the screenshots are filed under. */
  step: string;
  sink: ScreenshotSink;
  launch: () => Promise<Browser>;
  now?: () => Date;
}

/**
 * Operates the legacy admin app through a real browser, like a human operator: it opens the
 * app's public URL, logs in and reads the pages. It never touches the legacy database.
 * The browser starts on first use and is released by `close()`.
 */
export class PlaywrightLegacyDriver implements LegacyDriver {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  constructor(private readonly options: PlaywrightDriverOptions) {}

  async readPolicy(policyNo: string): Promise<LegacySnapshot | null> {
    const page = await this.loggedInPage();
    const base = this.options.baseUrl.replace(/\/$/, "");
    await page.goto(`${base}/police/${encodeURIComponent(policyNo)}`);

    if ((await page.getByTestId("policy-overview").count()) > 0) {
      await this.screenshot(t.executor.captions.policyFound);
      const raw = await page.evaluate(extractPolicyPage, [...RAW_TEXT_KEYS]);
      return parsePolicyPage(raw, this.options.now?.());
    }
    if ((await page.getByTestId("policy-not-found").count()) > 0) {
      await this.screenshot(t.executor.captions.policyNotFound);
      return null;
    }
    // Neither page: most likely the session ended and we were sent to the login form.
    throw new LegacyDriverError(
      "LEGACY_UNEXPECTED_PAGE",
      `Unexpected page after opening the policy: ${page.url()}`,
    );
  }

  async close(): Promise<void> {
    const browser = this.browser;
    this.browser = this.context = this.page = null;
    await browser?.close();
  }

  private async screenshot(caption: string): Promise<void> {
    const page = this.page;
    if (!page) return;
    const jpeg = await page.screenshot({ type: "jpeg", quality: JPEG_QUALITY });
    await this.options.sink.save({
      caseId: this.options.caseId,
      step: this.options.step,
      caption,
      jpeg,
    });
  }

  private async loggedInPage(): Promise<Page> {
    if (this.page) return this.page;
    const { user, password, baseUrl } = this.options;
    if (!user || !password) {
      throw new LegacyDriverError(
        "LEGACY_NOT_CONFIGURED",
        "LEGACY_USER and LEGACY_PASSWORD must be set to use the browser reader.",
      );
    }

    this.browser = await this.options.launch();
    try {
      this.context = await this.browser.newContext({ viewport: VIEWPORT });
      this.context.setDefaultTimeout(ACTION_TIMEOUT_MS);
      const page = await this.context.newPage();
      await page.goto(`${baseUrl.replace(/\/$/, "")}/login`);
      await page.getByTestId("login-username").fill(user);
      await page.getByTestId("login-password").fill(password);
      await page.getByTestId("login-submit").click();
      // Success lands on the search page, failure shows the error on the login form.
      await page
        .getByTestId("nav-search")
        .or(page.getByTestId("login-error"))
        .waitFor();
      if ((await page.getByTestId("login-error").count()) > 0) {
        throw new LegacyDriverError(
          "LEGACY_LOGIN_FAILED",
          "The legacy system rejected the operator login.",
        );
      }
      this.page = page;
      return page;
    } catch (error) {
      await this.close();
      throw error;
    }
  }
}
