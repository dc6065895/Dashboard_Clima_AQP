#!/usr/bin/env python3
"""Serve Clima Sur and proxy the official SENAMHI regional advisory list."""

from datetime import date, datetime
from html.parser import HTMLParser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Lock
from urllib.error import URLError
from urllib.parse import urljoin
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo
import json
import os
import re


ROOT = Path(__file__).resolve().parent
SENAMHI_URL = "https://www.senamhi.gob.pe/?p=aviso-meteorologico&dp=arequipa"
SENAMHI_MAP_URL = "https://www.senamhi.gob.pe/mapas/mapa-avisos-meteorologicos/index.php"
CACHE_SECONDS = 600
DATE_PATTERN = re.compile(r"\b\d{4}-\d{2}-\d{2}\b")
NUMBER_PATTERN = re.compile(r"\b(\d+)\s*\(vigente\)", re.IGNORECASE)
SEVERITY_PATTERN = re.compile(r"\b(ROJO|NARANJA|AMARILLO)\b", re.IGNORECASE)


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
            self.capture_heading = False
        elif tag == "p" and self.in_department_list:
            self.in_department_list = False


def alert_affects_arequipa(number, year):
    map_url = (
        f"{SENAMHI_MAP_URL}?av={number}&nl=4&mp=3&fc={year}"
    )
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
    if not parser.departments:
        raise ValueError(
            f"No se encontraron departamentos afectados en el aviso {number}"
        )
    return "arequipa" in parser.departments


def get_active_alerts():
    request = Request(
        SENAMHI_URL,
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
        if end_date < today:
            continue
        if not alert_affects_arequipa(number_match.group(1), start_date.year):
            continue
        alerts.append(
            {
                "number": number_match.group(1),
                "title": cells[0],
                "severity": severity_match.group(1).upper(),
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "url": urljoin(SENAMHI_URL, link),
            }
        )
    alerts.sort(key=lambda alert: (alert["end_date"], int(alert["number"])))
    return {
        "alerts": alerts,
        "updated_at": datetime.now(ZoneInfo("America/Lima")).isoformat(),
        "source_url": SENAMHI_URL,
    }


class ClimaSurHandler(SimpleHTTPRequestHandler):
    cache_lock = Lock()
    cached_data = None
    cached_at = 0.0

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        if self.path.split("?", 1)[0] != "/api/senamhi/alerts":
            return super().do_GET()

        try:
            with self.cache_lock:
                now = datetime.now().timestamp()
                if self.cached_data is None or now - self.cached_at >= CACHE_SECONDS:
                    self.cached_data = get_active_alerts()
                    self.cached_at = now
                data = self.cached_data
        except (URLError, TimeoutError, UnicodeDecodeError, ValueError) as error:
            self.log_error("SENAMHI alert request failed: %s", error)
            data = {"error": "No fue posible consultar los avisos oficiales de SENAMHI."}
            self.send_json(data, status=502)
            return

        self.send_json(data)

    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
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
