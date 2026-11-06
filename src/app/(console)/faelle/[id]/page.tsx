import { notFound } from "next/navigation";
import { getDb } from "@/db/client";
import { CaseDetail } from "@/features/cases/components/case-detail";
import { getCaseDetail } from "@/features/cases/server/get-case";

type Props = { params: Promise<{ id: string }> };

export default async function CaseDetailPage({ params }: Props) {
  const { id } = await params;
  const view = await getCaseDetail(getDb(), id);
  if (!view) notFound();
  return <CaseDetail view={view} />;
}
