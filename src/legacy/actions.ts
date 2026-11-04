"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { verifyPassword } from "@/lib/password";
import { addressFormSchema, bankFormSchema, firstInvalidField } from "./forms";
import { updateAddress, updateBank, type ChangeOutcome } from "./mutations";
import { findOperator } from "./queries";
import { endSession, requireOperator, startSession } from "./session";

const loginSchema = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(200),
});

export async function loginAction(formData: FormData): Promise<void> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) redirect("/legacy/login?error=1");

  const operator = await findOperator(parsed.data.username);
  const valid =
    operator !== null &&
    (await verifyPassword(parsed.data.password, operator.passwordHash));
  if (!operator || !valid) redirect("/legacy/login?error=1");

  await startSession(operator.username);
  redirect("/legacy/suche");
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/legacy/login");
}

const policyNoSchema = z.string().trim().min(1).max(30);

function policyPath(policyNo: string): string {
  return `/legacy/police/${encodeURIComponent(policyNo)}`;
}

/** Maps a mutation result to the page the clerk lands on next. */
function redirectAfter(
  result: ChangeOutcome,
  policyNo: string,
  formPage: "adresse" | "bank",
): never {
  const base = policyPath(policyNo);
  if (result.outcome === "policy-not-found") redirect(base);
  if (result.outcome === "no-mandate") redirect(`${base}/${formPage}`);
  redirect(`${base}/${formPage}/bestaetigung?status=${result.outcome}`);
}

// Server Actions are public POST endpoints, so each one re-checks the session itself.
export async function updateAddressAction(formData: FormData): Promise<void> {
  await requireOperator();
  const policyNo = policyNoSchema.parse(formData.get("policyNo"));
  const parsed = addressFormSchema.safeParse({
    strasse: formData.get("strasse"),
    hausnr: formData.get("hausnr"),
    plz: formData.get("plz"),
    ort: formData.get("ort"),
    land: formData.get("land"),
  });
  if (!parsed.success) {
    redirect(
      `${policyPath(policyNo)}/adresse?error=${firstInvalidField(parsed.error)}`,
    );
  }
  redirectAfter(
    await updateAddress(policyNo, parsed.data),
    policyNo,
    "adresse",
  );
}

export async function updateBankAction(formData: FormData): Promise<void> {
  await requireOperator();
  const policyNo = policyNoSchema.parse(formData.get("policyNo"));
  const parsed = bankFormSchema.safeParse({
    iban: formData.get("iban"),
    kontoinhaber: formData.get("kontoinhaber"),
  });
  if (!parsed.success) {
    redirect(
      `${policyPath(policyNo)}/bank?error=${firstInvalidField(parsed.error)}`,
    );
  }
  redirectAfter(await updateBank(policyNo, parsed.data), policyNo, "bank");
}
