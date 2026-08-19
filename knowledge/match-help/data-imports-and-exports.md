# Match Help Context - Data Imports and Exports

Generated: 2026-06-09T18:05:32.848Z

Source: Cadency Help Edinburgh Match documentation.

Use this as functional context for STLCFlow story analysis and testcase generation. It is a paraphrased QA knowledge file, not a replacement for the live Help page.

## Scope

This file covers the Match functional area **Data Imports and Exports**. Key child pages include Understanding Data Imports and Exports, Batch Import definitions Screen, Correcting Import Data Errors, Create/Edit Batch Import Definition Screen, Importing Basics, Defining a Custom Import, Defining a Legacy Custom Import Task, Execute Custom Report. Use it with the regression-suite corpus in the parent knowledge folder when writing story-specific testcases.

## QA Focus

- Verify create, edit, save, cancel, validation, and duplicate-name behavior for setup records.
- Cover successful imports, rejected files, validation feedback, history/status updates, and downstream availability.
- Cover launch/run behavior, parameters, scheduler or recurring settings, history, statuses, and permissions.
- Cover report launch, required parameters, export/output formats, empty results, and navigation back to lists.

## Child Pages

### Understanding Data Imports and Exports

- TOC path: Match > Advanced Features > About the Admin Dashboard > Understanding Data Imports and Exports
- Source: https://cadencyhelp.lower.trintech.com/edinburgh/content/match/admindashboard/import-exportdefinitions/understandingdataimportsandexports.htm
- Context: Dashboard/navigation coverage: verify entry points, available cards or links, default landing behavior, and role-based visibility.
- Context: Import/export coverage: verify file or process parameters, success/failure statuses, history records, and downstream data availability.
- Section cues: About Imports; About Exports; Related Topics

### Batch Import definitions Screen

- TOC path: Match > Advanced Features > About the Admin Dashboard > Understanding Data Imports and Exports > Batch Import definitions Screen
- Source: https://cadencyhelp.lower.trintech.com/edinburgh/content/match/admindashboard/import-exportdefinitions/import%20and%20export%20definitions%20screen.htm
- Context: Dashboard/navigation coverage: verify entry points, available cards or links, default landing behavior, and role-based visibility.
- Context: Setup/maintenance coverage: verify add, edit, save, cancel, required fields, duplicate handling, and validation messages.
- Context: Import/export coverage: verify file or process parameters, success/failure statuses, history records, and downstream data availability.
- Section cues: Related Topics

### Correcting Import Data Errors

- TOC path: Match > Advanced Features > About the Admin Dashboard > Understanding Data Imports and Exports > Correcting Import Data Errors
- Source: https://cadencyhelp.lower.trintech.com/edinburgh/content/match/matchrcp/match%20rcp/rcpopenmenu/correcting_import_data_errors.htm
- Context: Dashboard/navigation coverage: verify entry points, available cards or links, default landing behavior, and role-based visibility.
- Context: Import/export coverage: verify file or process parameters, success/failure statuses, history records, and downstream data availability.

### Create/Edit Batch Import Definition Screen

- TOC path: Match > Advanced Features > About the Admin Dashboard > Understanding Data Imports and Exports > Create/Edit Batch Import Definition Screen
- Source: https://cadencyhelp.lower.trintech.com/edinburgh/content/match/admindashboard/import-exportdefinitions/create-editbatchimportdefinitionscreen.htm
- Context: Dashboard/navigation coverage: verify entry points, available cards or links, default landing behavior, and role-based visibility.
- Context: Setup/maintenance coverage: verify add, edit, save, cancel, required fields, duplicate handling, and validation messages.
- Context: Import/export coverage: verify file or process parameters, success/failure statuses, history records, and downstream data availability.
- Section cues: Related Topics

### Importing Basics

