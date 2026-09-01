# Google Sheets backend — setup (~5 minutes)

Everything the form submits lands in one Google Sheet with three tabs:
**Submissions** (every visit, row-colored green/red by completion),
**Links** (trackable-link performance), **Dashboard** (totals, a 14-day
chart, top picks per category). No external service or paid API — just a
Google Apps Script Web App bound to your own Sheet.

## 1. Create the sheet + script
1. Create a new blank Google Sheet (this becomes your data store).
2. Extensions → Apps Script.
3. Delete the placeholder `Code.gs` content, paste in `google-apps-script.gs`
   from this folder.
4. Save. Reload the spreadsheet tab — a **PicaPool** menu appears.
5. PicaPool → **Run setup (first time only)**. Approve the permissions
   prompt (it only touches this spreadsheet). This builds all three tabs.

## 2. Deploy it as a Web App
1. In the Apps Script editor: Deploy → New deployment.
2. Type: **Web app**.
3. Execute as: **Me**. Who has access: **Anyone**.
4. Deploy → copy the Web app URL (ends in `/exec`).

## 3. Point the form at it
1. Open `submit.js` in this folder.
2. Replace `PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE` with the URL you copied.
3. Redeploy the site (push to the repo Vercel is watching).

That's it — submissions now write to your Sheet. The row updates after
every question the person answers (so a visit that drops off halfway still
leaves whatever they'd filled in so far, marked **Incomplete** /
light-red); finishing the form updates that same row to **Complete**
(green) — no duplicates either way.

## Updating the script later
Editing `google-apps-script.gs` in the Apps Script editor does **not**
change your live `/exec` URL by itself. To push a code update to the same
URL: Deploy → Manage deployments → pick your Web app deployment → edit
(pencil icon) → Version: **New version** → Deploy. (Deploy → New
deployment instead would mint a *different* URL, requiring another
submit.js update — only do that if you actually want a new endpoint.)

## 4. Trackable links
`vercel.json` already rewrites every path to the form, so
`https://groupbuying.picapool.tech/<anything>` serves the same form and
records `<anything>` as that visit's source. To hand out a new trackable
link:
1. Add a row in the **Links** tab: `Slug` = the path you'll share (e.g.
   `instagram-bio`), `Campaign / Label` = a note for yourself.
2. Share `https://groupbuying.picapool.tech/instagram-bio`.
3. The row's Visits/Completed/Incomplete/Completion Rate fill in
   automatically as submissions come in.

`direct` is used automatically for anyone who lands on the bare domain
with no slug.

## 5. Point the domain
In Vercel, add `groupbuying.picapool.tech` as a custom domain for this
project and follow Vercel's DNS instructions. (If your real domain is
spelled differently, update `LINK_DOMAIN` at the top of
`google-apps-script.gs` and re-run PicaPool → Run setup so the Links tab's
formula matches.)

## Notes / limits
- IP address is the visitor's *public* IP, fetched client-side (via
  ipify) — it's a best-effort location signal, not exact geolocation.
- "Device Info" is the browser's user-agent string (browser/OS), captured
  alongside the IP at both the Incomplete and Complete pings.
- The Dashboard's "top picks" tiles are recomputed each time you run
  PicaPool → **Rebuild dashboard** (also runs as part of full setup) —
  they're snapshots, not live formulas, because multi-select answers are
  stored as comma-joined text and need splitting before they can be
  tallied per-brand correctly.
