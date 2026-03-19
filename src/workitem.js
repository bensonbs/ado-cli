const { request, patchWorkItem } = require("./api");

function enc(ctx) { return encodeURIComponent(ctx.project); }

// ─── Create ──────────────────────────────────────────────

async function createIssue(ctx, { title, iterationPath, areaPath }) {
  const url = `${ctx.base}/${enc(ctx)}/_apis/wit/workitems/$Issue?api-version=7.1`;
  const doc = [
    { op: "add", path: "/fields/System.Title", value: title },
    { op: "add", path: "/fields/System.IterationPath", value: iterationPath || ctx.project },
    { op: "add", path: "/fields/System.AreaPath", value: areaPath || ctx.area },
  ];
  const r = await patchWorkItem(ctx, url, doc);
  return { id: r.id, url: r._links?.html?.href || r.url, title: r.fields["System.Title"] };
}

async function createTask(ctx, { title, description, iterationPath, areaPath, parentId }) {
  const url = `${ctx.base}/${enc(ctx)}/_apis/wit/workitems/$Task?api-version=7.1`;
  const doc = [
    { op: "add", path: "/fields/System.Title", value: title },
    { op: "add", path: "/fields/System.IterationPath", value: iterationPath || ctx.project },
    { op: "add", path: "/fields/System.AreaPath", value: areaPath || ctx.area },
  ];
  if (description) {
    doc.push({ op: "add", path: "/fields/System.Description", value: description });
  }
  if (parentId) {
    doc.push({
      op: "add",
      path: "/relations/-",
      value: {
        rel: "System.LinkTypes.Hierarchy-Reverse",
        url: `${ctx.base}/${enc(ctx)}/_apis/wit/workItems/${parentId}`,
        attributes: { comment: "Parent link" },
      },
    });
  }
  const r = await patchWorkItem(ctx, url, doc);
  return { id: r.id, url: r._links?.html?.href || r.url, title: r.fields["System.Title"] };
}

// ─── Read ────────────────────────────────────────────────

async function get(ctx, { id }) {
  const url = `${ctx.base}/${enc(ctx)}/_apis/wit/workitems/${id}?$expand=relations&api-version=7.1`;
  const r = await request(ctx, url);
  return {
    id: r.id,
    type: r.fields["System.WorkItemType"],
    title: r.fields["System.Title"],
    state: r.fields["System.State"],
    assignedTo: r.fields["System.AssignedTo"]?.displayName || null,
    iteration: r.fields["System.IterationPath"],
    url: r._links?.html?.href || r.url,
  };
}

async function list(ctx, { iterationPath, state, type, assignedTo }) {
  const conditions = [`[System.TeamProject] = '${ctx.project}'`];
  if (iterationPath) conditions.push(`[System.IterationPath] = '${iterationPath}'`);
  if (state) conditions.push(`[System.State] = '${state}'`);
  if (type) conditions.push(`[System.WorkItemType] = '${type}'`);
  if (assignedTo) conditions.push(`[System.AssignedTo] = '${assignedTo}'`);

  const wiql = `SELECT [System.Id] FROM WorkItems WHERE ${conditions.join(" AND ")} ORDER BY [System.Id] DESC`;
  return await queryWiql(ctx, wiql);
}

async function queryWiql(ctx, wiql) {
  const url = `${ctx.base}/${enc(ctx)}/_apis/wit/wiql?api-version=7.1`;
  const data = await request(ctx, url, { method: "POST", body: { query: wiql } });

  if (!data.workItems || data.workItems.length === 0) return [];

  const ids = data.workItems.map((w) => w.id).slice(0, 200);
  const batchUrl = `${ctx.base}/${enc(ctx)}/_apis/wit/workitems?ids=${ids.join(",")}&fields=System.Id,System.Title,System.State,System.WorkItemType,System.AssignedTo,System.IterationPath&api-version=7.1`;
  const batch = await request(ctx, batchUrl);

  return batch.value.map((r) => ({
    id: r.id,
    type: r.fields["System.WorkItemType"],
    title: r.fields["System.Title"],
    state: r.fields["System.State"],
    assignedTo: r.fields["System.AssignedTo"]?.displayName || null,
    iteration: r.fields["System.IterationPath"],
  }));
}

