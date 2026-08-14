#!/usr/bin/env bash
# Sync protected chain with PR + squash (no merge commits):
#   origin/dev -> pre -> prod
# Run after committing local work on dev.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

git fetch origin --prune

echo "==> Push local dev"
git checkout dev
git push origin dev

sync_hop() {
  local base="$1"
  local tip_ref="$2"
  local tip_name="${tip_ref#origin/}"
  local branch="sync/${tip_name}-into-${base}"

  echo "==> Sync ${tip_name} -> ${base} via ${branch}"
  git checkout -B "$branch" "origin/${base}"
  git checkout "$tip_ref" -- .
  git add -A
  if git diff --cached --quiet; then
    echo "No tree diff for ${base}; skipping PR"
    git checkout dev
    return 0
  fi
  git commit -m "sync: apply ${tip_name} tree onto ${base}"
  git push -u origin "$branch" --force
  url="$(gh pr create --base "$base" --head "$branch" --title "sync: ${tip_name} → ${base}" --body "Aplica el árbol de \`${tip_name}\` sobre \`${base}\` (PR + squash).")"
  echo "$url"
  gh pr merge --squash --admin --delete-branch=false
  git fetch origin
  git push origin --delete "$branch" 2>/dev/null || true
  git branch -D "$branch" 2>/dev/null || true
}

sync_hop pre origin/dev
git fetch origin
sync_hop prod origin/pre

echo "==> Refresh local tips"
git checkout pre && git reset --hard origin/pre
git checkout prod && git reset --hard origin/prod
git checkout dev && git reset --hard origin/dev

echo "OK"
git status -sb
git log --oneline -1 origin/dev
git log --oneline -1 origin/pre
git log --oneline -1 origin/prod
