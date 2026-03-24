---
name: ado
description: Azure DevOps operations — sprint queries, work item CRUD, commit linking. Use when the user mentions sprint, work item, 開卡片, 卡片, Azure DevOps, or ADO.
argument-hint: [action]
allowed-tools: Bash(ado *)
---

# Azure DevOps CLI (`ado`)

You have access to the `ado` CLI tool for Azure DevOps operations. All commands output clean JSON.

## Global Options

| Flag | Description |
|------|-------------|
| `--org <org>` | Azure DevOps organization (optional if `ADO_ORG` set in .env) |
| `--project <project>` | Azure DevOps project (optional if `ADO_PROJECT` set in .env) |
| `--area <area>` | Area path (defaults to `--project`) |
| `--pat <token>` | Override PAT from `.env` |

> Defaults are read from `~/ado-cli/.env`. Flags override defaults. Use flags to operate across different orgs/projects.

## Discovery

```bash
# Verify PAT & show current user
ado whoami

# List all projects in the default org
ado projects

# List projects in a different org
ado --org OtherOrg projects
```

## Sprint

```bash
ado sprint current
ado sprint list --timeframe current|past|future
ado sprint workitems [--iteration-id ID]
```

## Work Items

### Create

```bash
# Issue (parent)
ado wi create-issue --title "TITLE" [--iteration PATH] [--area PATH]

# Task (child) — use --parent to link
ado wi create-task --title "TITLE" [--description "HTML"] [--iteration PATH] [--parent ID]

# Composite: Issue + Task + commit link in one step
ado wi create-card \
  --issue-title "TITLE" --task-title "TITLE" \
  [--task-description "HTML"] [--iteration PATH] \
  [--project-id GUID --repo-id GUID --commit SHA]
```

### Read

```bash
ado wi get ID
ado wi list [--iteration PATH] [--state STATE] [--type TYPE] [--assigned-to NAME]
ado wi children ID
ado wi query "WIQL"
```

### Update

```bash
ado wi update ID [--title T] [--description HTML] [--state STATE] [--assigned-to NAME] [--iteration PATH]
ado wi close ID
ado wi assign ID --to NAME
```

### Comment & Delete

```bash
ado wi comment ID --text "TEXT"
ado wi delete ID [--destroy]
```

## Repo & Commit Linking

**IMPORTANT:**
1. Before running `ado wi link-commit`, ensure the commit has been `git push`ed to the remote. Linking a local-only commit will result in ADO being unable to display the actual content.
2. `--commit` must use the **full 40-character SHA**. Short SHAs produce broken links in ADO. Use `git rev-parse <short>` to resolve the full SHA.

```bash
# Get projectId/repoId (auto-parses org from URL)
ado repo info --remote-url "REMOTE_URL"

# Link commit to work item (must be pushed + full 40-char SHA!)
FULL_SHA=$(git rev-parse <short-sha>)
ado wi link-commit --task-id ID --project-id GUID --repo-id GUID --commit $FULL_SHA
```

## 「開卡片並 commit」Workflow

When the user says **「開卡片並 commit」**, follow this sequence:

1. **Commit & push** the code changes
2. **Get current sprint**: `ado sprint current` → extract `path`
3. **Get repo info**: `ado repo info --remote-url "$(git remote get-url origin)"` → extract `projectId`, `repoId`
4. **Create card** (Issue + Task + commit link):
   ```bash
   ado wi create-card \
     --issue-title "改善：NON_TECHNICAL_TITLE" \
     --task-title "NON_TECHNICAL_TITLE" \
     --task-description "<p>TECHNICAL_DETAILS_HTML</p>" \
     --iteration "SPRINT_PATH" \
     --project-id GUID --repo-id GUID --commit SHA
   ```

**Title rules:**
- Use **non-technical language** (team has non-engineering members)
- Prefix with 「改善：」for improvements or 「新增：」for new features
- Put technical details only in `--task-description` (HTML format)

**Variant — 「掛到 #XXXX」**: Skip Issue creation, create Task only:
```bash
ado wi create-task --title "TITLE" --description "HTML" --iteration PATH --parent XXXX
```

## Cross-org operations

Override defaults with flags:
```bash
# Different org
ado --org OtherOrg projects
ado --org OtherOrg --project OtherProject sprint current

# Different project (same org)
ado --project OtherProject wi list --state Active
```

## Tips

- All output is JSON — parse `id`, `url`, `path` fields from responses
- Use `ado projects` to discover available projects
- `--area` defaults to `--project` value if omitted
- Sprint iteration paths follow format: `ProjectName\Sprint YYYY-MM`
