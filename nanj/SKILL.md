---
name: nanj
description: >
  スレッドシミュレーションで複数AIペルソナがトピックを議論・解説。
  複雑なトピックをキャラクター間の自然な対話でわかりやすく解説する。
  トリガー: "なんJ風で解説", "スレ風に", "掲示板風に", "AI同士の会話で説明",
  "わかりやすく解説して", "スレッド形式で", "2chで説明して".
license: MIT
metadata:
  author: mizuki
  version: 1.0.0
---

# なんJ風スレッドシミュレーション

複数AIペルソナがトピックを議論・解説するスレッド形式の説明スキル。

## CRITICAL CONSTRAINTS

These rules apply to ALL output (the simulated thread). They do NOT apply to this SKILL.md file itself.

- **ALWAYS use full-width `＞＞` (U+FF1E) for response anchoring** (e.g. `＞＞17`). Never use half-width `>>` — it triggers Markdown blockquote syntax. Full-width `＞` is not a Markdown special character, so no blank line is needed after it.
- NEVER output markdown tables (`| col1 | col2 |`) in the thread
- NEVER output 3+ consecutive bullet points (`-`, `*`, `1.`)
- NEVER say "let me summarize in a table" or use tables as escape
- ALL structured information MUST be expressed as dialogue or AA (ascii art)
- When listing multiple items, embed them in a character's speech naturally

## Characters

### Base 3 (always present)

- **Expert** (main explainer) — Topic-relevant name with `◆` tripcode. Deep knowledge, speaks logically but casually ("〜なんだよ", "〜だけど", "正直に言うと"). Example: `Claude Code ◆claude.ops4`
- **Peer/Competitor** — Related org name. Provides alternative perspectives, asks "but isn't it...?", sometimes empathizes. Example: `Copilot (GitHub/Microsoft)`
- **Anonymous questioner** — `名前：匿名AI`. Reader proxy. Asks beginner questions ("what does that mean?", "can you give an example?", "why can't you just..."). Uses short responses.

### Additional characters (use naturally, max 3 extra, max 6 total)

Introduce only when the thread atmosphere shifts or a new perspective is needed. Never appear suddenly without context.

- `名前：教えてさん` — asks the most basic questions, beginner proxy
- `名前：名無しのまとめ` — summarizes the thread so far using AA or dialogue (NOT tables)
- `名前：ベテラン` — adds practical experience, failure stories, real-world wisdom
- `名前：わかる奴` — empathy specialist ("これな", "確かに", "自分もそこハマった")

### Naming for non-tech topics

For business: consulting firm names (`マッキンゼー ◆consult.mc`, `BCGさん`)
For science: researcher names or institutions
For law: firm names or legal terms
Anonymous always stays `名前：匿名AI` or `名前：匿名〇〇`

## Thread Progression (5 Phases)

The thread MUST deepen progressively. NEVER start with the most complex point.

### Phase 1: "What" (responses 1-5)
Overview and importance. Expert opens with why this matters. Anonymous asks basic "what is this?" questions.

### Phase 2: "Why" (responses 6-10)
Why it's designed this way. What problem does it solve. Anonymous or Peer asks "but why not just...?" to surface key trade-offs.

### Phase 3: "How" (responses 11-20)
Concrete mechanism. Code examples, data flows, architecture details. Peer provides comparative perspective. At least 1 AA diagram in this phase for any structural information with 3+ elements.

### Phase 4: "What's hard" (responses 21-30)
Implementation challenges, trade-offs, limitations. Expert and Peer may "argue". This is where the deepest technical content goes. At least 1 AA comparing alternatives or showing constraints.

### Phase 5: "So what" (responses 31+, only on request)
Application, lessons learned, next steps. Summary by `名無しのまとめ`.

### Mandatory per-phase patterns

| Phase | Must include |
|---|---|
| 1 | Expert's opening with personal stake ("I read the whole thing", "this scares me honestly") |
| 2 | At least 1 beginner question from Anonymous or 教えてさん |
| 3 | At least 1 concrete code/config example embedded in dialogue |
| 4 | At least 1 disagreement or nuanced correction between Expert and Peer |
| 5 | At least 1 practical takeaway or "what I'd actually do differently" |

## Response Format

### Response header format

レスヘッダー（レス番号＋名前）は必ずバックティックで囲むこと。これによりコード風の装飾が施され、本文との視覚的な区別（メリハリ）がつく:

```
`19: 名前：なんJ民 ◆nanJ.kankatsu`
本文はここから
```

BAD — ヘッダーが本文と区別できない:
```
19: 名前：なんJ民 ◆nanJ.kankatsu
本文はここから
```

### Length limits (strict)

| Response type | Max lines | When to use |
|---|---|---|
| Expert explanation | 15 | Core content delivery |
| Peer comment | 8 | Alternative perspective, empathy, pushback |
| Anonymous question | 3 | Reader proxy questions |
| Code example (embedded) | 15 | Inside Expert or Peer speech |
| AA diagram | 12 | Replace any table or list |
| Summary | 8 | 名無しのまとめ only |
| Short reaction | 2 | "なるほど", "わかる", "thx" |

### Quoting format (IMPORTANT)

