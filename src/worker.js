import { fetchActiveAlerts } from "./alerts.js";

const REQUIRED_SECRETS = [
  "WHATSAPP_ACCESS_TOKEN",
  "WHATSAPP_PHONE_NUMBER_ID",
  "WHATSAPP_RECIPIENT",
];

function isConfigured(value) {
  return Boolean(value && !value.startsWith("REPLACE_WITH_"));
}

function fingerprint(alert) {
  const content = [
    alert.number,
    alert.title,
    alert.severity,
    alert.start_date,
    alert.end_date,
  ].join("|");
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(content)).then(
    (digest) =>
      [...new Uint8Array(digest)]
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join(""),
  );
}

async function sendWhatsAppAlert(env, alert) {
  const graphVersion = env.META_GRAPH_API_VERSION;
  const templateName = env.WHATSAPP_TEMPLATE_NAME;
  if (
    !graphVersion ||
    !/^v\d+\.\d+$/.test(graphVersion) ||
    !isConfigured(templateName)
  ) {
    throw new Error("Meta Graph API version and approved template name are required");
  }
  const response = await fetch(
    `https://graph.facebook.com/${graphVersion}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: env.WHATSAPP_RECIPIENT,
        type: "template",
        template: {
          name: templateName,
          language: { code: env.WHATSAPP_TEMPLATE_LANGUAGE || "es_PE" },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: alert.number },
                { type: "text", text: alert.title },
                { type: "text", text: alert.severity },
                {
                  type: "text",
                  text: `${alert.start_date} al ${alert.end_date}`,
                },
                { type: "text", text: alert.url },
              ],
            },
          ],
        },
      }),
    },
  );
  const result = await response.json();
  if (!response.ok) {
    throw new Error(
      `Meta WhatsApp API responded HTTP ${response.status}: ${JSON.stringify(result.error ?? result)}`,
    );
  }
  const messageId = result.messages?.[0]?.id;
  if (!messageId) throw new Error("Meta accepted no WhatsApp message");
  return messageId;
}

async function claimAlert(database, alert, key, now) {
  const result = await database
    .prepare(
      `INSERT INTO whatsapp_notifications
        (alert_key, bulletin_number, status, created_at, updated_at)
       VALUES (?, ?, 'sending', ?, ?)
       ON CONFLICT(alert_key) DO UPDATE SET
         status = 'sending',
         updated_at = excluded.updated_at
       WHERE whatsapp_notifications.status = 'failed'`,
    )
    .bind(key, alert.number, now, now)
    .run();
  return result.meta.changes === 1;
}

async function checkAndNotify(env) {
  const missing = REQUIRED_SECRETS.filter((name) => !env[name]);
  if (missing.length) {
    throw new Error(`Missing Worker secrets: ${missing.join(", ")}`);
  }
  if (!env.DB) throw new Error("D1 binding DB is not configured");
  await env.DB.prepare(
    `UPDATE whatsapp_notifications
     SET status = 'failed', updated_at = ?
     WHERE status = 'sending' AND updated_at < ?`,
  )
    .bind(
      new Date().toISOString(),
      new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    )
    .run();

  const { alerts } = await fetchActiveAlerts();
  for (const alert of alerts) {
    const key = await fingerprint(alert);
    const now = new Date().toISOString();
    if (!(await claimAlert(env.DB, alert, key, now))) continue;
    try {
      const messageId = await sendWhatsAppAlert(env, alert);
      await env.DB.prepare(
        `UPDATE whatsapp_notifications
         SET status = 'sent', message_id = ?, updated_at = ?
         WHERE alert_key = ?`,
      )
        .bind(messageId, new Date().toISOString(), key)
        .run();
      console.log(`WhatsApp alert ${alert.number} sent.`);
    } catch (error) {
      await env.DB.prepare(
        `UPDATE whatsapp_notifications
         SET status = 'failed', updated_at = ?
         WHERE alert_key = ?`,
      )
        .bind(new Date().toISOString(), key)
        .run();
      console.error(`WhatsApp alert ${alert.number} failed:`, error);
    }
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/health") {
      return new Response("Not found", { status: 404 });
    }
    return Response.json({
      service: "clima-sur-alerts",
      configured: {
        database: Boolean(env.DB),
        whatsapp: REQUIRED_SECRETS.every((name) => Boolean(env[name])),
        template: isConfigured(env.WHATSAPP_TEMPLATE_NAME),
        graphApiVersion:
          Boolean(env.META_GRAPH_API_VERSION) &&
          /^v\d+\.\d+$/.test(env.META_GRAPH_API_VERSION),
      },
    });
  },
  async scheduled(_controller, env, context) {
    context.waitUntil(
      checkAndNotify(env).catch((error) => {
        console.error("Scheduled weather alert check failed:", error);
      }),
    );
  },
};
