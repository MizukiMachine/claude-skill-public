---
name: llm-control-layer
description: >-
  Design or review a deterministic control layer wrapping a stochastic LLM so its
  output stays grounded, on-task, and within bounds every turn. It Directs (a plan
  object from app state declaring this turn's goals, the facts the model may treat
  as real, and what it must not reveal), Censors (validate output against ground
  truth: invented references, fabricated claims, boundary leaks, passive filler,
  repetition), and Corrects (feed the violated invariant back as a revision hint
  and regenerate, bounded, then fall back to a safe deterministic output). Use for
  LLM generation that must not hallucinate events/claims, leak hidden info, or
  stall instead of advancing: turn-based agents, NPC/character dialogue,
  multi-agent simulations, tutoring turns, RAG answerers bound to retrieved
  context, or assistants with private state. Triggers: "the model invents things
  that didn't happen", "stop it citing unseen context", "make it commit",
  "hallucination guard", "grounding/faithfulness check", "revision loop".
---

# LLM Control Layer

## Purpose

Build the deterministic scaffolding that makes a non-deterministic generator
behave: a per-turn loop that **Directs** what the model should do, **Censors**
what it actually produced against ground truth, and **Corrects** violations
before they reach the user.

## Operating Model

Treat the LLM as a fast, fluent, **unreliable** generator. Quality is not a
property of the prompt; it is a property of the loop around the prompt. The
control layer owns three responsibilities every turn:

1. **Direct** — Before generating, compute a small deterministic *plan object*
   from application state: the intent(s) this turn must achieve, the whitelist of
   facts the model may treat as real, the information it must not reveal, and
   whether it must commit to a forward move. Render that into the prompt.
2. **Censor** — After generating, compare the output to the **visible context
   set** (what actually exists) and to the plan's contract. Faithfulness is a
   comparison, not a vibe. Produce concrete violations.
3. **Correct** — On violation, feed the *specific* broken invariant back as a
   revision hint and regenerate, a bounded number of times, then fall back to a
   safe deterministic output. Never discard-and-hope; never hang on a stubborn
   model.

**The load-bearing invariant:** *the model may only treat as real what is in the
visible context.* Everything else is invention. Most failures are a violation of
this one rule — enforce it in the plan (whitelist) and check it in the censor
(grounded references).

**Priority when trade-offs collide:** correctness/faithfulness > staying on-task
> style/voice > latency. A dull-but-true fallback beats a fluent fabrication.

Before implementing, establish:

- **What is ground truth this turn?** The exact set of facts/transcript the
  output may reference. If you cannot enumerate it, you cannot censor.
- **What must stay hidden?** Private state, other actors' secrets, system rules.
- **Is the context cold?** First turn / empty history / fresh thread. If so, do
  **not** force a committed move — that is the #1 cause of fabricated filler.
- **What is the safe fallback output?** The deterministic line used when
  correction fails. It must always be valid and boring.

## Workflow

1. **Discover the state and the boundary.** Identify, in the target app: where
   per-turn generation happens, what application state is available to build a
   plan from, what counts as ground truth, and what is hidden from whom. If the
   app sends one big prompt with everything inlined, the first fix is usually an
   information boundary (see `references/architecture.md`).
2. **Define the plan object (Direct).** Model the per-turn contract as data, not
   prose. Derive intents and the fact whitelist from state. Apply the
   cold-context rule. Read `references/plan-object.md`.
3. **Enumerate failure modes and write validators (Censor).** Pick the failure
   modes that actually occur for this app and write grounded checks for them.
   Keep language cue-words as configuration (a lexicon), not hardcoded logic.
   Read `references/failure-modes.md` and `references/validators.md`.
4. **Wire the revision loop (Correct).** Bounded attempts, revision hint fed
   back, safe deterministic fallback, diagnostics on every attempt.
5. **Adapt the starter harness.** Copy `assets/control-layer/` into the project
   and replace the plan derivation, the lexicon, and the validator set. Keep the
   loop and the types.
6. **Verify** (see Verification). Confirm each failure mode is caught on a known
   bad output, that the hint flows back, and that the fallback path works.

## Reference Files

| Topic | File | Use When |
|-------|------|----------|
| Designing the plan/director layer | [plan-object.md](references/plan-object.md) | Deciding what goes in the plan, intents, fact whitelist, forward-move, cold-context, two output channels |
| Faithfulness failure taxonomy | [failure-modes.md](references/failure-modes.md) | Identifying which hallucination/quality failures to detect and the revision-hint to use for each |
| Validator patterns & pitfalls | [validators.md](references/validators.md) | Implementing detectors, keeping patterns as config, metadata round-trip, anti-repetition |
| Cross-cutting architecture | [architecture.md](references/architecture.md) | Information boundary, integration into the app loop, bounded attempts + fallback, relationship to a latency runtime |

