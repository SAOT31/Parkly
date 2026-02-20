/**
 * ARCHIVO: js/data.js
 * DESCRIPCIÓN: Simulación de base de datos con persistencia en LocalStorage.
 * Contiene los métodos para validar usuarios, registrar perfiles y gestionar parqueaderos.
 */

const DB = {
    // 6 spots iniciales según el diseño
    initialSpots: [
        { id: 1, name: "Garaje Moderno Sur", address: "Av 68 #22-15, Restrepo", price: 3500, verified: false, available: true, rating: 3.9, earnings: 15000, image: "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=600" },
        { id: 2, name: "Parking Express Centro", address: "Cra 10 #16-80, Candelaria", price: 4000, verified: false, available: true, rating: 3.5, earnings: 20000, image: "https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?w=600" },
        { id: 3, name: "Parqueadero Central Plaza", address: "Cra 7 #45-12, Zona T", price: 5000, verified: true, available: true, rating: 4.8, earnings: 30000, image: "https://images.unsplash.com/photo-1621929747188-0b4b8f302e1f?w=600" },
        { id: 4, name: "EcoParking Verde", address: "Cra 15 #93-20, Chico", price: 6000, verified: true, available: true, rating: 4.2, earnings: 12000, image: "https://images.unsplash.com/photo-1590674899505-1c5c4195c60c?w=600" },
        { id: 5, name: "Parking Elite Norte", address: "Calle 100 #15-30, Usaquen", price: 7000, verified: true, available: true, rating: 4.5, earnings: 42000, image: "https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?w=600" },
        { id: 6, name: "ParkTech Premium", address: "Calle 85 #11-50, Chapinero", price: 8000, verified: true, available: false, rating: 4.9, earnings: 0, image: "https://images.unsplash.com/photo-1621929747188-0b4b8f302e1f?w=600" }
    ],

    init: function() {
        // Inicializar parqueaderos
        if (!localStorage.getItem('parkly_spots')) {
            localStorage.setItem('parkly_spots', JSON.stringify(this.initialSpots));
        }
        
        // Cuentas por defecto (Admin, Propietario, Cliente)
        const defaultUsers = [
            { id: 1, name: "Admin PARKLY", email: "admin@parkly.co", password: "admin123", role: "admin" },
            { id: 2, name: "Maria Owner", email: "maria@email.com", password: "123456", role: "owner" },
            { id: 3, name: "Carlos Client", email: "carlos@email.com", password: "123456", role: "client" }
        ];

        if (!localStorage.getItem('parkly_users')) {
            localStorage.setItem('parkly_users', JSON.stringify(defaultUsers));
        }
    },

    // MÉTODO DE LOGIN (Indispensable para auth.js)
    login: function(email, password) {
        const users = JSON.parse(localStorage.getItem('parkly_users')) || [];
        const user = users.find(u => u.email === email && u.password === password);
        if (user) {
            // Guardar sesión en LocalStorage
            localStorage.setItem('parkly_session', JSON.stringify({
                username: user.name,
                email: user.email,
                role: user.role
            }));
            return user;
        }
        return null;
    },

    // MÉTODO DE REGISTRO (Indispensable para crear nuevos roles)
    register: function(newUser) {
        const users = JSON.parse(localStorage.getItem('parkly_users')) || [];
        newUser.id = Date.now();
        users.push(newUser);
        localStorage.setItem('parkly_users', JSON.stringify(users));
        localStorage.setItem('parkly_session', JSON.stringify(newUser));
        return newUser;
    },

    getSession: function() {
        return JSON.parse(localStorage.getItem('parkly_session'));
    },

    logout: function() {
        localStorage.removeItem('parkly_session');
        window.location.href = 'index.html';
    }
};

DB.init();