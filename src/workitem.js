const { patchWorkItem, BASE, PROJECT } = require("./api");

const ENC_PROJECT = encodeURIComponent(PROJECT);

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

async function get({ id }) {
  const { request } = require("./api");
  const url = `${BASE}/${ENC_PROJECT}/_apis/wit/workitems/${id}?api-version=7.1`;
  const result = await request(url);
  return {
    id: result.id,
    type: result.fields["System.WorkItemType"],
    title: result.fields["System.Title"],
    state: result.fields["System.State"],
    url: result._links?.html?.href || result.url,
  };
}

module.exports = { createIssue, createTask, linkCommit, get };
