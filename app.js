"use strict";

const LOCATIONS = {
  "cerro-colorado": {
    name: "Cerro Colorado",
    subtitle: "Cerro Colorado, Arequipa, Arequipa",
    coordinates: [-16.379898, -71.557855],
    elevation: 2399,
  },
  periferia: {
    name: "Arequipa periferia",
    subtitle: "Arequipa periferia (alta montaña), Arequipa",
    coordinates: [-16.48, -71.52],
    elevation: 3400,
  },
  yanahuara: {
    name: "Yanahuara",
    subtitle: "Yanahuara, Arequipa, Arequipa",
    coordinates: [-16.389, -71.537],
    elevation: 2390,
  },
  cayma: {
    name: "Cayma",
    subtitle: "Cayma, Arequipa, Arequipa",
    coordinates: [-16.35, -71.548],
    elevation: 2450,
  },
};

const UPDATE_INTERVAL = 15 * 60 * 1000;
const NOAA_PRODUCTS = {
  geocolor: {
    label: "GeoColor",
    path: "GEOCOLOR",
  },
  infrared: {
    label: "Infrarrojo · banda 13",
    path: "13",
  },
  airmass: {
    label: "AirMass",
    path: "AirMass",
  },
  sandwich: {
    label: "Sandwich",
    path: "Sandwich",
  },
};
const WEATHER_CODES = {
  0: ["Despejado", "☀"],
  1: ["Mayormente despejado", "🌤"],
  2: ["Parcialmente nublado", "⛅"],
  3: ["Nublado", "☁"],
  45: ["Niebla", "🌫"],
  48: ["Niebla helada", "🌫"],
  51: ["Llovizna ligera", "🌦"],
  53: ["Llovizna moderada", "🌦"],
  55: ["Llovizna intensa", "🌧"],
  56: ["Llovizna helada", "🌧"],
  57: ["Llovizna helada intensa", "🌧"],
  61: ["Lluvia ligera", "🌦"],
  63: ["Lluvia moderada", "🌧"],
  65: ["Lluvia intensa", "🌧"],
  66: ["Lluvia helada", "🌧"],
  67: ["Lluvia helada intensa", "🌧"],
  71: ["Nieve ligera", "🌨"],
  73: ["Nieve moderada", "🌨"],
  75: ["Nieve intensa", "❄"],
  77: ["Granizo menudo", "🌨"],
  80: ["Chubascos ligeros", "🌦"],
  81: ["Chubascos moderados", "🌧"],
  82: ["Chubascos intensos", "⛈"],
  85: ["Chubascos de nieve", "🌨"],
  86: ["Chubascos de nieve intensos", "❄"],
  95: ["Tormenta", "⛈"],
  96: ["Tormenta con granizo", "⛈"],
  99: ["Tormenta intensa con granizo", "⛈"],
};

const elements = {
  breadcrumb: document.querySelector("#breadcrumb-location"),
  locationSubtitle: document.querySelector("#location-subtitle"),
  mapName: document.querySelector("#map-location-name"),
  satelliteName: document.querySelector("#satellite-location"),
  satelliteCoordinates: document.querySelector("#satellite-coordinates"),
  temperature: document.querySelector("#current-temp"),
  description: document.querySelector("#current-description"),
  icon: document.querySelector("#current-icon"),
  feelsLike: document.querySelector("#feels-like"),
  humidity: document.querySelector("#current-humidity"),
  wind: document.querySelector("#current-wind"),
  gusts: document.querySelector("#current-gusts"),
  solarValue: document.querySelector("#solar-value"),
  solarMeter: document.querySelector("#solar-meter"),
  solarStatus: document.querySelector("#solar-status"),
  rainChance: document.querySelector("#rain-chance"),
  rainMeter: document.querySelector("#rain-meter"),
  rainStatus: document.querySelector("#rain-status"),
  rainAmount: document.querySelector("#rain-amount"),
  precipitationStatus: document.querySelector("#precip-status"),
  pressure: document.querySelector("#pressure-value"),
  pressureMeter: document.querySelector("#pressure-meter"),
  pressureStatus: document.querySelector("#pressure-status"),
  hourly: document.querySelector("#hourly-forecast"),
  daily: document.querySelector("#daily-forecast"),
  alert: document.querySelector("#alert-content"),
  senamhiStatus: document.querySelector("#senamhi-status"),
  senamhiList: document.querySelector("#senamhi-list"),
  nextUpdate: document.querySelector("#next-update"),
  radarTimestamp: document.querySelector("#radar-timestamp"),
};

