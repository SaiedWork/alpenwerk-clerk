import { eq } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db/client";
import { screenshots } from "@/db/schema/app";

export type ScreenshotRow = { mime: string; data: Buffer };

const SERVED_MIME_TYPES = new Set(["image/jpeg", "image/png"]);

/** Loads one screenshot by id. A malformed id is a miss, not an error. */
export async function findScreenshot(
  db: Db,
  id: string,
): Promise<ScreenshotRow | null> {
  if (!z.uuid().safeParse(id).success) return null;
  const [row] = await db
    .select({ mime: screenshots.mime, data: screenshots.data })
    .from(screenshots)
    .where(eq(screenshots.id, id))
    .limit(1);
  return row ?? null;
}

/**
 * Builds the HTTP response for a stored screenshot. Only known image types are served
 * and `nosniff` is set, so a stored value can never be interpreted as HTML.
 */
export function screenshotResponse(row: ScreenshotRow | null): Response {
  if (!row || !SERVED_MIME_TYPES.has(row.mime)) {
    return Response.json({ error: "SCREENSHOT_NOT_FOUND" }, { status: 404 });
  }
  return new Response(new Uint8Array(row.data), {
    headers: {
      "Content-Type": row.mime,
      "Content-Length": String(row.data.length),
      "X-Content-Type-Options": "nosniff",
      // Screenshots never change after they are written.
      "Cache-Control": "private, max-age=3600, immutable",
    },
  });
}
