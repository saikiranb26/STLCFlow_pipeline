# Match Application Reference Analysis

## Purpose

Document the current reference sources for Match application testcase generation and automation planning in `STLCFlow`.
This file now reflects direct Azure DevOps analysis, not just local cache notes.

## User-provided sources

- Latest release test plan: `191930`
- Regression reference suite: `70798` (`Match Angular`)
- TDL reference suite: `149176` (`TDL`)
- Direct ADO verification now confirms both reference suites are under plan `6357` (`Master Regression Test Plan`)

## Recursive analysis rule

- Any plan ID or suite ID provided by the user is treated as a root node.
- Analysis must traverse the full descendant hierarchy, not just the parent suite.
- Knowledge is collected from the child suites that actually hold reusable test cases.
- Local caches are convenience-only; ADO is the source of truth.

## What is already available locally

### 1. Latest release reference knowledge

Local file:

- `C:\Users\bsaikiran\AdoMCPtestcasesUpload\knowledge\cadency-plan-191930-recurring-user-reference-knowledge.json`

What it contains:

- normalized testcase samples from latest-release recurring-task coverage
- good examples of the user's preferred workbook structure and wording style
- recurring-task testcase patterns such as:
  - list view and task parameter verification
  - cancel
  - save
  - save run now
  - save child task

Observed areas in plan `191930`:

- ACH
- Export
- Exception Identification
- Batch Import
- Structure Import
- Pay Return Import
- Pay Return Export
- Batch Report
- SmartResolve
- Import Translation Import Process
- Results
- Recurrence variants
- Transaction Control-related latest-release items such as story `165709`

Use in `STLCFlow`:

- strong pattern source for latest release testcase style
- useful for scheduler and recurring-task stories
- useful for realistic step/result phrasing

### 2. Master regression knowledge cache

Local files:

- `C:\Users\bsaikiran\AdoMCPtestcasesUpload\knowledge\cadency-master-regression-plan-6357-manual-knowledge.json`
- `C:\Users\bsaikiran\AdoMCPtestcasesUpload\knowledge\cadency-master-regression-plan-6357-automation-knowledge.json`
- suite maps and summaries in the same folder

What it contains:

- broad Match regression knowledge across major modules
- both manual and automation-oriented reference coverage

Relevant Match-oriented suite names observed in the suite maps:

- Account Manager
- ACH Mapping
- Batch Import Definition
- Daily Recs
- Duplicate Checking Definition
- Import Translations
- Import Validation
- Match Affinity
- Match Rules and Sets
- Operational Structure
- Preferences
- Smart Resolve
- Tasks
- Tasks - Recurring
- Transaction Control/Correct Import
- Transaction Criteria
- Search
- SmartMatch
- Bulk Actions
- User Permissions

Use in `STLCFlow`:

- baseline module knowledge for Match application
- coverage idea source when current story AC is thin or generic
- reference source for realistic negative and regression scenarios
- source for identifying reusable automation patterns later

## Direct ADO recursive resolution

### Suite `70798` (`Match Angular`)

Directly confirmed from ADO under plan `6357`.

This is the high-value Match root for recursive harvesting.

Observed important child roots and feature areas:

- `171004` - Match Smoke Tests
- `122298` - Match Angular Automation
- `164203` - Match Angular Manual
- foundational feature suites such as:
  - `70802` Match Rules and Sets
  - `70806` Transactions
  - `70888` Exceptions
  - `70889` Preferences
  - `70890` Smart Resolve
  - `70891` Transaction Control/Correct Import
  - `70963` Tasks
  - `89677` Balance Control
  - `94003` Match Affinity
  - `100358` Audits
  - `105723` Log In
  - `106752` Import Translations
  - `110733` Operational Structure
  - `115948` Location Manager
  - `115949` Import Validation
  - `120317` Information Setup (TS)
  - `120323` BAI Replacement (TS)
  - `120325` Password Reset

### Suite `149176` (`TDL`)

Directly confirmed from ADO under plan `6357`.

Observed child suites under `149176`:

- `149177` - TDL Archive
- `149223` - TDL Amortization/depreciation
- `149237` - TDL Transaction Criteria
- `149279` - TDL Tasks
- `149295` - TDL Legacy Reports
- `149338` - TDL RCP
- `158765` - TDL Deployment
- `182507` - TDL Admin

## Match Angular child-suite findings from ADO

### 1. Match Smoke Tests root: `171004`

Observed children:

- `171005` - New Suite
- `171006` - New Suite

Current ADO finding:

- direct testcase listing for `171005` and `171006` returned no cases
- this means the smoke root exists in structure, but it is not currently a strong testcase knowledge source

Practical conclusion:

- keep `171004` as a known reference root
- do not rely on it as the primary corpus for testcase wording or coverage patterns

### 2. Match Angular Automation root: `122298`

Observed high-value feature suites:

- `122299` - Match Rules and Sets
- `122300` - Transactions
  - `122301` SmartMatch
  - `122302` Search
  - `122316` Bulk Actions
