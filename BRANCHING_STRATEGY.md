# Branching Strategy

This document outlines the branching strategy used for the Kanban Master project.

## Main Branches

- **`main`**: Represents the production-ready code. Only merged from `develop` after thorough testing and approval. Direct commits are disallowed.
- **`develop`**: Represents the latest development changes for the next release. All feature branches are merged into `develop`. Direct commits should be avoided; use feature branches.

## Supporting Branches

- **`feature/*`**: Used for developing new features. Branched from `develop` and merged back into `develop` via Pull Requests (PRs).
  - Naming convention: `feature/brief-description` (e.g., `feature/add-wip-limits`)
- **`bugfix/*`**: Used for fixing bugs found in `develop`. Branched from `develop` and merged back into `develop` via PRs.
  - Naming convention: `bugfix/issue-number-or-description` (e.g., `bugfix/fix-card-drag-drop`)
- **`hotfix/*`**: Used for critical fixes needed in `main` (production). Branched from `main`, merged back into both `main` and `develop` via PRs.
  - Naming convention: `hotfix/issue-number-or-description` (e.g., `hotfix/fix-auth-vulnerability`)

## Pull Request Process

- All merges into `develop` and `main` must be done through PRs.
- PRs should be reviewed by at least one other team member.
- PRs should pass all automated checks (linting, tests, builds) before merging.
- Link PRs to relevant tasks or issues.