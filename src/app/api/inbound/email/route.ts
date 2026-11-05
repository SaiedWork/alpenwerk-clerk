import { handleInboundEmail } from "@/features/inbox/server/handle-inbound";

export function POST(request: Request) {
  return handleInboundEmail(request);
}
