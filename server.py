#!/usr/bin/env python3
"""Serve Clima Sur and proxy the official SENAMHI regional advisory list."""

from datetime import date, datetime, timedelta, timezone
from html.parser import HTMLParser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Lock
from urllib.error import URLError
from urllib.parse import parse_qs, urlencode, urljoin, urlsplit
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo
import json
import os
import re


ROOT = Path(__file__).resolve().parent
SENAMHI_BASE_URL = "https://www.senamhi.gob.pe/?p=aviso-meteorologico"
SENAMHI_DEPARTMENTS = {
    "amazonas", "ancash", "apurimac", "arequipa", "ayacucho", "cajamarca",
    "callao", "cusco", "huancavelica", "huanuco", "ica", "junin",
    "la-libertad", "lambayeque", "lima", "loreto", "madre-de-dios",
    "moquegua", "pasco", "piura", "puno", "san-martin", "tacna", "tumbes",
    "ucayali",
}
SENAMHI_MAP_URL = "https://www.senamhi.gob.pe/mapas/mapa-avisos-meteorologicos/index.php"
NOAA_DIRECTORY = "https://cdn.star.nesdis.noaa.gov/GOES19/ABI/SECTOR/NSA/13/"
CACHE_SECONDS = 600
DATE_PATTERN = re.compile(r"\b\d{4}-\d{2}-\d{2}\b")
NUMBER_PATTERN = re.compile(r"\b(\d+)\s*\(vigente\)", re.IGNORECASE)
SEVERITY_PATTERN = re.compile(r"\b(ROJO|NARANJA|AMARILLO)\b", re.IGNORECASE)
NOAA_FRAME_PATTERN = re.compile(r'href="(\d{11}_GOES19-ABI-nsa-13-900x540\.jpg)"')
NOAA_LOOP_FRAME_COUNT = 8


class BulletinTableParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows = []
        self.row = None
        self.cell = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "tr":
            self.row = []
        elif tag == "td" and self.row is not None:
            self.cell = {"parts": [], "href": None}
        elif tag == "a" and self.cell is not None and self.cell["href"] is None:
            self.cell["href"] = attrs.get("href")

    def handle_data(self, data):
        if self.cell is not None:
            self.cell["parts"].append(data)

    def handle_endtag(self, tag):
        if tag == "td" and self.row is not None and self.cell is not None:
            text = " ".join(" ".join(self.cell["parts"]).split())
            self.row.append({"text": text, "href": self.cell["href"]})
            self.cell = None
        elif tag == "tr" and self.row is not None:
            self.rows.append(self.row)
            self.row = None


class AffectedDepartmentsParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.departments = set()
        self.capture_heading = False
        self.heading_parts = []
        self.next_paragraph_is_departments = False
        self.in_department_list = False
        self.found_department_heading = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "span":
            self.capture_heading = True
            self.heading_parts = []
        elif tag == "p" and self.next_paragraph_is_departments:
            self.in_department_list = True
            self.next_paragraph_is_departments = False
        elif tag == "a" and self.in_department_list:
            department = attrs.get("id")
            if department:
                self.departments.add(department.lower())

    def handle_data(self, data):
        if self.capture_heading:
            self.heading_parts.append(data)

    def handle_endtag(self, tag):
        if tag == "span" and self.capture_heading:
            heading = " ".join(" ".join(self.heading_parts).split()).upper()
            self.next_paragraph_is_departments = (
                "DEPARTAMENTOS DE POSIBLE AFECTACIÓN:" in heading
            )
            self.found_department_heading |= self.next_paragraph_is_departments
            self.capture_heading = False
        elif tag == "p" and self.in_department_list:
            self.in_department_list = False


def get_affected_departments(number, year):
    map_url = f"{SENAMHI_MAP_URL}?{urlencode({'av': number, 'nl': 4, 'mp': 3, 'fc': year})}"
    request = Request(
        map_url,
        headers={"User-Agent": "ClimaSur/1.0 (public weather dashboard)"},
    )
    with urlopen(request, timeout=25) as response:
        if response.status != 200:
            raise URLError(f"El mapa de SENAMHI respondió HTTP {response.status}")
        page = response.read().decode("utf-8", errors="replace")

    parser = AffectedDepartmentsParser()
    parser.feed(page)
    if not parser.found_department_heading:
        raise ValueError(
            f"No se encontró la sección de departamentos del aviso {number}"
        )
    return parser.departments


