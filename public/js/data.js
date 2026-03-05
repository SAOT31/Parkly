/**
 * FILE: js/data.js
 * DESCRIPTION: Communication bridge between frontend and Node.js API.
 */

const isLocal = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost";
const API_URL = isLocal ? "http://localhost:3000/api" : "/api";

const DB = {
    // 1. Users
    login: async function(email, password) {
        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            if (!response.ok) return null;
            const user = await response.json();
            localStorage.setItem('parkly_session', JSON.stringify(user));
            return user;
        } catch (error) {
            console.error("Login error:", error);
            return null;
        }
    },

    register: async function(newUser) {
        try {
            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUser)
            });
            return response.ok;
        } catch (error) {
            console.error("Registration error:", error);
            return false;
        }
    },

    // 2. Parking Spots
    getSpots: async function() {
        try {
            const response = await fetch(`${API_URL}/spots`);
            return await response.json();
        } catch (error) {
            console.error("Error loading spots:", error);
            return [];
        }
    },

    saveSpotRequest: async function(spotData) {
        try {
            const response = await fetch(`${API_URL}/spots/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(spotData)
            });
            return response.ok;
        } catch (error) {
            console.error("Error saving spot:", error);
            return false;
        }
    },

    // 3. Reservations
    saveReservation: async function(reservationData) {
        try {
            const response = await fetch(`${API_URL}/reservations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reservationData)
            });
            return response.ok;
        } catch (error) {
            console.error("Error saving reservation:", error);
            return false;
        }
    },

    // 4. Admin Analytics
    getAdminStats: async function() {
        try {
            const response = await fetch(`${API_URL}/admin/metrics`);
            return await response.json();
        } catch (error) {
            console.error("Python metrics error:", error);
            return null;
        }
    }
};