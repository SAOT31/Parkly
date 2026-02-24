/* =========================================
   PARKLY — Chatbox Widget JS
   Modo 1: Quick Replies (mensajes quemados)
   Modo 2: IA libre (conecta con backend)
   ========================================= */

(function () {

    /* ── CONFIGURACIÓN ── */
    const API_URL = "http://localhost:3000/chat";

    /* ── Estado ── */
    let mode       = "quick"; // "quick" | "ai"
    let aiHistory  = [];      // historial para el backend

    /* ── DOM ── */
    const toggle         = document.getElementById("chatbox-toggle");
    const panel          = document.getElementById("chatbox-panel");
    const messages       = document.getElementById("chatbox-messages");
    const input          = document.getElementById("chatbox-input");
    const sendBtn        = document.getElementById("chatbox-send");
    const inputArea      = document.getElementById("chat-input-area");
    const quickOptions   = document.getElementById("quick-options");
    const backBtn        = document.getElementById("back-btn");
    const modeBadge      = document.getElementById("mode-badge");

    /* ─────────────────────────────────────────
       MENSAJES QUEMADOS POR TOPIC
    ───────────────────────────────────────── */
    const FLOWS = {
        find: [
            { from: "bot",  text: "🔍 Sure! To find available parking near you, use the <strong>search bar</strong> at the top of the page." },
            { from: "bot",  text: "You can filter by <strong>zone</strong>, <strong>price/hr</strong>, and features like EV charging or 24h access." },
            { from: "bot",  text: "Spots marked <span style='color:#22c55e;font-weight:600'>Available</span> are ready to book right now. Need help narrowing it down?" },
        ],
        reserve: [
            { from: "bot",  text: "📅 Making a reservation is easy! Click on any parking card and then hit <strong>Reserve</strong>." },
            { from: "bot",  text: "Pick your <strong>date, start time and duration</strong>. The total cost will show before you confirm." },
            { from: "bot",  text: "Once confirmed, you'll get a <strong>booking code</strong> by email. Show it at the entrance. Anything unclear?" },
        ],
        payment: [
            { from: "bot",  text: "💳 Parkly accepts <strong>credit & debit cards</strong> (Visa, Mastercard, Amex) and <strong>digital wallets</strong>." },
            { from: "bot",  text: "Your invoice is automatically sent to your registered email after each booking." },
            { from: "bot",  text: "For refunds, go to <strong>My Reservations → Cancel</strong>. Refunds take 3–5 business days. Need more help?" },
        ],
        cancel: [
            { from: "bot",  text: "🔄 To cancel, open the <strong>My Reservations</strong> section from your profile menu." },
            { from: "bot",  text: "Select the booking and tap <strong>Cancel Reservation</strong>. Free cancellations are allowed up to <strong>1 hour before</strong> the start time." },
            { from: "bot",  text: "After that window, a small fee may apply depending on the parking policy. Want to know anything else?" },
        ],
        account: [
            { from: "bot",  text: "👤 For login issues, try <strong>Forgot Password</strong> on the login screen — we'll send a reset link." },
            { from: "bot",  text: "If your account is locked or you can't access your email, contact us at <strong>soporte@parkly.co</strong>." },
            { from: "bot",  text: "You can update your profile info, notification settings and linked cards from the <strong>Settings</strong> tab. Anything else?" },
        ],
    };

    /* ─────────────────────────────────────────
       HELPERS
    ───────────────────────────────────────── */
    function scrollBottom() {
        messages.scrollTop = messages.scrollHeight;
    }

    function addBubble(html, type = "bot", animate = true) {
        const div = document.createElement("div");
        div.className = `chat-bubble ${type}${animate ? " bubble-in" : ""}`;
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

    /* Elimina las opciones rápidas del DOM */
    function removeQuickOptions() {
        if (quickOptions && quickOptions.parentNode) {
            quickOptions.style.opacity = "0";
            quickOptions.style.transform = "translateY(6px)";
            setTimeout(() => quickOptions.remove(), 250);
        }
    }

    /* Muestra el input area con animación */
    function showInputArea() {
        inputArea.style.display = "flex";
        requestAnimationFrame(() => inputArea.classList.add("visible"));
        setTimeout(() => input.focus(), 100);
    }

    /* Actualiza el badge de modo */
    function setModeBadge(isAI) {
        modeBadge.innerHTML = isAI
            ? `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                   <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
               </svg><span>AI Mode</span>`
            : `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                   <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
               </svg><span>Quick Replies</span>`;
        modeBadge.classList.toggle("ai-active", isAI);
    }

    /* ─────────────────────────────────────────
       MODO 1: QUICK REPLIES (flows)
    ───────────────────────────────────────── */
    async function runFlow(topic) {
        const steps = FLOWS[topic];
        if (!steps) return;

        removeQuickOptions();
        showInputArea();
        mode = "quick";
        setModeBadge(false);

        for (let i = 0; i < steps.length; i++) {
            await delay(i === 0 ? 400 : 900);
            const typing = showTyping();
            await delay(800);
            typing.remove();
            addBubble(steps[i].text, steps[i].from);
        }

        // Al final de cada flow, ofrecer continuar con IA
        await delay(1000);
        const typing = showTyping();
        await delay(700);
        typing.remove();

        const followUp = document.createElement("div");
        followUp.className = "chat-bubble bot bubble-in";
        followUp.innerHTML = `
            Still have questions? 
            <button class="inline-ai-btn" id="inline-ai-btn">✨ Ask AI directly</button>
        `;
        messages.appendChild(followUp);
        scrollBottom();

        document.getElementById("inline-ai-btn")?.addEventListener("click", activateAIMode);
    }

    /* ─────────────────────────────────────────
       MODO 2: IA LIBRE
    ───────────────────────────────────────── */
    function activateAIMode() {
        mode = "ai";
        setModeBadge(true);
        removeQuickOptions();
        showInputArea();

        // Mensaje de transición
        const typing = showTyping();
        setTimeout(() => {
            typing.remove();
            addBubble(
                "✨ <strong>AI mode activated.</strong> You can now ask me anything about Parkly — reservations, payments, parking availability, or account help. Go ahead!",
                "bot"
            );
        }, 900);
    }

    async function getAIReply(userText) {
        aiHistory.push({ role: "user", content: userText });

        const typing = showTyping();
        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: userText, history: aiHistory }),
            });

            if (!response.ok) throw new Error("Servidor no respondió");

            const data = await response.json();
            typing.remove();
            addBubble(data.reply, "bot");

            // Guardar respuesta en historial
            aiHistory.push({ role: "assistant", content: data.reply });

            // Limitar historial a 20 mensajes
            if (aiHistory.length > 20) aiHistory = aiHistory.slice(-20);

        } catch (err) {
            typing.remove();
            console.error("Error IA:", err);
            addBubble("⚠️ Couldn't connect to the assistant. Please try again.", "bot");
        }
    }

    /* ─────────────────────────────────────────
       EVENTOS
    ───────────────────────────────────────── */

    /* Botones de opciones rápidas */
    document.addEventListener("click", (e) => {
        const btn = e.target.closest(".quick-btn");
        if (!btn) return;

        const topic = btn.dataset.topic;
        if (topic === "ai") {
            activateAIMode();
        } else {
            runFlow(topic);
        }
    });

    /* Botón volver al menú */
    backBtn.addEventListener("click", () => {
        // Limpiar chat y volver al estado inicial
        messages.innerHTML = `
            <div class="chat-bubble bot welcome-bubble bubble-in">
                👋 Hey! I'm the <strong>PARKLY assistant</strong>.<br>
                How can I help you today?
            </div>
        `;
        // Re-insertar opciones rápidas
        const opts = buildQuickOptions();
        messages.appendChild(opts);

        inputArea.classList.remove("visible");
        setTimeout(() => { inputArea.style.display = "none"; }, 300);

        mode = "quick";
        aiHistory = [];
        setModeBadge(false);
    });

    function buildQuickOptions() {
        const topics = [
            { topic: "find",    icon: "🔍", title: "Find a parking spot",      sub: "Search available spaces near you" },
            { topic: "reserve", icon: "📅", title: "Make a reservation",        sub: "Book a spot in advance" },
            { topic: "payment", icon: "💳", title: "Payment & billing",         sub: "Methods, invoices, refunds" },
            { topic: "cancel",  icon: "🔄", title: "Cancel a reservation",      sub: "Modify or cancel your booking" },
            { topic: "account", icon: "👤", title: "Account & access",          sub: "Login issues, settings" },
        ];

        const wrap = document.createElement("div");
        wrap.className = "quick-options";
        wrap.id = "quick-options";

        wrap.innerHTML = `<p class="quick-options-label">Choose a topic:</p>` +
            topics.map(t => `
                <button class="quick-btn" data-topic="${t.topic}">
                    <span class="quick-icon">${t.icon}</span>
                    <div><strong>${t.title}</strong><small>${t.sub}</small></div>
                </button>
            `).join("") +
            `<button class="quick-btn ai-btn" data-topic="ai">
                <span class="quick-icon ai-glow">✨</span>
                <div><strong>Ask AI assistant</strong><small>Chat freely with our AI</small></div>
                <span class="ai-chip">AI</span>
            </button>`;

        return wrap;
    }

    /* Abrir / cerrar chat */
    toggle.addEventListener("click", () => {
        const isOpen = panel.classList.toggle("open");
        toggle.classList.toggle("open", isOpen);
        if (isOpen && mode === "ai") setTimeout(() => input.focus(), 350);
    });

    /* Enviar mensaje (solo en modo AI) */
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
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    input.addEventListener("input", () => {
        input.style.height = "auto";
        input.style.height = Math.min(input.scrollHeight, 100) + "px";
    });

})();