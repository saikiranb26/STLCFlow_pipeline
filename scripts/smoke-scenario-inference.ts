import { inferExecutionStepsFromManualSteps } from "../tests/utils/scenario-inference";

const steps = inferExecutionStepsFromManualSteps({
  navigationPath: "Tasks > Scheduler",
  manualSteps: [
    {
      action: "Login to Match.",
      expected: "User is logged in successfully."
    },
    {
      action: "Navigate to Tasks and click on Scheduler tab.",
      expected: "Scheduler page is displayed."
    },
    {
      action: 'Select "Specify file names" and enter a valid file path. Example: D:\\DATAFILES\\Sk\\Imports\\standard_import.txt.',
      expected: "Standard import file path is accepted."
    },
    {
      action: 'Select "Dependent upon the completion of another task", choose the parent task, and click on Create Task.',
      expected: "Import child task configuration page is displayed."
    }
  ]
});

const values = steps.map((step) => `${step.kind}:${step.label || step.target || step.value || ""}`);
console.log(JSON.stringify(values, null, 2));

for (const expected of [
  "navigate:Tasks > Scheduler",
  "checkByLabel:Specify file names",
  "fillByLabel:Files to import",
  "checkByLabel:Dependent upon the completion of another task",
  "selectFirstOptionByLabel:Parent task",
  "clickText:Create Task"
]) {
  if (!values.includes(expected)) {
    throw new Error(`Missing inferred step: ${expected}`);
  }
}
