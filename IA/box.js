import express from "express";
import OpenAI from "openai";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        reply: "Debes enviar un mensaje."
      });
    }

    const texto = message.toLowerCase();

    // 1️⃣ RESERVAS
    const categoriaReservas = [
      "reserva",
      "reservar",
      "disponibilidad",
      "espacio",
      "horario",
      "buscar parqueadero",
      "estacionamiento"
    ];

    // 2️⃣ PAGOS
    const categoriaPagos = [
      "pago",
      "pagar",
      "tarjeta",
      "metodo de pago",
      "cancelar reserva",
      "factura",
      "precio"
    ];

    // 3️⃣ ASISTENCIA IA (SOLO DE LA PAGINA)
    const categoriaAsistencia = [
      "ayuda",
      "soporte",
      "problema",
      "error",
      "no funciona",
      "asistencia",
      "como usar",
      "configuracion",
      "cuenta"
    ];

    const esReserva = categoriaReservas.some(p => texto.includes(p));
    const esPago = categoriaPagos.some(p => texto.includes(p));
    const esAsistencia = categoriaAsistencia.some(p => texto.includes(p));

    // 🔒 Si no pertenece a ninguna categoría → BLOQUEADO
    if (!esReserva && !esPago && !esAsistencia) {
      return res.json({
        reply: "Este asistente solo responde consultas relacionadas con la aplicación Parkly."
      });
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: `
Eres el asistente oficial de Parkly.

Solo puedes hablar sobre:
1. Reservas de parqueadero
2. Pagos dentro de la aplicación
3. Soporte técnico y uso de la plataforma

Está estrictamente prohibido responder temas externos como recetas, historia, tareas, programación externa, cultura general u otros.

Si el usuario intenta salir del contexto, debes rechazarlo.
Responde de forma clara y profesional.
`
        },
        { role: "user", content: message }
      ]
    });

    const reply = completion?.choices?.[0]?.message?.content 
      || "No se pudo generar respuesta.";

    res.json({ reply });

  } catch (error) {
    console.error("ERROR:", error);
    res.status(500).json({
      reply: "Error al conectar con el asistente."
    });
  }
});

app.listen(3000, () =>
  console.log("Servidor IA corriendo en http://localhost:3000")
);