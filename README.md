# ado-cli

[中文版 README](README.zh-TW.md)

A lightweight CLI tool for Azure DevOps sprint and work item operations. Designed as a middleware layer so that AI agents (e.g. Claude Code) can interact with Azure DevOps **without directly handling your PAT**.

Supports **multi-org and multi-project** operations — the PAT is stored once in `.env`, while org/project are passed per command.

## Features

- **Sprint** — Query current sprint, list sprints, view sprint work items
- **Work Items** — Create, update, close, assign, delete, comment, and query
- **Composite** — `create-card` builds Issue + Task + commit link in one step
- **Commit Linking** — Associate git commits with work items
- **Repo Info** — Resolve Azure DevOps project/repo GUIDs from git remote URLs
- **Multi-org** — `--org` and `--project` flags allow cross-org/project operations
- **Clean JSON output** — All commands output JSON to stdout for easy parsing

## Quick Start

```bash
# 1. Clone & install CLI
git clone https://github.com/bensonbs/ado-cli.git
cd ado-cli
npm install
npm link

# 2. Set your PAT
cp .env.example .env
echo "ADO_PAT=your-token-here" > .env

# 3. Install Claude Code skill (optional but recommended)
./install-skill.sh

# 4. Verify
ado --org your-org whoami
```

Done. You now have the `ado` CLI globally and the `/ado` skill in Claude Code.

## Installation Details

### Step 1 — CLI Tool

```bash
git clone https://github.com/bensonbs/ado-cli.git
cd ado-cli
npm install
npm link    # makes `ado` available globally
```

### Step 2 — PAT Configuration

```bash
cp .env.example .env
```

Edit `.env` and add your Personal Access Token:

```
ADO_PAT=your-personal-access-token
```

Organization and project are passed as CLI flags per command, so a single PAT is all you need.

#### Getting a PAT

1. Go to `https://dev.azure.com/{your-org}/_usersSettings/tokens`
2. Create a new token with **Work Items (Read & Write)** and **Code (Read)** scopes
3. Copy the token into your `.env` file

> **Security**: The `.env` file is git-ignored and never leaves your machine.

### Step 3 — Claude Code Skill (Optional)

