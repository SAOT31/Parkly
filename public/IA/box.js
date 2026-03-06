import express from "express";
import OpenAI from "openai";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Clasificador de intención (modelo pequeño, rápido y barato) ──────────────
async function esMensajeValido(message) {
  const result = await client.chat.completions.create({
    model: "gpt-4.1-nano", // el más barato, solo clasifica SI/NO
    temperature: 0,
    max_tokens: 5,
    messages: [
      {
        role: "system",
        content: `
Eres un clasificador de mensajes para la app de parqueaderos Parkly.
Responde SOLO con "SI" o "NO".
Responde "SI" si el mensaje tiene relación con:
- Buscar, reservar o cancelar parqueaderos / estacionamientos / parking
- Disponibilidad, precios, horarios o ubicación de parqueaderos
- Pagos, facturas o métodos de pago dentro de la app
- Uso, soporte técnico o problemas con la aplicación Parkly
- Preguntas generales sobre cómo funciona el servicio

Responde "NO" solo si el mensaje claramente no tiene nada que ver con parqueaderos
ni con la app (ej: recetas de cocina, tareas de historia, chistes, etc.).
En caso de duda, responde "SI".
        `.trim(),
      },
      { role: "user", content: message },
    ],
  });

  const respuesta = result?.choices?.[0]?.message?.content?.trim().toUpperCase();
  return respuesta === "SI";
}

// ─── Ruta principal ───────────────────────────────────────────────────────────
app.post("/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ reply: "Debes enviar un mensaje." });
    }

    // Mensajes muy cortos (respuestas de conversación) los dejamos pasar directo
    const esMensajeCorto = message.trim().split(/\s+/).length <= 2;

    if (!esMensajeCorto) {
      const valido = await esMensajeValido(message);
      if (!valido) {
        return res.json({
          reply:
            "Solo puedo ayudarte con temas de Parkly: buscar parqueaderos, reservas, pagos y soporte de la app. ¿En qué te puedo ayudar?",
        });
      }
    }

    // Historial limitado a los últimos 10 turnos
    const historialLimitado = history.slice(-10);

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `
Eres el asistente oficial de Parkly, una aplicación para buscar y reservar parqueaderos.

Puedes ayudar con:
1. Buscar parqueaderos disponibles (por zona, precio, horario, características).
2. Reservas: cómo crear, modificar o cancelar una reserva.
3. Pagos: métodos aceptados, tarifas, facturas y reembolsos.
4. Soporte técnico: cuenta, login, errores en la app, configuración.

Reglas:
- Si el usuario pregunta algo fuera de estos temas, recházalo con amabilidad.
- Responde siempre en el idioma del usuario.
- Sé claro, conciso y profesional.
- Si no tienes información específica (ej: precio exacto de un parqueadero),
  pídele al usuario más detalles o indícale que use los filtros de búsqueda en la app.
- No inventes datos. Cuando no sepas algo, deriva a soporte@parkly.co.
          `.trim(),
        },
        ...historialLimitado,
        { role: "user", content: message },
      ],
    });

    const reply =
      completion?.choices?.[0]?.message?.content?.trim() ||
      "No se pudo generar una respuesta. Intenta de nuevo.";

    res.json({ reply });
  } catch (error) {
    console.error("ERROR:", error?.message || error);

    const status = error?.status;
    res.status(500).json({
      reply:
        status === 401
          ? "Error de autenticación con el servicio de IA."
          : status === 429
          ? "Demasiadas solicitudes. Intenta en unos segundos."
          : "Error al conectar con el asistente. Por favor intenta de nuevo.",
    });
  }
});

// ─── Healthcheck ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.listen(3000, () =>
  console.log("Servidor Parkly IA corriendo en http://localhost:3000")
);
