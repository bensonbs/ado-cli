const { request, BASE } = require("./api");

/**
 * Get repo info (projectId, repoId) from Azure DevOps.
 * @param {string} project - Azure DevOps project name (from remote URL)
 * @param {string} repoName - Repository name (from remote URL)
 */
async function getRepoInfo(project, repoName) {
  const enc = encodeURIComponent(project);
  const url = `${BASE}/${enc}/_apis/git/repositories/${encodeURIComponent(repoName)}?api-version=7.1`;
  const data = await request(url);
  return {
    repoId: data.id,
    repoName: data.name,
    projectId: data.project.id,
    projectName: data.project.name,
  };
}

/**
 * Parse an Azure DevOps git remote URL to extract project and repo name.
 * Supports both SSH and HTTPS formats:
 *   https://dev.azure.com/ORG/PROJECT/_git/REPO
 *   git@ssh.dev.azure.com:v3/ORG/PROJECT/REPO
 */
function parseRemoteUrl(remoteUrl) {
  // HTTPS format
  const httpsMatch = remoteUrl.match(/dev\.azure\.com\/[^/]+\/([^/]+)\/_git\/(.+?)(?:\.git)?$/);
  if (httpsMatch) return { project: decodeURIComponent(httpsMatch[1]), repoName: httpsMatch[2] };

  // SSH format
  const sshMatch = remoteUrl.match(/ssh\.dev\.azure\.com:v3\/[^/]+\/([^/]+)\/(.+?)(?:\.git)?$/);
  if (sshMatch) return { project: sshMatch[1], repoName: sshMatch[2] };

  throw new Error(`Cannot parse Azure DevOps remote URL: ${remoteUrl}`);
}

module.exports = { getRepoInfo, parseRemoteUrl };
