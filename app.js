"use strict";

const LOCATIONS = {
  "cerro-colorado": {
    name: "Cerro Colorado",
    subtitle: "Cerro Colorado, Arequipa, Arequipa",
    province: "Arequipa",
    coordinates: [-16.379898, -71.557855],
    elevation: 2399,
    regionId: "arequipa",
  },
  periferia: {
    name: "Arequipa periferia",
    subtitle: "Arequipa periferia (alta montaña), Arequipa",
    province: "Arequipa",
    coordinates: [-16.48, -71.52],
    elevation: 3400,
    regionId: "arequipa",
  },
  yanahuara: {
    name: "Yanahuara",
    subtitle: "Yanahuara, Arequipa, Arequipa",
    province: "Arequipa",
    coordinates: [-16.389, -71.537],
    elevation: 2390,
    regionId: "arequipa",
  },
  cayma: {
    name: "Cayma",
    subtitle: "Cayma, Arequipa, Arequipa",
    province: "Arequipa",
    coordinates: [-16.35, -71.548],
    elevation: 2450,
    regionId: "arequipa",
  },
};

const REGIONS = [
  { id: "amazonas", name: "Amazonas", capital: "Chachapoyas", department: "amazonas" },
  { id: "ancash", name: "Áncash", capital: "Huaraz", department: "ancash" },
  { id: "apurimac", name: "Apurímac", capital: "Abancay", department: "apurimac" },
  { id: "arequipa", name: "Arequipa", capital: "Arequipa", department: "arequipa" },
  { id: "ayacucho", name: "Ayacucho", capital: "Ayacucho", department: "ayacucho" },
  { id: "cajamarca", name: "Cajamarca", capital: "Cajamarca", department: "cajamarca" },
  { id: "callao", name: "Callao", capital: "Callao", department: "callao" },
  { id: "cusco", name: "Cusco", capital: "Cusco", department: "cusco" },
  { id: "huancavelica", name: "Huancavelica", capital: "Huancavelica", department: "huancavelica" },
  { id: "huanuco", name: "Huánuco", capital: "Huánuco", department: "huanuco" },
  { id: "ica", name: "Ica", capital: "Ica", department: "ica" },
  { id: "junin", name: "Junín", capital: "Huancayo", department: "junin" },
  { id: "la-libertad", name: "La Libertad", capital: "Trujillo", department: "la-libertad" },
  { id: "lambayeque", name: "Lambayeque", capital: "Chiclayo", department: "lambayeque" },
  { id: "lima-metropolitana", name: "Lima Metropolitana", capital: "Lima", department: "lima" },
  { id: "lima-provincias", name: "Lima Provincias", capital: "Huacho", department: "lima" },
  { id: "loreto", name: "Loreto", capital: "Iquitos", department: "loreto" },
  { id: "madre-de-dios", name: "Madre de Dios", capital: "Puerto Maldonado", department: "madre-de-dios" },
  { id: "moquegua", name: "Moquegua", capital: "Moquegua", department: "moquegua" },
  { id: "pasco", name: "Pasco", capital: "Cerro de Pasco", department: "pasco" },
  { id: "piura", name: "Piura", capital: "Piura", department: "piura" },
  { id: "puno", name: "Puno", capital: "Puno", department: "puno" },
  { id: "san-martin", name: "San Martín", capital: "Moyobamba", department: "san-martin" },
  { id: "tacna", name: "Tacna", capital: "Tacna", department: "tacna" },
  { id: "tumbes", name: "Tumbes", capital: "Tumbes", department: "tumbes" },
  { id: "ucayali", name: "Ucayali", capital: "Pucallpa", department: "ucayali" },
];

