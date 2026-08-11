# Plan: Finish Pending Showroom Work

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining Phase 3 refactor (hooks), fix the broken i18n lint, sync stale docs, and verify the app builds cleanly.

**Architecture:** Components were already extracted from `App.tsx` into `src/components/`. What remains is pulling filesystem/session scan flows into `useFileSystem` and dnd-kit handlers into `useDragAndDrop`, then wiring `App.tsx` to those hooks. No new product features.

**Tech Stack:** React 19, TypeScript strict, Vite 6, `@dnd-kit`, existing `src/i18n/translations.ts`, `src/utils/fileSystem.ts`.

**Branch:** `feat/finish-pending` (off `dev`). Do not commit on `dev`/`pre`/`prod`.

## Global Constraints

- Do not change product behavior (scan limits, DnD rules, export, i18n languages).
- Do not re-extract components that already exist under `src/components/`.
- Keep public hook APIs typed; avoid `any` where practical.
- Verification commands: `npm run lint` and `npm run build` must pass after Tasks 1–3.
- There is no unit-test suite; do not invent a test framework. Use lint + build as the automated gate.
- Follow existing code style in `src/App.tsx` and siblings.
- One logical commit per task (Conventional Commits: `fix:`, `refactor:`, `docs:`, `chore:`).
- Work only inside the plan worktree / feature branch.

## Current state (do not redo)

Already done: Phase 1 FS security, Phase 2 i18n, component extraction (`FileItem`, `ContainerColumn`, `ListViewTable`, `SplitMasterItem`, `PreviewTooltip`, `DroppableAreas`, `Modals/*` with `<dialog>`), `src/utils/theme.tsx`.

Still open: missing i18n key usage, hooks extraction, docs sync, lint/build verification, stale Dependabot remote branch cleanup.

---

### Task 1: Fix i18n lint error (`container_appearance`)

**Files:**
- Modify: `src/components/Modals/ContainerSettingsModal.tsx`
- Modify: `src/i18n/translations.ts` (only if adding a key; prefer reusing `container_settings`)

- [ ] **Step 1:** Confirm `t("container_appearance")` fails `tsc` because the key is absent; `container_settings` already maps to "Apariencia del Contenedor" / English equivalent.
- [ ] **Step 2:** Replace `t("container_appearance")` with `t("container_settings")` (or add the missing key to **all** languages in `translations.ts` if a distinct key is intentionally required — default: reuse `container_settings`).
- [ ] **Step 3:** Run `npm run lint` and confirm this specific error is gone.
- [ ] **Step 4:** Commit: `fix(i18n): use container_settings key in ContainerSettingsModal`

---

### Task 2: Extract `useFileSystem`

**Files:**
- Create: `src/hooks/useFileSystem.ts`
- Modify: `src/App.tsx`

Extract folder selection, scan, resume-session, fallback input, abort/cancel-scan, and the related state that only those handlers need, without changing behavior.

Include at minimum (names may match existing App locals):
- State: `step`, `folderName`, `dirHandle`, `scannedFiles`, `errorMsg`, and whatever refs (`abortControllerRef`, `fileInputRef`) those handlers require.
- Handlers: `handleSelectFolder`, `handleFallbackSelectFolder`, `handleResumeSession`, cancel-scan / abort wiring already in App.

Keep classification / editor UI state in `App` unless a piece is exclusively owned by the scan flow. Pass `t`, `classifyFiles`, `commit`/`setClassification` setters as needed so behavior stays identical.

- [ ] **Step 1:** Create `src/hooks/useFileSystem.ts` exporting `useFileSystem(...)` with a clear typed return object.
- [ ] **Step 2:** Wire `App.tsx` to the hook; delete duplicated handler bodies from App.
- [ ] **Step 3:** Run `npm run lint` and `npm run build`.
- [ ] **Step 4:** Commit: `refactor: extract useFileSystem hook from App`

---

### Task 3: Extract `useDragAndDrop`

**Files:**
- Create: `src/hooks/useDragAndDrop.ts`
- Modify: `src/App.tsx`

Extract dnd-kit sensors setup and `handleDragStart` / `handleDragOver` / `handleDragEnd`, plus tightly coupled locals (`activeId`, `fileDropFeedback`, and any selection/focus updates those handlers own).

The hook must accept the classification mutation helper currently used in App (e.g. `commitClassificationChange`), `selectedFiles` / setters, `focusedContainerId` / setters, `trashOriginalLocations` / setters, `t`, and return `{ sensors, activeId, fileDropFeedback, handleDragStart, handleDragOver, handleDragEnd }` (or equivalent names already used by JSX).

- [ ] **Step 1:** Create `src/hooks/useDragAndDrop.ts`.
- [ ] **Step 2:** Wire `App.tsx`; remove duplicated drag handlers/sensors from App.
- [ ] **Step 3:** Run `npm run lint` and `npm run build`.
- [ ] **Step 4:** Commit: `refactor: extract useDragAndDrop hook from App`

---

### Task 4: Sync roadmap docs with reality

**Files:**
- Modify: `docs/task.md`
- Modify: `docs/implementation_plan.md`

- [ ] **Step 1:** Mark completed Phase 3 component extraction items as `[x]` in `docs/task.md`.
- [ ] **Step 2:** Mark hooks extraction complete once Tasks 2–3 landed; leave Phase 4 verification notes accurate (lint/build automated; manual DnD/scan still recommended).
- [ ] **Step 3:** Update `docs/implementation_plan.md` open question: modals already use `<dialog>` — document as decided/done; note `App.tsx` line count after hooks (~target was 800; record actual).
- [ ] **Step 4:** Commit: `docs: sync Phase 3 status after hooks extraction`

---

### Task 5: Verification gate + Dependabot branch note

**Files:** none required (ops + report in commit message / SDD report only). Optional: none.

- [ ] **Step 1:** Run `npm run lint` — must exit 0.
- [ ] **Step 2:** Run `npm run build` — must exit 0.
- [ ] **Step 3:** Confirm `App.tsx` line count and that `src/hooks/useFileSystem.ts` + `src/hooks/useDragAndDrop.ts` exist.
- [ ] **Step 4:** Note in the task report that remote branch `origin/dependabot/npm_and_yarn/npm_and_yarn-f517038d3b` is stale (fix already on `dev`) and should be deleted by the human with:
  `git push origin --delete dependabot/npm_and_yarn/npm_and_yarn-f517038d3b`
  Do **not** delete remote branches from the agent if git pushes are restricted; leave the exact command in the report.
- [ ] **Step 5:** If any code tweak was needed for green lint/build, commit: `chore: verify Phase 3 completion`. Otherwise no commit — report DONE with evidence only.

---

## Out of scope

- New features, redesign, purple/dark-mode theme changes.
- Cascading merges to `pre`/`prod` (separate `/git` ship).
- Closing GitHub Dependabot alerts (already fixed on `dev`; UI lag is GitHub-side).
- Full manual QA in a browser (recommend after merge; not blocking this plan’s automated gate).
