import { notFound } from "next/navigation";

// Keeps unknown /legacy/... addresses inside the legacy system instead of the console shell.
export default function UnknownLegacyPath() {
  notFound();
}
