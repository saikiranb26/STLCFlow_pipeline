const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

function readFlag(name, fallback) {
  const prefix = `${name}=`;
  const direct = process.argv.find((item) => item.startsWith(prefix));
  if (direct) {
    return direct.slice(prefix.length);
  }

  const index = process.argv.findIndex((item) => item === name);
  if (index >= 0 && index < process.argv.length - 1) {
    return process.argv[index + 1];
  }

  return fallback;
}

function buildRunArtifactId() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

const projectRoot = process.cwd();
const resultsRoot = path.resolve(projectRoot, readFlag("--results", "artifacts/allure-results"));
const explicitOutput = readFlag("--output", "");
const reportRoot = explicitOutput
  ? path.resolve(projectRoot, explicitOutput)
  : path.join(projectRoot, "artifacts", "allure-reports", "manual", buildRunArtifactId(), "allure-report");

if (!fs.existsSync(resultsRoot)) {
  throw new Error(`Allure results directory was not found: ${resultsRoot}`);
}

if (fs.existsSync(reportRoot)) {
  fs.rmSync(reportRoot, { recursive: true, force: true });
}

const allureCli = path.join(projectRoot, "node_modules", "allure", "cli.js");
const result = spawnSync(
  process.execPath,
  [allureCli, "generate", resultsRoot, "--output", reportRoot],
  {
    cwd: projectRoot,
    stdio: "inherit",
    shell: false,
    windowsHide: true
  }
);

if (result.error) {
  throw result.error;
}

if ((result.status || 0) === 0) {
  const latestReportPath = path.join(projectRoot, "artifacts", "latest-allure-report.json");
  const latestPayload = {
    generatedAt: new Date().toISOString(),
    source: "manual",
    allureResultsDir: resultsRoot,
    allureReportDir: reportRoot,
    indexHtmlPath: path.join(reportRoot, "index.html"),
    serveCommand: `npm run automation:report:serve -- --root="${reportRoot}"`
  };
  fs.mkdirSync(path.dirname(latestReportPath), { recursive: true });
  fs.writeFileSync(latestReportPath, `${JSON.stringify(latestPayload, null, 2)}\n`, "utf8");
  console.log(`Allure HTML report generated at: ${path.join(reportRoot, "index.html")}`);
  console.log(`Serve with: ${latestPayload.serveCommand}`);
}

process.exitCode = result.status || 0;
