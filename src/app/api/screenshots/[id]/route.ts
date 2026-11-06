import { getDb } from "@/db/client";
import {
  findScreenshot,
  screenshotResponse,
} from "@/features/cases/server/screenshot-response";

/** Serves one browser-step screenshot stored in `app.screenshots`. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return screenshotResponse(await findScreenshot(getDb(), id));
}
