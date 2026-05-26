---
name: skill-creator
description: スキル作成ガイド。新しいスキルの作成や既存スキルの更新に使用。専門知識・ワークフロー・ツール統合でClaudeの機能を拡張する。
---

# Skill Creator

スキルを作成・更新するための包括的なガイド。ファイル構造、本文テンプレート、設計原則を提供する。

## About Skills

Skills are modular, self-contained packages that extend Claude's capabilities by providing
specialized knowledge, workflows, and tools. Think of them as "onboarding guides" for specific
domains or tasks—they transform Claude from a general-purpose agent into a specialized agent
equipped with procedural knowledge that no model can fully possess.

### What Skills Provide

1. Specialized workflows - Multi-step procedures for specific domains
2. Tool integrations - Instructions for working with specific file formats or APIs
3. Domain expertise - Company-specific knowledge, schemas, business logic
4. Bundled resources - Scripts, references, and assets for complex and repetitive tasks

### Skill Categories

**Category 1: Document & Asset Creation**
- Creating consistent, high-quality output (documents, presentations, apps, designs, code)
- Key techniques: style guides, template structures, quality checklists

**Category 2: Workflow Automation**
- Multi-step processes with consistent methodology
- Key techniques: step-by-step workflows, validation gates, iterative refinement

**Category 3: MCP Enhancement**
- Workflow guidance to enhance MCP tool access
- Key techniques: MCP coordination, embedded domain expertise, error handling

---

## Skill File Structure

Every skill consists of a required SKILL.md file and optional bundled resources:

```
skill-name/
├── SKILL.md (required)
│   ├── YAML frontmatter (required)
│   └── Markdown body (required)
└── Bundled Resources (optional)
    ├── scripts/          - Executable code (Python/Bash/etc.)
    ├── references/       - Loaded into context as needed
    └── assets/           - Files used in output (templates, icons, etc.)
```

### Frontmatter (YAML)

```yaml
---
name: skill-name          # kebab-case (required)
description: >            # What + when to trigger (required)
  What the skill does and when to use it.
  Triggers: "trigger phrase 1", "trigger phrase 2".
license: MIT              # (optional)
allowed-tools: AskUserQuestion  # (optional)
---
```

**Required**: `name`, `description`
**Optional**: `license`, `allowed-tools`, `metadata`, `compatibility`

**Security**: No XML angle brackets in frontmatter. No "claude"/"anthropic" prefixed names.

### Bundled Resources

