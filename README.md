# STLCFlow

Persistent working notes and bootstrap files for the end-to-end agentic QA and automation workflow.

## Resume command

Use a prompt like this after a break:

`Resume STLCFlow from C:\Users\bsaikiran\STLCFlow. Read README.md, requirements.md, references.md, decisions.md, and next-steps.md, then continue from the pending step.`

## Current purpose

Build a workflow that:

- fetches a work item from Azure DevOps
- analyzes story details plus reference knowledge
- generates reviewed manual testcases in the user's Excel template
- pauses for user review
- uploads approved testcases to a target suite and test plan
- generates BDD Playwright TypeScript automation from the approved cases
- executes through Playwright
- publishes logs and Allure reports

## Agent architecture

The workflow is still executed as ordered stages, but stage work is now owned by five project agents under `src/orchestrator/agents/`:

- Story Agent: story analysis, workbook/testcase generation, and reviewed workbook upload
- Scenario Exploration Agent: UI discovery and Playwright-first evidence planning
- Locator Agent: locator strategy, selector ranking, and locator handoff rules
- Framework Agent: BDD features, scenario data, page-object/action integration, and traceability
- Maintenance Agent: execution, failure classification, self-healing policy, refactoring guidance, and report checks

Agent metadata is defined in `src/orchestrator/agents/agent-catalog.ts`. Stage results include `agentKey` where an agent owns that stage, and `npm run workflow:playwright` prints the agent next to each stage.

## Current status

- Project scaffold is in place
- ADO-backed reference knowledge artifacts are stored under `knowledge/`
- Playwright + TypeScript + BDD framework baseline is built
- Approved workbook to generated automation flow is built
- Story execution summary, Allure output, and ADO result publication path are built
- Live ADO story-intake and native workbook-generation code are now implemented in STLCFlow
- Shared automation framework source now follows the reference repo pattern under `tests/`
  - `tests/bdd/features/`
  - `tests/bdd/steps/`
  - `tests/bdd/fixtures/`
  - `tests/bdd/hooks/`
  - `tests/pages/`
  - `tests/utils/`
  - `tests/data/`
- Story-specific generated automation is isolated per story under:
  - `tests/bdd/features/generated/<storyId>/`
  - `tests/data/generated/<storyId>/`
- Old-project-style top-level workflow entry points now exist:
  - `npm run workflow:playwright -- --story-id=<id> --suite-id=<id> --test-plan-id=<id> ...`
  - `.\STLCCompleteWorkFlow-Playwright.ps1 -StoryId <id> -SuiteId <id> -TestPlanId <id>`
- The next step is cleaning the stale old `automation/` generated-source leftovers and hardening the flow on more dynamic stories
