# Next Steps

## Immediate next step when resuming

Validate and harden the new live intake and generation side of the workflow:

1. Run the new native ADO story-intake stage against a dynamic story and persist a normalized story snapshot
2. Run the native workbook generator from story analysis + reference knowledge + template
3. Compare the generated workbook quality against recent-release reference style and tighten heuristics where needed
4. Keep the review gate as the hard pause before upload
5. Feed the approved workbook into the existing automation generator and execution runner

## After those are provided

1. Expand scenario inference so fewer valid manual steps are blocked as `custom`
2. Add richer page objects for high-value Match modules:
   - Scheduler / recurring tasks
   - Task results
   - Batch import / export
   - Transaction Control
3. Run one controlled publish-enabled execution after user approval to validate ADO result updates end to end

## Resume prompt

`Resume STLCFlow from C:\Users\bsaikiran\STLCFlow. Read the project notes and continue from live validation of the native ADO story-intake and workbook-generation lane, then extend scenario inference and page objects as needed.`
