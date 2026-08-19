# Match Help Context - User Maintenance

Generated: 2026-06-09T18:05:32.848Z

Source: Cadency Help Edinburgh Match documentation.

Use this as functional context for STLCFlow story analysis and testcase generation. It is a paraphrased QA knowledge file, not a replacement for the live Help page.

## Scope

This file covers the Match functional area **User Maintenance**. Key child pages include About User Maintenance, Users Detail Screen, User Profiles List Screen. Use it with the regression-suite corpus in the parent knowledge folder when writing story-specific testcases.

## QA Focus

- Cover access granted/denied states by role, field visibility, disabled actions, and cross-sector restrictions.

## Child Pages

### About User Maintenance

- TOC path: Match > Accessing Match > System Security in Match > User Maintenance
- Source: https://cadencyhelp.lower.trintech.com/edinburgh/content/certificationadmin/view_users.htm
- Context: Setup/maintenance coverage: verify add, edit, save, cancel, required fields, duplicate handling, and validation messages.
- Context: Security coverage: verify authorized and unauthorized access, disabled actions, field visibility, sector scope, and role-specific results.
- Section cues: Related Topics

### Users Detail Screen

- TOC path: Match > Accessing Match > System Security in Match > User Maintenance > User Details Screen
- Source: https://cadencyhelp.lower.trintech.com/edinburgh/content/usersettingsscreen.htm
- Context: Setup/maintenance coverage: verify add, edit, save, cancel, required fields, duplicate handling, and validation messages.
- Context: Security coverage: verify authorized and unauthorized access, disabled actions, field visibility, sector scope, and role-specific results.

### User Profiles List Screen

- TOC path: Match > Accessing Match > System Security in Match > User Maintenance > User Profile Screen
- Source: https://cadencyhelp.lower.trintech.com/edinburgh/content/certificationadmin/reference/userlist.htm
- Context: Setup/maintenance coverage: verify add, edit, save, cancel, required fields, duplicate handling, and validation messages.
- Context: Security coverage: verify authorized and unauthorized access, disabled actions, field visibility, sector scope, and role-specific results.
- Section cues: Related Topics

## Testcase Generation Guidance

- Prefer story acceptance criteria over this background context.
- Use the source pages to identify screens, actions, fields, and expected outcomes for the Match module.
- Combine this module context with existing ADO regression patterns for realistic step wording and coverage depth.
- Include positive, negative, permission, navigation, data-state, and audit/result scenarios when relevant to the story.
