# Ribice

> _Ribice_ — "little fish" — aggregated NZ marine forecast.

An installable PWA that aggregates **5 independent global weather models** plus marine, tide and solunar data into one cozy view for **boating and fishing**, tuned for the Auckland region.

No API keys. No build step. Drops straight onto Netlify.

## What it shows

- **Now panel** — temperature, wind + gusts + direction, wave height + period, sea surface temp, tide height.
- **Traffic-light verdict** — green / amber / red based on **your** thresholds (wind, gust, wave, rain, temp). Tap the gear to tune them.
- **Best window today** — longest stretch of green daylight hours.
- **48-hour scroll** — per-hour temp, wind, waves, weather icon, with green/amber/red borders.
- **7-day outlook** — daily highs/lows, max wind, rain total, with a per-day verdict dot.
- **Tide chart** — true tidal heights (m above MSL) from Open-Meteo Marine. High/low events listed.
- **Swell card** — significant wave + period, primary swell direction + period, wind chop, SST.
- **Solunar & sky** — sunrise/sunset, UV peak, moon phase + illumination, major & minor bite windows, daily solunar score, air-quality (PM2.5).
- **Model agreement** — bar chart showing mean + spread across the 5 models. Wide bars = forecasters disagree, narrow = high confidence.

## Data sources (all free, no keys)

| Layer | Source |
|---|---|
| Weather (5 models averaged) | Open-Meteo `forecast` — ECMWF IFS, NOAA GFS, German ICON, Canadian GEM, Australian BoM ACCESS-G |
| Marine (waves, swell, tides, SST) | Open-Meteo `marine` (blends NOAA WaveWatch3, MeteoFrance MFWAM, DWD EWAM) |
| Air quality + UV | Open-Meteo `air-quality` |
| Solunar / moon | Computed client-side from astronomical formulas |

The "5 models" approach gives you genuinely independent forecast lineage — they use different governments' supercomputers, different numerical methods, different observation assimilation. When all five agree, you can trust the number. When they disagree, the spread bar gets wide and you know to hedge.

## Pre-loaded NZ spots

Auckland boating mix:
- Auckland (Waitemata Harbour)
- Whangaparaoa
- Waiheke (Onetangi)
- Great Barrier (Tryphena)
- Coromandel Town

Plus a **📍 Use my location** GPS chip. Add your own from Settings.

## Run locally

This is a static site — open `index.html` in a browser, or serve it:

```powershell
# Python 3
python -m http.server 8000
# then open http://localhost:8000
```

Or with Node:
```powershell
npx serve .
```

Service workers only register on `https://` or `http://localhost`, so the install prompt won't appear if you double-click the file.

## Deploy to Netlify

### Easiest — drag and drop

1. Go to https://app.netlify.com/drop
2. Drag the **entire `ribice` folder** onto the page.
3. Done. You get a `https://<random-name>.netlify.app/` URL.

### From the CLI

```powershell
npm i -g netlify-cli
netlify login
netlify deploy --dir . --prod
```

### From a Git repo

1. Push this folder to a GitHub repo.
2. In Netlify: **New site → Import from Git → pick the repo**.
3. Build settings: leave blank. Publish directory: `.`
4. Deploy.

The included `netlify.toml` sets the right headers (security + correct manifest mime-type + no-cache on the service worker so updates roll out immediately).

## Install on Android

1. Open the Netlify URL in Chrome on Android.
2. Tap the three-dot menu → **Install app** (or **Add to Home screen**).
3. The app gets its own icon and opens fullscreen, no browser chrome.
4. Works offline after first load — the service worker caches the shell and the most recent forecast.

## Customising thresholds

Tap the ⚙️ in the top-right. Defaults (conservative, small-boat friendly):

| Setting | Default | Why |
|---|---|---|
| Max wind | 15 kt | Above this gets uncomfortable in an aluminium runabout |
| Max gust | 22 kt | Gust-to-wind ratio matters more than mean wind |
| Max wave height | 1.2 m | Hauraki Gulf in this is choppy but fine |
| Max rain | 1 mm/h | Anything more makes for a wet day |
| Min temp | 12 °C | Below this you need full kit |

Also units (knots/kmh/m/s, metres/feet, °C/°F) and your saved spots.

## File layout

```
ribice/
├── index.html              ← app shell
├── styles.css              ← cozy dark theme, mobile-first
├── app.js                  ← fetching, aggregation, scoring, rendering
├── manifest.webmanifest    ← PWA install metadata
├── service-worker.js       ← offline caching (shell + last forecast)
├── netlify.toml            ← headers + content types
├── icons/
│   └── icon.svg            ← app icon (sky + sea)
└── README.md               ← this file
```

## A note on accuracy

This is a **forecast aggregator**, not a substitute for official marine forecasts. Always cross-check with [MetService Marine](https://www.metservice.com/marine/) before going out, watch the actual sky, and trust your gut. The traffic-light verdict is based on your numbers, not on local knowledge — coromandel chop, harbour gusts, river outflows, all the stuff models miss.

The 5-model average tends to beat any single model for 24–48h, but past day 5 the spread bars get wide for a reason: nobody knows.
