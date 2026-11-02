const NOAA_DIRECTORY =
  "https://cdn.star.nesdis.noaa.gov/GOES19/ABI/SECTOR/NSA/13/";
const FRAME_PATTERN = /href="(\d{11}_GOES19-ABI-nsa-13-900x540\.jpg)"/gi;
const LOOP_FRAME_COUNT = 8;

function frameTimestamp(filename) {
  const year = Number(filename.slice(0, 4));
  const dayOfYear = Number(filename.slice(4, 7));
  const hour = Number(filename.slice(7, 9));
  const minute = Number(filename.slice(9, 11));
  const timestamp = new Date(
    Date.UTC(year, 0, dayOfYear - 1, hour, minute),
  ).toISOString();
  return timestamp;
}

export async function onRequestGet() {
  try {
    const response = await fetch(NOAA_DIRECTORY, {
      headers: { "User-Agent": "ClimaSur/1.0 (public weather dashboard)" },
    });
    if (!response.ok) throw new Error(`NOAA respondió HTTP ${response.status}`);
    const html = await response.text();
    const filenames = [...html.matchAll(FRAME_PATTERN)]
      .map((match) => match[1])
      .sort();
    const latestFrames = filenames.slice(-LOOP_FRAME_COUNT);
    if (latestFrames.length < 2) {
      throw new Error("NOAA no publicó suficientes imágenes infrarrojas");
    }
    const frames = latestFrames.map((filename) => ({
      url: new URL(filename, NOAA_DIRECTORY).href,
      timestamp: frameTimestamp(filename),
    }));
    return Response.json(
      {
        frames,
        updated_at: new Date().toISOString(),
        source_url: NOAA_DIRECTORY,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=300",
        },
      },
    );
  } catch (error) {
    console.error("GOES-19 infrared loop request failed:", error);
    return Response.json(
      { error: "No fue posible consultar las imágenes infrarrojas de GOES-19." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