- **scripts/** — Deterministic operations, repeatedly rewritten code. Token efficient.
- **references/** — Domain knowledge loaded on demand. Keeps SKILL.md lean.
- **assets/** — Templates, images, fonts used in output (not loaded into context).

**Progressive Disclosure**: SKILL.md body under 500 lines. Split into references/ when approaching limit. Keep references one level deep.

---

## SKILL.md Body Architecture

### Design Principles

**1. Philosophy Before Procedure**
Every skill starts with a philosophy section that establishes mental frameworks before diving into procedures. This helps Claude understand the "why" behind the "what."

**2. Anti-Pattern Prevention**
Each skill explicitly names what NOT to do with specific examples, helping avoid common pitfalls and ensuring quality outputs.

**3. Variation Encouragement**
Skills explicitly instruct to vary outputs and avoid convergence on "favorite" patterns, ensuring diverse and creative solutions.

**4. Progressive Disclosure**
Main SKILL.md stays concise (500 lines max), with detailed content moved to references/ for on-demand loading.

**5. Empowerment Over Constraint**
Skills unlock Claude's capabilities rather than constraining them to rigid templates or checklists. Guidance illuminates the path—it doesn't fence it.

### The 6-Section Template

Every SKILL.md body should follow this structure. Sections can be renamed to fit the domain, but the purpose and order must be preserved:

```
1. Philosophy         — Mental model, values, "before you start, ask..."
2. Workflow           — Step-by-step procedure (analyze → design → implement)
3. Implementation     — Code examples, tables, patterns, reference material
4. Anti-Patterns      — What NOT to do, with BAD/GOOD examples
5. Variation Guidance — "IMPORTANT: vary your approach, don't converge"
6. Remember           — Empowering conclusion
```

---

### Section 1: Philosophy

Establish the mental framework. Give Claude a way to THINK about the domain, not just rules to follow.

**Template:**
```markdown
## Philosophy: <Catchy Frame>

**Before <doing X>, ask**:
- Question 1 about context
- Question 2 about audience/constraints
- Question 3 about goals

**Core Principles**:
1. Principle Name — Brief explanation
2. Principle Name — Brief explanation
3. Principle Name — Brief explanation
```

**Example:**
```markdown
## Philosophy: SEO as Semantic Communication

SEO is not about gaming algorithms—it's about **clearly communicating what your content IS**
to machines so they can properly understand and surface it.

**Before optimizing, ask**:
- What is this page actually about?
- Who is the intended audience and what are they searching for?
- What unique value does this content provide?
```

---

### Section 2: Workflow

The operational procedure. Usually follows an analyze → design → implement → verify pattern.

**Template:**
```markdown
## Workflow

### Step 1: Discover and Analyze
- What to look for in the codebase/context
- How to categorize what you find

### Step 2: Design Strategy
- Decision framework based on Step 1 findings
- When to choose which approach

### Step 3: Implement
- Concrete actions with code examples
- How to use bundled scripts if available

### Step 4: Verify
- What to check after implementation
- How to validate quality
```

---

### Section 3: Implementation

Domain-specific knowledge organized for quick reference. Use tables, code blocks, and categorized lists.

**Good patterns:**
- **Tables** for "when to use what" decisions
- **Code blocks** with inline comments for common tasks
- **Categorized lists** for options (e.g., material types, schema types)
- **Framework-specific sections** (Next.js / Astro / React etc.)

**Keep in SKILL.md**: Core patterns, most common cases
**Move to references/**: Exhaustive lists, rare edge cases, deep technical specs

Cross-reference from SKILL.md:
```markdown
See `references/structured-data-schemas.md` for complete schema examples.
```

---

### Section 4: Anti-Patterns

Explicitly call out what NOT to do. This is the single most impactful section for quality.

**Template:**
```markdown
## Anti-Patterns to Avoid

❌ **<Pattern Name>**
```
Problem: What goes wrong
Fix: What to do instead
```
Why bad: <Why this is harmful>
Better: <The correct approach>

❌ **<Another Pattern>**
```bad
// BAD code example
```
```good
// GOOD code example
```
Why bad: <Concrete reason>
Better: <What to do instead>
```

**Rules for anti-patterns:**
- Always include **Why bad** — without a reason, Claude can't judge edge cases
- Always include **Better** — don't just say "don't do this" without an alternative
- Use concrete examples (actual code, actual markup) over abstract descriptions
- 5-10 anti-patterns is the sweet spot

---

### Section 5: Variation Guidance

Prevent Claude's outputs from converging on the same pattern every time.

**Template:**
```markdown
## Variation Guidance

**IMPORTANT**: <What should vary and why>

**Vary based on**:
- Factor 1 (e.g., industry, content type, audience)
- Factor 2 (e.g., complexity, context, platform)

**Avoid converging on**:
- Same pattern X every time
- Same default choice Y
- Identical structure Z
```

**Why this section matters:** AI outputs naturally converge toward "favorites." This section is the countermeasure. Without it, every skill output starts looking identical.

---

### Section 6: Remember

A brief, empowering conclusion. Reinforce the philosophy in 2-4 sentences.

**Template:**
```markdown
## Remember

**<Domain> is <core insight>.**

The best <outputs>:
- Key principle 1
- Key principle 2
- Key principle 3

**Claude is capable of <what great output looks like>. These guidelines illuminate
the path—they don't limit the result.**
```

---

## Degrees of Freedom

Match guidance specificity to task fragility:

| Freedom Level | Format | When to Use |
|---|---|---|
| **High** | Text guidance, principles | Creative/contextual tasks, multiple valid approaches |
| **Medium** | Pseudocode, parameterized scripts | Structured tasks, some variation acceptable |
| **Low** | Specific scripts, exact sequences | Fragile operations, consistency critical |

Think of Claude as exploring a path: a narrow bridge with cliffs needs specific guardrails (low freedom), while an open field allows many routes (high freedom).

---

## Skill Creation Process

### Step 1: Understand with Concrete Examples

Clarify how the skill will be used:
- "What functionality should the skill support?"
- "Can you give examples of how this skill would be used?"
- "What would a user say that should trigger this skill?"

**Pro Tip**: Iterate on a single challenging task until Claude succeeds, then extract the winning approach into a skill.

### Step 2: Plan Reusable Contents

For each example, identify what resources help when executing repeatedly:
- Code being rewritten each time → `scripts/`
- Knowledge being rediscovered each time → `references/`
- Files used in output → `assets/`

### Step 3: Initialize the Skill

```bash
scripts/init_skill.py <skill-name> --path <output-directory>
```

Creates SKILL.md template with proper frontmatter and resource directories.

### Step 4: Edit the Skill

1. **Start with bundled resources** — scripts, references, assets
2. **Test all scripts** by actually running them
3. **Write SKILL.md** using the 6-Section Template above
4. **Delete unused** example files and directories

#### Writing the Body

Use the 6-Section Template as the skeleton:
1. Philosophy — Why does this domain matter? What's the mental model?
2. Workflow — What's the step-by-step process?
3. Implementation — What are the concrete patterns and examples?
4. Anti-Patterns — What are the common mistakes?
5. Variation — How should outputs differ across contexts?
6. Remember — What's the empowering takeaway?

**Writing style**: Imperative/infinitive form. Concise examples over verbose explanations. Default assumption: Claude is already smart—only add what Claude doesn't know.

### Step 5: Package the Skill

```bash
scripts/package_skill.py <path/to/skill-folder>
```

Validates frontmatter, naming, description quality. Packages into .skill file.

### Step 6: Iterate

**Undertriggering** → Add more detail to description, include keywords
**Overtriggering** → Add negative triggers, be more specific
**Inconsistent results** → Add anti-patterns, strengthen workflow steps

For detailed troubleshooting, see references/troubleshooting.md.

---

## Reference Guides

| Topic | File | Use When |
|---|---|---|
| Multi-step processes | references/workflows.md | Sequential workflows, conditional logic |
| Output formats | references/output-patterns.md | Templates, example patterns |
| Design patterns | references/patterns.md | 5 proven skill patterns |
| Testing | references/testing.md | Testing methodology |
| Troubleshooting | references/troubleshooting.md | Debugging skill issues |

---

## Quick Reference: Complete SKILL.md Checklist

**Frontmatter:**
- [ ] `name` in kebab-case
- [ ] `description` includes what + trigger conditions
- [ ] No XML brackets, no reserved name prefixes

**Body Structure:**
- [ ] Philosophy section with "before X, ask" questions
- [ ] Workflow section (analyze → design → implement → verify)
- [ ] Implementation details with code examples and tables
- [ ] Anti-patterns with Why bad + Better (5-10 items)
- [ ] Variation Guidance with "IMPORTANT" callout
- [ ] Remember section with empowering conclusion

**Quality:**
- [ ] Under 500 lines (split to references/ if needed)
- [ ] No information duplicated between SKILL.md and references/
- [ ] Scripts tested and working
- [ ] Cross-references to reference files use relative paths
