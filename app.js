// Ribice — aggregated marine forecast PWA
// All data: Open-Meteo (free, no API keys).

// Bump on every shippable change. Visible in the topbar pill AND in
// Settings → App version, so you can instantly tell whether the phone is
// running the latest deploy.
const APP_VERSION = "2026.05.30-36";
const LOADED_AT = new Date();

// Diagnostic log — visible in Chrome DevTools when remote-debugging via USB.
console.log(
  `%c⚓ Ribice %cv${APP_VERSION} %cloaded at ${LOADED_AT.toLocaleString("en-NZ")}`,
  "color:#7cc4e8;font-weight:bold;font-size:14px",
  "color:#ffd47a;font-weight:bold",
  "color:#7c97ad"
);

// ---------- Constants ----------

const DEFAULT_SPOTS = [
  { id: "wai", name: "Auckland (Waitemata)",      lat: -36.836, lon: 174.800 },
  { id: "rng", name: "Rangitoto Channel",         lat: -36.790, lon: 174.840 },
  { id: "brn", name: "Browns Island (Motukorea)", lat: -36.830, lon: 174.890 },
  { id: "mot", name: "Motuihe Channel",           lat: -36.800, lon: 174.940 },
  { id: "rak", name: "Rakino",                    lat: -36.720, lon: 174.940 },
  { id: "noi", name: "Noises",                    lat: -36.690, lon: 174.970 },
  { id: "whk", name: "Waiheke (Onetangi)",        lat: -36.785, lon: 175.095 },
  { id: "tir", name: "Tiri Channel",              lat: -36.600, lon: 174.850 },
  { id: "wha", name: "Whangaparaoa",              lat: -36.610, lon: 174.780 },
  { id: "crm", name: "Coromandel Town",           lat: -36.762, lon: 175.495 },
  { id: "gbi", name: "Great Barrier (Tryphena)",  lat: -36.301, lon: 175.483 }
];

// Bump this when DEFAULT_SPOTS gains new entries that existing users should see.
const SPOTS_VERSION = 2;

const DEFAULT_THRESHOLDS = {
  maxWindKt: 15,
  maxGustKt: 22,
  maxWaveM: 1.2,
  maxRainMm: 1,
  minTempC: 12
};

const DEFAULT_UNITS = { wind: "kt", wave: "m", temp: "c" };

// Five independent global weather models. Open-Meteo serves them all from one
// endpoint when you pass `models=` as a comma-separated list.
const WEATHER_MODELS = [
  "ecmwf_ifs025",
  "gfs_seamless",
  "icon_seamless",
  "gem_seamless",
  "bom_access_global"
];

const MODEL_LABELS = {
  "ecmwf_ifs025": "ECMWF",
  "gfs_seamless": "GFS",
  "icon_seamless": "ICON",
  "gem_seamless": "GEM",
  "bom_access_global": "ACCESS-G"
};

const WEATHER_VARS = [
  "temperature_2m",
  "precipitation",
  "wind_speed_10m",
  "wind_gusts_10m",
  "wind_direction_10m",
  "cloud_cover",
  "pressure_msl",
  "relative_humidity_2m",
  "weather_code"
];

const MARINE_VARS = [
  "wave_height",
  "wave_period",
  "wave_direction",
  "wind_wave_height",
  "swell_wave_height",
  "swell_wave_period",
  "swell_wave_direction",
  "sea_level_height_msl",
  "sea_surface_temperature"
];

const DAILY_VARS = [
  "temperature_2m_max",
  "temperature_2m_min",
  "precipitation_sum",
  "wind_speed_10m_max",
  "wind_gusts_10m_max",
  "uv_index_max",
  "sunrise",
  "sunset",
  "weather_code"
];

// ---------- Catch forecast — per-species config ----------
//
// NZ saltwater species commonly chased in the upper North Island. Numbers are
// pragmatic field-fishing values, not lab-precise: tempIdeal is the SST sweet
// spot, tempOk the wider tolerance band. peakMonths are when the species is
// reliably catchable in numbers. flowPref/pressurePref/biteTime feed both the
// overall day score and the per-hour bite timeline.

const SPECIES = [
  {
    id: "snapper", name: "Snapper", maori: "Tāmure",
    seasonText: "Year-round, peak Oct–May",
    peakMonths: [10, 11, 12, 1, 2, 3, 4, 5],
    depth: "15–80m",
    tempIdeal: [16, 21], tempOk: [14, 23],
    flowPref: "slack", pressurePref: "rising",
    biteTime: ["dawn", "dusk"], needsCalm: false
  },
  {
    id: "kingfish", name: "Kingfish", maori: "Haku",
    seasonText: "Dec–Apr",
    peakMonths: [12, 1, 2, 3, 4],
    depth: "0–50m, structure",
    tempIdeal: [18, 22], tempOk: [16, 24],
    flowPref: "flow", pressurePref: "any",
    biteTime: ["day", "dawn"], needsCalm: false
  },
  {
    id: "marlin", name: "Striped marlin", maori: "Aku",
    seasonText: "Jan–May",
    peakMonths: [1, 2, 3, 4, 5],
    depth: "Blue water, 200m+",
    tempIdeal: [19, 24], tempOk: [17.5, 26],
    flowPref: "any", pressurePref: "any",
    biteTime: ["day"], needsCalm: true
  },
  {
    id: "kahawai", name: "Kahawai", maori: "Kahawai",
    seasonText: "Year-round",
    peakMonths: [10, 11, 12, 1, 2, 3, 4],
    depth: "Surface, schooling",
    tempIdeal: [15, 21], tempOk: [13, 23],
    flowPref: "flow", pressurePref: "any",
    biteTime: ["dawn", "dusk", "day"], needsCalm: false
  },
  {
    id: "trevally", name: "Trevally", maori: "Araara",
    seasonText: "Nov–Apr",
    peakMonths: [11, 12, 1, 2, 3, 4],
    depth: "5–40m",
    tempIdeal: [17, 22], tempOk: [15, 24],
    flowPref: "slack", pressurePref: "rising",
    biteTime: ["dawn", "dusk"], needsCalm: false
  },
  {
    id: "hapuku", name: "Hāpuku", maori: "Hāpuku",
    seasonText: "Year-round",
    peakMonths: [4, 5, 6, 7, 8, 9, 10],
    depth: "120–400m",
    tempIdeal: [12, 18], tempOk: [10, 20],
    flowPref: "any", pressurePref: "any",
    biteTime: ["day"], needsCalm: true
  },
  {
    id: "tarakihi", name: "Tarakihi", maori: "Tarakihi",
    seasonText: "Year-round",
    peakMonths: [3, 4, 5, 6, 7, 8],
    depth: "40–200m",
    tempIdeal: [13, 18], tempOk: [11, 20],
    flowPref: "any", pressurePref: "any",
    biteTime: ["dawn", "dusk", "day"], needsCalm: false
  }
];

// ---------- State ----------

const state = {
  spots: loadJSON("spots", DEFAULT_SPOTS),
  thresholds: loadJSON("thresholds", DEFAULT_THRESHOLDS),
  units: loadJSON("units", DEFAULT_UNITS),
  activeSpotId: loadJSON("activeSpotId", "__gps__"),
  activeSpecies: loadJSON("activeSpecies", null),
  activeTab: loadJSON("activeTab", "today"),
  catches: loadJSON("catches", []),
  data: null
};

// One-time migration: add any new DEFAULT_SPOTS that the user doesn't have yet.
(function migrateSpots() {
  const storedVer = +(localStorage.getItem("ts.spotsVersion") || 1);
  if (storedVer >= SPOTS_VERSION) return;
  const have = new Set(state.spots.map((s) => s.id));
  for (const s of DEFAULT_SPOTS) {
    if (!have.has(s.id)) state.spots.push(s);
  }
  saveJSON("spots", state.spots);
  localStorage.setItem("ts.spotsVersion", SPOTS_VERSION);
})();

// One-time switch to GPS-as-default. Existing installs had a sea spot saved as
// the active spot; the app should open on the user's actual location instead.
// Runs once, then never clobbers a deliberate spot choice again.
(function migrateToGpsDefault() {
  if (localStorage.getItem("ts.gpsDefaultV1")) return;
  state.activeSpotId = "__gps__";
  saveJSON("activeSpotId", "__gps__");
  localStorage.setItem("ts.gpsDefaultV1", "1");
})();

// ---------- Utilities ----------

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem("ts." + key);
    if (!raw) return structuredClone(fallback);
    return JSON.parse(raw);
  } catch { return structuredClone(fallback); }
}
function saveJSON(key, value) {
  localStorage.setItem("ts." + key, JSON.stringify(value));
}

function $(sel) { return document.querySelector(sel); }
function el(tag, attrs = {}, children = []) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") e.className = v;
    else if (k === "html") e.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null) continue;
    // Coerce primitives (numbers, booleans) to strings — appendChild only
    // accepts Nodes and would throw on a raw number.
    if (typeof c === "string" || typeof c === "number" || typeof c === "boolean") {
      e.appendChild(document.createTextNode(String(c)));
    } else {
      e.appendChild(c);
    }
  }
  return e;
}

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast._tid);
  toast._tid = setTimeout(() => (t.hidden = true), 2400);
}

// Unit conversion
const KMH_TO_KT = 0.539957;
const MS_TO_KT  = 1.94384;
const M_TO_FT   = 3.28084;

function fmtWind(kmh) {
  if (kmh == null) return "—";
  if (state.units.wind === "kt") return Math.round(kmh * KMH_TO_KT) + " kt";
  if (state.units.wind === "ms") return (kmh / 3.6).toFixed(1) + " m/s";
  return Math.round(kmh) + " km/h";
}
function fmtWave(m) {
  if (m == null) return "—";
  if (state.units.wave === "ft") return (m * M_TO_FT).toFixed(1) + " ft";
  return m.toFixed(1) + " m";
}
function fmtTemp(c) {
  if (c == null) return "—";
  if (state.units.temp === "f") return Math.round(c * 9 / 5 + 32) + "°F";
  return Math.round(c) + "°C";
}
function fmtPct(x) { return x == null ? "—" : Math.round(x) + "%"; }
function fmtMm(x) { return x == null ? "—" : x.toFixed(1) + " mm"; }
function fmtTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-NZ", { hour: "2-digit", minute: "2-digit" });
}
function fmtHour(iso) {
  const d = new Date(iso);
  const h = d.getHours();
  return (h % 12 || 12) + (h < 12 ? "a" : "p");
}
function fmtDayName(iso) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return d.toLocaleDateString("en-NZ", { weekday: "short", day: "numeric" });
}
function compass(deg) {
  if (deg == null) return "—";
  const dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
  return dirs[Math.round(((deg % 360) / 22.5)) % 16];
}

// Stats
function mean(arr) {
  const v = arr.filter((x) => typeof x === "number" && !Number.isNaN(x));
  if (!v.length) return null;
  return v.reduce((a, b) => a + b, 0) / v.length;
}
function range(arr) {
  const v = arr.filter((x) => typeof x === "number" && !Number.isNaN(x));
  if (!v.length) return [null, null];
  return [Math.min(...v), Math.max(...v)];
}
function circularMean(degs) {
  const v = degs.filter((x) => typeof x === "number" && !Number.isNaN(x));
  if (!v.length) return null;
  const rad = v.map((d) => (d * Math.PI) / 180);
  const x = mean(rad.map(Math.cos));
  const y = mean(rad.map(Math.sin));
  let a = (Math.atan2(y, x) * 180) / Math.PI;
  if (a < 0) a += 360;
  return a;
}

// ---------- Fetching ----------

async function fetchForecast(spot) {
  const base = "https://api.open-meteo.com/v1/forecast";
  const params = new URLSearchParams({
    latitude: spot.lat,
    longitude: spot.lon,
    hourly: WEATHER_VARS.join(","),
    daily: DAILY_VARS.join(","),
    timezone: "Pacific/Auckland",
    wind_speed_unit: "kmh",
    forecast_days: "7",
    models: WEATHER_MODELS.join(",")
  });
  const r = await fetch(`${base}?${params}`);
  if (!r.ok) throw new Error("Forecast fetch failed: " + r.status);
  return r.json();
}

// Live "current conditions" reading. Deliberately omits the models= param so
// Open-Meteo returns its blended best-estimate for *right now* (a 15-min
// interval value that folds in recent analysis) rather than the top-of-hour
// ensemble forecast. This is the genuine current observation, not a prediction.
async function fetchCurrent(spot) {
  const base = "https://api.open-meteo.com/v1/forecast";
  const params = new URLSearchParams({
    latitude: spot.lat,
    longitude: spot.lon,
    current: "temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m,pressure_msl,precipitation",
    timezone: "Pacific/Auckland",
    wind_speed_unit: "kmh"
  });
  try {
    const r = await fetch(`${base}?${params}`);
    if (!r.ok) return null;
    const j = await r.json();
    return j.current || null;
  } catch {
    return null;
  }
}

async function fetchMarine(spot) {
  const base = "https://marine-api.open-meteo.com/v1/marine";
  const params = new URLSearchParams({
    latitude: spot.lat,
    longitude: spot.lon,
    hourly: MARINE_VARS.join(","),
    daily: "wave_height_max,wave_direction_dominant,wave_period_max",
    timezone: "Pacific/Auckland",
    forecast_days: "7"
  });
  const r = await fetch(`${base}?${params}`);
  if (!r.ok) {
    // Marine is unavailable for very inland points; fail soft.
    return null;
  }
  return r.json();
}

// api.solunar.org — free, no API key. Returns real moonrise/moonset, major +
// minor bite windows from proper lunar transit, plus a 0–100 day rating.
//
// URL form: https://api.solunar.org/solunar/{lat},{lon},{YYYYMMDD},{tzOffset}
//
// Fails soft — if it 404s, times out, or CORS-blocks, we fall back to the
// client-side approximation in solunarWindows().
async function fetchSolunar(spot, date = new Date()) {
  const dateStr = spotDateString(spot, date);
  const tz = tzOffsetForSpot(spot, date);
  const url = `https://api.solunar.org/solunar/${spot.lat.toFixed(4)},${spot.lon.toFixed(4)},${dateStr},${tz}`;
  try {
    const r = await fetch(url, { mode: "cors" });
    if (!r.ok) return null;
    const j = await r.json();
    // Normalise — convert HH:MM strings to today-local Date objects.
    return {
      sunRise:   parseHm(j.sunRise, date),
      sunSet:    parseHm(j.sunSet, date),
      moonRise:  parseHm(j.moonRise, date),
      moonSet:   parseHm(j.moonSet, date),
      moonPhase: j.moonPhase,
      moonIllumination: j.moonIllumination,
      majorA: { start: parseHm(j.major1Start, date), end: parseHm(j.major1Stop, date) },
      majorB: { start: parseHm(j.major2Start, date), end: parseHm(j.major2Stop, date) },
      minorA: { start: parseHm(j.minor1Start, date), end: parseHm(j.minor1Stop, date) },
      minorB: { start: parseHm(j.minor2Start, date), end: parseHm(j.minor2Stop, date) },
      dayRating: j.dayRating != null ? Number(j.dayRating) : null,  // 0-100
      hourSummary: j.hourSummary || null
    };
  } catch {
    return null;
  }
}

// "HH:MM" → Date object on the given baseDate (in local timezone).
function parseHm(hm, baseDate) {
  if (typeof hm !== "string" || !/^\d{1,2}:\d{2}/.test(hm)) return null;
  const [h, m] = hm.split(":").map(Number);
  const d = new Date(baseDate);
  d.setHours(h, m, 0, 0);
  return d;
}

// Local-date string in YYYYMMDD for the spot's timezone (NZ-aware).
function spotDateString(spot, date) {
  const tz = isNZSpot(spot) ? "Pacific/Auckland" : undefined;
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric", month: "2-digit", day: "2-digit"
    });
    return fmt.format(date).replace(/-/g, "");
  } catch {
    return date.getFullYear().toString() +
           String(date.getMonth() + 1).padStart(2, "0") +
           String(date.getDate()).padStart(2, "0");
  }
}

// Hour offset from UTC for the spot on the given date. NZ-aware so daylight
// saving is handled correctly across the year.
function tzOffsetForSpot(spot, date) {
  try {
    const tz = isNZSpot(spot)
      ? "Pacific/Auckland"
      : Intl.DateTimeFormat().resolvedOptions().timeZone;
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, timeZoneName: "shortOffset"
    });
    const parts = fmt.formatToParts(date);
    const tzName = parts.find((p) => p.type === "timeZoneName")?.value || "";
    const m = tzName.match(/GMT([+-]?\d+)/);
    return m ? parseInt(m[1], 10) : 12;
  } catch {
    return -date.getTimezoneOffset() / 60;
  }
}

function isNZSpot(spot) {
  return spot.lat < -34 && spot.lat > -48 && spot.lon > 165 && spot.lon < 180;
}

async function fetchAir(spot) {
  const base = "https://air-quality-api.open-meteo.com/v1/air-quality";
  const params = new URLSearchParams({
    latitude: spot.lat,
    longitude: spot.lon,
    hourly: "pm10,pm2_5,uv_index",
    timezone: "Pacific/Auckland",
    forecast_days: "2"
  });
  try {
    const r = await fetch(`${base}?${params}`);
    if (!r.ok) return null;
    return r.json();
  } catch { return null; }
}

// ---------- Aggregation across models ----------
//
// Open-Meteo, when given multiple models, returns each variable suffixed with
// `_<model>` (e.g. `temperature_2m_ecmwf_ifs025`). We collapse these into
// mean + per-model arrays.

function aggregateMultiModel(json) {
  const hourly = json.hourly;
  const daily = json.daily;
  if (!hourly) return null;

  const time = hourly.time;
  const N = time.length;

  // Group hourly fields by base variable name.
  const hAgg = { time };
  for (const v of WEATHER_VARS) {
    const perModel = {};
    for (const m of WEATHER_MODELS) {
      const key = `${v}_${m}`;
      if (Array.isArray(hourly[key])) perModel[m] = hourly[key];
    }
    const isDir = v === "wind_direction_10m";
    // weather_code is categorical (a WMO enum), not a quantity. Averaging it
    // produces meaningless values like 42 that aren't real codes — which then
    // render as a bare "•" dot. Use the modal (most common) code instead.
    const isCode = v === "weather_code";
    const meanArr = new Array(N);
    const minArr = new Array(N);
    const maxArr = new Array(N);
    for (let i = 0; i < N; i++) {
      const vals = Object.values(perModel).map((a) => a[i]).filter((x) => typeof x === "number");
      if (!vals.length) {
        meanArr[i] = null; minArr[i] = null; maxArr[i] = null;
      } else if (isCode) {
        meanArr[i] = mode(vals);
        minArr[i] = null; maxArr[i] = null;
      } else if (isDir) {
        meanArr[i] = circularMean(vals);
        minArr[i] = null; maxArr[i] = null;
      } else {
        meanArr[i] = mean(vals);
        minArr[i] = Math.min(...vals);
        maxArr[i] = Math.max(...vals);
      }
    }
    hAgg[v] = meanArr;
    hAgg[`${v}_min`] = minArr;
    hAgg[`${v}_max`] = maxArr;
    hAgg[`${v}_models`] = perModel;
  }

  // Daily — average per model.
  const dAgg = { time: daily.time };
  for (const v of DAILY_VARS) {
    const perModel = [];
    for (const m of WEATHER_MODELS) {
      const k = `${v}_${m}`;
      if (Array.isArray(daily[k])) perModel.push(daily[k]);
    }
    if (v === "sunrise" || v === "sunset") {
      // Take the first model that has these (they're astronomical, identical across models).
      dAgg[v] = perModel[0] || daily[v] || [];
    } else if (v === "weather_code") {
      // Modal value across models.
      const N2 = (perModel[0] || []).length;
      dAgg[v] = new Array(N2);
      for (let i = 0; i < N2; i++) {
        const codes = perModel.map((a) => a[i]).filter((x) => x != null);
        dAgg[v][i] = mode(codes);
      }
    } else {
      const N2 = (perModel[0] || []).length;
      dAgg[v] = new Array(N2);
      for (let i = 0; i < N2; i++) {
        const vals = perModel.map((a) => a[i]).filter((x) => typeof x === "number");
        dAgg[v][i] = vals.length ? mean(vals) : null;
      }
    }
  }

  return { hourly: hAgg, daily: dAgg };
}

function mode(arr) {
  if (!arr.length) return null;
  const counts = new Map();
  for (const v of arr) counts.set(v, (counts.get(v) || 0) + 1);
  let best = arr[0], bestN = -1;
  for (const [k, n] of counts) if (n > bestN) { best = k; bestN = n; }
  return best;
}

// ---------- Tide processing ----------
//
// Open-Meteo's marine endpoint returns sea_level_height_msl as a smooth tidal
// curve in metres relative to mean sea level. We find local minima/maxima to
// extract high/low tide times.

function extractTideEvents(times, heights, todayOnly = true) {
  const events = [];
  if (!times || !heights) return events;
  const today = new Date();
  const dayKey = today.toDateString();
  for (let i = 1; i < heights.length - 1; i++) {
    const h = heights[i];
    if (h == null) continue;
    const prev = heights[i - 1];
    const next = heights[i + 1];
    if (prev == null || next == null) continue;
    const t = new Date(times[i]);
    if (todayOnly && t.toDateString() !== dayKey) continue;
    if (h > prev && h > next) events.push({ time: times[i], height: h, type: "high" });
    else if (h < prev && h < next) events.push({ time: times[i], height: h, type: "low" });
  }
  return events;
}

// ---------- Solunar / astronomy ----------
//
// Simplified moon-phase + lunar-transit calc. Good enough for solunar major /
// minor windows used by fishermen.

function moonPhase(date) {
  // Returns fraction 0..1, 0 = new moon, 0.5 = full.
  const synodic = 29.530588853;
  const ref = new Date(Date.UTC(2000, 0, 6, 18, 14)); // known new moon
  const days = (date - ref) / 86400000;
  return ((days % synodic) + synodic) % synodic / synodic;
}
function moonPhaseName(p) {
  if (p < 0.03 || p > 0.97) return "New moon";
  if (p < 0.22) return "Waxing crescent";
  if (p < 0.28) return "First quarter";
  if (p < 0.47) return "Waxing gibbous";
  if (p < 0.53) return "Full moon";
  if (p < 0.72) return "Waning gibbous";
  if (p < 0.78) return "Last quarter";
  return "Waning crescent";
}
function moonIllumination(p) {
  return Math.round((1 - Math.cos(2 * Math.PI * p)) / 2 * 100);
}

// Simplified moon transit times (overhead, underfoot). Returns ISO times today.
function lunarTransits(date, lon) {
  // Moon transits ~50min later each day. Use an offset from solar noon.
  const sm = solarMean(date, lon); // noon UTC adjusted to local longitude
  const phase = moonPhase(date);
  // Phase fraction of synodic month → hour offset from solar noon (~24.84h cycle / 2)
  const offsetHours = phase * 24.84; // moon lags sun by ~12.42h per half cycle
  const overheadMs = sm + offsetHours * 3600 * 1000;
  const underfootMs = overheadMs + 12.42 * 3600 * 1000;
  return {
    overhead: new Date(overheadMs).toISOString(),
    underfoot: new Date(underfootMs).toISOString()
  };
}
function solarMean(date, lon) {
  // Returns ms timestamp of approximate solar noon at given longitude today.
  const d = new Date(date);
  d.setUTCHours(12, 0, 0, 0);
  return d.getTime() - (lon * 4 * 60 * 1000); // 4 min per degree
}

// Solunar windows: 2h major centred on lunar transit (overhead / underfoot),
// 3h minor centred on moonrise / moonset (approximated as transit ± 6.21h).
// Width matches the Fishing Website / Solunar Theory convention.
function solunarWindows(date, lon) {
  const t = lunarTransits(date, lon);
  const ov = new Date(t.overhead).getTime();
  const uf = new Date(t.underfoot).getTime();
  const moonRise = ov + 6.21 * 3600 * 1000;   // ~6h after overhead
  const moonSet  = ov - 6.21 * 3600 * 1000;   // ~6h before overhead
  return {
    majorA: { start: new Date(ov - 60 * 60 * 1000), end: new Date(ov + 60 * 60 * 1000) },
    majorB: { start: new Date(uf - 60 * 60 * 1000), end: new Date(uf + 60 * 60 * 1000) },
    // 3-hour minor windows (matches the wider convention used by most fishing sites)
    minorA: { start: new Date(moonRise - 90 * 60 * 1000), end: new Date(moonRise + 90 * 60 * 1000) },
    minorB: { start: new Date(moonSet  - 90 * 60 * 1000), end: new Date(moonSet  + 90 * 60 * 1000) }
  };
}

