---
name: playwright
description: Drive the yesno-flow app in a real browser with Playwright for end-to-end verification, UI checks, screenshots, and console/network inspection. Use when asked to verify a run visually, reproduce a UI bug, or smoke test the editor, run panel, logs, or import/export.
---

# Playwright browser verification

Use Playwright (via `npx playwright` or a one-off script with `playwright-core`) to verify yesno-flow in a real browser. Browser binaries are already installed on this machine (`%LOCALAPPDATA%\ms-playwright` on Windows, `~/.cache/ms-playwright` on Linux). The npm package is not a project dependency: never add it to `package.json` for a verification task. Run it ad hoc:

```bash
npx --yes playwright@latest --version        # check availability
npm exec --yes --package=playwright -- node script.js   # run a script without installing
```

For anything beyond a one-liner, write a throwaway script under the OS temp dir (for example `C:\Users\USER\AppData\Local\Temp\opencode`), not inside the repo, so it never gets committed.

## Prerequisites

1. Start the app: `npm run dev` (Next.js on :3000).
2. For real runs, also start Inngest: `npm run dev:inngest` (dashboard on :8288, calls back into :3000/api/inngest).
3. `OPENAI_API_KEY` must be set in `.env.local` for a run to be accepted.

## Minimal smoke script

```js
const { chromium } = require("playwright")

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  const errors = []
  page.on("console", (msg) => msg.type() === "error" && errors.push(msg.text()))
  page.on("pageerror", (err) => errors.push(String(err)))

  await page.goto("http://localhost:3000")
  await page.screenshot({ path: "editor.png", fullPage: true })

  // Run the seeded example through the UI
  await page.getByLabel("Input").fill("My order arrived broken, please help")
  await page.getByRole("button", { name: "Run", exact: true }).click()
  await page.getByText("succeeded", { exact: true }).waitFor({ timeout: 60000 })

  console.log("console errors:", errors)
  await browser.close()
})()
```

Use `firefox` / `webkit` from the same package for cross-browser checks; the local cache already has all three.

## What to verify for this project

| Check | How |
| --- | --- |
| Node execution state | After a run, node cards show a status badge (icon plus text, never color alone) |
| Active edge animation | The edge out of the last finished node on the taken branch has the `animated` class while the next node is running |
| Logs panel fills in | Step rows appear in order with answer badge, duration, attempt number |
| Polling stops on terminal | `page.on("request")` shows no further `/api/runs/:id` polls after `succeeded` or `failed` |
| Import validation | `page.setInputFiles` on the hidden file input with a broken JSON file; expect a toast and an unchanged canvas |
| Export | Click Export, capture the download event, assert filename `workflow-<name>.json` and valid JSON |
| Missing API key | Unset `OPENAI_API_KEY`, restart, run: expect a readable banner, no crash |
| Cycle guard | Build a 2-node cycle in the UI and run; expect the run to fail with the max steps message |

## Console and network notes

- Collect `console` errors and `pageerror` events on every check; the app must stay error free.
- The run store is in memory on the server: a dev-server restart makes an in-flight run 404. The UI shows the "connection lost" state; verify it appears instead of a crash.
- Polling interval is 700 ms. Use `waitFor` on visible text, never fixed `sleep`s.
- React Flow canvas elements have generated classes. Prefer `getByRole`, `getByLabel`, and visible text over CSS selectors.

## Pitfalls

- `npx playwright test` needs a config and spec files; for verification work a plain script with `playwright-core` style APIs is simpler and leaves no files in the repo.
- Do not commit screenshots or temp scripts into the repo.
- Clicking a node opens the node editor sheet; close it with Escape before other interactions.
- If the Run button stays disabled, the input is empty or a run is still submitting.
