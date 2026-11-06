import type { Db } from "@/db/client";
import { screenshots } from "@/db/schema/app";

/** Where the driver puts the pictures it takes. Keeps the driver free of database code. */
export interface ScreenshotSink {
  save(shot: {
    caseId: string;
    step: string;
    caption: string;
    jpeg: Buffer;
  }): Promise<void>;
}

/** Stores screenshots in `app.screenshots` (served later by `/api/screenshots/[id]`). */
export function createDbScreenshotSink(db: Db): ScreenshotSink {
  return {
    async save({ caseId, step, caption, jpeg }) {
      await db
        .insert(screenshots)
        .values({ caseId, step, caption, mime: "image/jpeg", data: jpeg });
    },
  };
}
