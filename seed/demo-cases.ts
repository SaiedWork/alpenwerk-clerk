import type { NormalizedExtraction } from "@/agent/llm/normalize";
import { normalizeExtraction, toRuleInput } from "@/agent/llm/normalize";
import { computeCacheKey } from "@/agent/llm/cache-key";
import { extractionSchema } from "@/agent/llm/schema";
import type { CaseStatus, EventStatus } from "@/agent/pipeline/types";
import { evaluate } from "@/agent/rules/engine";
import type { Decision } from "@/agent/rules/types";
import { buildReplyVars } from "@/agent/steps/reply-vars";
import { render, type TemplateKey } from "@/agent/templates/render";
import { selectTemplate } from "@/agent/templates/select";
import type { AuditEntry } from "@/db/audit";
import { loadSeededCache } from "@/db/seed-cache";
import { REVIEWER_LABEL } from "@/features/review/reviewer";
import type { AddressInput, BankInput } from "@/legacy/forms";
import A02 from "../evals/cases/A02.json";
import B03 from "../evals/cases/B03.json";
import B04 from "../evals/cases/B04.json";
import B05 from "../evals/cases/B05.json";
import T01 from "../evals/cases/T01.json";
import T02 from "../evals/cases/T02.json";
import { buildCustomerFixtures } from "./customers";
import { snapshotFromFixture } from "./snapshot";

/**
 * Preloaded demo cases, built as plain rows so a reset needs no browser and no model call. They
 * are made with the real rule engine, template selection and renderer, so what they show is what
 * the pipeline would have produced; `tests/seed/demo-cases.test.ts` pins each outcome. Dates are
 * relative to `now`, like the legacy fixtures.
 */

export type DemoEvent = {
  seq: number;
  step: string;
  status: EventStatus;
  payload: unknown;
  startedAt: Date;
  durationMs: number;
};

export type DemoAudit = {
  actor: "agent" | "human" | "system";
  action: string;
  details: NonNullable<AuditEntry["details"]>;
  at: Date;
};

export type DemoCase = {
  id: string;
  receivedAt: Date;
  updatedAt: Date;
  fromEmail: string;
  subject: string;
  body: string;
  status: CaseStatus;
  extraction: NormalizedExtraction;
  decision: Decision;
  reasonCodes: string[];
  handlingMs: number;
  events: DemoEvent[];
  reply: {
    templateKey: string;
    subject: string;
    body: string;
    status: "draft" | "simulated_sent";
    editedByHuman: boolean;
  } | null;
  review: {
    decision: "approve" | "reject";
    note: string | null;
    reviewerLabel: string;
    at: Date;
  } | null;
  audit: DemoAudit[];
  /** The edit the clerk "made" in the legacy system, applied during the reset to stay truthful. */
  legacyChange:
    | { kind: "bank"; policyNo: string; input: BankInput }
    | { kind: "address"; policyNo: string; input: AddressInput }
    | null;
};

type Path =
  "auto" | "reply_only" | "awaiting" | "rejected_draft" | "rejected_sent";

type Scenario = {
  n: number;
  fixtureKey: string;
  email: { from: string; subject: string; body: string };
  /** Eval case id (its recorded model answer is used) or a literal extraction. */
  extraction: { evalId: string } | { literal: NormalizedExtraction };
  minutesAgo: number;
  path: Path;
  reviewNote?: string;
  /** Applied to the reply a human edits before sending. */
  edit?: (body: string) => string;
  legacyChange?: DemoCase["legacyChange"];
};

