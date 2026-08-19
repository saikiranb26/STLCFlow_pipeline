# Requirements

## Goal

Build an end-to-end agentic workflow for manual testcase generation, Azure DevOps upload, Playwright automation generation, execution, debugging, and reporting.

## Main input

The user will provide:

- `workItemId`
- `suiteId`
- `testPlanId`

## Required workflow behavior

1. Fetch the work item by ID from Azure DevOps and analyze it deeply.
2. Use reference knowledge such as regression plans, smoke plans, old testcases, and the user's testcase-writing style.
3. Generate manual testcases in the user's referenced Excel template.
4. Write cases in the user's style, with the quality bar of a senior QA / 10+ years experienced SDET.
5. Stop for user review before upload.
6. Upload the reviewed workbook into the specified Azure DevOps suite and test plan only after user confirmation.
7. Generate Playwright + TypeScript hybrid automation from the approved testcases.
8. Use BDD style for automation output.
9. Store automation code in a structured automation folder with pages, tests/features, fixtures, utils, config, packages, and related framework assets.
10. Execute through Playwright as the primary browser automation layer.
11. Use Chrome DevTools MCP only as a secondary layer for debugging, locator help, DOM inspection, and network or console diagnosis.
12. Publish execution outputs using Allure reports plus logs and artifacts.
13. Do not hallucinate results, steps, UI behavior, or temporary fixes.
14. If something fails due to framework or code issues, debug and fix properly instead of applying brittle workarounds.

## Mandatory tools

- Azure DevOps MCP
- Playwright MCP
- Chrome DevTools MCP as secondary support only

## Non-negotiable rules

- Accuracy over speed
- No blind upload after draft generation
- No assumption-based pass results
- Manual testcase draft must be reviewable before upload
- Automation should be generated from the approved testcase source, not from guessed behavior
- Reference testcase knowledge must be used for style, coverage ideas, validations, and domain behavior only; new story testcases must be freshly written for the current requirement and must not copy-paste old testcase content unless the user explicitly asks to reuse a specific case
- Every generated automated testcase must remain traceable by testcase ID through feature file name, scenario title, tags, manifest, and execution summary
