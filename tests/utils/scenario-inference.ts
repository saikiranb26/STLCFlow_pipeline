import type { AutomationExecutionStep, ManualWorkbookStep } from "./automation-manifest";

function clean(value: string): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function stripTrailingPunctuation(value: string): string {
  return clean(value).replace(/[.:;,\-]+$/g, "").trim();
}

function splitCompoundAction(action: string): string[] {
  const rawSegments = clean(action)
    .split(/\.\s+/)
    .flatMap((part) => part.split(/\s+and\s+(?=(?:click|enter|select|choose|verify|set|fill|check|uncheck|save|run|navigate)\b)/i))
    .map((part) => clean(part))
    .filter(Boolean);

  const mergedSegments: string[] = [];
  for (const segment of rawSegments) {
    if (/^example\s*:/i.test(segment) && mergedSegments.length > 0) {
      mergedSegments[mergedSegments.length - 1] = `${mergedSegments[mergedSegments.length - 1]}. ${segment}`;
      continue;
    }

    mergedSegments.push(segment);
  }

  return mergedSegments;
}

function parseQuotedValue(value: string): string | undefined {
  const match = value.match(/["']([^"']+)["']/);
  return match?.[1] ? clean(match[1]) : undefined;
}

function parseExampleValue(value: string): string | undefined {
  const match = value.match(/example\s*:\s*(.+)$/i);
  return match?.[1] ? stripTrailingPunctuation(match[1]) : undefined;
}

function buildCustomStep(notes: string, expected?: string): AutomationExecutionStep {
  return {
    kind: "custom",
    notes: clean([notes, expected].filter(Boolean).join(" | "))
  };
}

function buildAssertVisibleSteps(values: string[]): AutomationExecutionStep[] {
  return values.map((text) => ({
    kind: "assertVisibleText" as const,
    expected: text
  }));
}

function normalizeImportTypeValue(value: string): string {
  const normalized = stripTrailingPunctuation(value).toLowerCase();
  if (normalized === "bai" || normalized === "bai import") {
    return "BAI Import";
  }
  if (normalized === "standard" || normalized === "standard import") {
    return "Standard";
  }
  if (normalized === "extended standard" || normalized === "extended standard import") {
    return "Extended Standard";
  }
  if (normalized === "legacy custom import") {
    return "Legacy custom import";
  }
  if (normalized === "custom" || normalized === "custom import") {
    return "Custom import";
  }

  return stripTrailingPunctuation(value);
}

function isCheckboxLikeLabel(value: string): boolean {
  return /specify file names|use file pattern|perform .*validation|export records skipped|dependent upon|duplicate file checking|calendar based|file spy/i.test(
    clean(value)
  );
}

function splitExpectedAssertions(value: string): string[] {
  const normalized = clean(value)
    .replace(/\bare displayed\b/gi, "")
    .replace(/\bare available\b/gi, "")
    .replace(/\bis available\b/gi, "")
    .replace(/\bis displayed\b/gi, "")
    .replace(/\bsections are displayed\b/gi, "")
    .replace(/\boption\b/gi, "")
    .trim();

  if (!normalized) {
    return [];
  }

  return normalized
    .replace(/\s+and\s+/gi, ", ")
    .split(",")
    .map((item) => clean(item).replace(/\bsections?\b/gi, "").replace(/[.:;]+$/g, "").trim())
    .filter(Boolean);
}

