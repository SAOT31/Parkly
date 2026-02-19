/**
 * ARCHIVO: js/app.js
 * DESCRIPCIÓN: Lógica global para los botones del Navbar (Modo Oscuro, Navegación y Logout).
 * Comentarios en español, código en inglés.
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. BOTÓN DE MODO OSCURO (#theme-toggle) ---
    const html = document.documentElement;
    const themeBtn = document.getElementById('theme-toggle');

    /**
     * FUNCIÓN: syncThemeUI
     * DESCRIPCIÓN: Cambia el icono (Sol/Luna) según el estado del tema.
     */
    const syncThemeUI = () => {
        if (!themeBtn) return;
        const isDark = html.classList.contains('dark');
        // Si está oscuro, ponemos el sol para cambiar a claro. Si está claro, ponemos la luna.
        themeBtn.innerHTML = isDark 
            ? '<i data-lucide="sun" class="h-5 w-5 text-yellow-400"></i>' 
            : '<i data-lucide="moon" class="h-5 w-5 text-slate-400"></i>';
        lucide.createIcons();
    };

    // Aplicar el tema guardado en localStorage al cargar la página
    const savedTheme = localStorage.getItem('parkly_theme') || 'dark';
    html.classList.toggle('dark', savedTheme === 'dark');
    syncThemeUI();

    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            const isNowDark = html.classList.toggle('dark');
            localStorage.setItem('parkly_theme', isNowDark ? 'dark' : 'light');
            syncThemeUI();
        });
    }

    // --- 2. BOTÓN DE NAVEGACIÓN A SEARCH (#btn-nav-search) ---
    // Este es el botón azul que está en el Navbar de Admin.
    const navSearchBtn = document.getElementById('btn-nav-search');
    if (navSearchBtn) {
        navSearchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Redirige a la vista de búsqueda de parqueaderos
            window.location.href = 'search.html';
        });
    }

    // --- 3. BOTÓN DE LOGOUT (#btn-logout) ---
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if(confirm("Are you sure you want to log out?")) {
                localStorage.removeItem('parkly_session');
                window.location.href = 'index.html';
            }
        });
    }
});