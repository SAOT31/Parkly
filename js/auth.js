/**
 * ARCHIVO: js/auth.js
 * DESCRIPCIÓN: Maneja UI de login, registro en pasos y Google Login.
 */

document.addEventListener('DOMContentLoaded', () => {

    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const btnBack = document.getElementById('btn-back');

    // ==========================================
    // 1. LOGIN TRADICIONAL (EMAIL/PASS)
    // ==========================================
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            
            // Llamada asíncrona a MySQL
            const user = await DB.login(email, password);

            if (user) {
                // Redirección por ROL según base de datos
                if (user.role === 'admin') window.location.href = 'admin-dash.html';
                else if (user.role === 'owner') window.location.href = 'owner-dash.html';
                else window.location.href = 'search.html';
            } else {
                const errorMsg = document.getElementById('error-msg');
                if(errorMsg) errorMsg.classList.remove('hidden');
            }
        });
    }

    // ==========================================
    // 2. REGISTRO EN DOS PASOS
    // ==========================================
    if (registerForm) {
        const selectedRoleInput = document.getElementById('selected-role');
        const btnRoleClient = document.getElementById('btn-role-client');
        const btnRoleOwner = document.getElementById('btn-role-owner');

        const goToStep2 = (role) => {
            selectedRoleInput.value = role;
            step1.classList.add('hidden');
            step2.classList.remove('hidden');
            // Aquí podrías llamar a tu función updateProgress(true) si la usas
        };

        if (btnRoleClient) btnRoleClient.addEventListener('click', () => goToStep2('client'));
        if (btnRoleOwner) btnRoleOwner.addEventListener('click', () => goToStep2('owner'));

        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const password = document.getElementById('reg-password').value;
            const confirmPass = document.getElementById('confirm-password').value;

            if (password !== confirmPass) {
                alert("Passwords do not match!");
                return;
            }

            // Objeto listo para la tabla 'users' de MySQL
            const newUser = {
                name: document.getElementById('name').value,
                email: document.getElementById('reg-email').value.trim(),
                password: password,
                role: selectedRoleInput.value || 'client',
                phone: document.getElementById('reg-phone')?.value || null // Campo Phone de DBeaver
            };

            const success = await DB.register(newUser);
            if (success) {
                alert("Account created! Please log in.");
                window.location.href = 'login.html';
            } else {
                alert("Error: Email already exists.");
            }
        });
    }

    // ==========================================
    // 3. BOTÓN DE GOOGLE (Mantenido intacto)
    // ==========================================
    const btnGoogleLogin = document.getElementById('btn-google-login');
    if (btnGoogleLogin) {
        btnGoogleLogin.addEventListener('click', (e) => {
            e.preventDefault();
            // Llama a la lógica en google-auth.js que ya tienes configurada
            if (typeof window.handleGoogleLogin === 'function') {
                window.handleGoogleLogin();
            }
        });
    }

    // Lógica del botón atrás (Back)
    if (btnBack) {
        btnBack.addEventListener('click', () => {
            if (step2 && !step2.classList.contains('hidden')) {
                step2.classList.add('hidden');
                step1.classList.remove('hidden');
            } else {
                window.location.href = 'login.html';
            }
        });
    }
});