export default async function handler(req, res) {

  // ===== CORS =====
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método no permitido"
    });
  }

  try {

    // ==========================================
    // RECIBIMOS EXACTAMENTE LO QUE ENVÍA INDEX
    // ==========================================

    const { data, mimeType, person } = req.body || {};

    if (!data) {
      return res.status(400).json({
        error: "No se recibió ningún archivo"
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Falta configurar OPENAI_API_KEY en Vercel"
      });
    }

    // ==========================================
    // PEDIMOS A OPENAI QUE LEA EL CALENDARIO
    // ==========================================

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },

        body: JSON.stringify({

          model: "gpt-5",

          input: [
            {
              role: "user",

              content: [

                {
                  type: "input_text",

                  text: `
Analiza cuidadosamente este calendario.

La persona seleccionada es:

${
  person === "josefina"
    ? "Josefina — Colegio"
    : "Luciana — Sala cuna"
}

Busca TODAS las actividades que aparezcan.

Incluye:

- fechas
- celebraciones
- cumpleaños
- reuniones
- materiales que haya que llevar
- cambios de horario
- actividades especiales
- días especiales
- retiros anticipados
- cualquier otra información importante

Devuelve ÚNICAMENTE un JSON válido.

El formato debe ser exactamente:

[
  {
    "date": "YYYY-MM-DD",
    "text": "Descripción clara de la actividad"
  }
]

REGLAS IMPORTANTES:

1. No inventes información.
2. Si una fecha no aparece claramente, no la inventes.
3. Si aparece un año, utiliza ese año.
4. Si el calendario no indica el año, utiliza 2026.
5. Cada actividad debe ser un elemento separado.
6. No agregues texto fuera del JSON.
`
                },

                {
                  type: "input_image",
                  image_url: data
                }

              ]
            }
          ]
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error:
          result?.error?.message ||
          "Error al analizar el calendario"
      });
    }

    // ==========================================
    // OBTENER TEXTO DE RESPONSES API
    // ==========================================

    const outputText =
      result.output_text ||
      "";

    if (!outputText) {
      return res.status(500).json({
        error: "OpenAI no devolvió información"
      });
    }

    // ==========================================
    // CONVERTIR LA RESPUESTA EN EVENTOS
    // ==========================================

    let events;

    try {

      // Limpiamos posibles ```json
      const cleaned = outputText
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

      events = JSON.parse(cleaned);

    } catch (e) {

      return res.status(500).json({
        error: "La respuesta del análisis no pudo convertirse en calendario."
      });

    }

    // ==========================================
    // VALIDAR EVENTOS
    // ==========================================

    if (!Array.isArray(events)) {
      return res.status(500).json({
        error: "El análisis no devolvió una lista de eventos."
      });
    }

    const cleanEvents = events
      .filter(e =>
        e &&
        typeof e.date === "string" &&
        typeof e.text === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(e.date)
      )
      .map(e => [
        e.date,
        person === "josefina"
          ? "Colegio"
          : "Sala cuna",
        e.text.trim()
      ])
      .filter(e => e[2]);

    // ==========================================
    // RESPUESTA EXACTAMENTE COMO LA ESPERA INDEX
    // ==========================================

    return res.status(200).json({
      events: cleanEvents
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      error:
        error?.message ||
        "Error interno de la API"
    });
  }
}