If you use [Claude Code](https://docs.anthropic.com/en/docs/claude-code), install the agent skill so Claude can use `ado` commands autonomously:

```bash
# Global install — available in all projects
./install-skill.sh
```

Or install to a specific project only:

```bash
mkdir -p your-project/.claude/skills/ado
cp .claude/skills/ado/SKILL.md your-project/.claude/skills/ado/
```

After installation:
- `/ado` is available as a slash command
- Claude auto-invokes the skill when you mention sprints, work items, or ADO

## Global Options

Every command accepts these flags:

| Flag | Description |
|------|-------------|
| `--org <org>` | Azure DevOps organization (required) |
| `--project <project>` | Azure DevOps project name (required for most commands) |
| `--area <area>` | Area path (defaults to `--project` value) |
| `--pat <token>` | Override PAT from `.env` |

```bash
# Example: specify org and project
ado --org MyOrg --project MyProject sprint current

# Switch to a different org/project in the next command
ado --org OtherOrg --project OtherProject wi list --state Active
```

## Usage

### Sprint

```bash
# Get the current sprint
ado --org MyOrg --project MyProject sprint current

# List all sprints (filter: past, current, future)
ado --org MyOrg --project MyProject sprint list
ado --org MyOrg --project MyProject sprint list --timeframe current

# List work items in current sprint
ado --org MyOrg --project MyProject sprint workitems
```

### Work Items — Create

```bash
# Create an Issue
ado --org MyOrg --project MyProject wi create-issue --title "Improve: login flow"

# Create a Task linked to a parent Issue
ado --org MyOrg --project MyProject wi create-task --title "Add export button" --parent 1234

# Create a Task with HTML description
ado --org MyOrg --project MyProject wi create-task \
  --title "Fix timeout issue" \
  --description "<p>Increased timeout from 30s to 60s</p>" \
  --parent 1234
```

### Work Items — Create Card (Composite)

One command to create Issue + Task + commit link:

```bash
ado --org MyOrg --project MyProject wi create-card \
  --issue-title "Improve: upload stability" \
  --task-title "Fix upload timeout" \
  --task-description "<p>Root cause: 30s timeout too short</p>" \
  --iteration "Project\Sprint 2026-05" \
  --project-id <guid> --repo-id <guid> --commit <sha>
```

### Work Items — Read

```bash
# Get a work item by ID
ado --org MyOrg --project MyProject wi get 1234

# List work items with filters
ado --org MyOrg --project MyProject wi list --iteration "Project\Sprint 2026-05"
ado --org MyOrg --project MyProject wi list --state Active --type Task
ado --org MyOrg --project MyProject wi list --assigned-to "John Doe"

# List child items of a parent
ado --org MyOrg --project MyProject wi children 1234

# Run a custom WIQL query
ado --org MyOrg --project MyProject wi query "SELECT [System.Id] FROM WorkItems WHERE [System.State] = 'Active'"
```

### Work Items — Update

```bash
# Update fields
ado --org MyOrg --project MyProject wi update 1234 --title "New title" --state Active

# Quick close
ado --org MyOrg --project MyProject wi close 1234

# Quick assign
ado --org MyOrg --project MyProject wi assign 1234 --to "John Doe"
```

### Work Items — Comment & Delete

```bash
# Add a comment
ado --org MyOrg --project MyProject wi comment 1234 --text "Deployed to staging"

# Delete (moves to recycle bin)
ado --org MyOrg --project MyProject wi delete 1234

# Permanently delete
ado --org MyOrg --project MyProject wi delete 1234 --destroy
```

### Repo Info & Commit Linking

```bash
# Get repo info — auto-parses org/project/repo from remote URL
ado repo info --remote-url "https://dev.azure.com/MyOrg/MyProject/_git/MyRepo"

# Or specify explicitly
ado --org MyOrg repo info --repo-project MyProject --repo-name MyRepo

# Link a commit to a task
ado --org MyOrg --project MyProject wi link-commit \
  --task-id 1234 \
  --project-id <guid> \
  --repo-id <guid> \
  --commit "abc123def456"
```

### Full Workflow Example

```bash
# 1. Commit and push
git add -A && git commit -m "fix: resolve timeout" && git push

# 2. Get current sprint
ado --org MyOrg --project MyProject sprint current
# → { "path": "Project\\Sprint 2026-05", ... }

# 3. Get repo info
ado repo info --remote-url "$(git remote get-url origin)"
# → { "projectId": "xxx", "repoId": "yyy", ... }

# 4. Create card (Issue + Task + commit link) in one step
ado --org MyOrg --project MyProject wi create-card \
  --issue-title "Improve: file upload stability" \
  --task-title "Fix upload timeout" \
  --task-description "<p>30s timeout too short for large files</p>" \
  --iteration "Project\Sprint 2026-05" \
  --project-id xxx --repo-id yyy --commit "$(git rev-parse HEAD)"
```

## Command Reference

| Command | Description |
|---------|-------------|
| `ado sprint current` | Get current sprint |
| `ado sprint list` | List sprints |
| `ado sprint workitems` | List work items in sprint |
| `ado wi create-issue` | Create an Issue |
| `ado wi create-task` | Create a Task |
| `ado wi create-card` | Create Issue + Task + commit link |
| `ado wi get <id>` | Get work item details |
| `ado wi list` | List/filter work items |
| `ado wi query <wiql>` | Run WIQL query |
| `ado wi children <id>` | List child work items |
| `ado wi update <id>` | Update work item fields |
| `ado wi close <id>` | Close a work item |
| `ado wi assign <id>` | Assign a work item |
| `ado wi comment <id>` | Add comment |
| `ado wi delete <id>` | Delete work item |
| `ado wi link-commit` | Link commit to work item |
| `ado repo info` | Get repo project/repo GUIDs |

## Claude Code Skill

The installed skill teaches Claude to:
- Discover orgs and projects (`ado --org ORG projects`)
- Query sprints and work items
- Create cards (Issue + Task + commit link) in one step
- Follow complex workflows automatically

No need to edit `CLAUDE.md` — the skill handles everything.

## License

MIT
