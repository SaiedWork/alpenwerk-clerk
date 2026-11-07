import A01 from "../../../evals/cases/A01.json";
import A02 from "../../../evals/cases/A02.json";
import B01 from "../../../evals/cases/B01.json";
import B02 from "../../../evals/cases/B02.json";
import B03 from "../../../evals/cases/B03.json";
import B04 from "../../../evals/cases/B04.json";
import B07 from "../../../evals/cases/B07.json";
import I01 from "../../../evals/cases/I01.json";
import T01 from "../../../evals/cases/T01.json";
import X01 from "../../../evals/cases/X01.json";
import X02 from "../../../evals/cases/X02.json";
import X03 from "../../../evals/cases/X03.json";
import X04 from "../../../evals/cases/X04.json";
import { t } from "@/lib/i18n-de";
import type { SimulatorEmail } from "./schemas/simulator";

export const SAMPLE_GROUPS = ["auto", "reply", "review", "other"] as const;
type SampleGroup = (typeof SAMPLE_GROUPS)[number];

/** An eval case id that has a German title and hint in the dictionary. */
type SampleId = keyof typeof t.console.inbox.samples;

export type Sample = {
  /** The eval case id, so the recorded model answer in `seed/llm-cache.json` matches the text. */
  id: SampleId;
  group: SampleGroup;
  email: SimulatorEmail;
};

type EvalEmail = { from: string; subject: string; body: string };
const sample = (
  id: SampleId,
  c: { id: string; email: EvalEmail },
  group: SampleGroup,
): Sample => {
  if (c.id !== id)
    throw new Error(`sample ${id} is wired to eval case ${c.id}`);
  return { id, group, email: c.email };
};

/** Sample emails come straight from the eval cases: they are recorded, so they cost no live call. */
export const SAMPLES: readonly Sample[] = [
  sample("B01", B01, "auto"),
  sample("A01", A01, "auto"),
  sample("B02", B02, "auto"),
  sample("X03", X03, "auto"),
  sample("A02", A02, "reply"),
  sample("B03", B03, "reply"),
  sample("I01", I01, "reply"),
  sample("T01", T01, "review"),
  sample("B04", B04, "review"),
  sample("B07", B07, "review"),
  sample("X02", X02, "review"),
  sample("X01", X01, "other"),
  sample("X04", X04, "other"),
];