const UPDATE_INTERVAL = 15 * 60 * 1000;
const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const NOAA_PRODUCTS = {
  geocolor: {
    label: "GeoColor",
    path: "GEOCOLOR",
  },
  infrared: {
    label: "Infrarrojo",
    path: "13",
    loop: true,
  },
  airmass: {
    label: "AirMass",
    path: "AirMass",
  },
  sandwich: {
    label: "Sandwich",
    path: "Sandwich",
  },
  cira: {
    label: "CIRA",
    external: true,
  },
};
const CIRA_VIEWER_URL =
  "https://slider.cira.colostate.edu/?sat=goes-19&sec=full_disk&x=11214&y=13900.6669921875&z=4&angle=0&im=12&ts=1&st=0&et=0&speed=130&motion=loop&maps%5Bborders%5D=white&p%5B0%5D=geocolor&opacity%5B0%5D=1&pause=0&slider=-1&hide_controls=0&mouse_draw=0&follow_feature=0&follow_hide=0&s=rammb-slider&draw_color=FFD700&draw_width=6";
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
  regionSelect: document.querySelector("#region-select"),
  locationSearch: document.querySelector("#location-search"),
  locationOptions: document.querySelector("#location-options"),
  locationSearchStatus: document.querySelector("#location-search-status"),
  senamhiRegion: document.querySelector("#senamhi-region"),
  senamhiSourceLink: document.querySelector("#senamhi-source-link"),
};

let selectedId = "cerro-colorado";
let selectedLocation = LOCATIONS[selectedId];
let selectedRegionId = selectedLocation.regionId;
let geocodingMatches = new Map();
let locationSearchTimer;
let locationSearchRequestId = 0;
let weatherRequestId = 0;
let senamhiRequestId = 0;
let selectedSatelliteProduct = "geocolor";
let satelliteZoom = 2.5;
let satelliteFrames = [];
let satelliteFrameElements = [];
let satelliteFrameIndex = -1;
let satelliteLoopTimer;
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

