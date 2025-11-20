# Salesforce Team - Definition of Ready & Done

This folder contains the real-world Definition of Ready (DoR) and Definition of Done (DoD) from a Salesforce development team.

## Files

### `definition-of-ready.yaml`
**11 criteria** that must be met before a PBI can be started in a sprint.

**Categories:**
- Functional (requirements, acceptance criteria)
- Technical (solution direction, dependencies)
- Testing (test script, test data)
- Localization (Dutch translation)
- Process (demo strategy, process concept)
- Approval (key-user sign-off)
- Estimation (story points)
- Prioritization (MoSCoW)

**Key Highlights:**
- All requirements have Dutch translations (`requirement_nl`)
- Each item has a `refinement_task` to close gaps
- Priority levels: critical, high, medium
- Focused on Salesforce-specific needs (metadata, permissions)

### `definition-of-done.yaml`
**14 criteria** that must be met before a PBI is considered "done".

**Responsibilities:**
- **Developers** (9 items):
  - Dutch translation implementation
  - Development completion
  - Test environment deployment
  - Technical peer review
  - UAT/production preparation
  - Technical documentation
  - Release notes
  - Demo preparation

- **Functional Testers** (4 items):
  - Acceptance criteria testing
  - Test script execution
  - CRUD permissions testing (including anti-tests)
  - Integration testing

- **Process Analyst** (1 item):
  - Process documentation in Engage

- **Product Owner** (1 item):
  - Final approval

**Key Highlights:**
- Multi-role workflow (developer → tester → PO)
- Salesforce-specific requirements:
  - Metadata validation
  - CRUD permission testing
  - Change set/package creation
  - Anti-testing (negative scenarios)
- Dutch localization throughout
- Documentation in multiple places (code comments, release notes, Engage)

## Usage in Backlog Chef

These DoR/DoD files will be used by **Feature #004: Definition of Done → Task Generation** to:

1. **Check DoR Compliance**
   - Parse PBI content
   - Identify which DoR criteria are missing
   - Generate refinement tasks to close gaps

2. **Generate Implementation Tasks**
   - For each DoD item, create a task
   - Assign to appropriate role (developer, tester, etc.)
   - Link to acceptance criteria
   - Suggest Claude Code agents/skills where applicable

3. **Role-Based Task Assignment**
   ```json
   {
     "task": "Implement Dutch translation",
     "dod_reference": "dod-sf-001",
     "responsibility": "developer",
     "agent_hint": "clean-apex-architect"
   }
   ```

## Example: Task Generation Flow

**Input PBI:**
```
Title: "Add permit approval workflow"
AC: User can approve permits in bulk
DoR Status: Missing test script (dor-sf-005)
```

**Generated Tasks:**

**Pre-Work (DoR Gaps):**
1. ❌ `dor-sf-005` missing → Task: "Create test script and prepare test data"

**Implementation (DoD):**
1. Task: "Implement Dutch translations for approval UI" (`dod-sf-001`)
2. Task: "Develop bulk approval logic" (`dod-sf-002`)
3. Task: "Deploy to test environment" (`dod-sf-003`)
4. Task: "Request peer review - verify metadata" (`dod-sf-004`)
5. Task: "Create change set for UAT/production" (`dod-sf-005`)
6. Task: "Test acceptance criteria" (`dod-sf-006`)
7. Task: "Execute test script" (`dod-sf-007`)
8. Task: "Test CRUD permissions + anti-tests" (`dod-sf-008`)
9. Task: "Test integrations" (`dod-sf-009`)
10. Task: "Add code comments and ApexDoc" (`dod-sf-010`)
11. Task: "Update release notes" (`dod-sf-011`)
12. Task: "Update process docs in Engage" (`dod-sf-012`)
13. Task: "Prepare demo" (`dod-sf-013`)
14. Task: "Demo to PO for approval" (`dod-sf-014`)

## Localization Notes

This team operates in Dutch (`nl-NL`). Key terms:

| English | Dutch |
|---------|-------|
| Definition of Ready | Definitie van Gereed |
| Definition of Done | Definitie van Klaar |
| Acceptance Criteria | Acceptatiecriteria |
| Test Script | Test script |
| Functional Test | Functionele test |
| Release Notes | Releasenotes |
| Process Description | Proces beschrijving |

## Anti-Testing (Negative Testing)

The Salesforce DoD specifically mentions **anti-testing** (`anti-testen`) in `dod-sf-008`:

> Test CRUD permissions and verify users who SHOULD NOT have access are properly blocked

This is critical for Salesforce security testing - ensuring:
- Users without permission cannot see records
- Profile/permission set boundaries are enforced
- OWD (Organization-Wide Defaults) work correctly
- Sharing rules are properly configured

## Integration with Claude Code Skills

When generating tasks, the system can suggest relevant Claude Code skills:

| DoD Item | Suggested Skill |
|----------|-----------------|
| `dod-sf-001` | None (manual translation) |
| `dod-sf-002` | `clean-apex-architect`, `salesforce-development` |
| `dod-sf-003` | Bash (`sf project deploy`) |
| `dod-sf-005` | `salesforce-packaging` |
| `dod-sf-008` | `salesforce-security-model` |
| `dod-sf-009` | `salesforce-integration-patterns` |
| `dod-sf-010` | `documentor` |

## Team Context

This DoR/DoD reflects a real Salesforce team that:
- Works in Dutch language environment
- Uses Engage for process documentation
- Emphasizes security (CRUD testing)
- Has multi-role workflow (dev → test → PO)
- Deploys via change sets or packages
- Maintains technical docs as code comments

## Future Enhancements

Potential additions to make this even more useful:

1. **Task Templates with Variables**
   ```yaml
   task_template: "Test CRUD permissions for {object_name} with {profile_list}"
   ```

2. **Conditional DoD Items**
   ```yaml
   applies_when:
     - has_integration: true
     - has_ui_changes: true
   ```

3. **Estimated Effort per DoD Item**
   ```yaml
   estimated_effort: "2 hours"
   ```

4. **Task Dependencies**
   ```yaml
   depends_on: ["dod-sf-002", "dod-sf-003"]
   ```

---

**Last Updated:** November 20, 2025
**Version:** 1.0
**Team:** Salesforce Development Team
**Language:** Dutch (NL)
