const { request, patchWorkItem, BASE, PROJECT } = require("./api");

const ENC_PROJECT = encodeURIComponent(PROJECT);

// ─── Create ──────────────────────────────────────────────

async function createIssue({ title, iterationPath, areaPath }) {
  const url = `${BASE}/${ENC_PROJECT}/_apis/wit/workitems/$Issue?api-version=7.1`;
  const doc = [
    { op: "add", path: "/fields/System.Title", value: title },
    { op: "add", path: "/fields/System.IterationPath", value: iterationPath || PROJECT },
    { op: "add", path: "/fields/System.AreaPath", value: areaPath || PROJECT },
  ];
  const result = await patchWorkItem(url, doc);
  return { id: result.id, url: result._links?.html?.href || result.url, title: result.fields["System.Title"] };
}

async function createTask({ title, description, iterationPath, areaPath, parentId }) {
  const url = `${BASE}/${ENC_PROJECT}/_apis/wit/workitems/$Task?api-version=7.1`;
  const doc = [
    { op: "add", path: "/fields/System.Title", value: title },
    { op: "add", path: "/fields/System.IterationPath", value: iterationPath || PROJECT },
    { op: "add", path: "/fields/System.AreaPath", value: areaPath || PROJECT },
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
        url: `${BASE}/${ENC_PROJECT}/_apis/wit/workItems/${parentId}`,
        attributes: { comment: "Parent link" },
      },
    });
  }
  const result = await patchWorkItem(url, doc);
  return { id: result.id, url: result._links?.html?.href || result.url, title: result.fields["System.Title"] };
}

// ─── Read ────────────────────────────────────────────────

async function get({ id }) {
  const url = `${BASE}/${ENC_PROJECT}/_apis/wit/workitems/${id}?$expand=relations&api-version=7.1`;
  const r = await request(url);
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

async function list({ iterationPath, state, type, assignedTo }) {
  const conditions = [`[System.TeamProject] = '${PROJECT}'`];
  if (iterationPath) conditions.push(`[System.IterationPath] = '${iterationPath}'`);
  if (state) conditions.push(`[System.State] = '${state}'`);
  if (type) conditions.push(`[System.WorkItemType] = '${type}'`);
  if (assignedTo) conditions.push(`[System.AssignedTo] = '${assignedTo}'`);

  const wiql = `SELECT [System.Id] FROM WorkItems WHERE ${conditions.join(" AND ")} ORDER BY [System.Id] DESC`;
  return await queryWiql(wiql);
}

async function queryWiql(wiql) {
  const url = `${BASE}/${ENC_PROJECT}/_apis/wit/wiql?api-version=7.1`;
  const data = await request(url, { method: "POST", body: { query: wiql } });

  if (!data.workItems || data.workItems.length === 0) return [];

  const ids = data.workItems.map((w) => w.id).slice(0, 200);
  const batchUrl = `${BASE}/${ENC_PROJECT}/_apis/wit/workitems?ids=${ids.join(",")}&fields=System.Id,System.Title,System.State,System.WorkItemType,System.AssignedTo,System.IterationPath&api-version=7.1`;
  const batch = await request(batchUrl);

  return batch.value.map((r) => ({
    id: r.id,
    type: r.fields["System.WorkItemType"],
    title: r.fields["System.Title"],
    state: r.fields["System.State"],
    assignedTo: r.fields["System.AssignedTo"]?.displayName || null,
    iteration: r.fields["System.IterationPath"],
  }));
}

async function children({ id }) {
  const url = `${BASE}/${ENC_PROJECT}/_apis/wit/workitems/${id}?$expand=relations&api-version=7.1`;
  const r = await request(url);
  const childRels = (r.relations || []).filter((rel) => rel.rel === "System.LinkTypes.Hierarchy-Forward");
  if (childRels.length === 0) return [];

  const childIds = childRels.map((rel) => {
    const parts = rel.url.split("/");
    return parts[parts.length - 1];
  });

  const batchUrl = `${BASE}/${ENC_PROJECT}/_apis/wit/workitems?ids=${childIds.join(",")}&fields=System.Id,System.Title,System.State,System.WorkItemType,System.AssignedTo&api-version=7.1`;
  const batch = await request(batchUrl);

  return batch.value.map((r) => ({
    id: r.id,
    type: r.fields["System.WorkItemType"],
    title: r.fields["System.Title"],
    state: r.fields["System.State"],
    assignedTo: r.fields["System.AssignedTo"]?.displayName || null,
  }));
}

// ─── Update ──────────────────────────────────────────────

async function update({ id, title, description, state, assignedTo, iterationPath, areaPath }) {
  const url = `${BASE}/${ENC_PROJECT}/_apis/wit/workitems/${id}?api-version=7.1`;
  const doc = [];
  if (title) doc.push({ op: "replace", path: "/fields/System.Title", value: title });
  if (description) doc.push({ op: "replace", path: "/fields/System.Description", value: description });
  if (state) doc.push({ op: "replace", path: "/fields/System.State", value: state });
  if (assignedTo) doc.push({ op: "replace", path: "/fields/System.AssignedTo", value: assignedTo });
  if (iterationPath) doc.push({ op: "replace", path: "/fields/System.IterationPath", value: iterationPath });
  if (areaPath) doc.push({ op: "replace", path: "/fields/System.AreaPath", value: areaPath });

  if (doc.length === 0) throw new Error("No fields to update");

  const result = await patchWorkItem(url, doc);
  return {
    id: result.id,
    title: result.fields["System.Title"],
    state: result.fields["System.State"],
    assignedTo: result.fields["System.AssignedTo"]?.displayName || null,
  };
}

async function close({ id }) {
  return await update({ id, state: "Closed" });
}

async function assign({ id, assignedTo }) {
  return await update({ id, assignedTo });
}

// ─── Comment ─────────────────────────────────────────────

async function addComment({ id, text }) {
  const url = `${BASE}/${ENC_PROJECT}/_apis/wit/workItems/${id}/comments?api-version=7.1-preview.4`;
  const data = await request(url, { method: "POST", body: { text } });
  return { id: data.id, workItemId: data.workItemId, text: data.text };
}

// ─── Delete ──────────────────────────────────────────────

async function remove({ id, destroy }) {
  const url = `${BASE}/${ENC_PROJECT}/_apis/wit/workitems/${id}?destroy=${!!destroy}&api-version=7.1`;
  await request(url, { method: "DELETE" });
  return { id, deleted: true, permanent: !!destroy };
}

// ─── Link ────────────────────────────────────────────────

async function linkCommit({ taskId, projectId, repoId, commitSha }) {
  const url = `${BASE}/${ENC_PROJECT}/_apis/wit/workitems/${taskId}?api-version=7.1`;
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
  const result = await patchWorkItem(url, doc);
  return { id: result.id, linked: true };
}

// ─── Composite: create-card ──────────────────────────────

async function createCard({ issueTitle, taskTitle, taskDescription, iterationPath, areaPath, commitInfo }) {
  // 1. Create Issue
  const issue = await createIssue({ title: issueTitle, iterationPath, areaPath });

  // 2. Create Task linked to Issue
  const task = await createTask({
    title: taskTitle,
    description: taskDescription,
    iterationPath,
    areaPath,
    parentId: issue.id,
  });

  const result = { issue, task };

  // 3. Link commit if provided
  if (commitInfo) {
    const link = await linkCommit({
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
