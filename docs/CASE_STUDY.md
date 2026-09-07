# Transparent City: rebuilding trust in a civic-data dashboard

**Live project:** [transparent-city.vercel.app/en](https://transparent-city.vercel.app/en)

**Role:** product, data pipeline, frontend, design, quality, and maintenance
**Stack:** Next.js, TypeScript, Tailwind CSS, Python, pandas, DuckDB, pytest, GitHub Actions, Vercel

## The problem

Bangkok residents can report local problems through Traffy Fondue, but the public data is difficult to use as a city-wide accountability view. It is spread across monthly exports, has inconsistent organisation-routing text, and needs careful interpretation before it can support comparisons.

Transparent City makes the public record easier to explore without presenting a dashboard score as the whole truth.

## What I built

- A bilingual Thai/English civic dashboard covering **1,399,238** published Bangkok reports across all **50 districts**.
- City overview, district report cards, searchable organisation-routing leaderboard, before/after gallery, and map of stale or low-rated reports.
- A reproducible Bronze → Silver → Gold pipeline: monthly source CSVs are validated, cleaned with pandas, aggregated in DuckDB, and published as static JSON for a fast Vercel deployment.
- Data-contract tests that prevent a short or partial source download from replacing the multi-year public dataset.

## The critical maintenance incident

When I returned to the project, an automated workflow had published only a recent two-month slice because its cache was treated as storage. The dashboard still looked healthy, but the history was wrong.

I recovered the available historical source files, rebuilt the outputs, introduced a versioned historical-coverage contract, and changed publication to a manual, validated workflow. The raw archive is now backed up outside the build cache.

This changed the project from a good-looking dashboard into a more reliable civic-data product.

## Design choices

The interface uses a dark editorial “evidence desk” direction: calm surfaces, high-contrast signals, and compact explanation around the numbers. The aim is not to dramatise public service data; it is to make a resident pause, understand, and ask a better question.

Trust features are part of the product:

- A visible data range and methodology link.
- A dedicated Methods & Data page explaining definitions, coverage, gaps, and how to interpret rankings.
- A clear warning that leaderboard rows represent source routing strings, which may contain several organisations.
- Community contribution guidance that prohibits personal-data sharing and unsupported claims.

## Engineering decisions

| Decision | Why it matters |
|---|---|
| Static JSON instead of a public database | Keeps runtime simple, cheap, fast, and auditable for this read-heavy project. |
| DuckDB for Gold-layer metrics | Allows expressive analytical SQL over 1.4M rows without operating a warehouse. |
| Versioned data contract | Prevents silent regressions in row count, history coverage, and trend continuity. |
| Manual release gate | Gives a maintainer a chance to review source coverage before public publication. |
| Bilingual route structure | Makes Thai the first-class community language while keeping the project legible to an international portfolio audience. |

## Lessons

1. A dashboard can be visually correct while the underlying data is incomplete.
2. Historical comparisons need cohort awareness: newer reports have had less time to resolve.
3. Public accountability tools must expose uncertainty, not hide it behind a leaderboard.
4. The most valuable portfolio work is not only feature delivery—it is detecting, explaining, and preventing a failure mode.

## Next meaningful steps

- Normalize organisation-routing chains into reviewable agency entities before using them for stronger accountability claims.
- Add cohort-based resolution views and monthly civic briefs.
- Improve map clustering, empty states, and keyboard support.
- Invite community feedback through well-moderated GitHub issues and publish a clear response process.