function inferStructuredManualStep(manualStep: ManualWorkbookStep, navigationPath?: string): AutomationExecutionStep[] | undefined {
  const action = clean(manualStep.action);
  const expected = clean(manualStep.expected);
  const quoted = parseQuotedValue(action);

  if (!action) {
    return undefined;
  }

  if (/^click on reports and select legacy reports\.?$/i.test(action)) {
    return [{ kind: "gotoLegacyReports" }];
  }

  if (/^ensure the legacy reports list contains enough records to navigate beyond page 1\.?$/i.test(action)) {
    return [{ kind: "legacyReportsEnsurePaginationAvailable" }];
  }

  const legacyPageMatch = action.match(/^navigate to page\s+(\d+)\s+in legacy reports list\.?$/i);
  if (legacyPageMatch?.[1]) {
    return [{ kind: "legacyReportsGoToPage", value: legacyPageMatch[1] }];
  }

  const pageSizeMatch =
    action.match(/^change the page size in legacy reports list\.?\s*example:\s*(\d+)/i) ||
    action.match(/^select a page size .*example:\s*(\d+)/i);
  if (pageSizeMatch?.[1]) {
    return [{ kind: "legacyReportsSetPageSize", value: pageSizeMatch[1] }];
  }

  if (/^click actions for any report in legacy reports list\.?$/i.test(action)) {
    return [
      { kind: "legacyReportsOpenActions" },
      { kind: "legacyReportsAssertActionsMenu", notes: "Move|Duplicate|Download|Delete" }
    ];
  }

  const legacyActionMatch = action.match(/^click actions for any report(?: in the current legacy reports page)? and select (move|duplicate|download|delete)\.?$/i);
  if (legacyActionMatch?.[1]) {
    return [{ kind: "legacyReportsSelectAction", value: stripTrailingPunctuation(legacyActionMatch[1]) }];
  }

  const folderActionMatch = action.match(/^select\s+["']?([^"']+)["']?\s+folder(?: checkbox)?\s+and click save\.?$/i);
  if (folderActionMatch?.[1]) {
    return [{ kind: "legacyReportsCompleteFolderAction", value: stripTrailingPunctuation(folderActionMatch[1]) }];
  }

  if (/^click\s+yes,?\s*delete\.?$/i.test(action)) {
    return [{ kind: "legacyReportsConfirmDelete" }];
  }

  if (/^return to legacy reports list\.?$/i.test(action) || /^cancel or close the delete action and return to legacy reports list\.?$/i.test(action)) {
    return [{ kind: "legacyReportsReturnToList" }];
  }

  if (/^verify the legacy reports list remains on the same page after the download action\.?$/i.test(action)) {
    return [{ kind: "legacyReportsAssertRetainedState" }];
  }

  if (
    /^verify the legacy reports list remains on page \d+ after the move action\.?$/i.test(action) ||
    /^verify the legacy reports list retains the selected page size after the duplicate action\.?$/i.test(action) ||
    /^verify the legacy reports list retains page \d+ and the selected page size after the delete action\.?$/i.test(action)
  ) {
    return [{ kind: "legacyReportsAssertRetainedState" }];
  }

  if (/^click the browser back button\.?$/i.test(action)) {
    return [{ kind: "browserBack" }];
  }

  if (/^click the browser forward button\.?$/i.test(action)) {
    return [{ kind: "browserForward" }];
  }

  if (/^navigate to tasks and click(?: on)? scheduler/i.test(action)) {
    return [{ kind: "navigate", target: navigationPath || "Tasks > Scheduler" }];
  }

  if (/^navigate to reports and (?:select|click(?: on)?) legacy reports/i.test(action)) {
    return [{ kind: "gotoLegacyReports" }];
  }

  if (
    /enter .*task name.*select .*import.*click .*create task/i.test(action) ||
    /click on create new task.*enter .*task name.*select task type .*import.*create task/i.test(action)
  ) {
    return [{ kind: "openImportTaskConfig" }];
  }

  if (/^click(?: on)? create new task/i.test(action)) {
    return [{ kind: "openCreateTaskDialog" }];
  }

  if (/^open the import recurring task configuration page/i.test(action)) {
    return [{ kind: "openImportTaskConfig" }];
  }

  if (/^open the import type dropdown/i.test(action)) {
    return [{ kind: "openDropdownByLabel", label: "Import type" }, ...buildAssertVisibleSteps(splitExpectedAssertions(expected))];
  }

  if (/^review the page sections for a root task/i.test(action)) {
    return buildAssertVisibleSteps(splitExpectedAssertions(expected));
  }

  if (/^verify the import task parameter section/i.test(action) || /^review the task parameters section/i.test(action)) {
    return buildAssertVisibleSteps([
      "Import type",
      "Specify file names",
      "Files to import",
      "Use file pattern",
      "PGP Secret key file",
      "PGP Pass phrase",
      "Duplicate checking definition",
      "Number of records to check",
      "File encoding",
      "Perform BAI file validation",
      "Perform Detail File validation",
      "Export records skipped per import definition",
      "Export directory",
      "Custom import definition",
      "Recurrence",
      "Sector Selection",
      "Task Results Notification",
      "Language"
    ]);
  }

  if (/^review the task tooltip/i.test(action) || /^review the task type tooltip or help text/i.test(action)) {
    const tooltipMatch = expected.match(/imports?\s+(.+)$/i);
    if (tooltipMatch?.[1]) {
      return [{ kind: "assertVisibleText", expected: stripTrailingPunctuation(tooltipMatch[1]) }];
    }
    return expected ? [{ kind: "assertVisibleText", expected: stripTrailingPunctuation(expected) }] : undefined;
  }

  if (/^review the task type list/i.test(action)) {
    return [
      { kind: "openDropdownByLabel", label: "Task type" },
      { kind: "assertVisibleText", expected: "Import" }
    ];
  }

  if (/^verify the import task page loads without errors/i.test(action)) {
    return [{ kind: "assertVisibleText", expected: "Import type" }];
  }

  if (/^review the task type options/i.test(action)) {
    return [
      { kind: "openDropdownByLabel", label: "Task type" },
      { kind: "assertVisibleText", expected: "Batch Import" }
    ];
  }

  if (/^select import type as\b/i.test(action)) {
    const value = normalizeImportTypeValue(quoted || action.replace(/^select import type as\b/i, ""));
    return [{ kind: "selectByLabel", label: "Import type", value }];
  }

  if (/^select custom import\.?$/i.test(action)) {
    return [{ kind: "selectByLabel", label: "Import type", value: "Custom import" }];
  }

  if (/^review the custom import definition selector/i.test(action)) {
    return [
      { kind: "assertVisibleText", expected: "Custom import definition" },
      { kind: "assertSingleSelectByLabel", label: "Custom import definition" }
    ];
  }

  if (/^review the duplicate checking definition field/i.test(action)) {
    return [{ kind: "assertVisibleText", expected: "Duplicate checking definition" }];
  }

  if (/^select a duplicate checking definition/i.test(action)) {
    return [{ kind: "selectFirstOptionByLabel", label: "Duplicate checking definition" }];
  }

  if (/^click cancel\.?$/i.test(action)) {
    return [{ kind: "clickText", target: "Cancel" }];
  }

  if (/^confirm that you want to leave the page/i.test(action)) {
    return [{ kind: "confirmDialog" }, { kind: "assertVisibleText", expected: "Scheduler" }];
  }

  if (/^return to the scheduler list and reopen the same task\.?$/i.test(action)) {
    return [{ kind: "reopenCurrentTask" }];
  }

  if (/^run the saved import task from the scheduler list\.?$/i.test(action)) {
    return [{ kind: "runCurrentTask" }];
  }

  if (/^open the task result page after execution completes\.?$/i.test(action)) {
    return [{ kind: "openTaskHistory" }];
  }

  if (/^open task history or task result/i.test(action)) {
    return [{ kind: "navigate", target: "Tasks > Task History" }, ...(expected ? buildAssertVisibleSteps(splitExpectedAssertions(expected)) : [])];
  }

  if (/^open the import recurring task configuration page for a root task/i.test(action)) {
    return [{ kind: "openImportTaskConfig" }];
  }

  if (/^open the custom import definitions control/i.test(action)) {
    return [{ kind: "openDropdownByLabel", label: "Custom import definition" }];
  }

  if (/^select one valid custom import definition/i.test(action)) {
    return [{ kind: "selectFirstOptionByLabel", label: "Custom import definition" }];
  }

  if (/^attempt to select a second custom import definition/i.test(action)) {
    return [{ kind: "assertSingleSelectByLabel", label: "Custom import definition" }];
  }

  if (/^in task results notification add multiple recipients/i.test(action)) {
    return [{ kind: "fillByLabel", label: "To", value: "qa.one@trintech.com;qa.two@trintech.com" }];
  }

  if (/^select "dependent upon the completion of another task"/i.test(action)) {
    return [
      { kind: "checkByLabel", label: "Dependent upon the completion of another task" },
      { kind: "selectFirstOptionByLabel", label: "Parent task" },
      ...( /click(?: on)? create task/i.test(action) ? [{ kind: "clickText" as const, target: "Create Task" }] : [] )
    ];
  }

  if (/^in sector selection choose multiple sectors/i.test(action)) {
    return [{ kind: "multiSelectByLabel", label: "Sector Selection", value: "system1|system2" }];
  }

  const importTypeSelectionMatch = action.match(
    /^select\s+(bai import|standard(?: import)?|extended standard(?: import)?|legacy custom import|custom import)\b/i
  );
  if (importTypeSelectionMatch?.[1]) {
    const value = normalizeImportTypeValue(quoted || importTypeSelectionMatch[1] || "");
    if (value) {
      return [{ kind: "selectByLabel", label: "Import type", value }];
    }
  }

  return undefined;
}

