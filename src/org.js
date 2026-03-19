const { request } = require("./api");

/**
 * Get the authenticated user's info (verify PAT is valid for the org).
 * Requires --org.
 */
async function whoami(ctx) {
  const url = `${ctx.base}/_apis/connectiondata`;
  const data = await request(ctx, url);
  const user = data.authenticatedUser;
  return {
    id: user.id,
    name: user.providerDisplayName,
    email: user.properties?.Account?.$value || null,
  };
}

/**
 * List all projects in an organization.
 * Requires --org.
 */
async function listProjects(ctx) {
  const url = `${ctx.base}/_apis/projects?api-version=7.1&$top=500`;
  const data = await request(ctx, url);

  return data.value.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description || null,
    state: p.state,
  }));
}

module.exports = { whoami, listProjects };
