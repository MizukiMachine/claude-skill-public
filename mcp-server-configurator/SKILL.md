---
name: mcp-server-configurator
description: "Configure MCP servers for Claude Code reliably. Maps upstream documentation (docs/URLs/config snippets) into correct `claude mcp add` commands and `.mcp.json` configurations, covering stdio/HTTP/SSE transports, authentication patterns, and multi-scope deployment (local/project/user)."
metadata:
  short-description: "Configure MCP servers for Claude Code."
---

# MCP Server Configurator for Claude Code

Configure Claude Code MCP servers reliably, even when upstream docs are written for other clients (Cursor/Claude Desktop) or only provide a website URL.

## Philosophy: Reduce MCP Setup to 3 Decisions

Most MCP "setup pain" comes from mixing formats and guessing. Don't guess—map.

**Before adding a server, ask:**
1. **Transport**: Is this a local launcher (**stdio**) or a remote endpoint (**HTTP/SSE**)?
2. **Auth**: Is it OAuth, bearer token, API key header, or none?
3. **Scope**: Which audience needs this server (local dev-only, shared with team in repo, or across all your projects)?

**Core principles**
1. **Treat MCP config as access control**: a stdio server can execute code; HTTP/SSE servers access remote resources.
2. **Keep secrets out of files**: use environment variables (`${VAR}` in `.mcp.json`, or `--env` with `claude mcp add`).
3. **Understand scopes**: local (private to you, project), project (shared via `.mcp.json`), user (across all projects).
4. **Verify after wiring**: always check `/mcp` in Claude Code or run `claude mcp list/get` before assuming it works.

## Workflow: Docs/Website → Working Server Configuration

### Step 0 — Intake (minimum questions)
- What's the MCP server docs URL (or paste the install/config snippet)?
- What should we call it in Claude Code (e.g. `github`, `sentry`, `airtable`)?
- Do you want **stdio** (local, command-driven) or **HTTP/SSE** (remote)? If unsure: share the snippet and we infer.
- Should this be **local** (just you, current project), **project** (shared via `.mcp.json`), or **user** (all your projects)?

If the website is JS-heavy and `curl` shows no config, ask the user to copy/paste the relevant "MCP config" block.

### Step 1 — Identify transport

Use these signals from the docs:
- **Stdio**: shows `command` + `args`, mentions "stdio", "run this locally", `npx`, `uvx`, `docker run`, or a CLI binary.
- **HTTP**: shows a URL like `https://mcp.example.com/mcp`, mentions "remote", "hosted", or OAuth login.
- **SSE**: older remote transport, shows `https://` endpoint with Server-Sent Events (deprecated in favor of HTTP).

### Step 2 — Map auth to Claude Code fields

**For HTTP/SSE** (`url = "https://..."`):
- **OAuth-supported**: configure basic server, then run `/mcp` in Claude Code to authenticate via browser.
- **Bearer token**: use `--header "Authorization: Bearer ${API_TOKEN}"` with `claude mcp add`, or set `"headers": { "Authorization": "Bearer ${API_TOKEN}" }` in `.mcp.json`.
- **API key in header**: use `--header "X-API-Key: ${API_KEY}"` or `"headers": { "X-API-Key": "${API_KEY}" }` in `.mcp.json`.
- **Custom headers (secrets)**: set as `"headers": { "Header-Name": "${ENV_VAR}" }` in `.mcp.json` with environment variable expansion.

**For Stdio** (`command = "..."`):
- Pass environment variables via `--env KEY=VALUE` with `claude mcp add`, or `"env": { "KEY": "VALUE" }` in `.mcp.json`.
- Use `${VAR:-default}` syntax in `.mcp.json` for optional env expansion with defaults.

### Step 3 — Understand Claude Code scopes

Claude Code stores MCP server configurations at three scopes. Choose the right one:

| Scope | Loads in | Shared | Stored in | Use case |
|-------|----------|--------|-----------|----------|
| **local** (default) | Current project only | No, private to you | `~/.claude.json` | Personal dev servers, experimental configs, credentials you don't want in Git |
| **project** | Current project only | Yes, via version control | `.mcp.json` in project root | Team-shared servers (GitHub, Slack, databases everyone uses) |
| **user** | All your projects | No, private to you | `~/.claude.json` (user section) | Personal utilities, cross-project tools (Sentry, monitoring) |

### Step 4 — Produce `claude mcp add` commands

The primary way to add servers is via the `claude mcp add` command. Choose the transport and scope:

#### HTTP server (remote, OAuth-friendly)
```bash
# Basic (local scope, default)
claude mcp add --transport http <name> <url>

# With bearer token (stored as header in config)
claude mcp add --transport http <name> <url> \
  --header "Authorization: Bearer YOUR_TOKEN"

# Shared with team (project scope)
claude mcp add --transport http <name> --scope project <url>

# Across all projects (user scope)
claude mcp add --transport http <name> --scope user <url>

# Real examples:
claude mcp add --transport http github https://api.githubcopilot.com/mcp/ \
  --header "Authorization: Bearer YOUR_GITHUB_PAT"

claude mcp add --transport http sentry https://mcp.sentry.dev/mcp  # OAuth later via /mcp
```

#### Stdio server (local command)
```bash
# Basic (local scope, default)
# Note: -- separates Claude options from server command
claude mcp add --transport stdio <name> -- <command> [args...]

# With environment variables
claude mcp add --transport stdio <name> --env KEY=VALUE -- <command> [args...]

# Project-scoped (shared in repo)
claude mcp add --transport stdio <name> --scope project -- <command> [args...]

# Real examples:
claude mcp add --transport stdio airtable -- npx -y airtable-mcp-server

claude mcp add --transport stdio database --scope project \
  --env DATABASE_URL=postgresql://localhost/mydb -- \
  npx -y @bytebase/dbhub
```

