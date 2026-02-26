import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

// --- 1. ADMIN STATISTICS ---
// Corregido: Quitamos el filtro "status" que causaba error en tu terminal
app.get('/api/admin/stats', async (req, res) => {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [users] = await connection.execute('SELECT COUNT(*) as total FROM users');
        const [reservations] = await connection.execute('SELECT COUNT(*) as total FROM reservations');
        const [spots] = await connection.execute('SELECT COUNT(*) as total FROM parking_spots');
        
        console.log("Admin Dashboard: Global statistics synchronized.");
        res.json({
            users: users[0].total,
            reservations: reservations[0].total,
            spots: spots[0].total
        });
    } catch (error) {
        console.error("Dashboard Stats Error:", error.message);
        res.status(500).json({ error: "Failed to load administrative summary." });
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
        if (rows.length > 0) {
            console.log(`Access granted: ${email} is now online.`);
            res.json(rows[0]);
        } else {
            res.status(401).json({ error: "Invalid credentials. Access denied." });
        }
    } catch (error) {
        console.error("Auth Error:", error.message);
        res.status(500).json({ error: "Authentication service unavailable." });
    } finally {
        if (connection) await connection.end();
    }
});

// --- 3. PARKING SPOTS ---
// Ajustado: Eliminadas columnas inexistentes (is24h, status) para evitar errores
app.get('/api/spots', async (req, res) => {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        // Usamos price_hour como 'price' para que el frontend no se rompa
        const [rows] = await connection.execute(
            'SELECT id, name, address, zone, price_hour as price, image FROM parking_spots'
        );
        console.log(`${rows.length} parking locations loaded successfully.`);
        res.json(rows);
    } catch (error) {
        console.error("Load Spots Error:", error.message);
        res.status(500).json({ error: "Unable to retrieve parking spot data." });
    } finally {
        if (connection) await connection.end();
    }
});

// --- 4. RESERVATIONS (The Core Fix) ---
// Aquí mapeamos tus nombres reales (total_amount, start_time) a lo que el JS espera
app.get('/api/reservations', async (req, res) => {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute(`
            SELECT 
                r.id, 
                r.parking_id AS spotId, 
                u.email AS userEmail, 
                r.date, 
                r.start_time AS startTime, 
                r.end_time AS endTime, 
                r.duration AS hours, 
                r.total_amount AS amount, 
                r.status,
                p.name AS spotName,
                p.address,
                p.image
            FROM reservations r
            JOIN parking_spots p ON r.parking_id = p.id
            JOIN users u ON r.client_id = u.id
        `);
        res.json(rows);
    } catch (error) {
        console.error("Fetch Reservations Error:", error.message);
        res.status(500).json({ error: "Booking data synchronization failed." });
    } finally {
        if (connection) await connection.end();
    }
});

// Ruta para actualizar estado usando tus ENUMS ('pending', 'in-use', etc.)
app.patch('/api/reservations/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // El frontend debe enviar 'in-use' o 'completed'
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        await connection.execute('UPDATE reservations SET status = ? WHERE id = ?', [status, id]);
        console.log(`Booking ${id} updated to status: ${status}`);
        res.json({ message: `Status updated to ${status} successfully.` });
    } catch (error) {
        console.error("Update Status Error:", error.message);
        res.status(500).json({ error: "Failed to update reservation status." });
    } finally {
        if (connection) await connection.end();
    }
});

// --- 5. SERVER STARTUP ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("-----------------------------------------");
    console.log(`   PARKLY SERVER: ACTIVE ON PORT ${PORT}`);
    console.log(`   DATABASE: ${dbConfig.database} ON ${dbConfig.host}`);
    console.log("-----------------------------------------");
});

export default app;