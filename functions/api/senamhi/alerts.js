import {
  fetchActiveAlerts,
  SENAMHI_DEPARTMENTS,
} from "../../../src/alerts.js";

export async function onRequestGet({ request }) {
  const department = new URL(request.url).searchParams.get("department") ?? "arequipa";
  if (!SENAMHI_DEPARTMENTS.has(department)) {
    return Response.json(
      { error: "El departamento solicitado no está disponible." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  try {
    return Response.json(await fetchActiveAlerts(department), {
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
