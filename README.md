# Clima Sur · Arequipa

Panel meteorológico web, adaptable a móvil, para Cerro Colorado, Arequipa periferia (alta montaña), Yanahuara y Cayma.

## Ejecutar

No requiere instalación de paquetes ni compilación. Con Python 3.9 o posterior:

```bash
python3 server.py
```

Abre `http://localhost:8000` en el navegador. El servidor integrado publica los archivos y consulta los avisos oficiales de SENAMHI para Arequipa. El endpoint de avisos requiere que el servidor pueda acceder a internet; no funcionará si se publica solo como sitio estático.

## Publicar en Cloudflare y enviar avisos por WhatsApp

La integración separa el sitio del servicio de notificaciones:

- **Cloudflare Pages** publica `index.html`, `app.js` y `styles.css`. La función Pages en `functions/api/senamhi/alerts.js` mantiene el endpoint `/api/senamhi/alerts` en la versión pública.
- **Cloudflare Worker** vuelve a consultar SENAMHI cada 15 minutos y envía cada aviso nuevo o modificado una sola vez. Cloudflare D1 guarda las notificaciones para evitar repeticiones y permite reintentar envíos fallidos. El Worker no depende de que una computadora personal esté encendida.

### Requisitos previos

1. Una cuenta Cloudflare y un nombre de proyecto disponible para Pages.
2. Node.js/npm y una sesión iniciada con `npx wrangler login` para ejecutar Wrangler (`npx wrangler`).
3. Una cuenta de WhatsApp Business Platform configurada en Meta, un número emisor habilitado, un token con permiso de envío y una plantilla en español aprobada.
4. Haber dado consentimiento explícito para recibir mensajes en el número destinatario. Meta exige opt-in y plantillas aprobadas para mensajes iniciados por el negocio fuera de la ventana de atención de 24 horas. Las tarifas se aplican según las reglas y categoría asignada por Meta.

No escribas el token en el código ni lo compartas en el chat. Wrangler lo almacena como secreto del Worker.

### 1. Configurar WhatsApp Business en Meta

