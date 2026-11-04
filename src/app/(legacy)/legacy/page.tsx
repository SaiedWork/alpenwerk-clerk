import { redirect } from "next/navigation";

export default function LegacyIndex() {
  redirect("/legacy/suche");
}
