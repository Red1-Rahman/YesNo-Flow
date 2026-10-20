---
name: prompt-library-builder
description: Turn recurring AI requests into reusable, parameterized prompt templates. Use when writing or improving node prompts, building example workflows, or organizing prompts for this project.
---

# Prompt library builder

In this project the reusable unit is a **decision prompt**: one yes/no question a node asks about the run input. This skill helps capture good ones, parameterize them, and keep them organized.

## What a reusable decision prompt looks like

- One question, answerable with YES or NO.
- Explicit about the criterion, with a tie-break rule for borderline cases.
- Independent of the input wording (the input is supplied at run time).
- Short. Under 400 characters is a good target.

## Template

```
Question: [Is the input <criterion>?]
YES when: [clear positive condition]
NO when: [clear negative condition]
If unclear: [answer NO | answer YES]
```

## Starter set

| Name | Prompt | Domain |
| --- | --- | --- |
| support-request | Is this a request for help with an existing product or order? Borderline: answer NO. | Routing |
| sales-intent | Does the sender express interest in buying, pricing, or a demo? Borderline: answer NO. | Routing |
| urgent | Does the message describe an outage, security issue, or deadline within 24 hours? Borderline: answer NO. | Triage |
| has-pii | Does the text contain a person's email, phone number, or home address? Borderline: answer YES. | Safety |
| is-english | Is the text primarily written in English? Borderline: answer YES. | Preprocessing |

## Organize by

1. Domain (routing, triage, safety, preprocessing).
2. Position in a flow (entry classifier, mid-flow filter, final gate).

## Storing

- Ship starter workflows as JSON under `src/examples/*.json`, validated by `WorkflowSchema`.
- A template gallery in the UI can load these through the same import path as user JSON.

## Improve loop

1. Run the node on 5 positive and 5 negative sample inputs.
2. Record misses.
3. Tighten the criterion or tie-break rule.
4. Keep the sample inputs next to the prompt as test fixtures.

## Anti-patterns

- Compound questions (two questions joined by "and").
- Prompts that ask for explanations or formatting (the answer is only YES or NO).
- Prompts that embed the sample input.
- No tie-break rule.