const MODEL = "claude-haiku-5-5";
const MIN = 60_000;
const demoId = (n: number) =>
  `d3300000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const literal = (
  partial: Partial<NormalizedExtraction> &
    Pick<NormalizedExtraction, "policyNo" | "primaryIntent">,
): NormalizedExtraction => ({
  language: "de",
  intents: [partial.primaryIntent],
  confidence: 0.95,
  identity: { senderName: null, dateOfBirth: null },
  address: null,
  bank: null,
  effectiveDate: null,
  termination: null,
  summary: null,
  ...partial,
});

const SCENARIOS: Scenario[] = [
  {
    n: 1,
    fixtureKey: "lehmann-work-email",
    email: {
      from: "m.lehmann@lehmann-bau.example",
      subject: "Neue Bankverbindung",
      body: "Guten Tag,\n\nich habe die Bank gewechselt. Bitte buchen Sie den Beitrag zu meiner Police AW-100114 künftig von diesem Konto ab:\n\nIBAN: DE02 1203 0000 0000 2020 51\nKontoinhaber: Markus Lehmann\n\nViele Grüße\nMarkus Lehmann",
    },
    extraction: {
      literal: literal({
        policyNo: "AW-100114",
        primaryIntent: "bank_change",
        identity: { senderName: "Markus Lehmann", dateOfBirth: null },
        bank: {
          iban: "DE02120300000000202051",
          accountHolder: "Markus Lehmann",
        },
      }),
    },
    minutesAgo: 5 * 60,
    path: "auto",
    legacyChange: {
      kind: "bank",
      policyNo: "AW-100114",
      input: { iban: "DE02120300000000202051", kontoinhaber: "Markus Lehmann" },
    },
  },
  {
    n: 2,
    fixtureKey: "fischer-irrevocable",
    email: {
      from: "wolfgang.fischer@example.org",
      subject: "Umzug: neue Anschrift",
      body: "Guten Tag,\n\nich bin umgezogen. Meine neue Anschrift zur Police AW-100112:\n\nElbchaussee 142\n22763 Hamburg\n\nMit freundlichen Grüßen\nWolfgang Fischer",
    },
    extraction: {
      literal: literal({
        policyNo: "AW-100112",
        primaryIntent: "address_change",
        identity: { senderName: "Wolfgang Fischer", dateOfBirth: null },
        address: {
          street: "Elbchaussee",
          houseNo: "142",
          plz: "22763",
          city: "Hamburg",
          country: "Deutschland",
        },
      }),
    },
    minutesAgo: 8 * 60,
    path: "auto",
    legacyChange: {
      kind: "address",
      policyNo: "AW-100112",
      input: {
        strasse: "Elbchaussee",
        hausnr: "142",
        plz: "22763",
        ort: "Hamburg",
        land: "Deutschland",
      },
    },
  },
  {
    n: 3,
    fixtureKey: "wojcik",
    email: A02.email,
    extraction: { evalId: "A02" },
    minutesAgo: 20 * 60,
    path: "reply_only",
  },
  {
    n: 4,
    fixtureKey: "rezaei",
    email: B03.email,
    extraction: { evalId: "B03" },
    minutesAgo: 26 * 60,
    path: "reply_only",
  },
  {
    n: 5,
    fixtureKey: "weiss",
    email: T01.email,
    extraction: { evalId: "T01" },
    minutesAgo: 25,
    path: "awaiting",
  },
  {
    n: 6,
    fixtureKey: "wagner-spouse-holder",
    email: B04.email,
    extraction: { evalId: "B04" },
    minutesAgo: 70,
    path: "awaiting",
  },
  {
    n: 7,
    fixtureKey: "krause-no-mandate",
    email: B05.email,
    extraction: { evalId: "B05" },
    minutesAgo: 3 * 60,
    path: "rejected_draft",
    reviewNote:
      "Es gibt kein gültiges SEPA-Mandat. Bitte zuerst ein neues Mandat einholen.",
  },
  {
    n: 8,
    fixtureKey: "fischer-irrevocable",
    email: T02.email,
    extraction: { evalId: "T02" },
    minutesAgo: 30 * 60,
    path: "rejected_sent",
    reviewNote:
      "Die bezugsberechtigte Person muss zustimmen; wir klären das telefonisch.",
    edit: (body) =>
      body.replace(
        "Bei Fragen antworten Sie bitte auf diese E-Mail.",
        "Bei Fragen antworten Sie bitte auf diese E-Mail oder rufen Sie uns an.",
      ),
  },
];

function recordedExtraction(
  evalId: string,
  email: Scenario["email"],
  now: Date,
) {
  const entry = loadSeededCache().find(
    (e) => e.key === computeCacheKey(email.subject, email.body),
  );
  if (!entry)
    throw new Error(`no recorded model answer for demo case ${evalId}`);
  const raw = extractionSchema.parse(entry.response);
  return { extraction: normalizeExtraction(raw, now), model: entry.model };
}

function buildCase(s: Scenario, now: Date): DemoCase {
  const fixture = buildCustomerFixtures(now).find(
    (f) => f.key === s.fixtureKey,
  );
  if (!fixture) throw new Error(`unknown fixture ${s.fixtureKey}`);
  const snapshot = snapshotFromFixture(fixture);
  const receivedAt = new Date(now.getTime() - s.minutesAgo * MIN);

  const { extraction, model } =
    "evalId" in s.extraction
      ? recordedExtraction(s.extraction.evalId, s.email, now)
      : { extraction: s.extraction.literal, model: MODEL };

  // The same pure rule engine the pipeline uses decides, at the time the case came in.
  const evaluation = evaluate(
    toRuleInput(extraction, {
      senderEmail: s.email.from,
      snapshot,
      now: receivedAt,
    }),
  );
  const human = s.path === "rejected_draft" || s.path === "rejected_sent";
  const executed = s.path === "auto";

  // Timeline. Steps 1-3 run on arrival; after a human decision the run continues at 4-6.
  const events: DemoEvent[] = [];
  const audit: DemoAudit[] = [
    {
      actor: "system",
      action: "case.received",
      details: { source: "seed" },
      at: receivedAt,
    },
  ];
  let clock = receivedAt.getTime() + 800;
  const add = (
    step: string,
    status: EventStatus,
    payload: unknown,
    durationMs: number,
    details: DemoAudit["details"] = {},
  ) => {
    const startedAt = new Date(clock);
    events.push({
      seq: events.length + 1,
      step,
      status,
      payload,
      startedAt,
      durationMs,
    });
    clock += durationMs;
    audit.push({
      actor: "agent",
      action: `step.${step}.${status}`,
      details: { step, status, durationMs, ...details },
      at: new Date(clock),
    });
  };

  add("analyze", "succeeded", { extraction, source: "cache", model }, 110);
  add("identify", "succeeded", { snapshot }, 1100 + s.n * 130);
  add(
    "evaluate",
    "succeeded",
    {
      decision: evaluation.decision,
      reasonCodes: evaluation.reasonCodes,
      results: evaluation.results,
      normalizedParams: evaluation.normalizedParams,
    },
    20,
    { decision: evaluation.decision, reasonCodes: evaluation.reasonCodes },
  );

  let review: DemoCase["review"] = null;
  if (s.path === "awaiting") {
    return finish("AWAITING_REVIEW", null);
  }
  if (human) {
    // A person looks at it a while later, then the run resumes.
    clock += (20 + s.n) * MIN;
    review = {
      decision: "reject",
      note: s.reviewNote ?? null,
      reviewerLabel: REVIEWER_LABEL,
      at: new Date(clock),
    };
    audit.push({
      actor: "human",
      action: "review.rejected",
      details: {
        reviewerLabel: REVIEWER_LABEL,
        hasNote: Boolean(s.reviewNote),
      },
      at: review.at,
    });
    clock += 900;
  }

  if (executed) {
    const params = evaluation.normalizedParams;
    const kind =
      params?.kind === "bank_change" ? "bank_change" : "address_change";
    add(
      "execute",
      "succeeded",
      {
        kind,
        outcome: "changed",
        ...(s.legacyChange?.kind === "bank"
          ? { ibanMasked: "DE02 **** **** **** **** 51" }
          : {}),
      },
      1700,
    );
    add("verify", "succeeded", { kind, verified: true }, 900);
  } else {
    add("execute", "skipped", { reason: human ? "REJECTED" : "NO_ACTION" }, 5);
    add("verify", "skipped", { reason: "NOTHING_TO_VERIFY" }, 3);
  }

  const templateKey: TemplateKey = selectTemplate({
    decision: evaluation.decision,
    intent: extraction.primaryIntent,
    reasonCodes: evaluation.reasonCodes,
    executed,
    review: human ? "rejected" : "none",
  });
  const rendered = render(
    templateKey,
    buildReplyVars(templateKey, {
      extraction,
      snapshot,
      executed,
      evaluation: {
        decision: evaluation.decision,
        reasonCodes: evaluation.reasonCodes,
        normalizedParams: evaluation.normalizedParams,
      },
    }),
  );
  const autoSent = !human;
  add("reply", "succeeded", { templateKey, autoSent }, 90);

  let reply: NonNullable<DemoCase["reply"]> = {
    templateKey,
    ...rendered,
    status: autoSent ? "simulated_sent" : "draft",
    editedByHuman: false,
  };
  if (autoSent) {
    audit.push({
      actor: "agent",
      action: "reply.sent_simulated",
      details: { step: "reply" },
      at: new Date(clock),
    });
    return finish("DONE", reply);
  }
  if (s.path === "rejected_draft") return finish("REPLY_READY", reply);

  // rejected_sent: the reviewer edits the draft, then sends it.
  clock += 6 * MIN;
  const editedBody = s.edit ? s.edit(reply.body) : reply.body;
  if (editedBody === reply.body)
    throw new Error(`demo edit of case ${s.n} changed nothing`);
  reply = { ...reply, body: editedBody, editedByHuman: true };
  audit.push({
    actor: "human",
    action: "reply.edited",
    details: { reviewerLabel: REVIEWER_LABEL },
    at: new Date(clock),
  });
  clock += 2 * MIN;
  reply = { ...reply, status: "simulated_sent" };
  audit.push({
    actor: "human",
    action: "reply.sent_simulated",
    details: { reviewerLabel: REVIEWER_LABEL },
    at: new Date(clock),
  });
  return finish("DONE", reply);

  function finish(status: CaseStatus, replyRow: DemoCase["reply"]): DemoCase {
    return {
      id: demoId(s.n),
      receivedAt,
      updatedAt: new Date(clock),
      fromEmail: s.email.from,
      subject: s.email.subject,
      body: s.email.body,
      status,
      extraction,
      decision: evaluation.decision,
      reasonCodes: evaluation.reasonCodes,
      handlingMs: events.reduce((sum, e) => sum + e.durationMs, 0),
      events,
      reply: replyRow,
      review,
      audit,
      legacyChange: s.legacyChange ?? null,
    };
  }
}

/** The demo cases for a reset at `now`, oldest first. */
export function buildDemoCases(now: Date): DemoCase[] {
  return SCENARIOS.map((s) => buildCase(s, now)).sort(
    (a, b) => a.receivedAt.getTime() - b.receivedAt.getTime(),
  );
}
