const fs = require("node:fs");
const path = require("node:path");
const XLSX = require("xlsx");

const projectRoot = path.resolve(__dirname, "..");
const storyId = 203684;
const storyTitle = "Open Scheduler Task Details in Tabs";
const templatePath = path.join(projectRoot, "knowledge", "Referenced Template VSTS.xlsx");
const generatedExcelRoot = path.join(projectRoot, "artifacts", "generated-excel");
const storyArtifactRoot = path.join(projectRoot, "artifacts", "stories", String(storyId));
const workbookPath = path.join(generatedExcelRoot, `${storyId} ${storyTitle}.xlsx`);
const sidecarPath = path.join(storyArtifactRoot, `testcases_${storyId}_draft.sidecar.json`);
const storySummaryPath = path.join(storyArtifactRoot, "story-summary.json");

const assignedTo = "Bolem Sai Kiran <bsaikiran@trintech.com>";
const state = "Design";
const productRelease = "Cadency Edinburgh";
const component = "Match Angular Client";
const automationStatus = "Planned";
const priority = "Low";

const loginStep = {
  action: "Login to Match as a user who has access to Tasks and Scheduler.",
  expected: "User is logged in successfully and can access the Match application."
};

const schedulerStep = {
  action: "Navigate to Tasks and click on Scheduler tab.",
  expected: "Scheduler dashboard is displayed with the scheduled task list or dashboard view."
};