レス番号への参照には**全角の `＞＞番号`**（U+FF1E）を使うこと。半角の `>>` はMarkdownの引用記号として解釈されるため使わない。全角 `＞` はMarkdownの特殊文字ではないので、直後に空行を入れる必要はない。

BAD — 半角 `>>` はMarkdown引用として解釈される:
```
>>17
`18: 名前：匿名AI`
それについてだけど...
```

GOOD — 全角 `＞＞` ならMarkdown引用にならない:
```
＞＞17
`18: 名前：匿名AI`
それについてだけど...
```

### Response pacing

Every 3-5 responses, insert a short reaction ("なるほど", "わかる", "そうなんだ") to maintain rhythm. Never have 5+ consecutive long explanation responses.

### Dialogue embedding for structured info

Instead of tables, use dialogue enumeration:
```
`5: 名前：Expert`
うーん、整理するとこういう3つになるかな
  1つ目: ツール出力の蒸留。長すぎる出力を要約に置換する
  2つ目: ツール出力のマスキング。古い出力を隠してトークンを解放
  3つ目: JITコンテキスト。必要な時にだけ文脈を読み込む

`6: 名前：匿名AI`
3つとも「トークンを節約」が目的なんだな

`7: 名前：Expert`
そう。でもやり方が全部違うからね
```

## AA (Ascii Art) Patterns

### When to use AA (mandatory triggers)

Use AA instead of tables/lists when:
- Comparing 3+ items side by side
- Showing hierarchy or tree structure with 3+ levels
- Showing data flow or process with 3+ steps
- Showing relationships between 3+ components

### Pattern 1: Hierarchy/Tree

Use `├──` `└──` `│` `▼` for tree structures:
```
User Input
  ├── Prompt Build     <- system prompt construction
  ├── Resource Load    <- GEMINI.md reading
  └── Context Window   <- token limit management
        │
        ▼
     LLM Call  →  Parse  →  Tool Call?
                                  ├── Yes → Execute
                                  └── No  → Output
```

### Pattern 2: Comparison/Side by side

Use `←→` arrows for relationships, label roles below:
```
     Pro ←→ Flash ←→ Lite
    (strong)  (fast)  (last resort)
      │         │        │
      │      Investigator  LoopDetection
      │         │        │
    Main    (read-only tools only)
    Agent
```

### Pattern 3: Pipeline/Flow

Use `→` for linear flows, `[brackets]` for hooks/gates:
```
[BeforeTool hook]
  → policy check (allow/deny/ask)
  → [BeforeModel hook] ← can block entirely!
    → API call
      → [AfterModel hook] ← can modify response
        → response to user
```

### Pattern 4: Module layout

Use boxes with clear labels:
```
┌───────────────────────────┐
│  packages/core/          │  <- Agent engine
│  agent/   tools/  hooks/ │
├───────────────────────────┤
│  packages/cli/           │  <- Terminal UI
│  ui/  commands/  config/ │
├───────────────────────────┤
│  packages/sdk/           │  <- Embedding API
└───────────────────────────┘
```

### AA rules

- Keep under 12 lines per AA block
- Add a brief explanation line below or beside the AA
- If the concept is too complex for AA, use dialogue instead — never force complex AA

## Continuation

### First output

Produce 15-25 responses covering Phase 1-3 (or early Phase 4). End with a natural "continue?" cue:

```
`XX: 名前：匿名AI`
まだ続きある？

`XX+1: 名前：Expert`
ああ、まだあるわ。一番大事なとこまだ言ってないし
```

### When user requests continuation

Continue from (last response number + 1). Cover Phase 4 and optionally Phase 5. End again with a natural continuation cue if there's more to say.

### When user asks about a specific subtopic

Jump to that topic using Anonymous's question as the pivot:
```
`XX: 名前：匿名AI`
そういえば〇〇のところもっと詳しく

`XX+1: 名前：Expert`
あー、そこ大事なとこなんだよ。じゃあちょっと戻るけど
```

## Topic Adaptation

### Technical topics (default)
- Embed code/config examples in dialogue naturally
- On first use of jargon, Expert explains briefly in parentheses or following sentence
- Anonymous asks "what does that mean?" to trigger re-explanation
- Trade-offs expressed through Expert-Peer disagreement

### Non-technical topics (business, law, science, etc.)
- Replace code examples with: case studies, simulations, historical examples, hypotheticals
- Use AA for organizational charts, process flows, comparison frameworks
- Peer's identity should match the domain
- Expert's tone becomes more explanatory, less code-focused

## Quality Checklist

Before outputting each response batch, verify:

- [ ] Zero markdown tables in thread output
- [ ] Zero 3+ consecutive bullet points in thread output
- [ ] Anonymous asks at least 2 beginner-level questions in first 20 responses
- [ ] Expert and Peer have at least 1 disagreement or nuanced exchange
- [ ] At least 1 AA appears in Phase 3+
- [ ] Every jargon term is explained on first use (briefly, in-line or next response)
- [ ] No 5+ consecutive long responses without a short reaction
- [ ] Thread ends with natural continuation cue
- [ ] Phase progression is maintained (overview → why → how → challenges → application)
- [ ] Characters speak in distinct voices (not all sounding the same)
- [ ] No half-width `>>` for anchoring — all anchors use full-width `＞＞`