## Starter Harness (assets/control-layer/)

A dependency-free, typed, runnable reference implementation. Copy it in and adapt.

| File | Role |
|------|------|
| `plan.ts` | Direct layer: `ControlPlan` type, `definePlan` (bakes in the cold-context invariant), `renderPlan` |
| `validators.ts` | Censor layer: `Validator` type, `groundedReferences`, `noBoundaryLeak`, `hasForwardSubstance`, `notRepetitive`, `runValidators` |
| `revisionLoop.ts` | Correct layer: `runRevisionLoop` (bounded attempts, hint feedback, safe fallback, diagnostics hook) |
| `lexicons.ts` | English/Japanese cue words — detection patterns as configuration |
| `index.ts` | Barrel export |
| `demo.ts` | Runnable self-check (fake self-correcting generator, no API key) |

Verify the harness runs: `node --import tsx assets/control-layer/demo.ts` (expects
`ALL PASS`). Run it from a project that has `tsx` resolvable; if none, `npm i -D
tsx` first (the harness itself is dependency-free — `tsx` is only the TS runner).

## Patterns and Examples

**The loop, in shape:**

```ts
const plan = definePlan({ hasPriorContext, intents, allowedFacts, mustNotReveal, wantsForwardMove });
const validators = [groundedReferences(lexicon), noBoundaryLeak, hasForwardSubstance(lexicon)];
const { value, accepted, usedFallback } = await runRevisionLoop({
  generate: (hint) => callModel(buildPrompt(renderPlan(plan), hint)),   // Direct (+ hint on retry)
  validate: (out) => runValidators({ output: out, visibleFacts, entities, plan }, validators), // Censor
  fallback: () => safeDeterministicLine(plan),                          // Correct: never hang
  maxAttempts: 3,
  onAttempt: (info) => telemetry.record(info)
});
```

**Cold-context rule (the hard-won one):**

```ts
// First turn: no history exists. Forcing "commit to a position" makes the model
// invent a history to react to. Open instead — but still demand substance.
const plan = definePlan({ hasPriorContext: false, intents: [openingIntent], wantsForwardMove: true });
// plan.requiresForwardMove === false  (definePlan overrides it in cold context)
```

## Anti-Patterns

**Prompt-only faithfulness ("In the prompt I told it not to make things up").**
Why it fails: a stochastic generator violates instructions probabilistically; with
enough turns it *will* fabricate. Better: enumerate the allowed facts and *check*
the output against them. Instructions reduce the rate; the censor enforces the
floor.

**Discard-and-retry with the same prompt.** Why it fails: an identical prompt
re-rolls the same distribution; you pay latency for another coin flip. Better:
feed the *specific* violated invariant back as a revision hint so the retry is
informed.

**Forcing a stance on the opening turn.** Why it fails: with no real history, "take
a position" is satisfiable only by inventing one. Better: cold-context plans open
the topic and relax forward-move, while still rejecting passive filler.

**"Pretend you don't know X" in the prompt.** Why it fails: the secret is in the
context, so it leaks under pressure. Better: an information boundary — never put
X in that actor's context in the first place (see `references/architecture.md`).

**Hardcoding language patterns into validator logic.** Why it fails: the detector
becomes unmaintainable and monolingual. Better: pass cue words as a `Lexicon`;
keep the detection *strategy* in code, the *patterns* in config.

**Unbounded correction.** Why it fails: a stubborn model can loop forever and
freeze the product. Better: bounded attempts then a safe deterministic fallback.

## Variation Guidance

Adapt by context; do not ship one fixed validator set:

- **Output channel** — a *public/spoken* line needs boundary + grounding +
  substance checks; an *internal/structured decision* needs schema parse + a
  legal-choice check, not prose validators. Keep the two channels separate.
- **Domain** — RAG answerers center on "every claim traces to a retrieved
  chunk"; character/agent sims center on "no invented events + no boundary leak";
  tutoring centers on "advance the learner + don't assert unstated facts".
- **Language** — swap the lexicon; expect richer morphology (e.g. Japanese) to
  need phrase patterns rather than word membership.
- **Risk level** — higher stakes warrant more attempts, stricter validators, and
  a more conservative fallback; a low-stakes flavor line can run a single pass.
- **Repetition pressure** — multi-actor settings need `notRepetitive` fed with
  prior actors' angles; a single-actor assistant usually does not.

## Verification

- Run `node --import tsx assets/control-layer/demo.ts` → `ALL PASS`.
- For each failure mode you implemented: craft one known-bad output and assert
  the matching validator returns a violation, and one known-good output and
  assert it passes.
- Assert the revision hint reaches the generator on retry (the demo checks this).
- Assert the fallback path returns the safe output when every attempt fails.
- Confirm hidden state is absent from the actor's *context construction*, not
  merely instructed-against (grep the prompt builder, not the prompt text).
