# ado-cli

[English README](README.md)

輕量的 Azure DevOps CLI 工具，用於 Sprint 與 Work Item 操作。設計為中介層，讓 AI 代理（如 Claude Code）能操作 Azure DevOps **而不需要直接接觸你的 PAT**。

## 功能

- **Sprint** — 查詢當前 Sprint、列出 Sprint、檢視 Sprint 內的工作項目
- **Work Items** — 建立、更新、關閉、指派、刪除、留言、查詢
- **複合指令** — `create-card` 一步完成 Issue + Task + commit 關聯
- **Commit 關聯** — 將 git commit 連結到 Work Item
- **Repo 資訊** — 從 git remote URL 解析 Azure DevOps 的 project/repo GUID
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

複製範例設定檔並填入你的值：

```bash
cp .env.example .env
```

編輯 `.env`：

```
ADO_PAT=你的-personal-access-token
ADO_ORG=你的組織名稱
ADO_PROJECT=你的專案名稱
ADO_AREA_PATH=你的-area-path
```

### 取得 PAT

1. 前往 `https://dev.azure.com/{你的組織}/_usersSettings/tokens`
2. 建立新 token，勾選 **Work Items（讀取和寫入）** 和 **Code（讀取）** 範圍
3. 將 token 複製到 `.env` 檔

> **安全性**：`.env` 已被 git ignore，不會進入版本控制。

## 使用方式

### Sprint

```bash
# 取得當前 Sprint
ado sprint current

# 列出所有 Sprint（篩選：past, current, future）
ado sprint list
ado sprint list --timeframe current

# 列出當前 Sprint 的工作項目
ado sprint workitems

# 列出指定 Sprint 的工作項目
ado sprint workitems --iteration-id <sprint-guid>
```

### Work Items — 建立

```bash
# 建立 Issue
ado wi create-issue --title "改善：登入流程"

# 建立 Issue 並指定 Sprint
ado wi create-issue --title "新增：匯出功能" --iteration "專案\Sprint 2026-05"

# 建立 Task 並關聯到 parent Issue
ado wi create-task --title "新增匯出按鈕" --parent 1234

# 建立 Task 並附上 HTML 說明
ado wi create-task \
  --title "修正逾時問題" \
  --description "<p>將大檔上傳的 timeout 從 30 秒調整為 60 秒</p>" \
  --parent 1234
```

### Work Items — 開卡片（複合指令）

一個指令完成 Issue + Task + commit 關聯：

```bash
ado wi create-card \
  --issue-title "改善：檔案上傳穩定性" \
  --task-title "修正上傳逾時" \
  --task-description "<p>根因：30 秒 timeout 不足</p>" \
  --iteration "專案\Sprint 2026-05" \
  --project-id <guid> --repo-id <guid> --commit <sha>
```

### Work Items — 查詢

```bash
# 查詢單一 Work Item
ado wi get 1234

# 依條件列出 Work Items
ado wi list --iteration "專案\Sprint 2026-05"
ado wi list --state Active --type Task
ado wi list --assigned-to "王小明"

# 列出父項目的所有子項
ado wi children 1234

# 執行自訂 WIQL 查詢
ado wi query "SELECT [System.Id] FROM WorkItems WHERE [System.State] = 'Active'"
```

### Work Items — 更新

```bash
# 更新欄位
ado wi update 1234 --title "新標題" --state Active
ado wi update 1234 --assigned-to "王小明" --iteration "專案\Sprint 2026-05"

# 快速關閉
ado wi close 1234

# 快速指派
ado wi assign 1234 --to "王小明"
```

### Work Items — 留言與刪除

```bash
# 新增留言
ado wi comment 1234 --text "已部署到 staging"

# 刪除（移到資源回收筒）
ado wi delete 1234

# 永久刪除（無法復原）
ado wi delete 1234 --destroy
```

### Commit 關聯

```bash
# 從 git remote URL 取得 repo 資訊
ado repo info --remote-url "https://dev.azure.com/MyOrg/MyProject/_git/MyRepo"

# 或直接指定
ado repo info --project "MyProject" --repo "MyRepo"

# 將 commit 關聯到 Task
ado wi link-commit \
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
ado sprint current
# → { "path": "Project\\Sprint 2026-05", ... }

# 3. 取得 repo 資訊
ado repo info --remote-url "$(git remote get-url origin)"
# → { "projectId": "xxx", "repoId": "yyy", ... }

# 4. 一步開卡（Issue + Task + commit 關聯）
ado wi create-card \
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

## 搭配 Claude Code 使用

在你的 `CLAUDE.md` 加入：

```markdown
## Sprint 操作
- 用 `ado sprint current` 取得當前 Sprint
- 用 `ado wi create-card` 一步完成 Issue + Task + commit 關聯
- 用 `ado wi list --iteration "..." --state Active` 查看 Sprint 進度
- 用 `ado repo info --remote-url <url>` 查詢 repo GUID
```

這樣 AI 代理只透過 CLI 操作，PAT 安全地留在 `.env` 裡。

## 授權

MIT
