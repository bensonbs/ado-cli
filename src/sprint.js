const { request, BASE, PROJECT } = require("./api");

async function getCurrent() {
  const enc = encodeURIComponent(PROJECT);
  const url = `${BASE}/${enc}/_apis/work/teamsettings/iterations?api-version=7.1`;
  const data = await request(url);
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

async function list({ timeFrame } = {}) {
  const enc = encodeURIComponent(PROJECT);
  const url = `${BASE}/${enc}/_apis/work/teamsettings/iterations?api-version=7.1`;
  const data = await request(url);
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

module.exports = { getCurrent, list };
