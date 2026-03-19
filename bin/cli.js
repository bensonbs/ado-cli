#!/usr/bin/env node
const { program } = require("commander");
const sprint = require("../src/sprint");
const workitem = require("../src/workitem");
const repo = require("../src/repo");

// Helper: output JSON to stdout
const out = (data) => console.log(JSON.stringify(data, null, 2));

// Helper: wrap async action with error handling
const run = (fn) => async (...args) => {
  try {
    await fn(...args);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
};

// ─── Sprint ───────────────────────────────────────────────
const sprintCmd = program.command("sprint").description("Sprint operations");

sprintCmd
  .command("current")
  .description("Get the current sprint")
  .action(run(async () => out(await sprint.getCurrent())));

sprintCmd
  .command("list")
  .description("List sprints")
  .option("-t, --timeframe <frame>", "Filter: past, current, future")
  .action(run(async (opts) => out(await sprint.list({ timeFrame: opts.timeframe }))));

sprintCmd
  .command("workitems")
  .description("List work items in a sprint (defaults to current)")
  .option("--iteration-id <id>", "Sprint iteration ID (defaults to current sprint)")
  .action(run(async (opts) => out(await sprint.workitems({ iterationId: opts.iterationId }))));

// ─── Work Item ────────────────────────────────────────────
const wiCmd = program.command("workitem").alias("wi").description("Work item operations");

wiCmd
  .command("create-issue")
  .description("Create an Issue work item")
  .requiredOption("--title <title>", "Issue title (non-technical)")
  .option("--iteration <path>", "Iteration path")
  .option("--area <path>", "Area path")
  .action(run(async (opts) => {
    out(await workitem.createIssue({
      title: opts.title,
      iterationPath: opts.iteration,
      areaPath: opts.area,
    }));
  }));

wiCmd
  .command("create-task")
  .description("Create a Task work item")
  .requiredOption("--title <title>", "Task title (non-technical)")
  .option("--description <html>", "HTML description with technical details")
  .option("--iteration <path>", "Iteration path")
  .option("--area <path>", "Area path")
  .option("--parent <id>", "Parent work item ID")
  .action(run(async (opts) => {
    out(await workitem.createTask({
      title: opts.title,
      description: opts.description,
      iterationPath: opts.iteration,
      areaPath: opts.area,
      parentId: opts.parent ? Number(opts.parent) : undefined,
    }));
  }));

wiCmd
  .command("create-card")
  .description("Create Issue + Task + link commit in one step")
  .requiredOption("--issue-title <title>", "Issue title (non-technical)")
  .requiredOption("--task-title <title>", "Task title (non-technical)")
  .option("--task-description <html>", "HTML description with technical details")
  .option("--iteration <path>", "Iteration path")
  .option("--area <path>", "Area path")
  .option("--project-id <id>", "Azure DevOps project GUID (for commit link)")
  .option("--repo-id <id>", "Azure DevOps repo GUID (for commit link)")
  .option("--commit <sha>", "Git commit SHA (for commit link)")
  .action(run(async (opts) => {
    let commitInfo;
    if (opts.projectId && opts.repoId && opts.commit) {
      commitInfo = { projectId: opts.projectId, repoId: opts.repoId, commitSha: opts.commit };
    }
    out(await workitem.createCard({
      issueTitle: opts.issueTitle,
      taskTitle: opts.taskTitle,
      taskDescription: opts.taskDescription,
      iterationPath: opts.iteration,
      areaPath: opts.area,
      commitInfo,
    }));
  }));

wiCmd
  .command("get <id>")
  .description("Get a work item by ID")
  .action(run(async (id) => out(await workitem.get({ id: Number(id) }))));

wiCmd
  .command("list")
  .description("List work items with filters")
  .option("--iteration <path>", "Filter by iteration path")
  .option("--state <state>", "Filter by state: New, Active, Closed")
  .option("--type <type>", "Filter by type: Issue, Task")
  .option("--assigned-to <name>", "Filter by assigned person")
  .action(run(async (opts) => {
    out(await workitem.list({
      iterationPath: opts.iteration,
      state: opts.state,
      type: opts.type,
      assignedTo: opts.assignedTo,
    }));
  }));

wiCmd
  .command("query <wiql>")
  .description("Run a WIQL query")
  .action(run(async (wiql) => out(await workitem.queryWiql(wiql))));

wiCmd
  .command("children <id>")
  .description("List child work items of a parent")
  .action(run(async (id) => out(await workitem.children({ id: Number(id) }))));

wiCmd
  .command("update <id>")
  .description("Update a work item")
  .option("--title <title>", "New title")
  .option("--description <html>", "New description (HTML)")
  .option("--state <state>", "New state: New, Active, Closed")
  .option("--assigned-to <name>", "Assign to person")
  .option("--iteration <path>", "Iteration path")
  .option("--area <path>", "Area path")
  .action(run(async (id, opts) => {
    out(await workitem.update({
      id: Number(id),
      title: opts.title,
      description: opts.description,
      state: opts.state,
      assignedTo: opts.assignedTo,
      iterationPath: opts.iteration,
      areaPath: opts.area,
    }));
  }));

wiCmd
  .command("close <id>")
  .description("Close a work item")
  .action(run(async (id) => out(await workitem.close({ id: Number(id) }))));

wiCmd
  .command("assign <id>")
  .description("Assign a work item to someone")
  .requiredOption("--to <name>", "Person to assign to")
  .action(run(async (id, opts) => out(await workitem.assign({ id: Number(id), assignedTo: opts.to }))));

wiCmd
  .command("comment <id>")
  .description("Add a comment to a work item")
  .requiredOption("--text <text>", "Comment text (HTML supported)")
  .action(run(async (id, opts) => out(await workitem.addComment({ id: Number(id), text: opts.text }))));

wiCmd
  .command("delete <id>")
  .description("Delete a work item (moves to recycle bin)")
  .option("--destroy", "Permanently delete (cannot be recovered)")
  .action(run(async (id, opts) => out(await workitem.remove({ id: Number(id), destroy: opts.destroy }))));

wiCmd
  .command("link-commit")
  .description("Link a commit to a Task work item")
  .requiredOption("--task-id <id>", "Task work item ID")
  .requiredOption("--project-id <id>", "Azure DevOps project GUID")
  .requiredOption("--repo-id <id>", "Azure DevOps repo GUID")
  .requiredOption("--commit <sha>", "Git commit SHA")
  .action(run(async (opts) => {
    out(await workitem.linkCommit({
      taskId: Number(opts.taskId),
      projectId: opts.projectId,
      repoId: opts.repoId,
      commitSha: opts.commit,
    }));
  }));

// ─── Repo ─────────────────────────────────────────────────
const repoCmd = program.command("repo").description("Git repo operations");

repoCmd
  .command("info")
  .description("Get repo projectId and repoId from Azure DevOps")
  .option("--project <name>", "Azure DevOps project name")
  .option("--repo <name>", "Repository name")
  .option("--remote-url <url>", "Auto-parse from git remote URL")
  .action(run(async (opts) => {
    let project = opts.project;
    let repoName = opts.repo;

    if (opts.remoteUrl) {
      const parsed = repo.parseRemoteUrl(opts.remoteUrl);
      project = parsed.project;
      repoName = parsed.repoName;
    }

    if (!project || !repoName) {
      console.error("Provide --project and --repo, or --remote-url");
      process.exit(1);
    }

    out(await repo.getRepoInfo(project, repoName));
  }));

program.parse();
