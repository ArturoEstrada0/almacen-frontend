#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   BACKEND_REPO=almacen-backend FRONTEND_REPO=almacen-frontend ./scripts/create_github_repos.sh
# Requires: gh (GitHub CLI) authenticated, git

BACKEND_REPO=${BACKEND_REPO:-}
FRONTEND_REPO=${FRONTEND_REPO:-}
VISIBILITY=${VISIBILITY:-public}

if [[ -z "$BACKEND_REPO" || -z "$FRONTEND_REPO" ]]; then
  echo "Please set BACKEND_REPO and FRONTEND_REPO environment variables."
  echo "Example: BACKEND_REPO=almacen-backend FRONTEND_REPO=almacen-frontend ./scripts/create_github_repos.sh"
  exit 1
fi

ROOT_DIR=$(pwd)
TMP_DIR=$(mktemp -d)
echo "Working from $ROOT_DIR, temp $TMP_DIR"

echo "=== Create backend repo from subtree (preserves history for backend/) ==="
# Create a branch with only backend history using subtree
git fetch --all
git subtree split -P backend -b split-backend || { echo "subtree split failed"; exit 1; }

echo "Creating remote repo $BACKEND_REPO"
gh repo create "$BACKEND_REPO" --$VISIBILITY --confirm || true

REMOTE_URL=$(gh repo view "$BACKEND_REPO" --json sshUrl --jq .sshUrl)
echo "Pushing split-backend branch to $REMOTE_URL (main)"
git push "$REMOTE_URL" split-backend:main --force

echo "=== Create frontend repo (remove backend folder, preserve history) ==="
echo "Cloning full repo to temp dir"
git clone --no-local --shared "$ROOT_DIR" "$TMP_DIR/frontend-repo"
cd "$TMP_DIR/frontend-repo"

echo "Removing backend/ directory from history (this rewrites history in temp clone)"
# Use git filter-branch to remove backend folder from all commits
git filter-branch --prune-empty --index-filter 'git rm -r --cached --ignore-unmatch backend || true' -- --all

echo "Creating frontend repo $FRONTEND_REPO"
gh repo create "$FRONTEND_REPO" --$VISIBILITY --confirm || true
FRONTEND_REMOTE=$(gh repo view "$FRONTEND_REPO" --json sshUrl --jq .sshUrl)

echo "Pushing rewritten frontend history to $FRONTEND_REMOTE"
git remote add publish "$FRONTEND_REMOTE"
git push publish --all --force
git push publish --tags --force

echo "Cleaning up temporary branches/refs"
cd "$ROOT_DIR"
git branch -D split-backend || true

echo "Done. Backend pushed to: $REMOTE_URL"
echo "Frontend pushed to: $FRONTEND_REMOTE"

echo "Next: add any secrets in GitHub (e.g., DATABASE_URL, DB_*, JWT_SECRET). Then connect repos to Vercel/Render as needed."
