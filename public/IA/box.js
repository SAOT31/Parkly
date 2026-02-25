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

  const { message } = req.body;

  const completion = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      { role: "system", content: "Eres el asistente de Parkly." },
      { role: "user", content: message }
    ]
  });

  res.json({
    reply: completion.choices[0].message.content
  });
});

app.listen(3000, () =>
  console.log("Servidor IA corriendo en http://localhost:3000")
);