// Solunar day score 0..100 based on moon phase strength and overlap with daylight.
function solunarDayScore(date, lon, sunriseISO, sunsetISO) {
  const phase = moonPhase(date);
  const phaseStrength = Math.cos(2 * Math.PI * phase); // +1 full, -1 new
  // Both new and full are strong — use abs of (full-ness − 0.5) inverted.
  const strong = 1 - Math.abs(Math.abs(phase - 0.5) - 0.5) * 4; // peaks at 0 and 0.5
  const base = (strong + 1) / 2 * 70; // 0..70
  const w = solunarWindows(date, lon);
  let dayBonus = 0;
  if (sunriseISO && sunsetISO) {
    const sr = new Date(sunriseISO).getTime();
    const ss = new Date(sunsetISO).getTime();
    for (const win of [w.majorA, w.majorB, w.minorA, w.minorB]) {
      if (win.start.getTime() < ss && win.end.getTime() > sr) {
        dayBonus += win === w.majorA || win === w.majorB ? 10 : 5;
      }
    }
  }
  return Math.min(100, Math.round(base + dayBonus));
}

// ---------- Weather code → icon/text ----------

const WMO = {
  0: ["☀️", "Clear"],
  1: ["🌤️", "Mainly clear"],
  2: ["⛅", "Partly cloudy"],
  3: ["☁️", "Overcast"],
  45: ["🌫️", "Fog"], 48: ["🌫️", "Rime fog"],
  51: ["🌦️", "Light drizzle"], 53: ["🌦️", "Drizzle"], 55: ["🌦️", "Heavy drizzle"],
  56: ["🌧️", "Freezing drizzle"], 57: ["🌧️", "Freezing drizzle"],
  61: ["🌧️", "Light rain"], 63: ["🌧️", "Rain"], 65: ["🌧️", "Heavy rain"],
  66: ["🌧️", "Freezing rain"], 67: ["🌧️", "Freezing rain"],
  71: ["🌨️", "Light snow"], 73: ["🌨️", "Snow"], 75: ["❄️", "Heavy snow"],
  77: ["🌨️", "Snow grains"],
  80: ["🌦️", "Showers"], 81: ["🌧️", "Showers"], 82: ["⛈️", "Heavy showers"],
  85: ["🌨️", "Snow showers"], 86: ["🌨️", "Snow showers"],
  95: ["⛈️", "Thunderstorm"], 96: ["⛈️", "Storm + hail"], 99: ["⛈️", "Severe storm"]
};
function wmo(code) { return WMO[code] || ["•", "—"]; }

// ---------- Verdict scoring ----------

function hourVerdict(h, marineHour) {
  const t = state.thresholds;
  const windKt = (h.wind_speed_10m || 0) * KMH_TO_KT;
  const gustKt = (h.wind_gusts_10m || 0) * KMH_TO_KT;
  const wave   = marineHour?.wave_height ?? 0;
  const rain   = h.precipitation || 0;
  const temp   = h.temperature_2m;

  let breaches = 0;
  if (windKt > t.maxWindKt) breaches++;
  if (gustKt > t.maxGustKt) breaches++;
  if (wave > t.maxWaveM) breaches++;
  if (rain > t.maxRainMm) breaches++;
  if (temp != null && temp < t.minTempC) breaches++;

  if (breaches === 0) return "green";
  if (breaches <= 1)  return "amber";
  return "red";
}

// Boating-specific verdict — same as hourVerdict but IGNORES temperature.
// Air temp is a comfort thing ("wear a jacket"), not a safety thing — a
// 10°C morning with flat sea and no wind is perfectly fine to be on. Used
// only by computeBoatingScores; the FISH formula and hour-card colouring
// keep the full hourVerdict so cold mornings still flag for fish behaviour
// and personal comfort calls.
function boatingHourCheck(h, marineHour) {
  const t = state.thresholds;
  const windKt = (h.wind_speed_10m || 0) * KMH_TO_KT;
  const gustKt = (h.wind_gusts_10m || 0) * KMH_TO_KT;
  const wave   = marineHour?.wave_height ?? 0;
  const rain   = h.precipitation || 0;
  let breaches = 0;
  if (windKt > t.maxWindKt) breaches++;
  if (gustKt > t.maxGustKt) breaches++;
  if (wave > t.maxWaveM) breaches++;
  if (rain > t.maxRainMm) breaches++;
  return breaches === 0 ? "green" : breaches <= 1 ? "amber" : "red";
}

// Continuous 0-100 boating score for a single hour. Smooth — at zero
// conditions you get 100, at threshold ~50, at 2x threshold ~0. Lets a
// flat-calm day genuinely outscore a threshold-hugging day even though
// both technically "pass". No temp factor — dress for the weather.
function boatingHourScore(h, marineHour) {
  const t = state.thresholds;
  const windKt = (h.wind_speed_10m || 0) * KMH_TO_KT;
  const gustKt = (h.wind_gusts_10m || 0) * KMH_TO_KT;
  const wave   = marineHour?.wave_height ?? 0;
  const rain   = h.precipitation || 0;
  // Fraction-of-budget per metric, clamped [0, 2].
  const w = Math.min(2, windKt / Math.max(1, t.maxWindKt));
  const g = Math.min(2, gustKt / Math.max(1, t.maxGustKt));
  const v = Math.min(2, wave   / Math.max(0.1, t.maxWaveM));
  const r = Math.min(2, rain   / Math.max(0.1, t.maxRainMm));
  // Weights sum to 50 at threshold, 100 at double-threshold so:
  //   calm conditions → 100, at-threshold → 50, well over → 0.
  // Wind + swell get the biggest weights since they're the actual safety
  // signals; gust and rain are secondary.
  const penalty = w * 15 + g * 11 + v * 15 + r * 9;
  return Math.max(0, Math.min(100, Math.round(100 - penalty)));
}

// 0-100 "fishability" for a single hour. Smooth — each metric contributes
// proportionally to its distance from threshold so the bar tells you "how
// nice" rather than just pass/fail. Used by the hour cards.
function hourScore(h, marineHour) {
  const t = state.thresholds;
  const windKt = (h.wind_speed_10m || 0) * KMH_TO_KT;
  const gustKt = (h.wind_gusts_10m || 0) * KMH_TO_KT;
  const wave   = marineHour?.wave_height ?? 0;
  const rain   = h.precipitation || 0;
  const temp   = h.temperature_2m;

  // Fraction-of-budget used for each metric, clamped [0,2]. 0 = idyllic, 1 =
  // at threshold, >1 = over.
  const w = Math.min(2, windKt / Math.max(1, t.maxWindKt));
  const g = Math.min(2, gustKt / Math.max(1, t.maxGustKt));
  const v = Math.min(2, wave   / Math.max(0.1, t.maxWaveM));
  const r = Math.min(2, rain   / Math.max(0.1, t.maxRainMm));
  const cold = temp != null && temp < t.minTempC ? Math.min(2, (t.minTempC - temp) / 5) : 0;

  // Weighted penalty (wind+gust are the biggest fishing killers).
  const penalty = (w * 28 + g * 22 + v * 22 + r * 18 + cold * 10);
  return Math.max(0, Math.min(100, Math.round(100 - penalty)));
}

function bestWindowToday(hourly, marineHourly, sunriseISO, sunsetISO) {
  const sr = new Date(sunriseISO || Date.now()).getTime();
  const ss = new Date(sunsetISO || (Date.now() + 12 * 3600 * 1000)).getTime();
  let bestStart = null, bestEnd = null, runStart = null;
  for (let i = 0; i < hourly.time.length; i++) {
    const t = new Date(hourly.time[i]).getTime();
    if (t < sr || t > ss) { runStart = null; continue; }
    const mIdx = marineHourly ? indexAtTime(marineHourly.time, hourly.time[i]) : -1;
    const mH = mIdx >= 0 ? sliceHour(marineHourly, mIdx) : null;
    const h = sliceHour(hourly, i);
    const v = hourVerdict(h, mH);
    if (v === "green") {
      if (runStart == null) runStart = t;
      const len = t - runStart;
      const bestLen = bestStart ? bestEnd - bestStart : 0;
      if (len > bestLen) { bestStart = runStart; bestEnd = t; }
    } else runStart = null;
  }
  return bestStart ? { start: new Date(bestStart), end: new Date(bestEnd) } : null;
}

function indexAtTime(times, iso) {
  for (let i = 0; i < times.length; i++) if (times[i] === iso) return i;
  return -1;
}
function sliceHour(h, i) {
  const out = {};
  for (const k of Object.keys(h)) {
    if (Array.isArray(h[k])) out[k] = h[k][i];
  }
  return out;
}

// ---------- Rendering ----------

function renderSpotPicker() {
  const wrap = $("#spotPicker");
  wrap.innerHTML = "";
  for (const s of state.spots) {
    const chip = el("button", {
      class: "spot-chip" + (s.id === state.activeSpotId ? " active" : ""),
      onclick: () => { state.activeSpotId = s.id; saveJSON("activeSpotId", s.id); refreshOpenMapsLink(); refresh(); }
    }, s.name);
    wrap.appendChild(chip);
  }
  // GPS chip
  const gps = el("button", {
    class: "spot-chip" + (state.activeSpotId === "__gps__" ? " active" : ""),
    onclick: useGPS
  }, "📍 Use my location");
  wrap.appendChild(gps);
}

// Pick the closest non-GPS (sea/fishing) spot to a given lat/lon. Used so that
// "Use my location" anchors the FORECAST to a real sea spot near you rather
// than your inland GPS point — you fish at sea, not at your house, and the
// marine APIs (tides/waves/swell) return nothing for an inland coordinate.
// Returns null only if there are no sea spots at all (DEFAULT_SPOTS seeds them).
function nearestSeaSpot(lat, lon) {
  let best = null;
  let bestD = Infinity;
  const cosLat = Math.cos((lat * Math.PI) / 180);
  for (const s of state.spots) {
    if (s.id === "__gps__") continue;
    // Equirectangular approximation — plenty accurate at these distances.
    const dLat = s.lat - lat;
    const dLon = (s.lon - lon) * cosLat;
    const d = dLat * dLat + dLon * dLon;
    if (d < bestD) { bestD = d; best = s; }
  }
  return best;
}

function useGPS() {
  if (!navigator.geolocation) { toast("No geolocation available"); return; }
  toast("Locating…");
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = +pos.coords.latitude.toFixed(4);
      const lon = +pos.coords.longitude.toFixed(4);
      const existing = state.spots.find((s) => s.id === "__gps__");
      const spot = { id: "__gps__", name: "My location", lat, lon };
      if (existing) Object.assign(existing, spot);
      else state.spots.unshift(spot);
      saveJSON("spots", state.spots);
      state.activeSpotId = "__gps__";
      saveJSON("activeSpotId", "__gps__");
      state._gpsRefreshedThisSession = true;
      refresh();
    },
    (err) => toast("Couldn't get GPS: " + err.message),
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
  );
}

// Silently update __gps__ coords on every fresh refresh() — but only if
// the user is currently looking at their GPS spot, and only once per
// session so we don't hammer geolocation on every spot switch. Fails
// silently if permission denied or geolocation unavailable — we just
// keep whatever last-known coords we had.
async function maybeRefreshGPS() {
  if (state.activeSpotId !== "__gps__") return;
  if (state._gpsRefreshedThisSession) return;
  if (!navigator.geolocation) return;
  state._gpsRefreshedThisSession = true;
  try {
    const pos = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 8000,             // give the first-ever permission prompt time to be answered
        maximumAge: 5 * 60 * 1000  // accept up to 5 min stale to avoid waiting
      });
    });
    const lat = +pos.coords.latitude.toFixed(4);
    const lon = +pos.coords.longitude.toFixed(4);
    const existing = state.spots.find((s) => s.id === "__gps__");
    if (!existing) {
      state.spots.unshift({ id: "__gps__", name: "My location", lat, lon });
      saveJSON("spots", state.spots);
      return;
    }
    // Only persist if we've actually moved (>1km from last known)
    const drift = Math.hypot(existing.lat - lat, existing.lon - lon);
    if (drift > 0.01) {
      existing.lat = lat;
      existing.lon = lon;
      saveJSON("spots", state.spots);
    }
  } catch {
    // Permission denied / timeout / no signal — keep last-known coords.
  }
}

function renderAll() {
  const { spot } = state.data;
  $("#spotName").textContent = spot.name;
  $("#spotMeta").textContent = `${spot.lat.toFixed(3)}, ${spot.lon.toFixed(3)} · updated ${new Date().toLocaleTimeString("en-NZ", { hour: "2-digit", minute: "2-digit" })}`;
  // Lazy render: only the currently-visible tab is built on the main thread.
  // Saves ~50-100ms of off-screen DOM work on every refresh. The other tabs
  // render lazily on tab switch via setActiveTab → renderForTab.
  renderForTab(state.activeTab || "today");
}

// Per-tab renderer dispatch. Each render call is wrapped in safeRender so
// one bad card can't take down the whole tab. The page used to go fully
// blank on any render exception — this trades a single broken card for an
// otherwise-working page.
function renderForTab(tabId) {
  try {
    if (tabId === "log")   { safeRender("CatchLog", renderCatchLog); return; }
    if (tabId === "spots") { safeRender("SpotsTab", renderSpotsTab); return; }
    if (!state.data) return;

    const { spot, hourlyAgg, dailyAgg, marine, air, solunar, solunarTomorrow } = state.data;
    let dailyScores, boatingScores;
    try {
      dailyScores = computeDailyScores(dailyAgg, hourlyAgg, marine, spot);
    } catch (e) {
      console.error("computeDailyScores failed:", e);
      dailyScores = [];
    }
    try {
      boatingScores = computeBoatingScores(dailyAgg, hourlyAgg, marine);
    } catch (e) {
      console.error("computeBoatingScores failed:", e);
      boatingScores = [];
    }

    if (tabId === "today") {
      safeRender("Hero",     () => renderHero(hourlyAgg, marine, dailyAgg, dailyScores, boatingScores));
      safeRender("Warnings", () => renderWarnings(hourlyAgg, marine));
      safeRender("Bait",     () => renderBaitCard(hourlyAgg, marine));
      safeRender("WeekGrid", () => renderWeekGrid(dailyAgg, hourlyAgg, marine, dailyScores, boatingScores));
      safeRender("Hourly",   () => renderHourly(hourlyAgg, marine));
    } else if (tabId === "conditions") {
      // Conditions: detailed "now" data only (no week-level cards). The week
      // view lives entirely on the Today tab. Cards: Tides & flow, Pressure,
      // Sea temp, Wind, Swell, Solunar, Model agreement.
      safeRender("Tides",     () => renderTides(marine));
      safeRender("TidesFlow", () => renderTidesFlow(marine, hourlyAgg, dailyAgg, spot, solunar));
      safeRender("Pressure",  () => renderPressureCard(hourlyAgg));
      safeRender("SeaTemp",   () => renderSeaTemp(marine));
      safeRender("Wind",      () => renderWind(hourlyAgg));
      safeRender("Swell",     () => renderSwell(marine, hourlyAgg));
      safeRender("Solunar",   () => renderSolunar(spot, dailyAgg, air, solunar));
      safeRender("Agreement", () => renderAgreement(hourlyAgg));
    } else if (tabId === "forecast") {
      safeRender("BiteTimes", () => renderBiteTimes(spot, solunar, solunarTomorrow, dailyAgg));
      safeRender("Catch",     () => renderCatch(spot, hourlyAgg, dailyAgg, marine, solunar));
    } else if (tabId === "spots") {
      safeRender("XLinks",    () => renderXLinks(spot));
    }
  } catch (e) {
    console.error("renderForTab dispatcher failed:", e);
    showFatalError(e);
  }
}

// Run a render call inside a try/catch. If it throws, log it but keep the
// page alive. Pushes a visible toast so you can see something broke without
// having to open DevTools.
function safeRender(label, fn) {
  try {
    fn();
  } catch (e) {
    console.error(`[render:${label}]`, e);
    toast(`${label} render failed — see console`);
  }
}

// Last-resort error UI for when even the dispatcher itself crashes. Replaces
// the verdict block with an error message + a Force-reload button so the
// user can recover without having to dig into Settings.
function showFatalError(e) {
  const headline = $("#verdictHeadline");
  const detail = $("#verdictDetail");
  if (headline) headline.textContent = "Something went wrong";
  if (detail) {
    detail.innerHTML = "";
    const msg = el("span", {}, String(e?.message || e || "Unknown error"));
    const btn = el("button", {
      class: "primary-btn",
      style: "margin-left:8px;",
      onclick: forceUpdate
    }, "Force reload");
    detail.appendChild(msg);
    detail.appendChild(btn);
  }
}

// "Boating" score per day — pure safety/comfort (wind + gust + swell + rain +
// temp). Just the % of daylight hours that pass your thresholds, on a 0-100
// scale. Decouples "is it safe and pleasant to be on the water" from the
// fishing-specific factors (tide, solunar, pressure). When this is high and
// the fishing score is low, you're getting a beautiful day but a slow bite —
// exactly what was confusing the user on Thursday.
function computeBoatingScores(daily, hourly, marine) {
  const out = [];
  for (let d = 0; d < daily.time.length; d++) {
    const dayKey = daily.time[d];
    const dayIdxs = [];
    for (let i = 0; i < hourly.time.length; i++) {
      if (!hourly.time[i].startsWith(dayKey)) continue;
      const hh = new Date(hourly.time[i]).getHours();
      if (hh >= 6 && hh <= 20) dayIdxs.push(i);
    }
    // Mean of the continuous per-hour score across daylight hours. Gives
    // a true gradient instead of the binary "all hours pass = 100, any
    // hour fails = penalty" we had before. So a 0.3m swell day naturally
    // outscores a 1.0m swell day even though both are under the limit.
    let total = 0;
    for (const i of dayIdxs) {
      const cur = sliceHour(hourly, i);
      const mIdx = marine ? indexAtTime(marine.hourly.time, hourly.time[i]) : -1;
      const mCur = mIdx >= 0 ? sliceHour(marine.hourly, mIdx) : null;
      total += boatingHourScore(cur, mCur);
    }
    const score = dayIdxs.length ? Math.round(total / dayIdxs.length) : 50;
    out.push({ date: dayKey, score });
  }
  return out;
}

// Per-day 0-100 score + a "peak window" — the longest run of green hours
// within daylight for the day. Shared between the hero, the 7-day row badge,
// and the Best-day card so all three agree. This is the FISHING score
// (weather + tide + solunar + pressure).
function computeDailyScores(daily, hourly, marine, spot) {
  const out = [];
  for (let d = 0; d < daily.time.length; d++) {
    const dayKey = daily.time[d];

    const allIdxs = [];
    for (let i = 0; i < hourly.time.length; i++) {
      if (hourly.time[i].startsWith(dayKey)) allIdxs.push(i);
    }
    const dayIdxs = allIdxs.filter((i) => {
      const hh = new Date(hourly.time[i]).getHours();
      return hh >= 6 && hh <= 20;
    });

    // 1) Weather (0-30): green-hour ratio across daylight.
    let greenHrs = 0;
    let runStart = null, bestStart = null, bestEnd = null;
    for (const i of dayIdxs) {
      const cur = sliceHour(hourly, i);
      const mIdx = marine ? indexAtTime(marine.hourly.time, hourly.time[i]) : -1;
      const mCur = mIdx >= 0 ? sliceHour(marine.hourly, mIdx) : null;
      const v = hourVerdict(cur, mCur);
      if (v === "green") {
        greenHrs++;
        const t = new Date(hourly.time[i]).getTime();
        if (runStart == null) runStart = t;
        const len = t - runStart;
        const bestLen = bestStart ? bestEnd - bestStart : 0;
        if (len >= bestLen) { bestStart = runStart; bestEnd = t + 3600 * 1000; }
      } else {
        runStart = null;
      }
    }
    const greenRatio = dayIdxs.length ? greenHrs / dayIdxs.length : 0;
    const weatherScore = greenRatio * 30;

    // 2) Tide range (0-25). Auckland-calibrated.
    let tideScore = 12.5, tideRange = null;
    if (marine?.hourly?.sea_level_height_msl) {
      const mIdxs = [];
      for (let i = 0; i < marine.hourly.time.length; i++) {
        if (marine.hourly.time[i].startsWith(dayKey)) mIdxs.push(i);
      }
      const hs = mIdxs.map((i) => marine.hourly.sea_level_height_msl[i]).filter((x) => x != null);
      if (hs.length) {
        tideRange = Math.max(...hs) - Math.min(...hs);
        const pct = Math.max(0, Math.min(1, (tideRange - 1.5) / (3.4 - 1.5)));
        tideScore = pct * 25;
      }
    }

    // 3) Solunar (0-25).
    const dayDate = new Date(dayKey + "T12:00:00");
    const solScore01 = solunarDayScore(dayDate, spot.lon, daily.sunrise?.[d], daily.sunset?.[d]) / 100;
    const solComp = solScore01 * 25;

    // 4) Barometric trend (0-20) — bimodal. Both rising (post-front recovery)
    //    AND moderately falling (pre-front feeding window) score well; only
    //    flat-steady and frontal-crash score low. Reflects what actual
    //    fishermen know: "fish before the storm" is a real thing.
    let barScore = 10;
    let dPSigned = null;
    if (allIdxs.length >= 12 && hourly.pressure_msl) {
      const pStart = hourly.pressure_msl[allIdxs[0]];
      const pEnd = hourly.pressure_msl[allIdxs[allIdxs.length - 1]];
      if (pStart != null && pEnd != null) {
        dPSigned = pEnd - pStart;
        const absDP = Math.abs(dPSigned);
        // Sweet spot for active feeding: ~1–5 hPa change (either direction).
        // Steady (|dP|≈0) is meh, crashing (|dP|>6) is bad.
        const goodness = Math.min(absDP / 4, 1);    // 0 at steady, 1 at ±4 hPa
        barScore = 10 + goodness * 8;                // 10 (steady) → 18 (±4 hPa)
        if (absDP > 6) {
          // Rapid change = front arriving / passing through. Walk it back.
          barScore = Math.max(4, barScore - (absDP - 6) * 3);
        }
      }
    }

    const total = Math.round(weatherScore + tideScore + solComp + barScore);

    const reasons = [];
    if (greenRatio > 0.7) reasons.push("light winds");
    else if (greenRatio < 0.3) reasons.push("rough weather");
    if (tideScore > 18) reasons.push("spring tides");
    else if (tideScore < 7) reasons.push("neap tides");
    if (solComp > 18) reasons.push("strong solunar");
    // Pressure reasons — credit rising AND pre-front falling, flag frontal crash
    if (dPSigned != null) {
      const absDP = Math.abs(dPSigned);
      if (absDP > 6) reasons.push("front passing");
      else if (dPSigned > 1.5) reasons.push("rising pressure");
      else if (dPSigned < -1.5) reasons.push("pre-front feed");
    }

    out.push({
      date: dayKey,
      score: total,
      reasons: reasons.length ? reasons : ["average conditions"],
      peakStart: bestStart ? new Date(bestStart) : null,
      peakEnd: bestEnd ? new Date(bestEnd) : null
    });
  }
  return out;
}

// ---------- Bite times (dedicated card, high on the page) ----------

const FISH_SVG = (color) => `<svg class="fish-svg" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
  <path d="M2 12 C 5 7, 11 5, 16 6.5 L 20 4 L 20 20 L 16 17.5 C 11 19, 5 17, 2 12 Z" fill="${color}"/>
  <circle cx="15" cy="11" r="1.2" fill="#0b1a2b"/>
  <path d="M 16 6.5 L 16 17.5" stroke="${color}" stroke-width="0.5" opacity="0.4"/>
</svg>`;

function renderBiteTimes(spot, solunarToday, solunarTomorrow, daily) {
  const wrap = $("#biteToday");
  const headline = $("#biteHeadline");
  wrap.innerHTML = "";

  const today = new Date();
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);

  // For the card headline: show today's day rating.
  const todayUseApi = !!(solunarToday && solunarToday.majorA?.start);
  const todayRating = todayUseApi && solunarToday.dayRating != null
    ? Math.round(solunarToday.dayRating)
    : solunarDayScore(today, spot.lon, daily.sunrise?.[0], daily.sunset?.[0]);
  headline.textContent = `· today ${todayRating}/100`;

  wrap.append(
    biteDaySection("Today",    today,    solunarToday,    spot, daily, 0),
    biteDaySection("Tomorrow", tomorrow, solunarTomorrow, spot, daily, 1)
  );
}

