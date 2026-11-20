# Windows 98 Interactive Resume — Setup & Deployment

A Windows 98-themed interactive resume and portfolio for **Amirul Qayyum Bin Sikambar**
(IllyaAtech / [AtechPro](https://github.com/AtechPro)), built with [98.css](https://jdan.github.io/98.css/)
and served as static assets from a Cloudflare Worker.

---

## 🛠️ Prerequisites

- **Node.js** 18 or higher ([download](https://nodejs.org/))
- **npm** (bundled with Node)
- **Cloudflare account** — only needed to deploy ([sign up](https://dash.cloudflare.com/sign-up))

---

## 💻 1. Run & test locally

```bash
npm install
npm run dev
```

Wrangler prints the local URL (normally <http://127.0.0.1:8787>). Changes to `public/` are picked
up on refresh — there is no build step for the site itself.

> **Editing the site?** Hard-reload with `Ctrl`+`Shift`+`R` after changing CSS or JS. Markup and
> code are served `must-revalidate` (see `public/_headers`), so a normal reload is usually enough,
> but an already-open tab can still hold a stale copy.

---

## ☁️ 2. Deploy to Cloudflare

### Method A — CLI

```bash
npx wrangler login     # once per machine
npm run deploy
```

Wrangler prints the live URL, e.g. `https://win98-resume.<your-subdomain>.workers.dev`.

### Method B — Git integration (Cloudflare dashboard)

1. Push the repo to GitHub.
2. Dashboard → **Workers & Pages** → **Create Application** → **Pages** → **Connect to Git**.
3. Build configuration:
   - **Framework preset**: `None`
   - **Build output directory**: `public`

---

## 📁 Project structure

```
public/
  index.html            All windows, the boot sequence and the clock markup
  css/98.css            Self-hosted 98.css framework
  css/style.css         Site styles (windows, boot, clock, tabs, mobile)
  js/app.js             Window manager: boot, clock, drag, taskbar, start menu, tabs
  _headers              Security + cache headers (CSP, HSTS, frame denial)
  resume.pdf            General-version résumé, served for download
  images/               Wallpaper, cert icon, project diagram, social preview
  images/icons/         Self-hosted Win98 icon set (+ clock.svg)
src/index.js            Worker: serves assets, falls back to index.html
wrangler.json           Worker config (entrypoint + assets binding)
download_icons.js       Re-downloads icons referenced by index.html
```

---

## 🧩 How the interactive pieces work

**Windows.** Every control is driven by delegated listeners in `app.js` using `data-*` attributes —
`data-open`, `data-close`, `data-minimize`, `data-tab`, `data-reboot`, `data-shutdown`. There are
**no inline `onclick` handlers**, which is what allows `public/_headers` to set a CSP with
`script-src 'self'` and no `'unsafe-inline'`.

> ⚠️ `data-close`, `data-minimize` and `data-reboot` are **valueless** attributes, so
> `el.dataset.close === ''` (falsy). Always read them with `hasAttribute()`, never for truthiness.

**Adding a window.** Add the `<div class="window" id="window-x">` markup, give it a position in
`initialWindowPositions` (JS) and a matching inline `top`/`left` (HTML), then wire a desktop icon
and/or a Start-menu entry with `data-open="window-x"`.

**Boot sequence.** `runBoot()` in `app.js` plays the BIOS/POST text and then the Windows 98 splash
before the desktop appears. It is skipped when:

- it has already played this session (`sessionStorage`), or
- the visitor has `prefers-reduced-motion: reduce` set, or
- the boot markup is missing.

It can be cut short at any moment with a click or keypress, and **Start → Restart…** replays it.
The overlay starts `hidden` in the markup, so a visitor without JS goes straight to the desktop.

**Desktop clock.** An analog + digital desk accessory in `#window-clock`, updated by the same
one-second tick that drives the taskbar tray clock. The hands only ever receive a `rotate()`
transform from JS — the pivot point lives in CSS (`.clock-hand`), which keeps the geometry exact.

---

## 🔒 Security & caching (`public/_headers`)

Applied to real asset responses by Cloudflare's static-asset layer, so it works even though assets
never reach `src/index.js`:

- `Content-Security-Policy` — `default-src 'self'`, `connect-src 'none'`, `frame-ancestors 'none'`
  (`style-src` allows `'unsafe-inline'` because the markup uses inline `style` attributes)
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`,
  `Permissions-Policy`, `Strict-Transport-Security`
- **Caching** — HTML/CSS/JS are `max-age=0, must-revalidate` on purpose. This repo has no build step
  to fingerprint filenames, so a long `max-age` (or `immutable`) would hide every future edit from
  returning visitors.

> The Worker in `src/index.js` only handles requests that do **not** match a static asset (the
> single-page fallback). It sets the same headers for those responses.

---

## 🎨 Icons

Icons are **self-hosted** in `public/images/icons/` — the site makes no third-party requests.

To re-fetch them from the original source after editing icon references in `index.html`:

```bash
npm run icons
```

`win98icons.alexmeub.com` rate-limits and returns `403` for some files; the script skips files that
already exist and reports failures at the end. An icon that cannot be fetched should be replaced
with one that can — the clock shortcut in `images/icons/clock.svg` is hand-written SVG for exactly
this reason — rather than left as a broken reference.

---

## ✅ Verify a change

```bash
npm run check     # wrangler deploy --dry-run: validates config + assets without deploying
```
