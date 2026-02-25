import express from 'express';
import mysql from 'mysql2/promise';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- CONFIGURACION DE MIDDLEWARES ---
app.use(express.json());
app.use(cors());

// Servir archivos estaticos desde la carpeta public
app.use(express.static('public')); 

const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 4000,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: true }
};

// --- 1. AUTHENTICATION (Table: users) ---
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute(
            'SELECT id, name, email, role, phone FROM users WHERE email = ? AND password = ?',
            [email, password]
        );
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(401).json({ error: "Invalid credentials" });
        }
    } catch (error) {
        console.error("Error en Login:", error.message);
        res.status(500).json({ error: "Database error", details: error.message });
    } finally {
        if (connection) await connection.end();
    }
});

app.post('/api/register', async (req, res) => {
    const { name, email, password, role, phone } = req.body;
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        await connection.execute(
            'INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, ?, ?)',
            [name, email, password, role, phone]
        );
        res.status(201).json({ message: "User registered" });
    } catch (error) {
        console.error("Error en Registro:", error.message);
        res.status(500).json({ error: "Registration failed" });
    } finally {
        if (connection) await connection.end();
    }
});

// --- 2. PARKING SPOTS (Table: parking_spots) ---
app.get('/api/spots', async (req, res) => {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT * FROM parking_spots WHERE status = "approved"');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: "Error loading spots" });
    } finally {
        if (connection) await connection.end();
    }
});

// --- 3. RESERVATIONS (Table: reservations) ---
app.post('/api/reservations', async (req, res) => {
    const { id, spotId, userEmail, date, startTime, endTime, amount, status } = req.body;
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        await connection.execute(
            'INSERT INTO reservations (id, spotId, userEmail, date, startTime, endTime, amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, spotId, userEmail, date, startTime, endTime, amount, status]
        );
        res.status(201).json({ message: "Reservation saved" });
    } catch (error) {
        res.status(500).json({ error: "Failed to save reservation" });
    } finally {
        if (connection) await connection.end();
    }
});

// --- 4. ARRANQUE DEL SERVIDOR (Necesario para ejecucion local) ---
const PORT = process.env.PORT || 3000;

// Solo ejecuta el listener si no estamos en entorno de produccion de Vercel
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log("Servidor Parkly activo");
        console.log("Puerto: " + PORT);
        console.log("URL: http://localhost:" + PORT);
        console.log("Conectado a TiDB: " + dbConfig.host);
    });
}

export default app;