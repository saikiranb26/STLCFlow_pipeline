# References

Fill these values before implementation starts.

## Excel template

- Template path: `C:\Users\bsaikiran\STLCFlow\knowledge\Referenced Template VSTS.xlsx`

## Reference knowledge from Azure DevOps

- Reference test plan IDs:
  - `6357` - Master Regression Test Plan
  - `191930` - Latest release Match plan
- Reference suites:
  - Under plan `6357`:
    - `70798` - Match Angular
    - `149176` - TDL

## Old testcase sources

- Old workbook paths: `Pending from user`
- Style sample paths: `Pending from user`

## Environment references

- Primary application environment: `Pending from user`
- Login/data strategy: `Pending from user`
- Navigation path behavior: `Pending from user`

## Notes

- Reference plans will be used for testcase-writing style, coverage patterns, module cues, and realistic scenario ideas.
- Reference plans must not override the current story.
- Old testcases are pattern sources only and should not be copied or pasted into new story testcases.
- `191930` is the current latest-release reference plan.
- `6357` is the master regression reference plan in ADO.
- Any plan ID or suite ID provided by the user must be treated as a root node for recursive analysis.
- Knowledge extraction must traverse parent suites and all descendant child suites instead of stopping at the parent level.
- The workflow should build feature knowledge from the full suite hierarchy under each provided root.
- Direct ADO verification confirmed:
  - suite `70798` = `Match Angular`
  - suite `149176` = `TDL`
- A normalized local knowledge cache already exists for:
  - `cadency-plan-191930-recurring-user-reference-knowledge.json`
  - `cadency-master-regression-plan-6357-manual-knowledge.json`
  - `cadency-master-regression-plan-6357-automation-knowledge.json`
- Local cache should be treated only as a convenience layer, not as the source of truth.
- Visual Studio project data through ADO MCP is the primary source of truth for plan and suite analysis.
- Direct ADO analysis artifacts for the current pass are stored in:
  - `C:\Users\bsaikiran\STLCFlow\knowledge\match-application-reference-analysis.md`
  - `C:\Users\bsaikiran\STLCFlow\knowledge\ado-direct-coverage-status.md`
  - `C:\Users\bsaikiran\STLCFlow\knowledge\latest-release-recurring-patterns.md`
