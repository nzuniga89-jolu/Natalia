export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método no permitido"
    });
  }

  try {
    const { image, person } = req.body || {};

    if (!image) {
      return res.status(400).json({
        error: "No se recibió ninguna imagen"
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Falta configurar OPENAI_API_KEY en Vercel"
      });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
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
Analiza este calendario.

La persona seleccionada es:
${person === "josefina" ? "Josefina — Colegio" : "Luciana — Sala cuna"}

Busca TODAS las actividades, fechas, celebraciones, materiales que haya que llevar,
reuniones, cambios de horario, días especiales y cualquier información importante.

Devuelve solamente una lista JSON con este formato:

[
  {
    "date": "YYYY-MM-DD",
    "text": "Descripción clara de la actividad"
  }
]

No inventes información.
Si una fecha no aparece claramente, no la inventes.
Si el calendario indica un año diferente, utiliza ese año.
`
              },
              {
                type: "input_image",
                image_url: image,
                detail: "high"
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || "Error al analizar el calendario"
      });
    }

    return res.status(200).json({
      result: data.output_text || ""
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message || "Error interno"
    });
  }
}
