# Latest Release Recurring Patterns

## Source

Derived directly from ADO plan `191930` leaf suites that were harvested in this pass.

## Current testcase writing pattern

Recent scheduler suites are being written in a tighter, more reusable shape than the older regression corpus:

- open Match
- navigate to `Tasks > Scheduler`
- create or open the target recurring task
- verify task parameter list view or key configuration controls
- save / cancel / run / child-task scenarios
- validate result-page summary or task-history behavior

## Reusable testcase families confirmed in `191930`

### Scheduler shell and task creation

Seen in:

- `192020` Report
- `195757` Batch import
- `197407` Structure Import
- `200016` Pay Return Import
- `202457` Pay Return Export

Patterns:

- scheduler tab visibility and page load
- create-new-task modal availability
- mandatory task-name validation
- task-type availability in the modal
- save parent task
- save child task
- cancel/discard changes
- run from single-action menu
- child-task cases should not include recurrence controls unless the story explicitly introduces child-task recurrence behavior

### Task-parameter list view coverage

Seen in:

- `197407` Structure Import
- `200016` Pay Return Import
- `202457` Pay Return Export

Patterns:

- one dedicated testcase for `List view (Task Parameter)`
- expected fields are listed in `Step Result`
- mandatory marker and control type are explicitly called out
- example values are embedded only where the feature genuinely needs them

### Result and rerun coverage

Seen in:

- `200760` Results
- `202457` Pay Return Export

Patterns:

- task-result UI section coverage
- result summary validation
- rerun with changed checkbox state
- skipped-vs-exported outcome differences

### New scheduler behavior coverage

Seen in:

- `203554` Post-completion execution
- `203846` Sector-restricted view-only behavior
- `203942` Unsupported task-type pruning
- `200550` Bundled task group process

Patterns:

- toggle-driven enable/disable behavior
- conditional validation messages
- restricted users see `view only`
- launch-task vs recurring-task option list differentiation
- add/remove/search behaviors in dual-list controls

## Most relevant latest suites to reuse first

- `195757` Batch import
- `197407` Structure Import
- `200016` Pay Return Import
- `202457` Pay Return Export
- `200760` Results
- `203554` Post-completion execution
- `203846` Sector-access restrictions
- `203942` Unsupported task-type cleanup
- `200550` Bundled task group process

## Use in STLCFlow

When the incoming story is a recurring-task or scheduler change, prefer this latest-release pattern before falling back to the broader regression corpus.
