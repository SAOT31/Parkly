import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- MIDDLEWARE CONFIGURATION ---
app.use(express.json());
app.use(cors());
app.use(express.static('public')); 

const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 4000,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: true }
};

// --- 1. ADMIN DASHBOARD STATISTICS (Fixes the 0s) ---
// This route fetches real counts from your TiDB tables
app.get('/api/admin/stats', async (req, res) => {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [users] = await connection.execute('SELECT COUNT(*) as total FROM users');
        const [reservations] = await connection.execute('SELECT COUNT(*) as total FROM reservations');
        const [spots] = await connection.execute('SELECT COUNT(*) as total FROM parking_spots WHERE status = "approved"');
        
        res.json({
            users: users[0].total,
            reservations: reservations[0].total,
            spots: spots[0].total
        });
    } catch (error) {
        console.error("Dashboard Stats Error:", error.message);
        res.status(500).json({ error: "Failed to fetch dashboard data" });
    } finally {
        if (connection) await connection.end();
    }
});

// --- 2. AUTHENTICATION ---
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute(
            'SELECT id, name, email, role, phone FROM users WHERE email = ? AND password = ?',
            [email, password]
        );
        if (rows.length > 0) res.json(rows[0]);
        else res.status(401).json({ error: "Invalid credentials" });
    } catch (error) {
        res.status(500).json({ error: "Auth error" });
    } finally {
        if (connection) await connection.end();
    }
});

// --- 3. PARKING SPOTS (Corrected column mapping) ---
// Maps 'price_hour' to 'price' so search.js can render cards
app.get('/api/spots', async (req, res) => {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute(
            'SELECT id, name, address, zone, price_hour as price, rating, image, verified, is24h, evCharging, hasSecurity, isIlluminated FROM parking_spots WHERE status = "approved"'
        );
        res.json(rows);
    } catch (error) {
        console.error("Load Spots Error:", error.message);
        res.status(500).json({ error: "Database error loading spots" });
    } finally {
        if (connection) await connection.end();
    }
});

// --- 4. SERVER INITIALIZATION ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("-----------------------------------------");
    console.log(`   PARKLY BACKEND SERVICE ACTIVE`);
    console.log(`   URL: http://localhost:${PORT}`);
    console.log("-----------------------------------------");
});

export default app;