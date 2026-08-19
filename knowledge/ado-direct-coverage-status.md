# ADO Direct Coverage Status

## Purpose

Track which Azure DevOps descendant suites have been structurally catalogued and which have been directly harvested for testcase knowledge.

Status meanings:

- `harvested` = direct testcase payloads were pulled from ADO and reviewed
- `empty` = direct testcase query returned no cases
- `inventory` = suite is catalogued from the ADO tree, but direct testcase payloads were not pulled in this pass

## Root `6357 / 70798` Match Angular

### `171004` Match Smoke Tests

- `171005` New Suite — `empty`
- `171006` New Suite — `empty`

### `122298` Match Angular Automation

- `122299` Match Rules and Sets — `harvested`
- `122300` Transactions — `inventory`
- `122301` SmartMatch — `harvested`
- `122302` Search — `harvested`
- `122303` Archive Reconciliations — `harvested`
- `122304` Exceptions — `harvested`
- `122305` Preferences — `harvested`
- `122306` Smart Resolve — `harvested`
- `122307` Transaction Control/CorrectImport — `harvested`
- `122308` Amortization/Depreciation — `harvested`
- `122309` Archive Transactions — `harvested`
- `122310` GL Integration — `harvested`
- `122311` Reference Definitions — `harvested`
- `122312` Transaction Criteria — `harvested`
- `122313` Tasks — `harvested`
- `122314` Custom Reports (Legacy) — `empty`
- `122316` Bulk Actions — `harvested`
- `122318` Supplemental Fields — `harvested`
- `122319` Balance Control — `harvested`
- `122321` Match Affinity — `empty`
- `122322` Risk Rating — `harvested`
- `122323` Audits — `harvested`
- `122324` Help — `empty`
- `122325` Bulk Import/Export Configuration Items — `empty`
- `122326` Log In — `empty`
- `122327` Import Translations — `harvested`
- `122328` Legacy Reports — `harvested`
- `122329` Performance — `empty`
- `122330` Operational Structure — `harvested`
- `122332` Intellicus Reporting — `empty`
- `122333` Location Manager — `harvested`
- `122334` Import Validation — `harvested`
- `122335` Information Setup (TS) — `harvested`
- `122336` BAI Replacement (TS) — `harvested`
- `122337` Password Reset — `empty`
- `127619` General System Parameters — `harvested`
- `131099` Security Profiles — `harvested`

### `164203` Match Angular Manual

- `153809` Locale — `harvested`
- `155543` Performance Testing — `harvested`
- `155962` Duplicate Checking Definition — `harvested`
- `161554` MBCS Test — `empty`
- `161560` Transactions — `harvested`
- `161562` GL integration — `harvested`
- `161563` Import validation — `empty`
- `161564` Information Setup — `empty`
- `161565` Location manager — `empty`
- `161566` Match rules and sets — `empty`
- `161567` Reference definitions — `empty`
- `161568` SmartResolve procedures — `empty`
- `161569` Transaction criteria — `empty`
- `161570` Operation structure — `empty`
- `161588` Unattached contact — `empty`
- `161589` User group manager — `empty`
- `161596` Calendars — `empty`
- `161597` Security Profile — `empty`
- `161598` Sectors — `empty`
- `161600` Tasks — `harvested`
- `161601` Legacy Reports — `harvested`
- `161604` MBCS stories — `harvested`
- `161769` Match Integration — `harvested`
- `162221` Archive — `empty`
- `162222` Archive Amortization — `harvested`
- `162223` Amortization — `harvested`
- `162229` Amortization/Depreciation — `harvested`
- `164208` Calendars — `empty`
- `164264` Integration — `harvested`
- `164275` Purge — `harvested`
- `172685` Masking Definitions — `harvested`
- `176191` Command Bar — `empty`
- `176767` Tasks - Recurring — `harvested`
- `176773` Account Manager — `harvested`
- `182496` Batch Import Defintion — `harvested`
- `188805` Match Dashboard — `harvested (partial paging)`
- `188812` Daily Recs — `harvested`
- `188820` User Permissions — `harvested`

## Root `6357 / 149176` TDL

- `148140` TDL Transactions — `harvested`
- `148145` TDL Log In/Security — `harvested`
- `148399` TDL Reconciliations — `harvested`
- `149177` TDL Archive — `empty`
- `149178` TDL Archive Transactions — `harvested`
- `149179` TDL Archive Reconciliations — `harvested`
- `149223` TDL Amortization/depreciation — `harvested`
- `149237` TDL Transaction Criteria — `harvested`
- `149279` TDL Tasks — `harvested`
- `149295` TDL Legacy Reports — `harvested`
- `149338` TDL RCP — `harvested`
- `158765` TDL Deployment — `harvested`
- `177687` TDL Archive Amortization — `harvested`
- `182507` TDL Admin — `harvested`

## Root `191930` Latest Release Match Plan

### Full leaf inventory captured from ADO