def get_active_alerts(department="arequipa"):
    if department not in SENAMHI_DEPARTMENTS:
        raise ValueError(f"Departamento SENAMHI no válido: {department}")
    source_url = f"{SENAMHI_BASE_URL}&dp={department}"
    request = Request(
        source_url,
        headers={"User-Agent": "ClimaSur/1.0 (public weather dashboard)"},
    )
    with urlopen(request, timeout=25) as response:
        if response.status != 200:
            raise URLError(f"SENAMHI respondió HTTP {response.status}")
        page = response.read().decode("utf-8", errors="replace")

    parser = BulletinTableParser()
    parser.feed(page)
    if not parser.rows:
        raise ValueError("No se encontró la tabla de avisos en la página de SENAMHI")

    today = datetime.now(ZoneInfo("America/Lima")).date()
    alerts = []
    warnings = []
    for row in parser.rows:
        cells = [cell["text"] for cell in row]
        row_text = " | ".join(cells)
        if not re.search(r"\(vigente\)", row_text, re.IGNORECASE):
            continue

        number_match = NUMBER_PATTERN.search(row_text)
        severity_match = SEVERITY_PATTERN.search(row_text)
        dates = DATE_PATTERN.findall(row_text)
        link = next(
            (
                cell["href"]
                for cell in row
                if cell["href"] and "aviso-meteorologico-vigente" in cell["href"]
            ),
            None,
        )
        if not number_match or not severity_match or len(dates) < 3 or not link:
            continue

        start_date = date.fromisoformat(dates[-2])
        end_date = date.fromisoformat(dates[-1])
        if start_date > today or end_date < today:
            continue
        number = number_match.group(1)
        try:
            departments = get_affected_departments(number, start_date.year)
        except (URLError, TimeoutError, UnicodeDecodeError, ValueError) as error:
            warnings.append(
                f"Aviso {number}: no fue posible verificar su cobertura departamental."
            )
            continue
        if not departments:
            warnings.append(
                f"Aviso {number}: SENAMHI no publicó departamentos afectados en su mapa."
            )
            continue
        if department not in departments:
            continue
        alerts.append(
            {
                "number": number,
                "title": cells[0],
                "severity": severity_match.group(1).upper(),
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "url": urljoin(source_url, link),
            }
        )
    alerts.sort(key=lambda alert: (alert["end_date"], int(alert["number"])))
    return {
        "alerts": alerts,
        "updated_at": datetime.now(ZoneInfo("America/Lima")).isoformat(),
        "source_url": source_url,
        "verification": "partial" if warnings else "complete",
        "warnings": warnings,
    }


def get_goes_infrared_loop():
    request = Request(
        NOAA_DIRECTORY,
        headers={"User-Agent": "ClimaSur/1.0 (public weather dashboard)"},
    )
    with urlopen(request, timeout=25) as response:
        if response.status != 200:
            raise URLError(f"NOAA respondió HTTP {response.status}")
        page = response.read().decode("utf-8", errors="replace")

    filenames = sorted(NOAA_FRAME_PATTERN.findall(page))
    latest_frames = filenames[-NOAA_LOOP_FRAME_COUNT:]
    if len(latest_frames) < 2:
        raise ValueError("NOAA no publicó suficientes imágenes infrarrojas")
    frames = []
    for filename in latest_frames:
        year, day_of_year, hour, minute = (
            int(filename[:4]),
            int(filename[4:7]),
            int(filename[7:9]),
            int(filename[9:11]),
        )
        timestamp = datetime(year, 1, 1, tzinfo=timezone.utc) + timedelta(
            days=day_of_year - 1,
            hours=hour,
            minutes=minute,
        )
        frames.append(
            {
                "url": urljoin(NOAA_DIRECTORY, filename),
                "timestamp": timestamp.isoformat().replace("+00:00", "Z"),
            }
        )
    return {
        "frames": frames,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "source_url": NOAA_DIRECTORY,
    }


class ClimaSurHandler(SimpleHTTPRequestHandler):
    cache_lock = Lock()
    cached_data = None
    cached_at = 0.0

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        parsed_url = urlsplit(self.path)
        if parsed_url.path == "/api/goes/infrared-loop":
            try:
                data = get_goes_infrared_loop()
            except (URLError, TimeoutError, UnicodeDecodeError, ValueError) as error:
                self.log_error("GOES-19 infrared loop request failed: %s", error)
                self.send_json(
                    {"error": "No fue posible consultar las imágenes infrarrojas de GOES-19."},
                    status=502,
                )
                return
            self.send_json(data, cache_control="public, max-age=300")
            return
        if parsed_url.path != "/api/senamhi/alerts":
            return super().do_GET()

        try:
            department = parse_qs(parsed_url.query).get("department", ["arequipa"])[0]
            if department not in SENAMHI_DEPARTMENTS:
                self.send_json(
                    {"error": "El departamento solicitado no está disponible."},
                    status=400,
                )
                return
            with self.cache_lock:
                now = datetime.now().timestamp()
                if (
                    self.cached_data is None
                    or self.cached_data.get("department") != department
                    or now - self.cached_at >= CACHE_SECONDS
                ):
                    self.cached_data = get_active_alerts(department)
                    self.cached_data["department"] = department
                    self.cached_at = now
                data = self.cached_data
        except (URLError, TimeoutError, UnicodeDecodeError, ValueError) as error:
            self.log_error("SENAMHI alert request failed: %s", error)
            data = {"error": "No fue posible consultar los avisos oficiales de SENAMHI."}
            self.send_json(data, status=502)
            return

        self.send_json(data)

    def send_json(self, data, status=200, cache_control="no-store"):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", cache_control)
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    server = ThreadingHTTPServer(("127.0.0.1", port), ClimaSurHandler)
    print(f"Clima Sur disponible en http://localhost:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