- `122303` - Archive Reconciliations
- `122304` - Exceptions
- `122305` - Preferences
- `122306` - Smart Resolve
- `122307` - Transaction Control/CorrectImport
- `122308` - Amortization/Depreciation
- `122309` - Archive Transactions
- `122310` - GL Integration
- `122311` - Reference Definitions
- `122312` - Transaction Criteria
- `122313` - Tasks
- `122314` - Custom Reports (Legacy)
- `122318` - Supplemental Fields
- `122319` - Balance Control
- `122321` - Match Affinity
- `122322` - Risk Rating
- `122323` - Audits
- `122324` - Help
- `122325` - Bulk Import/Export Configuration Items
- `122326` - Log In
- `122327` - Import Translations
- `122328` - Legacy Reports
- `122329` - Performance
- `122330` - Operational Structure
- `122332` - Intellicus Reporting
- `122333` - Location Manager
- `122334` - Import Validation
- `122335` - Information Setup (TS)
- `122336` - BAI Replacement (TS)
- `122337` - Password Reset
- `127619` - General System Parameters
- `131099` - Security Profiles

Sample testcase corpus findings:

- `122313` (`Tasks`) contains real reusable task-history and launch-task coverage
- examples include:
  - task history list-view validation
  - filter behavior and completion status validation
  - launch-task options and security
  - task-specific modal validation such as SmartResolve and Automatching
- `122299` (`Match Rules and Sets`) contains real feature coverage for:
  - list view
  - actions
  - duplicate/edit/delete behavior
  - rule-set relationship validation
  - newer description-field regression cases

Practical conclusion:

- `122298` is a strong structural knowledge source for automation-oriented feature coverage
- even though cases are marked manual in ADO, the suite taxonomy is useful for identifying modules and reusable behavior patterns

### 3. Match Angular Manual root: `164203`

Observed child suites:

- `153809` - Locale
- `155543` - Performance Testing
- `155962` - Duplicate Checking Definition
- `161554` - MBCS Test
  - `161560` Transactions
  - `161562` GL integration
  - `161563` Import validation
  - `161564` Information Setup
  - `161565` Location manager
  - `161566` Match rules and sets
  - `161567` Reference definitions
  - `161568` SmartResolve procedures
  - `161569` Transaction criteria
  - `161570` Operation structure
  - `161588` Unattached contact
  - `161589` User group manager
  - `161596` Calendars
  - `161597` Security Profile
  - `161598` Sectors
  - `161600` Tasks
  - `161601` Legacy Reports
  - `161604` MBCS stories
  - `162223` Amortization
  - `164264` Integration
- `161769` - Match Integration
- `162221` - Archive
  - `162222` Archive Amortization
- `162229` - Amortization/Depreciation
- `164208` - Calendars
  - `151970` Scheduling Calendars
- `164275` - Purge
- `172685` - Masking Definitions
- `176191` - Command Bar
- `176767` - Tasks - Recurring
- `176773` - Account Manager
- `182496` - Batch Import Defintion
- later descendants also visible in ADO include:
  - `188805` Match Dashboard
  - `188812` Daily Recs
  - `188820` User Permissions

Sample testcase corpus findings:

- `176767` (`Tasks - Recurring`) is a high-value source for your current recurring-task style
  - enable/disable flows
  - parent vs child behavior
  - single action vs bulk action
  - execution/save/retention patterns
  - sector-security behavior
  - task-type visibility checks
- `182496` (`Batch Import Defintion`) is a high-value source for admin/import-definition stories
  - list view
  - sort
  - count vs DB verification
  - security
  - create/edit/delete constraints
  - row-level add/remove behavior

Practical conclusion:

- `164203` is the strongest manual-writing reference root for realistic Match testcase wording
- for recurring tasks and import-definition stories, `176767` and `182496` are especially valuable

## TDL findings from ADO

### TDL root: `149176`

Observed children:

- `149177` - TDL Archive
  - `149178` TDL Archive Transactions
  - `149179` TDL Archive Reconciliations
  - `177687` TDL Archive Amortization
- `149223` - TDL Amortization/depreciation
- `149237` - TDL Transaction Criteria
- `149279` - TDL Tasks
- `149295` - TDL Legacy Reports
- `149338` - TDL RCP
- `158765` - TDL Deployment
- `182507` - TDL Admin

Sample testcase corpus findings from `149279` (`TDL Tasks`):

- launch task options
- task history / detail viewing
- filter behavior
- action availability restrictions
- import-type-specific task result validation

Additional direct TDL harvest findings:

- `149223` (`TDL Amortization/depreciation`)
  - filter retention
  - folder management
  - readonly restrictions
  - action visibility
  - schedule edit restrictions
- `149237` (`TDL Transaction Criteria`)
  - delete constraints when criteria are assigned to SmartResolve
  - private vs public criteria behavior
  - matched-by-user operator coverage
  - conversion-to-expert edge coverage
- `149295` (`TDL Legacy Reports`)
  - report folder manager
  - permissions and retention
  - add/rename/delete/move validations
  - bulk delete permission failures
  - date filter behavior
- `149338` (`TDL RCP`)
  - launch task options
  - new/export/report template creation
  - scheduling dashboard security
  - configuration dashboard edit restrictions
  - execute-export / execute-report patterns
