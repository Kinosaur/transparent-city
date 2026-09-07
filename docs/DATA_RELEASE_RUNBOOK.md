# Data release runbook

Use this checklist whenever you refresh Transparent City data. The goal is simple: **never publish a smaller or partial history over the public dataset.**

## What you need

- Your durable Google Drive backup of `backend/data/` and `backend/data/manifest.json`.
- A local checkout with the Python virtual environment and frontend dependencies installed.
- Traffy registration values in environment variables; never paste them into Git or an issue.

For a GitHub Actions refresh, save the same four values as repository secrets:
`TRAFFY_NAME`, `TRAFFY_ORG`, `TRAFFY_PURPOSE`, and `TRAFFY_EMAIL`. They are
required only for the manual download step, never for site visitors.

## 1. Start from a recoverable source archive

1. Confirm the Google Drive backup completed successfully.
2. Confirm the local `backend/data/` directory contains the historical CSV archive before downloading recent months.
3. If the local archive is missing or suspiciously small, restore it from Google Drive first. Do **not** run a public update from a fresh two-month download.

The expected recovery baseline is at least 60 source CSVs and a dataset of at least 1.39M tickets. November 2021 is unavailable upstream; do not invent it.

## 2. Refresh the recent source data

```bash
source .venv/bin/activate
export TRAFFY_NAME="Your Name"
export TRAFFY_EMAIL="you@example.com"
export TRAFFY_ORG="Your Organisation"
export TRAFFY_PURPOSE="civic transparency research"

python backend/pipeline/download.py --months 2
```

If the Traffy download fails, stop. Do not publish a refresh based on an unknown or incomplete local folder.

## 3. Generate and validate locally

```bash
python backend/pipeline/validate.py --inputs
python backend/pipeline/process.py
cp backend/public/data/*.json frontend/public/data/
./.venv/bin/python -m pytest backend/tests/ -v
cd frontend && npm run lint && npx tsc --noEmit
```

The tests enforce the historical-coverage contract. A failure is a release blocker, not a warning to work around.

## 4. Review the changed facts

Before committing, compare `frontend/public/data/overview.json` with the currently published version:

- Ticket count should remain near or above the established historical baseline, not collapse to a recent snapshot.
- The data range should still begin in September 2021 and extend to the expected current date.
- The monthly trend should retain at least 59 points.
- The district count must stay exactly 50.

Open the local site and check the overview, one district, leaderboard, gallery, map, and Methods page. Confirm the displayed data range and wording are truthful.

## 5. Publish deliberately

```bash
git add frontend/public/data/
git commit -m "data: manual update YYYY-MM-DD"
git push
```

Vercel deploys from GitHub. After deployment, open the live site and verify the same six pages. Keep the commit hash so you can identify or revert a bad release.

## 6. If something looks wrong

1. Do not overwrite the working copy or delete raw CSVs.
2. Restore the known-good JSON files from the last Git commit, or revert the public data commit.
3. Restore the raw archive from Google Drive if needed.
4. Record what happened in a GitHub issue using the data/methodology template.

## Role of GitHub Actions

The workflow is manual-only and includes the same validation gates. Its cache may speed a run, but it is **not** durable raw storage. Treat your Google Drive archive as the recovery source until durable object storage is deliberately configured and tested.
