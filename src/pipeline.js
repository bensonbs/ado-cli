const { request } = require("./api");

async function list(ctx, { top } = {}) {
  const enc = encodeURIComponent(ctx.project);
  let url = `${ctx.base}/${enc}/_apis/pipelines?api-version=7.1`;
  if (top) url += `&$top=${top}`;
  const data = await request(ctx, url);
  return (data.value || []).map((p) => ({
    id: p.id,
    name: p.name,
    folder: p.folder,
    revision: p.revision,
    url: p._links?.web?.href || null,
  }));
}

async function get(ctx, { id }) {
  const enc = encodeURIComponent(ctx.project);
  const url = `${ctx.base}/${enc}/_apis/pipelines/${id}?api-version=7.1`;
  const p = await request(ctx, url);
  return {
    id: p.id,
    name: p.name,
    folder: p.folder,
    revision: p.revision,
    url: p._links?.web?.href || null,
    configuration: p.configuration,
  };
}

async function runs(ctx, { id, top }) {
  const enc = encodeURIComponent(ctx.project);
  let url = `${ctx.base}/${enc}/_apis/pipelines/${id}/runs?api-version=7.1`;
  if (top) url += `&$top=${top}`;
  const data = await request(ctx, url);
  return (data.value || []).map((r) => ({
    id: r.id,
    name: r.name,
    state: r.state,
    result: r.result || null,
    createdDate: r.createdDate,
    finishedDate: r.finishedDate || null,
    url: r._links?.web?.href || null,
  }));
}

async function getRun(ctx, { id, runId }) {
  const enc = encodeURIComponent(ctx.project);
  const url = `${ctx.base}/${enc}/_apis/pipelines/${id}/runs/${runId}?api-version=7.1`;
  const r = await request(ctx, url);
  return {
    id: r.id,
    name: r.name,
    state: r.state,
    result: r.result || null,
    createdDate: r.createdDate,
    finishedDate: r.finishedDate || null,
    url: r._links?.web?.href || null,
    resources: r.resources,
    variables: r.variables,
  };
}

async function run(ctx, { id, branch, variables } = {}) {
  const enc = encodeURIComponent(ctx.project);
  const url = `${ctx.base}/${enc}/_apis/pipelines/${id}/runs?api-version=7.1`;
  const body = {};
  if (branch) body.resources = { repositories: { self: { refName: branch.startsWith("refs/") ? branch : `refs/heads/${branch}` } } };
  if (variables) body.variables = variables;
  const r = await request(ctx, url, { method: "POST", body });
  return {
    id: r.id,
    name: r.name,
    state: r.state,
    createdDate: r.createdDate,
    url: r._links?.web?.href || null,
  };
}

async function logs(ctx, { id, runId }) {
  const enc = encodeURIComponent(ctx.project);
  const url = `${ctx.base}/${enc}/_apis/pipelines/${id}/runs/${runId}/logs?api-version=7.1`;
  const data = await request(ctx, url);
  return (data.logs || []).map((l) => ({
    id: l.id,
    lineCount: l.lineCount,
    createdOn: l.createdOn,
    lastChangedOn: l.lastChangedOn,
    url: l.url,
  }));
}

async function getLog(ctx, { id, runId, logId }) {
  const enc = encodeURIComponent(ctx.project);
  const url = `${ctx.base}/${enc}/_apis/pipelines/${id}/runs/${runId}/logs/${logId}?api-version=7.1&$expand=signedContent`;
  const data = await request(ctx, url);
  // Fetch actual log content from signedContent URL
  if (data.signedContent?.url) {
    const res = await fetch(data.signedContent.url);
    return { logId, content: await res.text() };
  }
  return data;
}

module.exports = { list, get, runs, getRun, run, logs, getLog };
