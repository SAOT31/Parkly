/* =========================================
   PARKLY — Chatbox Widget JS (IA Backend)
   ========================================= */

(function () {

    /* ── CONFIGURACIÓN ── */
    const API_URL = "http://localhost:3000/chat";

    /* ── Referencias DOM ── */
    const toggle   = document.getElementById('chatbox-toggle');
    const panel    = document.getElementById('chatbox-panel');
    const messages = document.getElementById('chatbox-messages');
    const input    = document.getElementById('chatbox-input');
    const sendBtn  = document.getElementById('chatbox-send');

    /* ── Abrir / cerrar chat ── */
    toggle.addEventListener('click', () => {
        const isOpen = panel.classList.toggle('open');
        toggle.classList.toggle('open', isOpen);
        if (isOpen) setTimeout(() => input.focus(), 350);
    });

    /* Scroll automático */
    function scrollBottom() {
        messages.scrollTop = messages.scrollHeight;
    }

    /* Crear burbuja */
    function addBubble(text, type = 'bot') {
        const div = document.createElement('div');
        div.className = `chat-bubble ${type}`;
        div.innerHTML = text;
        messages.appendChild(div);
        scrollBottom();
        return div;
    }

    /* Indicador escribiendo */
    function showTyping() {
        const el = document.createElement('div');
        el.className = 'typing-indicator';
        el.innerHTML = '<span></span><span></span><span></span>';
        messages.appendChild(el);
        scrollBottom();
        return el;
    }

    /* ── LLAMADA A BACKEND IA ── */
    async function getAIReply(userText) {

        const typing = showTyping();

        try {

            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    message: userText
                })
            });

            if (!response.ok) {
                throw new Error("Servidor no respondió");
            }

            const data = await response.json();

            typing.remove();
            addBubble(data.reply, "bot");

        } catch (error) {
            typing.remove();
            console.error("Error IA:", error);
            addBubble("Hubo un error al conectar con el asistente.", "bot");
        }
    }

    /* Enviar mensaje */
    function sendMessage() {
        const text = input.value.trim();
        if (!text) return;

        addBubble(text, 'user');

        input.value = '';
        input.style.height = 'auto';

        getAIReply(text);
    }

    sendBtn.addEventListener('click', sendMessage);

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    /* Auto resize textarea */
    input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 100) + 'px';
    });

})();