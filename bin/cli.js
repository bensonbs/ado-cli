#!/usr/bin/env node
const { program } = require("commander");
const sprint = require("../src/sprint");
const workitem = require("../src/workitem");
const repo = require("../src/repo");

// Helper: output JSON to stdout
const out = (data) => console.log(JSON.stringify(data, null, 2));

// ─── Sprint ───────────────────────────────────────────────
const sprintCmd = program.command("sprint").description("Sprint operations");

sprintCmd
  .command("current")
  .description("Get the current sprint")
  .action(async () => {
    try {
      out(await sprint.getCurrent());
    } catch (e) {
      console.error(e.message);
      process.exit(1);
    }
  });

sprintCmd
  .command("list")
  .description("List sprints")
  .option("-t, --timeframe <frame>", "Filter by timeFrame: past, current, future")
  .action(async (opts) => {
    try {
      out(await sprint.list({ timeFrame: opts.timeframe }));
    } catch (e) {
      console.error(e.message);
      process.exit(1);
    }
  });

// ─── Work Item ────────────────────────────────────────────
const wiCmd = program.command("workitem").alias("wi").description("Work item operations");

wiCmd
  .command("create-issue")
  .description("Create an Issue work item")
  .requiredOption("--title <title>", "Issue title (non-technical)")
  .option("--iteration <path>", "Iteration path")
  .option("--area <path>", "Area path")
  .action(async (opts) => {
    try {
      out(await workitem.createIssue({
        title: opts.title,
        iterationPath: opts.iteration,
        areaPath: opts.area,
      }));
    } catch (e) {
      console.error(e.message);
      process.exit(1);
    }
  });

wiCmd
  .command("create-task")
  .description("Create a Task work item")
  .requiredOption("--title <title>", "Task title (non-technical)")
  .option("--description <html>", "HTML description with technical details")
  .option("--iteration <path>", "Iteration path")
  .option("--area <path>", "Area path")
  .option("--parent <id>", "Parent work item ID")
  .action(async (opts) => {
    try {
      out(await workitem.createTask({
        title: opts.title,
        description: opts.description,
        iterationPath: opts.iteration,
        areaPath: opts.area,
        parentId: opts.parent ? Number(opts.parent) : undefined,
      }));
    } catch (e) {
      console.error(e.message);
      process.exit(1);
    }
  });

wiCmd
  .command("link-commit")
  .description("Link a commit to a Task work item")
  .requiredOption("--task-id <id>", "Task work item ID")
  .requiredOption("--project-id <id>", "Azure DevOps project GUID")
  .requiredOption("--repo-id <id>", "Azure DevOps repo GUID")
  .requiredOption("--commit <sha>", "Git commit SHA")
  .action(async (opts) => {
    try {
      out(await workitem.linkCommit({
        taskId: Number(opts.taskId),
        projectId: opts.projectId,
        repoId: opts.repoId,
        commitSha: opts.commit,
      }));
    } catch (e) {
      console.error(e.message);
      process.exit(1);
    }
  });

wiCmd
  .command("get <id>")
  .description("Get a work item by ID")
  .action(async (id) => {
    try {
      out(await workitem.get({ id: Number(id) }));
    } catch (e) {
      console.error(e.message);
      process.exit(1);
    }
  });

// ─── Repo ─────────────────────────────────────────────────
const repoCmd = program.command("repo").description("Git repo operations");

repoCmd
  .command("info")
  .description("Get repo projectId and repoId from Azure DevOps")
  .option("--project <name>", "Azure DevOps project name")
  .option("--repo <name>", "Repository name")
  .option("--remote-url <url>", "Auto-parse from git remote URL")
  .action(async (opts) => {
    try {
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
    } catch (e) {
      console.error(e.message);
      process.exit(1);
    }
  });

program.parse();
