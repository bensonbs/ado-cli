# ado-cli

[English README](README.md)

輕量的 Azure DevOps CLI 工具，用於 Sprint 與 Work Item 操作。設計為中介層，讓 AI 代理（如 Claude Code）能操作 Azure DevOps **而不需要直接接觸你的 PAT**。

支援**跨組織、跨專案**操作 — PAT 只需在 `.env` 設定一次，org/project 由每次指令的 flag 指定。

## 功能

- **Sprint** — 查詢當前 Sprint、列出 Sprint、檢視 Sprint 內的工作項目
- **Work Items** — 建立、更新、關閉、指派、刪除、留言、查詢
- **複合指令** — `create-card` 一步完成 Issue + Task + commit 關聯
- **Commit 關聯** — 將 git commit 連結到 Work Item
- **Repo 資訊** — 從 git remote URL 解析 Azure DevOps 的 project/repo GUID
- **跨組織** — `--org` 和 `--project` flag 支援跨組織/專案操作
- **乾淨 JSON 輸出** — 所有指令輸出 JSON，方便程式解析

## 安裝

```bash
git clone https://github.com/bensonbs/ado-cli.git
cd ado-cli
npm install
npm link
```

`npm link` 後，`ado` 指令即可全域使用。

## 設定

複製範例設定檔並加入你的 PAT：

```bash
cp .env.example .env
```

編輯 `.env`：

```
ADO_PAT=你的-personal-access-token
```

就這樣。組織和專案透過 CLI flag 傳入，同一個 PAT 可以操作多個專案。

### 取得 PAT

1. 前往 `https://dev.azure.com/{你的組織}/_usersSettings/tokens`
2. 建立新 token，勾選 **Work Items（讀取和寫入）** 和 **Code（讀取）** 範圍
3. 將 token 複製到 `.env` 檔

> **安全性**：`.env` 已被 git ignore，不會進入版本控制。

## 全域選項

所有指令都支援以下 flag：

| Flag | 說明 |
|------|------|
| `--org <org>` | Azure DevOps 組織名稱（必要） |
| `--project <project>` | Azure DevOps 專案名稱（大部分指令必要） |
| `--area <area>` | Area path（預設等同 `--project`） |
| `--pat <token>` | 覆蓋 `.env` 裡的 PAT |

```bash
# 範例：指定組織和專案
ado --org MyOrg --project MyProject sprint current

# 下一個指令切換到不同的組織/專案
ado --org OtherOrg --project OtherProject wi list --state Active
```

## 使用方式

### Sprint

```bash
# 取得當前 Sprint
ado --org MyOrg --project MyProject sprint current

# 列出所有 Sprint（篩選：past, current, future）
ado --org MyOrg --project MyProject sprint list --timeframe current

# 列出當前 Sprint 的工作項目
ado --org MyOrg --project MyProject sprint workitems
```

### Work Items — 建立

```bash
# 建立 Issue
ado --org MyOrg --project MyProject wi create-issue --title "改善：登入流程"

# 建立 Task 並關聯到 parent Issue
ado --org MyOrg --project MyProject wi create-task --title "新增匯出按鈕" --parent 1234

# 建立 Task 並附上 HTML 說明
ado --org MyOrg --project MyProject wi create-task \
  --title "修正逾時問題" \
  --description "<p>將 timeout 從 30 秒調整為 60 秒</p>" \
  --parent 1234
```

### Work Items — 開卡片（複合指令）

一個指令完成 Issue + Task + commit 關聯：

```bash
ado --org MyOrg --project MyProject wi create-card \
  --issue-title "改善：檔案上傳穩定性" \
  --task-title "修正上傳逾時" \
  --task-description "<p>根因：30 秒 timeout 不足</p>" \
  --iteration "Project\Sprint 2026-05" \
  --project-id <guid> --repo-id <guid> --commit <sha>
```

### Work Items — 查詢

```bash
# 查詢單一 Work Item
ado --org MyOrg --project MyProject wi get 1234

# 依條件列出 Work Items
ado --org MyOrg --project MyProject wi list --iteration "Project\Sprint 2026-05"
ado --org MyOrg --project MyProject wi list --state Active --type Task
ado --org MyOrg --project MyProject wi list --assigned-to "王小明"

# 列出父項目的所有子項
ado --org MyOrg --project MyProject wi children 1234

# 執行自訂 WIQL 查詢
ado --org MyOrg --project MyProject wi query "SELECT [System.Id] FROM WorkItems WHERE [System.State] = 'Active'"
```

