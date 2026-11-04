"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { verifyPassword } from "@/lib/password";
import { findOperator } from "./queries";
import { endSession, startSession } from "./session";

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