- `158765` (`TDL Deployment`)
  - DB-backed deployment validation
  - auth/system-parameter migration behavior
  - post-deploy admin and login verification
- `182507` (`TDL Admin`)
  - SSO configuration UI
  - required fields
  - advanced options
- `177687` (`TDL Archive Amortization`)
  - archived amortization list view
  - search / sort / single and multiple filters
  - export behavior
  - readonly detail tabs

Practical conclusion:

- `149176` is a separate behavior domain and should be used when the story is explicitly TDL-related
- `149279` is already a useful live testcase corpus for TDL task behavior

## Latest release plan findings from ADO

### Plan `191930` (`Omnivores - 16.0 (Edinburgh)`)

Observed sprint grouping:

- `191932` - Sprint 92
- `193676` - Sprint 93
- `195906` - Sprint 94
- `199887` - Sprint 95
- `202455` - Sprint 96

Observed recurring-task and adjacent suites across sprints:

- `195757` - `186194 : Recurring Tasks - Batch import - QA Only`
- `197407` - `190446 : Recurring Tasks - Structure Import - QA Only`
- `200016` - `190444 : Recurring Tasks - Pay Return Import - QA Only`
- `202457` - `190443 : Recurring Tasks - Pay Return Export - QA Only`
- `201425` - `186192 : Reccuring Task - Batch export - QA Only`
- `201417` - `190440 : Recurring Tasks - Batch Report - QA Only`
- `203297` - `190441 : Recurring Tasks - SmartResolve - QA Only`
- `203128` - `190442 : Recurring Tasks - Import translation import process - QA Only`
- `200760` - `195511 : Recurring Tasks - Results - QA Only`
- recurrence-support suites such as daily, weekly, monthly, expert, and file-spy variants

Sample testcase corpus findings from `195757` (`186194 : Recurring Tasks - Batch import - QA Only`):

- task type availability
- task configuration visibility
- cancel behavior
- save behavior
- run behavior

Additional direct latest-release harvest findings:

- `192020` Report
  - scheduler-shell smoke
  - create-task modal
  - task-name validation
  - dependent-parent enablement
  - save/run/delete patterns
- `197407` Structure Import
  - task-parameter list view
  - weekly recurrence pattern
  - save parent
  - cancel
  - save child
  - run parent/child
- `200016` Pay Return Import
  - minimal required list-view coverage
  - save parent
  - cancel/discard
  - save child
  - import-file required validation
- `202457` Pay Return Export
  - operational-structure/account/export-file list view
  - parent and child save flows
  - result-page verification
  - rerun with export-previously-exported toggled
  - account and export-file validations
- `200760` Results
  - recipients list
  - email-alert options
  - post-completion execution controls
  - language dropdown coverage
- `200550` Bundled Task Group Process
  - bundled option visibility
  - selected/available dual-list behavior
  - recurrence/sector/results shell
  - save, cancel, run
- `203554` Post-completion execution
  - file-path required validation
  - search/add/remove behaviors in parameter lists
  - literal values
  - on-failure / on-success / regardless-of-outcome behavior
- `203846` Sector-restricted access
  - restricted users get view-only behavior
  - detail controls are readonly/disabled
- `203942` Unsupported task-type cleanup
  - recurring-task type list is pruned
  - launch-task list still retains Custom Process

For the full ADO leaf inventory and harvest status, see:

- `C:\Users\bsaikiran\STLCFlow\knowledge\ado-direct-coverage-status.md`
- `C:\Users\bsaikiran\STLCFlow\knowledge\latest-release-recurring-patterns.md`

Practical conclusion:

- `191930` is the best source for your latest-release recurring-task style
- it is especially useful when the current story is a fresh QA-only suite or a recent release regression

## Knowledge extraction conclusions

### Best manual-writing reference zones

- `164203 -> 176767` for recurring-task manual testcase style
- `164203 -> 182496` for batch import definition and admin-style list/detail/security coverage
- `191930 -> story suite` for latest-release scheduler and recurring-task stories

### Best module-coverage reference zones

- `122298` for Match feature taxonomy and automation-friendly module grouping
- `122299` for Match Rules and Sets behavior coverage
- `122313` for Tasks / Task history / Launch Task feature coverage
- `149176 -> 149279` for TDL task behavior

### Weak or low-yield nodes right now

- `171004` smoke children `171005` and `171006` currently returned no direct testcases

## Recommended use in the workflow

### For Match stories

Use sources in this order:

1. current work item from ADO
2. direct ADO extraction from the most relevant child suites under `70798`
3. latest-release plan `191930` when the story is recent and feature-adjacent
4. `164203` manual child suites for style and realistic wording
5. `122298` automation child suites for module-level coverage ideas
6. master regression cache `6357` only as a fallback convenience layer

### For TDL stories

Use sources in this order:

1. current work item from ADO
2. direct ADO extraction from the relevant child suites under `149176`
3. any local TDL story samples or prior generated workbooks as supplemental pattern sources

## Guardrail

Reference knowledge must shape wording, coverage, and realism.

Reference knowledge must not override the current story requirements.
