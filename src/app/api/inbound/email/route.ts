import { handleInboundEmail } from "@/features/inbox/server/handle-inbound";

// Steps 1-3 run in after(); one LLM call plus three short queries fit well within this.
export const maxDuration = 60;

export function POST(request: Request) {
  return handleInboundEmail(request);
}