function biteDaySection(label, date, solunar, spot, daily, dayIdx) {
  const useApi = !!(solunar && solunar.majorA?.start);
  const w = useApi ? solunar : solunarWindows(date, spot.lon);
  const now = Date.now();
  const winT = (t) => (t instanceof Date ? t : new Date(t));
  const isNow = (win) => {
    if (!win?.start || !win?.end) return false;
    const s = winT(win.start).getTime();
    const e = winT(win.end).getTime();
    return now >= s && now <= e;
  };

  const rating = useApi && solunar.dayRating != null
    ? Math.round(solunar.dayRating)
    : solunarDayScore(date, spot.lon, daily.sunrise?.[dayIdx], daily.sunset?.[dayIdx]);

  return el("div", { class: "bite-day" }, [
    el("h4", {}, [
      el("span", {}, label),
      el("span", { class: "day-rating" }, `${rating}/100`)
    ]),
    el("div", { class: "bite-grid" }, [
      el("div", { class: "bite-col" }, [
        el("h3", { html: `${FISH_SVG("#ffd47a")} Major bite` }),
        biteRow("major", w.majorA, isNow(w.majorA), "#ffd47a"),
        biteRow("major", w.majorB, isNow(w.majorB), "#ffd47a")
      ]),
      el("div", { class: "bite-col" }, [
        el("h3", { html: `${FISH_SVG("#ff7a7a")} Minor bite` }),
        biteRow("minor", w.minorA, isNow(w.minorA), "#ff7a7a"),
        biteRow("minor", w.minorB, isNow(w.minorB), "#ff7a7a")
      ])
    ])
  ]);
}

function biteRow(type, win, isNow, color) {
  if (!win?.start || !win?.end) {
    return el("div", { class: `bite-row ${type}` }, [el("span", {}, "—")]);
  }
  const s = win.start instanceof Date ? win.start : new Date(win.start);
  const e = win.end   instanceof Date ? win.end   : new Date(win.end);
  return el("div", { class: `bite-row ${type}` }, [
    el("span", { class: "fish-svg", html: FISH_SVG(color) }),
    el("span", { class: "range" }, `${fmtTime(s.toISOString())} – ${fmtTime(e.toISOString())}`),
    isNow ? el("span", { class: "now-tag" }, "NOW") : null
  ]);
}

// ---------- Catch forecast (per-species) ----------
//
// Tight-Lines-style species panel — chips for every species in SPECIES, a
// big "active" card with score + confidence + Māori name + dynamic intel,
// and a 24-hour hot/warm/slow bite timeline driven by real solunar + tide
// data. Scoring is derived from your live feed: SST vs species range,
// current month vs peak season, solunar quality, tide flow, pressure
// trend, sea state. Nothing here is mock.

function scoreSpecies(sp, ctx) {
  const { sst, tideRange, pressureTrend, monthIdx, sunrise, sunset, solunar, waveMax } = ctx;

  // 1. SST fit (0-25). Inside ideal = 25, inside ok band = 15, outside = 5.
  let tempFit = 12, tempNote = "no SST data";
  if (sst != null) {
    if (sst >= sp.tempIdeal[0] && sst <= sp.tempIdeal[1]) {
      tempFit = 25; tempNote = `peak ${sp.name.toLowerCase()} zone`;
    } else if (sst >= sp.tempOk[0] && sst <= sp.tempOk[1]) {
      tempFit = 15;
      tempNote = sst < sp.tempIdeal[0] ? "edge of range, cool side" : "edge of range, warm side";
    } else {
      tempFit = 5;
      tempNote = sst < sp.tempIdeal[0] ? "too cold" : "too warm";
    }
  }

  // 2. Season fit (0-20). Peak month = 20, shoulder = 12, off = 5.
  let seasonFit = 5;
  if (sp.peakMonths.includes(monthIdx)) seasonFit = 20;
  else {
    const prev = monthIdx === 1 ? 12 : monthIdx - 1;
    const next = monthIdx === 12 ? 1 : monthIdx + 1;
    if (sp.peakMonths.includes(prev) || sp.peakMonths.includes(next)) seasonFit = 12;
  }

  // 3. Best solunar window in daylight (0-20).
  let solFit = 10;
  if (solunar && sunrise && sunset) {
    const sr = sunrise instanceof Date ? sunrise : new Date(sunrise);
    const ss = sunset instanceof Date ? sunset : new Date(sunset);
    for (const win of [solunar.majorA, solunar.majorB]) {
      if (win?.start && win?.end) {
        const s = win.start instanceof Date ? win.start : new Date(win.start);
        const e = win.end instanceof Date ? win.end : new Date(win.end);
        if (e > sr && s < ss) { solFit = 20; break; }
      }
    }
  }

  // 4. Sea state (0-15). Offshore/deep species are penalised by big swell.
  let calmFit = 10;
  if (sp.needsCalm && waveMax != null) {
    if (waveMax < 1.5) calmFit = 15;
    else if (waveMax < 2.5) calmFit = 8;
    else calmFit = 2;
  } else if (waveMax != null) {
    calmFit = waveMax < 2.0 ? 12 : 8;
  }

  // 5. Tide range (0-10). Spring tides help most species; slack-fishers get
  //    a small bonus from the bigger window mid-tide.
  let tideFit = 5;
  if (tideRange != null) {
    if (tideRange > 2.8) tideFit = 10;
    else if (tideRange > 2.2) tideFit = 8;
    else if (tideRange > 1.7) tideFit = 6;
    else tideFit = 4;
  }

  // 6. Pressure trend match (0-10).
  let pFit = 6;
  if (pressureTrend === sp.pressurePref) pFit = 10;
  else if (sp.pressurePref === "any") pFit = 8;
  else if (pressureTrend === "steady") pFit = 7;
  else pFit = 4;

  const score = Math.max(0, Math.min(100,
    Math.round(tempFit + seasonFit + solFit + calmFit + tideFit + pFit)));

  // Confidence — how trustworthy is this score given the inputs?
  let conf = "Low";
  if (tempFit >= 25 && seasonFit >= 20) conf = "High";
  else if (tempFit >= 15 && seasonFit >= 12) conf = "Medium";

  // Templated intel note from the real data. Keep it short and concrete.
  const bits = [];
  if (sst != null) bits.push(`SST ${sst.toFixed(1)}°C — ${tempNote}`);
  if (seasonFit === 20) bits.push("peak season");
  else if (seasonFit <= 5) bits.push("off-season");
  if (solFit === 20) bits.push("solunar major in daylight");
  if (pressureTrend === sp.pressurePref && sp.pressurePref !== "any") {
    bits.push(`${pressureTrend} pressure favours ${sp.name.toLowerCase()}`);
  }
  if (sp.needsCalm && waveMax != null && waveMax >= 2.5) {
    bits.push(`swell ${waveMax.toFixed(1)}m — long run, pick a weather window`);
  }
  const verdict = score >= 80 ? "Send it." :
                  score >= 60 ? "Worth a shot." :
                  score >= 40 ? "Slow but possible." :
                                "Sit this one out.";
  const intel = bits.join(" · ") + (bits.length ? " · " : "") + verdict;

  return { score, conf, intel };
}

// Per-hour bite quality for a species. Returns 24 bands of 'hot'/'warm'/'slow'.
function speciesBiteTimeline(sp, ctx) {
  const { sunrise, sunset, solunar, tideEvents } = ctx;
  const sr = sunrise ? (sunrise instanceof Date ? sunrise : new Date(sunrise)) : null;
  const ss = sunset ? (sunset instanceof Date ? sunset : new Date(sunset)) : null;
  const today = new Date();
  const out = [];

  for (let h = 0; h < 24; h++) {
    const t = new Date(today);
    t.setHours(h, 30, 0, 0);
    let s = 0;

    // Solunar majors/minors
    if (solunar) {
      for (const win of [solunar.majorA, solunar.majorB]) {
        if (win?.start && win?.end) {
          const ws = win.start instanceof Date ? win.start : new Date(win.start);
          const we = win.end instanceof Date ? win.end : new Date(win.end);
          if (t >= ws && t <= we) s += 40;
        }
      }
      for (const win of [solunar.minorA, solunar.minorB]) {
        if (win?.start && win?.end) {
          const ws = win.start instanceof Date ? win.start : new Date(win.start);
          const we = win.end instanceof Date ? win.end : new Date(win.end);
          if (t >= ws && t <= we) s += 20;
        }
      }
    }

    // Time-of-day preferences
    if (sp.biteTime.includes("dawn") && sr) {
      const gap = Math.abs(t - sr) / 60000;
      if (gap < 90) s += 30;
      else if (gap < 180) s += 12;
    }
    if (sp.biteTime.includes("dusk") && ss) {
      const gap = Math.abs(t - ss) / 60000;
      if (gap < 90) s += 30;
      else if (gap < 180) s += 12;
    }
    if (sp.biteTime.includes("day") && sr && ss && t >= sr && t <= ss) s += 12;
    if (sp.biteTime.includes("night")) {
      const hr = t.getHours();
      if (hr >= 22 || hr <= 5) s += 12;
    }

    // Tide flow preference
    if (tideEvents && tideEvents.length) {
      let nearEv = false;
      for (const ev of tideEvents) {
        const gap = Math.abs(new Date(ev.time) - t) / 60000;
        if (gap < 60) { nearEv = true; break; }
      }
      if (sp.flowPref === "slack" && nearEv) s += 18;
      if (sp.flowPref === "flow" && !nearEv) s += 12;
    }

    const band = s >= 50 ? "hot" : s >= 28 ? "warm" : "slow";
    out.push({ hour: h, score: s, band });
  }
  return out;
}

// Extract contiguous "hot" runs as peak windows for the active species.
function peakWindowsFromTimeline(timeline) {
  const runs = [];
  let runStart = null;
  for (let i = 0; i < timeline.length; i++) {
    if (timeline[i].band === "hot") {
      if (runStart == null) runStart = i;
    } else if (runStart != null) {
      runs.push([runStart, i]);
      runStart = null;
    }
  }
  if (runStart != null) runs.push([runStart, timeline.length]);
  return runs;
}

function renderCatch(spot, hourly, daily, marine, solunarApi) {
  const headline = $("#catchHeadline");
  const chipsWrap = $("#speciesChips");
  const activeWrap = $("#speciesActive");
  if (!chipsWrap || !activeWrap) return;
  chipsWrap.innerHTML = "";
  activeWrap.innerHTML = "";

  // Build the shared context once — all species score against the same now.
  const now = Date.now();
  let nowIdx = 0;
  for (let i = 0; i < hourly.time.length; i++) {
    if (new Date(hourly.time[i]).getTime() >= now - 30 * 60 * 1000) { nowIdx = i; break; }
  }

  let sst = null;
  if (marine?.hourly?.sea_surface_temperature) {
    const mIdx = indexAtTime(marine.hourly.time, hourly.time[nowIdx]);
    if (mIdx >= 0) sst = marine.hourly.sea_surface_temperature[mIdx];
  }

  let tideRange = null;
  let tideEvents = [];
  if (marine?.hourly?.sea_level_height_msl) {
    const times = marine.hourly.time, hs = marine.hourly.sea_level_height_msl;
    const todayKey = new Date().toDateString();
    const todayH = [];
    for (let i = 0; i < times.length; i++) {
      if (new Date(times[i]).toDateString() === todayKey && hs[i] != null) todayH.push(hs[i]);
    }
    if (todayH.length) tideRange = Math.max(...todayH) - Math.min(...todayH);
    tideEvents = extractTideEvents(times, hs, true);
  }

  let pressureTrend = "steady";
  if (hourly.pressure_msl) {
    const future = Math.min(hourly.time.length - 1, nowIdx + 12);
    const dP = (hourly.pressure_msl[future] ?? 0) - (hourly.pressure_msl[nowIdx] ?? 0);
    if (dP > 1.5) pressureTrend = "rising";
    else if (dP < -1.5) pressureTrend = "falling";
  }

  let waveMax = null;
  if (marine?.hourly?.wave_height) {
    const todayKey = new Date().toDateString();
    const todayW = [];
    for (let i = 0; i < marine.hourly.time.length; i++) {
      if (new Date(marine.hourly.time[i]).toDateString() === todayKey
          && marine.hourly.wave_height[i] != null) {
        todayW.push(marine.hourly.wave_height[i]);
      }
    }
    if (todayW.length) waveMax = Math.max(...todayW);
  }

  const today = new Date();
  const solWin = (solunarApi && solunarApi.majorA?.start)
    ? solunarApi
    : solunarWindows(today, spot.lon);
  const sunrise = (solunarApi?.sunRise) || (daily.sunrise?.[0] ? new Date(daily.sunrise[0]) : null);
  const sunset  = (solunarApi?.sunSet)  || (daily.sunset?.[0]  ? new Date(daily.sunset[0])  : null);

  const ctx = {
    sst, tideRange, tideEvents, pressureTrend,
    monthIdx: today.getMonth() + 1,
    sunrise, sunset, solunar: solWin, waveMax
  };

  // Score every species, sort hot→cold.
  const scored = SPECIES.map((sp) => ({
    ...sp,
    ...scoreSpecies(sp, ctx),
    timeline: speciesBiteTimeline(sp, ctx)
  })).sort((a, b) => b.score - a.score);

  // Default active = top scorer, unless user already picked one that's still in the list.
  if (!state.activeSpecies || !scored.find((s) => s.id === state.activeSpecies)) {
    state.activeSpecies = scored[0].id;
  }

  if (headline) {
    headline.textContent = scored[0] ? `· top ${scored[0].name.toLowerCase()} ${scored[0].score}/100` : "";
  }

  // Chip row
  for (const sp of scored) {
    const active = sp.id === state.activeSpecies;
    const cls = sp.score >= 70 ? "high" : sp.score >= 45 ? "mid" : "low";
    chipsWrap.appendChild(el("button", {
      class: "sp-chip " + cls + (active ? " active" : ""),
      onclick: () => {
        state.activeSpecies = sp.id;
        saveJSON("activeSpecies", sp.id);
        renderCatch(spot, hourly, daily, marine, solunarApi);
      }
    }, [
      el("span", { class: "sp-name" }, sp.name),
      el("span", { class: "sp-chip-score" }, String(sp.score))
    ]));
  }

  // Active species card
  const active = scored.find((s) => s.id === state.activeSpecies) || scored[0];
  const cls = active.score >= 70 ? "high" : active.score >= 45 ? "mid" : "low";
  const confCls = active.conf === "High" ? "good" : active.conf === "Medium" ? "warn" : "muted";

  const peakRuns = peakWindowsFromTimeline(active.timeline);
  const peakChunks = peakRuns.map(([s, e]) =>
    `${String(s).padStart(2, "0")}:00 – ${String(e).padStart(2, "0")}:00`);

  activeWrap.append(
    el("div", { class: "sp-head" }, [
      el("div", { class: "sp-id" }, [
        el("div", { class: "sp-maori" }, active.maori),
        el("h3", { class: "sp-title" }, active.name),
        el("div", { class: "sp-meta" }, [
          el("span", { class: "sp-pill" }, active.depth),
          el("span", { class: "sp-pill " + confCls }, `${active.conf} conf.`)
        ])
      ]),
      el("div", { class: "sp-bubble " + cls }, [
        el("div", { class: "sp-bubble-n" }, String(active.score)),
        el("div", { class: "sp-bubble-of" }, "/100")
      ])
    ]),
    el("div", { class: "sp-season" }, active.seasonText),
    biteTimelineEl(active.timeline),
    el("div", { class: "sp-intel" }, [el("span", { class: "diamond" }, "◆ "), active.intel]),
    peakChunks.length
      ? el("div", { class: "sp-peaks" }, [
          el("div", { class: "sp-peaks-label" }, "Peak windows today"),
          ...peakChunks.map((c) => el("div", { class: "sp-peak-row" }, c))
        ])
      : el("div", { class: "sp-peaks empty" }, "No standout windows today — fish the changes anyway.")
  );

  // Forecast tab's secondary ranking list (Other species).
  renderOtherSpeciesList(scored);
}

function biteTimelineEl(timeline) {
  const W = 320, H = 56;
  const now = new Date();
  const nowH = now.getHours() + now.getMinutes() / 60;
  let bars = "";
  for (const b of timeline) {
    const x = (b.hour / 24) * W;
    const w = W / 24;
    const color = b.band === "hot" ? "#6fdc8c"
                : b.band === "warm" ? "#7cc4e8"
                : "rgba(255,255,255,0.06)";
    bars += `<rect x="${x.toFixed(1)}" y="8" width="${(w - 1).toFixed(1)}" height="${H - 16}" rx="2" fill="${color}"/>`;
  }
  const nowX = (nowH / 24) * W;
  return el("div", { class: "sp-timeline" }, [
    el("div", { class: "sp-timeline-chart",
      html: `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-label="24-hour bite timeline">
        ${bars}
        <line x1="${nowX.toFixed(1)}" y1="2" x2="${nowX.toFixed(1)}" y2="${H - 2}"
              stroke="#ffd47a" stroke-width="2"/>
        <text x="${nowX.toFixed(1)}" y="${H - 1}" font-size="7" fill="#ffd47a"
              text-anchor="middle" font-family="ui-monospace,monospace">NOW</text>
      </svg>` }),
    el("div", { class: "sp-timeline-axis" }, [
      el("span", {}, "00"), el("span", {}, "06"),
      el("span", {}, "12"), el("span", {}, "18"), el("span", {}, "24")
    ]),
    el("div", { class: "sp-timeline-legend" }, [
      el("span", { class: "tll hot" }, "■ hot"),
      el("span", { class: "tll warm" }, "■ warm"),
      el("span", { class: "tll slow" }, "■ slow")
    ])
  ]);
}

// ---------- Marine warnings ----------
//
// Forecast-derived using actual NZ MetService warning thresholds. NOT an
// official warning — we link to the real page beneath. This catches the
// "should I even be looking at the forecast" question first.

function renderWarnings(hourly, marine) {
  const card = $("#warningsCard");
  const body = $("#warningsBody");
  const headline = $("#warningsHeadline");
  body.innerHTML = "";

  const now = Date.now();
  let s = 0;
  for (let i = 0; i < hourly.time.length; i++) {
    if (new Date(hourly.time[i]).getTime() >= now - 30 * 60 * 1000) { s = i; break; }
  }
  const e = Math.min(s + 48, hourly.time.length);

  // Find peak wind, peak gust, peak wave across next 48h.
  let pkWind = 0, pkWindT = null;
  let pkGust = 0, pkGustT = null;
  for (let i = s; i < e; i++) {
    const w = (hourly.wind_speed_10m[i] || 0) * KMH_TO_KT;
    const g = (hourly.wind_gusts_10m[i] || 0) * KMH_TO_KT;
    if (w > pkWind) { pkWind = w; pkWindT = hourly.time[i]; }
    if (g > pkGust) { pkGust = g; pkGustT = hourly.time[i]; }
  }

  let pkWave = 0, pkWaveT = null;
  if (marine?.hourly?.wave_height) {
    const mt = marine.hourly.time, wh = marine.hourly.wave_height;
    for (let i = 0; i < mt.length; i++) {
      const t = new Date(mt[i]).getTime();
      if (t < now - 30 * 60 * 1000) continue;
      if (t > now + 48 * 3600 * 1000) break;
      if (wh[i] != null && wh[i] > pkWave) { pkWave = wh[i]; pkWaveT = mt[i]; }
    }
  }

  const warnings = [];

  // NZ MetService wind warning thresholds (mean wind, sustained).
  if (pkWind >= 48) warnings.push({
    cls: "storm",
    cat: "Storm warning likely",
    when: `Mean wind to ${Math.round(pkWind)} kt around ${fmtTime(pkWindT)}`
  });
  else if (pkWind >= 34) warnings.push({
    cls: "gale",
    cat: "Gale warning likely",
    when: `Mean wind to ${Math.round(pkWind)} kt around ${fmtTime(pkWindT)}`
  });
  else if (pkWind >= 25) warnings.push({
    cls: "strong",
    cat: "Strong wind warning likely",
    when: `Mean wind to ${Math.round(pkWind)} kt around ${fmtTime(pkWindT)}`
  });

  // Gust warning — only if it's notably more than mean (otherwise covered above).
  if (pkGust >= 45 && pkGust > pkWind * 1.4) {
    warnings.push({
      cls: "strong",
      cat: "Severe gusts forecast",
      when: `Gusts to ${Math.round(pkGust)} kt around ${fmtTime(pkGustT)}`
    });
  }

  // Wave / swell.
  if (pkWave >= 4) warnings.push({
    cls: "swell",
    cat: "Heavy swell forecast",
    when: `Sig. wave height ${pkWave.toFixed(1)} m around ${fmtTime(pkWaveT)}`
  });
  else if (pkWave >= 2.5) warnings.push({
    cls: "swell",
    cat: "Rough seas forecast",
    when: `Sig. wave height ${pkWave.toFixed(1)} m around ${fmtTime(pkWaveT)}`
  });

  // Card colouring + headline. When everything is clear we collapse the card
  // to a thin one-liner (the slim variant) so it doesn't dominate the top
  // of Today. When there's anything to flag, we render the full card.
  card.classList.remove("clear", "amber", "red", "slim");
  if (!warnings.length) {
    card.classList.add("clear", "slim");
    headline.textContent = "";
    body.appendChild(el("div", { class: "allclear" }, [
      el("span", { class: "pip" }),
      "All clear in the next 48 h"
    ]));
    return;
  }
  const hasRed = warnings.some((w) => w.cls === "storm" || w.cls === "gale");
  card.classList.add(hasRed ? "red" : "amber");
  headline.textContent = `· ${warnings.length} ${hasRed ? "alert" : "advisory"}${warnings.length > 1 ? "s" : ""}`;

  for (const w of warnings) {
    body.appendChild(el("div", { class: "warning " + w.cls }, [
      el("div", { class: "cat" }, w.cat),
      el("div", { class: "when" }, w.when)
    ]));
  }
}

// ---------- Best day this week ----------
//
// 0-100 daily fishing score combining: weather (% of daylight hours that meet
// your thresholds, weight 30), tide range / spring-vs-neap (25), solunar (25),
// barometric trend (20). Shown as a sortable-by-day list with the top day
// starred.

function renderBestDay(daily, hourly, marine, spot, scores) {
  const wrap = $("#bestDayList");
  const headline = $("#bestDayHeadline");
  wrap.innerHTML = "";

  // Identify top day(s).
  const maxScore = Math.max(...scores.map((s) => s.score));
  headline.textContent = scores.length
    ? `· top score ${maxScore}/100`
    : "";

  for (const sObj of scores) {
    const isTop = sObj.score === maxScore && maxScore > 50;
    const cls = sObj.score >= 70 ? "high" : sObj.score >= 45 ? "mid" : "low";
    wrap.appendChild(el("div", { class: "best-row" + (isTop ? " top" : "") }, [
      el("div", { class: "name" }, [
        isTop ? el("span", { class: "star" }, "★ ") : null,
        fmtDayName(sObj.date)
      ]),
      el("div", { class: "middle" }, [
        el("div", { class: "why" }, sObj.reasons.join(" · ")),
        el("div", { class: "bar" }, [
          el("div", { style: `width:${Math.max(2, sObj.score)}%` })
        ])
      ]),
      el("div", { class: "score " + cls }, String(sObj.score))
    ]));
  }
}

// ---------- Sea temperature trend ----------

