# Agent Guide

## Update Reference

- Last updated against commit: `52528c3bfc833a95c2bb61194fe84a59a51827bc` (`feat: automate keybinding i18n updates`, 2026-05-08 22:17:56 +0800).

## Project Overview

This repository is a Vite + React + TypeScript app for visualizing and editing FSD/Star Citizen-style keyboard action maps.

The main UI renders a full keyboard alongside grouped action bindings. Users can:

- browse action groups by category,
- highlight actions by keyboard key or modifier,
- import an existing `actionmap.xml`,
- read and overwrite the default game `actionmaps.xml` path in Chromium-based browsers,
- rebind keyboard actions in the browser,
- export a rebuilt `actionmap.xml`.

## Tech Stack

- React 18
- TypeScript
- Vite
- React Router search params for UI filter state
- ESLint flat config
- `@mdi/react` and `@mdi/js` for icons

## Common Commands

Use npm; the repo has `package-lock.json`.

```bash
npm install
npm run dev
npm run build
npm run update:keybinding-i18n
npm run lint
npm run preview
```

Notes:

- `npm run build` runs `vite build --mode development`.
- `npm run update:keybinding-i18n` regenerates compact locale files from 42kit `global.ini` sources and the bundled default profile.
- There is no test script currently.
- Run `npm run lint` after code changes when practical.

## Important Files

- `src/App.tsx`: top-level state wiring and context providers.
- `src/contexts.tsx`: shared React contexts for action groups, hover state, user action map, and rebinding state.
- `src/interfaces.ts`: domain types for parsed action maps and user rebinding data.
- `src/components/KeyboardFull/KeyboardFull.tsx`: renders keyboard rows from layout data.
- `src/components/KeyKB/KeyKB.tsx`: renders one key and handles key click/rebind behavior.
- `src/components/ActionMap/ActionMap.tsx`: renders virtualized action groups, category/key filtering, group collapse state, and per-action edit controls.
- `src/components/ActionMapFileConsole/ActionMapFileConsole.tsx`: handles uploaded XML files, Chromium File System Access API imports/overwrites, and XML downloads.
- `src/utils/utils.ts`: parsing, initialization, i18n lookup, rebind/reset, and XML export helpers.
- `src/utils/xmlToJson.ts`: DOM XML to JSON conversion used by imported action map parsing.
- `src/utils/layout.ts`: keyboard layout definition.
- `src/utils/keyCodes.ts`: browser `KeyboardEvent.code` to CIG input mapping and non-bindable keys.
- `src/utils/actionMapCategories.ts`: category grouping and hidden-group filtering.
- `src/data/defaultProfile.json`: bundled default action map source.
- `src/i18n/keybinding/en.json`, `src/i18n/keybinding/zh.json`: compact generated action/group label localization files.
- `src/icons/actionIcon.ts`: action-to-icon mapping.
- `scripts/update-keybinding-i18n.mjs`: regenerates keybinding localization from 42kit `global.ini` sources.
- `.github/workflows/update-keybinding-i18n.yml`: weekly/manual localization refresh workflow that commits changed generated locale files.

## Data Flow

1. `App.tsx` initializes default action groups from `defaultProfile.json` via `initDefaultActionGroups`.
2. Default actions are stored separately from user overrides.
3. `ActionMapFileConsole.tsx` can load XML from upload or the default game path `USER/Client/0/Profiles/default/actionmaps.xml`.
4. Loaded XML is parsed with `DOMParser` and `xmlToJson`, then converted to `UserActionmap` with `getUserActionmap`.
5. `App.tsx` merges `userActionmap` over default action groups into `combinedActionGroups`.
6. Keyboard and action-list components read `combinedActionGroups`.
7. Export/download/overwrite uses `buildActionmapsXML` to inject user overrides back into the imported XML shell when possible, or create a minimal `ActionMaps` document.

## Coding Conventions

- Keep changes small and aligned with the existing component structure.
- Existing TS/TSX files use double quotes, semicolons, and function components.
- Prefer the existing context model for shared UI state instead of adding global state libraries.
- Prefer existing helpers in `src/utils` before introducing new parsing or binding logic.
- Preserve the CIG input naming behavior: key/modifier values are lowercase strings such as `lctrl`, `rshift`, or `kb1_lctrl+f`.
- Use icons from `@mdi/js` with `@mdi/react` when adding icon buttons.
- Keep keyboard layout dimensions stable; changes to key sizing can easily affect the full keyboard rendering.
- Keep `src/i18n/keybinding/*.json` generated; update the generator script or manual translation map instead of hand-editing large generated locale payloads.

## UI Behavior Notes

- URL search params are part of the UI state:
  - `c` selects an action category.
  - `k` selects/highlights a key or modifier.
- Clicking a keyboard key filters by that key unless an action is currently being rebound.
- While rebinding, pressing a physical key is handled by the window `keydown` listener in `App.tsx`.
- Modifier selection is edited separately through the action row select.
- ActionMap lives in a right sidebar that can be collapsed and resized; width is clamped relative to root `rem` and viewport size.
- The action list is virtualized and groups are collapsible. Keep row heights stable when changing action/group rows.
- Some CIG inputs are intentionally non-bindable; check `cigInputNonBinable` before changing binding behavior.
- Local-path import/export depends on `window.showDirectoryPicker`; non-Chromium browsers should still support upload/download XML.

## XML and Parsing Notes

- `getUserActionmap` currently expects the shape produced by `xmlToJson`.
- Be careful with imported XML that has missing groups, missing actions, or missing `rebind` nodes.
- `buildActionmapsXML` replaces content between the first `<actionmap` and `</ActionProfiles>` when an imported XML shell exists.
- When editing XML generation, validate both cases:
  - export after importing a real XML file,
  - export without importing a file first.

## Localization Notes

- User-facing action labels usually come from `UILabel` values and `i18nUI`.
- `i18nUI` normalizes locales to `zh` by default, uses `en` when requested, and falls back through English before returning raw non-token labels.
- Generated keybinding locale files live in `src/i18n/keybinding/`.
- The updater reads required labels from `src/data/defaultProfile.json`, fetches 42kit zh/en `global.ini` sources by default, applies a small manual translation map, and writes sorted compact JSON.
- GitHub Actions refreshes keybinding i18n weekly on Friday 00:30 China Standard Time and can also be run manually.

## Validation Checklist

For UI or binding changes:

- Run `npm run lint`.
- Run `npm run build`.
- Start `npm run dev` and verify:
  - keyboard renders,
  - category filter works,
  - key highlight/filter works,
  - action row hover highlights the key,
  - rebind flow updates the displayed binding,
  - ActionMap sidebar collapse and resize work,
  - action group collapse and virtualized scrolling work,
  - upload/download XML still produces usable XML,
  - Chromium local-path import/overwrite still works when changing file-console behavior.

For data-only changes:

- Confirm `defaultProfile.json` still matches the `RawDefaultProfile` shape in `src/interfaces.ts`.
- Confirm affected action groups still appear in `orderInfo.groupOrder` and `orderInfo.inGroupOrder`.
- For generated keybinding localization changes, run `npm run update:keybinding-i18n` and review only `src/i18n/keybinding/en.json` and `src/i18n/keybinding/zh.json`.

## Current Gaps

- No automated tests are configured.
- README still contains the default Vite template text.
- Some functions mutate nested `userActionmap` state before cloning the top-level object; keep that in mind when debugging React update behavior.
