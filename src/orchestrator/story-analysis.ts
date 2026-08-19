import { loadReferenceRoots, loadReferenceSuiteCorpus } from "./knowledge";
import type { FlowContext } from "./types";

export type StoryDomain = "Match" | "Match Latest Release" | "TDL";
export type StoryFeatureArea =
  | "Recurring Tasks"
  | "Legacy Reports"
  | "Batch Import Definition"
  | "General Match"
  | "TDL";

export interface SelectedReferenceSuite {
  planId: number;
  suiteId: number;
  name: string;
  root: string;
  domain: string;
  knowledgeRole: string;
  observedPatterns: string[];
  sampleCaseTitles: string[];
  priority: number;
  whySelected: string;
}

interface StoryAnalysisBundle {
  domain: StoryDomain;
  featureArea: StoryFeatureArea;
  referenceRootsSummary: Array<{
    planId: number;
    suiteId: number | null;
    label: string;
    domain: string;
  }>;
  selectedReferenceSuites: SelectedReferenceSuite[];
  coverageFamilies: string[];
  openQuestionPrompts: string[];
  liveEvidenceMode: "requirement-first" | "playwright-eligible";
}

const TDL_PRIORITY_SUITE_IDS = new Set([149279, 149237, 149295, 149338, 182507]);
const MATCH_PRIORITY_SUITE_IDS = new Set([176767, 182496, 122313, 122299]);
const LATEST_RELEASE_PRIORITY_SUITE_IDS = new Set([
  195757,
  197407,
  200016,
  202457,
  200760,
  200550,
  203554,
  203846,
  203942
]);

const LEGACY_REPORT_REFERENCE_SUITES: SelectedReferenceSuite[] = [
  {
    planId: 191930,
    suiteId: 195328,
    name: "154236 : Legacy Reports - Remove ID Fields...",
    root: "191930",
    domain: "Match Latest Release",
    knowledgeRole: "latest release legacy reports reference",
    observedPatterns: [
      "legacy reports list behavior",
      "back to list behavior",
      "list-state regression coverage"
    ],
    sampleCaseTitles: [
      "Legacy Reports list behavior",
      "Back to list behavior"
    ],
    priority: 0,
    whySelected: ""
  },
  {
    planId: 6357,
    suiteId: 122328,
    name: "Legacy Reports",
    root: "6357/70798/122298",
    domain: "Match",
    knowledgeRole: "legacy reports automation-oriented module reference",
    observedPatterns: [
      "legacy reports list coverage",
      "detail to list navigation behavior",
      "pagination and list-state behavior"
    ],
    sampleCaseTitles: [
      "Legacy Reports list behavior",
      "Return to list behavior"
    ],
    priority: 0,
    whySelected: ""
  },
  {
    planId: 6357,
    suiteId: 161601,
    name: "Legacy Reports",
    root: "6357/70798/164203",
    domain: "Match",
    knowledgeRole: "legacy reports manual-writing reference",
    observedPatterns: [
      "legacy reports list-detail flow",
      "permissions and retention behavior",
      "date filter and list behavior"
    ],
    sampleCaseTitles: [
      "Legacy Reports list behavior",
      "Back to list behavior"
    ],
    priority: 0,
    whySelected: ""
  }
];

function inferDomain(context: FlowContext): StoryDomain {
  if (TDL_PRIORITY_SUITE_IDS.has(context.input.suiteId)) {
    return "TDL";
  }

  if (context.input.testPlanId === 191930 || LATEST_RELEASE_PRIORITY_SUITE_IDS.has(context.input.suiteId)) {
    return "Match Latest Release";
  }

  return "Match";
}

function inferFeatureArea(storyHints?: { title?: string; description?: string; acceptanceCriteria?: string }): StoryFeatureArea {
  const text = `${storyHints?.title || ""} ${storyHints?.description || ""} ${storyHints?.acceptanceCriteria || ""}`.toLowerCase();

  if (/legacy report/.test(text)) {
    return "Legacy Reports";
  }

  if (/recurring task|scheduler|task parameter|save run now|child task/.test(text)) {
    return "Recurring Tasks";
  }

  if (/batch import definition/.test(text)) {
    return "Batch Import Definition";
  }

  return "General Match";
}

function getCoverageFamilies(domain: StoryDomain, featureArea: StoryFeatureArea): string[] {
  if (featureArea === "Legacy Reports") {
    return [
      "legacy reports list landing behavior",
      "page number retention after returning with Back to list",
      "page size retention after returning with Back to list",
      "combined page number and page size retention",
      "list-to-detail-to-list consistency",
      "unexpected pagination reset regression coverage"
    ];
  }

  switch (domain) {
    case "TDL":
      return [
        "entry and navigation behavior",
        "task history list-view and filters",
        "task actions and restrictions",
        "task detail and task result viewing",
        "completion status and task-type coverage",
        "permissions and readonly behavior",
        "negative and edge conditions"
      ];
    case "Match Latest Release":
      return [
        "create-new-task modal and task-type availability",
        "task parameter list-view coverage",
        "required fields and conditional validations",
        "save, save run now, cancel, and child-task behavior",
        "results, rerun, and post-completion behavior",
        "sector security and view-only restrictions",
        "regression around task-type visibility and recurrence behavior"
      ];
    default:
      return [
        "entry and navigation behavior",
        "list-view, grid, or dashboard coverage",
        "required fields and validation rules",
        "save, edit, delete, duplicate, and cancel behavior",
        "permissions, security, and readonly restrictions",
        "result, audit, or downstream behavior",
        "negative, regression, and edge coverage"
      ];
  }
}