const cases = [
  {
    title: `${storyId} : ${storyTitle} - Verify a scheduler task opens in a tab`,
    estimatedMinutes: 5,
    steps: [
      loginStep,
      schedulerStep,
      {
        action: "Click Open for any existing scheduler task.",
        expected: "Task details open in a scheduler task tab instead of replacing the full Scheduler page."
      },
      {
        action: "Verify the opened task tab label and task detail content.",
        expected: "Opened tab identifies the selected task and displays the correct task details."
      }
    ]
  },
  {
    title: `${storyId} : ${storyTitle} - Verify multiple scheduler tasks open as separate tabs`,
    estimatedMinutes: 6,
    steps: [
      loginStep,
      schedulerStep,
      {
        action: "Click Open for one scheduler task.",
        expected: "First task opens in a scheduler task tab."
      },
      {
        action: "Return to the Scheduler dashboard tab and click Open for a different scheduler task.",
        expected: "Second task opens in a new scheduler task tab."
      },
      {
        action: "Verify both opened task tabs are still available.",
        expected: "Each selected task has its own tab and no previously opened task tab is closed or replaced."
      }
    ]
  },
  {
    title: `${storyId} : ${storyTitle} - Verify more than 25 scheduler task tabs can be opened and used`,
    estimatedMinutes: 12,
    steps: [
      loginStep,
      schedulerStep,
      {
        action: "Open more than 25 different scheduler tasks from the Scheduler dashboard.",
        expected: "Each selected task opens as a scheduler task tab without application error."
      },
      {
        action: "Use the tab strip overflow, scroll, or more control to access first, middle, and last opened task tabs.",
        expected: "User can navigate to opened task tabs even when the tab count exceeds the visible tab-strip area."
      },
      {
        action: "Select a few opened tabs and verify the displayed task details.",
        expected: "Selected tabs display the correct corresponding task details and do not show details from another task."
      },
      {
        action: "Close a few opened task tabs.",
        expected: "Selected tabs close successfully and the remaining opened task tabs stay available."
      }
    ]
  },
  {
    title: `${storyId} : ${storyTitle} - Verify opening an already opened scheduler task focuses the existing tab`,
    estimatedMinutes: 5,
    steps: [
      loginStep,
      schedulerStep,
      {
        action: "Click Open for a scheduler task and note the task name.",
        expected: "Selected task opens in a scheduler task tab."
      },
      {
        action: "Return to the Scheduler dashboard tab and click Open for the same scheduler task again.",
        expected: "Application focuses the already opened task tab."
      },
      {
        action: "Verify the tab strip after opening the same task again.",
        expected: "No duplicate tab is created for the same scheduler task."
      }
    ]
  },
  {
    title: `${storyId} : ${storyTitle} - Verify navigation between scheduler task tabs`,
    estimatedMinutes: 6,
    steps: [
      loginStep,
      schedulerStep,
      {
        action: "Open at least three different scheduler tasks in tabs.",
        expected: "Three scheduler task tabs are displayed."
      },
      {
        action: "Switch between the opened scheduler task tabs several times.",
        expected: "Each selected tab becomes active and displays its own task details."
      },
      {
        action: "Verify all opened task tabs after switching.",
        expected: "Tabs remain open until the user closes them and task detail data is not mixed between tabs."
      }
    ]
  },
  {
    title: `${storyId} : ${storyTitle} - Verify scheduler task tabs remain available after navigating away and returning`,
    estimatedMinutes: 7,
    steps: [
      loginStep,
      schedulerStep,
      {
        action: "Open two scheduler tasks in tabs.",
        expected: "Two scheduler task tabs are displayed with correct task details."
      },
      {
        action: "Navigate to another Match page that the user can access, then return to Tasks and Scheduler.",
        expected: "Scheduler dashboard opens successfully after returning."
      },
      {
        action: "Verify the previously opened scheduler task tabs.",
        expected: "Previously opened scheduler task tabs are still available and can be selected."
      }
    ]
  },
  {
    title: `${storyId} : ${storyTitle} - Verify creating a new scheduler task does not close existing task tabs`,
    estimatedMinutes: 8,
    steps: [
      loginStep,
      schedulerStep,
      {
        action: "Open a few existing scheduler tasks in tabs.",
        expected: "Existing scheduler task tabs are displayed."
      },
      {
        action: "Click Create new task, enter a unique task name, select a valid task type, and click Create Task.",
        expected: "New scheduler task detail opens successfully."
      },
      {
        action: "Verify the tab strip after creating the new task.",
        expected: "New task is available in a task tab and the already opened existing task tabs remain open."
      }
    ]
  },
  {
    title: `${storyId} : ${storyTitle} - Verify parent task can be opened while creating a linked task`,
    estimatedMinutes: 9,
    steps: [
      loginStep,
      schedulerStep,
      {
        action: "Start creating a new scheduler task that is dependent on or linked to a parent task.",
        expected: "New task detail is displayed and parent task selection is available."
      },
      {
        action: "Select or search for an existing parent task to link to the new task.",
        expected: "Selected parent task is shown on the new task detail."
      },
      {
        action: "Open the selected parent task from the parent task link or related open action.",
        expected: "Parent task opens in a scheduler task tab."
      },
      {
        action: "Return to the new task tab.",
        expected: "New task tab remains open and the selected parent task value is still retained."
      }
    ]
  },
  {
    title: `${storyId} : ${storyTitle} - Verify saving changes from an opened scheduler task tab`,
    estimatedMinutes: 7,
    steps: [
      loginStep,
      schedulerStep,
      {
        action: "Open an existing scheduler task in a tab.",
        expected: "Task detail tab is displayed."
      },
      {
        action: "Update a safe editable field on the task, such as description, notes, or another non-destructive field available for the selected task.",
        expected: "Edited value is accepted on the task detail tab."
      },
      {
        action: "Click Save.",
        expected: "Task is saved successfully and the scheduler task tab remains usable."
      },
      {
        action: "Close and reopen the same scheduler task.",
        expected: "Saved value is displayed when the task is reopened."
      }
    ]
  },
  {
    title: `${storyId} : ${storyTitle} - Verify switching tabs with unsaved changes does not show save or discard prompt`,
    estimatedMinutes: 7,
    steps: [
      loginStep,
      schedulerStep,
      {
        action: "Open two different scheduler tasks in tabs.",
        expected: "Two scheduler task tabs are displayed."
      },
      {
        action: "On the first task tab, update a safe editable field and do not save.",
        expected: "Unsaved change remains visible on the first task tab."
      },
      {
        action: "Switch from the first task tab to the second task tab.",
        expected: "User is moved to the second task tab without a Save or Discard confirmation popup."
      },
      {
        action: "Switch back to the first task tab.",
        expected: "Unsaved change is still retained on the first task tab until the user saves or closes that tab."
      }
    ]
  },
  {
    title: `${storyId} : ${storyTitle} - Verify closing an unsaved changed task tab prompts and discard does not persist changes`,
    estimatedMinutes: 8,
    steps: [
      loginStep,
      schedulerStep,
      {
        action: "Open an existing scheduler task in a tab and note the current value of a safe editable field.",
        expected: "Task detail tab is displayed and original field value is known."
      },
      {
        action: "Update the field value and do not save.",
        expected: "Updated value is visible as an unsaved change."
      },
      {
        action: "Switch to another scheduler task tab or the Scheduler dashboard tab.",
        expected: "No Save or Discard confirmation popup is displayed while switching tabs."
      },
      {
        action: "Close the task tab that contains the unsaved change.",
        expected: "Save or Discard confirmation popup is displayed for the unsaved task tab."
      },
      {
        action: "Click Discard on the confirmation popup.",
        expected: "Changed task tab closes and the unsaved change is discarded."
      },
      {
        action: "Open the same scheduler task again.",
        expected: "Task opens with the original field value and the discarded unsaved value is not persisted."
      }
    ]
  }
];

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeWorkbook() {
  const workbook = XLSX.readFile(templatePath, { cellDates: false });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1:J1");
  const maxCol = Math.max(range.e.c, 9);
  const maxRow = Math.max(range.e.r, 600);

  for (let row = 1; row <= maxRow; row += 1) {
    for (let col = 0; col <= maxCol; col += 1) {
      delete sheet[XLSX.utils.encode_cell({ r: row, c: col })];
    }
  }

  const rows = [];
  for (const testCase of cases) {
    rows.push([
      testCase.title,
      "",
      "",
      assignedTo,
      state,
      productRelease,
      component,
      automationStatus,
      priority,
      testCase.estimatedMinutes
    ]);

    for (const step of testCase.steps) {
      rows.push(["", step.action, step.expected, "", "", "", "", "", "", ""]);
    }
  }

  XLSX.utils.sheet_add_aoa(sheet, rows, { origin: "A2" });
  sheet["!ref"] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: rows.length, c: 9 }
  });

  ensureDir(generatedExcelRoot);
  XLSX.writeFile(workbook, workbookPath);
}

