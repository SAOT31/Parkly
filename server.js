// FILE: server.js
// Ejecutar con: node server.js

import express from 'express';
import mysql from 'mysql2/promise';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// ── CONFIGURACIÓN DE TU BASE DE DATOS (DBeaver) ──
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '1234', // Asegúrate de que esta sea tu clave de MySQL
    database: 'parkly'
};

// ── 1. LOGIN ──
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute(
            'SELECT id, name, email, role, phone FROM users WHERE email = ? AND password = ?',
            [email, password]
        );
        await connection.end();

        if (rows.length > 0) {
            res.json(rows[0]); 
        } else {
            res.status(401).json({ error: "Invalid credentials" });
        }
    } catch (error) {
        console.error("Error en DB:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// ── 2. REGISTRO ──
app.post('/api/register', async (req, res) => {
    const { name, email, password, role, phone } = req.body;
    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.execute(
            'INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, ?, ?)',
            [name, email, password, role, phone]
        );
        await connection.end();
        res.status(201).json({ success: true });
    } catch (error) {
        console.error("Error en DB:", error);
        res.status(500).json({ error: "Database error or email exists" });
    }
});

// ── 3. LISTAR PARQUEADEROS ──
app.get('/api/spots', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT * FROM parking_spots');
        await connection.end();
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: "Database error" });
    }
});

// ── 4. ANALÍTICA ADMIN (El puente con Python) ──
app.get('/api/admin/metrics', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        
        // 1. Cálculos rápidos directos desde MySQL
        const [[{total_spots}]] = await connection.execute('SELECT COUNT(*) as total_spots FROM parking_spots');
        const [[{total_res}]] = await connection.execute('SELECT COUNT(*) as total_res FROM reservations');
        const [[{revenue}]] = await connection.execute('SELECT SUM(total_amount) as revenue FROM reservations WHERE status="completed"');
        const [[{users}]] = await connection.execute('SELECT COUNT(*) as users FROM users');
        await connection.end();

        // 2. Pedimos los cálculos complejos al microservicio de Python (puerto 8000)
        let pythonProjection = 0;
        let pythonOccupancy = 0;
        let peakDay = "N/A";

        try {
            const projRes = await axios.get('http://localhost:8000/stats/monthly-projection');
            const occRes = await axios.get('http://localhost:8000/stats/occupancy-rate');
            const dayRes = await axios.get('http://localhost:8000/stats/revenue-by-day');
            
            pythonProjection = projRes.data.projected_earnings;
            pythonOccupancy = occRes.data.occupancy_percentage;
            
            if (dayRes.data && dayRes.data.length > 0) {
                const topDay = dayRes.data.reduce((max, current) => (current.total > max.total ? current : max), dayRes.data[0]);
                peakDay = topDay.day;
            }
        } catch (pythonError) {
            console.error("⚠️ Python no está corriendo o falló:", pythonError.message);
        }

        // 3. Enviamos todo consolidado al Admin Dashboard
        res.json({
            total_spots: total_spots || 0,
            total_reservations: total_res || 0,
            total_revenue: revenue || 0,
            total_users: users || 0,
            dist: { pending: 20, in_use: 30, completed: 40, rejected: 10 }, 
            avg_booking: total_res > 0 ? (revenue / total_res) : 0,
            python: {
                projection: pythonProjection,
                occupancy: pythonOccupancy,
                peak_day: peakDay
            }
        });
    } catch (error) {
        console.error("Error en métricas:", error);
        res.status(500).json({ error: "Backend error" });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Parkly API Node.js corriendo en http://localhost:${PORT}`);
});