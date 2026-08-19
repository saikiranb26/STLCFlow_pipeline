const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const projectRoot = path.resolve(__dirname, "..");
const templatePath = path.join(projectRoot, "knowledge", "Referenced Template VSTS.xlsx");
const outputDir = path.join(projectRoot, "artifacts", "generated-excel");
const timestamp = Date.now();
const outputPath = path.join(
  outputDir,
  `186899 Recurring Tasks - Import - QA Only recent release style ${timestamp}.xlsx`
);

const metadata = {
  assignedTo: "Bolem Sai Kiran <bsaikiran@trintech.com>",
  state: "Design",
  productRelease: "Cadency Edinburgh",
  component: "Match Angular Client",
  automationStatus: "Planned",
  priority: "High"
};

function step(action, expected) {
  return { action, expected };
}

function baseSchedulerSteps() {
  return [
    step("Login to Match.", "User is logged in successfully."),
    step("Navigate to Tasks and click on Scheduler tab.", "Scheduler page is displayed.")
  ];
}

function createRootImportTask(taskName) {
  return [
    step(
      `Click on Create new task, enter a unique task name (Example: ${taskName}), select task type "Import", and click on Create Task.`,
      "Import scheduled task configuration page is displayed."
    )
  ];
}

function createChildImportTask(taskName, parentTaskName) {
  return [
    step("Click on Create new task.", "Create Task modal is displayed."),
    step(`Enter a unique task name (Example: ${taskName}) and select task type "Import".`, "Task name and Import task type are populated."),
    step(
      'Select "Dependent upon the completion of another task", choose the parent task, and click on Create Task.',
      `Import child task configuration page is displayed under parent task ${parentTaskName}.`
    )
  ];
}

function recurrenceSteps() {
  return [
    step('In Recurrence section select "Weekly" for Recurrence type.', "Weekly recurrence option is selected."),
    step('For Run on days select "Monday".', "Monday is selected as the run day."),
    step('Enter a valid run time and select time zone "Asia/Kolkata".', "Run time and time zone values are accepted.")
  ];
}

function saveAndReopenSteps(reopenExpectation) {
  return [
    step("Click on Save.", "Success:Updated scheduled task."),
    step("Return to the scheduler list and reopen the same task.", reopenExpectation)
  ];
}

function makeCase(title, steps, estimatedMinutes) {
  return {
    title,
    estimatedMinutes,
    steps
  };
}