function normalizePlace(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function getRegion(regionId = selectedRegionId) {
  return REGIONS.find((region) => region.id === regionId) || REGIONS[3];
}

function geocoderMatchesRegion(result, regionId) {
  const department = normalizePlace(result.admin1).replace(/^departamento de /, "");
  const province = normalizePlace(result.admin2).replace(/^provincia de /, "");
  if (regionId === "lima-metropolitana") {
    return (
      (department.includes("lima") && province === "lima") ||
      (department === "provincia de lima" &&
        normalizePlace(result.name) === "lima")
    );
  }
  if (regionId === "lima-provincias") {
    return department.includes("lima") && province !== "lima";
  }
  if (regionId === "callao") {
    return department.includes("callao") || province.includes("callao");
  }
  return department.includes(normalizePlace(regionId).replace(/-/g, " "));
}

function makeGeocodedLocation(result, region) {
  const name = result.name;
  const province = result.admin2?.replace(/^Provincia de /i, "");
  const locationParts = [...new Set([name, province, region.name].filter(Boolean))];
  const subtitle = [...locationParts, "Perú"].join(", ");
  const pickerLabel = locationParts.join(" · ");
  return {
    name,
    subtitle,
    coordinates: [result.latitude, result.longitude],
    elevation: Number.isFinite(result.elevation) ? result.elevation : null,
    regionId: region.id,
    department: region.department,
    province: province || null,
    pickerLabel,
    geocoderId: result.id,
  };
}

function markerPopupContent() {
  const content = document.createElement("div");
  const title = document.createElement("strong");
  title.textContent = selectedLocation.name;
  const elevation = document.createElement("div");
  elevation.textContent = Number.isFinite(selectedLocation.elevation)
    ? `${selectedLocation.elevation.toLocaleString("es-PE")} m s. n. m.`
    : "Elevación no disponible";
  content.append(title, elevation);
  return content;
}

function updateSenamhiRegion() {
  const region = getRegion();
  setText(elements.senamhiRegion, region.name);
  if (elements.senamhiSourceLink) {
    elements.senamhiSourceLink.href =
      `https://www.senamhi.gob.pe/?p=aviso-meteorologico&dp=${region.department}`;
    elements.senamhiSourceLink.setAttribute(
      "aria-label",
      `Abrir avisos oficiales de SENAMHI para ${region.name}`,
    );
  }
}

function updateLocationLabels() {
  setText(elements.breadcrumb, selectedLocation.name);
  const elevationText = Number.isFinite(selectedLocation.elevation)
    ? `${selectedLocation.elevation.toLocaleString("es-PE")} m s. n. m.`
    : "elevación no disponible";
  setText(
    elements.locationSubtitle,
    `${selectedLocation.subtitle} · ${elevationText}`,
  );
  setText(elements.mapName, selectedLocation.name.toLocaleUpperCase("es-PE"));
  setText(
    elements.satelliteName,
    [selectedLocation.name, selectedLocation.province]
      .filter(Boolean)
      .join(" · ")
      .toLocaleUpperCase("es-PE"),
  );
  setText(
    elements.satelliteCoordinates,
    formatCoordinates(selectedLocation.coordinates),
  );
  if (elements.regionSelect) elements.regionSelect.value = selectedRegionId;
  if (elements.locationSearch) {
    elements.locationSearch.value =
      selectedLocation.pickerLabel || `${selectedLocation.name} · ${getRegion().name}`;
  }
  document.querySelectorAll(".station").forEach((button) => {
    button.classList.toggle("active", button.dataset.location === selectedId);
  });
  updateSenamhiRegion();
  renderSatelliteImage();
}

function setSelectedLocation(location, regionId, id) {
  selectedLocation = location;
  selectedRegionId = regionId;
  selectedId = id;
  satelliteZoom = 2.5;
  updateLocationLabels();
  loadWeather();
  loadSenamhiAlerts();
}

async function searchGeocodedPlaces(query, regionId) {
  const requestId = ++locationSearchRequestId;
  const region = getRegion(regionId);
  const params = new URLSearchParams({
    name: query,
    count: "30",
    language: "es",
    format: "json",
    countryCode: "PE",
  });
  try {
    const response = await fetch(`${GEOCODING_URL}?${params}`, {
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Open-Meteo Geocoding respondió ${response.status}`);
    const data = await response.json();
    if (requestId !== locationSearchRequestId) return [];
    const results = (data.results || [])
      .filter(
        (result) =>
          result.country_code === "PE" &&
          geocoderMatchesRegion(result, regionId) &&
          /^(PPLA|PPL)/.test(result.feature_code || ""),
      )
      .sort((left, right) => {
        const queryName = normalizePlace(query);
        const leftExact =
          normalizePlace(left.name) === queryName ||
          normalizePlace(left.admin3) === queryName;
        const rightExact =
          normalizePlace(right.name) === queryName ||
          normalizePlace(right.admin3) === queryName;
        return Number(rightExact) - Number(leftExact);
      });
    geocodingMatches.clear();
    elements.locationOptions.replaceChildren();
    results.forEach((result) => {
      const location = makeGeocodedLocation(result, region);
      const option = document.createElement("option");
      option.value = location.pickerLabel;
      elements.locationOptions.append(option);
      geocodingMatches.set(location.pickerLabel, { location, result });
    });
    setText(
      elements.locationSearchStatus,
      results.length
        ? `${results.length} ubicación${results.length === 1 ? "" : "es"} en ${region.name}; selecciona una opción.`
        : `No se encontraron distritos o localidades en ${region.name}.`,
    );
    return results;
  } catch (error) {
    if (requestId !== locationSearchRequestId) return [];
    console.error("No fue posible buscar ubicaciones:", error);
    setText(elements.locationSearchStatus, "No se pudo consultar el buscador de ubicaciones.");
    return [];
  }
}

async function selectRegionDefault(regionId) {
  const region = getRegion(regionId);
  setText(elements.locationSearchStatus, `Buscando ${region.capital}…`);
  const results = await searchGeocodedPlaces(region.capital, regionId);
  if (!results.length) {
    elements.regionSelect.value = selectedRegionId;
    return;
  }
  const capital = normalizePlace(region.capital);
  const match =
    results.find(({ name }) => normalizePlace(name) === capital) || results[0];
  const location = makeGeocodedLocation(match, region);
  setSelectedLocation(location, region.id, `geonames-${match.id}`);
  setText(elements.locationSearchStatus, `Ubicación predeterminada: ${location.name}, ${region.name}.`);
}

function handleLocationSearch() {
  const value = elements.locationSearch.value.trim();
  const match = geocodingMatches.get(value);
  if (match) {
    window.clearTimeout(locationSearchTimer);
    const region = getRegion(selectedRegionId);
    const location = makeGeocodedLocation(match.result, region);
    setSelectedLocation(location, region.id, `geonames-${match.result.id}`);
    setText(elements.locationSearchStatus, `Ubicación seleccionada: ${location.name}, ${region.name}.`);
    return;
  }
  setText(elements.locationSearchStatus, "Selecciona un resultado de la lista para cambiar de ubicación.");
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

function setSatelliteProduct(productId) {
  const product = NOAA_PRODUCTS[productId];
  if (!product) return;
  selectedSatelliteProduct = productId;
  document
    .querySelector(".satellite-image")
    .classList.toggle("is-cira-view", Boolean(product.external));
  renderSatelliteImage();
  setText(document.querySelector("#satellite-product-title"), product.label);
  if (!product.external) {
    setText(document.querySelector("#satellite-product-overlay"), `GOES-19 · ${product.label.toLocaleUpperCase("es-PE")}`);
  }
  document.querySelector("#satellite-cira-link").href = CIRA_VIEWER_URL;
  if (product.loop) loadInfraredLoop();
}

async function loadInfraredLoop() {
  try {
    const response = await fetch("/api/goes/infrared-loop", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `NOAA respondió ${response.status}`);
    }
    if (!Array.isArray(data.frames) || data.frames.length < 2) {
      throw new Error("NOAA no publicó suficientes imágenes para formar el bucle");
    }
    const frames = [...data.frames].sort((left, right) =>
      left.timestamp.localeCompare(right.timestamp),
    );
    const frameElements = frames.map((frame) => {
      const image = document.createElement("img");
      image.alt = "";
      image.draggable = false;
      image.dataset.timestamp = frame.timestamp;
      image.src = frame.url;
      return image;
    });
    await Promise.all(
      frameElements.map(
        (image) =>
          new Promise((resolve) => {
            if (image.complete) {
              resolve();
              return;
            }
            image.addEventListener("load", resolve, { once: true });
            image.addEventListener("error", resolve, { once: true });
          }),
      ),
    );
    satelliteFrames = frames.filter(
      (_, index) => frameElements[index].naturalWidth > 0,
    );
    satelliteFrameElements = frameElements.filter((image) => image.naturalWidth > 0);
    if (satelliteFrames.length < 2) {
      throw new Error("No se pudieron cargar suficientes imágenes infrarrojas de NOAA");
    }
    document
      .querySelector("#satellite-loop-layer")
      .replaceChildren(...satelliteFrameElements);
    satelliteFrameIndex = -1;
    renderSatelliteImage();
    if (satelliteLoopTimer) window.clearInterval(satelliteLoopTimer);
    satelliteLoopTimer = window.setInterval(showNextSatelliteFrame, 900);
  } catch (error) {
    console.error("No fue posible cargar el bucle infrarrojo de GOES-19:", error);
    if (selectedSatelliteProduct === "infrared") {
      setText(
        document.querySelector("#satellite-product-overlay"),
        "GOES-19 · BUCLE NO DISPONIBLE",
      );
    }
  }
}

function showNextSatelliteFrame() {
  if (
    selectedSatelliteProduct !== "infrared" ||
    satelliteFrameElements.length < 2
  ) {
    return;
  }
  satelliteFrameIndex = (satelliteFrameIndex + 1) % satelliteFrameElements.length;
  satelliteFrameElements.forEach((image, index) => {
    image.classList.toggle("is-visible", index === satelliteFrameIndex);
  });
  const timestamp = satelliteFrames[satelliteFrameIndex].timestamp;
  setText(
    document.querySelector("#satellite-frame-time"),
    new Intl.DateTimeFormat("es-PE", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Lima",
    }).format(new Date(timestamp)),
  );
}

function renderSatelliteImage() {
  const product = NOAA_PRODUCTS[selectedSatelliteProduct];
  const image = document.querySelector(".satellite-image");
  if (!image) return;
  const loopLayer = document.querySelector("#satellite-loop-layer");
  const marker = document.querySelector(".satellite-crosshair");
  const ciraView = document.querySelector("#satellite-cira-view");
  if (product.external) {
    image.style.backgroundImage = "linear-gradient(145deg, #172834, #263b49 52%, #182731)";
    image.style.backgroundSize = "cover";
    image.style.backgroundPosition = "center";
    ciraView.hidden = false;
    image.setAttribute(
      "aria-label",
      "Vista CIRA GOES-19 interactiva; abrir el visor externo para explorar la imagen satelital",
    );
    loopLayer.hidden = true;
    return;
  }
  ciraView.hidden = true;
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
  const isLoop = product.loop && satelliteFrameElements.length > 0;
  const resolution = satelliteZoom > 1 ? "3600x2160" : "1800x1080";
  const imageUrl = `https://cdn.star.nesdis.noaa.gov/GOES19/ABI/SECTOR/NSA/${product.path}/${resolution}.jpg?t=${Date.now()}`;
  image.style.backgroundColor = "";
  image.style.backgroundImage = isLoop
    ? "linear-gradient(0deg, #0e19158a, transparent 40%)"
    : `linear-gradient(0deg, #0e19158a, transparent 40%), url("${imageUrl}")`;
  image.style.backgroundSize = `cover, ${imageWidth}px ${imageHeight}px`;
  image.style.backgroundPosition = `center, ${-horizontal.offset}px ${-vertical.offset}px`;
  if (loopLayer) loopLayer.hidden = !isLoop;
  if (isLoop) {
    satelliteFrameElements.forEach((frame) => {
      frame.style.width = `${imageWidth}px`;
      frame.style.height = `${imageHeight}px`;
      frame.style.left = `${-horizontal.offset}px`;
      frame.style.top = `${-vertical.offset}px`;
    });
  }
  marker.style.left = `${(horizontal.marker / bounds.width) * 100}%`;
  marker.style.top = `${(vertical.marker / bounds.height) * 100}%`;
  image.setAttribute(
    "aria-label",
    `Imagen ${product.label} de GOES-19 sobre Sudamérica, centrada en ${selectedLocation.name}; zoom ${satelliteZoom.toFixed(1)}`,
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
  elements.senamhiStatus.classList.remove("is-error", "is-active", "is-partial");
  if (data.error) {
    elements.senamhiStatus.classList.add("is-error");
    setSenamhiStatus("No se pudo confirmar el estado de los avisos oficiales.");
    return;
  }
  const alerts = Array.isArray(data.alerts) ? data.alerts : [];
  const warnings = Array.isArray(data.warnings) ? data.warnings : [];
  const region = getRegion().name;
  const checkedAt = new Date(data.updated_at).toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Lima",
  });
  const coverageMessage =
    data.verification === "partial"
      ? ` · ${warnings.length} aviso${warnings.length === 1 ? "" : "s"} sin cobertura verificable`
      : "";
  const provinceScope = selectedLocation.province
    ? ` · Provincia seleccionada: ${selectedLocation.province}; SENAMHI verifica el alcance por departamento`
    : " · SENAMHI verifica el alcance por departamento, no por provincia";
  setSenamhiStatus(
    alerts.length
      ? `${alerts.length} aviso${alerts.length === 1 ? "" : "s"} vigente${alerts.length === 1 ? "" : "s"} verificado${alerts.length === 1 ? "" : "s"} para ${region} · ${checkedAt}${provinceScope}${coverageMessage}`
      : `Sin avisos vigentes verificados para ${region} · ${checkedAt}${provinceScope}${coverageMessage}`,
  );
  elements.senamhiStatus.classList.toggle("is-active", alerts.length > 0);
  elements.senamhiStatus.classList.toggle(
    "is-partial",
    data.verification === "partial",
  );
  alerts.forEach((alert) => {
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
  const requestId = ++senamhiRequestId;
  try {
    const params = new URLSearchParams({ department: getRegion().department });
    const response = await fetch(`/api/senamhi/alerts?${params}`, {
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `Servidor respondió ${response.status}`);
    }
    if (requestId !== senamhiRequestId) return;
    renderSenamhiAlerts(data);
  } catch (error) {
    if (requestId !== senamhiRequestId) return;
    console.error("No fue posible consultar los avisos de SENAMHI:", error);
    renderSenamhiAlerts({ error: true, alerts: [] });
  }
}

async function loadWeather() {
  const requestId = ++weatherRequestId;
  const refreshButton = document.querySelector("#refresh-button");
  refreshButton.classList.add("is-loading");
  try {
    const response = await fetch(buildForecastUrl(selectedLocation), { cache: "no-store" });
    if (!response.ok) throw new Error(`Open-Meteo respondió ${response.status}`);
    const data = await response.json();
    if (!data.current || !data.hourly?.time?.length || !data.daily?.time?.length) {
      throw new Error("La respuesta meteorológica está incompleta");
    }
    if (requestId !== weatherRequestId) return;
    const currentIndex = getHourIndex(data.hourly.time, data.current.time);
    renderCurrent(data, currentIndex);
    renderHourly(data, currentIndex);
    renderDaily(data);
    nextUpdateAt = Date.now() + UPDATE_INTERVAL;
    setText(elements.nextUpdate, "en 15 min");
  } catch (error) {
    if (requestId !== weatherRequestId) return;
    console.error("No fue posible actualizar el pronóstico:", error);
    setText(elements.description, "Datos no disponibles");
    elements.alert.classList.add("warning");
    elements.alert.innerHTML =
      '<span class="alert-ok-icon">!</span><span>No se pudieron cargar los datos. Verifica tu conexión e intenta actualizar.</span>';
  } finally {
    if (requestId === weatherRequestId) refreshButton.classList.remove("is-loading");
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
    setSelectedLocation(LOCATIONS[nextId], LOCATIONS[nextId].regionId, nextId);
    setText(
      elements.locationSearchStatus,
      `Ubicación seleccionada: ${LOCATIONS[nextId].name}, Arequipa.`,
    );
  });
});

elements.regionSelect.addEventListener("change", (event) => {
  selectRegionDefault(event.currentTarget.value);
});

elements.locationSearch.addEventListener("input", () => {
  const query = elements.locationSearch.value.trim();
  window.clearTimeout(locationSearchTimer);
  if (query.length < 2) {
    geocodingMatches.clear();
    elements.locationOptions.replaceChildren();
    setText(elements.locationSearchStatus, "Escribe al menos dos caracteres para buscar.");
    return;
  }
  locationSearchTimer = window.setTimeout(
    () => searchGeocodedPlaces(query, selectedRegionId),
    350,
  );
});

elements.locationSearch.addEventListener("change", handleLocationSearch);

document.querySelector("#refresh-button").addEventListener("click", () => {
  loadWeather();
  loadSenamhiAlerts();
  if (selectedSatelliteProduct === "infrared") loadInfraredLoop();
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

updateLocationLabels();
loadWeather();
loadSenamhiAlerts();
renderSatelliteImage();
window.setInterval(loadWeather, UPDATE_INTERVAL);
window.setInterval(loadSenamhiAlerts, UPDATE_INTERVAL);
window.setInterval(updateClock, 1000);
window.setInterval(() => {
  if (selectedSatelliteProduct === "infrared") {
    loadInfraredLoop();
  } else {
    renderSatelliteImage();
  }
}, UPDATE_INTERVAL);
window.addEventListener("resize", renderSatelliteImage);