function renderSeaTemp(marine) {
  const svg = $("#sstChart");
  const legend = $("#sstLegend");
  const headline = $("#sstHeadline");
  svg.innerHTML = "";
  legend.innerHTML = "";
  headline.textContent = "";

  if (!marine?.hourly?.sea_surface_temperature) {
    svg.innerHTML = `<text x="160" y="70" text-anchor="middle" fill="#7c97ad" font-size="12">No sea-surface temperature data for this point</text>`;
    return;
  }

  const times = marine.hourly.time;
  const ssts  = marine.hourly.sea_surface_temperature;

  // Group by calendar day to compute daily min/mean/max.
  const byDay = new Map();
  for (let i = 0; i < times.length; i++) {
    const day = times[i].slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, []);
    if (ssts[i] != null) byDay.get(day).push(ssts[i]);
  }
  const days = [];
  for (const [day, vals] of byDay) {
    if (!vals.length) continue;
    days.push({
      day,
      mean: mean(vals),
      min: Math.min(...vals),
      max: Math.max(...vals)
    });
  }
  if (days.length < 2) {
    svg.innerHTML = `<text x="160" y="70" text-anchor="middle" fill="#7c97ad" font-size="12">Not enough data</text>`;
    return;
  }

  // Trend over the window.
  const first = days[0].mean;
  const last  = days[days.length - 1].mean;
  const delta = last - first;
  const trendCls = Math.abs(delta) < 0.2 ? "" : (delta > 0 ? "warming" : "cooling");
  const trendWord = Math.abs(delta) < 0.2 ? "steady" : (delta > 0 ? "warming" : "cooling");

  const nowIdx = (() => {
    const now = Date.now();
    for (let i = 0; i < times.length; i++) {
      if (new Date(times[i]).getTime() >= now - 30 * 60 * 1000) return i;
    }
    return 0;
  })();
  const currentSST = ssts[nowIdx];

  headline.textContent = currentSST != null
    ? `· now ${fmtTemp(currentSST)}, ${trendWord} ${delta > 0 ? "+" : ""}${delta.toFixed(1)}°C over 7d`
    : "";

  // Draw chart.
  const W = 320, H = 160, pad = 24;
  const allVals = days.flatMap((d) => [d.min, d.max]);
  // Always include the threshold lines in the y-range.
  const THRESHOLDS = [
    { v: 14, label: "Snapper retreat (14°C)", color: "#5b8def" },
    { v: 16, label: "Snapper active (16°C)",  color: "#7cc4e8" },
    { v: 17, label: "Kingie wake-up (17°C)",  color: "#6fdc8c" },
    { v: 19, label: "Peak fish activity (19°C)", color: "#ffd47a" }
  ];
  for (const t of THRESHOLDS) allVals.push(t.v);
  const yMin = Math.min(...allVals) - 0.5;
  const yMax = Math.max(...allVals) + 0.5;
  const xFor = (i) => pad + (i / (days.length - 1)) * (W - 2 * pad);
  const yFor = (v) => H - pad - ((v - yMin) / (yMax - yMin)) * (H - 2 * pad);

  // Threshold lines.
  for (const t of THRESHOLDS) {
    if (t.v < yMin || t.v > yMax) continue;
    const y = yFor(t.v);
    svg.insertAdjacentHTML("beforeend",
      `<line x1="${pad}" y1="${y}" x2="${W - pad}" y2="${y}"
             stroke="${t.color}" stroke-width="1" stroke-dasharray="3 4" opacity="0.5"/>
       <text x="${W - pad - 4}" y="${y - 3}" text-anchor="end" fill="${t.color}" font-size="9" opacity="0.7">${t.v}°</text>`);
  }

  // Min/max band.
  let bandTop = "", bandBot = "";
  for (let i = 0; i < days.length; i++) {
    const x = xFor(i);
    bandTop += (i === 0 ? "M" : "L") + x.toFixed(1) + " " + yFor(days[i].max).toFixed(1) + " ";
  }
  for (let i = days.length - 1; i >= 0; i--) {
    const x = xFor(i);
    bandBot += "L" + x.toFixed(1) + " " + yFor(days[i].min).toFixed(1) + " ";
  }
  svg.insertAdjacentHTML("beforeend",
    `<path d="${bandTop} ${bandBot} Z" fill="#7cc4e8" opacity="0.18"/>`);

  // Mean line.
  let meanPath = "";
  for (let i = 0; i < days.length; i++) {
    const x = xFor(i);
    meanPath += (i === 0 ? "M" : "L") + x.toFixed(1) + " " + yFor(days[i].mean).toFixed(1) + " ";
  }
  svg.insertAdjacentHTML("beforeend",
    `<path d="${meanPath}" fill="none" stroke="#ffd47a" stroke-width="2.5" stroke-linecap="round"/>`);

  // Day labels.
  for (let i = 0; i < days.length; i++) {
    const x = xFor(i);
    const date = new Date(days[i].day + "T12:00:00");
    const label = date.toLocaleDateString("en-NZ", { weekday: "short" }).slice(0, 3);
    svg.insertAdjacentHTML("beforeend",
      `<text x="${x}" y="${H - 6}" text-anchor="middle" fill="#7c97ad" font-size="9">${label}</text>`);
  }

  // Current value marker.
  if (currentSST != null) {
    // Find x position of current.
    const now = Date.now();
    let cx = pad;
    for (let i = 0; i < days.length; i++) {
      if (new Date(days[i].day + "T12:00:00").toDateString() === new Date(now).toDateString()) {
        cx = xFor(i);
        break;
      }
    }
    const cy = yFor(currentSST);
    svg.insertAdjacentHTML("beforeend",
      `<circle cx="${cx}" cy="${cy}" r="4" fill="#ffd47a" stroke="#0b1a2b" stroke-width="1.5"/>`);
  }

  // Legend.
  for (const t of THRESHOLDS) {
    if (t.v < yMin || t.v > yMax) continue;
    legend.appendChild(el("div", { class: "item" }, [
      el("div", { class: "swatch", style: `background:${t.color}` }),
      t.label
    ]));
  }
  legend.appendChild(el("div", { class: "item" }, [
    el("span", { class: "sst-trend " + trendCls }, `${delta > 0 ? "+" : ""}${delta.toFixed(1)}°C over 7d`)
  ]));
}

// ---------- Fishing intel ----------
//
// Combines tide range (spring vs neap), next slack water + peak-flow time and
// rough current speed, barometric trend, and "combo" windows where dawn/dusk
// lines up with a tide turn or solunar peak.

function renderFishing(marine, hourly, daily, spot, solunar) {
  const wrap = $("#fishingIntel");
  const windowsWrap = $("#fishingWindows");
  const headline = $("#fishingHeadline");
  wrap.innerHTML = "";
  windowsWrap.innerHTML = "";
  headline.textContent = "";

  // -------- Tide range / spring-neap --------
  let springLabel = null, rangeText = null;
  let tideEventsAll = [];
  if (marine?.hourly?.sea_level_height_msl) {
    const times = marine.hourly.time;
    const heights = marine.hourly.sea_level_height_msl;

    const today = new Date();
    const dayKey = today.toDateString();
    const todayH = [];
    for (let i = 0; i < times.length; i++) {
      if (new Date(times[i]).toDateString() === dayKey && heights[i] != null) {
        todayH.push(heights[i]);
      }
    }
    if (todayH.length) {
      const hi = Math.max(...todayH);
      const lo = Math.min(...todayH);
      const range = hi - lo;
      // Auckland Harbour: spring range ~3.4m, neap ~1.7m. Normalise.
      const pct = Math.max(0, Math.min(100, ((range - 1.5) / (3.4 - 1.5)) * 100));
      if (pct > 80)      springLabel = "Spring tide — strong flow";
      else if (pct > 60) springLabel = "Approaching spring";
      else if (pct > 40) springLabel = "Mid-range tide";
      else if (pct > 20) springLabel = "Approaching neap";
      else               springLabel = "Neap — light flow";
      rangeText = `${range.toFixed(1)} m · ${Math.round(pct)}% spring`;

      wrap.appendChild(el("div", { class: "swell-item" }, [
        el("div", { class: "label" }, "Tide range today"),
        el("div", { class: "value tide-state" }, range.toFixed(1) + " m"),
        el("div", { class: "sub" }, springLabel)
      ]));
    }

    // -------- Slack water + peak flow --------
    tideEventsAll = extractTideEvents(times, heights, false);
    const now = Date.now();
    const nextEvent = tideEventsAll.find((e) => new Date(e.time).getTime() > now);
    const past = tideEventsAll.filter((e) => new Date(e.time).getTime() <= now);
    const prevEvent = past.length ? past[past.length - 1] : null;

    if (nextEvent) {
      wrap.appendChild(el("div", { class: "swell-item" }, [
        el("div", { class: "label" }, "Next slack water"),
        el("div", { class: "value" }, fmtTime(nextEvent.time)),
        el("div", { class: "sub" }, nextEvent.type === "high"
          ? `top of tide (${nextEvent.height.toFixed(1)} m)`
          : `bottom of tide (${nextEvent.height.toFixed(1)} m)`)
      ]));
    }

    if (prevEvent && nextEvent) {
      const midMs = (new Date(prevEvent.time).getTime() + new Date(nextEvent.time).getTime()) / 2;
      const flowType = (prevEvent.type === "low" && nextEvent.type === "high")
        ? "flooding (incoming)"
        : "ebbing (outgoing)";
      const peakRange = Math.abs(nextEvent.height - prevEvent.height);
      // Sinusoidal approx: peak current speed ≈ π × range ÷ cycle period.
      // A semidiurnal half-cycle is ~6.21h. Convert m/h → m/s → knots.
      const peakMps = (Math.PI * peakRange) / (6.21 * 3600);
      const peakKt = peakMps * 1.94384;
      const past6h = (Date.now() - midMs) < 0
        ? `peaks in ${Math.round((midMs - Date.now()) / 60000)} min`
        : `peaked ${Math.round((Date.now() - midMs) / 60000)} min ago`;
      const peakedStr = Math.abs(Date.now() - midMs) < 3 * 60 * 60 * 1000
        ? fmtTime(new Date(midMs).toISOString())
        : fmtTime(new Date(midMs).toISOString());
      wrap.appendChild(el("div", { class: "swell-item" }, [
        el("div", { class: "label" }, "Peak flow"),
        el("div", { class: "value" }, peakedStr),
        el("div", { class: "sub" }, `~${peakKt.toFixed(1)} kt · ${flowType}`)
      ]));
    }
  }

  // -------- Barometric trend --------
  if (hourly?.pressure_msl) {
    const now = Date.now();
    let nowIdx = 0;
    for (let i = 0; i < hourly.time.length; i++) {
      if (new Date(hourly.time[i]).getTime() >= now - 30 * 60 * 1000) { nowIdx = i; break; }
    }
    const past6Idx  = Math.max(0, nowIdx - 6);
    const next12Idx = Math.min(hourly.time.length - 1, nowIdx + 12);
    const nowP    = hourly.pressure_msl[nowIdx];
    const pastP   = hourly.pressure_msl[past6Idx];
    const futureP = hourly.pressure_msl[next12Idx];
    const past6Delta  = (nowP != null && pastP != null) ? nowP - pastP : null;
    const next12Delta = (futureP != null && nowP != null) ? futureP - nowP : null;

    let arrow = "→", cls = "", note = "steady";
    const t = next12Delta;
    if (t != null) {
      if      (t >  4) { arrow = "↗↗"; cls = "up";        note = "rising fast — fish often active"; }
      else if (t >  1) { arrow = "↗";  cls = "up";        note = "rising — classic good-bite signal"; }
      else if (t < -4) { arrow = "↘↘"; cls = "fastdown";  note = "falling fast — front coming, bite often shuts after"; }
      else if (t < -1) { arrow = "↘";  cls = "down";      note = "falling — feed window often 6–12h before front"; }
      else             { arrow = "→";  cls = "";          note = "steady — settled conditions"; }
    }

    // 24h sparkline — past 6h + next 18h of pressure for visual context.
    const sparkStart = Math.max(0, nowIdx - 6);
    const sparkEnd = Math.min(hourly.time.length, nowIdx + 18);
    const pts = [];
    for (let i = sparkStart; i < sparkEnd; i++) {
      if (hourly.pressure_msl[i] != null) pts.push(hourly.pressure_msl[i]);
    }
    let sparkHTML = "";
    if (pts.length >= 4) {
      const pMin = Math.min(...pts), pMax = Math.max(...pts);
      const pad = Math.max(0.5, (pMax - pMin) * 0.15);
      const yMin = pMin - pad, yMax = pMax + pad;
      const W = 180, H = 32;
      let d = "";
      for (let i = 0; i < pts.length; i++) {
        const x = (i / (pts.length - 1)) * W;
        const y = H - ((pts[i] - yMin) / (yMax - yMin)) * H;
        d += (i === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1) + " ";
      }
      const nowOffset = Math.min(pts.length - 1, 6);
      const cx = (nowOffset / (pts.length - 1)) * W;
      const cy = H - ((pts[nowOffset] - yMin) / (yMax - yMin)) * H;
      const strokeColor = cls === "up" ? "#6fdc8c"
        : cls === "down" ? "#ffc26b"
        : cls === "fastdown" ? "#ff7a7a"
        : "#7cc4e8";
      sparkHTML = `<svg class="pressure-spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
        <path d="${d}" fill="none" stroke="${strokeColor}" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="2.5" fill="${strokeColor}"/>
      </svg>`;
    }

    wrap.appendChild(el("div", { class: "swell-item" }, [
      el("div", { class: "label" }, "Pressure trend"),
      el("div", { class: "value bar-trend " + cls }, nowP != null ? `${arrow} ${Math.round(nowP)} hPa` : "—"),
      el("div", { class: "spark-wrap", html: sparkHTML }),
      el("div", { class: "sub" },
        (past6Delta != null ? `${past6Delta > 0 ? "+" : ""}${past6Delta.toFixed(1)} past 6h · ` : "") +
        (next12Delta != null ? `${next12Delta > 0 ? "+" : ""}${next12Delta.toFixed(1)} next 12h — ${note}` : note))
    ]));
  }

  // -------- Combo windows today (dawn/dusk × tide × solunar) --------
  const todayWindows = computeFishingWindows(spot, daily, tideEventsAll, solunar);
  if (todayWindows.length) {
    for (const w of todayWindows) {
      windowsWrap.appendChild(el("div", { class: "fwin" + (w.gold ? " gold" : "") }, [
        el("div", {}, [w.gold ? "★ " : "• ", w.title]),
        el("span", { class: "why" }, w.why)
      ]));
    }
    headline.textContent = `· ${todayWindows.length} window${todayWindows.length > 1 ? "s" : ""} today`;
  } else {
    windowsWrap.appendChild(el("div", { class: "fwin" }, [
      "No standout windows today — fish the changes anyway."
    ]));
  }
}

// Returns an array of named fishing windows for today, ranked by overlap of
// dawn/dusk × tide turn × solunar major.
function computeFishingWindows(spot, daily, tideEvents, solunar) {
  const out = [];
  const today = new Date();
  const dayKey = today.toDateString();

  // Prefer real solunar.org times when available.
  const useApi = !!(solunar && solunar.majorA?.start);
  const sunrise = useApi && solunar.sunRise
    ? solunar.sunRise
    : (daily.sunrise?.[0] ? new Date(daily.sunrise[0]) : null);
  const sunset = useApi && solunar.sunSet
    ? solunar.sunSet
    : (daily.sunset?.[0] ? new Date(daily.sunset[0]) : null);
  const solWin = useApi
    ? {
        majorA: { start: solunar.majorA.start, end: solunar.majorA.end },
        majorB: { start: solunar.majorB.start, end: solunar.majorB.end },
        minorA: { start: solunar.minorA.start, end: solunar.minorA.end },
        minorB: { start: solunar.minorB.start, end: solunar.minorB.end }
      }
    : solunarWindows(today, spot.lon);

  const todayEvents = tideEvents.filter(
    (e) => new Date(e.time).toDateString() === dayKey
  );

  const minutesBetween = (a, b) => Math.abs(a.getTime() - b.getTime()) / 60000;

  // 1. Dawn × tide turn (snapper gold)
  if (sunrise) {
    for (const ev of todayEvents) {
      const evT = new Date(ev.time);
      const gap = minutesBetween(sunrise, evT);
      if (gap < 90) {
        out.push({
          title: `Dawn ${ev.type === "high" ? "high" : "low"} tide — ${fmtTime(sunrise.toISOString())} → ${fmtTime(new Date(sunrise.getTime() + 90 * 60000).toISOString())}`,
          why: `Sunrise within ${Math.round(gap)} min of ${ev.type} tide. Classic snapper window.`,
          gold: true
        });
      }
    }
  }

  // 2. Dusk × tide turn
  if (sunset) {
    for (const ev of todayEvents) {
      const evT = new Date(ev.time);
      const gap = minutesBetween(sunset, evT);
      if (gap < 90) {
        out.push({
          title: `Dusk ${ev.type === "high" ? "high" : "low"} tide — ${fmtTime(new Date(sunset.getTime() - 90 * 60000).toISOString())} → ${fmtTime(sunset.toISOString())}`,
          why: `Sunset within ${Math.round(gap)} min of ${ev.type} tide. Often a kingie bite, especially on low.`,
          gold: true
        });
      }
    }
  }

  // 3. Solunar major × tide turn (peak compound)
  for (const win of [solWin.majorA, solWin.majorB]) {
    for (const ev of todayEvents) {
      const evT = new Date(ev.time);
      if (evT >= win.start && evT <= win.end) {
        out.push({
          title: `Solunar major on the tide turn — ${fmtTime(win.start.toISOString())} → ${fmtTime(win.end.toISOString())}`,
          why: `Lunar peak coincides with ${ev.type} tide. Best of all signals lining up.`,
          gold: true
        });
      }
    }
  }

  // 4. Solunar major during daylight (worth noting if no compound found)
  if (out.length === 0 && sunrise && sunset) {
    for (const win of [solWin.majorA, solWin.majorB]) {
      if (win.end > sunrise && win.start < sunset) {
        out.push({
          title: `Solunar major — ${fmtTime(win.start.toISOString())} → ${fmtTime(win.end.toISOString())}`,
          why: `Lunar peak during daylight.`,
          gold: false
        });
      }
    }
  }

  // Dedupe by title and keep the goldest version.
  const seen = new Map();
  for (const w of out) {
    const prev = seen.get(w.title);
    if (!prev || (w.gold && !prev.gold)) seen.set(w.title, w);
  }
  return Array.from(seen.values()).sort((a, b) => (b.gold - a.gold));
}

// ---------- Wind detail (gust ratios, shifts) ----------

function renderWind(h) {
  const wrap = $("#windDetail");
  const shiftWrap = $("#windShift");
  const headline = $("#windHeadline");
  wrap.innerHTML = "";
  shiftWrap.innerHTML = "";

  const now = Date.now();
  let s = 0;
  for (let i = 0; i < h.time.length; i++) {
    if (new Date(h.time[i]).getTime() >= now - 30 * 60 * 1000) { s = i; break; }
  }
  const e = Math.min(s + 24, h.time.length);

  const winds = h.wind_speed_10m.slice(s, e);
  const gusts = h.wind_gusts_10m.slice(s, e);
  const dirs  = h.wind_direction_10m.slice(s, e);
  const times = h.time.slice(s, e);

  const meanWind = mean(winds);
  const peakGustVal = Math.max(...gusts.filter((x) => x != null));
  const peakIdx = gusts.findIndex((g) => g === peakGustVal);
  const peakTime = peakIdx >= 0 ? times[peakIdx] : null;

  // Gust ratio over next 24h: average gust / average wind (avoids div-by-zero on light air).
  const meanGust = mean(gusts);
  const ratio = meanWind > 1 ? meanGust / meanWind : null;

  let ratioClass = "";
  let ratioNote = "smooth";
  if (ratio != null) {
    if (ratio < 1.3) { ratioClass = ""; ratioNote = "smooth wind"; }
    else if (ratio < 1.5) { ratioClass = ""; ratioNote = "typical"; }
    else if (ratio < 1.8) { ratioClass = "high"; ratioNote = "gusty — reef early"; }
    else { ratioClass = "veryhigh"; ratioNote = "very gusty / squally"; }
  }

  // Now wind for headline.
  const nowWind = winds[0], nowGust = gusts[0], nowDir = dirs[0];
  headline.textContent = nowWind != null
    ? `· ${fmtWind(nowWind)} ${compass(nowDir)} now, gust ${fmtWind(nowGust)}`
    : "";

  // Compass viz at the top of the wind card.
  renderWindCompass(nowDir, nowWind, nowGust);

  wrap.append(
    el("div", { class: "swell-item" }, [
      el("div", { class: "label" }, "Next 24h mean"),
      el("div", { class: "value" }, fmtWind(meanWind)),
      el("div", { class: "sub" }, `gust avg ${fmtWind(meanGust)}`)
    ]),
    el("div", { class: "swell-item" }, [
      el("div", { class: "label" }, "Peak gust"),
      el("div", { class: "value" }, fmtWind(peakGustVal)),
      el("div", { class: "sub" }, peakTime ? `at ${fmtTime(peakTime)}` : "—")
    ]),
    el("div", { class: "swell-item" }, [
      el("div", { class: "label" }, "Gust ratio"),
      el("div", { class: "value " + ("ratio " + ratioClass) }, ratio != null ? "×" + ratio.toFixed(2) : "—"),
      el("div", { class: "sub" }, ratioNote)
    ]),
    el("div", { class: "swell-item" }, [
      el("div", { class: "label" }, "Dominant direction"),
      el("div", { class: "value" }, compass(circularMean(dirs))),
      el("div", { class: "sub" }, `from ${Math.round(circularMean(dirs) || 0)}°`)
    ])
  );

  // Wind shift detection: scan for the largest direction change in any 3h window.
  let biggestShift = 0;
  let shiftAt = null;
  let shiftFrom = null, shiftTo = null;
  for (let i = 0; i < dirs.length - 3; i++) {
    if (dirs[i] == null || dirs[i + 3] == null) continue;
    const d = angDiff(dirs[i], dirs[i + 3]);
    if (Math.abs(d) > Math.abs(biggestShift)) {
      biggestShift = d;
      shiftAt = times[i + 3];
      shiftFrom = dirs[i];
      shiftTo = dirs[i + 3];
    }
  }

  if (Math.abs(biggestShift) >= 30) {
    const cls = Math.abs(biggestShift) >= 60 ? "shift-alert big" : "shift-alert";
    const sign = biggestShift > 0 ? "→" : "←";
    shiftWrap.appendChild(el("div", { class: cls }, [
      `Wind shift: ${compass(shiftFrom)} ${sign} ${compass(shiftTo)} (${Math.round(Math.abs(biggestShift))}°) around ${fmtTime(shiftAt)}`
    ]));
  } else {
    shiftWrap.appendChild(el("div", { class: "shift-alert calm" }, [
      `Direction steady — under 30° shift expected in next 24h.`
    ]));
  }
}

// Signed angular difference in degrees (shortest path, -180..+180).
function angDiff(a, b) {
  let d = ((b - a + 540) % 360) - 180;
  return d;
}

// ---------- Cross-check external links ----------

function renderXLinks(spot) {
  const wrap = $("#xlinks");
  wrap.innerHTML = "";
  const lat = spot.lat, lon = spot.lon;

  const links = [
    {
      name: "Swellmap",
      color: "#3aa7d4",
      url: `https://www.swellmap.co.nz/`
    },
    {
      name: "MetService Marine",
      color: "#0072c6",
      url: `https://www.metservice.com/marine/regions`
    },
    {
      name: "Windy",
      color: "#ff7733",
      url: `https://www.windy.com/?wind,${lat.toFixed(3)},${lon.toFixed(3)},10`
    },
    {
      name: "PredictWind",
      color: "#1a4b8c",
      url: `https://forecast.predictwind.com/maps/forecast/wind/${lat.toFixed(3)},${lon.toFixed(3)}`
    },
    {
      name: "Windguru",
      color: "#5b8def",
      url: `https://www.windguru.cz/map/?lat=${lat.toFixed(3)}&lon=${lon.toFixed(3)}`
    },
    {
      name: "Surfline",
      color: "#00a3e0",
      url: `https://www.surfline.com/surf-reports-forecasts-cams/new-zealand/6252001`
    }
  ];

  for (const l of links) {
    wrap.appendChild(el("a", {
      class: "xlink",
      href: l.url,
      target: "_blank",
      rel: "noopener"
    }, [
      el("span", { class: "dot", style: `background:${l.color}` }),
      l.name
    ]));
  }
}