- TOC path: Match > Advanced Features > About the Admin Dashboard > Understanding Data Imports and Exports > Importing Basics
- Source: https://cadencyhelp.lower.trintech.com/edinburgh/content/match/matchrcp/match%20rcp/rcpadvancedfeatures/launchtasks/dataimports/importing_basics.htm
- Context: Dashboard/navigation coverage: verify entry points, available cards or links, default landing behavior, and role-based visibility.
- Context: Setup/maintenance coverage: verify add, edit, save, cancel, required fields, duplicate handling, and validation messages.
- Context: Import/export coverage: verify file or process parameters, success/failure statuses, history records, and downstream data availability.
- Section cues: Maintaining Custom Import Definitions; Related Topics

### Defining a Custom Import

- TOC path: Match > Advanced Features > About the Admin Dashboard > Understanding Data Imports and Exports > Importing Basics > Custom Import Definition Screen
- Source: https://cadencyhelp.lower.trintech.com/edinburgh/content/match/matchrcp/match%20rcp/rcpadvancedfeatures/configuration%20dashboard/custom_import_definition_screen.htm
- Context: Dashboard/navigation coverage: verify entry points, available cards or links, default landing behavior, and role-based visibility.
- Context: Setup/maintenance coverage: verify add, edit, save, cancel, required fields, duplicate handling, and validation messages.
- Context: Import/export coverage: verify file or process parameters, success/failure statuses, history records, and downstream data availability.
- Section cues: Custom Import Definition Screen; Related Topics

### Defining a Legacy Custom Import Task

- TOC path: Match > Advanced Features > About the Admin Dashboard > Understanding Data Imports and Exports > Importing Basics > Defining a Legacy Custom Import Task
- Source: https://cadencyhelp.lower.trintech.com/edinburgh/content/match/matchrcp/match%20rcp/rcpadvancedfeatures/launchtasks/dataimports/defining_a_legacy_custom_import_task.htm
- Context: Dashboard/navigation coverage: verify entry points, available cards or links, default landing behavior, and role-based visibility.
- Context: Import/export coverage: verify file or process parameters, success/failure statuses, history records, and downstream data availability.
- Context: Process coverage: verify task launch, run parameters, execution status, result review, and retained evidence after completion.

### Execute Custom Report

- TOC path: Match > Advanced Features > About the Admin Dashboard > Understanding Data Imports and Exports > Importing Basics > Execute Custom Report
- Source: https://cadencyhelp.lower.trintech.com/edinburgh/content/match/matchrcp/match%20rcp/rcpadvancedfeatures/launchtasks/executecustomreporttaskscreen.htm
- Context: Dashboard/navigation coverage: verify entry points, available cards or links, default landing behavior, and role-based visibility.
- Context: Import/export coverage: verify file or process parameters, success/failure statuses, history records, and downstream data availability.
- Context: Reporting coverage: verify report selection, required parameters, output, export behavior, empty results, and return navigation.
- Section cues: Execute Custom Report Screen; Related Topics

### Job Interface Schedules

- TOC path: Match > Advanced Features > About the Admin Dashboard > Understanding Data Imports and Exports > Job Interface Schedules
- Source: https://cadencyhelp.lower.trintech.com/edinburgh/content/certificationadmin/xml_interface_schedules.htm
- Context: Dashboard/navigation coverage: verify entry points, available cards or links, default landing behavior, and role-based visibility.
- Context: Import/export coverage: verify file or process parameters, success/failure statuses, history records, and downstream data availability.
- Section cues: Job Interface Load File Details; Run an Interface; View an Interface History; Automatic Decertification; Notes for Specific Job Interface Files/Situations; Related Topics

## Testcase Generation Guidance

- Prefer story acceptance criteria over this background context.
- Use the source pages to identify screens, actions, fields, and expected outcomes for the Match module.
- Combine this module context with existing ADO regression patterns for realistic step wording and coverage depth.
- Include positive, negative, permission, navigation, data-state, and audit/result scenarios when relevant to the story.
