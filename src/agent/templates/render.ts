import { z } from "zod";
import { t } from "@/lib/i18n-de";
import { TemplateError } from "./errors";

/** A value that ends up in customer text: one line, no control characters. */
const text = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[^\u0000-\u001f\u007f]+$/);

/** Only a masked IBAN (`DE89 **** **** **** **** 00`) may reach a reply. */
const maskedIban = z.string().regex(/^[A-Z]{2}\d{2}( \*{4})+ \d{2}$/);

const MISSING_FIELDS = ["street", "house_no", "plz", "city", "iban"] as const;
export type MissingField = (typeof MISSING_FIELDS)[number];

const schemas = {
  address_confirmed: z.strictObject({
    policyNo: text,
    street: text,
    houseNo: text,
    plz: text,
    city: text,
  }),
  bank_confirmed: z.strictObject({ policyNo: text, maskedIban }),
  request_missing_info: z.strictObject({
    missing: z.array(z.enum(MISSING_FIELDS)).min(1),
  }),
  bank_same_iban: z.strictObject({}),
  unknown_policy: z.strictObject({}),
  escalated_ack: z.strictObject({}),
  termination_received: z.strictObject({ policyNo: text }),
  rejected_by_reviewer: z.strictObject({}),
};

export type TemplateKey = keyof typeof schemas;
export const TEMPLATE_KEYS = Object.keys(schemas) as TemplateKey[];
export type TemplateVars<K extends TemplateKey> = z.input<(typeof schemas)[K]>;
export interface RenderedReply {
  subject: string;
  body: string;
}

/** Looks like an IBAN written in full (country code, check digits, groups of digits/letters). */
const FULL_IBAN =
  /\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){2,7}(?:\s?[A-Z0-9]{1,4})?\b/;

export const containsFullIban = (text: string) => FULL_IBAN.test(text);

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = values[name];
    if (value === undefined) {
      throw new TemplateError(
        "TEMPLATE_VARIABLE_MISSING",
        `no value for {${name}}`,
      );
    }
    return value;
  });
}

function toValues(
  key: TemplateKey,
  vars: Record<string, unknown>,
): Record<string, string> {
  if (key === "request_missing_info") {
    const { missing } = vars as { missing: MissingField[] };
    const labels = [...new Set(missing)].map(
      (f) => `- ${t.replies.missingFields[f]}`,
    );
    return { missingList: labels.join("\n") };
  }
  return vars as Record<string, string>;
}

/**
 * Renders one reply from validated variables. Pure. Throws `TemplateError` for an unknown key,
 * a missing or malformed variable, or output that looks like a full IBAN.
 */
export function render<K extends TemplateKey>(
  key: K,
  vars: TemplateVars<K>,
): RenderedReply {
  const schema = (schemas as Record<string, z.ZodType | undefined>)[key];
  if (!schema) {
    throw new TemplateError("TEMPLATE_UNKNOWN", `unknown template ${key}`);
  }
  const parsed = schema.safeParse(vars);
  if (!parsed.success) {
    // Names only, never the values (they may be personal data).
    const names = [
      ...new Set(parsed.error.issues.map((i) => i.path.join(".") || "(root)")),
    ];
    throw new TemplateError(
      "TEMPLATE_VARIABLE_MISSING",
      `invalid variables for ${key}: ${names.join(", ")}`,
    );
  }

  const values = toValues(key, parsed.data as Record<string, unknown>);
  const def = t.replies.templates[key];
  const subject = fill(def.subject, values);
  const body = [
    t.replies.greeting,
    fill(def.body, values),
    t.replies.signature,
  ].join("\n\n");

  if (containsFullIban(subject) || containsFullIban(body)) {
    throw new TemplateError(
      "TEMPLATE_UNSAFE_OUTPUT",
      `${key} would contain a full IBAN`,
    );
  }
  return { subject, body };
}
