# Transparent City frontend

The bilingual Next.js application behind [Transparent City](https://transparent-city.vercel.app/en), a community-led view of published Bangkok civic-report data.

## Routes

- `/en` and `/th` — city overview
- `/[lang]/districts` — 50 district report cards
- `/[lang]/leaderboard` — searchable source routing records, with a methodology caveat
- `/[lang]/gallery` — before/after images from resolved reports
- `/[lang]/map` — stale and low-rated report locations with district shading
- `/[lang]/methods` — source, definitions, limitations, and participation guidance

## Local development

```bash
npm install
npm run dev
npm run lint
npm run build
```

The app reads its published data from `public/data/`. Regenerate those files through the backend pipeline; do not hand-edit derived JSON.

## Trust and accessibility

The UI supports Thai and English routes, reduced motion, visible keyboard focus, labelled KPI progress indicators, and keyboard-operable share dialogs. The leaderboard displays source routing strings, which may contain several organisations; the [Methods page](https://transparent-city.vercel.app/en/methods) explains this and other limits.

See the repository [README](../README.md) for the complete product and pipeline story.
