# Fardin Ahsan — Personal Website ("Pit Wall")

A dark, telemetry-dashboard personal site: an instrument-cluster hero with live
analog gauges (a working tach + speedo driving simulator), plus sections for
software projects, the GT 86, mountains, writing, and contact.

## How it works

It's a static React site. The `.jsx` sources are pre-compiled into a single
minified `bundle.js` by a tiny [esbuild](https://esbuild.github.io/) step — the
page loads React (production UMD) + `bundle.js`, with **no in-browser Babel**
(that transpile froze phones for several seconds on every load).

| File | What it is |
|------|------------|
| `index.html` | Page shell — loads fonts, Font Awesome, React (production), and `bundle.js` |
| `styles.css` | All styling (design tokens, layout, gauge chrome, sections) |
| `gauges.jsx` | SVG analog instruments — `PWTach`, `PWSpeedo`, `PWMiniGauge`, `PWBar` |
| `app.jsx` | The page itself — nav, hero + gauge cluster, projects, motor, travel, writing, contact |
| `build.mjs` | Compiles `gauges.jsx` + `app.jsx` → `bundle.js` |
| `bundle.js` | **Generated** — the artifact the page actually loads. Don't edit by hand. |
| `assets/` | Images and project demo clips (animated WebP) |

## Editing

- **Content / copy** — edit the relevant component in `app.jsx`.
- **Styling** — edit `styles.css` (colors live in the `:root` token block).
- **Gauge behaviour** — the driving-sim modes (`PULL`, `ENG_BRAKE`, `LAUNCH`,
  `TRACK`, `LIMITER`, `BURNOUT`, `IDLE`) are defined in the `DRIVERS` object in `app.jsx`.

After editing any `.jsx`, rebuild:

```sh
npm install   # first time only — installs esbuild
npm run build # regenerates bundle.js
```

Then refresh. (CSS and HTML changes need no build.)

## Running locally

Open through a local server rather than `file://`:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Deploying

Any static host works (GitHub Pages, Netlify, etc.) — just serve the repo root.
`bundle.js` is committed, so the host needs no build step; only re-run
`npm run build` after editing the `.jsx` sources.