1. En [Meta for Developers](https://developers.facebook.com/), crea una aplicación empresarial y agrega el producto **WhatsApp**. Completa la configuración de una cuenta de WhatsApp Business y un número emisor que puedas verificar por SMS o llamada. Revisa los [requisitos del número](https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/phone-numbers).
2. Durante las pruebas, usa el número de prueba y destinatarios permitidos que muestra el panel de WhatsApp. Para producción, registra el número emisor y confirma que está habilitado para enviar mensajes.
3. En **WhatsApp > API Setup**, copia el **Phone Number ID** del emisor. El destinatario es tu teléfono personal en formato internacional, por ejemplo `+51...`; no es el ID del emisor.
4. Genera un token de producción desde la configuración de usuarios del sistema de Meta, asignando la aplicación y la cuenta de WhatsApp Business, con el permiso de mensajería requerido. Meta también documenta el [inicio rápido y configuración de Cloud API](https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started).
5. Antes de programar mensajes, registra el opt-in explícito del destinatario, indicando el nombre del servicio y que recibirá avisos meteorológicos por WhatsApp. Meta explica los [requisitos de consentimiento](https://developers.facebook.com/documentation/business-messaging/whatsapp/getting-opt-in).

### 2. Crear la plantilla de Meta

Crea y aprueba una plantilla llamada `clima_sur_alerta`, en español (`es_PE`), con cinco variables en el cuerpo, en este orden:

```text
Aviso SENAMHI {{1}} para Arequipa: {{2}}. Nivel {{3}}. Vigencia: {{4}}. Fuente: {{5}}
```

Configura en `wrangler.worker.jsonc` el nombre exacto aprobado y una versión vigente de Graph API habilitada para tu aplicación. Meta determina la categoría de la plantilla; no supongas que un aviso meteorológico califica como una categoría específica.

### 3. Publicar la web en Pages

Si conectas Pages al repositorio Git (recomendado para esta configuración), establece la raíz del proyecto como `/`, la rama de producción como `main`, el comando de compilación como:

```bash
python3 scripts/build_pages.py
```

El directorio de salida es `dist`. Pages detecta la función en `functions/` para mantener disponible `/api/senamhi/alerts`. Para conectar GitHub: Cloudflare Dashboard → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git** → autoriza GitHub Pages sobre el repositorio `Dashboard_Clima_AQP` → **Begin setup**. No elijas Direct Upload, ya que el tipo de proyecto Pages no se puede cambiar después.

Como alternativa, se puede usar Direct Upload, pero requiere crear otro proyecto Pages si primero se elige integración Git. Para ese método, genera `dist` y ejecuta:

```bash
npx wrangler pages project create clima-sur
npx wrangler pages deploy dist --project-name=clima-sur --config=wrangler.pages.jsonc
```

### 4. Configurar y publicar el Worker programado

Crea la base D1, reemplaza `REPLACE_WITH_D1_DATABASE_ID` en `wrangler.worker.jsonc` por el ID devuelto, y aplica la migración:

```bash
npx wrangler d1 create clima-sur-alerts
npx wrangler d1 migrations apply clima-sur-alerts --remote --config=wrangler.worker.jsonc
```

Guarda las credenciales como secretos y publica el Worker:

```bash
npx wrangler secret put WHATSAPP_ACCESS_TOKEN --config=wrangler.worker.jsonc
npx wrangler secret put WHATSAPP_PHONE_NUMBER_ID --config=wrangler.worker.jsonc
npx wrangler secret put WHATSAPP_RECIPIENT --config=wrangler.worker.jsonc
npx wrangler deploy --config=wrangler.worker.jsonc
```

El destinatario debe estar en formato internacional, por ejemplo `+51...`, y haber dado el consentimiento requerido. Comprueba `https://clima-sur-alertas.<tu-subdominio>.workers.dev/health`; sus indicadores deben mostrar la base, WhatsApp, plantilla y versión Graph configurados. Al primer ciclo programado se enviarán los avisos regionales que estén vigentes en ese momento; luego solo avisos nuevos o con cambios. Los fallos del proveedor se registran y se reintentan en un ciclo posterior.

### Limitaciones y costos

El plan gratuito puede bastar para el tráfico pequeño, sujeto a las cuotas y límites vigentes de Cloudflare y Meta. En Workers Free, cada invocación tiene un límite de 10 ms de CPU; revisa los logs tras el primer ciclo y considera Workers Paid (desde US$5/mes) si se alcanza ese límite. Los mensajes de WhatsApp pueden tener costo por mensaje entregado. El dashboard usa alertas oficiales de SENAMHI; no se envían reportes COER/INDECI porque sus fuentes aún no están integradas automáticamente. Si SENAMHI o sus mapas no responden, el Worker registra el error y no trata la consulta fallida como “sin alertas”.

## Funciones y fuentes

- Condiciones actuales, humedad, radiación solar de onda corta, viento y pronósticos horarios y de tres días: [Open-Meteo](https://open-meteo.com/). Las coordenadas son representativas de cada zona; Cerro Colorado usa el punto `-16.379898, -71.557855` y solicita la celda de modelo más cercana (`cell_selection=nearest`). Las condiciones son estimaciones de modelo, no lecturas de una estación SENAMHI.
- Mosaico de precipitación: [RainViewer](https://www.rainviewer.com/), sobre el mapa base de calles de Esri, con la atribución exigida por el servicio. No se consultan los mosaicos voluntarios de OpenStreetMap directamente, para evitar su política de bloqueo de uso.
- Avisos meteorológicos oficiales de [SENAMHI para Arequipa](https://www.senamhi.gob.pe/?p=aviso-meteorologico&dp=arequipa): el servidor consulta el listado regional, verifica en el mapa de cada aviso si Arequipa aparece entre los departamentos afectados y muestra solo los avisos vigentes que incluyen la región, junto con su nivel, fechas y enlace al aviso original. Si SENAMHI o sus mapas no responden, la interfaz lo indica explícitamente en vez de informar que no hay alertas. Los reportes del COER e INDECI/COEN se consultan en sus propios canales y no se incorporan automáticamente al panel.
- Imagen satelital de NOAA STAR, satélite GOES-19, sector `NSA` (South America - Northern), con filtros GeoColor, infrarrojo de onda larga (banda 13), AirMass y Sandwich. El marcador indica la ubicación elegida en la imagen sectorial; la vista inicial se encuadra alrededor de Cerro Colorado y permite volver a encuadrar al cambiar de localidad. Los botones de zoom y la rueda del ratón amplían la imagen; al acercar se solicita la versión sectorial de 3600 × 2160 px. Esta vista es regional y no una imagen recortada al distrito.
- El punto de referencia por defecto de Cerro Colorado es `-16.379898, -71.557855`. En una consulta de validación, Open-Meteo seleccionó la celda más cercana en `-16.414762, -71.588960`, con elevación de 2,399 m; el mapa y el marcador permanecen en las coordenadas solicitadas. El mapa base y el radar se centran allí con zoom 12.
- El filtro de radar permite cambiar el suavizado del mosaico de RainViewer o dejar solo el mapa base. RainViewer actualmente publica la paleta Universal Blue y limita el zoom nativo a 7; la interfaz no inventa otros productos de radar. La disponibilidad y cobertura local del radar dependen de los radares que suministren datos a RainViewer.
- Las alertas locales calculadas a partir del pronóstico son orientativas; no sustituyen avisos oficiales de SENAMHI o de defensa civil.
- Radiación solar, presión de superficie, pronóstico, radar, imagen satelital y avisos oficiales se actualizan cada 15 minutos; el servicio web conserva en caché los avisos SENAMHI por hasta 10 minutos. La selección de ubicación actualiza el pronóstico y centra el mapa en el distrito.

Las fuentes son servicios públicos de terceros sujetos a disponibilidad, cobertura, políticas de uso y atribución propias. Se requiere conexión a internet para cargar el mapa, las fuentes y las tipografías.