let selectedId = "cerro-colorado";
let selectedLocation = LOCATIONS[selectedId];
let map;
let locationMarker;
let radarLayer;
let latestRadarFrame;
let selectedRadarFilter = "standard";
let selectedSatelliteProduct = "geocolor";
let satelliteZoom = 2.5;
let nextUpdateAt = Date.now() + UPDATE_INTERVAL;
// NOAA's fixed NSA JPEG has no pixel georeferencing; this is a visual sector anchor.
const SATELLITE_REFERENCE = { latitude: -16.379898, longitude: -71.557855, x: 23, y: 75 };

function weatherDescription(code) {
  return WEATHER_CODES[code] || ["Condición variable", "⛅"];
}

function getHourIndex(times, currentTime) {
  const currentHour = currentTime.slice(0, 13);
  let index = times.findIndex((time) => time.slice(0, 13) === currentHour);
  if (index < 0) {
    index = times.findIndex((time) => time >= currentTime);
  }
  return Math.max(index, 0);
}

function formatDay(date, index) {
  if (index === 0) return "Hoy";
  if (index === 1) return "Mañana";
  return new Intl.DateTimeFormat("es-PE", { weekday: "long" }).format(date);
}

function formatHourlyTime(time) {
  const date = new Date(time);
  return new Intl.DateTimeFormat("es-PE", {
    hour: "numeric",
    hour12: true,
    timeZone: "America/Lima",
  })
    .format(date)
    .replace(/\s/g, "")
    .toLowerCase();
}

function setText(element, value) {
  if (element) element.textContent = value;
}

function updateLocationLabels() {
  setText(elements.breadcrumb, selectedLocation.name);
  setText(
    elements.locationSubtitle,
    `${selectedLocation.subtitle} · ${selectedLocation.elevation.toLocaleString("es-PE")} m s. n. m.`,
  );
  setText(elements.mapName, selectedLocation.name.toLocaleUpperCase("es-PE"));
  setText(elements.satelliteName, selectedLocation.name.toLocaleUpperCase("es-PE"));
  setText(
    elements.satelliteCoordinates,
    formatCoordinates(selectedLocation.coordinates),
  );
  renderSatelliteImage();
  if (map && locationMarker) {
    map.setView(selectedLocation.coordinates, map.getZoom(), { animate: true });
    locationMarker.setLatLng(selectedLocation.coordinates);
    locationMarker.setPopupContent(
      `<strong>${selectedLocation.name}</strong><br>${selectedLocation.elevation.toLocaleString("es-PE")} m s. n. m.`,
    );
  }
}

function initializeMap() {
  if (!window.L) {
    setText(elements.radarTimestamp, "No se pudo cargar el mapa");
    return;
  }
  map = L.map("rain-map", {
    center: selectedLocation.coordinates,
    zoom: 12,
    zoomControl: true,
    scrollWheelZoom: false,
  });
  L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    {
    attribution:
      'Tiles &copy; Esri — Sources: Esri, HERE, Garmin, USGS, Intermap, INCREMENT P, NRCan, Esri Japan, METI, Esri China (Hong Kong), Esri Korea, Esri (Thailand), NGCC, &copy; OpenStreetMap contributors, and the GIS User Community',
    maxZoom: 19,
    },
  ).addTo(map);
  locationMarker = L.marker(selectedLocation.coordinates, {
    icon: L.divIcon({
      className: "",
      html: '<span class="weather-marker"></span>',
      iconSize: [15, 15],
      iconAnchor: [7, 7],
    }),
  })
    .addTo(map)
    .bindPopup(
      `<strong>${selectedLocation.name}</strong><br>${selectedLocation.elevation.toLocaleString("es-PE")} m s. n. m.`,
    );
  map.whenReady(() => window.setTimeout(() => map.invalidateSize(), 100));
  refreshRadar();
}

