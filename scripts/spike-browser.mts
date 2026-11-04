// THROWAWAY: run with `pnpm spike` while `pnpm dev` is running.
import { writeFileSync } from "node:fs";
import { runSpike } from "@/spike/run-spike";

const baseUrl = process.argv[2] ?? "http://localhost:3000";
const out = process.argv[3] ?? "spike.jpg";

const result = await runSpike(baseUrl);
writeFileSync(out, result.screenshot);
console.log({
  welcomeText: result.welcomeText,
  timingsMs: result.timingsMs,
  screenshotKB: Math.round(result.screenshot.length / 1024),
  out,
});
