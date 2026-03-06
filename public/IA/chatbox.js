/* =========================================
   PARKLY — Chatbox Widget JS
   Modo 1: Quick Replies (opciones 1-4)
   Modo 2: IA libre (conecta con backend)
   ========================================= */

(function () {

    /* ── CONFIGURACIÓN ── */
    const API_URL = "/api/chat";

    /* ── Estado ── */
    let mode      = "menu"; // "menu" | "ai"
    let aiHistory = [];

    /* ── DOM ── */
    const toggle     = document.getElementById("chatbox-toggle");
    const panel      = document.getElementById("chatbox-panel");
    const messages   = document.getElementById("chatbox-messages");
    const input      = document.getElementById("chatbox-input");
    const sendBtn    = document.getElementById("chatbox-send");
    const inputArea  = document.getElementById("chat-input-area");
    const backBtn    = document.getElementById("back-btn");
    const modeBadge  = document.getElementById("mode-badge");

    /* ─────────────────────────────────────────
       MENSAJES QUEMADOS — opciones 1 a 4
       Solo información real del app
    ───────────────────────────────────────── */
    const FLOWS = {
        1: [
            { text: "🔍 Usa la <strong>barra de búsqueda</strong> en la parte superior para buscar por nombre, dirección o zona." },
            { text: "En el panel izquierdo filtra por <strong>zona</strong>, <strong>precio máximo/hr</strong> y características: EV charging, 24h, seguridad, iluminado o verificado." },
            { text: "Las tarjetas muestran badge <span style='color:#22c55e;font-weight:600'>Available</span> u <span style='color:#ef4444;font-weight:600'>Occupied</span>. Ordena por nombre, menor precio o mejor calificación." },
        ],
        2: [
            { text: "📅 Haz clic en cualquier tarjeta de parqueadero para abrir su página de detalle." },
            { text: "Selecciona <strong>fecha, hora de inicio y duración</strong>. El costo total se calcula automáticamente según la tarifa por hora." },
            { text: "Al confirmar, tu reserva queda registrada con estado <strong>pendiente</strong> y aparece en el panel de reservas del dashboard." },
        ],
        3: [
            { text: "💳 El pago se procesa desde la <strong>página de pago</strong> al confirmar tu reserva." },
            { text: "El total se calcula con base en la <strong>tarifa por hora</strong> del parqueadero y la duración que elegiste." },
            { text: "Para cancelar, cambia el estado de tu reserva a <strong>Cancelado</strong> desde el <strong>Dashboard</strong>." },
        ],
        4: [
            { text: "👤 Para ingresar, ve a <strong>Login</strong> con tu email y contraseña registrados." },
            { text: "¿No tienes cuenta? Usa <strong>Register</strong> e ingresa tu nombre, email y teléfono." },
            { text: "Si eres propietario de un parqueadero, accede al <strong>Owner Dashboard</strong> para gestionar tus espacios y reservas." },
        ],
    };

    /* ─────────────────────────────────────────
       HELPERS
    ───────────────────────────────────────── */
    function scrollBottom() {
        messages.scrollTop = messages.scrollHeight;
    }

    function addBubble(html, type = "bot") {
        const div = document.createElement("div");
        div.className = `chat-bubble ${type} bubble-in`;
        div.innerHTML = html;
        messages.appendChild(div);
        scrollBottom();
        return div;
    }

    function showTyping() {
        const el = document.createElement("div");
        el.className = "typing-indicator";
        el.innerHTML = "<span></span><span></span><span></span>";
        messages.appendChild(el);
        scrollBottom();
        return el;
    }

    function delay(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    function showInputArea() {
        inputArea.style.display = "flex";
        requestAnimationFrame(() => inputArea.classList.add("visible"));
        setTimeout(() => input.focus(), 100);
    }

    function hideInputArea() {
        inputArea.classList.remove("visible");
        setTimeout(() => { inputArea.style.display = "none"; }, 300);
    }

    function setModeBadge(isAI) {
        const star = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
        modeBadge.innerHTML = isAI
            ? `${star}<span>AI Mode</span>`
            : `${star}<span>Quick Replies</span>`;
        modeBadge.classList.toggle("ai-active", isAI);
    }

    /* ─────────────────────────────────────────
       MENÚ PRINCIPAL
    ───────────────────────────────────────── */
    function buildMenu() {
        const wrap = document.createElement("div");
        wrap.className = "quick-options";
        wrap.id = "quick-options";
        wrap.innerHTML = `
            <p class="quick-options-label">¿En qué te ayudo?</p>
            <button class="quick-btn" data-flow="1">
                <span class="quick-icon">🔍</span>
                <div><strong>1. Buscar parqueadero</strong><small>Filtros, zonas y disponibilidad</small></div>
            </button>
            <button class="quick-btn" data-flow="2">
                <span class="quick-icon">📅</span>
                <div><strong>2. Hacer una reserva</strong><small>Pasos para reservar un cupo</small></div>
            </button>
            <button class="quick-btn" data-flow="3">
                <span class="quick-icon">💳</span>
                <div><strong>3. Pagos y cancelaciones</strong><small>Cómo funciona el pago</small></div>
            </button>
            <button class="quick-btn" data-flow="4">
                <span class="quick-icon">👤</span>
                <div><strong>4. Cuenta y acceso</strong><small>Login, registro, owner dashboard</small></div>
            </button>
            <button class="quick-btn ai-btn" data-flow="ai">
                <span class="quick-icon ai-glow">✨</span>
                <div><strong>Hablar con la IA</strong><small>Chat libre con el asistente</small></div>
                <span class="ai-chip">AI</span>
            </button>
        `;
        return wrap;
    }

    function resetToMenu() {
        messages.innerHTML = `
            <div class="chat-bubble bot welcome-bubble bubble-in">
                👋 Hola, soy el asistente de <strong>PARKLY</strong>.<br>
                ¿Cómo te puedo ayudar?
            </div>
        `;
        messages.appendChild(buildMenu());
        hideInputArea();
        mode = "menu";
        aiHistory = [];
        setModeBadge(false);
    }

    /* ─────────────────────────────────────────
       MODO 1: QUICK REPLIES
    ───────────────────────────────────────── */
    async function runFlow(num) {
        const steps = FLOWS[num];
        if (!steps) return;

        // Quitar menú del DOM
        const opts = document.getElementById("quick-options");
        if (opts) opts.remove();

        for (let i = 0; i < steps.length; i++) {
            await delay(i === 0 ? 400 : 900);
            const t = showTyping();
            await delay(800);
            t.remove();
            addBubble(steps[i].text, "bot");
        }

        await delay(900);
        const t = showTyping();
        await delay(600);
        t.remove();

        const followUp = document.createElement("div");
        followUp.className = "chat-bubble bot bubble-in";
        followUp.innerHTML = `¿Necesitas algo más? <button class="inline-ai-btn" id="btn-back-menu">← Volver al menú</button>`;
        messages.appendChild(followUp);
        scrollBottom();
        document.getElementById("btn-back-menu")?.addEventListener("click", resetToMenu);
    }

    /* ─────────────────────────────────────────
       MODO 2: IA LIBRE
    ───────────────────────────────────────── */
    function activateAIMode() {
        mode = "ai";
        setModeBadge(true);
        const opts = document.getElementById("quick-options");
        if (opts) opts.remove();
        showInputArea();

        const t = showTyping();
        setTimeout(() => {
            t.remove();
            addBubble("✨ <strong>Modo IA activado.</strong> Puedes preguntarme lo que quieras sobre Parkly. ¡Adelante!", "bot");
        }, 900);
    }

    async function getAIReply(userText) {
        aiHistory.push({ role: "user", content: userText });
        const t = showTyping();
        try {
            const res = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: userText, history: aiHistory }),
            });
            if (!res.ok) throw new Error();
            const data = await res.json();
            t.remove();
            addBubble(data.reply, "bot");
            aiHistory.push({ role: "assistant", content: data.reply });
            if (aiHistory.length > 20) aiHistory = aiHistory.slice(-20);
        } catch {
            t.remove();
            addBubble("⚠️ No se pudo conectar con el asistente. Intenta de nuevo.", "bot");
        }
    }

    /* ─────────────────────────────────────────
       EVENTOS
    ───────────────────────────────────────── */
    document.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-flow]");
        if (!btn) return;
        const flow = btn.dataset.flow;
        if (flow === "ai") {
            activateAIMode();
        } else {
            runFlow(flow);
        }
    });

    backBtn.addEventListener("click", resetToMenu);

    toggle.addEventListener("click", () => {
        const isOpen = panel.classList.toggle("open");
        toggle.classList.toggle("open", isOpen);
        if (isOpen && mode === "ai") setTimeout(() => input.focus(), 350);
    });

    function sendMessage() {
        if (mode !== "ai") return;
        const text = input.value.trim();
        if (!text) return;
        addBubble(text, "user");
        input.value = "";
        input.style.height = "auto";
        getAIReply(text);
    }

    sendBtn.addEventListener("click", sendMessage);
    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    input.addEventListener("input", () => {
        input.style.height = "auto";
        input.style.height = Math.min(input.scrollHeight, 100) + "px";
    });

    /* ── INICIALIZACIÓN ── */
    // El menú ya viene en el HTML, solo aseguramos que el input esté oculto
    inputArea.style.display = "none";

})();
