const crypto = require("node:crypto");
const fs = require("node:fs");
const Module = require("node:module");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const buildHash = crypto.createHash("sha1").update(projectRoot).digest("hex").slice(0, 10);
const buildRoot = path.join(os.tmpdir(), "stlcflow-workflow-playwright", buildHash);
const configPath = path.join(projectRoot, "tsconfig.json");

function formatDiagnostics(diagnostics) {
  const host = {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => projectRoot,
    getNewLine: () => os.EOL
  };

  return ts.formatDiagnosticsWithColorAndContext(diagnostics, host);
}

function exitWithDiagnostics(diagnostics) {
  console.error(formatDiagnostics(diagnostics));
  process.exit(1);
}

const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
if (configFile.error) {
  exitWithDiagnostics([configFile.error]);
}

fs.rmSync(buildRoot, { recursive: true, force: true });
fs.mkdirSync(buildRoot, { recursive: true });

const parsedConfig = ts.parseJsonConfigFileContent(
  configFile.config,
  ts.sys,
  projectRoot,
  {
    noEmit: false,
    outDir: buildRoot
  },
  configPath
);

if (parsedConfig.errors.length > 0) {
  exitWithDiagnostics(parsedConfig.errors);
}

const program = ts.createProgram({
  rootNames: parsedConfig.fileNames,
  options: parsedConfig.options
});
const preEmitDiagnostics = ts.getPreEmitDiagnostics(program);
const emitResult = program.emit();
const diagnostics = preEmitDiagnostics.concat(emitResult.diagnostics);
const errors = diagnostics.filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);

if (errors.length > 0 || emitResult.emitSkipped) {
  exitWithDiagnostics(diagnostics);
}

const workflowCliPath = path.join(buildRoot, "src", "workflow-playwright-cli.js");
const workflowArgs = process.argv.slice(2);

process.env.NODE_PATH = [
  path.join(projectRoot, "node_modules"),
  process.env.NODE_PATH || ""
].filter(Boolean).join(path.delimiter);
Module._initPaths();
process.argv = [process.execPath, workflowCliPath, ...workflowArgs];
require(workflowCliPath);