function formatCoordinates([latitude, longitude]) {
  const toDms = (value) => {
    const absolute = Math.abs(value);
    const degrees = Math.floor(absolute);
    const minutes = Math.round((absolute - degrees) * 60);
    return `${degrees}°${String(minutes).padStart(2, "0")}′`;
  };
  return `${toDms(latitude)}${latitude < 0 ? "S" : "N"} ${toDms(longitude)}${longitude < 0 ? "W" : "E"}`;
}

function getSatellitePosition(location = selectedLocation) {
  const [latitude, longitude] = location.coordinates;
  return {
    x: SATELLITE_REFERENCE.x + (longitude - SATELLITE_REFERENCE.longitude) * 1.5,
    y: SATELLITE_REFERENCE.y - (latitude - SATELLITE_REFERENCE.latitude) * 1.8,
  };
}

async function refreshRadar() {
  if (!map) return;
  try {
    const response = await fetch("https://api.rainviewer.com/public/weather-maps.json", {
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`RainViewer respondió ${response.status}`);
    const radarData = await response.json();
    const frames = radarData.radar?.past || [];
    const frame = frames[frames.length - 1];
    if (!frame || !radarData.host) throw new Error("No hay imágenes de radar disponibles");
    latestRadarFrame = { ...frame, host: radarData.host };
    renderRadarLayer();
    setText(
      elements.radarTimestamp,
      `Radar · ${new Date(latestRadarFrame.time * 1000).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" })}`,
    );
  } catch (error) {
    console.error("No fue posible actualizar el radar:", error);
    setText(elements.radarTimestamp, "Radar no disponible temporalmente");
  }
}

function renderRadarLayer() {
  if (!map || !latestRadarFrame) return;
  if (radarLayer) map.removeLayer(radarLayer);
  radarLayer = undefined;
  if (selectedRadarFilter === "base") return;
  const smoothing = selectedRadarFilter === "standard" ? 1 : 0;
  const opacity = selectedRadarFilter === "standard" ? 0.68 : 0.9;
  radarLayer = L.tileLayer(
    `${latestRadarFrame.host}${latestRadarFrame.path}/256/{z}/{x}/{y}/2/${smoothing}_1.png`,
    { opacity, zIndex: 2, tileSize: 256, maxNativeZoom: 7, maxZoom: 19 },
  ).addTo(map);
}

function setSatelliteProduct(productId) {
  const product = NOAA_PRODUCTS[productId];
  if (!product) return;
  selectedSatelliteProduct = productId;
  renderSatelliteImage();
  setText(document.querySelector("#satellite-product-title"), product.label);
  setText(document.querySelector("#satellite-product-overlay"), `GOES-19 · ${product.label.toLocaleUpperCase("es-PE")}`);
}

function renderSatelliteImage() {
  const product = NOAA_PRODUCTS[selectedSatelliteProduct];
  const image = document.querySelector(".satellite-image");
  const marker = document.querySelector(".satellite-crosshair");
  const bounds = image.getBoundingClientRect();
  const aspectRatio = 1800 / 1080;
  const baseWidth = Math.max(bounds.width, bounds.height * aspectRatio);
  const imageWidth = baseWidth * satelliteZoom;
  const imageHeight = (imageWidth / aspectRatio);
  const position = getSatellitePosition();
  const calculateAxis = (fraction, imageSize, viewportSize) => {
    const overflow = imageSize - viewportSize;
    if (overflow <= 0) return { offset: 0, marker: (fraction / 100) * imageSize };
    const offset = Math.min(
      overflow,
      Math.max(0, (fraction / 100) * imageSize - viewportSize / 2),
    );
    return { offset, marker: (fraction / 100) * imageSize - offset };
  };
  const horizontal = calculateAxis(position.x, imageWidth, bounds.width);
  const vertical = calculateAxis(position.y, imageHeight, bounds.height);
  const resolution = satelliteZoom > 1 ? "3600x2160" : "1800x1080";
  const imageUrl = `https://cdn.star.nesdis.noaa.gov/GOES19/ABI/SECTOR/NSA/${product.path}/${resolution}.jpg?t=${Date.now()}`;
  image.style.backgroundImage = `linear-gradient(0deg, #0e19158a, transparent 40%), url("${imageUrl}")`;
  image.style.backgroundSize = `cover, ${imageWidth}px ${imageHeight}px`;
  image.style.backgroundPosition = `center, ${-horizontal.offset}px ${-vertical.offset}px`;
  marker.style.left = `${(horizontal.marker / bounds.width) * 100}%`;
  marker.style.top = `${(vertical.marker / bounds.height) * 100}%`;
  image.setAttribute(
    "aria-label",
    `Imagen ${product.label} de GOES-19, sector Sudamérica norte; zoom ${satelliteZoom.toFixed(1)} por`,
  );
  setText(document.querySelector("#satellite-zoom-level"), `${satelliteZoom.toFixed(1)}×`);
  document.querySelector("#satellite-zoom-out").disabled = satelliteZoom <= 1;
  document.querySelector("#satellite-zoom-in").disabled = satelliteZoom >= 4;
}

function changeSatelliteZoom(amount) {
  const nextZoom = Math.min(4, Math.max(1, satelliteZoom + amount));
  if (nextZoom === satelliteZoom) return;
  satelliteZoom = nextZoom;
  renderSatelliteImage();
}

function buildForecastUrl(location) {
  const params = new URLSearchParams({
    latitude: String(location.coordinates[0]),
    longitude: String(location.coordinates[1]),
    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,surface_pressure,shortwave_radiation",
    hourly:
      "temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code",
    daily:
      "temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,weather_code",
    forecast_days: "3",
    timezone: "America/Lima",
    cell_selection: "nearest",
  });
  return `https://api.open-meteo.com/v1/forecast?${params}`;
}

function renderCurrent(data, hourIndex) {
  const current = data.current;
  const [description, icon] = weatherDescription(current.weather_code);
  const humidity = current.relative_humidity_2m;
  const nextHourIndex = Math.min(hourIndex + 1, data.hourly.time.length - 1);
  const chance = data.hourly.precipitation_probability[nextHourIndex] ?? 0;
  const amount = data.hourly.precipitation[nextHourIndex] ?? current.precipitation;
  const pressure = current.surface_pressure;

  setText(elements.temperature, Math.round(current.temperature_2m));
  setText(elements.description, description);
  setText(elements.icon, icon);
  setText(elements.feelsLike, `${Math.round(current.apparent_temperature)}°`);
  setText(elements.humidity, `${humidity}%`);
  setText(elements.wind, `${Math.round(current.wind_speed_10m)} km/h`);
  setText(elements.gusts, `${Math.round(current.wind_gusts_10m)} km/h`);
  const solarRadiation = current.shortwave_radiation;
  if (Number.isFinite(solarRadiation)) {
    setText(elements.solarValue, Math.round(solarRadiation));
    elements.solarMeter.style.width = `${Math.min(Math.max(solarRadiation / 10, 0), 100)}%`;
    setText(
      elements.solarStatus,
      solarRadiation <= 0
        ? "Sin radiación"
        : solarRadiation < 100
          ? "Baja"
          : solarRadiation < 500
            ? "Moderada"
            : "Alta",
    );
  } else {
    setText(elements.solarValue, "--");
    elements.solarMeter.style.width = "0%";
    setText(elements.solarStatus, "No disponible");
  }
  setText(elements.rainChance, chance);
  elements.rainMeter.style.width = `${Math.min(Math.max(chance, 0), 100)}%`;
  setText(
    elements.rainStatus,
    chance < 20 ? "Baja" : chance < 60 ? "Moderada" : "Alta",
  );
  setText(elements.rainAmount, Number(amount).toFixed(1));
  setText(
    elements.precipitationStatus,
    Number(amount) > 0 ? "Posible" : "Sin lluvia",
  );
  if (Number.isFinite(pressure)) {
    setText(elements.pressure, Math.round(pressure));
    elements.pressureMeter.style.width = `${Math.min(
      Math.max(((pressure - 600) / 500) * 100, 0),
      100,
    )}%`;
    setText(elements.pressureStatus, "En superficie");
  } else {
    setText(elements.pressure, "--");
    elements.pressureMeter.style.width = "0%";
    setText(elements.pressureStatus, "No disponible");
  }
  renderAlerts(current, chance);
}

function renderHourly(data, currentIndex) {
  const offsets = [1, 3, 6];
  elements.hourly.innerHTML = "";
  offsets.forEach((hours) => {
    const index = Math.min(currentIndex + hours, data.hourly.time.length - 1);
    const [description, icon] = weatherDescription(data.hourly.weather_code[index]);
    const card = document.createElement("div");
    card.className = "hour-card";
    card.innerHTML = `
      <span class="hour-time">+${hours} H</span>
      <span class="hour-icon" aria-label="${description}">${icon}</span>
      <strong>${Math.round(data.hourly.temperature_2m[index])}°</strong>
      <div class="hour-rain"><i></i> ${data.hourly.precipitation_probability[index] ?? 0}%</div>`;
    elements.hourly.append(card);
  });
}

function renderDaily(data) {
  elements.daily.innerHTML = "";
  const minimum = Math.min(...data.daily.temperature_2m_min);
  const maximum = Math.max(...data.daily.temperature_2m_max);
  const temperatureSpan = maximum - minimum || 1;
  data.daily.time.forEach((day, index) => {
    const [description, icon] = weatherDescription(data.daily.weather_code[index]);
    const date = new Date(`${day}T12:00:00-05:00`);
    const rangeStart =
      ((data.daily.temperature_2m_min[index] - minimum) / temperatureSpan) * 100;
    const rangeWidth =
      ((data.daily.temperature_2m_max[index] - data.daily.temperature_2m_min[index]) /
        temperatureSpan) *
      100;
    const row = document.createElement("div");
    row.className = "daily-row";
    row.innerHTML = `
      <strong>${formatDay(date, index)}</strong>
      <span class="daily-weather-icon" aria-label="${description}">${icon}</span>
      <span class="daily-condition">${description}</span>
      <div class="daily-rain"><i></i><span>${data.daily.precipitation_probability_max[index] ?? 0}%</span></div>
      <span class="daily-range">${Math.round(data.daily.temperature_2m_min[index])}° <b>—</b> ${Math.round(data.daily.temperature_2m_max[index])}°</span>
      <div class="daily-bar"><i style="margin-left:${rangeStart}%;width:${rangeWidth}%"></i></div>
      <span class="daily-mm">${Number(data.daily.precipitation_sum[index]).toFixed(1)} mm</span>`;
    elements.daily.append(row);
  });
}

function renderAlerts(current, rainChance) {
  const alerts = [];
  if (current.wind_gusts_10m >= 50) alerts.push("Ráfagas de viento fuertes");
  if (rainChance >= 70) alerts.push("Alta probabilidad de lluvia en la próxima hora");
  if ([95, 96, 99].includes(current.weather_code)) alerts.push("Tormenta detectada en el pronóstico");
  elements.alert.classList.toggle("warning", alerts.length > 0);
  elements.alert.innerHTML = alerts.length
    ? `<span class="alert-ok-icon">!</span><span>${alerts.join(" · ")}</span>`
    : '<span class="alert-ok-icon">✓</span><span>Sin alertas meteorológicas para esta ubicación.</span>';
}

function renderSenamhiAlerts(data) {
  elements.senamhiList.replaceChildren();
  elements.senamhiStatus.classList.remove("is-error", "is-active");
  if (data.error) {
    elements.senamhiStatus.classList.add("is-error");
    setSenamhiStatus("No se pudo confirmar el estado de los avisos oficiales.");
    return;
  }
  setSenamhiStatus(
    data.alerts.length
      ? `${data.alerts.length} aviso${data.alerts.length === 1 ? "" : "s"} vigente${data.alerts.length === 1 ? "" : "s"} · revisado ${new Date(data.updated_at).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" })}`
      : `Sin avisos vigentes para Arequipa · revisado ${new Date(data.updated_at).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" })}`,
  );
  elements.senamhiStatus.classList.toggle("is-active", data.alerts.length > 0);
  data.alerts.forEach((alert) => {
    const item = document.createElement("article");
    item.className = `senamhi-alert severity-${alert.severity.toLowerCase()}`;
    const marker = document.createElement("span");
    marker.className = "severity-marker";
    marker.setAttribute("aria-hidden", "true");
    const content = document.createElement("div");
    content.className = "senamhi-alert-content";
    const title = document.createElement("strong");
    title.textContent = alert.title;
    const details = document.createElement("span");
    details.textContent = `Aviso N.° ${alert.number} · ${alert.severity} · ${alert.start_date} al ${alert.end_date}`;
    content.append(title, details);
    const link = document.createElement("a");
    link.href = alert.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.className = "senamhi-detail-link";
    link.textContent = "VER AVISO ↗";
    item.append(marker, content, link);
    elements.senamhiList.append(item);
  });
}

function setSenamhiStatus(message) {
  const dot = document.createElement("span");
  dot.className = "status-dot";
  dot.setAttribute("aria-hidden", "true");
  elements.senamhiStatus.replaceChildren(dot, document.createTextNode(message));
}

async function loadSenamhiAlerts() {
  try {
    const response = await fetch("/api/senamhi/alerts", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `Servidor respondió ${response.status}`);
    }
    renderSenamhiAlerts(data);
  } catch (error) {
    console.error("No fue posible consultar los avisos de SENAMHI:", error);
    renderSenamhiAlerts({ error: true, alerts: [] });
  }
}

