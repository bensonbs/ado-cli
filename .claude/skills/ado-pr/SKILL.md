---
name: ado-pr
description: 分析當前分支、產生 PR title + description、push，並透過 ADO REST API 建立或更新 Pull Request。
allowed-tools: Bash, Read, Glob, Grep, AskUserQuestion
argument-hint: [target-branch，預設 main]
---

# /ado-pr — 建立 Azure DevOps Pull Request

## 環境設定

ADO 設定讀自 `~/Documents/ado-cli/.env`：
- `ADO_PAT` — Personal Access Token（需有 **Code Read & Write** 權限）
- `ADO_ORG` — 預設 `IQ-T`
- `ADO_PROJECT` — 預設 `LINE-AI-News`

> ⚠️ **如果 API 回傳 401**：PAT 缺少 `Code (Read & write)` 權限。
> 請至 https://dev.azure.com/<org>/_usersSettings/tokens → 選 token → Edit → Code 勾選 **Read & write** → Save。
> PAT 值不變，不需要更新 `.env`。

---

## Step 1: Git 分析

```bash
git fetch origin
BASE="${ARGUMENTS:-main}"
git log --oneline origin/${BASE}..HEAD
git diff origin/${BASE}...HEAD --stat
```

> 永遠用 `origin/<base>` 比較，不用本地 branch。

---

## Step 2: 產生 PR Title 和 Description

### Title 規則
- **base 為 main/master + 有 package.json**：`Release vX.Y.Z: <摘要>`
- **有 ADO ticket 編號**（如 `#1234`）：`fix(scope): description (#1234)`
- **一般**：`<type>(scope): <description>`

### Description 格式（繁體中文）

```markdown
## Summary
<!-- 1-3 句說明目的和背景 -->

## Changes
<!-- 按主題分類，涵蓋所有 commits -->

## Test plan
- [ ] ...

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

---

## Step 3: 確認後 Push & 建立 PR

用 AskUserQuestion 讓使用者確認 title + description 後再執行。

### Push

```bash
git push -u origin HEAD
```

### 建立 PR（Node.js）

```javascript
// 讀取 .env
const lines = require('fs').readFileSync(
  require('path').resolve(require('os').homedir(), 'Documents/ado-cli/.env'), 'utf8'
).split('\n');
const env = {};
for (const l of lines) {
  const t = l.trim();
  if (!t || t.startsWith('#')) continue;
  const idx = t.indexOf('=');
  if (idx === -1) continue;
  env[t.slice(0, idx).trim()] = t.slice(idx + 1).trim();
}

const org = env.ADO_ORG || 'IQ-T';
const project = env.ADO_PROJECT || 'LINE-AI-News';
const auth = 'Basic ' + Buffer.from(':' + env.ADO_PAT).toString('base64');

// 取得 repo ID
const repoName = require('child_process')
  .execSync('git remote get-url origin').toString().trim()
  .replace(/.*v3\/[^/]*\/[^/]*\//, '');

const repoRes = await fetch(
  `https://dev.azure.com/${org}/${project}/_apis/git/repositories?api-version=7.1`,
  { headers: { Authorization: auth } }
);
const repos = await repoRes.json();
const repo = repos.value.find(r => r.name === repoName);

// 建立 PR
const branch = require('child_process')
  .execSync('git branch --show-current').toString().trim();
const base = process.env.ARGUMENTS || 'main';

const res = await fetch(
  `https://dev.azure.com/${org}/${project}/_apis/git/repositories/${repo.id}/pullrequests?api-version=7.1`,
  {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: PR_TITLE,
      description: PR_DESCRIPTION,
      sourceRefName: `refs/heads/${branch}`,
      targetRefName: `refs/heads/${base}`,
      isDraft: false
    })
  }
);
const pr = await res.json();

if (pr.pullRequestId) {
  console.log(`PR #${pr.pullRequestId}: https://dev.azure.com/${org}/${project}/_git/${repoName}/pullrequest/${pr.pullRequestId}`);
} else {
  console.error('Error:', pr.message || JSON.stringify(pr));
}
```

以 `node -e "<上述程式碼>"` 執行，將 `PR_TITLE` 和 `PR_DESCRIPTION` 替換為實際內容。

---

## 使用方式

```
/ado-pr          # base branch 預設 main
/ado-pr develop  # base branch 為 develop
```
