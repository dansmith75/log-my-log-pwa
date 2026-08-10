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