function renderHero(h, marine, daily, dailyScores, boatingScores) {
  // Pick the hour we're currently IN (not the upcoming one). The "Now" tile is
  // labelled "Now", so it should show the current clock hour's value, not the
  // next hour's forecast. Use the latest hour whose start time is <= now;
  // fall back to the first hour if we're before the data window.
  const now = Date.now();
  let idx = 0;
  for (let i = 0; i < h.time.length; i++) {
    if (new Date(h.time[i]).getTime() <= now) idx = i;
    else break;
  }
  const cur = sliceHour(h, idx);
  const mIdx = marine ? indexAtTime(marine.hourly.time, h.time[idx]) : -1;
  const mCur = mIdx >= 0 ? sliceHour(marine.hourly, mIdx) : null;

  // Prefer the live "current conditions" reading (Open-Meteo best-estimate for
  // right now) over the top-of-hour forecast for the at-a-glance tiles. Falls
  // back to the current hour's forecast if the live reading is unavailable.
  const live = state.data?.current || null;
  const nowCur = live ? {
    temperature_2m:      live.temperature_2m      ?? cur.temperature_2m,
    apparent_temperature: live.apparent_temperature ?? null,
    weather_code:       live.weather_code       ?? cur.weather_code,
    wind_speed_10m:     live.wind_speed_10m      ?? cur.wind_speed_10m,
    wind_gusts_10m:     live.wind_gusts_10m      ?? cur.wind_gusts_10m,
    wind_direction_10m: live.wind_direction_10m  ?? cur.wind_direction_10m,
    pressure_msl:       live.pressure_msl        ?? cur.pressure_msl,
    precipitation:      live.precipitation       ?? cur.precipitation
  } : cur;

  const sunrise = daily.sunrise?.[0];
  const sunset = daily.sunset?.[0];
  const best = bestWindowToday(h, marine?.hourly, sunrise, sunset);

  // Headline derived from today's overall score so the text and the gauge
  // always agree. Previously there were two ratings (verdict light from
  // threshold breaches + the score gauge) that routinely disagreed —
  // confusing UX. One source of truth.
  const todayScore = dailyScores && dailyScores[0] ? dailyScores[0].score : null;
  const band = todayScore == null ? "amber"
             : todayScore >= 70 ? "green"
             : todayScore >= 45 ? "amber"
             : "red";
  const headlines = {
    green: "Looking good out there",
    amber: "Workable, with care",
    red:   "Best to stay in today"
  };
  $("#verdictHeadline").textContent = headlines[band];

  let detail = "";
  if (best) {
    detail = `Best window today: ${fmtTime(best.start)} – ${fmtTime(best.end)}`;
  } else if (band === "green") {
    detail = "Settled conditions across the day.";
  } else {
    // List the metrics that are over the user's threshold so the user knows
    // *why* it's marginal/poor, not just that it is.
    const breaches = [];
    const t = state.thresholds;
    if ((cur.wind_speed_10m || 0) * KMH_TO_KT > t.maxWindKt) breaches.push("wind");
    if ((cur.wind_gusts_10m || 0) * KMH_TO_KT > t.maxGustKt) breaches.push("gusts");
    if ((mCur?.wave_height || 0) > t.maxWaveM) breaches.push("waves");
    if ((cur.precipitation || 0) > t.maxRainMm) breaches.push("rain");
    detail = breaches.length ? `Over your limit: ${breaches.join(", ")}.` : "Mixed conditions through the day.";
  }
  $("#verdictDetail").textContent = detail;

  // Dual arc gauges — Boating (safety/comfort) + Fishing (full formula). Two
  // numbers always agree about wind/swell but disagree when tide/pressure
  // drag fishing down. Resolves the "calm day, low score" confusion.
  const boatScore = boatingScores && boatingScores[0] ? boatingScores[0].score : null;
  let dualWrap = $("#verdictGauges");
  if (!dualWrap) {
    // Remove the old single-chip if present (legacy markup).
    const oldChip = $("#verdictScore");
    if (oldChip) oldChip.remove();
    dualWrap = el("div", { id: "verdictGauges", class: "verdict-gauges" });
    $("#verdict").appendChild(dualWrap);
  }
  dualWrap.innerHTML = "";
  dualWrap.appendChild(buildGauge("Boat", boatScore));
  dualWrap.appendChild(buildGauge("Fish", todayScore));

  // Quick-status pills row: tide direction, UV, moon. Tight summary strip
  // below the verdict, before the now-stats. Reused from Tight-Lines hero.
  let pills = $("#quickPills");
  if (!pills) {
    pills = el("div", { id: "quickPills", class: "quick-pills" });
    $(".hero").insertBefore(pills, $("#nowStats"));
  }
  pills.innerHTML = "";
  const tidePill = nextTidePillText(marine);
  if (tidePill) pills.appendChild(el("span", { class: "qpill tide" }, tidePill));
  const uv = daily.uv_index_max?.[0];
  if (uv != null) {
    const uvLabel = uv >= 8 ? "Very high" : uv >= 6 ? "High" : uv >= 3 ? "Moderate" : "Low";
    pills.appendChild(el("span", { class: "qpill uv" }, `UV ${Math.round(uv)} · ${uvLabel}`));
  }
  const ill = moonIllumination(moonPhase(new Date()));
  pills.appendChild(el("span", { class: "qpill moon" }, `Moon ${ill}%`));

  const code = nowCur.weather_code != null ? Math.round(nowCur.weather_code) : 0;
  const [icon, label] = wmo(code);

  // Pressure trend (for the pressure tile's sub).
  let pressureSub = "";
  if (h.pressure_msl) {
    const future = Math.min(h.time.length - 1, idx + 12);
    const dP = (h.pressure_msl[future] ?? 0) - (h.pressure_msl[idx] ?? 0);
    if (dP > 1.5) pressureSub = "↗ rising";
    else if (dP < -1.5) pressureSub = "↘ falling";
    else pressureSub = "→ steady";
  }

  // UV label for the tile (uv already declared above for the quick-pills strip).
  const uvLabelTile = uv == null ? "—" : uv >= 8 ? "Very high" : uv >= 6 ? "High" : uv >= 3 ? "Moderate" : "Low";

  const stats = $("#nowStats");
  stats.innerHTML = "";
  stats.append(
    statTile("Now", `${icon} ${fmtTemp(nowCur.temperature_2m)}`,
      nowCur.apparent_temperature != null ? `feels ${fmtTemp(nowCur.apparent_temperature)} · ${label}` : label),
    statTile("Wind", fmtWind(nowCur.wind_speed_10m), `${compass(nowCur.wind_direction_10m)} · gust ${fmtWind(nowCur.wind_gusts_10m)}`),
    statTile("Waves", fmtWave(mCur?.wave_height), mCur?.wave_period ? `${mCur.wave_period.toFixed(0)}s · ${compass(mCur.wave_direction)}` : "—"),
    statTile("Sea temp", fmtTemp(mCur?.sea_surface_temperature), mCur?.sea_level_height_msl != null ? `tide ${mCur.sea_level_height_msl >= 0 ? "+" : ""}${mCur.sea_level_height_msl.toFixed(1)}m` : ""),
    statTile("Pressure", nowCur.pressure_msl != null ? `${Math.round(nowCur.pressure_msl)} hPa` : "—", pressureSub),
    statTile("UV", uv != null ? String(Math.round(uv)) : "—", uvLabelTile)
  );
}

// Build one dual-gauge: 64px ring with score, label below.
function buildGauge(label, score) {
  const wrap = el("div", { class: "dual-gauge" });
  const cls = score == null ? "" : score >= 70 ? "high" : score >= 45 ? "mid" : "low";
  wrap.classList.add(cls || "low");
  const r = 24, c = 2 * Math.PI * r;
  const dash = score != null ? (score / 100) * c : 0;
  const ringColor = cls === "high" ? "#6fdc8c" : cls === "mid" ? "#ffd47a" : "#ff7a7a";
  wrap.innerHTML = `
    <svg viewBox="0 0 60 60" class="dual-gauge-svg" aria-label="${label} score">
      <circle cx="30" cy="30" r="${r}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="5"/>
      ${score != null ? `<circle cx="30" cy="30" r="${r}" fill="none"
                stroke="${ringColor}" stroke-width="5" stroke-linecap="round"
                stroke-dasharray="${dash.toFixed(1)} ${(c - dash).toFixed(1)}"
                transform="rotate(-90 30 30)"
                style="filter:drop-shadow(0 0 4px ${ringColor}88)"/>` : ""}
      <text x="30" y="34" text-anchor="middle" font-size="17" font-weight="700"
            fill="${score == null ? "rgba(255,255,255,0.4)" : ringColor}"
            font-variant-numeric="tabular-nums">${score != null ? score : "—"}</text>
    </svg>
    <div class="dual-gauge-label">${label}</div>`;
  return wrap;
}

// Live tide indicator — shows direction AND how far through the current
// cycle we are. Previously just "↑ Rising · 01:00 am"; now "↑ 65% to high
// at 01:00 am" so the user sees the live cycle progress at a glance.
function nextTidePillText(marine) {
  if (!marine?.hourly?.sea_level_height_msl) return null;
  const events = extractTideEvents(marine.hourly.time, marine.hourly.sea_level_height_msl, false);
  const now = Date.now();
  const next = events.find((e) => new Date(e.time).getTime() > now);
  const prev = events.filter((e) => new Date(e.time).getTime() <= now).pop();
  if (!next) return null;
  const arrow = next.type === "high" ? "↑" : "↓";
  const word = next.type === "high" ? "Rising" : "Falling";
  if (prev) {
    const total = new Date(next.time).getTime() - new Date(prev.time).getTime();
    const elapsed = now - new Date(prev.time).getTime();
    const pct = Math.round((elapsed / total) * 100);
    return `${arrow} ${word} ${pct}% · ${fmtTime(next.time)}`;
  }
  return `${arrow} ${word} · ${fmtTime(next.time)}`;
}

function statTile(label, value, sub = "") {
  return el("div", { class: "stat" }, [
    el("div", { class: "label" }, label),
    el("div", { class: "value" }, value),
    el("div", { class: "sub" }, sub)
  ]);
}

function renderHourly(h, marine) {
  const wrap = $("#hourly");
  wrap.innerHTML = "";
  const now = Date.now();
  let start = 0;
  for (let i = 0; i < h.time.length; i++) {
    if (new Date(h.time[i]).getTime() >= now - 30 * 60 * 1000) { start = i; break; }
  }
  const end = Math.min(start + 48, h.time.length);

  let agreeSum = 0, agreeN = 0;
  for (let i = start; i < end; i++) {
    const cur = sliceHour(h, i);
    const mIdx = marine ? indexAtTime(marine.hourly.time, h.time[i]) : -1;
    const mCur = mIdx >= 0 ? sliceHour(marine.hourly, mIdx) : null;
    const v = hourVerdict(cur, mCur);
    const code = cur.weather_code != null ? Math.round(cur.weather_code) : 0;
    const [icon] = wmo(code);
    const range = (h.temperature_2m_max[i] != null && h.temperature_2m_min[i] != null)
      ? (h.temperature_2m_max[i] - h.temperature_2m_min[i])
      : 0;
    agreeSum += range; agreeN++;
    const score = hourScore(cur, mCur);
    const scoreCls = score >= 70 ? "high" : score >= 45 ? "mid" : "low";
    // Hourly precip — show a tiny blue bar when there's rain in this hour.
    // Cap visual height at 5mm so a wet hour stands out without dominating.
    const precip = cur.precipitation || 0;
    const precipPct = Math.min(100, (precip / 5) * 100);
    const hour = el("div", { class: "hour " + (v === "green" ? "good" : v === "amber" ? "warn" : "bad") }, [
      el("div", { class: "t" }, fmtHour(h.time[i])),
      el("div", { class: "icon" }, icon),
      el("div", { class: "temp" }, fmtTemp(cur.temperature_2m)),
      el("div", { class: "wind" }, fmtWind(cur.wind_speed_10m) + " " + compass(cur.wind_direction_10m)),
      el("div", { class: "wave" }, mCur?.wave_height != null ? fmtWave(mCur.wave_height) : "—"),
      precip > 0.05
        ? el("div", { class: "hour-precip", title: precip.toFixed(1) + " mm" }, [
            el("div", { class: "fill", style: `width:${precipPct.toFixed(0)}%` }),
            el("span", { class: "precip-label" }, precip < 1 ? precip.toFixed(1) + "mm" : Math.round(precip) + "mm")
          ])
        : el("div", { class: "hour-precip empty" }),
      el("div", { class: "hour-bar " + scoreCls }, [
        el("div", { class: "fill", style: `width:${Math.max(4, score)}%` })
      ]),
      el("div", { class: "hour-score " + scoreCls }, String(score))
    ]);
    wrap.appendChild(hour);
  }
  const avg = agreeN ? (agreeSum / agreeN) : 0;
  $("#hourlyAgreement").textContent = avg < 1.5 ? "· models agree" : avg < 3 ? "· some divergence" : "· models disagree";
}

// 7-day at-a-glance grid: wind sparkline, swell sparkline, temp hi/lo, score
// badge per day. Replaces the old 7-day card on Today — answers the user's
// "I just need to know wind / swell / temp for the week" question in one
// glance instead of forcing them to scroll through detail cards.
function renderWeekGrid(daily, hourly, marine, dailyScores, boatingScores) {
  const wrap = $("#weekGrid");
  const headline = $("#weekHeadline");
  if (!wrap) return;
  wrap.innerHTML = "";

  const days = Math.min(7, daily.time.length);

  // Normalisation maxima — floored so calm weeks don't make every bar look big.
  const winds = (hourly.wind_speed_10m || []).filter((x) => x != null).map((v) => v * KMH_TO_KT);
  const swells = marine?.hourly?.wave_height?.filter?.((x) => x != null) || [];
  const wMax = Math.max(20, winds.length ? Math.max(...winds) : 20);
  const sMax = Math.max(1.5, swells.length ? Math.max(...swells) : 1.5);

  const topScore = Math.max(0, ...(dailyScores || []).map((s) => s?.score || 0));
  if (headline) {
    headline.textContent = topScore ? `· top day ${topScore}/100` : "";
  }

  // Header row (day names)
  const header = el("div", { class: "wg-header" });
  header.appendChild(el("div", { class: "wg-row-label" }, ""));
  for (let d = 0; d < days; d++) {
    const name = fmtDayName(daily.time[d]).replace("Today", "Now").replace("Tomorrow", "Tom");
    header.appendChild(el("div", { class: "wg-day-name" }, name.slice(0, 5)));
  }
  wrap.appendChild(header);

  // WIND row
  const windRow = el("div", { class: "wg-row" });
  windRow.appendChild(el("div", { class: "wg-row-label" }, "WIND"));
  for (let d = 0; d < days; d++) {
    windRow.appendChild(weekBarCell(hourly, daily.time[d], "wind_speed_10m", wMax, "wind", (v) => v * KMH_TO_KT));
  }
  wrap.appendChild(windRow);

  // SWELL row
  const swellRow = el("div", { class: "wg-row" });
  swellRow.appendChild(el("div", { class: "wg-row-label" }, "SWELL"));
  for (let d = 0; d < days; d++) {
    if (marine?.hourly?.wave_height) {
      swellRow.appendChild(weekBarCell(marine.hourly, daily.time[d], "wave_height", sMax, "swell", (v) => v));
    } else {
      swellRow.appendChild(el("div", { class: "wg-day wg-empty" }, "—"));
    }
  }
  wrap.appendChild(swellRow);

  // TEMP row
  const tempRow = el("div", { class: "wg-row" });
  tempRow.appendChild(el("div", { class: "wg-row-label" }, "TEMP"));
  for (let d = 0; d < days; d++) {
    const hi = daily.temperature_2m_max?.[d];
    const lo = daily.temperature_2m_min?.[d];
    tempRow.appendChild(el("div", { class: "wg-day wg-temp" }, [
      el("span", { class: "hi" }, hi != null ? Math.round(hi) + "°" : "—"),
      el("span", { class: "lo" }, lo != null ? Math.round(lo) + "°" : "—")
    ]));
  }
  wrap.appendChild(tempRow);

  // WX row — weather icon per day (cloud / sun / rain etc). Sourced from
  // the daily weather_code which is the modal value across the 5 models.
  // This was the one thing the Daily breakdown card had that the grid
  // didn't — bringing it here so we can drop the redundant card.
  const wxRow = el("div", { class: "wg-row" });
  wxRow.appendChild(el("div", { class: "wg-row-label" }, "WX"));
  for (let d = 0; d < days; d++) {
    const code = daily.weather_code?.[d] != null ? Math.round(daily.weather_code[d]) : null;
    const [icon, label] = code != null ? wmo(code) : ["—", ""];
    wxRow.appendChild(el("div", { class: "wg-day wg-wx", title: label }, icon));
  }
  wrap.appendChild(wxRow);

  // RAIN row — per-day total mm above a tiny bar showing when through the
  // day rain falls. Hourly precip and daily totals are both already
  // averaged across all 5 weather models in aggregateMultiModel, so what
  // we render here is the ensemble mean (same as the BOAT/FISH inputs).
  const rainRow = el("div", { class: "wg-row" });
  rainRow.appendChild(el("div", { class: "wg-row-label" }, "RAIN"));
  for (let d = 0; d < days; d++) {
    const total = daily.precipitation_sum?.[d];
    rainRow.appendChild(buildRainCell(hourly, daily.time[d], total));
  }
  wrap.appendChild(rainRow);

  // (TIDE row removed — a single daily tidal-range bar wasn't actionable;
  // tide detail lives on Conditions → Tides & flow, which shows actual
  // high/low times and the live flood/ebb indicator.)

  // PRESSURE row — single arrow per day based on the day's first-to-last
  // pressure delta. Up = good (front passing), down = bad (front coming).
  const pRow = el("div", { class: "wg-row" });
  pRow.appendChild(el("div", { class: "wg-row-label" }, "PRES"));
  for (let d = 0; d < days; d++) {
    if (hourly.pressure_msl) {
      const dayKey = daily.time[d];
      const idxs = [];
      for (let i = 0; i < hourly.time.length; i++) {
        if (hourly.time[i].startsWith(dayKey) && hourly.pressure_msl[i] != null) idxs.push(i);
      }
      if (idxs.length >= 2) {
        const dP = hourly.pressure_msl[idxs[idxs.length - 1]] - hourly.pressure_msl[idxs[0]];
        const arrow = dP > 2 ? "↗" : dP > 0.5 ? "↗" : dP < -2 ? "↘" : dP < -0.5 ? "↘" : "→";
        const cls = dP > 0.5 ? "up" : dP < -0.5 ? "down" : "steady";
        pRow.appendChild(el("div", { class: "wg-day wg-pres " + cls }, [
          el("span", { class: "wg-pres-arrow" }, arrow),
          el("span", { class: "wg-pres-delta" }, `${dP >= 0 ? "+" : ""}${dP.toFixed(0)}`)
        ]));
      } else {
        pRow.appendChild(el("div", { class: "wg-day wg-empty" }, "—"));
      }
    } else {
      pRow.appendChild(el("div", { class: "wg-day wg-empty" }, "—"));
    }
  }
  wrap.appendChild(pRow);

  // BOAT score row — pure safety/comfort (wind+swell+temp+rain). Calm-but-
  // unfishy days (like this Thursday) jump out here, addressing the
  // "boatie friend says Thursday is great" feedback.
  const boatRow = el("div", { class: "wg-row" });
  boatRow.appendChild(el("div", { class: "wg-row-label" }, "BOAT"));
  const topBoat = Math.max(0, ...(boatingScores || []).map((s) => s?.score || 0));
  for (let d = 0; d < days; d++) {
    const s = boatingScores?.[d]?.score;
    const cls = s == null ? "" : s >= 70 ? "high" : s >= 45 ? "mid" : "low";
    const isTop = s != null && s === topBoat && topBoat > 50;
    boatRow.appendChild(el("div", { class: "wg-day" + (isTop ? " wg-top" : "") }, [
      el("span", { class: "wg-score-badge " + cls }, s != null ? String(s) : "—")
    ]));
  }
  wrap.appendChild(boatRow);

  // FISH score row — full formula (weather + tide + solunar + pressure).
  const scoreRow = el("div", { class: "wg-row" });
  scoreRow.appendChild(el("div", { class: "wg-row-label" }, "FISH"));
  for (let d = 0; d < days; d++) {
    const s = dailyScores?.[d]?.score;
    const cls = s == null ? "" : s >= 70 ? "high" : s >= 45 ? "mid" : "low";
    const isTop = s != null && s === topScore && topScore > 50;
    scoreRow.appendChild(el("div", { class: "wg-day" + (isTop ? " wg-top" : "") }, [
      el("span", { class: "wg-score-badge " + cls }, s != null ? String(s) : "—")
    ]));
  }
  wrap.appendChild(scoreRow);
}

// Build one day's bar sparkline cell — 6 bars covering 4-hour chunks (00-03,
// 04-07, 08-11, 12-15, 16-19, 20-23). Each bar height = max value in its
// bucket relative to the week's max. Colours are driven by the USER's own
// thresholds so a green bar always means "passes your scoring" and an amber
// bar always means "approaching your limit" — keeps the visualization
// honest with the score. (Previously hardcoded 12/22 kt cutoffs disagreed
// with the user's 15 kt threshold — a green-scoring day showed amber bars.)
// Rain cell — small horizontal bar showing when through the day rain falls
// (6 chunks of 4h, same as wind/swell sparklines), plus the daily total in
// mm under it. Different from weekBarCell because rain colour scheme isn't
// "good/bad against threshold" — it's just an informational blue, with
// height proportional to mm/hour capped at 3 mm/h.
function buildRainCell(hourly, dayKey, totalMm) {
  const times = hourly.time;
  const vals = hourly.precipitation || [];
  const buckets = [[], [], [], [], [], []];
  for (let i = 0; i < times.length; i++) {
    if (!times[i].startsWith(dayKey)) continue;
    if (vals[i] == null) continue;
    const hr = new Date(times[i]).getHours();
    const b = Math.floor(hr / 4);
    if (b >= 0 && b < 6) buckets[b].push(vals[i]);
  }
  const W = 42, H = 14;
  const barW = (W / 6) - 1;
  let svg = `<svg viewBox="0 0 ${W} ${H}" class="wg-bars" preserveAspectRatio="none" aria-hidden="true">`;
  let hasAnyRain = false;
  for (let b = 0; b < 6; b++) {
    if (!buckets[b].length) continue;
    const peak = Math.max(...buckets[b]);
    if (peak <= 0.05) continue;
    hasAnyRain = true;
    // Visual height: cap at 3 mm/h so even a normal shower fills the bar.
    const h = Math.max(2, Math.min(H, (peak / 3) * H));
    const x = b * (W / 6);
    // Intensity colour — light blue for drizzle, deeper for actual rain.
    const color = peak < 0.5 ? "#9ed6f0" : peak < 2 ? "#5ba8d4" : "#3a7eb0";
    svg += `<rect x="${x.toFixed(1)}" y="${(H - h).toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" fill="${color}" rx="1"/>`;
  }
  svg += `</svg>`;
  const totalText = totalMm == null ? "—"
                  : totalMm < 0.1 ? "0"
                  : totalMm < 1 ? totalMm.toFixed(1)
                  : Math.round(totalMm).toString();
  return el("div", { class: "wg-day wg-rain" + (hasAnyRain ? "" : " dry") }, [
    el("div", { class: "wg-rain-bars", html: svg }),
    el("div", { class: "wg-rain-total" }, totalText)
  ]);
}

function weekBarCell(hourlyData, dayKey, field, maxVal, kind, convert) {
  const times = hourlyData.time;
  const vals = hourlyData[field];
  const buckets = [[], [], [], [], [], []];
  for (let i = 0; i < times.length; i++) {
    if (!times[i].startsWith(dayKey)) continue;
    if (vals[i] == null) continue;
    const hr = new Date(times[i]).getHours();
    const b = Math.floor(hr / 4);
    if (b >= 0 && b < 6) buckets[b].push(convert(vals[i]));
  }
  const t = state.thresholds;
  const W = 42, H = 24;
  const barW = (W / 6) - 1;
  let svg = `<svg viewBox="0 0 ${W} ${H}" class="wg-bars" preserveAspectRatio="none" aria-hidden="true">`;
  for (let b = 0; b < 6; b++) {
    if (!buckets[b].length) continue;
    const v = Math.max(...buckets[b]);
    const h = Math.max(2, Math.min(H, (v / maxVal) * H));
    const x = b * (W / 6);
    // Colour bands relative to the user's threshold for this metric:
    //   green = under threshold (passes scoring)
    //   amber = approaching / between wind and gust limits
    //   red   = over (fails scoring)
    let color;
    if (kind === "wind") {
      color = v < t.maxWindKt ? "#6fdc8c"
            : v < t.maxGustKt ? "#ffd47a"
            : "#ff7a7a";
    } else {
      // swell: amber kicks in at 70% of the wave limit so the user gets a
      // "getting choppy" warning before the hard fail.
      color = v < t.maxWaveM * 0.7 ? "#6fdc8c"
            : v < t.maxWaveM ? "#ffd47a"
            : "#ff7a7a";
    }
    svg += `<rect x="${x.toFixed(1)}" y="${(H - h).toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" fill="${color}" rx="1"/>`;
  }
  svg += `</svg>`;
  return el("div", { class: "wg-day wg-bars-day", html: svg });
}

