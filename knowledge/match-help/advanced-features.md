# Match Help Context - Advanced Features

Generated: 2026-06-09T18:05:32.848Z

Source: Cadency Help Edinburgh Match documentation.

Use this as functional context for STLCFlow story analysis and testcase generation. It is a paraphrased QA knowledge file, not a replacement for the live Help page.

## Scope

This file covers the Match functional area **Advanced Features**. Key child pages include Advanced Features, About the Admin Dashboard, About the Archive Dashboard, About the Audits Dashboard, About the Match Configuration Dashboard, Researching Exceptions, Understanding the Manage Dashboard. Use it with the regression-suite corpus in the parent knowledge folder when writing story-specific testcases.

## QA Focus

- Verify create, edit, save, cancel, validation, and duplicate-name behavior for setup records.
- Cover filters, result counts, row selection, transaction detail, matching actions, and retained grid state.
- Cover exception visibility, assignment, comments, resolution actions, audit trail, and reopen/undo behavior where supported.

## Child Pages

### Advanced Features

- TOC path: Match > Advanced Features
- Source: https://cadencyhelp.lower.trintech.com/edinburgh/content/match/matchrcp/match%20rcp/rcpadvancedfeatures/advanced%20features.htm
- Context: Functional coverage: verify the Advanced Features behavior through navigation, field validation, save/cancel flow, grid state, and permissions.

### About the Admin Dashboard

- TOC path: Match > Advanced Features > About the Admin Dashboard
- Source: https://cadencyhelp.lower.trintech.com/edinburgh/content/match/admindashboard/about_the_admin_dashboard.htm
- Context: Dashboard/navigation coverage: verify entry points, available cards or links, default landing behavior, and role-based visibility.
- Section cues: Related Topics

### About the Archive Dashboard

- TOC path: Match > Advanced Features > About the Archive Dashboard
- Source: https://cadencyhelp.lower.trintech.com/edinburgh/content/match/archivemenu/understanding_data_archive.htm
- Context: Dashboard/navigation coverage: verify entry points, available cards or links, default landing behavior, and role-based visibility.
- Context: Archive coverage: verify archived data search, detail view, retention controls, and access boundaries.
- Section cues: Understanding Data Archive; Related Topics

### About the Audits Dashboard

- TOC path: Match > Advanced Features > About the Audits Dashboard
- Source: https://cadencyhelp.lower.trintech.com/edinburgh/content/match/auditmenu/about%20audits.htm
- Context: Dashboard/navigation coverage: verify entry points, available cards or links, default landing behavior, and role-based visibility.
- Section cues: Related Topics

### About the Match Configuration Dashboard

- TOC path: Match > Advanced Features > About the Match Configuration Dashboard
- Source: https://cadencyhelp.lower.trintech.com/edinburgh/content/match/configurationmenu/about%20configuration.htm
- Context: Dashboard/navigation coverage: verify entry points, available cards or links, default landing behavior, and role-based visibility.
- Context: Setup/maintenance coverage: verify add, edit, save, cancel, required fields, duplicate handling, and validation messages.

### Researching Exceptions

- TOC path: Match > Advanced Features > About the Transactions Dashboard
- Source: https://cadencyhelp.lower.trintech.com/edinburgh/content/match/transactionsmenu/exceptions/researching_exceptions.htm
- Context: Dashboard/navigation coverage: verify entry points, available cards or links, default landing behavior, and role-based visibility.
- Context: Transaction coverage: verify search criteria, filters, result grids, row details, selection behavior, and matching or bulk actions.
- Context: Exception/resolution coverage: verify exception visibility, assignment or comments, resolution actions, audit evidence, and reopen/undo behavior when available.
- Section cues: About the Transactions Dashboard; Match Transactions: Researching Exceptions

### Understanding the Manage Dashboard

- TOC path: Match > Advanced Features > Understanding the Manage Dashboard
- Source: https://cadencyhelp.lower.trintech.com/edinburgh/content/match/managemenu/understanding%20the%20manage%20dashboard.htm
- Context: Dashboard/navigation coverage: verify entry points, available cards or links, default landing behavior, and role-based visibility.
- Section cues: Related Topics

## Testcase Generation Guidance

- Prefer story acceptance criteria over this background context.
- Use the source pages to identify screens, actions, fields, and expected outcomes for the Match module.
- Combine this module context with existing ADO regression patterns for realistic step wording and coverage depth.
- Include positive, negative, permission, navigation, data-state, and audit/result scenarios when relevant to the story.
