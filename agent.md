# Agent Guide

## Project Overview

This repository is a Vite + React + TypeScript app for visualizing and editing FSD/Star Citizen-style keyboard action maps.

The main UI renders a full keyboard alongside grouped action bindings. Users can:

- browse action groups by category,
- highlight actions by keyboard key or modifier,
- import an existing `actionmap.xml`,
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
npm run lint
npm run preview
```

Notes:

- `npm run build` runs `vite build --mode development`.
- There is no test script currently.
- Run `npm run lint` after code changes when practical.

## Important Files

- `src/App.tsx`: top-level state wiring and context providers.
- `src/contexts.tsx`: shared React contexts for action groups, hover state, user action map, and rebinding state.
- `src/interfaces.ts`: domain types for parsed action maps and user rebinding data.
- `src/components/KeyboardFull/KeyboardFull.tsx`: renders keyboard rows from layout data.
- `src/components/KeyKB/KeyKB.tsx`: renders one key and handles key click/rebind behavior.
- `src/components/ActionMap/ActionMap.tsx`: renders action groups, import/export controls, and per-action edit controls.
- `src/utils/utils.ts`: parsing, initialization, i18n lookup, rebind/reset, and XML export helpers.
- `src/utils/layout.ts`: keyboard layout definition.
- `src/utils/keyCodes.ts`: browser `KeyboardEvent.code` to CIG input mapping and non-bindable keys.
- `src/utils/actionMapCategories.ts`: category grouping and hidden-group filtering.
- `src/data/defaultProfile.json`: bundled default action map source.
- `src/data/keybinding_localization.json`, `src/i18n/i18n.json`: localization data.
- `src/icons/actionIcon.ts`: action-to-icon mapping.

## Data Flow

1. `App.tsx` initializes default action groups from `defaultProfile.json` via `initDefaultActionGroups`.
2. Default actions are stored separately from user overrides.
3. Imported XML is parsed in `ActionMap.tsx` with `DOMParser` and `xmlToJson`, then converted to `UserActionmap` with `getUserActionmap`.
4. `App.tsx` merges `userActionmap` over default action groups into `combinedActionGroups`.
5. Keyboard and action-list components read `combinedActionGroups`.
6. Export uses `buildActionmapsXML` to inject the user overrides back into the imported XML shell when possible, or create a minimal `ActionMaps` document.

## Coding Conventions

- Keep changes small and aligned with the existing component structure.
- Existing TS/TSX files use double quotes, semicolons, and function components.
- Prefer the existing context model for shared UI state instead of adding global state libraries.
- Prefer existing helpers in `src/utils` before introducing new parsing or binding logic.
- Preserve the CIG input naming behavior: key/modifier values are lowercase strings such as `lctrl`, `rshift`, or `kb1_lctrl+f`.
- Use icons from `@mdi/js` with `@mdi/react` when adding icon buttons.
- Keep keyboard layout dimensions stable; changes to key sizing can easily affect the full keyboard rendering.

## UI Behavior Notes

- URL search params are part of the UI state:
  - `c` selects an action category.
  - `k` selects/highlights a key or modifier.
- Clicking a keyboard key filters by that key unless an action is currently being rebound.
- While rebinding, pressing a physical key is handled by the window `keydown` listener in `App.tsx`.
- Modifier selection is edited separately through the action row select.
- Some CIG inputs are intentionally non-bindable; check `cigInputNonBinable` before changing binding behavior.

## XML and Parsing Notes

- `getUserActionmap` currently expects the shape produced by `xmlToJson`.
- Be careful with imported XML that has missing groups, missing actions, or missing `rebind` nodes.
- `buildActionmapsXML` replaces content between the first `<actionmap` and `</ActionProfiles>` when an imported XML shell exists.
- When editing XML generation, validate both cases:
  - export after importing a real XML file,
  - export without importing a file first.

## Localization Notes

- User-facing action labels usually come from `UILabel` values and `i18nUI`.
- `i18nUI` defaults to `zh_Hans`.
- If a label has no translation, the app falls back to the raw label/action name.

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
  - import/export still produces usable XML.

For data-only changes:

- Confirm `defaultProfile.json` still matches the `RawDefaultProfile` shape in `src/interfaces.ts`.
- Confirm affected action groups still appear in `orderInfo.groupOrder` and `orderInfo.inGroupOrder`.

## Current Gaps

- No automated tests are configured.
- README still contains the default Vite template text.
- Some functions mutate nested `userActionmap` state before cloning the top-level object; keep that in mind when debugging React update behavior.
