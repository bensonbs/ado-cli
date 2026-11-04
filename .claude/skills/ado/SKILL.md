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
ado wi comment ID --text "TEXT"          # markdown by default (--format html for HTML)
ado wi comment ID --file path.md         # read long text from a file, avoids shell quoting
ado wi delete ID [--destroy]
```

## Repo & Commit Linking

**IMPORTANT:**
1. Before running `ado wi link-commit`, ensure the commit has been `git push`ed to the remote. Linking a local-only commit will result in ADO being unable to display the actual content.
2. `--commit` accepts a short SHA: the CLI resolves it to the full 40-character SHA with `git rev-parse`. Run the command inside that repo's directory, or the lookup fails.

```bash
# Get projectId/repoId (auto-parses org from URL)
ado repo info --remote-url "REMOTE_URL"

# Link commit to work item (must be pushed; short SHA is resolved in the current repo)
ado wi link-commit --task-id ID --project-id GUID --repo-id GUID --commit <sha>
```

## Pull Requests

```bash
ado pr create --repo-id GUID --title "TITLE" --source BRANCH [--target main] [--description "TEXT"] [--draft] [--work-items 1234,5678]
ado pr list --repo-id GUID [--status active|abandoned|completed|all] [--top N]
ado pr get ID --repo-id GUID
ado pr update ID --repo-id GUID [--title T] [--description TEXT]
ado pr abandon ID --repo-id GUID
```

> **Always pass `--source` explicitly.** Without it, the CLI uses the branch of the *current working directory*. If you run `ado` from another directory (for example, the ado-cli checkout), it picks that repo's branch and ADO returns `TF401398 ... source and/or the target branch no longer exists`.

## Pipelines

```bash
ado pipeline list [--top N]                  # find the pipeline id
ado pipeline get ID
ado pipeline runs ID [--top 10]              # recent runs
ado pipeline run-get ID RUN_ID
ado pipeline logs ID RUN_ID                  # list log entries
ado pipeline log ID RUN_ID LOG_ID            # read one log
ado pipeline run ID [--branch B] [--var k=v ...]
```

> ⚠️ `ado pipeline run` really triggers the pipeline, including deployments. Only run it when the user explicitly asks.

## Sprint 卡片規則

### 卡片層級

| 層級 | 用途 | 誰看 |
|------|------|------|
| **Issue**（parent） | 一個使用者可感知的改善或功能 | 全團隊 |
| **Task**（child） | 一個可獨立交付、可驗收的工作成果 | 工程師 |

### Title 規則
- **非技術語言**（團隊多非工程背景）
- Issue 前綴：「改善：」「新增：」「修復：」「事件記錄：」「評估：」
- Task 描述具體交付成果

### Task 大小原則
- **一個 Task = 一個可交付的成果**，不按問題或實驗拆
- 過程中的 bug、嘗試與排除 → 寫在該 Task 的**備註或 Comment**，不另開 Task
- 卡片數量不代表工時，工時用 Comment 或 Completed Work 欄位體現
- 不在這個 Sprint 做 → 移到 Backlog 或 Title 加 `[Pending]`

### Description HTML 模板

**Issue：**
```html
<h3>背景</h3>
<p>為什麼要做這件事</p>

<h3>目標</h3>
<p>做完後的預期效果（使用者角度）</p>

<h3>影響範圍</h3>
<p>影響哪些服務/角色/客戶</p>
```

**Task：**
```html
<h3>做什麼</h3>
<p>具體工作內容</p>

<h3>驗收標準</h3>
<ul>
<li>可量化的完成條件</li>
</ul>

<h3>備註</h3>
<p>技術細節、限制、相依項目（選填）</p>
```

**事件記錄（Issue，通常不需要 Task，除非有後續預防措施）：**
```html
<h3>事件</h3>
<p>什麼時候、發生了什麼事、影響範圍</p>

<h3>原因</h3>
<p>root cause</p>

<h3>處理方式</h3>
<p>怎麼修的、何時恢復</p>

<h3>後續預防</h3>
<p>避免再次發生的措施（選填）</p>
```

### Comment 注意事項
- `ado wi comment` 預設以 Markdown 送出（`--format markdown`）；要送 HTML 時加 `--format html`
- **完整歷程** → Issue Comment
- **工作紀錄**（做了什麼、踩了什麼坑） → Task Comment
- **策略決定** → Issue Description

## 「開卡片並 commit」Workflow

When the user says **「開卡片並 commit」**, follow this sequence:

1. **Commit & push** the code changes
2. **Get current sprint**: `ado sprint current` → extract `path`
3. **Get repo info**: `ado repo info --remote-url "$(git remote get-url origin)"` → extract `projectId`, `repoId`
4. **Create card** (Issue + Task + commit link), using the description templates above:
   ```bash
   ado wi create-card \
     --issue-title "改善：NON_TECHNICAL_TITLE" \
     --task-title "NON_TECHNICAL_TITLE" \
     --task-description "HTML_USING_TEMPLATE" \
     --iteration "SPRINT_PATH" \
     --project-id GUID --repo-id GUID --commit SHA
   ```

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
