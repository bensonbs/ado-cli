const { request } = require("./api");

/**
 * Get repo info (projectId, repoId) from Azure DevOps.
 * Uses ctx.base for the org URL; project param is the repo's DevOps project.
 */
async function getRepoInfo(ctx, project, repoName) {
  const encProj = encodeURIComponent(project);
  const url = `${ctx.base}/${encProj}/_apis/git/repositories/${encodeURIComponent(repoName)}?api-version=7.1`;
  const data = await request(ctx, url);
  return {
    repoId: data.id,
    repoName: data.name,
    projectId: data.project.id,
    projectName: data.project.name,
  };
}

/**
 * Parse an Azure DevOps git remote URL to extract org, project and repo name.
 * Supports both SSH and HTTPS formats:
 *   https://dev.azure.com/ORG/PROJECT/_git/REPO
 *   git@ssh.dev.azure.com:v3/ORG/PROJECT/REPO
 */
function parseRemoteUrl(remoteUrl) {
  // HTTPS format
  const httpsMatch = remoteUrl.match(/dev\.azure\.com\/([^/]+)\/([^/]+)\/_git\/(.+?)(?:\.git)?$/);
  if (httpsMatch) return { org: httpsMatch[1], project: decodeURIComponent(httpsMatch[2]), repoName: httpsMatch[3] };

  // SSH format
  const sshMatch = remoteUrl.match(/ssh\.dev\.azure\.com:v3\/([^/]+)\/([^/]+)\/(.+?)(?:\.git)?$/);
  if (sshMatch) return { org: sshMatch[1], project: sshMatch[2], repoName: sshMatch[3] };

  throw new Error(`Cannot parse Azure DevOps remote URL: ${remoteUrl}`);
}

module.exports = { getRepoInfo, parseRemoteUrl };