- `192020` 190445 : Recurring Tasks - Report - QA Only — `harvested`
- `192192` Batch Import Definition — `inventory`
- `192949` 190341 : SM SmartMatch - Checking and then Highlighting... — `inventory`
- `192993` 190336 : SmartMatch - Checked Transaction Disappears... — `inventory`
- `193042` 166323 : Task Settings are removed when moving tasks... — `inventory`
- `193677` 187045 : Reccuring Task - ACH - QA Only — `inventory`
- `193995` 186238 : Recurring Tasks - Export - QA Only — `inventory`
- `194005` 192487 : Recurring Tasks - Recurrence - Daily - QA Only — `inventory`
- `194364` 186239 : Recurring Tasks - GL Account Update - QA Only — `inventory`
- `194398` Amortization/Depreciation — `inventory`
- `194443` 192488 : Recurring Tasks - Recurrence - Weekly - QA Only — `inventory`
- `194865` 189601 : Truist-Standard Report Template Name cuts off... — `inventory`
- `194872` 186195 : Recurring Tasks - Custom report - QA Only — `inventory`
- `195073` 192489 : Recurring Tasks - Recurrence - Monthly - QA Only — `inventory`
- `195083` 186196 : Recurring Tasks - Exception Identification - QA Only — `inventory`
- `195102` Operational Structure — `inventory`
- `195319` 192490 : Recurring Tasks - Recurrence - Expert - QA Only — `inventory`
- `195328` 154236 : Legacy Reports - Remove ID Fields... — `inventory`
- `195493` 189576 : Reccuring Task - Automatching QA Only — `inventory`
- `195533` Transactions — `inventory`
- `195537` 148072 : Tasks - Security for Bundled Tasks — `inventory`
- `195757` 186194 : Recurring Tasks - Batch import - QA Only — `harvested`
- `197306` 193572 : Transaction Archive — `inventory`
- `197324` 159035 : Operational Structures - Success message... — `inventory`
- `197407` 190446 : Recurring Tasks - Structure Import - QA Only — `harvested`
- `197548` ACH Mapping — `inventory`
- `197560` 186191 : Reccuring Task - Archive - QA Only — `inventory`
- `197661` 127295 : Export Template - List View — `inventory`
- `197857` 173004 : Recurring Tasks - Scheduler view Task ID — `inventory`
- `198199` 189577 : Recurring Tasks - External process - QA Only — `inventory`
- `198243` 196038 : Scheduling calendars not immediately available — `inventory`
- `198395` 186529 : Recurring Tasks - Recurrence update for Filespy - QA Only — `inventory`
- `198507` 195847 : Truist accounts fail to initialize via Job Interface... — `inventory`
- `199456` 197160 : Scheduling Calendars - change name causing error... — `inventory`
- `199461` 159032 : Operational Structures - Leave this page missing... — `inventory`
- `199507` 189581 : Archive - Daily Reconciliation List view - QA Only — `inventory`
- `199548` 191472 : Recurring Tasks - Archive - Add Reconciliation - QA Only — `inventory`
- `199558` 191471 : Launch Task - Archive - Add Reconciliation - QA Only — `inventory`
- `199597` 195844 : Matched by User criteria not persisting... — `inventory`
- `199612` 187031 : Archive - Daily Reconciliation Archive doesn't show... — `inventory`
- `199756` 194263 : Permission inconsistency with task in RCP — `inventory`
- `199888` 142316 : Child tasks kicking off outside of Parent task time — `inventory`
- `200016` 190444 : Recurring Tasks - Pay Return Import - QA Only — `harvested`
- `200024` 192494 : Recurring Tasks - Recurrence - File Spy Enabled - QA Only — `inventory`
- `200550` 191473 : Recurring Tasks - Bundled task group process - QA Only — `harvested`
- `200760` 195511 : Recurring Tasks - Results - QA Only — `harvested`
- `201102` 172997 : Recurring Tasks - View with External Scheduler option enabled — `inventory`
- `201240` 195271 : Security Profile permission for GL Account Update execution — `inventory`
- `201417` 190440 : Recurring Tasks - Batch Report - QA Only — `inventory`
- `201425` 186192 : Reccuring Task - Batch export - QA Only — `inventory`
- `201441` 184055 : SmartMatch - allow View to be picked separately — `inventory`
- `201488` 200451 : Tree View Fixes — `inventory`
- `201569` Preferences — `inventory`
- `201593` 169749 : Recurring Tasks - Scheduler Tree View — `inventory`
- `201753` 183153 : Report header color change — `inventory`
- `201761` 192492 : Recurring Tasks - Recurrence - File Spy - QA Only — `inventory`
- `201857` 154263 : Daily Recs - Report Enhancements — `inventory`
- `201862` 195840 : TRECSACCOUNT Description — `inventory`
- `201883` 184535 : Reccuring Task - Hide background tasks — `inventory`
- `201889` 191158 : Copied file names from Enterprise console remove whitespace — `inventory`
- `202457` 190443 : Recurring Tasks - Pay Return Export - QA Only — `harvested`
- `202541` 199524 : Daily Recons amount is not adhering to decimal place selection — `inventory`
- `202971` 186528 : Recurring Tasks - Custom Process - QA Only — `inventory`
- `203128` 190442 : Recurring Tasks - Import translation import process - QA Only — `inventory`
- `203291` 160570 : MRS - Navigation from Match rule sets — `inventory`
- `203297` 190441 : Recurring Tasks - SmartResolve - QA Only — `inventory`
- `203318` General System Parameters — `inventory`
- `203359` 200542 : Add File Spy and Child Task Options to Dependent Recurring Tasks — `inventory`
- `203372` 182432 : Recurring Tasks - Audits — `inventory`
- `203554` 200541 : Add Post-Completion Execution Options to Recurring Tasks — `harvested`
- `203602` Amortization/Depreciation — `inventory`
- `203846` 197711 : Recurring Tasks - Can not view a scheduled task if you do not have access to the sector — `harvested`
- `203876` 165709 : Transaction Control - Does not reflect totals until you validate the batch — `inventory`
- `203942` 201689 : Remove Unsupported Task Types from Recurring Tasks and Keep Custom Process in Launch Task — `harvested`
- `204003` 195845 : Legacy Report Template Update Fails When OS level name is Account/Accounts — `inventory`
- `204039` 168785 : SM Search - Transaction criteria filter with More options — `inventory`
