import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { t } from "@/lib/i18n-de";
import { ToneBadge } from "./tone-badge";

const EXPLANATIONS: Record<string, string> = t.rules;

/** An internal rule code with its German explanation as a tooltip. */
export function ReasonCodeBadge({ code }: { code: string }) {
  const badge = (
    <ToneBadge tone="neutral" className="font-mono">
      {code}
    </ToneBadge>
  );
  const explanation = EXPLANATIONS[code];
  if (!explanation) return badge;
  return (
    <Tooltip>
      <TooltipTrigger render={badge} />
      <TooltipContent>{explanation}</TooltipContent>
    </Tooltip>
  );
}
