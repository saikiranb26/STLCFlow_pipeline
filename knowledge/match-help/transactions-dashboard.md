# Match Help Context - Transactions Dashboard

Generated: 2026-06-09T18:05:32.848Z

Source: Cadency Help Edinburgh Match documentation.

Use this as functional context for STLCFlow story analysis and testcase generation. It is a paraphrased QA knowledge file, not a replacement for the live Help page.

## Scope

This file covers the Match functional area **Transactions Dashboard**. Key child pages include The Transactions Dashboard, Generating Exception Item Follow-up from SmartMatch, More transaction criteria Screen, SmartMatch Screen, Viewing Linked Transactions on Reports. Use it with the regression-suite corpus in the parent knowledge folder when writing story-specific testcases.

## QA Focus

- Cover filters, result counts, row selection, transaction detail, matching actions, and retained grid state.
- Cover report launch, required parameters, export/output formats, empty results, and navigation back to lists.
- Cover exception visibility, assignment, comments, resolution actions, audit trail, and reopen/undo behavior where supported.

## Child Pages

### The Transactions Dashboard

- TOC path: Match > Advanced Features > About the Transactions Dashboard > The Transactions Dashboard
- Source: https://cadencyhelp.lower.trintech.com/edinburgh/content/match/transactionsmenu/thetransactionsdashboard.htm
- Context: Dashboard/navigation coverage: verify entry points, available cards or links, default landing behavior, and role-based visibility.
- Context: Transaction coverage: verify search criteria, filters, result grids, row details, selection behavior, and matching or bulk actions.

### Generating Exception Item Follow-up from SmartMatch

- TOC path: Match > Advanced Features > About the Transactions Dashboard > The Transactions Dashboard > Generating Exception Item Follow-up from SmartMatch
- Source: https://cadencyhelp.lower.trintech.com/edinburgh/content/match/reference/generating_exception_item_follow-up_from_smartmatch.htm
- Context: Dashboard/navigation coverage: verify entry points, available cards or links, default landing behavior, and role-based visibility.
- Context: Transaction coverage: verify search criteria, filters, result grids, row details, selection behavior, and matching or bulk actions.
- Context: Exception/resolution coverage: verify exception visibility, assignment or comments, resolution actions, audit evidence, and reopen/undo behavior when available.

### More transaction criteria Screen

- TOC path: Match > Advanced Features > About the Transactions Dashboard > The Transactions Dashboard > More transaction criteria Screen
- Source: https://cadencyhelp.lower.trintech.com/edinburgh/content/match/transactionsmenu/smartmatchmoretransactioncriteriascreen.htm
- Context: Dashboard/navigation coverage: verify entry points, available cards or links, default landing behavior, and role-based visibility.
- Context: Transaction coverage: verify search criteria, filters, result grids, row details, selection behavior, and matching or bulk actions.

### SmartMatch Screen

- TOC path: Match > Advanced Features > About the Transactions Dashboard > The Transactions Dashboard > SmartMatch Screen
- Source: https://cadencyhelp.lower.trintech.com/edinburgh/content/match/transactionsmenu/smartmatch/smartmatchscreen.htm
- Context: Dashboard/navigation coverage: verify entry points, available cards or links, default landing behavior, and role-based visibility.
- Context: Transaction coverage: verify search criteria, filters, result grids, row details, selection behavior, and matching or bulk actions.
- Section cues: Related Topics

### Viewing Linked Transactions on Reports

- TOC path: Match > Advanced Features > About the Transactions Dashboard > The Transactions Dashboard > Viewing Linked Transactions on Reports
- Source: https://cadencyhelp.lower.trintech.com/edinburgh/content/match/reports/viewing_linked_transactions_on_reports.htm
- Context: Dashboard/navigation coverage: verify entry points, available cards or links, default landing behavior, and role-based visibility.
- Context: Transaction coverage: verify search criteria, filters, result grids, row details, selection behavior, and matching or bulk actions.
- Context: Reporting coverage: verify report selection, required parameters, output, export behavior, empty results, and return navigation.

## Testcase Generation Guidance

- Prefer story acceptance criteria over this background context.
- Use the source pages to identify screens, actions, fields, and expected outcomes for the Match module.
- Combine this module context with existing ADO regression patterns for realistic step wording and coverage depth.
- Include positive, negative, permission, navigation, data-state, and audit/result scenarios when relevant to the story.