const cases = [
  makeCase(
    "186899 : Recurring Tasks - Import - QA Only - Verify Import is available in Create new task",
    [
      ...baseSchedulerSteps(),
      step("Click on Create new task.", "Create Task modal is displayed."),
      step("Enter a unique task name. Example: sk_import_root.", "Task name value is accepted."),
      step('Review the Task Type list in the Create new recurring task modal.', 'Import is available as a task type option in the Task Type list.'),
      step('Select task type "Import" and click on Create Task.', "Import scheduled task configuration page is displayed.")
    ],
    5
  ),
  makeCase(
    "186899 : Recurring Tasks - Import - QA Only - Verify Import page loads and tooltip text",
    [
      ...baseSchedulerSteps(),
      ...createRootImportTask("sk_import_tooltip"),
      step("Verify the Import task page loads without errors.", "Import task configuration page opens without error message."),
      step("Review the task type tooltip or help text on the page.", 'Tooltip text is displayed as "Import transaction and/or balance data."')
    ],
    5
  ),
  makeCase(
    "186899 : Recurring Tasks - Import - QA Only - List view (Task Parameter)",
    [
      ...baseSchedulerSteps(),
      ...createRootImportTask("sk_import_listview"),
      step(
        "Verify the Import task parameter section.",
        [
          "The following options are shown:",
          "Import type:* dropdown",
          "Specify file names: checkbox",
          "Files to import: multi-value text field",
          "Use file pattern: checkbox",
          "PGP Secret key file: text field",
          "PGP Pass phrase: password field",
          "Duplicate checking section with Perform duplicate file checking checkbox, Duplicate checking definition dropdown, and Number of records to check numeric text field",
          "File encoding: dropdown",
          "Perform BAI file validation: checkbox",
          "Perform Detail File validation: checkbox",
          "Export records skipped per import definition: checkbox",
          "Export directory: text field",
          "Custom import definitions: single-select control when Import type = Custom",
          "Recurrence section includes Calendar based and File Spy options",
          "Sector Selection is available for root tasks and supports multiple sectors",
          "Task Results Notification allows multiple recipients",
          "Language dropdown is available for task results"
        ].join("\n")
      )
    ],
    10
  ),
  makeCase(
    "186899 : Recurring Tasks - Import - QA Only - Verify Standard import type can be saved",
    [
      ...baseSchedulerSteps(),
      ...createRootImportTask("sk_import_standard"),
      step('Select Import type = "Standard".', "Standard import type is selected."),
      step('Select "Specify file names" and enter a valid file path. Example: D:\\DATAFILES\\Sk\\Imports\\standard_import.txt.', "Standard import file path is accepted."),
      step('Select File encoding = "Default encoding".', "File encoding value is accepted."),
      ...recurrenceSteps(),
      ...saveAndReopenSteps("Saved Standard import values are retained.")
    ],
    10
  ),
  makeCase(
    "186899 : Recurring Tasks - Import - QA Only - Verify Extended Standard import type can be saved",
    [
      ...baseSchedulerSteps(),
      ...createRootImportTask("sk_import_extended_standard"),
      step('Select Import type = "Extended Standard".', "Extended Standard import type is selected."),
      step('Select "Specify file names" and enter a valid file path. Example: D:\\DATAFILES\\Sk\\Imports\\extended_standard_import.txt.', "Extended Standard import file path is accepted."),
      step('Select File encoding = "Default encoding".', "File encoding value is accepted."),
      ...recurrenceSteps(),
      ...saveAndReopenSteps("Saved Extended Standard import values are retained.")
    ],
    10
  ),
  makeCase(
    "186899 : Recurring Tasks - Import - QA Only - Verify BAI import type options and save",
    [
      ...baseSchedulerSteps(),
      ...createRootImportTask("sk_import_bai"),
      step('Select Import type = "BAI".', "BAI import type is selected."),
      step('Select "Specify file names" and enter a valid BAI file path. Example: D:\\DATAFILES\\Sk\\Imports\\BAI_Import.bai.', "BAI file path is accepted."),
      step("Check Perform BAI file validation.", "Perform BAI file validation is enabled."),
      step("Check Perform duplicate file checking and select Duplicate checking definition = Testing.", "Duplicate checking definition is selected successfully."),
      step("Enter Number of records to check = 1000.", "Number of records to check value is accepted."),
      step("Check Export records skipped per import definition and enter Export directory = D:\\DATAFILES\\Sk\\imports\\skexportBAI.txt.", "Export directory value is accepted."),
      ...recurrenceSteps(),
      ...saveAndReopenSteps("Saved BAI import values are retained.")
    ],
    15
  ),
  makeCase(
    "186899 : Recurring Tasks - Import - QA Only - Verify Custom import definition is single-select",
    [
      ...baseSchedulerSteps(),
      ...createRootImportTask("sk_import_custom"),
      step('Select Import type = "Custom".', "Custom import type is selected."),
      step("Open the Custom import definitions control.", "Custom import definition choices are displayed."),
      step("Select one valid Custom import definition.", "One Custom import definition is selected."),
      step("Attempt to select a second Custom import definition.", "Only one Custom import definition can remain selected at a time."),
      ...saveAndReopenSteps("Selected Custom import definition is retained.")
    ],
    10
  ),
  makeCase(
    "186899 : Recurring Tasks - Import - QA Only - Verify multiple file names are accepted",
    [
      ...baseSchedulerSteps(),
      ...createRootImportTask("sk_import_multifile"),
      step('Select Import type = "Standard".', "Standard import type is selected."),
      step('Select "Specify file names" and enter the first file path. Example: D:\\DATAFILES\\Sk\\Imports\\import_file_01.txt.', "First file path is accepted."),
      step('Click "Add value" and enter the second file path. Example: D:\\DATAFILES\\Sk\\Imports\\import_file_02.txt.', "Second file path input is added and accepted."),
      ...recurrenceSteps(),
      ...saveAndReopenSteps("Both import file paths are retained on the saved task.")
    ],
    10
  ),
  makeCase(
    "186899 : Recurring Tasks - Import - QA Only - Verify file pattern can be used for Import task",
    [
      ...baseSchedulerSteps(),
      ...createRootImportTask("sk_import_pattern"),
      step('Select Import type = "Standard".', "Standard import type is selected."),
      step('Select "Use file pattern".', "File pattern mode is enabled."),
      step("Enter a valid file pattern. Example: D:\\DATAFILES\\Sk\\Imports\\*.txt.", "File pattern value is accepted."),
      ...recurrenceSteps(),
      ...saveAndReopenSteps("Saved file pattern value is retained.")
    ],
    10
  ),
  makeCase(
    "186899 : Recurring Tasks - Import - QA Only - Verify cancel discards unsaved Import task changes",
    [
      ...baseSchedulerSteps(),
      ...createRootImportTask("sk_import_cancel"),
      step('Select Import type = "Standard" and enter a valid import file path.', "Unsaved Import task changes are present on the page."),
      step("Click on Cancel.", "Discard changes confirmation popup is displayed."),
      step("Click on Discard.", "Changes are discarded and the scheduler list page is displayed."),
      step("Verify the unsaved Import task is not listed.", "Unsaved Import task is not present in the scheduler list.")
    ],
    5
  ),
  makeCase(
    "186899 : Recurring Tasks - Import - QA Only - Verify root task supports multiple sectors",
    [
      ...baseSchedulerSteps(),
      ...createRootImportTask("sk_import_sector"),
      step('Select Import type = "Standard" and enter a valid import file path.', "Import task accepts the required file value."),
      step("In Sector Selection choose multiple sectors. Example: system1 and system2.", "Both sectors are selected successfully."),
      ...recurrenceSteps(),
      ...saveAndReopenSteps("Selected sectors are retained for the root Import task.")
    ],
    10
  ),
  makeCase(
    "186899 : Recurring Tasks - Import - QA Only - Verify task results notification supports multiple recipients and language selection",
    [
      ...baseSchedulerSteps(),
      ...createRootImportTask("sk_import_results"),
      step('Select Import type = "Standard" and enter a valid import file path.', "Import task accepts the required file value."),
      step('In Task Results Notification add multiple recipients in the "To" field.', "Multiple recipients are added successfully."),
      step('Select Email Alert option "Send me an email upon completion, completion with warnings, or if an error occurs".', "Selected email alert option is retained."),
      step('Select Language = "German".', "German is selected successfully."),
      ...recurrenceSteps(),
      ...saveAndReopenSteps("Selected recipients, email alert option, and language are retained.")
    ],
    10
  ),
  makeCase(
    "186899 : Recurring Tasks - Import - QA Only - Verify child Import task can be saved under a parent task",
    [
      ...baseSchedulerSteps(),
      ...createChildImportTask("sk_import_child", "sk_import_parent"),
      step('Select Import type = "Standard".', "Standard import type is selected for the child task."),
      step('Enter a valid import file path. Example: D:\\DATAFILES\\Sk\\Imports\\child_import.txt.', "Child Import file path is accepted."),
      ...saveAndReopenSteps("Child Import task remains associated with the selected parent task.")
    ],
    8
  ),
  makeCase(
    "186899 : Recurring Tasks - Import - QA Only - Verify detail file validation failure result",
    [
      ...baseSchedulerSteps(),
      ...createRootImportTask("sk_import_detail_validation"),
      step('Select Import type = "Standard".', "Standard import type is selected."),
      step('Select "Specify file names" and enter a file that contains no detail records. Example: D:\\DATAFILES\\Sk\\Imports\\no_detail_records.txt.', "Import file path is accepted."),
      step("Check Perform Detail File validation.", "Perform Detail File validation is enabled."),
      ...recurrenceSteps(),
      step("Click on Save.", "Success:Updated scheduled task."),
      step("Run the saved Import task from the scheduler list.", "Task execution is started successfully."),
      step("Open the task result page after execution completes.", "Task result page is displayed for the executed Import task."),
      step("Verify the task result status and message.", "Task result status is Failed because the file does not contain at least one detail record.")
    ],
    15
  )
];

