# Daigaku

Daigaku is a lightweight student dashboard for keeping track of subjects, attendance, grades, and semester records.

## Features

- Add, edit, and remove subjects
- Search subjects by name without changing semester totals or exports
- Track classes attended and total classes
- Calculate overall attendance using total classes, not an average of subject percentages
- Record grades and group subjects by semester
- Export subject records as CSV for backup or spreadsheet use
- Prevent duplicate subject names within the same semester
- Validate legacy or malformed stored records and safely escape subject text
- Keep existing records compatible when the app is updated

## Run locally

This is a static HTML, CSS, and JavaScript project. You can open `index.html` directly in a browser, or serve the repository with any static file server.

For example:

```bash
npx serve .
```

Then open the local URL printed by the server.

## Data and privacy

Current subject records are stored in the browser's `localStorage` on the device and browser where they were entered. There is no account system or cloud sync in this version. Clearing site data or changing browsers can remove or hide those records, so use **Export CSV** to keep a backup. The Vercel deployment also applies baseline browser security headers for content-type handling, referrer policy, framing, and unused device permissions.

## Checks

Run the smoke tests with:

```bash
node --check js/app.js
node --test tests/*.test.mjs
```
