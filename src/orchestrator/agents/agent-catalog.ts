import type { FlowAgentKey } from "../types";
import type { FlowAgentDefinition } from "./types";

export const flowAgents: FlowAgentDefinition[] = [
  {
    key: "story",
    name: "Story Agent",
    responsibility:
      "Analyze the ADO story, generate reviewed manual testcase workbooks, and upload approved cases into the target suite.",
    ownsStages: ["analyzeStory", "generateWorkbook", "uploadToAdo"],
    primaryArtifacts: [
      "story-summary.json",
      "coverage-plan.json",
      "workbook-generation-plan.json",
      "ado-upload-plan.json",
      "upload-summary.json"
    ],
    operatingPrinciples: [
      "Use the current ADO story and reviewed workbook as the highest-priority sources of truth.",
      "For every new story, analyze Match Help knowledge, reference roots, regression corpus, smoke roots, latest-release patterns, and TDL references before workbook generation.",
      "Use reference suites only for coverage ideas, domain patterns, and writing style.",
      "Generate fresh manual testcases in the referenced VSTS Excel template using the user's observed writing style.",
      "Preserve user edits during the review gate and never regenerate silently after approval.",
      "Prevent duplicate ADO testcase creation unless the run explicitly requests a forced upload."
    ],
    qualityGates: [
      "Story summary must include title, description, acceptance criteria, domain, and selected reference suites.",
      "Coverage planning must identify relevant Match Help functionality files and reference-suite patterns for the story area.",
      "Workbook cases must be fresh, concrete, verifiable, and traceable to the current story.",
      "Workbook output must preserve the referenced template structure and stop for user review before upload.",
      "Upload must resolve the approved workbook and produce a testcase ID map before automation starts.",
      "Partial title matches in the target suite must block upload instead of creating a mixed duplicate set."
    ],
    handoffRules: [
      "Hand off story-summary.json and coverage-plan.json to workbook generation.",
      "Hand off upload-summary.json with testcase IDs to the Framework and Maintenance agents.",
      "Record blocked reasons and next actions instead of proceeding from missing inputs."
    ]
  },
  {
    key: "scenarioExploration",
    name: "Scenario Exploration Agent",
    responsibility:
      "Plan browser-led UI discovery, navigation evidence collection, and Playwright-first exploratory support.",
    ownsStages: ["collectEvidence"],
    primaryArtifacts: ["ui-evidence-plan.json"],
    operatingPrinciples: [
      "Use Playwright as the primary browser evidence layer.",
      "Use Chrome DevTools only as a secondary debugging and inspection layer.",
      "Use Match Help and story context to identify likely screens, dashboards, menus, dialogs, grids, and workflows.",
      "Plan evidence around business-readable BDD flows, not selector-level implementation details.",
      "Keep live UI evidence optional when no navigation path is available.",
      "Record navigation uncertainty instead of inventing labels or paths."
    ],
    qualityGates: [
      "Evidence plans must state whether the flow is requirement-first or ready for UI inspection.",
      "Navigation evidence must be tied to the current work item, suite, and plan.",
      "Unconfirmed UI wording must remain generic until verified in the browser."
    ],
    handoffRules: [
      "Hand off ui-evidence-plan.json to Locator and Framework agents.",
      "Do not block requirement-first generation only because live navigation is absent.",
      "Escalate unresolved navigation paths before execution if automation cannot infer them safely."
    ]
  },
  {
    key: "locator",
    name: "Locator Agent",
    responsibility:
      "Define stable selector strategy, locator ranking, fallback policy, and locator evidence outputs for generated automation.",
    ownsStages: ["generateAutomation"],
    primaryArtifacts: ["locator-generation-plan.json"],
    operatingPrinciples: [
      "Prefer user-facing Playwright locators before structural CSS selectors.",
      "Scope locators to pages, dialogs, grids, rows, or regions before matching text.",
      "Use Match Help screen names and approved manual steps to plan locator boundaries for page objects.",
      "Centralize reusable selectors in page objects or locator modules.",
      "Keep locators out of step definitions and scenario files.",
      "Treat locator uncertainty as evidence to record, not as a reason to create brittle selectors."
    ],
    qualityGates: [
      "Generated automation must avoid absolute XPath selectors.",
      "New automation must use Playwright recommended locators first: getByRole, getByLabel, getByText, getByPlaceholder, or getByTestId.",
      "Each selector strategy must include fallbacks for accessible names, labels, stable attributes, and scoped text.",
      "Story-specific locator additions must live in the appropriate page object or locator helper."
    ],
    handoffRules: [
      "Hand off locator-generation-plan.json to the Framework Agent.",
      "Framework code must consume locators through page objects or shared helpers.",
      "Unsupported locator needs must block execution until page-object support exists."
    ]
  },
  {
    key: "framework",
    name: "Framework Agent",
    responsibility:
      "Generate BDD features, scenario data, traceability metadata, page-object integration, and reusable framework actions.",
    ownsStages: ["generateAutomation"],
    primaryArtifacts: [
      "automation-generation-plan.json",
      "story-automation-manifest.json",
      "story-automation-traceability-index.json"
    ],
    operatingPrinciples: [
      "Generate automation only from the approved workbook and current ADO testcase map.",
      "Keep shared framework behavior reusable and story-specific behavior isolated.",
      "Keep generated feature files, step definitions, page classes, data, manifests, traceability, and reports separated by the story folder name.",
      "Use BDD feature files for business-readable scenarios and page objects for browser details.",
      "Follow the framework flow: Feature file -> Step definition -> Page object -> Playwright action.",
      "Keep step definitions thin, typed, and free of direct locators or hard waits.",
      "Avoid networkidle readiness checks; use visible UI assertions and condition-based waits.",
      "Do not execute unsupported fallback steps as if they are finished automation."
    ],
    qualityGates: [
      "Every scenario must have testcase ID, story, suite, and plan traceability.",
      "Generated code must include feature, scenario data, manifest, and traceability artifacts.",
      "Story-specific step definitions, page classes, and report outputs must resolve to the current story folder.",
      "Step definitions must only call page objects, fixtures, or shared runner utilities; no locator construction is allowed in step files.",
      "Generated scenarios must use separated test data and environment-based runtime configuration.",
      "Unsupported parser or page-object actions must block automation generation.",
      "Generated artifacts must be cleaned for the current story before replacing them."
    ],
    handoffRules: [
      "Consume locator-generation-plan.json from the Locator Agent.",
      "Hand off story-automation-manifest.json and traceability index to Maintenance.",
      "Persist generated automation under tests/bdd and tests/data, not only under run artifacts."
    ]
  },
  {
    key: "maintenance",
    name: "Maintenance Agent",
    responsibility:
      "Execute the current uploaded cases, classify failures, preserve artifacts, and prepare self-healing/refactoring guidance.",
    ownsStages: ["executeTests", "publishReport"],
    primaryArtifacts: [
      "maintenance-plan.json",
      "execution-plan.json",
      "execution-summary.json",
      "reporting-plan.json"
    ],
    operatingPrinciples: [
      "Execute only the current uploaded ADO testcase set for the active story, suite, and plan.",
      "Publish only real Playwright outcomes and never assumption-based pass results.",
      "Run each scenario in an isolated browser context and avoid dependencies on scenario order.",
      "Classify failures before changing framework or generated code.",
      "Preserve run-specific evidence, screenshots, traces, logs, Allure output, and failure classification in the current story folder."
    ],
    qualityGates: [
      "Execution requires an approved workbook and story automation manifest.",
      "Manifest, upload summary, and target suite titles must agree before execution.",
      "Failure evidence must include screenshots, trace/video/log links when available, and testcase traceability.",
      "Unsupported workflow state must be blocked or failed with a reason, not skipped silently.",
      "Report publication requires a run-specific Allure index.html."
    ],
    handoffRules: [
      "Consume the Framework Agent manifest and traceability index.",
      "Write execution-summary.json and ado-result-publication.json for the current run.",
      "Keep failure artifacts tied to testcase ID, suite ID, plan ID, and failed step."
    ]
  }
];

export function getFlowAgentDefinition(key: FlowAgentKey): FlowAgentDefinition {
  const agent = flowAgents.find((candidate) => candidate.key === key);
  if (!agent) {
    throw new Error(`Unknown STLCFlow agent: ${key}`);
  }

  return agent;
}

export function getFlowAgentBestPractices(
  key: FlowAgentKey
): Pick<FlowAgentDefinition, "operatingPrinciples" | "qualityGates" | "handoffRules"> {
  const agent = getFlowAgentDefinition(key);
  return {
    operatingPrinciples: agent.operatingPrinciples,
    qualityGates: agent.qualityGates,
    handoffRules: agent.handoffRules
  };
}
