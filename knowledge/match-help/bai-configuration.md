# Match Help Context - BAI configuration

Generated: 2026-06-09T18:05:32.848Z

Source: Cadency Help Edinburgh Match documentation.

Use this as functional context for STLCFlow story analysis and testcase generation. It is a paraphrased QA knowledge file, not a replacement for the live Help page.

## Scope

This file covers the Match functional area **BAI configuration**. Key child pages include BAI configuration Screen, BAI Cash Management Reporting Specifications, BAI File Format, BAI Mapping Screen, Create|Edit BAI Code Screen, Understanding BAI System Codes. Use it with the regression-suite corpus in the parent knowledge folder when writing story-specific testcases.

## QA Focus

- Verify create, edit, save, cancel, validation, and duplicate-name behavior for setup records.
- Cover report launch, required parameters, export/output formats, empty results, and navigation back to lists.

## Child Pages

### BAI configuration Screen

- TOC path: Match > Advanced Features > About the Admin Dashboard > BAI configuration Screen
- Source: https://cadencyhelp.lower.trintech.com/edinburgh/content/match/admindashboard/baiconfiguration/baiconfigurationscreen.htm
- Context: Dashboard/navigation coverage: verify entry points, available cards or links, default landing behavior, and role-based visibility.
- Context: Setup/maintenance coverage: verify add, edit, save, cancel, required fields, duplicate handling, and validation messages.
- Section cues: Related Topics

### BAI Cash Management Reporting Specifications

- TOC path: Match > Advanced Features > About the Admin Dashboard > BAI configuration Screen > BAI Cash Management Reporting Specifications
- Source: https://cadencyhelp.lower.trintech.com/edinburgh/content/match/admindashboard/baiconfiguration/bai_cash_management_reporting_specifications.htm
- Context: Dashboard/navigation coverage: verify entry points, available cards or links, default landing behavior, and role-based visibility.
- Context: Setup/maintenance coverage: verify add, edit, save, cancel, required fields, duplicate handling, and validation messages.
- Context: Reporting coverage: verify report selection, required parameters, output, export behavior, empty results, and return navigation.
- Field/table cues: BAI CASH MANAGEMENT REPORTING SPECIFICATION

### BAI File Format

- TOC path: Match > Advanced Features > About the Admin Dashboard > BAI configuration Screen > BAI File Format
- Source: https://cadencyhelp.lower.trintech.com/edinburgh/content/match/admindashboard/baiconfiguration/bai_file_format.htm
- Context: Dashboard/navigation coverage: verify entry points, available cards or links, default landing behavior, and role-based visibility.
- Context: Setup/maintenance coverage: verify add, edit, save, cancel, required fields, duplicate handling, and validation messages.
- Field/table cues: Record Name

### BAI Mapping Screen

- TOC path: Match > Advanced Features > About the Admin Dashboard > BAI configuration Screen > BAI Mapping Screen
- Source: https://cadencyhelp.lower.trintech.com/edinburgh/content/match/admindashboard/baiconfiguration/baimappingscreen.htm
- Context: Dashboard/navigation coverage: verify entry points, available cards or links, default landing behavior, and role-based visibility.
- Context: Setup/maintenance coverage: verify add, edit, save, cancel, required fields, duplicate handling, and validation messages.
- Section cues: Related Topics

### Create|Edit BAI Code Screen

- TOC path: Match > Advanced Features > About the Admin Dashboard > BAI configuration Screen > Create|Edit BAI Code Screen
- Source: https://cadencyhelp.lower.trintech.com/edinburgh/content/match/admindashboard/baiconfiguration/create-editbaicodescreen.htm
- Context: Dashboard/navigation coverage: verify entry points, available cards or links, default landing behavior, and role-based visibility.
- Context: Setup/maintenance coverage: verify add, edit, save, cancel, required fields, duplicate handling, and validation messages.
- Section cues: Related Topics

### Understanding BAI System Codes

- TOC path: Match > Advanced Features > About the Admin Dashboard > BAI configuration Screen > Understanding BAI System Codes
- Source: https://cadencyhelp.lower.trintech.com/edinburgh/content/match/admindashboard/baiconfiguration/understanding_bai_system_codes.htm
- Context: Dashboard/navigation coverage: verify entry points, available cards or links, default landing behavior, and role-based visibility.
- Context: Setup/maintenance coverage: verify add, edit, save, cancel, required fields, duplicate handling, and validation messages.
- Section cues: Related Topics

## Testcase Generation Guidance

- Prefer story acceptance criteria over this background context.
- Use the source pages to identify screens, actions, fields, and expected outcomes for the Match module.
- Combine this module context with existing ADO regression patterns for realistic step wording and coverage depth.
- Include positive, negative, permission, navigation, data-state, and audit/result scenarios when relevant to the story.