function writeWorkbook() {
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template workbook was not found at ${templatePath}`);
  }

  fs.mkdirSync(outputDir, { recursive: true });

  const workbook = XLSX.readFile(templatePath, { cellDates: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("Template workbook does not contain a worksheet.");
  }

  const sheet = workbook.Sheets[sheetName];
  const existingRange = XLSX.utils.decode_range(sheet["!ref"] || "A1:J1");
  const columnCount = Math.max(existingRange.e.c, 9);
  const rowCountToClear = Math.max(existingRange.e.r, 500);

  for (let row = 1; row <= rowCountToClear; row += 1) {
    for (let col = 0; col <= columnCount; col += 1) {
      delete sheet[XLSX.utils.encode_cell({ r: row, c: col })];
    }
  }

  const bodyRows = [];
  for (const testCase of cases) {
    bodyRows.push([
      testCase.title,
      "",
      "",
      metadata.assignedTo,
      metadata.state,
      metadata.productRelease,
      metadata.component,
      metadata.automationStatus,
      metadata.priority,
      testCase.estimatedMinutes
    ]);

    for (const item of testCase.steps) {
      bodyRows.push(["", item.action, item.expected, "", "", "", "", "", "", ""]);
    }
  }

  XLSX.utils.sheet_add_aoa(sheet, bodyRows, { origin: "A2" });
  sheet["!ref"] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: bodyRows.length, c: 9 }
  });

  XLSX.writeFile(workbook, outputPath);
  return outputPath;
}

const workbookPath = writeWorkbook();
console.log(JSON.stringify({ workbookPath, caseCount: cases.length }, null, 2));
