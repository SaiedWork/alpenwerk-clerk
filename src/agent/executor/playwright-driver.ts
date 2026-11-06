import type { Browser, BrowserContext, Page } from "playwright-core";
import type { LegacySnapshot } from "@/agent/rules/types";
import { t } from "@/lib/i18n-de";
import type { LegacyDriver } from "./driver";
import { LegacyDriverError } from "./errors";
import { extractPolicyPage } from "./extract-policy-page";
import { parsePolicyPage, RAW_TEXT_KEYS } from "./parse-policy";
import type { ScreenshotSink } from "./screenshot-sink";
import {
  addressMatches,
  bankMatches,
  type AddressTarget,
  type BankTarget,
  type CurrentAddress,
  type CurrentBank,
  type WriteOutcome,
} from "./targets";
import { normalizeIban } from "@/lib/iban";
import { normalizePlz, normalizeText } from "@/lib/normalize";

const VIEWPORT = { width: 1100, height: 700 };
const JPEG_QUALITY = 60;
const ACTION_TIMEOUT_MS = 15_000;
// Pipeline steps the screenshots are filed under.
const READ_STEP = "identify";
const WRITE_STEP = "execute";
const VERIFY_STEP = "verify";

type FormKind = "adresse" | "bank";

export interface PlaywrightDriverOptions {
  /** `LEGACY_BASE_URL`, e.g. `https://host/legacy`. */
  baseUrl: string;
  user: string | undefined;
  password: string | undefined;
  caseId: string;
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
      await this.screenshot(READ_STEP, t.executor.captions.policyFound);
      const raw = await page.evaluate(extractPolicyPage, [...RAW_TEXT_KEYS]);
      return parsePolicyPage(raw, this.options.now?.());
    }
    if ((await page.getByTestId("policy-not-found").count()) > 0) {
      await this.screenshot(READ_STEP, t.executor.captions.policyNotFound);
      return null;
    }
    // Neither page: most likely the session ended and we were sent to the login form.
    throw new LegacyDriverError(
      "LEGACY_UNEXPECTED_PAGE",
      `Unexpected page after opening the policy: ${page.url()}`,
    );
  }

  async readAddress(policyNo: string): Promise<CurrentAddress | null> {
    const page = await this.loggedInPage();
    const state = await this.openForm(page, policyNo, "adresse");
    if (state !== "ok") return null;
    await this.screenshot(VERIFY_STEP, t.executor.captions.verification);
    return this.addressInputs(page);
  }

  async readBank(policyNo: string): Promise<CurrentBank | null> {
    const page = await this.loggedInPage();
    const state = await this.openForm(page, policyNo, "bank");
    if (state !== "ok") return null;
    await this.screenshot(VERIFY_STEP, t.executor.captions.verification);
    return this.bankInputs(page);
  }

  async updateAddress(
    policyNo: string,
    target: AddressTarget,
  ): Promise<WriteOutcome> {
    const page = await this.loggedInPage();
    const state = await this.openForm(page, policyNo, "adresse");
    if (state !== "ok") return state;
    await this.screenshot(WRITE_STEP, t.executor.captions.addressBefore);

    // Idempotent: nothing to do if the system already holds the target.
    if (addressMatches(await this.addressInputs(page), target)) {
      return "unchanged";
    }
    await this.fill(page, "strasse", target.street);
    await this.fill(page, "hausnr", target.houseNo);
    await this.fill(page, "plz", target.plz);
    await this.fill(page, "ort", target.city);
    if (target.country !== null) await this.fill(page, "land", target.country);
    await this.screenshot(WRITE_STEP, t.executor.captions.formFilled);

    const outcome = await this.submit(page, "submit-address");
    // The confirmation page shows what the system stored; it must be what we sent.
    const confirmed = {
      street: await this.text(page, "confirm-strasse"),
      houseNo: await this.text(page, "confirm-hausnr"),
      plz: await this.text(page, "confirm-plz"),
      city: await this.text(page, "confirm-ort"),
      country: await this.text(page, "confirm-land"),
    };
    if (!addressMatches(confirmed, target)) {
      throw new LegacyDriverError(
        "LEGACY_CONFIRMATION_MISMATCH",
        "The confirmation page shows a different address than the one entered.",
      );
    }
    await this.screenshot(WRITE_STEP, t.executor.captions.confirmation);
    return outcome;
  }

  async updateBank(
    policyNo: string,
    target: BankTarget,
  ): Promise<WriteOutcome> {
    const page = await this.loggedInPage();
    const state = await this.openForm(page, policyNo, "bank");
    if (state !== "ok") return state;
    await this.screenshot(WRITE_STEP, t.executor.captions.bankBefore);

    if (bankMatches(await this.bankInputs(page), target)) return "unchanged";
    await this.fill(page, "iban", target.iban);
    if (target.holder !== null) {
      await this.fill(page, "kontoinhaber", target.holder);
    }
    await this.screenshot(WRITE_STEP, t.executor.captions.formFilled);

    const outcome = await this.submit(page, "submit-bank");
    const confirmed = {
      iban: await this.text(page, "confirm-iban"),
      holder: await this.text(page, "confirm-kontoinhaber"),
    };
    if (!bankMatches(confirmed, target)) {
      throw new LegacyDriverError(
        "LEGACY_CONFIRMATION_MISMATCH",
        "The confirmation page shows different bank data than the one entered.",
      );
    }
    await this.screenshot(WRITE_STEP, t.executor.captions.confirmation);
    return outcome;
  }

  async close(): Promise<void> {
    const browser = this.browser;
    this.browser = this.context = this.page = null;
    await browser?.close();
  }

  /** Opens the edit form. Anything but "ok" means there is nothing to edit. */
  private async openForm(
    page: Page,
    policyNo: string,
    kind: FormKind,
  ): Promise<"ok" | "policy_not_found" | "no_mandate"> {
    const base = this.options.baseUrl.replace(/\/$/, "");
    await page.goto(`${base}/police/${encodeURIComponent(policyNo)}/${kind}`);
    const field = kind === "adresse" ? "input-strasse" : "input-iban";
    if ((await page.getByTestId(field).count()) > 0) return "ok";
    if ((await page.getByTestId("policy-not-found").count()) > 0) {
      return "policy_not_found";
    }
    if (kind === "bank" && (await page.getByTestId("no-mandate").count()) > 0) {
      return "no_mandate";
    }
    throw new LegacyDriverError(
      "LEGACY_UNEXPECTED_PAGE",
      `Unexpected page after opening the ${kind} form: ${page.url()}`,
    );
  }

  private async addressInputs(page: Page): Promise<CurrentAddress> {
    return {
      street: await this.input(page, "strasse"),
      houseNo: await this.input(page, "hausnr"),
      plz: normalizePlz(await this.input(page, "plz")),
      city: await this.input(page, "ort"),
      country: await this.input(page, "land"),
    };
  }

  private async bankInputs(page: Page): Promise<CurrentBank> {
    return {
      iban: normalizeIban(await this.input(page, "iban")),
      holder: await this.input(page, "kontoinhaber"),
    };
  }

  private async input(page: Page, name: string): Promise<string> {
    return normalizeText(await page.getByTestId(`input-${name}`).inputValue());
  }

  private async fill(page: Page, name: string, value: string): Promise<void> {
    await page.getByTestId(`input-${name}`).fill(value);
  }

  private async text(page: Page, testId: string): Promise<string> {
    return normalizeText((await page.getByTestId(testId).textContent()) ?? "");
  }

  /** Clicks save and waits for the confirmation (or the error). Returns what the system says. */
  private async submit(
    page: Page,
    button: "submit-address" | "submit-bank",
  ): Promise<WriteOutcome> {
    await page.getByTestId(button).click();
    await page
      .getByTestId("confirmation")
      .or(page.getByTestId("form-error"))
      .waitFor();
    if ((await page.getByTestId("form-error").count()) > 0) {
      throw new LegacyDriverError(
        "LEGACY_FORM_REJECTED",
        "The legacy system rejected the entered values.",
      );
    }
    const status = await page
      .getByTestId("confirmation-status")
      .getAttribute("data-status");
    return status === "unchanged" ? "unchanged" : "changed";
  }

  private async screenshot(step: string, caption: string): Promise<void> {
    const page = this.page;
    if (!page) return;
    const jpeg = await page.screenshot({ type: "jpeg", quality: JPEG_QUALITY });
    await this.options.sink.save({
      caseId: this.options.caseId,
      step,
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
