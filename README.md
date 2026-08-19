# Did Do

Persistent stopwatches that count toward a weekly or daily goal. Runs entirely in
the browser; no server, no accounts, no network after first load.

## Put it on the phone

1. On github.com, click **New repository**. Name it `did-do`. Set it to **Public**
   (Pages needs public on a free account). Don't add a README — you have one.
2. On the empty repo page, click **uploading an existing file**. Drag in all five
   files: `index.html`, `manifest.webmanifest`, `sw.js`, `icon-192.png`,
   `icon-512.png`, plus this README. Click **Commit changes**.
3. Go to **Settings → Pages**. Under "Build and deployment", set Source to
   **Deploy from a branch**, branch **main**, folder **/ (root)**. Save.
4. Wait about a minute, then reload that page. It shows your URL:
   `https://YOURNAME.github.io/did-do/`
5. Open that URL **in Safari** on the phone (not Chrome — only Safari can install
   to the Home Screen on iOS). Tap Share → **Add to Home Screen**.
6. Open it from the new icon. It launches full screen, works offline, and keeps
   its data on the phone.

## Things worth knowing

- **Data lives in this phone's Safari storage.** Not synced, not backed up.
  Deleting the Home Screen icon is fine; clearing Safari website data is not.
  A JSON export is the next thing to build.
- **Editing the app later:** change the file on GitHub, and also bump `CACHE` in
  `sw.js` (`diddo-v1` → `diddo-v2`). The service worker serves the cached copy
  until that string changes, so a skipped bump looks like "my edit did nothing."
- **Timers survive everything.** A running timer stores the moment it started, so
  closing the app, locking the phone, or rebooting doesn't lose or pause time.
  The corollary: a timer left running overnight will faithfully log all of it.
- **Weeks start Monday** and reset automatically. Daily timers reset at midnight,
  local time.
