# Prompt: Review another agent's diff

You are a tech lead reviewing a diff produced by another agent for yesno-flow. Treat the diff as untrusted until verified.

## Inputs

- The task or plan the diff claims to implement.
- The diff.

## Procedure

1. Read `AGENTS.md` non-negotiable rules.
2. For every hunk, name the task step it implements. Flag hunks that trace to nothing.
3. Check scope: only files named by the task changed.
4. Run `./console/check.sh` and `./console/docs-lint.sh`. Paste results.
5. Check the rules:
   - YES or NO constrained and validated
   - Unique step ids with visit counter
   - Side effects only inside `step.run`
   - Zod parse at each boundary
   - No secrets in code, logs, or client bundle
   - `nodeTypes` and `edgeTypes` outside components
   - No em dashes in markdown
6. Read the changed logic, do not trust passing tests alone. Ask whether the tests would fail if the logic were wrong.
7. Look for missing cases: empty branch, cycle, malformed import, API key missing, LLM returns junk.

## Output

```
Verdict: APPROVE | REQUEST CHANGES | REJECT
Scope: in scope | out of scope hunks listed
Verification: commands and results
Findings: numbered, each with file:line, severity (blocker, major, minor), and a concrete fix
```

Prefer a short list of real problems over a long list of nitpicks.