function renderDaily(daily, hourly, marine, spot, dailyScores) {
  const wrap = $("#daily");
  wrap.innerHTML = "";
  for (let i = 0; i < daily.time.length; i++) {
    const code = daily.weather_code?.[i] != null ? Math.round(daily.weather_code[i]) : 0;
    const [icon, label] = wmo(code);
    const hi = daily.temperature_2m_max?.[i];
    const lo = daily.temperature_2m_min?.[i];
    const windMax = daily.wind_speed_10m_max?.[i];
    const rain = daily.precipitation_sum?.[i];
    // Aggregate hour verdicts for that calendar day (used for the dot colour).
    const dayKey = daily.time[i];
    let g = 0, a = 0, r = 0;
    for (let j = 0; j < hourly.time.length; j++) {
      if (!hourly.time[j].startsWith(dayKey)) continue;
      const cur = sliceHour(hourly, j);
      const mIdx = marine ? indexAtTime(marine.hourly.time, hourly.time[j]) : -1;
      const mCur = mIdx >= 0 ? sliceHour(marine.hourly, mIdx) : null;
      const t = new Date(hourly.time[j]);
      if (t.getHours() < 6 || t.getHours() > 20) continue;
      const v = hourVerdict(cur, mCur);
      if (v === "green") g++; else if (v === "amber") a++; else r++;
    }
    const dayState = g > (a + r) ? "green" : r > g ? "red" : "amber";
    const dotColor = { green: "var(--green)", amber: "var(--amber)", red: "var(--red)" }[dayState];

    const sObj = dailyScores?.[i];
    const score = sObj?.score;
    const scoreCls = score == null ? "" : score >= 70 ? "high" : score >= 45 ? "mid" : "low";
    const peakText = sObj?.peakStart && sObj?.peakEnd
      ? `${fmtTime(sObj.peakStart.toISOString())} – ${fmtTime(sObj.peakEnd.toISOString())}`
      : "—";

    // Enriched daily row — merges what used to be the "Best day" card by
    // adding the "why" reasons inline. Score badge intentionally removed
    // from Conditions: the week grid on Today already has it, no need to
    // repeat. This card focuses on the per-day CONDITIONS, not the rating.
    const reasonsText = sObj?.reasons?.length ? sObj.reasons.join(" · ") : "";
    const row = el("div", { class: "day no-score" }, [
      el("div", { class: "name" }, [
        el("span", { class: "day-verdict", style: `background:${dotColor}` }),
        fmtDayName(daily.time[i])
      ]),
      el("div", { class: "icon", title: label }, icon),
      el("div", { class: "range" }, [
        el("span", { class: "high" }, hi != null ? fmtTemp(hi) : "—"),
        " / ",
        el("span", { class: "low" }, lo != null ? fmtTemp(lo) : "—")
      ]),
      el("div", { class: "peak" }, [
        el("span", { class: "peak-label" }, "Peak"),
        " ",
        el("span", { class: "peak-time" }, peakText)
      ]),
      el("div", { class: "extra" }, ["Wind ", fmtWind(windMax)])
    ]);
    wrap.appendChild(row);
    if (reasonsText) {
      wrap.appendChild(el("div", { class: "day-reasons" }, reasonsText));
    }
  }
}

// Tide flow card — extracts tide range / slack / peak flow + fishing windows
// from the old "Fishing intel" card so all tide-related info lives in one
// place (right below the tide chart). Reuses computeFishingWindows.
function renderTidesFlow(marine, hourly, daily, spot, solunar) {
  const wrap = $("#tidesFlow");
  const windowsWrap = $("#tidesFlowWindows");
  if (!wrap) return;
  wrap.innerHTML = "";
  if (windowsWrap) windowsWrap.innerHTML = "";

  let tideEventsAll = [];

  // Tide range / spring–neap label
  if (marine?.hourly?.sea_level_height_msl) {
    const times = marine.hourly.time, hs = marine.hourly.sea_level_height_msl;
    const today = new Date();
    const dayKey = today.toDateString();
    const todayH = [];
    for (let i = 0; i < times.length; i++) {
      if (new Date(times[i]).toDateString() === dayKey && hs[i] != null) todayH.push(hs[i]);
    }
    if (todayH.length) {
      const hi = Math.max(...todayH), lo = Math.min(...todayH);
      const range = hi - lo;
      const pct = Math.max(0, Math.min(100, ((range - 1.5) / (3.4 - 1.5)) * 100));
      const label = pct > 80 ? "Spring tide — strong flow"
                  : pct > 60 ? "Approaching spring"
                  : pct > 40 ? "Mid-range tide"
                  : pct > 20 ? "Approaching neap"
                  :            "Neap — light flow";
      wrap.appendChild(el("div", { class: "swell-item" }, [
        el("div", { class: "label" }, "Tide range today"),
        el("div", { class: "value tide-state" }, range.toFixed(1) + " m"),
        el("div", { class: "sub" }, label)
      ]));
    }
    tideEventsAll = extractTideEvents(times, hs, false);
    const now = Date.now();
    const next = tideEventsAll.find((e) => new Date(e.time).getTime() > now);
    const past = tideEventsAll.filter((e) => new Date(e.time).getTime() <= now);
    const prev = past.length ? past[past.length - 1] : null;
    if (next) {
      wrap.appendChild(el("div", { class: "swell-item" }, [
        el("div", { class: "label" }, "Next slack water"),
        el("div", { class: "value" }, fmtTime(next.time)),
        el("div", { class: "sub" }, next.type === "high"
          ? `top of tide (${next.height.toFixed(1)} m)`
          : `bottom of tide (${next.height.toFixed(1)} m)`)
      ]));
    }
    if (prev && next) {
      const midMs = (new Date(prev.time).getTime() + new Date(next.time).getTime()) / 2;
      const flowType = (prev.type === "low" && next.type === "high")
        ? "flooding (incoming)" : "ebbing (outgoing)";
      const peakRange = Math.abs(next.height - prev.height);
      const peakMps = (Math.PI * peakRange) / (6.21 * 3600);
      const peakKt = peakMps * 1.94384;
      wrap.appendChild(el("div", { class: "swell-item" }, [
        el("div", { class: "label" }, "Peak flow"),
        el("div", { class: "value" }, fmtTime(new Date(midMs).toISOString())),
        el("div", { class: "sub" }, `~${peakKt.toFixed(1)} kt · ${flowType}`)
      ]));
    }
  }

  // Today's compound fishing windows (dawn × tide × solunar). Reuses the
  // computeFishingWindows helper from the old renderFishing function.
  if (windowsWrap) {
    const todayWindows = computeFishingWindows(spot, daily, tideEventsAll, solunar);
    if (todayWindows.length) {
      for (const w of todayWindows) {
        windowsWrap.appendChild(el("div", { class: "fwin" + (w.gold ? " gold" : "") }, [
          el("div", {}, [w.gold ? "★ " : "• ", w.title]),
          el("span", { class: "why" }, w.why)
        ]));
      }
    } else {
      windowsWrap.appendChild(el("div", { class: "fwin" }, [
        "No standout windows today — fish the changes anyway."
      ]));
    }
  }
}

// Dedicated Pressure card — sparkline + interpretation. Extracted from
// renderFishing so pressure has a home of its own.
function renderPressureCard(hourly) {
  const wrap = $("#pressureCard");
  const headline = $("#pressureHeadline");
  if (!wrap) return;
  wrap.innerHTML = "";
  if (!hourly?.pressure_msl) return;

  const now = Date.now();
  let nowIdx = 0;
  for (let i = 0; i < hourly.time.length; i++) {
    if (new Date(hourly.time[i]).getTime() >= now - 30 * 60 * 1000) { nowIdx = i; break; }
  }
  const past6Idx = Math.max(0, nowIdx - 6);
  const next12Idx = Math.min(hourly.time.length - 1, nowIdx + 12);
  const nowP = hourly.pressure_msl[nowIdx];
  const pastP = hourly.pressure_msl[past6Idx];
  const futureP = hourly.pressure_msl[next12Idx];
  const past6Delta = (nowP != null && pastP != null) ? nowP - pastP : null;
  const next12Delta = (futureP != null && nowP != null) ? futureP - nowP : null;

  let arrow = "→", cls = "", note = "steady — settled conditions";
  const t = next12Delta;
  if (t != null) {
    if (t > 4) { arrow = "↗↗"; cls = "up"; note = "rising fast — fish often active"; }
    else if (t > 1) { arrow = "↗"; cls = "up"; note = "rising — classic good-bite signal"; }
    else if (t < -4) { arrow = "↘↘"; cls = "fastdown"; note = "falling fast — front coming, bite often shuts after"; }
    else if (t < -1) { arrow = "↘"; cls = "down"; note = "falling — feed window often 6–12h before front"; }
  }
  if (headline) headline.textContent = nowP != null ? `· ${Math.round(nowP)} hPa ${arrow}` : "";

  // Sparkline over -6h to +18h relative to now
  const sparkStart = Math.max(0, nowIdx - 6);
  const sparkEnd = Math.min(hourly.time.length, nowIdx + 18);
  const pts = [];
  for (let i = sparkStart; i < sparkEnd; i++) {
    if (hourly.pressure_msl[i] != null) pts.push(hourly.pressure_msl[i]);
  }
  let sparkHTML = "";
  if (pts.length >= 4) {
    const pMin = Math.min(...pts), pMax = Math.max(...pts);
    const pad = Math.max(0.5, (pMax - pMin) * 0.15);
    const yMin = pMin - pad, yMax = pMax + pad;
    const W = 280, H = 56;
    let d = "";
    for (let i = 0; i < pts.length; i++) {
      const x = (i / (pts.length - 1)) * W;
      const y = H - ((pts[i] - yMin) / (yMax - yMin)) * H;
      d += (i === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1) + " ";
    }
    const nowOff = Math.min(pts.length - 1, 6);
    const cx = (nowOff / (pts.length - 1)) * W;
    const cy = H - ((pts[nowOff] - yMin) / (yMax - yMin)) * H;
    const strokeColor = cls === "up" ? "#6fdc8c" : cls === "down" ? "#ffc26b" : cls === "fastdown" ? "#ff7a7a" : "#7cc4e8";
    sparkHTML = `<svg class="pressure-card-spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <path d="${d}" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round"/>
      <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="3.5" fill="${strokeColor}"/>
    </svg>`;
  }

  wrap.append(
    el("div", { class: "pressure-now-row" }, [
      el("div", { class: "pressure-value bar-trend " + cls }, nowP != null ? `${arrow} ${Math.round(nowP)} hPa` : "—"),
      el("div", { class: "muted small" }, note)
    ]),
    el("div", { class: "spark-wrap", html: sparkHTML }),
    el("div", { class: "muted small" },
      (past6Delta != null ? `${past6Delta > 0 ? "+" : ""}${past6Delta.toFixed(1)} past 6h · ` : "") +
      (next12Delta != null ? `${next12Delta > 0 ? "+" : ""}${next12Delta.toFixed(1)} next 12h` : ""))
  );
}

function renderTides(marine) {
  const svg = $("#tideChart");
  const wrap = $("#tideEvents");
  svg.innerHTML = "";
  wrap.innerHTML = "";
  if (!marine?.hourly?.sea_level_height_msl) {
    svg.innerHTML = `<text x="160" y="60" text-anchor="middle" fill="#7c97ad" font-size="12">No tide data for this location</text>`;
    return;
  }
  const times = marine.hourly.time;
  const heights = marine.hourly.sea_level_height_msl;

  // Plot today's 24h.
  const today = new Date();
  const dayKey = today.toDateString();
  const idxs = [];
  for (let i = 0; i < times.length; i++) {
    if (new Date(times[i]).toDateString() === dayKey) idxs.push(i);
  }
  if (!idxs.length) return;
  const ys = idxs.map((i) => heights[i]).filter((v) => v != null);
  if (!ys.length) return;
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const yPad = Math.max(0.2, (yMax - yMin) * 0.15);
  const W = 320, H = 120, pad = 12;
  const xFor = (i) => pad + (i / (idxs.length - 1)) * (W - 2 * pad);
  const yFor = (v) => H - pad - ((v - (yMin - yPad)) / ((yMax + yPad) - (yMin - yPad))) * (H - 2 * pad);

  // Background gradient
  svg.insertAdjacentHTML("beforeend",
    `<defs>
       <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
         <stop offset="0" stop-color="#7cc4e8" stop-opacity="0.35"/>
         <stop offset="1" stop-color="#7cc4e8" stop-opacity="0"/>
       </linearGradient>
     </defs>`);

  // Path
  let d = "";
  for (let k = 0; k < idxs.length; k++) {
    const v = heights[idxs[k]];
    if (v == null) continue;
    const x = xFor(k), y = yFor(v);
    d += (k === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1) + " ";
  }
  const area = d + `L ${xFor(idxs.length - 1).toFixed(1)} ${H - pad} L ${pad} ${H - pad} Z`;
  svg.insertAdjacentHTML("beforeend",
    `<path d="${area}" fill="url(#tg)"/>
     <path d="${d}" fill="none" stroke="#7cc4e8" stroke-width="2"/>`);

  // Now line
  const nowMs = Date.now();
  for (let k = 0; k < idxs.length; k++) {
    const t = new Date(times[idxs[k]]).getTime();
    if (t >= nowMs - 30 * 60 * 1000) {
      const x = xFor(k);
      svg.insertAdjacentHTML("beforeend",
        `<line x1="${x}" y1="${pad}" x2="${x}" y2="${H - pad}" stroke="#ffd47a" stroke-width="1" stroke-dasharray="2 3"/>`);
      break;
    }
  }

  // Events
  const events = extractTideEvents(times, heights, true);
  for (const ev of events) {
    wrap.appendChild(el("div", { class: `tide-event ${ev.type}` }, [
      `${ev.type === "high" ? "▲ High" : "▼ Low"} ${fmtTime(ev.time)} (${ev.height.toFixed(1)}m)`
    ]));
  }
  if (!events.length) {
    wrap.appendChild(el("div", { class: "muted small" }, "No tide turns within today."));
  }
}

function renderSwell(marine, hourly) {
  const wrap = $("#swell");
  wrap.innerHTML = "";
  if (!marine) {
    wrap.appendChild(el("div", { class: "muted small" }, "No marine data for this point."));
    return;
  }
  const now = Date.now();
  const times = marine.hourly.time;
  let idx = 0;
  for (let i = 0; i < times.length; i++) {
    if (new Date(times[i]).getTime() >= now - 30 * 60 * 1000) { idx = i; break; }
  }
  const m = sliceHour(marine.hourly, idx);
  const items = [
    {
      label: "Significant wave",
      value: fmtWave(m.wave_height),
      sub: m.wave_period != null ? `${m.wave_period.toFixed(0)}s period` : ""
    },
    {
      label: "Primary swell",
      value: fmtWave(m.swell_wave_height),
      sub: `${compass(m.swell_wave_direction)} · ${m.swell_wave_period?.toFixed(0) ?? "—"}s`
    },
    {
      label: "Wind chop",
      value: fmtWave(m.wind_wave_height),
      sub: m.wind_wave_height != null ? "" : "—"
    },
    {
      label: "Sea surface",
      value: fmtTemp(m.sea_surface_temperature),
      sub: m.sea_level_height_msl != null ? `tide ${m.sea_level_height_msl >= 0 ? "+" : ""}${m.sea_level_height_msl.toFixed(2)}m MSL` : ""
    }
  ];
  for (const it of items) {
    wrap.appendChild(el("div", { class: "swell-item" }, [
      el("div", { class: "label" }, it.label),
      el("div", { class: "value" }, it.value),
      el("div", { class: "sub" }, it.sub)
    ]));
  }
}

function renderSolunar(spot, daily, air, solunar) {
  const wrap = $("#solunar");
  wrap.innerHTML = "";
  const today = new Date();

  // Prefer api.solunar.org data when present, fall back to client-side calc.
  const useApi = !!(solunar && solunar.majorA?.start);
  const phase = moonPhase(today);
  const ill = useApi && solunar.moonIllumination != null
    ? Math.round(solunar.moonIllumination * 100)
    : moonIllumination(phase);
  const name = useApi && solunar.moonPhase ? solunar.moonPhase : moonPhaseName(phase);
  const w = useApi ? solunar : solunarWindows(today, spot.lon);

  // Sunrise / sunset — prefer API, fall back to Open-Meteo daily.
  const sunrise = useApi && solunar.sunRise ? solunar.sunRise.toISOString() : daily.sunrise?.[0];
  const sunset  = useApi && solunar.sunSet  ? solunar.sunSet.toISOString()  : daily.sunset?.[0];
  const uv = daily.uv_index_max?.[0];

  // Day rating from local astronomy (api.solunar.org is CORS-blocked).
  const score = useApi && solunar.dayRating != null
    ? Math.round(solunar.dayRating)
    : solunarDayScore(today, spot.lon, sunrise, sunset);

  // PM2.5 (air quality) at current hour, if available.
  let pm25 = null;
  if (air?.hourly?.pm2_5) {
    const idx = air.hourly.time.findIndex((t) => new Date(t).getTime() >= Date.now() - 30 * 60 * 1000);
    pm25 = idx >= 0 ? air.hourly.pm2_5[idx] : air.hourly.pm2_5[0];
  }

  const moonExtra = useApi && solunar.moonRise && solunar.moonSet
    ? `moon ${fmtTime(solunar.moonRise.toISOString())} – ${fmtTime(solunar.moonSet.toISOString())}`
    : `${ill}% illuminated`;

  // Civil twilight approximation — sunrise -30min and sunset +30min. Good
  // enough for the dawn/dusk quad most fishing apps show.
  const dawn = sunrise ? new Date(new Date(sunrise).getTime() - 30 * 60 * 1000).toISOString() : null;
  const dusk = sunset ? new Date(new Date(sunset).getTime() + 30 * 60 * 1000).toISOString() : null;
  const sunQuad = el("div", { class: "solunar-card sun-quad" }, [
    el("div", { class: "label" }, "Sun & light"),
    el("div", { class: "quad" }, [
      quadCell("Dawn",    dawn    ? fmtTime(dawn)    : "—"),
      quadCell("Sunrise", sunrise ? fmtTime(sunrise) : "—"),
      quadCell("Sunset",  sunset  ? fmtTime(sunset)  : "—"),
      quadCell("Dusk",    dusk    ? fmtTime(dusk)    : "—")
    ]),
    el("div", { class: "sub" }, uv != null ? `UV peak ${uv.toFixed(0)}` : "")
  ]);

  wrap.append(
    sunQuad,
    cardTile("Moon", `${moonSvg(phase)} ${name}`, `${ill}% · ${moonExtra}`),
    cardTile("Day rating", score + " / 100", scoreLabel(score)),
    cardTile("Air quality", pm25 != null ? `PM2.5 ${pm25.toFixed(0)} µg/m³` : "—", pm25 != null ? aqLabel(pm25) : "")
  );
}

function quadCell(label, value) {
  return el("div", { class: "quad-cell" }, [
    el("div", { class: "quad-label" }, label),
    el("div", { class: "quad-value" }, value)
  ]);
}

// Accept either a Date or an ISO string and return an ISO string.
function toIso(t) {
  if (t == null) return null;
  if (t instanceof Date) return t.toISOString();
  return t;
}

function cardTile(label, value, sub = "") {
  return el("div", { class: "solunar-card" }, [
    el("div", { class: "label" }, label),
    el("div", { class: "value", html: value }),
    el("div", { class: "sub" }, sub)
  ]);
}

function scoreLabel(s) {
  if (s >= 75) return "Excellent — peak lunar influence";
  if (s >= 55) return "Good — worth a try";
  if (s >= 35) return "Fair";
  return "Quiet day";
}
function aqLabel(pm) {
  if (pm < 12) return "Good";
  if (pm < 35) return "Moderate";
  if (pm < 55) return "Sensitive groups";
  return "Unhealthy";
}

function moonSvg(phase) {
  // Render a phase circle.
  const r = 14;
  const cx = 16, cy = 16;
  // Terminator: an ellipse of width proportional to cos(2π·phase).
  const ang = phase * 2 * Math.PI;
  const cosA = Math.cos(ang);
  const isWaxing = phase < 0.5;
  const rx = Math.abs(cosA) * r;
  const left = isWaxing
    ? `<path d="M ${cx} ${cy - r} A ${rx} ${r} 0 0 ${cosA > 0 ? 0 : 1} ${cx} ${cy + r} A ${r} ${r} 0 0 1 ${cx} ${cy - r} Z" fill="#ffd47a"/>`
    : `<path d="M ${cx} ${cy - r} A ${rx} ${r} 0 0 ${cosA > 0 ? 1 : 0} ${cx} ${cy + r} A ${r} ${r} 0 0 0 ${cx} ${cy - r} Z" fill="#ffd47a"/>`;
  return `<svg class="moon-svg" viewBox="0 0 32 32" aria-hidden="true">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="#243a55"/>
    ${left}
  </svg>`;
}

function renderAgreement(h) {
  const wrap = $("#agreement");
  wrap.innerHTML = "";
  // Show next-24h averages with spread bars for key metrics.
  const now = Date.now();
  let s = 0;
  for (let i = 0; i < h.time.length; i++) {
    if (new Date(h.time[i]).getTime() >= now - 30 * 60 * 1000) { s = i; break; }
  }
  const e = Math.min(s + 24, h.time.length);
  const metrics = [
    { key: "temperature_2m", label: "Temperature", fmt: (v) => fmtTemp(v) },
    { key: "wind_speed_10m", label: "Wind speed",   fmt: (v) => fmtWind(v) },
    { key: "wind_gusts_10m", label: "Gusts",        fmt: (v) => fmtWind(v) },
    { key: "precipitation",  label: "Precipitation", fmt: (v) => fmtMm(v) },
    { key: "cloud_cover",    label: "Cloud cover",  fmt: (v) => fmtPct(v) },
    { key: "pressure_msl",   label: "Pressure",     fmt: (v) => v != null ? Math.round(v) + " hPa" : "—" }
  ];
  for (const m of metrics) {
    const means = h[m.key].slice(s, e);
    const mins  = h[m.key + "_min"].slice(s, e);
    const maxs  = h[m.key + "_max"].slice(s, e);
    const meanAvg = mean(means);
    const minAvg  = mean(mins);
    const maxAvg  = mean(maxs);
    if (meanAvg == null) continue;
    // Build bar with absolute scale within this metric.
    const lo = Math.min(...mins.filter((x) => x != null), meanAvg);
    const hi = Math.max(...maxs.filter((x) => x != null), meanAvg);
    const span = Math.max(1e-6, hi - lo);
    const leftPct  = ((minAvg - lo) / span) * 100;
    const rightPct = ((maxAvg - lo) / span) * 100;
    const meanPct  = ((meanAvg - lo) / span) * 100;
    wrap.appendChild(el("div", { class: "agree-row" }, [
      el("div", { class: "label" }, m.label),
      el("div", { class: "bar" }, [
        el("div", { class: "bar-range", style: `left:${leftPct.toFixed(1)}%; right:${(100 - rightPct).toFixed(1)}%` }),
        el("div", { class: "bar-mean",  style: `left:${meanPct.toFixed(1)}%` })
      ]),
      el("div", { class: "value" }, m.fmt(meanAvg))
    ]));
  }
}

// ---------- Refresh ----------

async function refresh() {
  // If the user's active spot is the GPS one, silently refresh their
  // coordinates once per session before we fetch. Doesn't prompt for
  // permission if it was previously granted; falls back to last-known
  // coords if denied / unavailable. Doesn't touch any saved spot.
  await maybeRefreshGPS();

  renderSpotPicker();
  const active = state.spots.find((s) => s.id === state.activeSpotId) || state.spots[0];
  if (!active) return;

  // For the GPS spot the FISHING data (forecast, marine, tides, solunar) should
  // come from the nearest SEA spot, not your inland GPS point — that point has
  // no tides/waves and reads inland air, which is why it "looked different" from
  // a named spot like Auckland (Waitemata). We keep the raw GPS coords only to
  // sample your *local* air temperature for the "Now" tile, so the temperature
  // still matches what you actually feel where you are.
  let spot = active;        // where forecast / marine / solunar are sampled
  let localSpot = null;     // raw GPS coords, used for the local "Now" temp only
  if (active.id === "__gps__") {
    const sea = nearestSeaSpot(active.lat, active.lon);
    if (sea) {
      spot = { id: "__gps__", name: `My location · ${sea.name}`, lat: sea.lat, lon: sea.lon };
      localSpot = { lat: active.lat, lon: active.lon };
    }
  }
  $("#spotName").textContent = spot.name;

  // Stale-while-revalidate: if we have a recent snapshot for this spot,
  // render it immediately so the user sees content in ~50ms instead of
  // waiting 1-2s for the network. Then fetch fresh in the background and
  // re-render. Cap age at CACHE_MAX_AGE_MS so the user never sees data
  // older than one hour without the fresh fetch overriding it.
  const cached = loadForecastCache(spot.id);
  const hasFreshEnoughCache = cached && (Date.now() - cached.t) < CACHE_MAX_AGE_MS;
  if (hasFreshEnoughCache) {
    state.data = { spot, ...cached.data };
    renderAll();
    showStaleBadge(cached.t);
  } else {
    $("#spotMeta").textContent = "Fetching forecasts…";
    $("#verdictHeadline").textContent = "Reading the sky…";
  }

  try {
    // NOTE: api.solunar.org is CORS-blocked for browsers — calls always fail.
    // We rely on the local astronomy calculation (solunarWindows) instead. If
    // we ever add a Netlify function to proxy solunar.org, re-enable here.
    const [forecast, marine, air, seaCurrent, localCurrent] = await Promise.all([
      fetchForecast(spot),
      fetchMarine(spot),
      fetchAir(spot),
      fetchCurrent(spot),
      // Local air temp at the raw GPS point (only when using "My location").
      localSpot ? fetchCurrent(localSpot) : Promise.resolve(null)
    ]);
    // Conditions (wind, pressure, sky, rain) come from the sea spot; only the
    // air temperature + "feels like" are overridden with your local reading.
    let current = seaCurrent;
    if (seaCurrent && localCurrent) {
      current = {
        ...seaCurrent,
        temperature_2m: localCurrent.temperature_2m ?? seaCurrent.temperature_2m,
        apparent_temperature: localCurrent.apparent_temperature ?? seaCurrent.apparent_temperature
      };
    } else if (!seaCurrent && localCurrent) {
      current = localCurrent;
    }
    const agg = aggregateMultiModel(forecast);
    if (!agg) throw new Error("No forecast data");
    const fresh = {
      hourlyAgg: agg.hourly,
      dailyAgg: agg.daily,
      marine,
      air,
      current,
      solunar: null,
      solunarTomorrow: null
    };
    state.data = { spot, ...fresh };
    saveForecastCache(spot.id, fresh);
    renderAll();
  } catch (err) {
    console.error(err);
    // Only show the error message if we didn't already have cached data
    // to fall back on — otherwise the stale view is more useful than a
    // scary error.
    if (!hasFreshEnoughCache) {
      $("#verdictDetail").textContent = "Forecast unavailable — try again in a minute.";
    }
    toast(err.message || "Fetch error");
  }
}

