# ado-cli

[中文版 README](README.zh-TW.md)

A lightweight CLI tool for Azure DevOps sprint and work item operations. Designed as a middleware layer so that AI agents (e.g. Claude Code) can interact with Azure DevOps **without directly handling your PAT**.

## Features

- **Sprint** — Query current sprint, list sprints, view sprint work items
- **Work Items** — Create, update, close, assign, delete, comment, and query
- **Composite** — `create-card` builds Issue + Task + commit link in one step
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

# List all sprints (filter: past, current, future)
ado sprint list
ado sprint list --timeframe current

# List work items in current sprint
ado sprint workitems

# List work items in a specific sprint
ado sprint workitems --iteration-id <sprint-guid>
```

### Work Items — Create

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
  --description "<p>Increased timeout from 30s to 60s</p>" \
  --parent 1234
```

### Work Items — Create Card (Composite)

One command to create Issue + Task + commit link:

```bash
ado wi create-card \
  --issue-title "Improve: upload stability" \
  --task-title "Fix upload timeout" \
  --task-description "<p>Root cause: 30s timeout too short</p>" \
  --iteration "Project\Sprint 2026-05" \
  --project-id <guid> --repo-id <guid> --commit <sha>
```

### Work Items — Read

```bash
# Get a work item by ID
ado wi get 1234

# List work items with filters
ado wi list --iteration "Project\Sprint 2026-05"
ado wi list --state Active --type Task
ado wi list --assigned-to "John Doe"

# List child items of a parent
ado wi children 1234

# Run a custom WIQL query
ado wi query "SELECT [System.Id] FROM WorkItems WHERE [System.State] = 'Active'"
```

### Work Items — Update

```bash
# Update fields
ado wi update 1234 --title "New title" --state Active
ado wi update 1234 --assigned-to "John Doe" --iteration "Project\Sprint 2026-05"

# Quick close
ado wi close 1234

# Quick assign
ado wi assign 1234 --to "John Doe"
```

### Work Items — Comment & Delete

```bash
# Add a comment
ado wi comment 1234 --text "Deployed to staging"

# Delete (moves to recycle bin)
ado wi delete 1234

# Permanently delete
ado wi delete 1234 --destroy
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
  --project-id <guid> \
  --repo-id <guid> \
  --commit "abc123def456"
```

### Full Workflow Example

```bash
# 1. Commit and push
git add -A && git commit -m "fix: resolve timeout" && git push

# 2. Get current sprint
ado sprint current
# → { "path": "Project\\Sprint 2026-05", ... }

# 3. Get repo info
ado repo info --remote-url "$(git remote get-url origin)"
# → { "projectId": "xxx", "repoId": "yyy", ... }

# 4. Create card (Issue + Task + commit link) in one step
ado wi create-card \
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

## Use with Claude Code

Add to your `CLAUDE.md`:

```markdown
## Sprint Operations
- Use `ado sprint current` to get the current sprint
- Use `ado wi create-card` to create Issue + Task + link commit in one step
- Use `ado wi list --iteration "..." --state Active` to check sprint progress
- Use `ado repo info --remote-url <url>` to resolve repo GUIDs
```

This way, the AI agent uses CLI commands instead of raw API calls, keeping your PAT secure in the `.env` file.

## License

MIT
