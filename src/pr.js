const { request } = require("./api");

/**
 * Create a pull request.
 */
async function createPR(ctx, { repoId, title, description, sourceBranch, targetBranch, isDraft = false, workItemIds = [] }) {
  const url = `${ctx.base}/${encodeURIComponent(ctx.project)}/_apis/git/repositories/${repoId}/pullrequests?api-version=7.1`;
  const body = {
    title,
    description: description || "",
    sourceRefName: `refs/heads/${sourceBranch}`,
    targetRefName: `refs/heads/${targetBranch}`,
    isDraft,
    workItemRefs: workItemIds.map((id) => ({ id: String(id) })),
  };
  const data = await request(ctx, url, { method: "POST", body });
  return formatPR(ctx, data);
}

/**
 * List pull requests.
 */
async function listPRs(ctx, { repoId, status = "active", top = 20 }) {
  const url = `${ctx.base}/${encodeURIComponent(ctx.project)}/_apis/git/repositories/${repoId}/pullrequests?api-version=7.1&searchCriteria.status=${status}&$top=${top}`;
  const data = await request(ctx, url);
  return data.value.map((pr) => formatPR(ctx, pr));
}

/**
 * Get a single pull request by ID.
 */
async function getPR(ctx, { repoId, pullRequestId }) {
  const url = `${ctx.base}/${encodeURIComponent(ctx.project)}/_apis/git/repositories/${repoId}/pullrequests/${pullRequestId}?api-version=7.1`;
  const data = await request(ctx, url);
  return formatPR(ctx, data);
}

/**
 * Update a pull request (title, description, status).
 */
async function updatePR(ctx, { repoId, pullRequestId, title, description, status }) {
  const url = `${ctx.base}/${encodeURIComponent(ctx.project)}/_apis/git/repositories/${repoId}/pullrequests/${pullRequestId}?api-version=7.1`;
  const body = {};
  if (title !== undefined) body.title = title;
  if (description !== undefined) body.description = description;
  if (status !== undefined) body.status = status; // "active" | "abandoned" | "completed"
  const data = await request(ctx, url, { method: "PATCH", body });
  return formatPR(ctx, data);
}

/**
 * Abandon a pull request.
 */
async function abandonPR(ctx, { repoId, pullRequestId }) {
  return updatePR(ctx, { repoId, pullRequestId, status: "abandoned" });
}

function formatPR(ctx, pr) {
  const repoName = pr.repository?.name || "";
  return {
    pullRequestId: pr.pullRequestId,
    title: pr.title,
    status: pr.status,
    isDraft: pr.isDraft,
    sourceBranch: pr.sourceRefName?.replace("refs/heads/", ""),
    targetBranch: pr.targetRefName?.replace("refs/heads/", ""),
    createdBy: pr.createdBy?.displayName,
    creationDate: pr.creationDate,
    url: `https://dev.azure.com/${ctx.org}/${encodeURIComponent(ctx.project)}/_git/${repoName}/pullrequest/${pr.pullRequestId}`,
  };
}

module.exports = { createPR, listPRs, getPR, updatePR, abandonPR };
