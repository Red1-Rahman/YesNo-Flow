---
name: chrome-devtools
description: Use Chrome DevTools through chrome-devtools-mcp for browser debugging, UI checks, automation, and performance inspection.
---

# Chrome DevTools MCP

Use this skill when Chrome DevTools MCP tools are available in the active agent session. A skill documents a workflow, it does not install or connect an MCP server.

## Browser workflow

1. Use `list_pages` to find the page ID, or `new_page` to open a page.
2. Use `navigate_page` to open the target URL.
3. Use `wait_for` for a known page condition.
4. Use `take_snapshot` to inspect the page structure and get element UIDs.
5. Use `click`, `fill`, and other interaction tools with the UIDs from a fresh snapshot.

For large snapshots, screenshots, or traces, prefer the `filePath` output option. Use pagination and type filters when available. Set `includeSnapshot: false` on input actions unless the updated page state is needed.

## Choosing tools

- Use `take_snapshot` for automation and page structure.
- Use `take_screenshot` for visual review.
- Use `get_css_styles` to inspect matched rules, the cascade, and CSS variables.
- Use `evaluate_script` for runtime DOM or JavaScript details not provided by the other tools. Pass `pageId` for page evaluation.

## Chrome DevTools MCP setup

The server can be configured in an MCP client with:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["chrome-devtools-mcp@1.11.0"]
    }
  }
}
```

Restart the MCP server or the client after changing its configuration. Extension tools require the `--categoryExtensions` flag. If extension tools are absent from the active tool list, stop and ask the user to enable that flag and restart the MCP server.

The Chrome DevTools MCP server starts Chrome on its first browser tool call. Its CLI options can be inspected with `npx chrome-devtools-mcp@1.11.0 --help`.

## Troubleshooting

If the MCP server cannot launch Chrome or interact with a page, use the [Chrome DevTools troubleshooting guide](https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/main/docs/troubleshooting.md). For manual inspection, see the [Chrome DevTools documentation](https://developer.chrome.com/docs/devtools/).
