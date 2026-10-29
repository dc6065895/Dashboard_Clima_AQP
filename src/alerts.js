export const SENAMHI_URL =
  "https://www.senamhi.gob.pe/?p=aviso-meteorologico&dp=arequipa";
export const SENAMHI_MAP_URL =
  "https://www.senamhi.gob.pe/mapas/mapa-avisos-meteorologicos/index.php";

function decodeEntities(value) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&oacute;/gi, "ó")
    .replace(/&aacute;/gi, "á")
    .replace(/&eacute;/gi, "é")
    .replace(/&iacute;/gi, "í")
    .replace(/&uacute;/gi, "ú")
    .replace(/&ntilde;/gi, "ñ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    );
}

function textFromHtml(value) {
  return decodeEntities(value.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function attributesFromTag(tag) {
  return Object.fromEntries(
    [...tag.matchAll(/([a-z][\w-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)].map(
      (match) => [match[1].toLowerCase(), decodeEntities(match[2] ?? match[3] ?? "")],
    ),
  );
}

export function parseAffectedDepartments(html) {
  const normalized = decodeEntities(html).normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const heading = normalized.match(/DEPARTAMENTOS DE POSIBLE AFECTACION\s*:/i);
  if (!heading) throw new Error("SENAMHI map has no affected-departments heading");
  const paragraphStart = normalized.indexOf("<p", heading.index);
  const paragraphEnd = normalized.indexOf("</p>", paragraphStart);
  if (paragraphStart < 0 || paragraphEnd < 0) {
    throw new Error("SENAMHI map has no affected-departments list");
  }
  const paragraph = normalized.slice(paragraphStart, paragraphEnd);
  const departments = [...paragraph.matchAll(/<a\b[^>]*>/gi)]
    .map((match) => attributesFromTag(match[0]).id?.toLowerCase())
    .filter(Boolean);
  if (!departments.length) throw new Error("SENAMHI map has no department entries");
  return departments;
}

export function parseSENAMHIBulletins(html) {
  const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
  if (!rows.length) throw new Error("SENAMHI bulletin table was not found");
  return rows.flatMap((rowMatch) => {
    const cells = [...rowMatch[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(
      (match) => {
        const anchor = match[1].match(/<a\b[^>]*>/i);
        const href = anchor ? attributesFromTag(anchor[0]).href : null;
        return { text: textFromHtml(match[1]), href };
      },
    );
    const rowText = cells.map((cell) => cell.text).join(" | ");
    if (!/\(vigente\)/i.test(rowText)) return [];
    const number = rowText.match(/\b(\d+)\s*\(vigente\)/i)?.[1];
    const severity = rowText.match(/\b(ROJO|NARANJA|AMARILLO)\b/i)?.[1];
    const dates = rowText.match(/\b\d{4}-\d{2}-\d{2}\b/g) ?? [];
    const link = cells.find((cell) =>
      cell.href?.includes("aviso-meteorologico-vigente"),
    )?.href;
    if (!number || !severity || dates.length < 3 || !link) return [];
    return [
      {
        number,
        title: cells[0]?.text ?? "",
        severity: severity.toUpperCase(),
        start_date: dates.at(-2),
        end_date: dates.at(-1),
        url: new URL(link, SENAMHI_URL).href,
      },
    ];
  });
}

function limaDate(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`SENAMHI responded HTTP ${response.status}`);
  return response.text();
}

export async function fetchActiveAlerts(now = new Date()) {
  const bulletins = parseSENAMHIBulletins(await fetchText(SENAMHI_URL));
  const today = limaDate(now);
  const alerts = [];
  for (const bulletin of bulletins) {
    if (bulletin.end_date < today) continue;
    const mapUrl = new URL(SENAMHI_MAP_URL);
    mapUrl.search = new URLSearchParams({
      av: bulletin.number,
      nl: "4",
      mp: "3",
      fc: bulletin.start_date.slice(0, 4),
    }).toString();
    const departments = parseAffectedDepartments(await fetchText(mapUrl));
    if (departments.includes("arequipa")) alerts.push(bulletin);
  }
  alerts.sort(
    (left, right) =>
      left.end_date.localeCompare(right.end_date) ||
      Number(left.number) - Number(right.number),
  );
  return {
    alerts,
    updated_at: now.toISOString(),
    source_url: SENAMHI_URL,
  };
}