// ---------- Forecast cache (stale-while-revalidate) ----------
//
// Per-spot snapshot of the last successful fetch, keyed by spot id. Render
// path checks this on every refresh() and shows the stale content instantly
// while the network call is in flight. ~100KB per spot, well under the
// localStorage quota.

const CACHE_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

function loadForecastCache(spotId) {
  try {
    const raw = localStorage.getItem("ts.fc." + spotId);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (!entry?.t || !entry?.data) return null;
    return entry;
  } catch { return null; }
}

function saveForecastCache(spotId, data) {
  try {
    localStorage.setItem("ts.fc." + spotId, JSON.stringify({ t: Date.now(), data }));
  } catch (e) {
    // QuotaExceededError — drop the oldest entry and try once more. If the
    // user has 10+ spots, the LRU eviction keeps total under quota.
    try {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith("ts.fc."));
      const entries = keys.map((k) => {
        try { return [k, JSON.parse(localStorage.getItem(k))?.t || 0]; } catch { return [k, 0]; }
      }).sort((a, b) => a[1] - b[1]);
      if (entries.length) localStorage.removeItem(entries[0][0]);
      localStorage.setItem("ts.fc." + spotId, JSON.stringify({ t: Date.now(), data }));
    } catch {/* give up — cache is non-critical */}
  }
}

function showStaleBadge(timestamp) {
  const meta = $("#spotMeta");
  if (!meta) return;
  const mins = Math.round((Date.now() - timestamp) / 60000);
  const ageText = mins < 1 ? "just now" : mins < 60 ? `${mins} min ago` : `${Math.round(mins / 60)}h ago`;
  meta.innerHTML = `<span class="cache-badge">cached ${ageText}</span> <span class="cache-refreshing">· refreshing</span>`;
}

// ---------- Settings ----------

function openSettings() {
  $("#appVersionLabel").textContent = APP_VERSION;
  $("#thMaxWind").value = state.thresholds.maxWindKt;
  $("#thMaxGust").value = state.thresholds.maxGustKt;
  $("#thMaxSwell").value = state.thresholds.maxWaveM;
  $("#thMaxRain").value = state.thresholds.maxRainMm;
  $("#thMinTemp").value = state.thresholds.minTempC;
  $("#unitWind").value = state.units.wind;
  $("#unitWave").value = state.units.wave;
  $("#unitTemp").value = state.units.temp;
  renderSpotList();
  $("#settingsDialog").showModal();
}

function renderSpotList() {
  const list = $("#spotList");
  list.innerHTML = "";
  for (const s of state.spots) {
    if (s.id === "__gps__") continue;
    const row = el("div", { class: "spot-row" }, [
      el("span", {}, `${s.name} (${s.lat.toFixed(2)}, ${s.lon.toFixed(2)})`),
      el("button", {
        class: "rm",
        type: "button",
        onclick: () => {
          state.spots = state.spots.filter((x) => x.id !== s.id);
          saveJSON("spots", state.spots);
          if (state.activeSpotId === s.id) {
            state.activeSpotId = state.spots[0]?.id;
            saveJSON("activeSpotId", state.activeSpotId);
          }
          renderSpotList();
        }
      }, "×")
    ]);
    list.appendChild(row);
  }
}

function saveSettings() {
  state.thresholds = {
    maxWindKt: +$("#thMaxWind").value || DEFAULT_THRESHOLDS.maxWindKt,
    maxGustKt: +$("#thMaxGust").value || DEFAULT_THRESHOLDS.maxGustKt,
    maxWaveM:  +$("#thMaxSwell").value || DEFAULT_THRESHOLDS.maxWaveM,
    maxRainMm: +$("#thMaxRain").value || DEFAULT_THRESHOLDS.maxRainMm,
    minTempC:  +$("#thMinTemp").value || DEFAULT_THRESHOLDS.minTempC
  };
  state.units = {
    wind: $("#unitWind").value,
    wave: $("#unitWave").value,
    temp: $("#unitTemp").value
  };
  saveJSON("thresholds", state.thresholds);
  saveJSON("units", state.units);
  toast("Saved");
  refresh();
}

function addSpot() {
  const name = $("#newSpotName").value.trim();
  const lat = parseFloat($("#newSpotLat").value);
  const lon = parseFloat($("#newSpotLon").value);
  if (!name || Number.isNaN(lat) || Number.isNaN(lon)) {
    toast("Need name + lat + lon");
    return;
  }
  state.spots.push({ id: "u" + Date.now(), name, lat, lon });
  saveJSON("spots", state.spots);
  $("#newSpotName").value = "";
  $("#newSpotLat").value = "";
  $("#newSpotLon").value = "";
  renderSpotList();
  renderSpotPicker();
}

function resetSettings() {
  if (!confirm("Reset thresholds, units and spots to defaults?")) return;
  state.thresholds = structuredClone(DEFAULT_THRESHOLDS);
  state.units = structuredClone(DEFAULT_UNITS);
  state.spots = structuredClone(DEFAULT_SPOTS);
  state.activeSpotId = DEFAULT_SPOTS[0].id;
  saveJSON("thresholds", state.thresholds);
  saveJSON("units", state.units);
  saveJSON("spots", state.spots);
  saveJSON("activeSpotId", state.activeSpotId);
  openSettings();
  renderSpotPicker();
  refresh();
}

// ---------- Bootstrap ----------

function bind() {
  $("#settingsBtn").addEventListener("click", openSettings);
  $("#saveBtn").addEventListener("click", saveSettings);
  $("#resetBtn").addEventListener("click", resetSettings);
  $("#addSpotBtn").addEventListener("click", addSpot);
  $("#searchBtn").addEventListener("click", runPlaceSearch);
  $("#placeSearch").addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); runPlaceSearch(); }
  });
  $("#forceUpdateBtn").addEventListener("click", forceUpdate);
  refreshOpenMapsLink();

  // Catch Log: add catch dialog + regs sheet
  $("#openAddCatchBtn")?.addEventListener("click", openAddCatchDialog);
  $("#closeAddCatchBtn")?.addEventListener("click", () => $("#addCatchDialog").close());
  $("#cancelAddCatchBtn")?.addEventListener("click", () => $("#addCatchDialog").close());
  $("#addCatchForm")?.addEventListener("submit", saveCatch);
  $("#addCatchPhoto")?.addEventListener("change", handleAddCatchPhoto);
  $("#openRegsBtn")?.addEventListener("click", openRegsDialog);
  $("#closeRegsBtn")?.addEventListener("click", () => $("#regsDialog").close());

  // Spots tab — wired to the tab-specific search/add inputs
  $("#useGPSBtn")?.addEventListener("click", useGPS);
  $("#searchBtnTab")?.addEventListener("click", runPlaceSearchTab);
  $("#placeSearchTab")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); runPlaceSearchTab(); }
  });
  $("#addSpotBtnTab")?.addEventListener("click", addSpotTab);
}

// Mirror of runPlaceSearch but bound to the Spots tab inputs.
async function runPlaceSearchTab() {
  const q = $("#placeSearchTab").value.trim();
  const results = $("#searchResultsTab");
  if (!q) { results.innerHTML = ""; return; }
  results.innerHTML = `<div class="search-empty">Searching…</div>`;
  try {
    const local = await fetchNominatim(q, "nz");
    const items = local.length ? local : await fetchNominatim(q, null);
    if (!items.length) {
      results.innerHTML = `<div class="search-empty">No matches — try a broader name.</div>`;
      return;
    }
    results.innerHTML = "";
    for (const it of items) {
      const lat = +parseFloat(it.lat).toFixed(4);
      const lon = +parseFloat(it.lon).toFixed(4);
      results.appendChild(el("button", {
        type: "button",
        class: "search-result",
        onclick: () => {
          $("#newSpotNameTab").value = it.display_name.split(",")[0];
          $("#newSpotLatTab").value = lat;
          $("#newSpotLonTab").value = lon;
          results.innerHTML = "";
        }
      }, [
        el("span", { class: "place-name" }, it.display_name.split(",").slice(0, 2).join(",")),
        el("span", { class: "place-coords" }, `${lat}, ${lon}`)
      ]));
    }
  } catch {
    results.innerHTML = `<div class="search-empty">Search failed — check your connection.</div>`;
  }
}

// Mirror of addSpot but for the Spots tab inputs.
function addSpotTab() {
  const name = $("#newSpotNameTab").value.trim();
  const lat = parseFloat($("#newSpotLatTab").value);
  const lon = parseFloat($("#newSpotLonTab").value);
  if (!name || isNaN(lat) || isNaN(lon)) {
    toast("Need a name and valid coords");
    return;
  }
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 6) + Date.now().toString(36).slice(-3);
  state.spots.push({ id, name, lat, lon });
  saveJSON("spots", state.spots);
  $("#newSpotNameTab").value = "";
  $("#newSpotLatTab").value = "";
  $("#newSpotLonTab").value = "";
  $("#searchResultsTab").innerHTML = "";
  renderSpotsTab();
  renderSpotPicker();
  toast(`Added ${name}`);
}

// ---------- Place search (Nominatim, free, no key) ----------
//
// We hit OpenStreetMap's free Nominatim geocoder. NZ-biased by default. Returns
// a list — the user taps one to fill the lat/lon fields in the form below.

async function runPlaceSearch() {
  const q = $("#placeSearch").value.trim();
  const results = $("#searchResults");
  if (!q) { results.innerHTML = ""; return; }
  results.innerHTML = `<div class="search-empty">Searching…</div>`;

  // NZ-bounded by default for fishing relevance, but allow worldwide if the
  // local search yields nothing.
  try {
    const local = await fetchNominatim(q, "nz");
    const items = local.length ? local : await fetchNominatim(q, null);
    if (!items.length) {
      results.innerHTML = `<div class="search-empty">No matches — try a broader name or use the manual form.</div>`;
      return;
    }
    results.innerHTML = "";
    for (const it of items) {
      const lat = +parseFloat(it.lat).toFixed(4);
      const lon = +parseFloat(it.lon).toFixed(4);
      const btn = el("button", {
        type: "button",
        class: "search-result",
        onclick: () => pickSearchResult(it.display_name.split(",")[0], lat, lon)
      }, [
        el("span", { class: "place-name" }, it.display_name.split(",").slice(0, 2).join(",")),
        el("span", { class: "place-coords" }, `${lat}, ${lon}`)
      ]);
      results.appendChild(btn);
    }
  } catch (err) {
    results.innerHTML = `<div class="search-empty">Search failed — check your connection.</div>`;
  }
}

async function fetchNominatim(query, countryCode) {
  const params = new URLSearchParams({
    q: query,
    format: "json",
    limit: "6",
    addressdetails: "0"
  });
  if (countryCode) params.set("countrycodes", countryCode);
  const url = `https://nominatim.openstreetmap.org/search?${params}`;
  const r = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!r.ok) return [];
  return r.json();
}

function pickSearchResult(name, lat, lon) {
  $("#newSpotName").value = name;
  $("#newSpotLat").value = lat;
  $("#newSpotLon").value = lon;
  $("#searchResults").innerHTML = "";
  $("#placeSearch").value = "";
  toast(`${name} loaded — tap Add to save`);
}

// Refresh the "Open Google Maps" link to centre on the current active spot.
function refreshOpenMapsLink() {
  const link = $("#openMapsLink");
  if (!link) return;
  const s = state.spots.find((x) => x.id === state.activeSpotId) || state.spots[0];
  const lat = s ? s.lat : -36.84;
  const lon = s ? s.lon : 174.78;
  link.href = `https://www.google.com/maps/@${lat},${lon},10z`;
}

// ---------- Service worker registration + update flow ----------

function registerSW() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("./service-worker.js", {
        // Force the browser to always fetch service-worker.js fresh from the
        // network — never serve a stale copy from HTTP cache. Critical for
        // making sure updates propagate to phones.
        updateViaCache: "none"
      });

      // If a new SW is already waiting when we register, prompt immediately.
      if (reg.waiting && navigator.serviceWorker.controller) {
        showUpdateAvailable(reg);
      }

      // Watch for new SWs that come in while the app is open.
      reg.addEventListener("updatefound", () => {
        const newSW = reg.installing;
        if (!newSW) return;
        newSW.addEventListener("statechange", () => {
          if (newSW.state === "installed" && navigator.serviceWorker.controller) {
            // Old SW is still controlling — show user the prompt.
            showUpdateAvailable(reg);
          }
        });
      });

      // Background-check for updates once an hour while the app is open.
      setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);

      // Critical for installed PWAs: the hourly timer above is frozen while the
      // app is backgrounded/closed, so reopening it never re-checked for a new
      // version. Check every time the app becomes visible again — this is what
      // makes "reopen the app → see the update prompt" actually work.
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") reg.update().catch(() => {});
      });
    } catch (err) {
      console.warn("Service worker registration failed:", err);
    }
  });

  // When a new SW takes control, reload once so we get fresh shell.
  let refreshed = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshed) return;
    refreshed = true;
    location.reload();
  });
}

function showUpdateAvailable(reg) {
  const t = $("#toast");
  t.innerHTML = "";
  t.classList.add("with-action");
  t.append(
    el("span", {}, "New version available"),
    el("button", {
      class: "toast-btn",
      onclick: () => {
        // Strategy:
        //   1. Politely ask the waiting SW to skip-waiting.
        //   2. If controllerchange fires within 1.5s, the global listener
        //      reloads us — great.
        //   3. If not (common in installed PWA standalone mode where
        //      controllerchange events go missing), force a hard reload
        //      with a cache-busting query so the next launch picks up
        //      the new shell regardless of which SW happens to be live.
        console.log("[SW] Reload button clicked");
        const waiting = reg.waiting || reg.installing;
        if (waiting) {
          console.log("[SW] Posting SKIP_WAITING to waiting SW");
          try { waiting.postMessage("SKIP_WAITING"); } catch (e) { console.warn(e); }
        }
        // Fallback: if controllerchange doesn't navigate us in 1.5s,
        // do it ourselves. Belt-and-braces.
        setTimeout(() => {
          console.log("[SW] Fallback reload");
          location.replace(location.pathname + "?u=" + Date.now());
        }, 1500);
      }
    }, "Reload")
  );
  t.hidden = false;
  // No auto-hide for this one — leave it until the user acts.
}

// Nuclear option: unregister all SWs, clear all caches, hard reload.
//
// Hard mode for installed PWAs: even after unregister + caches.delete, an
// "almost-dead" SW can still intercept the very next fetch and serve the
// stale shell. We have to (a) walk OUT of any SW scope by navigating to
// a URL with a query string the SW has never seen, AND (b) use an absolute
// URL with the current host so we re-enter through a clean fetch path.
async function forceUpdate() {
  if (!confirm("Wipe cached app shell and reload? Your saved spots / thresholds will be kept.")) return;
  console.log("[SW] forceUpdate starting");
  toast("Clearing cache…");
  try {
    // Unregister every SW registration first so they can't intercept
    // the post-reload fetches.
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      console.log("[SW] Unregistering", regs.length, "registration(s)");
      await Promise.all(regs.map((r) => r.unregister()));
    }
    // Now wipe every cache the app might have written.
    if (window.caches) {
      const keys = await caches.keys();
      console.log("[SW] Deleting caches:", keys);
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    // Wipe the app's own snapshot cache too — the SW caches the shell,
    // the app caches the forecast. Both need to go for a clean slate.
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("ts.fc."))
        .forEach((k) => localStorage.removeItem(k));
    } catch {}
  } catch (err) {
    console.warn("[SW] Force update — clear failed:", err);
  }
  // Aggressive reload: full absolute URL with a query the SW has never
  // cached, using location.href so the request goes through a fresh
  // browser-level fetch (not history.replaceState which can be SW-scoped).
  const url = location.origin + location.pathname + "?fu=" + Date.now();
  console.log("[SW] Navigating to", url);
  // Use location.href — most reliable across PWA contexts. location.replace
  // and location.reload have both been known to fail under installed PWA.
  window.location.href = url;
}

// ---------- Tab routing ----------

function setActiveTab(id) {
  state.activeTab = id;
  saveJSON("activeTab", id);
  document.body.dataset.tab = id;
  document.querySelectorAll("main [data-tab]").forEach((sec) => {
    sec.classList.toggle("tab-active", sec.dataset.tab === id);
  });
  document.querySelectorAll(".bottom-nav [data-tab]").forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === id);
  });
  // Render the tab's contents lazily — only the active tab does DOM work.
  renderForTab(id);
  // Scroll up on tab switch so the user lands at the top of the new view.
  window.scrollTo({ top: 0, behavior: "auto" });
}

function bindTabs() {
  document.querySelectorAll(".bottom-nav [data-tab]").forEach((b) => {
    b.addEventListener("click", () => setActiveTab(b.dataset.tab));
  });
  setActiveTab(state.activeTab || "today");
}

// ---------- Bait & lure suggestions ----------
//
// Conditions-based recommender. Derives a short list of 3 suggestions from
// current time-of-day, wind, swell, water temp, month and next tide direction.
// All inputs come from the live forecast — nothing is mocked.

function getBaitSuggestions(ctx) {
  const { hour, wind, swell, sst, monthIdx, nextTide } = ctx;
  const isDawn   = hour >= 5  && hour < 7;
  const isDusk   = hour >= 17 && hour < 20;
  const isNight  = hour < 5   || hour >= 20;
  const isCalm   = wind != null && wind <= 12;
  const isRough  = swell != null && swell > 1.5;
  const isWarm   = sst != null && sst >= 20;
  const isCold   = sst != null && sst < 16;
  const isSummer = monthIdx === 12 || monthIdx <= 2;
  const isWinter = monthIdx >= 6 && monthIdx <= 8;
  const isIncoming = nextTide?.type === "high";
  const sug = [];

  if ((isDawn || isDusk) && isCalm && !isRough) sug.push({
    name: "Surface popper / stickbait", tag: "TOP WATER", tone: "amber",
    reason: "Dawn & dusk trigger surface blitzes — walk-the-dog for kingfish and kahawai"
  });
  if (isWarm && !isRough && isSummer) sug.push({
    name: "Knife jig / speed jig", tag: "PELAGIC", tone: "purple",
    reason: "Warm water activates kingfish near the surface — drop fast, burn back up"
  });
  if (!isRough && isIncoming) sug.push({
    name: "Soft bait on jig head", tag: "INCOMING TIDE", tone: "teal",
    reason: "Incoming tide pushes bait over drop-offs — drift paddle tails with the current"
  });
  if (isRough || (wind != null && wind > 20)) sug.push({
    name: "Pilchard on ledger rig", tag: "SEEK SHELTER", tone: "blue",
    reason: "Rough conditions — find a sheltered bay, heavy sinker + fresh pilchard on the bottom"
  });
  if (isCold || isWinter) sug.push({
    name: "Squid strip — slow bottom", tag: "WINTER", tone: "orange",
    reason: "Cold water slows fish — slow presentation with squid near the seabed triggers snapper"
  });
  if (isNight) sug.push({
    name: "Whole pilchard or squid", tag: "NIGHT", tone: "navy",
    reason: "Snapper and trevally feed confidently after dark — scent beats sight"
  });
  // Reliable fallback so the card is never empty.
  sug.push({
    name: "Kabura / tai rubber", tag: "RELIABLE", tone: "grey",
    reason: "Works in almost any condition — slow spiral drop attracts snapper and trevally all year"
  });

  const seen = new Set();
  return sug.filter((s) => { if (seen.has(s.name)) return false; seen.add(s.name); return true; }).slice(0, 3);
}

