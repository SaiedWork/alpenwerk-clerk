import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDb } from "@/db/client";
import { CaseDetail } from "@/features/cases/components/case-detail";
import { getCaseDetail } from "@/features/cases/server/get-case";
import { t } from "@/lib/i18n-de";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: t.console.nav.cases };

// The review actions run the pipeline in `after()`; execute and verify drive a browser.
export const maxDuration = 60;

export default async function CaseDetailPage({ params }: Props) {
  const { id } = await params;
  const view = await getCaseDetail(getDb(), id);
  if (!view) notFound();
  return <CaseDetail view={view} />;
}
