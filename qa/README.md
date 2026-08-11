# Log My Log QA

Run the automated QA suite from the project root:

```bash
npm run qa
```

The suite checks JavaScript syntax, manifest/icons, service-worker cache integrity, third-party cache bypass, Supabase key safety, DOM control wiring, IndexedDB CRUD exports, encrypted-backup crypto configuration, sync conflict logic, owner-scoped deletion queues, cloud pagination and import validation.

## Browser release check

Before publishing a version, serve the folder over HTTP and perform these checks in a normal browser/device:

1. Fresh install/load: home screen opens; no console error prevents startup.
2. Log creation: create Type 4 / Easy / Low entry with notes and tags; verify it appears in History and Stats.
3. Persistence: reload/close and reopen; verify the entry remains.
4. Edit/search/filter: edit the entry, search for edited text, then filter by Bristol type.
5. Account validation: short password is rejected; invalid login reports an error without losing local entries.
6. QA account: create/sign into a dedicated test account; sync local entry; sign out; local history must remain.
7. Second-device sync: sign into the same QA account in another browser/profile; Sync now must download the entry.
8. Conflict: edit the same UUID on one side, then sync; the newer `updatedAt` version must win.
9. Delete: delete while signed in; sync; verify deletion reaches the second browser/profile after its next sync.
10. Offline: go offline, add/edit/delete locally, reopen, then reconnect and sync.
11. Encrypted backup: export with an 8+ character password; import into a clean browser with the correct password; wrong password must fail cleanly.
12. JSON/CSV backup: export both; import JSON into clean local storage and confirm entries restore.
13. PWA: install/add to home screen, reopen standalone, then test update check after a version bump.

Use dummy data only. Do not use real health notes in QA accounts.
