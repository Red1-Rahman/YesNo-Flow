---
name: shadcn-ui
description: Build accessible UI with shadcn/ui and Tailwind in this project. Use when adding buttons, sheets, cards, tabs, badges, dialogs, toasts, or any editor chrome around the canvas.
triggers:
  - shadcn
  - shadcn ui
  - accessible components
---

# shadcn-ui

Curated from the Google Labs skills catalogue (https://github.com/google-labs-code/skills, category design-systems) and tuned for yesno-flow.

## Setup

```bash
npx shadcn@latest init
npx shadcn@latest add button card input textarea badge scroll-area sheet separator tooltip tabs dialog sonner
```

Components are copied into `src/components/ui`. Treat them as owned code, edit freely.

## Where to use what

| Need | Component |
| --- | --- |
| Edit node label and prompt | `Sheet` with `Input` and `Textarea` |
| Run input and run button | `Card`, `Textarea`, `Button` |
| Logs list | `ScrollArea`, `Badge` per answer |
| Toolbar actions with hints | `Button` with `Tooltip` |
| Import and export | `Dialog` or file input plus `sonner` toasts |
| Tabs for Logs and History | `Tabs` |

## Rules

1. Use `cn()` from `src/lib/utils.ts` to merge classes.
2. Use semantic tokens (`bg-card`, `text-muted-foreground`, `border`), not raw hex, except for the YES, NO, running, and error accents defined in one place (`src/lib/ui/status-colors.ts`).
3. Every icon-only button needs an `aria-label` and a `Tooltip`.
4. Status is never color alone: badge text `YES`, `NO`, `Running`, `Error` plus icon.
5. Support keyboard: Sheet closes on Escape, buttons focusable, visible focus ring.
6. Dark mode works through the shadcn CSS variables. Test both.
7. Keep canvas chrome small: toolbar top left, run panel right, logs bottom. The canvas stays the hero.

## Status badge pattern

```tsx
const variants = {
  YES: "bg-green-600/15 text-green-700 border-green-600/30",
  NO: "bg-red-600/15 text-red-700 border-red-600/30",
  running: "bg-blue-600/15 text-blue-700 border-blue-600/30",
  error: "bg-amber-600/15 text-amber-700 border-amber-600/30",
}
```

## Checklist

- [ ] No hardcoded hex outside `status-colors.ts`
- [ ] Icon buttons labelled
- [ ] Works at 1280px and 768px widths
- [ ] Focus ring visible
