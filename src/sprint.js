const { request } = require("./api");

async function getCurrent(ctx) {
  const enc = encodeURIComponent(ctx.project);
  const url = `${ctx.base}/${enc}/_apis/work/teamsettings/iterations?api-version=7.1`;
  const data = await request(ctx, url);
  const current = data.value.find((i) => i.attributes.timeFrame === "current");
  if (!current) throw new Error("No current sprint found");
  return {
    id: current.id,
    name: current.name,
    path: current.path,
    startDate: current.attributes.startDate,
    finishDate: current.attributes.finishDate,
  };
}

async function list(ctx, { timeFrame } = {}) {
  const enc = encodeURIComponent(ctx.project);
  const url = `${ctx.base}/${enc}/_apis/work/teamsettings/iterations?api-version=7.1`;
  const data = await request(ctx, url);
  let items = data.value;
  if (timeFrame) items = items.filter((i) => i.attributes.timeFrame === timeFrame);
  return items.map((i) => ({
    id: i.id,
    name: i.name,
    path: i.path,
    timeFrame: i.attributes.timeFrame,
    startDate: i.attributes.startDate,
    finishDate: i.attributes.finishDate,
  }));
}

async function workitems(ctx, { iterationId } = {}) {
  let iterId = iterationId;
  if (!iterId) {
    const current = await getCurrent(ctx);
    iterId = current.id;
  }

  const enc = encodeURIComponent(ctx.project);
  const url = `${ctx.base}/${enc}/_apis/work/teamsettings/iterations/${iterId}/workitems?api-version=7.1`;
  const data = await request(ctx, url);

  if (!data.workItemRelations || data.workItemRelations.length === 0) return [];

  const ids = data.workItemRelations.filter((r) => r.target).map((r) => r.target.id);
  if (ids.length === 0) return [];

  const batchUrl = `${ctx.base}/${enc}/_apis/wit/workitems?ids=${ids.slice(0, 200).join(",")}&fields=System.Id,System.Title,System.State,System.WorkItemType,System.AssignedTo,System.IterationPath&api-version=7.1`;
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

module.exports = { getCurrent, list, workitems };
