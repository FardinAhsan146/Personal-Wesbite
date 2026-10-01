# Fardin Ahsan — Personal Website ("Pit Wall")

A dark, telemetry-dashboard personal site: an instrument-cluster hero with live
analog gauges (a working tach + speedo driving simulator), plus sections for
software projects, the GT 86, mountains, writing, and contact.

## How it works

It's a static site — no build step. The page is React rendered in the browser
via Babel standalone, so you can edit and refresh directly.

| File | What it is |
|------|------------|
| `index.html` | Page shell — loads fonts, Font Awesome, React, Babel, and the scripts below |
| `styles.css` | All styling (design tokens, layout, gauge chrome, sections) |
| `gauges.jsx` | SVG analog instruments — `PWTach`, `PWSpeedo`, `PWMiniGauge`, `PWBar` |
| `app.jsx` | The page itself — nav, hero + gauge cluster, projects, motor, travel, writing, contact |
| `assets/` | Images and project demo GIFs |

## Editing

- **Content / copy** — edit the relevant component in `app.jsx`.
- **Styling** — edit `styles.css` (colors live in the `:root` token block).
- **Gauge behaviour** — the GT86 simulation lives in `app.jsx` between the
  `// <PW-SIM-CORE>` and `// </PW-SIM-CORE>` markers: plain JS (no JSX/DOM), so it
  can be lifted out and run headless in Node. Vehicle constants and the FA20
  torque curve are at the top; `pwPhysics` is the engine / clutch-driveline /
  tyre / brake model; each driving mode (`PULL`, `ENG_BRAKE`, `LAUNCH`, `TRACK`,
  `LIMITER`, `BURNOUT`, `IDLE`) is a `SEEDS` entry (starting state) plus a
  `DRIVERS` entry (pedals, clutch and gear lever only — physics does the rest).
  `pwViewStep` holds the needle dynamics. `LiveCluster` runs it all on a fixed
  120 Hz tick in one rAF loop (paused off screen / in hidden tabs) and writes the
  DOM imperatively; needles are separate SVG layers rotated with CSS transforms.

Save and refresh — no compile step.

## Running locally

Because the `.jsx` files are fetched over HTTP, open it through a local server
rather than `file://`:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Deploying

Any static host works (GitHub Pages, Netlify, etc.) — just serve the repo root.

> Note: this uses in-browser Babel transpilation, which is convenient for a
> personal site but adds a little load-time cost. If you ever want a faster
> production build, the `.jsx` can be precompiled with a bundler.
