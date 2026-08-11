# Log My Log v3.1

V3.1 connects the local-first PWA to Supabase.

## Live cloud features
- Email/password sign-up with email confirmation
- Persistent Supabase browser session
- Sign in / sign out
- Manual two-way sync
- Existing local logs merge into the signed-in account; they are not removed from IndexedDB
- UUIDs are preserved across devices
- New/edited logs are pushed quietly when online and signed in
- Cloud deletions are queued when necessary and flushed on sync
- Cloud rows are protected by the project's Row Level Security policies
- Local logging continues to work while signed out or offline
- Existing encrypted backup/export features remain available

## Security
The PWA contains only the Supabase Project URL and publishable client key. It contains no database password, secret key, or service-role key. The service worker deliberately bypasses all third-party requests so Supabase Auth/Data API responses are never cached by the PWA cache.

## Sync conflict rule
For an entry with the same UUID locally and in Supabase, the newer `updatedAt` / `updated_at` version wins. Rows existing on only one side are copied to the other side.

# Log My Log v3.0.3

Hotfix: encrypted backup export now uses the app's existing downloadFile helper correctly. Encrypted import continues to merge entries through the existing IndexedDB bulkSave path.

# Log My Log v3.0.2

Rebuilt from stable v2.4.1. Fixes V3 startup so existing IndexedDB history loads normally and Account & Sync controls are fully wired.

# Log My Log v2.4.1

Hotfix for v2.4: fixes the health-report JavaScript syntax error and prevents the service worker from attempting to cache browser-extension requests.

# Log My Log v2.4

Adds a locally generated 7/30/90-day health summary, current-vs-previous-period comparisons, Bristol/ease/urgency breakdowns, context observations, and a clean Print / Save as PDF workflow intended for optional sharing with a healthcare professional.

The report is generated locally from IndexedDB data. Log My Log does not upload the report or entries to a server.

# Log My Log PWA

A mobile-first, installable, offline-capable poo logging Progressive Web App.

## Features
- Add, edit and delete bowel movement logs
- Bristol stool type 1–7
- Ease, urgency, colour, duration, location, notes and tags
- History search and type filters
- Simple personal stats and 14-day chart
- IndexedDB local storage (no backend in v1)
- JSON backup/restore and CSV export
- Service worker for offline use
- Web App Manifest for installability
- Responsive mobile-first UI

## Publish on GitHub Pages
1. Create a new GitHub repository (for example `log-my-log`).
2. Upload **the contents of this folder** to the repository root.
3. Commit the files.
4. Open **Settings → Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**.
6. Select `main` and `/ (root)`, then Save.
7. Open the Pages URL on your phone. On supported browsers, use the browser's install / Add to Home Screen option.

GitHub Pages serves over HTTPS, which is suitable for service workers and PWA installation.

## Local testing
Service workers do not behave correctly if you double-click `index.html` as a `file://` URL. Serve the folder over HTTP instead:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Important v1 data note
Logs are stored in the browser on the current device. Export a JSON backup before clearing browser/site data or changing devices.

## Good next upgrades
- Optional accounts + encrypted/cloud sync
- Reminders and notification preferences
- Food / drink / symptom correlation
- Medication and supplement logging
- Charts by week/month/year
- Shareable GP/clinician report
- Multiple profiles
- Passcode / biometric app lock where supported
- Automated testing and CI

## v2.2 PWA polish

This build adds first-run onboarding, improved install controls, online/offline status, a Settings app panel, manual update checks, and service-worker update handling. Existing IndexedDB log data remains compatible with v2.


## v2.2
Adds a richer Daily Debrief, personal throne records, expanded achievements, and achievement-unlock celebrations.