#### SSE server (remote, deprecated)
```bash
# SSE is deprecated; use HTTP instead
claude mcp add --transport sse <name> <url>

# With header (e.g., API key)
claude mcp add --transport sse <name> <url> \
  --header "X-API-Key: YOUR_KEY"
```

### Step 5 — Manual `.mcp.json` format (for project-scoped servers)

If you prefer to edit `.mcp.json` directly (checked into your repo), place it at your project root:

```json
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/",
      "headers": {
        "Authorization": "Bearer ${GITHUB_PAT}"
      }
    },
    "database": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@bytebase/dbhub"],
      "env": {
        "DATABASE_URL": "${DB_URL:-postgresql://localhost/mydb}"
      }
    },
    "sentry": {
      "type": "http",
      "url": "https://mcp.sentry.dev/mcp"
    }
  }
}
```

**Key points:**
- `type`: one of `"http"`, `"sse"` (deprecated), `"stdio"`, or `"ws"` (WebSocket).
- `url`: for HTTP/SSE/WebSocket servers.
- `command` + `args`: for stdio servers (command is the program, args are CLI arguments).
- `headers`: HTTP headers (can include `${ENV_VAR}` or `${ENV_VAR:-default}` expansion).
- `env`: environment variables passed to stdio server (supports variable expansion).
- `timeout`: per-server tool execution timeout in milliseconds (optional).
- `alwaysLoad`: set to `true` to load this server's tools upfront instead of deferring (optional).

**Environment variable expansion in `.mcp.json`:**
- `${VAR}` expands to the environment variable `VAR`.
- `${VAR:-default}` expands to `VAR` if set, otherwise `default`.
- Expansion works in `command`, `args`, `url`, `headers`, and `env`.

### Step 6 — Verify and authenticate in Claude Code

After adding a server, verify it loads and authenticate if needed:

```bash
# List all configured servers
claude mcp list

# Get details on a specific server
claude mcp get <name>

# Remove a server
claude mcp remove <name>
```

In Claude Code (interactive session), check server status:
```
/mcp
```

If a server requires OAuth (appears with a 🔐 lock icon or "Needs authentication"):
1. Run `/mcp` in Claude Code.
2. Select the server and complete the browser OAuth flow.
3. Tokens are stored securely in your system keychain; they refresh automatically.

## Translation Cheat-Sheet (Other Clients → Claude Code)

Many docs provide JSON like:
```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp",
      "headers": {
        "Authorization": "Bearer ${SUPABASE_TOKEN}"
      }
    }
  }
}
```

Convert it to Claude Code by:
1. Copy the server entry into `.mcp.json` (same `mcpServers` structure).
2. Or use `claude mcp add-json <name> '<json>'` to add from JSON directly.
3. Or use `claude mcp add --transport http supabase https://mcp.supabase.com/mcp --header "Authorization: Bearer YOUR_TOKEN"`.

For Claude Desktop config (which uses the same JSON format), you can also import:
```bash
claude mcp add-from-claude-desktop
```
This reads your Claude Desktop config and lets you import servers interactively.

## Anti-Patterns to Avoid

❌ **Hardcoding secrets in `.mcp.json`**: use `${ENV_VAR}` instead; never commit API keys.

❌ **Confusing scopes**: don't add a shared team server with local scope (it won't appear for teammates); use `--scope project` and commit `.mcp.json` to version control.

❌ **Mixing transport types**: if docs show a URL, use HTTP (or SSE if explicitly noted); if docs show a command, use stdio.

❌ **Forgetting the `--` separator**: for stdio with `claude mcp add`, the `--` prevents Claude's flags from being parsed as server flags.

❌ **Skipping verification**: always run `/mcp` or `claude mcp list` after edits to confirm the server connects.

## Variation Guidance (Don't Converge)

Your output should vary based on what the docs provide:
- If docs provide a **launcher command** (npx/uvx/docker), produce a **stdio** `claude mcp add` command or `.mcp.json` entry.
- If docs provide an **endpoint URL**, produce an **HTTP/SSE** command or entry.
- If docs provide **JSON config**, either translate into `.mcp.json` by hand or use `claude mcp add-json`.
- For **high-risk servers** (code execution, broad data access), propose an `--env KEY=VALUE` with environment variable isolation and verify via `/mcp`.
- For **team servers**, always recommend `--scope project` and mention checking the `.mcp.json` into Git.

## Common MCP Configuration Tasks

### Add a local stdio server
```bash
claude mcp add --transport stdio my-tool -- npx my-tool-server
```

### Add a remote HTTP server with token auth
```bash
claude mcp add --transport http secure-api https://api.example.com/mcp \
  --header "Authorization: Bearer ${MY_TOKEN}"
```

### Add a team-shared server (project scope)
```bash
claude mcp add --transport http github --scope project https://api.github.example.com/mcp
```

### View server status in Claude Code
```
/mcp
```

### Complete OAuth authentication
1. Server appears as "Needs authentication" in `/mcp` or `claude mcp get <name>`.
2. Run `/mcp` in Claude Code, select the server.
3. Complete the browser flow; token is stored securely.

### Use environment variables in `.mcp.json`
```json
{
  "mcpServers": {
    "api": {
      "type": "http",
      "url": "https://api.example.com/mcp",
      "headers": {
        "Authorization": "Bearer ${API_TOKEN}"
      }
    }
  }
}
```
Set `API_TOKEN` in your shell or `.env` before running `claude`.

## References

- **Claude Code MCP docs**: https://code.claude.com/docs/en/mcp.md
- **MCP specification**: https://modelcontextprotocol.io/introduction
- **MCP server directory**: https://claude.ai/directory (browse verified servers)
