/* =========================================
   PARKLY — Chatbox Widget JS
   Enlazar antes de </body>:
   <script src="js/chatbox.js"></script>
   ========================================= */

(function () {

    /* ── Referencias al DOM ── */
    const toggle   = document.getElementById('chatbox-toggle');
    const panel    = document.getElementById('chatbox-panel');
    const messages = document.getElementById('chatbox-messages');
    const input    = document.getElementById('chatbox-input');
    const sendBtn  = document.getElementById('chatbox-send');

    /* ════════════════════════════════════════
       BASE DE CONOCIMIENTO — EDITAR AQUÍ
       para entrenar las respuestas del bot
       ════════════════════════════════════════

       Cada entrada tiene:
         keywords : palabras clave que activan la respuesta (minúsculas)
         reply    : HTML de la respuesta del bot
    ═══════════════════════════════════════ */
    const knowledgeBase = [
        {
            keywords: ['find', 'spot', 'available', 'parking', 'buscar', 'disponible', 'parqueadero'],
            reply: '🅿️ Use the <strong>search bar</strong> at the top or activate the <strong>"Available"</strong> filter to see free spots near you in real time.'
        },
        {
            keywords: ['reserve', 'book', 'reservar', 'apartar', 'how'],
            reply: '📋 Easy! Find a spot → click <strong>"Reserve"</strong> → choose your date & time → confirm. You\'ll receive a confirmation right away.'
        },
        {
            keywords: ['ev', 'electric', 'charging', 'carga', 'eléctrico', 'cargador'],
            reply: '⚡ We have <strong>14 EV charging stations</strong> in Bogotá and <strong>6 in Medellín</strong>. Use the <strong>⚡ EV Charging</strong> filter to locate them.'
        },
        {
            keywords: ['price', 'cost', 'pricing', 'rate', 'precio', 'costo', 'tarifa', 'valor'],
            reply: '💳 Rates start at <strong>$3,500 COP/hr</strong>. Monthly plans from <strong>$180,000 COP</strong>. Check each spot card for exact pricing.'
        },
        {
            keywords: ['security', 'safe', 'secure', 'seguro', 'seguridad', 'camara', 'camera'],
            reply: '🔒 All <strong>verified spots</strong> include 24/7 CCTV and on-site security. Look for the <strong>🛡 Verified</strong> badge when searching.'
        },
        {
            keywords: ['24h', '24 hour', '24 horas', 'overnight', 'all night', 'toda la noche'],
            reply: '🕐 Many spots operate <strong>24 hours</strong>. Use the <strong>"24 Hours"</strong> filter to show only those locations.'
        },
        {
            keywords: ['cancel', 'cancelar', 'refund', 'reembolso', 'devolucion', 'devolución'],
            reply: '↩️ Cancellations made <strong>more than 2 hours before</strong> your reservation are fully refunded. Contact support for exceptions.'
        },
        {
            keywords: ['contact', 'human', 'agent', 'support', 'help', 'ayuda', 'soporte', 'contacto', 'persona'],
            reply: '🙋 A human agent will reach you shortly! You can also email us at <strong>support@parkly.co</strong> or call <strong>+57 601 123 4567</strong>.'
        },
        {
            keywords: ['bogota', 'bogotá', 'medellin', 'medellín', 'city', 'ciudad', 'location', 'ubicación'],
            reply: '📍 PARKLY currently operates in <strong>Bogotá</strong> and <strong>Medellín</strong>. More cities coming soon!'
        },
        {
            keywords: ['illuminated', 'iluminado', 'luz', 'light', 'bright'],
            reply: '💡 Filter by <strong>"Illuminated"</strong> to find well-lit spots — ideal for night parking.'
        },
        {
            keywords: ['hello', 'hi', 'hey', 'hola', 'buenos', 'buenas', 'buen dia'],
            reply: '👋 Hey there! How can I help you with your parking today?'
        },
        {
            keywords: ['thanks', 'thank', 'gracias', 'ok', 'perfect', 'perfecto', 'great', 'genial'],
            reply: '😊 You\'re welcome! Let me know if there\'s anything else I can help you with.'
        }
    ];

    /* Respuesta por defecto cuando no hay coincidencia */
    const defaultReply = '🤖 I\'m not sure about that yet. A human agent will follow up shortly. Is there anything else I can help you with?';

    /* ════════════════════════════════════════
       LÓGICA PRINCIPAL
       ════════════════════════════════════════ */

    /* Abrir / Cerrar panel */
    toggle.addEventListener('click', () => {
        const isOpen = panel.classList.toggle('open');
        toggle.classList.toggle('open', isOpen);
        if (isOpen) setTimeout(() => input.focus(), 350);
    });

    /* Scroll al fondo */
    function scrollBottom() {
        messages.scrollTop = messages.scrollHeight;
    }

    /* Crear burbuja de mensaje */
    function addBubble(text, type = 'bot') {
        const div = document.createElement('div');
        div.className = `chat-bubble ${type}`;
        div.innerHTML = text;
        messages.appendChild(div);
        scrollBottom();
        return div;
    }

    /* Indicador de "escribiendo..." */
    function showTyping() {
        const el = document.createElement('div');
        el.className = 'typing-indicator';
        el.innerHTML = '<span></span><span></span><span></span>';
        messages.appendChild(el);
        scrollBottom();
        return el;
    }

    /* Buscar respuesta en la base de conocimiento */
    function findReply(userText) {
        const normalized = userText.toLowerCase();
        for (const entry of knowledgeBase) {
            if (entry.keywords.some(kw => normalized.includes(kw))) {
                return entry.reply;
            }
        }
        return defaultReply;
    }

    /* Simular respuesta del bot */
    function botReply(userText) {
        const typing = showTyping();
        const delay  = 800 + Math.random() * 500; // delay humano natural
        setTimeout(() => {
            typing.remove();
            addBubble(findReply(userText), 'bot');
        }, delay);
    }

    /* Enviar mensaje del usuario */
    function sendMessage() {
        const text = input.value.trim();
        if (!text) return;
        addBubble(text, 'user');
        input.value = '';
        input.style.height = 'auto';
        botReply(text);
    }

    sendBtn.addEventListener('click', sendMessage);

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    /* Auto-resize del textarea */
    input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 100) + 'px';
    });

    /* Quick replies — delegación de eventos */
    messages.addEventListener('click', (e) => {
        if (e.target.classList.contains('quick-reply-btn')) {
            const text = e.target.dataset.msg;
            const qr   = messages.querySelector('.quick-replies');
            if (qr) qr.remove();
            addBubble(text, 'user');
            botReply(text);
        }
    });

})();