---
description: Exit current worktree (if any), create a fresh worktree, and make an empty commit
user_invocable: true
---

# Fresh Worktree

Create a clean worktree with an empty commit, ready for work.

First, generate a random branch name by running:
```bash
echo "claude-$(date +%Y%m%d)-$(openssl rand -hex 3)"
```
Use this value as the branch name for all subsequent steps.

## Step 1: Exit existing worktree (if applicable)

Check if we are currently in a worktree (look for `.claude/worktrees/` in the current working directory path). If so, perform these safety checks before removing it:

### 1a: Check for uncommitted changes

Run `git status --porcelain`. If there are any uncommitted changes (unstaged, staged, or untracked files), **stop and ask the user** what to do — do NOT proceed with removal.

### 1b: Check all commits are pushed

Run `git log @{upstream}..HEAD --oneline` to check for unpushed commits. If there are any unpushed commits, push them first with `git push` before proceeding. If push fails, **stop and ask the user**.

### 1c: Merge latest main into the branch

Run the following to ensure the branch has the latest main merged in:
```bash
git fetch origin main
git merge origin/main --no-edit
```
If the merge has conflicts, **stop and ask the user** to resolve them. If the merge added new commits, push them with `git push`.

### 1d: Remove the worktree

Once all commits are pushed and main is merged, use the `ExitWorktree` tool with `action: "remove"` to clean up the worktree.

## Step 2: Create a new worktree

Use the `EnterWorktree` tool with `name` set to the generated branch name to create a fresh worktree and switch into it.

## Step 3: Make an empty commit

Run:
```bash
git commit --allow-empty -m "$(cat <<EOF
Initial empty commit for $BRANCH_NAME

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

## Step 4: Push the branch

```bash
git push -u origin HEAD
```

## Step 5: Report back

Print the branch name and worktree path so the user knows where they are.
