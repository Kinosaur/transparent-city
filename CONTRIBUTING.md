# Contributing to Transparent City

Thank you for helping make Bangkok civic data more understandable and useful.

## Good contributions

- Report a broken page, unclear label, translation issue, or accessibility problem.
- Improve documentation, tests, visualisation clarity, or data-quality checks.
- Propose a new metric only with a clear definition, source fields, limitations, and a way to validate it.

## Before opening an issue

1. Read the [Methods & data notes](https://transparent-city.vercel.app/en/methods).
2. Search existing issues so the discussion stays in one place.
3. Do not include personal information from reports, screenshots, or external records.
4. Treat a source routing chain as context, not proof that one agency is solely responsible.

## Pull requests

Keep changes focused and explain the user benefit. For code changes:

```bash
cd frontend && npm run lint
cd .. && ./.venv/bin/python -m pytest backend/tests/ -v
```

For data-pipeline changes, state the input fields, expected output change, and how you checked that historical coverage remains intact. Never commit files from `backend/data/`; the raw archive is intentionally excluded from Git.

## Data corrections

Transparent City displays a public source snapshot and does not alter individual source records. If a source record itself appears wrong, report it through the appropriate official Traffy Fondue channel. You may still open an issue here for a display, definition, or pipeline problem.

## Community standard

Please follow the [Code of Conduct](CODE_OF_CONDUCT.md). Be specific, kind, and evidence-led—especially when discussing public bodies and service performance.