function inferStepFromSegment(segment: string, expected: string, navigationPath?: string): AutomationExecutionStep {
  const normalized = clean(segment);
  const normalizedBase = stripTrailingPunctuation(normalized);
  const lower = normalized.toLowerCase();
  const quoted = parseQuotedValue(normalized);

  if (!normalized) {
    return buildCustomStep("Empty workbook step segment", expected);
  }

  if (/^login(\s+to)?\s+match\b/i.test(normalizedBase) || /^login into application\b/i.test(normalizedBase)) {
    return { kind: "login" };
  }

  if (/^navigate to\b/i.test(normalizedBase)) {
    if (/legacy reports/i.test(normalizedBase)) {
      return { kind: "gotoLegacyReports" };
    }

    return {
      kind: "navigate",
      target: navigationPath || stripTrailingPunctuation(normalizedBase.replace(/^navigate to\b/i, ""))
    };
  }

  if (/^create new task$/i.test(normalizedBase) || /^click(?: on)? create new task$/i.test(normalizedBase)) {
    return { kind: "openCreateTaskDialog" };
  }

  if (/enter .*task name.*select .*import.*click .*create task/i.test(lower)) {
    return { kind: "openImportTaskConfig" };
  }

  const clickMatch = normalizedBase.match(/^click(?:\s+on)?\s+(.+)$/i);
  if (clickMatch?.[1]) {
    return {
      kind: "clickText",
      target: stripTrailingPunctuation(clickMatch[1])
    };
  }

  const taskNameMatch = normalizedBase.match(/enter .*task name/i);
  if (taskNameMatch) {
    return { kind: "fillCurrentTaskName", label: "Task name", notes: normalized };
  }

  const enterByLabelMatch = normalizedBase.match(/^enter\s+(.+?)\s+in\s+(.+)$/i);
  if (enterByLabelMatch?.[1] && enterByLabelMatch?.[2]) {
    return {
      kind: "fillByLabel",
      value: stripTrailingPunctuation(enterByLabelMatch[1]),
      label: stripTrailingPunctuation(enterByLabelMatch[2])
    };
  }

  const enterEqualsMatch = normalizedBase.match(/^enter\s+(.+?)\s*=\s*(.+)$/i);
  if (enterEqualsMatch?.[1] && enterEqualsMatch?.[2]) {
    return {
      kind: "fillByLabel",
      label: stripTrailingPunctuation(enterEqualsMatch[1]),
      value: stripTrailingPunctuation(enterEqualsMatch[2])
    };
  }

  if (/^enter\b/i.test(normalizedBase)) {
    const exampleValue = parseExampleValue(normalized);
    if (/export directory/i.test(normalized) && exampleValue) {
      return { kind: "fillByLabel", label: "Export directory", value: exampleValue };
    }
    if (/number of records to check/i.test(normalized)) {
      const digits = normalized.match(/(\d+)/);
      if (digits?.[1]) {
        return { kind: "fillByLabel", label: "Number of records to check", value: digits[1] };
      }
    }
    if (/(file path|file pattern|file that contains no detail records)/i.test(normalized)) {
      const value = exampleValue || quoted || "D:\\DATAFILES\\Sk\\Imports\\default_import.txt";
      if (/file pattern/i.test(normalized) && value) {
        return { kind: "fillByLabel", label: "Files to import", value };
      }
      if (value) {
        return { kind: "fillByLabel", label: "Files to import", value };
      }
    }
    if (/run time/i.test(normalizedBase)) {
      return { kind: "fillByLabel", label: "Run time", value: "08:00 AM" };
    }
    return buildCustomStep(normalized, expected);
  }

  const selectDropdownMatch =
    normalizedBase.match(/^select\s+(.+?)\s+(?:from|in)\s+(.+?)\s+dropdown$/i) ||
    normalizedBase.match(/^select\s+(.+?)\s+for\s+(.+?)$/i);
  if (selectDropdownMatch?.[1] && selectDropdownMatch?.[2]) {
    return {
      kind: "selectByLabel",
      value: stripTrailingPunctuation(selectDropdownMatch[1]),
      label: stripTrailingPunctuation(selectDropdownMatch[2])
    };
  }

  const selectTaskTypeMatch = normalizedBase.match(/^select\s+task type\s+(.+)$/i);
  if (selectTaskTypeMatch?.[1]) {
    return {
      kind: "selectByLabel",
      label: "Task type",
      value: stripTrailingPunctuation(quoted || selectTaskTypeMatch[1])
    };
  }

  const importTypeMatch = normalizedBase.match(/^select.*import type.*$/i);
  if (importTypeMatch) {
    return {
      kind: "selectByLabel",
      label: "Import type",
      value: stripTrailingPunctuation(quoted || normalizedBase.replace(/^select/i, ""))
    };
  }

  const labelEqualsMatch = normalizedBase.match(/^select\s+(.+?)\s*=\s*["']?([^"']+)["']?$/i);
  if (labelEqualsMatch?.[1] && labelEqualsMatch?.[2]) {
    const resolvedLabel = stripTrailingPunctuation(labelEqualsMatch[1]);
    const resolvedValue = /^import type$/i.test(resolvedLabel)
      ? normalizeImportTypeValue(labelEqualsMatch[2])
      : stripTrailingPunctuation(labelEqualsMatch[2]);
    return {
      kind: "selectByLabel",
      label: resolvedLabel,
      value: resolvedValue
    };
  }

  const recurrenceTypeMatch =
    normalizedBase.match(/select\s+(.+?)\s+radio button\s+for\s+(.+)$/i) ||
    normalizedBase.match(/select\s+["']?([^"']+)["']?\s+for\s+(.+)$/i);
  if (recurrenceTypeMatch?.[1] && recurrenceTypeMatch?.[2]) {
    return {
      kind: "selectByLabel",
      label: stripTrailingPunctuation(recurrenceTypeMatch[2]),
      value: stripTrailingPunctuation(recurrenceTypeMatch[1])
    };
  }

  const runOnDaysMatch = normalizedBase.match(/run on days.*select\s+["']?([^"']+)["']?/i);
  if (runOnDaysMatch?.[1]) {
    return {
      kind: "selectByLabel",
      label: "Run on days",
      value: stripTrailingPunctuation(runOnDaysMatch[1])
    };
  }

  const timeZoneMatch = normalizedBase.match(/^select\s+time zone\s+["']?([^"']+)["']?$/i);
  if (timeZoneMatch?.[1]) {
    return {
      kind: "selectByLabel",
      label: "Time zone",
      value: stripTrailingPunctuation(timeZoneMatch[1])
    };
  }

  if (/^check\b/i.test(normalizedBase) && /checkbox/i.test(normalizedBase)) {
    return {
      kind: "checkByLabel",
      label: stripTrailingPunctuation(normalizedBase.replace(/^check\b/i, "").replace(/checkbox/gi, ""))
    };
  }

  if (/^check\b/i.test(normalizedBase)) {
    return {
      kind: "checkByLabel",
      label: stripTrailingPunctuation(normalizedBase.replace(/^check\b/i, ""))
    };
  }

  const quotedSelect = normalizedBase.match(/^select\s+["']([^"']+)["']$/i);
  if (quotedSelect?.[1]) {
    const target = stripTrailingPunctuation(quotedSelect[1]);
    if (isCheckboxLikeLabel(target)) {
      return {
        kind: "checkByLabel",
        label: target
      };
    }

    return {
      kind: "clickText",
      target
    };
  }

  if (/^select email alert option\b/i.test(normalizedBase) && quoted) {
    return {
      kind: "selectByLabel",
      label: "Email Alert",
      value: stripTrailingPunctuation(quoted)
    };
  }

  if (/^uncheck\b/i.test(normalizedBase) && /checkbox/i.test(normalizedBase)) {
    return {
      kind: "uncheckByLabel",
      label: stripTrailingPunctuation(normalizedBase.replace(/^uncheck\b/i, "").replace(/checkbox/gi, ""))
    };
  }

  if (/^verify\b/i.test(normalizedBase) && expected) {
    return {
      kind: "assertVisibleText",
      expected: expected
    };
  }

  if (/^wait\b/i.test(normalizedBase) && expected) {
    return {
      kind: "waitForText",
      expected
    };
  }

  return buildCustomStep(normalized, expected);
}