async function children(ctx, { id }) {
  const url = `${ctx.base}/${enc(ctx)}/_apis/wit/workitems/${id}?$expand=relations&api-version=7.1`;
  const r = await request(ctx, url);
  const childRels = (r.relations || []).filter((rel) => rel.rel === "System.LinkTypes.Hierarchy-Forward");
  if (childRels.length === 0) return [];

  const childIds = childRels.map((rel) => rel.url.split("/").pop());
  const batchUrl = `${ctx.base}/${enc(ctx)}/_apis/wit/workitems?ids=${childIds.join(",")}&fields=System.Id,System.Title,System.State,System.WorkItemType,System.AssignedTo&api-version=7.1`;
  const batch = await request(ctx, batchUrl);

  return batch.value.map((r) => ({
    id: r.id,
    type: r.fields["System.WorkItemType"],
    title: r.fields["System.Title"],
    state: r.fields["System.State"],
    assignedTo: r.fields["System.AssignedTo"]?.displayName || null,
  }));
}

// ─── Update ──────────────────────────────────────────────

async function update(ctx, { id, title, description, state, assignedTo, iterationPath, areaPath }) {
  const url = `${ctx.base}/${enc(ctx)}/_apis/wit/workitems/${id}?api-version=7.1`;
  const doc = [];
  if (title) doc.push({ op: "replace", path: "/fields/System.Title", value: title });
  if (description) doc.push({ op: "replace", path: "/fields/System.Description", value: description });
  if (state) doc.push({ op: "replace", path: "/fields/System.State", value: state });
  if (assignedTo) doc.push({ op: "replace", path: "/fields/System.AssignedTo", value: assignedTo });
  if (iterationPath) doc.push({ op: "replace", path: "/fields/System.IterationPath", value: iterationPath });
  if (areaPath) doc.push({ op: "replace", path: "/fields/System.AreaPath", value: areaPath });

  if (doc.length === 0) throw new Error("No fields to update");

  const r = await patchWorkItem(ctx, url, doc);
  return {
    id: r.id,
    title: r.fields["System.Title"],
    state: r.fields["System.State"],
    assignedTo: r.fields["System.AssignedTo"]?.displayName || null,
  };
}

async function close(ctx, { id }) {
  return await update(ctx, { id, state: "Closed" });
}

async function assign(ctx, { id, assignedTo }) {
  return await update(ctx, { id, assignedTo });
}

// ─── Comment ─────────────────────────────────────────────

async function addComment(ctx, { id, text }) {
  const url = `${ctx.base}/${enc(ctx)}/_apis/wit/workItems/${id}/comments?api-version=7.1-preview.4`;
  const data = await request(ctx, url, { method: "POST", body: { text } });
  return { id: data.id, workItemId: data.workItemId, text: data.text };
}

// ─── Delete ──────────────────────────────────────────────

async function remove(ctx, { id, destroy }) {
  const url = `${ctx.base}/${enc(ctx)}/_apis/wit/workitems/${id}?destroy=${!!destroy}&api-version=7.1`;
  await request(ctx, url, { method: "DELETE" });
  return { id, deleted: true, permanent: !!destroy };
}

// ─── Link ────────────────────────────────────────────────

async function linkCommit(ctx, { taskId, projectId, repoId, commitSha }) {
  const url = `${ctx.base}/${enc(ctx)}/_apis/wit/workitems/${taskId}?api-version=7.1`;
  const artifactUrl = `vstfs:///Git/Commit/${projectId}%2F${repoId}%2F${commitSha}`;
  const doc = [
    {
      op: "add",
      path: "/relations/-",
      value: {
        rel: "ArtifactLink",
        url: artifactUrl,
        attributes: { name: "Fixed in Commit" },
      },
    },
  ];
  const r = await patchWorkItem(ctx, url, doc);
  return { id: r.id, linked: true };
}

// ─── Composite: create-card ──────────────────────────────

async function createCard(ctx, { issueTitle, taskTitle, taskDescription, iterationPath, areaPath, commitInfo }) {
  const issue = await createIssue(ctx, { title: issueTitle, iterationPath, areaPath });
  const task = await createTask(ctx, {
    title: taskTitle,
    description: taskDescription,
    iterationPath,
    areaPath,
    parentId: issue.id,
  });
  const result = { issue, task };
  if (commitInfo) {
    const link = await linkCommit(ctx, {
      taskId: task.id,
      projectId: commitInfo.projectId,
      repoId: commitInfo.repoId,
      commitSha: commitInfo.commitSha,
    });
    result.commitLinked = link.linked;
  }
  return result;
}

module.exports = {
  createIssue, createTask, get, list, queryWiql, children,
  update, close, assign, addComment, remove, linkCommit, createCard,
};
