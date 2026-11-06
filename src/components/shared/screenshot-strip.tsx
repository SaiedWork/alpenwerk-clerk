"use client";

import Image from "next/image";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { t } from "@/lib/i18n-de";

export type Screenshot = { id: string; caption: string };

const src = (id: string) => `/api/screenshots/${id}`;

/** Horizontal strip of browser screenshots; a click opens the full-size image. */
export function ScreenshotStrip({ shots }: { shots: readonly Screenshot[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = shots.find((s) => s.id === openId) ?? null;

  return (
    <>
      <ul className="flex gap-3 overflow-x-auto pb-2">
        {shots.map((shot) => (
          <li key={shot.id} className="w-44 shrink-0">
            <button
              type="button"
              onClick={() => setOpenId(shot.id)}
              aria-label={t.console.case.screenshotOpen.replace(
                "{caption}",
                shot.caption,
              )}
              className="block w-full overflow-hidden rounded-lg border outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Image
                src={src(shot.id)}
                alt=""
                width={1100}
                height={700}
                unoptimized
                className="h-auto w-full"
              />
            </button>
            <p className="mt-1.5 text-sm">{shot.caption}</p>
          </li>
        ))}
      </ul>
      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="sm:max-w-5xl">
          <DialogTitle>{open?.caption}</DialogTitle>
          <DialogDescription className="sr-only">
            {open?.caption}
          </DialogDescription>
          {open ? (
            <Image
              src={src(open.id)}
              alt={open.caption}
              width={1100}
              height={700}
              unoptimized
              className="h-auto w-full rounded-lg border"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
