# ado-cli

[English README](README.md)

輕量的 Azure DevOps CLI 工具，用於 Sprint 與 Work Item 操作。設計為中介層，讓 AI 代理（如 Claude Code）能操作 Azure DevOps **而不需要直接接觸你的 PAT**。

## 功能

- **Sprint** — 查詢當前 Sprint 或列出所有 Sprint
- **Work Items** — 建立 Issue、Task，自動建立父子關聯
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

# 列出所有 Sprint
ado sprint list

# 依時間範圍篩選
ado sprint list --timeframe current
ado sprint list --timeframe past
ado sprint list --timeframe future
```

### Work Items

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

# 查詢 Work Item
ado wi get 1234
```

### Commit 關聯

```bash
# 從 git remote URL 取得 repo 資訊
ado repo info --remote-url "https://dev.azure.com/MyOrg/MyProject/_git/MyRepo"

# 或直接指定 project 和 repo 名稱
ado repo info --project "MyProject" --repo "MyRepo"

# 將 commit 關聯到 Task
ado wi link-commit \
  --task-id 1234 \
  --project-id "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" \
  --repo-id "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy" \
  --commit "abc123def456"
```

### 完整工作流範例

典型的「開卡片並 commit」流程：

```bash
# 1. Commit 並 push
git add -A && git commit -m "fix: 修正逾時問題" && git push

# 2. 取得當前 Sprint
ado sprint current
# → { "path": "MyProject\\Sprint 2026-05", ... }

# 3. 建立 Issue（parent）
ado wi create-issue --title "改善：檔案上傳穩定性" --iteration "MyProject\Sprint 2026-05"
# → { "id": 5678, ... }

# 4. 建立 Task（child）並關聯 Issue
ado wi create-task \
  --title "修正上傳逾時" \
  --description "<p>根因：大檔上傳預設 30 秒 timeout 不足</p>" \
  --iteration "MyProject\Sprint 2026-05" \
  --parent 5678
# → { "id": 5679, ... }

# 5. 取得 repo 資訊
ado repo info --remote-url "$(git remote get-url origin)"
# → { "projectId": "xxx", "repoId": "yyy", ... }

# 6. 關聯 commit
ado wi link-commit --task-id 5679 --project-id xxx --repo-id yyy --commit "$(git rev-parse HEAD)"
```

## 搭配 Claude Code 使用

在你的 `CLAUDE.md` 加入：

```markdown
## Sprint 操作
- 用 `ado sprint current` 取得當前 Sprint
- 用 `ado wi create-issue` / `ado wi create-task` 建立 Work Item
- 用 `ado wi link-commit` 關聯 Commit
- 用 `ado repo info --remote-url <url>` 查詢 repo GUID
```

這樣 AI 代理只透過 CLI 操作，PAT 安全地留在 `.env` 裡。

## 授權

MIT