function writeArtifacts() {
  ensureDir(storyArtifactRoot);
  const generatedAt = new Date().toISOString();
  const storySummary = {
    workItemId: storyId,
    title: storyTitle,
    areaPath: "Cadency\\Match",
    iterationPath: "Cadency\\Sprint 98",
    state: "In Test",
    assignedTo,
    priority: "3",
    component,
    productRelease,
    domain: "Match",
    featureArea: "Tasks > Scheduler",
    description:
      "Scheduler task details should open in tabs so users can work across multiple tasks without losing their place on the scheduling dashboard.",
    acceptanceCriteria: [
      "Opening a task from the scheduling dashboard opens task details in a scheduler tab.",
      "Multiple tasks can be opened in separate scheduler tabs.",
      "Existing opened task tabs remain available until the user closes them.",
      "Unsaved changes are retained when navigating between tabs until the user saves on that tab.",
      "Closing a tab with unsaved changes prompts the user to save or discard changes."
    ],
    childWorkItems: [
      { id: 204714, title: "DEV - Open Task Details in Tabs", state: "Done" },
      { id: 206887, title: "Testing : Story 203684: Open Scheduler Task Details in Tabs", state: "In Progress" },
      { id: 207343, title: "DEV - make task tabs track unsaved changes", state: "Done" }
    ],
    generatedAt
  };

  const sidecar = {
    workItemId: storyId,
    generatedAt,
    storyTitle,
    workbookPath,
    sourceInputs: {
      adoStory: true,
      adoCommentsReviewed: true,
      childWorkItemsReviewed: [204714, 206887, 207343],
      userDraftScenarioCount: 11
    },
    selectedReferenceSuites: [
      {
        planId: 191930,
        suiteName: "Latest Release Match recurring-task suites",
        observedPatterns: [
          "Tasks > Scheduler navigation",
          "open/create scheduled task",
          "save, cancel, child task, and run style",
          "scheduler shell and task detail behavior"
        ]
      },
      {
        planId: 6357,
        suiteId: 176767,
        suiteName: "Tasks - Recurring",
        observedPatterns: [
          "scheduler list behavior",
          "parent and child task behavior",
          "save and retention patterns"
        ]
      }
    ],
    testCases: cases.map((testCase, index) => ({
      ordinal: index + 1,
      title: testCase.title,
      estimatedMinutes: testCase.estimatedMinutes,
      manualSteps: testCase.steps
    }))
  };

  fs.writeFileSync(storySummaryPath, `${JSON.stringify(storySummary, null, 2)}\n`, "utf8");
  fs.writeFileSync(sidecarPath, `${JSON.stringify(sidecar, null, 2)}\n`, "utf8");
}

writeWorkbook();
writeArtifacts();

console.log(JSON.stringify({ workbookPath, sidecarPath, storySummaryPath, totalTestCases: cases.length }, null, 2));
