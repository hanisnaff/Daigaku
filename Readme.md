# Daigaku

**A calm, customizable student workspace.** Daigaku brings academic records, planning, study materials and personal routines into one adaptable place.

## Current build

This repository now contains an interactive Phase 1 front-end foundation built with semantic HTML, CSS and vanilla JavaScript. It is intentionally dependency-light so it can be deployed as a static site while the product and backend are developed in stages.

### Working in this prototype
- Dashboard with GPA estimate, attendance, tasks and subject overview
- Add/edit subjects, including credits, marks and attendance totals
- GPA estimate using a clearly documented placeholder grade-point scale
- Task creation, due dates, priorities and completion
- Calendar events and a month calendar with day selection
- Study-session logging and connected study-resource cards
- Personal habit tracker
- Local global search and command palette (Ctrl/Cmd + K)
- Dark mode, accent color, reduced-motion preference
- JSON workspace export and CSV subject export
- Browser-local persistence and an installable PWA shell/service worker
- Responsive desktop/mobile navigation and basic keyboard accessibility

## Run locally

Open `index.html` in a browser for the core prototype. For service-worker/PWA testing, serve the folder over localhost or HTTPS, for example:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Important limitations

This is a **front-end prototype**, not a production secure service. Records are stored in browser `localStorage`; there is no real authentication, cloud sync, database, multi-tenant authorization, encrypted local vault, end-to-end encryption, cloud backup, real university integration, AI service or server-side permission enforcement yet. Do not put sensitive real-world records into this prototype. The GPA mapping is an example only and must be replaced with the student's institution-specific grading rules before relying on calculations.

The service worker caches the app shell only. It does not implement robust offline conflict resolution or cross-device sync. Push notifications and external calendar syncing are not connected.

## Roadmap

- **Phase 1:** Reliable academic foundation, workspace, planning, export/import, responsive PWA and tested calculations.
- **Phase 2:** Learning tools, advanced dashboard builder, integrations and approval-based automations.
- **Phase 3:** Proactive AI, organization workspaces, moderated community and creator marketplace.

## Design principles

Original visual identity; calm, clear defaults; deep customization when requested; accessible interactions; privacy by default; no advertising; and no AI changes without explicit approval.

Created by Hitesh Jogeshwari.
