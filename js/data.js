/**
 * ARCHIVO: js/data.js
 * DESCRIPCIÓN: Ahora conecta con el servidor Node.js (MySQL).
 * Se mantiene el objeto DB para no romper la lógica de otros archivos.
 */

const API_URL = "http://localhost:3000/api";

const DB = {
    // ── 1. LOGIN (MySQL) ──
    login: async function(email, password) {
        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            if (!response.ok) return null;
            const user = await response.json();
            // Solo guardamos la sesión activa localmente
            localStorage.setItem('parkly_session', JSON.stringify(user));
            return user;
        } catch (error) {
            console.error("❌ Error en login:", error);
            return null;
        }
    },

    // ── 2. REGISTRO (MySQL) ──
    register: async function(newUser) {
        try {
            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUser)
            });
            return response.ok;
        } catch (error) {
            console.error("❌ Error en registro:", error);
            return false;
        }
    },

    // ── 3. PARQUEADEROS (Real de la Tabla parking_spots) ──
    getSpots: async function() {
        try {
            const response = await fetch(`${API_URL}/spots`);
            return await response.json();
        } catch (error) {
            console.error("❌ Error cargando parqueaderos:", error);
            return [];
        }
    },

    // ── 4. MÉTRICAS ADMIN (El puente a Python) ──
    getAdminStats: async function() {
        try {
            // El servidor Node llamará internamente a stats.py de Python
            const response = await fetch(`${API_URL}/admin/metrics`);
            return await response.json();
        } catch (error) {
            console.error("❌ Error en métricas de Python:", error);
            return null;
        }
    },

    // ── 5. HELPERS DE SESIÓN ──
    getSession: function() {
        return JSON.parse(localStorage.getItem('parkly_session'));
    },

    logout: function() {
        localStorage.removeItem('parkly_session');
        window.location.href = 'index.html';
    }
};

// Nota: Eliminamos DB.init() porque los datos ya están en MySQL.