### Work Items — 更新

```bash
# 更新欄位
ado --org MyOrg --project MyProject wi update 1234 --title "新標題" --state Active

# 快速關閉
ado --org MyOrg --project MyProject wi close 1234

# 快速指派
ado --org MyOrg --project MyProject wi assign 1234 --to "王小明"
```

### Work Items — 留言與刪除

```bash
# 新增留言
ado --org MyOrg --project MyProject wi comment 1234 --text "已部署到 staging"

# 刪除（移到資源回收筒）
ado --org MyOrg --project MyProject wi delete 1234

# 永久刪除
ado --org MyOrg --project MyProject wi delete 1234 --destroy
```

### Repo 資訊與 Commit 關聯

```bash
# 從 git remote URL 取得 repo 資訊（自動解析 org/project/repo）
ado repo info --remote-url "https://dev.azure.com/MyOrg/MyProject/_git/MyRepo"

# 或手動指定
ado --org MyOrg repo info --repo-project MyProject --repo-name MyRepo

# 將 commit 關聯到 Task
ado --org MyOrg --project MyProject wi link-commit \
  --task-id 1234 \
  --project-id <guid> \
  --repo-id <guid> \
  --commit "abc123def456"
```

### 完整工作流範例

```bash
# 1. Commit 並 push
git add -A && git commit -m "fix: 修正逾時問題" && git push

# 2. 取得當前 Sprint
ado --org MyOrg --project MyProject sprint current
# → { "path": "Project\\Sprint 2026-05", ... }

# 3. 取得 repo 資訊
ado repo info --remote-url "$(git remote get-url origin)"
# → { "projectId": "xxx", "repoId": "yyy", ... }

# 4. 一步開卡
ado --org MyOrg --project MyProject wi create-card \
  --issue-title "改善：檔案上傳穩定性" \
  --task-title "修正上傳逾時" \
  --task-description "<p>30 秒 timeout 對大檔不足</p>" \
  --iteration "Project\Sprint 2026-05" \
  --project-id xxx --repo-id yyy --commit "$(git rev-parse HEAD)"
```

## 指令總覽

| 指令 | 說明 |
|------|------|
| `ado sprint current` | 取得當前 Sprint |
| `ado sprint list` | 列出 Sprint |
| `ado sprint workitems` | 列出 Sprint 內的工作項目 |
| `ado wi create-issue` | 建立 Issue |
| `ado wi create-task` | 建立 Task |
| `ado wi create-card` | 建立 Issue + Task + commit 關聯 |
| `ado wi get <id>` | 查詢 Work Item |
| `ado wi list` | 列出/篩選 Work Items |
| `ado wi query <wiql>` | 執行 WIQL 查詢 |
| `ado wi children <id>` | 列出子項目 |
| `ado wi update <id>` | 更新 Work Item |
| `ado wi close <id>` | 關閉 Work Item |
| `ado wi assign <id>` | 指派 Work Item |
| `ado wi comment <id>` | 新增留言 |
| `ado wi delete <id>` | 刪除 Work Item |
| `ado wi link-commit` | 關聯 Commit |
| `ado repo info` | 取得 repo 的 project/repo GUID |

## 搭配 Claude Code 使用（Agent Skill）

此 repo 內建 **Claude Code skill**。安裝後，Claude 可以自主使用所有 `ado` 指令。

### 安裝 skill

```bash
# 方法 1：全域安裝（所有專案都可用）
./install-skill.sh

# 方法 2：安裝到特定專案
mkdir -p your-project/.claude/skills/ado
cp .claude/skills/ado/SKILL.md your-project/.claude/skills/ado/
```

安裝後：
- 可在 Claude Code 中使用 `/ado` slash command
- 當你提到 sprint、work item、開卡片、ADO 時，Claude 會自動載入此 skill

### Skill 提供的能力

- 探索組織和專案（`ado --org ORG projects`）
- 查詢 Sprint 和 Work Items
- 一步完成開卡片（Issue + Task + commit 關聯）
- 自動執行「開卡片並 commit」流程

不需要在 `CLAUDE.md` 加任何東西 — skill 會處理一切。

## 授權

MIT