function getOpenQuestionPrompts(domain: StoryDomain, featureArea: StoryFeatureArea): string[] {
  if (featureArea === "Legacy Reports") {
    return [
      "Does this story apply only to Legacy Reports list or to other report lists also?",
      "Is state retention required only for Back to list or also browser back navigation?",
      "Should sort, filter, or search state also be retained, or only page number and page size?",
      "Are there report-specific data preconditions before opening detail?",
      "Does the behavior apply to all users or depend on report permissions?"
    ];
  }

  const common = [
    "What exact user-visible behavior is changing?",
    "What is the expected success outcome?",
    "What validation or error behavior matters for this story?",
    "Are there data, sector, or security constraints that affect coverage?",
    "Are there attachments, sample files, or linked bugs that narrow the scope?"
  ];

  if (domain === "Match Latest Release") {
    return [
      ...common,
      "Does this story affect parent tasks, child tasks, or both?",
      "Does the story change save, run, result, or post-completion behavior?",
      "Are there task-type or recurrence option changes that must be asserted?"
    ];
  }

  if (domain === "TDL") {
    return [
      ...common,
      "Is the change in TDL navigation, task history, task results, or task actions?",
      "Are there task-type-specific restrictions or result behaviors involved?"
    ];
  }

  return [
    ...common,
    "Does the story affect admin maintenance, recurring tasks, import definitions, dashboards, or another Match area?",
    "Is DB-backed verification required or optional for this story?"
  ];
}

function matchesDomain(domain: StoryDomain, suiteDomain: string): boolean {
  if (domain === "TDL") {
    return suiteDomain === "TDL";
  }

  if (domain === "Match Latest Release") {
    return suiteDomain === "Match Latest Release" || suiteDomain.startsWith("Match");
  }

  return suiteDomain.startsWith("Match");
}

function getPriorityBias(domain: StoryDomain, suiteId: number): number {
  if (domain === "TDL" && TDL_PRIORITY_SUITE_IDS.has(suiteId)) {
    return 50;
  }

  if (domain === "Match Latest Release" && LATEST_RELEASE_PRIORITY_SUITE_IDS.has(suiteId)) {
    return 50;
  }

  if (domain === "Match" && MATCH_PRIORITY_SUITE_IDS.has(suiteId)) {
    return 50;
  }

  return 0;
}

function buildSelectionReason(domain: StoryDomain, suite: SelectedReferenceSuite): string {
  if (domain === "TDL") {
    return `Use ${suite.name} as a direct TDL behavior source for ${suite.knowledgeRole}.`;
  }

  if (domain === "Match Latest Release") {
    return `Use ${suite.name} as a latest-release recurring-task source for ${suite.knowledgeRole}.`;
  }

  return `Use ${suite.name} as a Match reference source for ${suite.knowledgeRole}.`;
}

export function buildStoryAnalysisBundle(context: FlowContext): StoryAnalysisBundle {
  const rootsDoc = loadReferenceRoots(context.knowledgeRoot);
  const corpusDoc = loadReferenceSuiteCorpus(context.knowledgeRoot);
  const domain = inferDomain(context);
  const liveEvidenceMode =
    context.input.navigationPath && context.input.navigationPath.trim()
      ? "playwright-eligible"
      : "requirement-first";

  const selectedReferenceSuites = corpusDoc.prioritySuites
    .filter((suite) => matchesDomain(domain, suite.domain))
    .map((suite, index) => {
      let priority = 100 - index;

      if (suite.suiteId === context.input.suiteId) {
        priority += 100;
      }

      priority += getPriorityBias(domain, suite.suiteId);

      return {
        ...suite,
        priority,
        whySelected: buildSelectionReason(domain, {
          ...suite,
          priority,
          whySelected: ""
        })
      };
    })
    .sort((left, right) => right.priority - left.priority);

  return {
    domain,
    featureArea: inferFeatureArea(),
    referenceRootsSummary: rootsDoc.roots.map((root) => ({
      planId: root.planId,
      suiteId: root.suiteId,
      label: root.label,
      domain: root.domain
    })),
    selectedReferenceSuites,
    coverageFamilies: getCoverageFamilies(domain, inferFeatureArea()),
    openQuestionPrompts: getOpenQuestionPrompts(domain, inferFeatureArea()),
    liveEvidenceMode
  };
}

export function buildStoryAnalysisBundleFromStory(
  context: FlowContext,
  storyHints: { title?: string; description?: string; acceptanceCriteria?: string }
): StoryAnalysisBundle {
  const base = buildStoryAnalysisBundle(context);
  const featureArea = inferFeatureArea(storyHints);

  let selectedReferenceSuites = base.selectedReferenceSuites;
  if (featureArea === "Legacy Reports") {
    selectedReferenceSuites = LEGACY_REPORT_REFERENCE_SUITES.map((suite, index) => ({
      ...suite,
      priority: 1000 - index,
      whySelected: `Use ${suite.name} as a Legacy Reports-only reference source for list behavior, pagination state, and confirmed back-to-list patterns.`
    })).sort((left, right) => right.priority - left.priority);
  }

  return {
    ...base,
    featureArea,
    selectedReferenceSuites,
    coverageFamilies: getCoverageFamilies(base.domain, featureArea),
    openQuestionPrompts: getOpenQuestionPrompts(base.domain, featureArea)
  };
}
