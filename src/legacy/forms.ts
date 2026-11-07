import { z } from "zod";

// Input validation of the legacy edit forms. Like a real old system it only checks that
// the data is well-formed. Business rules (holder mismatch, non-DE IBAN, ...) belong to
// the rule engine and are deliberately NOT enforced here.

const collapse = (value: string) => value.trim().replace(/\s+/g, " ");
const text = (max: number) =>
  z.string().transform(collapse).pipe(z.string().min(1).max(max));

export const addressFormSchema = z
  .object({
    strasse: text(100),
    hausnr: text(10),
    plz: text(10),
    ort: text(60),
    land: text(60),
  })
  .refine(
    ({ land, plz }) =>
      land.toLowerCase() !== "deutschland" || /^\d{5}$/.test(plz),
    {
      path: ["plz"],
      message: "PLZ must have 5 digits for Deutschland",
    },
  );

export const bankFormSchema = z.object({
  // Well-formed IBAN of any country (the checksum check lives in the clerk's own library).
  iban: z
    .string()
    .transform((value) => value.replace(/\s+/g, "").toUpperCase())
    .pipe(z.string().regex(/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/)),
  kontoinhaber: text(100),
});

export type AddressInput = z.infer<typeof addressFormSchema>;
export type BankInput = z.infer<typeof bankFormSchema>;

/** Names of the form fields that can be reported back as invalid. */
const formFields = [
  "strasse",
  "hausnr",
  "plz",
  "ort",
  "land",
  "iban",
  "kontoinhaber",
] as const;
export type FormField = (typeof formFields)[number];

const fieldNames = z.enum(formFields);

/** First invalid field of a failed parse, for the `?error=` redirect. */
export function firstInvalidField(error: z.ZodError): FormField {
  const parsed = fieldNames.safeParse(error.issues[0]?.path[0]);
  return parsed.success ? parsed.data : "strasse";
}

/** Validates the `?error=` query parameter of the form pages. */
export function parseErrorField(raw: unknown): FormField | null {
  const parsed = fieldNames.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export const changeStatusSchema = z.enum(["changed", "unchanged"]);
