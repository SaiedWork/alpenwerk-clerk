// THROWAWAY spike route: proves a serverless function can drive a browser.
import { runSpike } from "@/spike/run-spike";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Never expose a browser-launching endpoint on the production deployment.
  if (process.env.VERCEL_ENV === "production") {
    return new Response("Not found", { status: 404 });
  }
  try {
    const { screenshot, timingsMs, welcomeText } = await runSpike(
      new URL(request.url).origin,
    );
    return new Response(new Uint8Array(screenshot), {
      headers: {
        "content-type": "image/jpeg",
        "x-spike-timings": JSON.stringify(timingsMs),
        "x-spike-welcome": encodeURIComponent(welcomeText),
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
