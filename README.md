# ado-cli

[中文版 README](README.zh-TW.md)

A lightweight CLI tool for Azure DevOps sprint and work item operations. Designed as a middleware layer so that AI agents (e.g. Claude Code) can interact with Azure DevOps **without directly handling your PAT**.

## Features

- **Sprint** — Query current sprint or list all sprints
- **Work Items** — Create Issues, Tasks, and link them with parent/child relationships
- **Commit Linking** — Associate git commits with work items
- **Repo Info** — Resolve Azure DevOps project/repo GUIDs from git remote URLs
- **Clean JSON output** — All commands output JSON to stdout for easy parsing

## Installation

```bash
git clone https://github.com/bensonbs/ado-cli.git
cd ado-cli
npm install
npm link
```

After `npm link`, the `ado` command is available globally.

## Configuration

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```
ADO_PAT=your-personal-access-token
ADO_ORG=your-organization
ADO_PROJECT=your-project-name
ADO_AREA_PATH=your-area-path
```

### Getting a PAT

1. Go to `https://dev.azure.com/{your-org}/_usersSettings/tokens`
2. Create a new token with **Work Items (Read & Write)** and **Code (Read)** scopes
3. Copy the token into your `.env` file

> **Security**: The `.env` file is git-ignored and never leaves your machine.

## Usage

### Sprint

```bash
# Get the current sprint
ado sprint current

# List all sprints
ado sprint list

# Filter by timeframe
ado sprint list --timeframe current
ado sprint list --timeframe past
ado sprint list --timeframe future
```

### Work Items

```bash
# Create an Issue
ado wi create-issue --title "Improve: login flow"

# Create an Issue in a specific sprint
ado wi create-issue --title "New: export feature" --iteration "Project\Sprint 2026-05"

# Create a Task linked to a parent Issue
ado wi create-task --title "Add export button" --parent 1234

# Create a Task with HTML description
ado wi create-task \
  --title "Fix timeout issue" \
  --description "<p>Increased timeout from 30s to 60s for large file uploads</p>" \
  --parent 1234

# Get a work item by ID
ado wi get 1234
```

### Commit Linking

```bash
# Get repo info from a git remote URL
ado repo info --remote-url "https://dev.azure.com/MyOrg/MyProject/_git/MyRepo"

# Or specify project and repo directly
ado repo info --project "MyProject" --repo "MyRepo"

# Link a commit to a task
ado wi link-commit \
  --task-id 1234 \
  --project-id "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" \
  --repo-id "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy" \
  --commit "abc123def456"
```

### Full Workflow Example

A typical "create card and commit" workflow:

```bash
# 1. Commit and push your code
git add -A && git commit -m "fix: resolve timeout" && git push

# 2. Get current sprint
ado sprint current
# → { "path": "MyProject\\Sprint 2026-05", ... }

# 3. Create Issue (parent)
ado wi create-issue --title "Improve: file upload stability" --iteration "MyProject\Sprint 2026-05"
# → { "id": 5678, ... }

# 4. Create Task (child) linked to the Issue
ado wi create-task \
  --title "Fix upload timeout" \
  --description "<p>Root cause: 30s default timeout too short for large files</p>" \
  --iteration "MyProject\Sprint 2026-05" \
  --parent 5678
# → { "id": 5679, ... }

# 5. Get repo info
ado repo info --remote-url "$(git remote get-url origin)"
# → { "projectId": "xxx", "repoId": "yyy", ... }

# 6. Link the commit
ado wi link-commit --task-id 5679 --project-id xxx --repo-id yyy --commit "$(git rev-parse HEAD)"
```

## Use with Claude Code

Add to your `CLAUDE.md`:

```markdown
## Sprint Operations
- Use `ado sprint current` to get the current sprint
- Use `ado wi create-issue` / `ado wi create-task` to create work items
- Use `ado wi link-commit` to link commits
- Use `ado repo info --remote-url <url>` to resolve repo GUIDs
```

This way, the AI agent uses CLI commands instead of raw API calls, keeping your PAT secure in the `.env` file.

## License

MIT