export function inferExecutionStepsFromManualSteps(input: {
  manualSteps: ManualWorkbookStep[];
  navigationPath?: string;
}): AutomationExecutionStep[] {
  const steps: AutomationExecutionStep[] = [];

  for (const manualStep of input.manualSteps) {
    const structured = inferStructuredManualStep(manualStep, input.navigationPath);
    if (structured && structured.length > 0) {
      steps.push(...structured);
      continue;
    }

    const action = clean(manualStep.action);
    const expected = clean(manualStep.expected);

    if (!action && expected) {
      steps.push({
        kind: "assertVisibleText",
        expected
      });
      continue;
    }

    const segments = splitCompoundAction(action);
    if (segments.length === 0) {
      steps.push(buildCustomStep(action, expected));
      continue;
    }

    for (const segment of segments) {
      steps.push(inferStepFromSegment(segment, expected, input.navigationPath));
    }
  }

  if (
    input.navigationPath &&
    !steps.some((step) => step.kind === "navigate" || step.kind === "gotoLegacyReports")
  ) {
    const loginIndex = steps.findIndex((step) => step.kind === "login");
    const navigateStep: AutomationExecutionStep = {
      kind: "navigate",
      target: input.navigationPath
    };

    if (loginIndex >= 0) {
      steps.splice(loginIndex + 1, 0, navigateStep);
    } else {
      steps.unshift(navigateStep);
    }
  }

  return steps;
}

export function isUiScenario(executionSteps: AutomationExecutionStep[]): boolean {
  return executionSteps.some((step) =>
    [
      "login",
      "navigate",
      "clickText",
      "fillByLabel",
      "selectByLabel",
      "checkByLabel",
      "uncheckByLabel",
      "legacyReportsCompleteFolderAction",
      "legacyReportsConfirmDelete",
      "openCreateTaskDialog",
      "openImportTaskConfig",
      "openDropdownByLabel",
      "selectFirstOptionByLabel"
    ].includes(step.kind)
  );
}
