# Five-minute guide

**Live demo: <https://alpenwerk-clerk.vercel.app/>**

This walk-through shows the whole idea in about five minutes. The console is in German; each step says what to click and what to look for. All data is synthetic and is reset every night, so you cannot break anything.

The principle to keep in mind: **the LLM understands, the rules decide, templates speak, the browser executes.**

## Before you start

- Everything below uses the sample emails in **Posteingang** (inbox). They have recorded model answers, so they run in seconds, cost nothing and always work.
- The legacy system ("Altsystem") has its own login and is not open to visitors. You will see it through the screenshots the clerk takes while operating it.
- If the demo looks used by someone else, that is fine: the daily reset restores a clean state.

## 1. See what is there (30 s)

Open **Fälle** (cases). Eight demo cases are preloaded: some completed by the clerk alone, some waiting for a human, some answered without a change. Use the status and decision filters. Open any case to get the idea of the page you will use below.

## 2. Watch a bank change run on its own (90 s)

1. Open **Posteingang**.
2. Choose **Bankverbindung ändern (formell)** and click **An den Clerk senden**.
3. You land on the case page. Watch the **Ablauf** (timeline): analyze the email, identify the policy, check the rules, execute, verify, reply. It takes a few seconds.
4. When the status shows **Erledigt**, look at:
   - **Entscheidung** and **Warum?** (hover or tap the reason badges): all rules passed, so the clerk acts alone.
   - **Browser-Schritte im Altsystem**: screenshots of the old admin system, taken while the clerk found the policy, filled in the form, saved it and read the result back. Click one to enlarge.
   - **Antwort an den Absender**: the German reply, built from a template. The IBAN is masked.

The clerk changed the data by operating a normal web UI, the way a person would. There is no database shortcut and no integration with the legacy system.

## 3. See a risky request stop (60 s)

1. Back in **Posteingang**, choose **Kündigung** (termination) and send it.
2. The case ends at **Wartet auf Freigabe** (waiting for approval). Terminations are never executed automatically.
3. On the case page you can see the prepared case, the reason code `TERM_ALWAYS_REVIEW`, and a preview of the reply.
4. Click **Freigeben** (approve) or **Ablehnen** (reject), add a note if you like. Nothing is written to the legacy system for a termination either way; the reply is prepared for you to edit and send (simulated).

Also try **Konto einer anderen Person** (the account holder is someone else) or **Umzug und neues Konto in einer Mail** (move and new account in one email): both stop at the review gate with a different reason code.

## 4. Try to trick it (45 s)

Send **Manipulationsversuch im Text**. The email asks the system to mark the case as checked and execute it. The model reads the text, but only the rules decide, so the case still stops for review because the account holder does not match. The model cannot trigger an action.

## 5. Check the paper trail (45 s)

- **Freigaben**: the queue of everything waiting for a human.
- **Audit**: every action by the agent or a human, append-only. Filter by actor or case.
- **Kennzahlen**: share of cases handled automatically, handling time, live-model usage and estimated cost, and the result of the 24-case evaluation (with the caveat that the rules were tuned on those cases).
- **Über Demo**: the principle, the flow and the limits of the demo.

## 6. Optional: your own email (30 s)

In **Posteingang**, choose **Eigene E-Mail schreiben** and write a request in German or English. This one is analyzed by the live model, so it counts against the limits (10 live analyses per hour per visitor, a daily cap for everyone). If a limit is reached you get a message in German and the samples keep working.

## What to take away

- The model is used only to understand text; every decision is a visible, tested rule with a reason code.
- Autonomy depends on risk: address changes can run alone, bank changes only under strict rules, terminations never.
- Every step leaves evidence: timeline, screenshots, read-back verification, audit log.

More detail: [README](../README.md), [architecture](architecture.md), [decision log](decisions.md).