async function loadWeather() {
  const refreshButton = document.querySelector("#refresh-button");
  refreshButton.classList.add("is-loading");
  try {
    const response = await fetch(buildForecastUrl(selectedLocation), { cache: "no-store" });
    if (!response.ok) throw new Error(`Open-Meteo respondió ${response.status}`);
    const data = await response.json();
    if (!data.current || !data.hourly?.time?.length || !data.daily?.time?.length) {
      throw new Error("La respuesta meteorológica está incompleta");
    }
    const currentIndex = getHourIndex(data.hourly.time, data.current.time);
    renderCurrent(data, currentIndex);
    renderHourly(data, currentIndex);
    renderDaily(data);
    nextUpdateAt = Date.now() + UPDATE_INTERVAL;
    setText(elements.nextUpdate, "en 15 min");
  } catch (error) {
    console.error("No fue posible actualizar el pronóstico:", error);
    setText(elements.description, "Datos no disponibles");
    elements.alert.classList.add("warning");
    elements.alert.innerHTML =
      '<span class="alert-ok-icon">!</span><span>No se pudieron cargar los datos. Verifica tu conexión e intenta actualizar.</span>';
  } finally {
    refreshButton.classList.remove("is-loading");
  }
}

function updateClock() {
  const now = new Date();
  const dateLabel = new Intl.DateTimeFormat("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Lima",
  }).format(now);
  const headingDate = document.querySelector(".page-heading .eyebrow");
  headingDate.innerHTML = `<span class="eyebrow-line"></span> ${dateLabel.toLocaleUpperCase("es-PE")} · ${now.toLocaleDateString("es-PE", { year: "numeric", timeZone: "America/Lima" })}`;
  setText(
    document.querySelector("#local-clock"),
    now.toLocaleTimeString("es-PE", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "America/Lima",
    }),
  );
  const minutes = Math.max(0, Math.ceil((nextUpdateAt - Date.now()) / 60000));
  setText(elements.nextUpdate, `en ${minutes} min`);
}

