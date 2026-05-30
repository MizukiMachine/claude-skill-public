---
name: playwright-testing
description: "Plan, implement, and debug frontend tests: unit/integration/E2E/visual/a11y. Drives the browser-observer MCP (browser_* tools, Playwright-backed) for real-browser/E2E automation, plus Vitest/Jest/RTL, flaky test triage, CI stabilization, and canvas/WebGL games (Phaser) needing deterministic input plus screenshot/state assertions. Trigger: \"test\", \"E2E\", \"flaky\", \"visual regression\", \"Playwright\", \"game testing\"."
metadata:
  short-description: "Frontend testing on the browser-observer MCP: E2E, Vitest, flaky triage, game testing."
---

# Frontend Testing

Unlock reliable confidence fast: enable safe refactors by choosing the right test layer, making the app observable, and eliminating nondeterminism so failures are actionable.

## Execution Substrate: browser-observer

This skill drives the **browser-observer** MCP (tools prefixed `browser_`, fully-qualified `mcp__browser-observer__browser_*`) as its real-browser layer. That MCP is Playwright-backed (Chromium) and capability-only; this skill owns the test methodology.

Two layers, one substrate:
- **Browser-driving steps** (E2E, game flows, visual capture) use `browser_*` tools.
- **Runner-agnostic layers** — unit (Vitest/Jest), component (RTL), pixel diffing (`imgdiff.py`), CI wiring — touch no MCP and are unchanged by this.

Tool mapping (official Playwright MCP → this MCP):

