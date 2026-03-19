---
name: ado
description: Azure DevOps operations — sprint queries, work item CRUD, commit linking. Use when the user mentions sprint, work item, 開卡片, 卡片, Azure DevOps, or ADO.
argument-hint: [action]
allowed-tools: Bash(ado *)
---

# Azure DevOps CLI (`ado`)

You have access to the `ado` CLI tool for Azure DevOps operations. All commands output clean JSON.

## Global Options (required per command)

| Flag | Description |
|------|-------------|
| `--org <org>` | Azure DevOps organization name |
| `--project <project>` | Azure DevOps project name |
| `--area <area>` | Area path (defaults to `--project`) |
| `--pat <token>` | Override PAT from `.env` |

> PAT is pre-configured in `~/ado-cli/.env`. You only need to pass `--org` and `--project`.

## Discovery

```bash
# Verify PAT & show current user
ado --org ORG whoami

# List all projects in an org
ado --org ORG projects
```

## Sprint

```bash
ado --org ORG --project PROJ sprint current
ado --org ORG --project PROJ sprint list --timeframe current|past|future
ado --org ORG --project PROJ sprint workitems [--iteration-id ID]
```

## Work Items

### Create

```bash
# Issue (parent)
ado --org ORG --project PROJ wi create-issue --title "TITLE" [--iteration PATH] [--area PATH]

# Task (child) — use --parent to link
ado --org ORG --project PROJ wi create-task --title "TITLE" [--description "HTML"] [--iteration PATH] [--parent ID]

# Composite: Issue + Task + commit link in one step
ado --org ORG --project PROJ wi create-card \
  --issue-title "TITLE" --task-title "TITLE" \
  [--task-description "HTML"] [--iteration PATH] \
  [--project-id GUID --repo-id GUID --commit SHA]
```

### Read

```bash
ado --org ORG --project PROJ wi get ID
ado --org ORG --project PROJ wi list [--iteration PATH] [--state STATE] [--type TYPE] [--assigned-to NAME]
ado --org ORG --project PROJ wi children ID
ado --org ORG --project PROJ wi query "WIQL"
```

### Update

```bash
ado --org ORG --project PROJ wi update ID [--title T] [--description HTML] [--state STATE] [--assigned-to NAME] [--iteration PATH]
ado --org ORG --project PROJ wi close ID
ado --org ORG --project PROJ wi assign ID --to NAME
```

### Comment & Delete

```bash
ado --org ORG --project PROJ wi comment ID --text "TEXT"
ado --org ORG --project PROJ wi delete ID [--destroy]
```

## Repo & Commit Linking

```bash
# Get projectId/repoId (auto-parses org from URL)
ado repo info --remote-url "REMOTE_URL"
ado --org ORG repo info --repo-project PROJ --repo-name REPO

# Link commit to work item
ado --org ORG --project PROJ wi link-commit --task-id ID --project-id GUID --repo-id GUID --commit SHA
```

## 「開卡片並 commit」Workflow

When the user says **「開卡片並 commit」**, follow this sequence:

1. **Commit & push** the code changes
2. **Get current sprint**: `ado --org ORG --project PROJ sprint current` → extract `path`
3. **Get repo info**: `ado repo info --remote-url "$(git remote get-url origin)"` → extract `projectId`, `repoId`
4. **Create card** (Issue + Task + commit link):
   ```bash
   ado --org ORG --project PROJ wi create-card \
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
ado --org ORG --project PROJ wi create-task \
  --title "TITLE" --description "HTML" --iteration PATH --parent XXXX
```

## Tips

- All output is JSON — parse `id`, `url`, `path` fields from responses
- Use `ado --org ORG projects` to discover available projects
- `--area` defaults to `--project` value if omitted
- Sprint iteration paths follow format: `ProjectName\Sprint YYYY-MM`