document.querySelectorAll(".station").forEach((button) => {
  button.addEventListener("click", () => {
    const nextId = button.dataset.location;
    if (!nextId || !LOCATIONS[nextId] || nextId === selectedId) return;
    selectedId = nextId;
    selectedLocation = LOCATIONS[nextId];
    satelliteZoom = 2.5;
    document.querySelector(".station.active")?.classList.remove("active");
    button.classList.add("active");
    updateLocationLabels();
    loadWeather();
  });
});

document.querySelector("#refresh-button").addEventListener("click", () => {
  loadWeather();
  refreshRadar();
  loadSenamhiAlerts();
});

document.querySelector("#radar-filter").addEventListener("change", (event) => {
  selectedRadarFilter = event.currentTarget.value;
  renderRadarLayer();
});

document.querySelector("#satellite-filter").addEventListener("change", (event) => {
  setSatelliteProduct(event.currentTarget.value);
});

document.querySelector("#satellite-zoom-in").addEventListener("click", () => {
  changeSatelliteZoom(0.5);
});

document.querySelector("#satellite-zoom-out").addEventListener("click", () => {
  changeSatelliteZoom(-0.5);
});

document.querySelector("#satellite-zoom-reset").addEventListener("click", () => {
  satelliteZoom = 1;
  renderSatelliteImage();
});

