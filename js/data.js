/**
 * ARCHIVO: js/data.js
 * DESCRIPCIÓN: Simulación de base de datos con persistencia en LocalStorage.
 */

const DB = {
    initialSpots: [
        {
            id: 1, name: "Garaje Moderno Sur",
            address: "Av 68 #22-15, Restrepo",        zone: "Restrepo",
            price: 3500,  verified: false, available: true,  rating: 3.9,
            earnings: 15000, totalSpots: 15, occupiedSpots: 6,
            is24h: false, evCharging: false, hasSecurity: false, isIlluminated: false,
            image: "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=600"
        },
        {
            id: 2, name: "Parking Express Centro",
            address: "Cra 10 #16-80, Candelaria",      zone: "Candelaria",
            price: 4000,  verified: false, available: true,  rating: 3.5,
            earnings: 20000, totalSpots: 20, occupiedSpots: 14,
            is24h: true,  evCharging: false, hasSecurity: false, isIlluminated: true,
            image: "https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?w=600"
        },
        {
            id: 3, name: "Parqueadero Central Plaza",
            address: "Cra 7 #45-12, Zona T",           zone: "Zona T",
            price: 5000,  verified: true,  available: true,  rating: 4.8,
            earnings: 30000, totalSpots: 30, occupiedSpots: 8,
            is24h: true,  evCharging: true,  hasSecurity: true,  isIlluminated: true,
            image: "https://images.unsplash.com/photo-1621929747188-0b4b8f302e1f?w=600"
        },
        {
            id: 4, name: "EcoParking Verde",
            address: "Cra 15 #93-20, Chico",           zone: "Chico",
            price: 6000,  verified: true,  available: true,  rating: 4.2,
            earnings: 12000, totalSpots: 25, occupiedSpots: 20,
            is24h: false, evCharging: true,  hasSecurity: false, isIlluminated: true,
            image: "https://images.unsplash.com/photo-1590674899505-1c5c4195c60c?w=600"
        },
        {
            id: 5, name: "Parking Elite Norte",
            address: "Calle 100 #15-30, Usaquen",      zone: "Usaquen",
            price: 7000,  verified: true,  available: true,  rating: 4.5,
            earnings: 42000, totalSpots: 40, occupiedSpots: 12,
            is24h: true,  evCharging: true,  hasSecurity: true,  isIlluminated: true,
            image: "https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?w=600"
        },
        {
            id: 6, name: "ParkTech Premium",
            address: "Calle 85 #11-50, Chapinero",     zone: "Chapinero",
            price: 8000,  verified: true,  available: false, rating: 4.9,
            earnings: 0, totalSpots: 10, occupiedSpots: 10,
            is24h: false, evCharging: false, hasSecurity: true,  isIlluminated: false,
            image: "https://images.unsplash.com/photo-1621929747188-0b4b8f302e1f?w=600"
        },
        {
            id: 7, name: "las lomas",
            address: "calle40b #22-11 sur",            zone: "Sur",
            price: 2500,  verified: false, available: false, rating: 3.2,
            earnings: 0, totalSpots: 8, occupiedSpots: 8,
            is24h: false, evCharging: false, hasSecurity: false, isIlluminated: false,
            image: ""
        }
    ],

    init: function () {
        const stored = JSON.parse(localStorage.getItem('parkly_spots'));

        if (!stored) {
            localStorage.setItem('parkly_spots', JSON.stringify(this.initialSpots));
        } else {
            // Migración: agregar campos que falten comparando con initialSpots
            let migrated = false;
            const fieldsToMigrate = ['zone','is24h','evCharging','hasSecurity','isIlluminated','totalSpots','occupiedSpots'];

            stored.forEach((s, i) => {
                const fresh = this.initialSpots.find(f => f.id === s.id);
                if (!fresh) return;
                fieldsToMigrate.forEach(field => {
                    if (s[field] == null) {
                        stored[i][field] = fresh[field];
                        migrated = true;
                    }
                });
            });
            if (migrated) localStorage.setItem('parkly_spots', JSON.stringify(stored));
        }

        // Cuentas por defecto
        const defaultUsers = [
            { id: 1, name: "Admin PARKLY",  email: "admin@parkly.co",  password: "admin123", role: "admin"  },
            { id: 2, name: "Maria Owner",   email: "maria@email.com",  password: "123456",   role: "owner"  },
            { id: 3, name: "Carlos Client", email: "carlos@email.com", password: "123456",   role: "client" }
        ];
        if (!localStorage.getItem('parkly_users')) {
            localStorage.setItem('parkly_users', JSON.stringify(defaultUsers));
        }
    },

    login: function (email, password) {
        const users = JSON.parse(localStorage.getItem('parkly_users')) || [];
        const user  = users.find(u => u.email === email && u.password === password);
        if (user) {
            localStorage.setItem('parkly_session', JSON.stringify({
                username: user.name, email: user.email, role: user.role
            }));
            return user;
        }
        return null;
    },

    register: function (newUser) {
        const users = JSON.parse(localStorage.getItem('parkly_users')) || [];
        newUser.id  = Date.now();
        users.push(newUser);
        localStorage.setItem('parkly_users', JSON.stringify(users));
        localStorage.setItem('parkly_session', JSON.stringify(newUser));
        return newUser;
    },

    getSession: function () {
        return JSON.parse(localStorage.getItem('parkly_session'));
    },

    logout: function () {
        localStorage.removeItem('parkly_session');
        window.location.href = 'index.html';
    }
};

// Forzar re-migración si los datos en localStorage no tienen 'zone'
(function forceZoneMigration() {
    const stored = JSON.parse(localStorage.getItem('parkly_spots'));
    if (stored && stored.some(s => !s.zone)) {
        localStorage.removeItem('parkly_spots');
    }
})();

DB.init();