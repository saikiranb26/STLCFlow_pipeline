# Decisions

## Confirmed decisions

- Project root: `C:\Users\bsaikiran\STLCFlow`
- This will be a new project and a new workflow, separate from the current `AdoMCPtestcasesUpload` flow.
- The flow should be end-to-end, but with explicit review gates rather than one blind run.
- Playwright MCP is the main execution layer.
- Chrome DevTools MCP is a secondary evidence and debugging layer only.
- Azure DevOps MCP is the system of record for work items, plans, suites, testcase upload, and related metadata.
- Manual testcase generation should follow the user's personal style and template.
- Reference knowledge can come from smoke/regression plans provided later by the user.
- Any user-provided parent plan or suite is a recursive knowledge root; the flow must analyze both the parent and all child suites beneath it.
- Reference testcase knowledge is a pattern source, not a copy source; generated testcases must be newly written for the current story and should not copy-paste old testcase steps or expected results.
- Automation traceability is mandatory: generated feature names, scenario titles, tags, and manifest/index files must let the user find testcase code directly by testcase ID later.

## Working architecture direction

Recommended staged flow:

1. Analyze story from ADO
2. Pull reference knowledge
3. Optionally collect UI evidence if a usable build exists
4. Generate draft workbook and sidecar metadata
5. Pause for user review
6. Upload approved workbook to ADO
7. Generate Playwright BDD automation from the approved source
8. Execute tests
9. Debug framework issues
10. Publish Allure results and logs

## Open decisions

- Whether runtime navigation path will always be supplied by the user
- Target environment for initial implementation
- What to do when a testcase is not safely automatable:
  - block it
  - generate stub only
  - or force an attempt
- Whether generated automation should live in one shared framework or in story-specific folders inside the same project
