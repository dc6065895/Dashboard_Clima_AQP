import { fetchActiveAlerts } from "../../../src/alerts.js";

export async function onRequestGet() {
  try {
    return Response.json(await fetchActiveAlerts(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("SENAMHI alert request failed:", error);
    return Response.json(
      { error: "No fue posible consultar los avisos oficiales de SENAMHI." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