document.querySelector(".satellite-image").addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();
    changeSatelliteZoom(event.deltaY < 0 ? 0.5 : -0.5);
  },
  { passive: false },
);

function setMediaExpanded(panel, expanded) {
  panel.classList.toggle("is-expanded", expanded);
  document.body.classList.toggle(
    "media-expanded",
    Boolean(document.querySelector(".media-panel.is-expanded")),
  );
  const button = panel.querySelector(".expand-button");
  button.setAttribute("aria-label", expanded ? "Cerrar vista ampliada" : "Ampliar visualización");
  button.setAttribute("aria-expanded", String(expanded));
  button.querySelector(".expand-label").textContent = expanded ? "CERRAR" : "AMPLIAR";
  button.querySelector("svg").innerHTML = expanded
    ? '<path d="m6 6 12 12M18 6 6 18"/>'
    : '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M3 8l6-5m12 5-6-5M3 16l6 5m12-5-6 5"/>';
  if (panel.id === "mapa" && map) {
    window.setTimeout(() => map.invalidateSize(), 150);
  }
}

document.querySelectorAll(".expand-button").forEach((button) => {
  button.addEventListener("click", () => {
    const panel = document.getElementById(button.dataset.expand);
    if (panel) setMediaExpanded(panel, !panel.classList.contains("is-expanded"));
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const expandedPanel = document.querySelector(".media-panel.is-expanded");
  if (expandedPanel) setMediaExpanded(expandedPanel, false);
});

document.querySelectorAll('.main-nav a[href^="#"]').forEach((link) => {
  link.addEventListener("click", () => {
    document.querySelector(".nav-item.active")?.classList.remove("active");
    link.classList.add("active");
  });
});

initializeMap();
updateLocationLabels();
loadWeather();
loadSenamhiAlerts();
renderSatelliteImage();
window.setInterval(loadWeather, UPDATE_INTERVAL);
window.setInterval(refreshRadar, UPDATE_INTERVAL);
window.setInterval(loadSenamhiAlerts, UPDATE_INTERVAL);
window.setInterval(updateClock, 1000);
window.setInterval(() => {
  setSatelliteProduct(selectedSatelliteProduct);
}, UPDATE_INTERVAL);
window.addEventListener("resize", renderSatelliteImage);