function renderBaitCard(hourly, marine) {
  const wrap = $("#baitList");
  if (!wrap) return;
  wrap.innerHTML = "";

  const now = Date.now();
  let nowIdx = 0;
  for (let i = 0; i < hourly.time.length; i++) {
    if (new Date(hourly.time[i]).getTime() >= now - 30 * 60 * 1000) { nowIdx = i; break; }
  }

  const windKt = (hourly.wind_speed_10m[nowIdx] || 0) * KMH_TO_KT;
  let swell = null, sst = null;
  if (marine?.hourly) {
    const mIdx = indexAtTime(marine.hourly.time, hourly.time[nowIdx]);
    if (mIdx >= 0) {
      swell = marine.hourly.wave_height?.[mIdx];
      sst = marine.hourly.sea_surface_temperature?.[mIdx];
    }
  }
  const tideEvents = marine?.hourly?.sea_level_height_msl
    ? extractTideEvents(marine.hourly.time, marine.hourly.sea_level_height_msl, false)
    : [];
  const nextTide = tideEvents.find((e) => new Date(e.time).getTime() > now);

  const ctx = {
    hour: new Date().getHours(),
    wind: windKt,
    swell,
    sst,
    monthIdx: new Date().getMonth() + 1,
    nextTide
  };

  for (const s of getBaitSuggestions(ctx)) {
    wrap.appendChild(el("div", { class: "bait-row tone-" + s.tone }, [
      el("div", { class: "bait-icon", html: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true"><path d="M2 12C2 12 7 5 12 5C17 5 22 12 22 12C22 12 17 19 12 19C7 19 2 12 2 12Z" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.5"/></svg>` }),
      el("div", { class: "bait-body" }, [
        el("div", { class: "bait-head" }, [
          el("span", { class: "bait-name" }, s.name),
          el("span", { class: "bait-tag" }, s.tag)
        ]),
        el("div", { class: "bait-reason" }, s.reason)
      ])
    ]));
  }
}

// ---------- Catch Log ----------

const LOG_SPECIES = [
  { id: "snapper",  name: "Snapper",        maori: "Tāmure",       color: "#FF6B6B" },
  { id: "kingfish", name: "Kingfish",       maori: "Haku",         color: "#F5A623" },
  { id: "marlin",   name: "Striped Marlin", maori: "Takeketonga",  color: "#00C9A7" },
  { id: "kahawai",  name: "Kahawai",        maori: "Kahawai",      color: "#7BD4F0" },
  { id: "trevally", name: "Trevally",       maori: "Araara",       color: "#C77DFF" },
  { id: "hapuku",   name: "Hāpuku",         maori: "Hāpuku",       color: "#4D96FF" },
  { id: "tarakihi", name: "Tarakihi",       maori: "Tarakihi",     color: "#FF9F43" },
  { id: "johndory", name: "John Dory",      maori: "Kuparu",       color: "#7B8FA1" },
  { id: "gurnard",  name: "Gurnard",        maori: "Kumukumu",     color: "#7B8FA1" },
  { id: "bluecod",  name: "Blue Cod",       maori: "Rāwaru",       color: "#7BD4F0" },
  { id: "crayfish", name: "Rock Lobster",   maori: "Kōura",        color: "#FF6B6B" },
  { id: "paua",     name: "Pāua",           maori: "Pāua",         color: "#00C9A7" },
  { id: "other",    name: "Other",          maori: "",             color: "#7B8FA1" }
];

const NZ_REGS = [
  { id: "snapper",  name: "Snapper",        maori: "Tāmure",      color: "#FF6B6B", minSize: 30, bag: 9,  bagNote: "per person/day", measure: "total length", note: "Northland/Hauraki Gulf: check regional limits" },
  { id: "kingfish", name: "Kingfish",       maori: "Haku",        color: "#F5A623", minSize: 75, bag: 3,  bagNote: "per person/day", measure: "total length", note: "Tag & release encouraged for large fish" },
  { id: "kahawai",  name: "Kahawai",        maori: "Kahawai",     color: "#7BD4F0", minSize: 30, bag: 20, bagNote: "per person/day", measure: "total length", note: "" },
  { id: "trevally", name: "Trevally",       maori: "Araara",      color: "#C77DFF", minSize: 25, bag: 20, bagNote: "per person/day", measure: "total length", note: "" },
  { id: "hapuku",   name: "Hāpuku / Groper",maori: "Hāpuku",      color: "#4D96FF", minSize: 40, bag: 3,  bagNote: "combined hāpuku & bass", measure: "total length", note: "" },
  { id: "tarakihi", name: "Tarakihi",       maori: "Tarakihi",    color: "#FF9F43", minSize: 25, bag: 20, bagNote: "per person/day", measure: "total length", note: "" },
  { id: "marlin",   name: "Striped Marlin", maori: "Takeketonga", color: "#00C9A7", minSize: null, bag: 1, bagNote: "per vessel/day", measure: "LJFL", note: "Tag & release strongly encouraged" },
  { id: "johndory", name: "John Dory",      maori: "Kuparu",      color: "#7B8FA1", minSize: 25, bag: 20, bagNote: "per person/day", measure: "total length", note: "" },
  { id: "gurnard",  name: "Gurnard",        maori: "Kumukumu",    color: "#7B8FA1", minSize: 25, bag: 20, bagNote: "per person/day", measure: "total length", note: "" },
  { id: "bluecod",  name: "Blue Cod",       maori: "Rāwaru",      color: "#7BD4F0", minSize: 33, bag: 20, bagNote: "per person/day", measure: "total length", note: "Varies by region — some areas closed or restricted" },
  { id: "crayfish", name: "Rock Lobster",   maori: "Kōura",       color: "#FF6B6B", minSize: 54, bag: 6,  bagNote: "per person/day", measure: "tail width",   note: "Berried / soft-shell females must be returned" },
  { id: "paua",     name: "Pāua",           maori: "Pāua",        color: "#00C9A7", minSize: 125, bag: 10, bagNote: "per person/day", measure: "shell length", note: "Must be prised off underwater, not on rocks" }
];

state._logFilter = "all";

function renderCatchLog() {
  const cards = $("#logCards");
  const count = $("#logCount");
  const stats = $("#logStats");
  const best = $("#logBest");
  const filters = $("#logFilters");
  if (!cards) return;

  const all = state.catches || [];
  count.textContent = all.length ? `· ${all.length}` : "";

  // Stats + best
  if (all.length) {
    stats.hidden = false;
    stats.innerHTML = "";
    const totalKg = all.reduce((s, c) => s + (parseFloat(c.weight) || 0), 0);
    const speciesIn = [...new Set(all.map((c) => c.species))];
    stats.append(
      logStatTile("Catches", all.length, "fish", "var(--accent)"),
      logStatTile("Species", speciesIn.length, "types", "var(--accent)"),
      logStatTile("Total wt", totalKg < 10 ? totalKg.toFixed(1) : Math.round(totalKg), "kg", "var(--accent-2)")
    );

    const bestFish = all.reduce((b, c) => (parseFloat(c.length) || 0) > (parseFloat(b?.length) || 0) ? c : b, null);
    if (bestFish && bestFish.length) {
      best.hidden = false;
      const sp = LOG_SPECIES.find((s) => s.id === bestFish.species) || { name: bestFish.species || "Fish" };
      best.innerHTML = "";
      best.append(
        el("span", { class: "log-best-label" }, "Personal best"),
        el("span", { class: "log-best-len" }, `${bestFish.length} cm`)
      );
      if (bestFish.weight) {
        best.append(el("span", { class: "log-best-wt" }, `${bestFish.weight} kg`));
      }
      best.append(el("span", { class: "log-best-sp" }, sp.name));
    } else best.hidden = true;

    // Filters
    filters.hidden = false;
    filters.innerHTML = "";
    filters.appendChild(logFilterChip("All", "all", state._logFilter === "all", all.length));
    for (const id of speciesIn) {
      const sp = LOG_SPECIES.find((x) => x.id === id) || { name: id, color: "#7B8FA1" };
      const n = all.filter((c) => c.species === id).length;
      filters.appendChild(logFilterChip(sp.name, id, state._logFilter === id, n, sp.color));
    }
  } else {
    stats.hidden = true;
    best.hidden = true;
    filters.hidden = true;
  }

  // Cards
  cards.innerHTML = "";
  const filtered = state._logFilter === "all" ? all : all.filter((c) => c.species === state._logFilter);

  if (!filtered.length) {
    cards.appendChild(el("div", { class: "log-empty" }, [
      el("div", { class: "log-empty-icon", html: `<svg viewBox="0 0 48 48" width="48" height="48" fill="none"><path d="M4 24c0-2 4-8 12-8h12l8-4v24l-8-4H16C8 32 4 26 4 24z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="32" cy="22" r="1.5" fill="currentColor"/></svg>` }),
      el("div", { class: "log-empty-title" }, all.length ? "No catches in this filter" : "No catches logged yet"),
      el("div", { class: "log-empty-sub" }, all.length ? "Try a different species filter." : "Tap + Log to record your first fish.")
    ]));
  } else {
    for (const entry of filtered) {
      cards.appendChild(renderCatchCard(entry));
    }
  }
}

function logStatTile(label, value, unit, color) {
  return el("div", { class: "log-stat" }, [
    el("div", { class: "log-stat-label" }, label),
    el("div", { class: "log-stat-value", style: `color:${color}` }, String(value)),
    el("div", { class: "log-stat-unit" }, unit)
  ]);
}

function logFilterChip(label, value, active, count, color) {
  return el("button", {
    class: "log-filter-chip" + (active ? " active" : ""),
    style: color ? `--chip-color:${color}` : "",
    onclick: () => {
      state._logFilter = value;
      renderCatchLog();
    }
  }, [
    el("span", {}, label),
    el("span", { class: "log-filter-count" }, String(count))
  ]);
}

function renderCatchCard(entry) {
  const sp = LOG_SPECIES.find((s) => s.id === entry.species) || { name: entry.species || "Fish", color: "#7B8FA1", maori: "" };
  const d = entry.date ? new Date(entry.date) : null;
  const dateStr = d ? d.toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short" }) : "";
  const timeStr = d ? d.toLocaleTimeString("en-NZ", { hour: "2-digit", minute: "2-digit" }) : "";

  return el("div", { class: "log-card" }, [
    entry.photo
      ? el("img", { class: "log-card-photo", src: entry.photo, alt: sp.name })
      : el("div", { class: "log-card-photo placeholder", style: `background:${sp.color}22; color:${sp.color}` }, sp.name[0]),
    el("div", { class: "log-card-body" }, [
      el("div", { class: "log-card-head" }, [
        el("div", {}, [
          el("div", { class: "log-card-name" }, sp.name),
          sp.maori ? el("div", { class: "log-card-maori" }, sp.maori) : null
        ]),
        el("div", { class: "log-card-stats" }, [
          entry.length ? el("span", { class: "log-card-len" }, `${entry.length} cm`) : null,
          entry.weight ? el("span", { class: "log-card-wt" }, `${entry.weight} kg`) : null
        ])
      ]),
      el("div", { class: "log-card-meta" }, [
        entry.location ? el("span", {}, `📍 ${entry.location}`) : null,
        dateStr ? el("span", {}, `${dateStr} · ${timeStr}`) : null
      ]),
      entry.notes ? el("div", { class: "log-card-notes" }, entry.notes) : null,
      el("div", { class: "log-card-actions" }, [
        el("button", {
          class: "log-card-btn share",
          onclick: () => shareCatch(entry)
        }, "↗ Share"),
        el("button", {
          class: "log-card-btn del",
          onclick: () => {
            if (!confirm(`Delete this ${sp.name.toLowerCase()} entry?`)) return;
            state.catches = (state.catches || []).filter((c) => c.id !== entry.id);
            saveJSON("catches", state.catches);
            renderCatchLog();
          }
        }, "Delete")
      ])
    ])
  ]);
}

// Generate a 1080×580 PNG social card and either share natively or download.
async function shareCatch(entry) {
  const sp = LOG_SPECIES.find((s) => s.id === entry.species) || { name: entry.species || "Fish", color: "#7B8FA1", maori: "" };
  try {
    const dataUrl = await generateCatchShareCard(entry, sp);
    if (navigator.share) {
      try {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], "ribice-catch.png", { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: `${sp.name} — Ribice` });
          return;
        }
      } catch {/* fall through to download */}
    }
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `ribice-${sp.name.toLowerCase().replace(/\s+/g, "-")}.png`;
    a.click();
    toast("Catch card saved");
  } catch (e) {
    console.error(e);
    toast("Share failed");
  }
}

async function generateCatchShareCard(entry, sp) {
  const W = 1080, H = 580;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0b1a2b");
  bg.addColorStop(1, "#15304d");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  // Grid
  ctx.strokeStyle = "rgba(124,196,232,0.05)"; ctx.lineWidth = 0.5;
  for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  // Left slab — photo or species colour
  const slabW = 440;
  if (entry.photo) {
    await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        ctx.save();
        ctx.beginPath(); ctx.rect(0, 0, slabW, H); ctx.clip();
        const scale = Math.max(slabW / img.width, H / img.height);
        ctx.drawImage(img, (slabW - img.width * scale) / 2, (H - img.height * scale) / 2, img.width * scale, img.height * scale);
        ctx.restore();
        const fade = ctx.createLinearGradient(slabW - 100, 0, slabW, 0);
        fade.addColorStop(0, "rgba(11,26,43,0)");
        fade.addColorStop(1, "rgba(11,26,43,1)");
        ctx.fillStyle = fade; ctx.fillRect(slabW - 100, 0, 100, H);
        resolve();
      };
      img.onerror = resolve;
      img.src = entry.photo;
    });
  } else {
    const grad = ctx.createLinearGradient(0, 0, slabW, H);
    grad.addColorStop(0, sp.color + "44");
    grad.addColorStop(1, sp.color + "08");
    ctx.fillStyle = grad; ctx.fillRect(0, 0, slabW, H);
    ctx.fillStyle = sp.color + "33";
    ctx.font = "bold 200px -apple-system,system-ui,sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(sp.name[0], slabW / 2, H / 2);
    const fade = ctx.createLinearGradient(slabW - 80, 0, slabW, 0);
    fade.addColorStop(0, "rgba(11,26,43,0)");
    fade.addColorStop(1, "rgba(11,26,43,1)");
    ctx.fillStyle = fade; ctx.fillRect(slabW - 80, 0, 80, H);
  }
  // Teal accent bar
  ctx.fillStyle = "rgba(124,196,232,0.9)"; ctx.fillRect(0, 0, 5, H);
  // Right text area
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  const tx = slabW + 44;
  let ty = 90;
  ctx.fillStyle = "rgba(124,196,232,0.85)";
  ctx.font = "600 14px -apple-system,system-ui,sans-serif";
  ctx.fillText("RIBICE", tx, ty); ty += 52;
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 70px -apple-system,system-ui,sans-serif";
  ctx.fillText(sp.name, tx, ty); ty += 20;
  if (sp.maori) {
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "italic 26px -apple-system,system-ui,sans-serif";
    ctx.fillText(sp.maori, tx, ty + 26); ty += 54;
  } else ty += 30;
  ty += 22;
  if (entry.length) {
    ctx.fillStyle = "#7cc4e8";
    ctx.font = "bold 52px -apple-system,system-ui,sans-serif";
    ctx.fillText(entry.length + " cm", tx, ty); ty += 64;
  }
  if (entry.weight) {
    ctx.fillStyle = "#ffd47a";
    ctx.font = "bold 52px -apple-system,system-ui,sans-serif";
    ctx.fillText(entry.weight + " kg", tx, ty); ty += 64;
  }
  ty += 8;
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "500 22px -apple-system,system-ui,sans-serif";
  if (entry.location) { ctx.fillText("📍 " + entry.location, tx, ty); ty += 34; }
  if (entry.date) {
    const d = new Date(entry.date);
    ctx.fillText(d.toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "long", year: "numeric" }), tx, ty);
  }
  ctx.fillStyle = "rgba(124,196,232,0.35)"; ctx.fillRect(0, H - 3, W, 3);
  return c.toDataURL("image/png");
}

// ---------- Add catch dialog ----------

let _addCatchPhotoDataUrl = null;
let _addCatchSpecies = "snapper";

function openAddCatchDialog() {
  _addCatchPhotoDataUrl = null;
  _addCatchSpecies = "snapper";
  const dlg = $("#addCatchDialog");
  // Reset form fields
  $("#addCatchLength").value = "";
  $("#addCatchWeight").value = "";
  $("#addCatchLocation").value = state.data?.spot?.name || "";
  // Default datetime to now (rounded to current minute)
  const now = new Date();
  const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  $("#addCatchDate").value = localISO;
  $("#addCatchNotes").value = "";
  $("#addCatchPhoto").value = "";
  $("#addCatchPhotoPreview").innerHTML = "";
  renderSpeciesPicker();
  dlg.showModal();
}

function renderSpeciesPicker() {
  const wrap = $("#addCatchSpecies");
  wrap.innerHTML = "";
  for (const sp of LOG_SPECIES) {
    const active = sp.id === _addCatchSpecies;
    wrap.appendChild(el("button", {
      type: "button",
      class: "species-pick" + (active ? " active" : ""),
      style: active ? `--pick-color:${sp.color}` : "",
      onclick: () => { _addCatchSpecies = sp.id; renderSpeciesPicker(); }
    }, [
      el("span", { class: "species-pick-dot", style: `background:${sp.color}` }),
      el("span", {}, sp.name)
    ]));
  }
}

async function handleAddCatchPhoto(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    _addCatchPhotoDataUrl = await downscalePhoto(file, 1200);
    $("#addCatchPhotoPreview").innerHTML = `<img src="${_addCatchPhotoDataUrl}" alt="catch photo"/>`;
  } catch (err) {
    console.error(err);
    toast("Couldn't load photo");
  }
}

// Downscale + JPEG-compress so localStorage stays under quota.
async function downscalePhoto(file, maxDim) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function saveCatch(ev) {
  ev?.preventDefault?.();
  const entry = {
    id: Date.now(),
    species: _addCatchSpecies,
    length: $("#addCatchLength").value.trim(),
    weight: $("#addCatchWeight").value.trim(),
    location: $("#addCatchLocation").value.trim(),
    date: $("#addCatchDate").value || new Date().toISOString(),
    notes: $("#addCatchNotes").value.trim(),
    photo: _addCatchPhotoDataUrl
  };
  if (!entry.length) {
    toast("Length is required");
    return;
  }
  state.catches = [entry, ...(state.catches || [])];
  try {
    saveJSON("catches", state.catches);
  } catch (err) {
    // QuotaExceededError — likely a huge photo. Drop the photo and warn.
    if (err.name === "QuotaExceededError") {
      delete entry.photo;
      state.catches[0] = entry;
      saveJSON("catches", state.catches);
      toast("Photo too big for offline storage — entry saved without it");
    } else throw err;
  }
  $("#addCatchDialog").close();
  renderCatchLog();
}

// ---------- NZ Regs sheet ----------

function openRegsDialog() {
  const wrap = $("#regsList");
  wrap.innerHTML = "";
  for (const r of NZ_REGS) {
    const unitTxt = r.measure === "tail width" ? "mm tail" :
                    r.measure === "shell length" ? "mm" :
                    r.measure === "LJFL" ? "cm LJFL" : "cm";
    wrap.appendChild(el("div", { class: "regs-row" }, [
      el("div", { class: "regs-row-head" }, [
        el("div", {}, [
          el("span", { class: "regs-name" }, r.name),
          r.maori ? el("span", { class: "regs-maori" }, r.maori) : null
        ]),
        el("div", { class: "regs-stats" }, [
          r.minSize != null ? el("div", { class: "regs-stat min", style: `--regs-color:${r.color}` }, [
            el("div", { class: "regs-stat-label" }, "Min size"),
            el("div", { class: "regs-stat-value" }, [
              String(r.minSize),
              el("span", { class: "regs-stat-unit" }, unitTxt)
            ])
          ]) : null,
          el("div", { class: "regs-stat bag" }, [
            el("div", { class: "regs-stat-label" }, "Bag limit"),
            el("div", { class: "regs-stat-value" }, String(r.bag)),
            el("div", { class: "regs-stat-sub" }, r.bagNote)
          ])
        ])
      ]),
      r.note ? el("div", { class: "regs-note" }, "⚠ " + r.note) : null
    ]));
  }
  $("#regsDialog").showModal();
}

// ---------- Spots tab ----------

function renderSpotsTab() {
  const list = $("#spotsTabList");
  if (!list) return;
  list.innerHTML = "";
  for (const s of state.spots) {
    const isActive = s.id === state.activeSpotId;
    const isGps = s.id === "__gps__";
    list.appendChild(el("div", { class: "spots-tab-row" + (isActive ? " active" : "") }, [
      el("button", {
        class: "spots-tab-pick",
        onclick: () => {
          state.activeSpotId = s.id;
          saveJSON("activeSpotId", s.id);
          refresh();
          renderSpotsTab();
          renderSpotPicker();
        }
      }, [
        el("div", { class: "spots-tab-marker" }, isGps ? "📍" : "•"),
        el("div", { class: "spots-tab-body" }, [
          el("div", { class: "spots-tab-name" }, s.name),
          el("div", { class: "spots-tab-coords" }, `${s.lat.toFixed(3)}, ${s.lon.toFixed(3)}`)
        ]),
        isActive ? el("span", { class: "spots-tab-active-pill" }, "Active") : null
      ]),
      !isGps ? el("button", {
        class: "spots-tab-remove",
        onclick: () => {
          if (!confirm(`Remove ${s.name}?`)) return;
          state.spots = state.spots.filter((x) => x.id !== s.id);
          saveJSON("spots", state.spots);
          if (state.activeSpotId === s.id) {
            state.activeSpotId = state.spots[0]?.id;
            saveJSON("activeSpotId", state.activeSpotId);
            refresh();
          }
          renderSpotsTab();
          renderSpotPicker();
        }
      }, "×") : null
    ]));
  }
  refreshOpenMapsLinkTab();
}

function refreshOpenMapsLinkTab() {
  const link = $("#openMapsLinkTab");
  if (!link) return;
  const spot = state.spots.find((s) => s.id === state.activeSpotId) || state.spots[0];
  if (spot) link.href = `https://www.google.com/maps/@${spot.lat},${spot.lon},11z`;
}

// ---------- Other species ranking list ----------

function renderOtherSpeciesList(scored) {
  const wrap = $("#otherSpeciesList");
  if (!wrap) return;
  wrap.innerHTML = "";
  const rest = scored.filter((s) => s.id !== state.activeSpecies);
  for (const sp of rest) {
    const cls = sp.score >= 70 ? "high" : sp.score >= 45 ? "mid" : "low";
    wrap.appendChild(el("button", {
      class: "other-sp-row",
      onclick: () => {
        state.activeSpecies = sp.id;
        saveJSON("activeSpecies", sp.id);
        // Trigger a re-render of the Forecast tab.
        if (state.data) {
          const { spot, hourlyAgg, dailyAgg, marine, solunar } = state.data;
          renderCatch(spot, hourlyAgg, dailyAgg, marine, solunar);
        }
      }
    }, [
      el("div", { class: "other-sp-id" }, [
        el("div", { class: "other-sp-name" }, sp.name),
        el("div", { class: "other-sp-maori" }, sp.maori)
      ]),
      el("div", { class: "other-sp-bars" },
        sp.timeline.slice(0, 24).map((b, i) =>
          el("span", {
            class: "other-sp-bar " + b.band,
            style: `height:${b.band === "hot" ? 18 : b.band === "warm" ? 12 : 5}px`
          })
        )
      ),
      el("span", { class: "other-sp-score " + cls }, String(sp.score))
    ]));
  }
}

// ---------- Wind compass ----------

function renderWindCompass(dirDeg, windKt, gustKt) {
  const wrap = $("#windCompass");
  if (!wrap) return;
  if (dirDeg == null) { wrap.innerHTML = ""; return; }
  const dir = dirDeg;
  const size = 140;
  wrap.innerHTML = `
    <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" class="wind-compass" aria-label="Wind compass">
      <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 6}" fill="rgba(124,196,232,0.04)" stroke="rgba(124,196,232,0.25)" stroke-width="1"/>
      <text x="${size/2}" y="14"  text-anchor="middle" fill="#a8c0d4" font-size="11" font-weight="600">N</text>
      <text x="${size-8}" y="${size/2+3}" text-anchor="end" fill="#7c97ad" font-size="10">E</text>
      <text x="${size/2}" y="${size-6}" text-anchor="middle" fill="#7c97ad" font-size="10">S</text>
      <text x="8" y="${size/2+3}" text-anchor="start" fill="#7c97ad" font-size="10">W</text>
      <g transform="translate(${size/2} ${size/2}) rotate(${dir})">
        <path d="M 0 ${-(size/2 - 16)} L 6 -4 L 0 -10 L -6 -4 Z" fill="#ffd47a"/>
        <path d="M 0 ${size/2 - 16} L 6 4 L 0 10 L -6 4 Z" fill="#7cc4e8" opacity="0.6"/>
      </g>
      <circle cx="${size/2}" cy="${size/2}" r="3" fill="#0b1a2b" stroke="#ffd47a" stroke-width="1.5"/>
      <text x="${size/2}" y="${size/2 + 28}" text-anchor="middle" fill="#e8eef5" font-size="16" font-weight="700">${Math.round(dir)}°</text>
      <text x="${size/2}" y="${size/2 + 42}" text-anchor="middle" fill="#7c97ad" font-size="10" letter-spacing="1">${compass(dir)}</text>
    </svg>
    <div class="wind-compass-readout">
      <div><div class="lbl">Wind</div><div class="val">${fmtWind(windKt)}</div></div>
      <div><div class="lbl">Gust</div><div class="val">${fmtWind(gustKt)}</div></div>
    </div>
  `;
}

// Show version in the topbar pill so it's visible without opening settings.
const _versionPill = document.querySelector("#versionPill");
if (_versionPill) _versionPill.textContent = "v" + APP_VERSION;

// Top-level error visibility — no more silent blank screens. Any uncaught
// runtime error or unhandled promise rejection drops a red banner at the top
// of the page with the message + a Force-reload button. So even if a SW is
// serving a broken cached bundle, you can see WHY it's broken and recover
// without having to open Chrome DevTools.
function showGlobalError(msg, source) {
  let banner = document.getElementById("globalError");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "globalError";
    banner.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:9999;background:#ff7a7a;color:#0b1a2b;padding:12px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.4;display:flex;flex-direction:column;gap:8px;box-shadow:0 4px 16px rgba(0,0,0,.4);";
    document.body.appendChild(banner);
  }
  const line = document.createElement("div");
  line.innerHTML = `<strong>${source || "Error"}:</strong> ${String(msg).slice(0, 200)}`;
  banner.appendChild(line);
  // One reload button only (don't multiply them).
  if (!banner.querySelector("button")) {
    const btn = document.createElement("button");
    btn.textContent = "Force reload (wipe cache)";
    btn.style.cssText = "background:#0b1a2b;color:#fff;border:0;border-radius:6px;padding:8px 14px;font-weight:700;cursor:pointer;align-self:flex-start;font-family:inherit;";
    btn.onclick = () => {
      if (typeof forceUpdate === "function") forceUpdate();
      else location.reload();
    };
    banner.appendChild(btn);
  }
}
window.addEventListener("error", (e) => {
  showGlobalError(`${e.message} (${e.filename?.split("/").pop()}:${e.lineno})`, "JS error");
});
window.addEventListener("unhandledrejection", (e) => {
  showGlobalError(e.reason?.message || String(e.reason), "Promise rejection");
});

// Wrap bootstrap so any of these crashing surfaces a recoverable error
// instead of leaving the user staring at "Reading the sky…" forever.
try { bind();        } catch (e) { showGlobalError(e.message, "bind"); }
try { bindTabs();    } catch (e) { showGlobalError(e.message, "bindTabs"); }
try { registerSW();  } catch (e) { showGlobalError(e.message, "registerSW"); }
try { refresh();     } catch (e) { showGlobalError(e.message, "refresh"); }

// Refresh every 30 min while open.
setInterval(refresh, 30 * 60 * 1000);