| Need | `browser_*` tool / note |
|------|-------------------------|
| navigate | `browser_navigate` (pass `url`; start the dev server with `BROWSER_OBSERVER_BLOCK_PRIVATE_IPS=false` so `localhost` isn't blocked) |
| console messages | `browser_observe` — returns console errors/warnings/all messages |
| network requests | `browser_observe` — returns failed + non-2xx requests |
| DOM / element refs | `browser_observe` — DOM outline + interactive elements; act by **CSS selector**, not a snapshot ref |
| click | `browser_click { selector }` |
| keyboard | `browser_press_key { key }` (real keydown/keyup; WASD/arrows) |
| type text | `browser_type { selector, text }` (sets value; for key events use `browser_press_key`) |
| read app state | `browser_evaluate { expression }` — **sandboxed**: ≤1000 chars; `require/import/process/fs/Function/eval/globalThis` blocked. Read `window.__TEST__` only; expression must return JSON-serializable data |
| screenshot | `browser_screenshot` (saved under `.browser-observer/screenshots`) |
| wait for ready | `browser_wait { selector }` on a DOM ready-marker, or poll `browser_evaluate "window.__TEST__?.ready === true"` (`browser_wait` cannot poll arbitrary JS) |

Relationship to the **frontend-observation** skill: that one is the fast, in-loop "is it OK *now*?" check on the same MCP; this skill turns a confirmed, stable flow into a durable CI test. Confirm there; codify here.

## Philosophy: Confidence Per Minute

Frontend tests fail for two reasons: the product is broken, or the test is lying. Your job is to maximize signal and minimize "test is lying".

**Before writing a test, ask**:
- What user risk am I covering (money, progression, auth, data loss, crashes)?
- What's the narrowest layer that catches this bug class (pure logic vs UI vs full browser)?
- What nondeterminism exists (time, RNG, async loading, network, animations, fonts, GPU)?
- What "ready" signal can I wait on besides `setTimeout`?
- What should a failure print/screenshot so it's diagnosable in CI?

**Core principles**:
1. **Test the contract, not the implementation**: assert stable user-meaningful outcomes and public seams.
2. **Prefer determinism over retries**: make time/RNG/network controllable; remove flake at the source.
3. **Observe like a debugger**: console errors, network failures, screenshots, and state dumps on failure.
4. **One critical flow first**: a reliable smoke test beats 50 flaky tests.

## Test Layer Decision Tree

Pick the cheapest layer that provides needed confidence:

| Layer | Speed | Use For |
|-------|-------|---------|
| **Unit** | Fastest | Pure functions, reducers, validators, math, pathfinding, deterministic simulation |
| **Component** | Medium | UI behavior with mocked IO (React Testing Library, Vue Testing Library) |
| **E2E** | Slowest | Critical user flows across routing, storage, real bundling/runtime |
| **Visual** | Specialized | Layout/pixel regressions; for canvas/WebGL, only after locking determinism |

## Quick Start: First Smoke Test

1. **Define 1 critical flow**: "page loads → user can start → one key action works"
2. **Add a test seam** to the app (see below)
3. **Choose runner**: the browser-observer MCP (`browser_*`) for E2E, unit tests (Vitest/Jest) for logic
4. **Fail loudly**: treat console errors and failed requests as test failures
5. **Stabilize**: seed RNG, freeze time, fix viewport, disable animations

## Concrete MCP Workflow: Testing a Game

Step-by-step sequence for testing a Phaser/canvas game on the browser-observer MCP. Note `browser_evaluate` takes a JS **expression string** (not a function) and is sandboxed, so readiness is waited on a DOM marker rather than an in-page Promise.

```
1. browser_navigate { url: "http://localhost:3000?test=1&seed=42" }
   (One navigation. Start the dev server with BROWSER_OBSERVER_BLOCK_PRIVATE_IPS=false so localhost loads.)

2. browser_wait { selector: "[data-test-ready]" }
   (Have the seam set a DOM ready-marker, e.g. document.body.dataset.testReady = "1".
    Alternative: poll browser_evaluate { expression: "window.__TEST__?.ready === true" }.)

3. browser_observe { includeScreenshot: false, maxElements: 20 }
   (One call returns console errors AND network failures. Fail on any own-origin error.)

4. browser_click { selector: "button#start" }
   (Act by CSS selector — this MCP has no snapshot-ref model.)

5. browser_evaluate { expression: "window.__TEST__.state()" }
   (Assert game state. Must return JSON-serializable data; expression ≤ 1000 chars.)

6. browser_press_key { key: "ArrowRight" }
   (Real keydown/keyup — WASD/arrows for movement.)

7. browser_evaluate { expression: "window.__TEST__.state().player.x" }
   (Verify movement happened.)

8. browser_screenshot
   (Visual evidence after deterministic setup; saved under .browser-observer/screenshots.)
```

## Recommended Test Seams

Add to the app for testability (read-only, stable, minimal):

```javascript
window.__TEST__ = {
  ready: false,           // true after first interactive frame
  seed: null,             // current RNG seed
  sceneKey: null,         // current scene/route
  state: () => ({         // JSON-serializable snapshot
    scene: this.sceneKey,
    player: { x, y, hp },
    score: gameState.score,
    entities: entities.map(e => ({ id: e.id, type: e.type, x: e.x, y: e.y }))
  }),
  commands: {             // optional mutation commands
    reset: () => {},
    seed: (n) => {},
    skipIntro: () => {}
  }
};
```

**Rule**: Expose IDs + essential fields, not raw Phaser/engine objects.

## Anti-Patterns to Avoid

❌ **Testing the wrong layer**: E2E tests for pure logic
*Why tempting*: "Let's just test everything through the browser"
*Better*: Unit tests for logic; reserve E2E for integration contracts

❌ **Testing implementation details**: Asserting DOM structure/classnames
*Why tempting*: Easy to assert what you can see in DevTools
*Better*: Assert user-meaningful outputs (text, score, HP changes)

❌ **Sleep-driven tests**: `wait 2s then click`
*Why tempting*: Simple and "works on my machine"
*Better*: Wait on explicit readiness (DOM marker, `window.__TEST__.ready`)

❌ **Uncontrolled randomness**: RNG/time in assertions
*Why tempting*: "The game uses random, so the test should too"
*Better*: Seed RNG (`?seed=42`), freeze time, assert stable invariants

❌ **Pixel snapshots without determinism**: Canvas screenshots that flake
*Why tempting*: "I'll catch visual bugs automatically"
*Better*: Deterministic mode first; then screenshot at known stable frames

❌ **Retries as a strategy**: "Just bump retries to 3"
*Why tempting*: Quick fix that makes CI green
*Better*: Fix the flake source; retries hide real problems

## Debugging Failed Tests

When a test fails, gather evidence in this order:

1. **Console errors + network failures**: `browser_observe { includeScreenshot: false, maxElements: 20 }` — one call returns both; fail on any own-origin console/page error or failed/non-2xx request
2. **Screenshot**: `browser_screenshot` → visual state at failure (saved under `.browser-observer/screenshots`)
3. **App state**: `browser_evaluate { expression: "window.__TEST__.state()" }`
4. **Classify the flake** (see references/flake-reduction.md):
   - Readiness? → add explicit wait
   - Timing? → control animation/physics
   - Environment? → lock viewport/DPR
   - Data? → isolate test data

## Graduation Criteria: When Is Testing "Enough"?

Minimum viable test suite:
- [ ] **1 smoke test** that proves the app loads and primary action works
- [ ] **Test seam exists** (`window.__TEST__` with ready flag and state)
- [ ] **Deterministic mode** for canvas/games (`?test=1` enables seeding)
- [ ] **Console errors fail tests** (no silent failures)
- [ ] **CI runs tests** on every push

Level up when:
- Critical paths (auth, payment, save/load) have dedicated E2E
- Unit tests cover complex logic (pathfinding, damage calc, state machines)
- Visual regression on key screens (menu, HUD) with locked determinism

## Visual Regression with imgdiff.py

For pixel comparison of screenshots:

```bash
# Compare baseline to current
python scripts/imgdiff.py baseline.png current.png --out diff.png

# Allow small tolerance (anti-aliasing differences)
python scripts/imgdiff.py baseline.png current.png --max-rms 2.0
```

Exit codes: 0 = identical, 1 = different, 2 = error

## UI Slicing Regressions (Nine-Slice / Ribbons / Bars)

Canvas UI issues (panel seams, segmented ribbons, invisible HUD fills) are best caught with a dedicated UI harness instead of the full gameplay flow.

1. Build a simple `test.html`/scene that loads *only* the UI assets.
2. Render raw slices next to assembled panels (multi-size), and include ribbon/bars with both “raw crop + scale” and “stitched multi-slice” views.
3. Expose `window.__TEST__` with `.commands.showTest(n)` so the browser MCP can toggle each mode deterministically (drive it via `browser_evaluate { expression: "window.__TEST__.commands.showTest(2)" }`).
4. Capture targeted screenshots (panels, ribbons, bars) and diff them in CI.

See `references/phaser-canvas-testing.md` for the deterministic setup + screenshot workflow.

## Variation Guidance

Adapt approach based on context:
- **DOM app**: Standard CSS selectors via `browser_click`/`browser_observe`, wait for elements with `browser_wait`
- **Canvas game**: Test seams mandatory, wait via `window.__TEST__.ready`
- **Hybrid**: DOM for menus, test seams for gameplay
- **CI-only GPU**: May need software rendering flags or skip visual tests
- **UI slicing regressions**: For nine-slice/ribbon/bar artifacts, prefer a small UI harness scene/page with deterministic modes and targeted screenshots (`references/phaser-canvas-testing.md`).

## Bundled Resources

Read these when needed:
- `references/playwright-mcp-cheatsheet.md`: tool patterns written against the **official Playwright MCP** API — translate each call to a `browser_*` tool using the mapping table in "Execution Substrate" above (e.g. `browser_snapshot`+ref → `browser_observe`+CSS selector)
- `references/phaser-canvas-testing.md`: Deterministic mode for Phaser games
- `references/flake-reduction.md`: Flake classification and fixes

## Remember

You can make almost any frontend (including canvas/WebGL games) testable by adding a tiny, stable seam for readiness + state. One reliable smoke test is the foundation. Aim for tests that are boring to maintain: deterministic, explicit about readiness, and rich in failure evidence. The goal is confidence, not coverage numbers.
