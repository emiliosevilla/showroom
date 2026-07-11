# How to contribute to this repository

You do not have direct write access to this repo. Every change must come through a Pull Request from your own fork, and the decision of what and when to merge is up to @emiliosevilla. The `prod` branch is for deployment and is managed exclusively by @emiliosevilla.

## Initial setup (one time only)

1. **Fork the repo**: go to this repository on GitHub and click "Fork" (top right). A copy will be created under your account: `youruser/showroom`.

2. **Clone your fork** (not the original one):
   ```bash
   git clone https://github.com/youruser/showroom.git
   cd showroom
   ```

3. **Add the original repo as `upstream`**:
   ```bash
   git remote add upstream https://github.com/emiliosevilla/showroom.git
   git remote -v
   ```
   You should see two remotes: `origin` (your fork, where you can write) and `upstream` (the original one, read-only for you).

## Before starting any task

Update your local `dev` branch with the latest from the original:
```bash
git fetch upstream
git checkout dev
git merge upstream/dev
git push origin dev
```

## Working on a task

Never work directly on `dev`. Create a branch for each feature or fix:
```bash
git checkout -b feature/descriptive-name upstream/dev
```

If you are going to have several tasks open at the same time, instead of switching branches and losing the state of what you had set up (`git stash` back and forth), you can use a **worktree**: a separate folder with its own branch, but sharing the same `.git` history:
```bash
git worktree add ../showroom-feature-x -b feature/descriptive-name upstream/dev
```
This way `showroom/` stays on `dev` and `showroom-feature-x/` has the working branch, both open at the same time without interfering with each other.

When you finish that task and want to free up the folder:
```bash
git worktree remove ../showroom-feature-x
```

## Pushing changes and opening the Pull Request

```bash
git add .
git commit -m "descriptive message"
git push origin feature/descriptive-name
```

On GitHub, go to your fork and click "Compare & pull request". Verify that:
- **base repository**: `emiliosevilla/showroom`, **base**: `dev`
- **head repository**: `youruser/showroom`, **compare**: `feature/descriptive-name`

Briefly describe what the change does and why.

## Review and integration

@emiliosevilla reviews the PR, may request changes (add them with more commits to the same branch; the PR updates automatically), and decides when and how it is integrated into `dev`. Subsequent promotion to `prod` does not require any action from you.

## Quick rules

- No direct push to `dev` or `prod` (in fact, you won't be able to: you don't have write permissions to the original repo).
- One PR = one feature or fix, as scoped as possible.
- When in doubt about whether something fits the project, ask before investing time in it.

## Cheatsheet

| I want to... | Command |
|---|---|
| Configure the original remote (once) | `git remote add upstream https://github.com/emiliosevilla/showroom.git` |
| Update my `dev` with the latest | `git fetch upstream && git checkout dev && git merge upstream/dev && git push origin dev` |
| Start a new task | `git checkout -b feature/x upstream/dev` |
| Start a new task in a separate folder (worktree) | `git worktree add ../showroom-feature-x -b feature/x upstream/dev` |
| Push my changes to my fork | `git push origin feature/x` |
| Open the PR | On GitHub: fork → "Compare & pull request" (base: `emiliosevilla/showroom`/`dev`) |
| Update an already open PR | New commits on the same branch + `git push origin feature/x` |
| Remove an already used worktree | `git worktree remove ../showroom-feature-x` |
