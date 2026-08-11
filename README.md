# Log My Log v3.0

V3 introduces a local-first account and sync architecture without forcing users to create an account.

## Included in v3.0
- Persistent device identity and device naming
- Account & Sync screen
- Optional cloud-sync adapter boundary
- Password-protected encrypted backups using Web Crypto (PBKDF2 + AES-GCM)
- Encrypted backup restore
- Existing local IndexedDB workflow remains the default
- Existing v2 logs remain compatible

## Cloud sync
The app is structurally ready for cloud sync, but this build intentionally does not embed a cloud-provider project URL/key. The current static GitHub Pages deployment remains fully functional without any backend.

A suitable next connection is Supabase using its public client key with authentication and row-level security. Do not put a Supabase service-role key or other server secret into this PWA.

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
