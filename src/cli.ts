import path from "node:path";
import { createFlowContext, loadStoryRunInput } from "./orchestrator/context";
import { runPipeline } from "./orchestrator/pipeline";

function readArgValue(flag: string, argv: string[]): string | undefined {
  const index = argv.findIndex((arg) => arg === flag);
  if (index === -1 || index === argv.length - 1) {
    return undefined;
  }

  return argv[index + 1];
}

function printUsage(): void {
  console.log("Usage:");
  console.log("  npm run dev -- --input config/story-run.example.json");
  console.log("");
  console.log("Flags:");
  console.log("  --input <path>   Path to the story run input JSON");
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);

  if (argv.includes("--help") || argv.includes("-h")) {
    printUsage();
    return;
  }

  const inputArg = readArgValue("--input", argv);
  if (!inputArg) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const projectRoot = process.cwd();
  const inputPath = path.resolve(projectRoot, inputArg);
  const storyRunInput = loadStoryRunInput(inputPath);
  const context = createFlowContext(projectRoot, storyRunInput);
  const summary = await runPipeline(context);

  console.log("");
  console.log("Pipeline finished.");
  console.log(`Story: ${summary.input.workItemId}`);
  console.log(`Status: ${summary.overallStatus}`);
  console.log(`State file: ${summary.stateFilePath}`);

  if (summary.blockedStage) {
    const agentLabel = summary.blockedStage.agentKey ? ` [${summary.blockedStage.agentKey}]` : "";
    console.log(`Blocked at: ${summary.blockedStage.key}${agentLabel}`);
    if (summary.blockedStage.nextAction) {
      console.log(`Next action: ${summary.blockedStage.nextAction}`);
    }
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
