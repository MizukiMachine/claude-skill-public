---
name: frontend-observation
description: "Verify frontend UI in a real browser by observing it, not guessing. Drives the browser-observer MCP (browser_observe / browser_audit / browser_screenshot) with an escalation decision tree: light screenshot first, structured observation when DOM/errors matter, full multi-viewport audit only when something is wrong. Use after a frontend change to confirm it actually renders/works, when console errors or network failures are suspected, or when responsive/layout breakage needs checking. Trigger: \"見た目を確認\", \"UI確認\", \"observe the page\", \"check the UI\", \"レイアウト崩れ\", \"audit\", \"browser_observe\"."
metadata:
  short-description: "Real-browser UI verification via browser-observer; escalate screenshot→observe→audit."
  type: workflow
---

# Frontend Observation

Confirm a frontend actually renders and works by **observing it in a real browser**, instead of declaring "looks done" from the code alone. This skill owns the *judgment* — when to look lightly, when to look deeply — while the `browser-observer` MCP owns the *capability* (running the browser, capturing DOM/console/network, flagging layout candidates).

## Division of Responsibility

- **MCP = capability.** It executes against a live Chromium session and returns structured data + knobs. It does not decide *when* or *how much* to look.
- **This skill = judgment.** Choose the cheapest observation that yields confidence, set the knobs, interpret the results (is a flagged layout candidate a real bug?), and decide whether to escalate.

Keep this boundary: never push "when/which/how-much" decisions back into the MCP, and never reimplement the MCP's capture/heuristics here via `browser_evaluate`.

## Core Principle: Confidence Per Token

Every screenshot costs the model attention and latency; every full audit costs wall-clock. Start with the lightest observation that could disprove "it works," and escalate only on a signal. One honest light check beats a reflexive full audit.

## Escalation Decision Tree

Navigate **once**, then climb only as far as the situation demands:

```
0. browser_navigate (once)        → load the page / dev server URL
        │
        ▼
1. browser_screenshot             → "does it visually look right?"
   - selector: capture just the changed component when possible
   - this is the default first look for a routine visual change
        │  see something off, or need DOM/errors/state? ↓
        ▼
2. browser_observe                → "what does the DOM/console/network say?"
   - includeScreenshot:false + maxElements:20 for a fast diagnostic pass
   - returns DOM outline, interactive elements, forms, console errors,
     network failures, layout-break candidates in ONE call
        │  errors present, cause unclear, or responsive breakage suspected? ↓
        ▼
3. browser_audit                  → "is it sound across viewports?"
   - in an edit loop: viewports:["desktop"], includeScreenshots:false
   - to investigate: viewports:["desktop","mobile"], includeScreenshots:true
```

**Stop at the lowest rung that gives you confidence.** Do not run `browser_audit` by reflex on every change — reserve it for: errors are occurring, the cause is unclear, or you suspect responsive/layout breakage.

## Knob Policy (this skill sets them; the MCP only exposes them)

| Situation | Tool + knobs |
|-----------|--------------|
| Routine "does it look right" | `browser_screenshot` (use `selector` to scope) |
| Fast diagnostic | `browser_observe` `{ includeScreenshot:false, maxElements:20 }` |
| Need the visual + the data | `browser_observe` `{ includeScreenshot:true }` |
| Edit-loop audit | `browser_audit` `{ viewports:["desktop"], includeScreenshots:false }` |
| Investigate a real problem | `browser_audit` `{ viewports:["desktop","mobile"], includeScreenshots:true }` |

## Interpreting Results (judgment lives here)

- **Layout-break candidates are candidates, not verdicts.** The MCP flags suspicious overflow/overlap/clipping heuristically. Confirm against the screenshot and the component's intent before calling it a bug — an intentional horizontal scroller is not "overflow."
- **Console errors fail the check.** Treat any console/page error as "not done" unless you can explain why it's benign (e.g. a known third-party warning).
- **Network failures matter by origin.** A failed request to your own API is a real defect; a blocked third-party beacon usually is not.
- **State, not pixels, for behavior.** To verify an interaction worked, prefer reading state via `browser_extract` / `browser_evaluate` over eyeballing a screenshot.

## Stable-Session Workflow

The MCP holds one live browser session across calls. Exploit it:

1. `browser_navigate` to the URL **once**. Re-navigating resets state (cookies/localStorage are kept until `browser_reset`).
2. For subsequent observations, **omit `url`** so you observe the current state in place — passing `url` re-navigates (and `browser_audit` re-navigates per viewport).
3. Prefer `browser_wait { type:"selector" }` on a completion marker over `networkidle` — polling/HMR apps make `networkidle` wait until timeout.
4. Use `browser_clear_telemetry` (or the `clearTelemetry` knob) before an action when you want console/network results scoped to just that action.

## Anti-Patterns

❌ **Reflexive full audit** on every tiny change → slow, token-heavy. *Better*: screenshot first; audit only on a signal.
❌ **Re-navigating before each observation** → throws away session state. *Better*: navigate once, then observe with no `url`.
❌ **`networkidle` waits on live-reload apps** → times out. *Better*: wait on a selector that marks "ready."
❌ **Treating a layout-break candidate as a confirmed bug** → false positives. *Better*: confirm against screenshot + intent.
❌ **Reimplementing observation via `browser_evaluate`** → reinvents the MCP, loses structure. *Better*: use `browser_observe`.
❌ **Declaring "done" without ever opening the browser** → the exact failure this MCP exists to prevent.

## Handoff to Durable Tests

This skill answers "is it OK *now*", not "will it *stay* OK". Once a flow is confirmed and stable, lock it in: hand off to the **playwright-testing** skill to author a durable regression test (unit/component/E2E/visual) that runs in CI. Both skills drive the same `browser-observer` MCP — this one for fast in-loop verification, playwright-testing for the permanent safety net. Confirm here first; codify there.

## "Enough" Criteria

A frontend change is verified when:
- [ ] The page was actually loaded in the browser (not assumed)
- [ ] The changed component was seen (screenshot) **and** is free of console/page errors (`browser_observe`)
- [ ] No own-origin network failures
- [ ] If layout/responsive was in scope: `browser_audit` across the relevant viewports shows no confirmed breakage

## Security Note

The MCP blocks private/local addresses by default (incl. subresources). To verify a **local dev server**, it must be started with `BROWSER_OBSERVER_BLOCK_PRIVATE_IPS=false` in a trusted environment — otherwise navigation to `localhost`/RFC1918 is blocked by design.

## Tool Reference

All tools are exposed by the `browser-observer` MCP (fully-qualified as `mcp__browser-observer__<tool>`):

- **Observe (the specialty):** `browser_observe`, `browser_audit`, `browser_screenshot`
- **Drive:** `browser_navigate`, `browser_click`, `browser_type`, `browser_press_key`, `browser_scroll`, `browser_wait`
- **Inspect:** `browser_extract`, `browser_evaluate`
- **Session/output:** `browser_reset`, `browser_clear_telemetry`, `browser_pdf`

(`browser_press_key` dispatches real keydown/keyup — use it for keyboard-driven UI; `browser_type` only sets an input's value.)

## Remember

The MCP gives you eyes; this skill decides where to look. Lead with the lightest observation, escalate only on a signal, interpret candidates with judgment, and never declare a UI done without having actually observed it.
