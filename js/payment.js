/**
 * ARCHIVO: js/payment.js
 * DESCRIPCIÓN: Abre el widget de Wompi para el pago,
 *              envía comprobante por EmailJS y guarda la reserva.
 */

document.addEventListener('DOMContentLoaded', () => {

    // ── 1. CARGAR DATOS ─────────────────────────────────────────────
    const params  = new URLSearchParams(window.location.search);
    const id      = params.get('id');
    const spots   = JSON.parse(localStorage.getItem('parkly_spots')) || [];
    const spot    = spots.find(s => s.id == id);
    const booking = JSON.parse(localStorage.getItem('parkly_booking'));

    if (!spot) {
        alert('Parqueadero no encontrado.');
        window.location.href = 'search.html';
        return;
    }

    // ── 2. POBLAR RESUMEN ────────────────────────────────────────────
    const set = (elId, text) => {
        const el = document.getElementById(elId);
        if (el) el.textContent = text;
    };

    const sumImg = document.getElementById('summary-img');
    if (sumImg) { sumImg.src = spot.image; sumImg.alt = spot.name; }

    set('summary-name',    spot.name);
    set('summary-address', spot.address);
    set('summary-rate',    `$ ${spot.price.toLocaleString('es-CO')} / hr`);

    let totalAmount = spot.price; // fallback 1 hora

    if (booking && booking.spotId == id) {
        totalAmount = booking.total;

        set('summary-date',     formatDate(booking.date));
        set('summary-time',     `${booking.startTime} – ${booking.endTime}`);
        set('summary-duration', `${booking.hours % 1 === 0 ? booking.hours : booking.hours.toFixed(1)} hr${booking.hours !== 1 ? 's' : ''}`);
        set('summary-subtotal', `$ ${booking.subtotal.toLocaleString('es-CO')}`);
        set('summary-fee',      `$ ${booking.fee.toLocaleString('es-CO')}`);
    } else {
        set('summary-date',     formatDate(new Date().toISOString().split('T')[0]));
        set('summary-time',     '—');
        set('summary-duration', '1 hr');
        set('summary-subtotal', `$ ${spot.price.toLocaleString('es-CO')}`);
        set('summary-fee',      '$ 0');
    }

    set('summary-total', `$ ${totalAmount.toLocaleString('es-CO')}`);
    set('btn-total',     totalAmount.toLocaleString('es-CO'));

    // ── 3. BOTÓN PAGAR CON WOMPI ─────────────────────────────────────
    document.getElementById('btn-pay').addEventListener('click', () => {
        const session = JSON.parse(localStorage.getItem('parkly_session'));

        if (!session) {
            alert('Debes iniciar sesión para completar el pago.');
            window.location.href = 'login.html';
            return;
        }

        const resId = `PK-${Math.floor(Math.random() * 1_000_000)}`;

        // Abrir checkout de Wompi
        const checkout = new WidgetCheckout({
            currency:      'COP',
            amountInCents: totalAmount * 100,
            reference:     resId,
            publicKey:     'pub_test_5YLBFidfXmksfQX5KonhVOD7bmVTeWma',
            customerData: {
                email:    session.email,
                fullName: session.name,
            },
        });

        checkout.open(function(result) {
            if (result.transaction.status === 'APPROVED') {
                ejecutarFlujoExito(session, resId);
            } else {
                alert('Pago no completado: ' + result.transaction.status);
            }
        });
    });

    // ── 4. FLUJO DE ÉXITO ────────────────────────────────────────────
    async function ejecutarFlujoExito(session, resId) {

        // Activar step 3
        const conn2   = document.getElementById('conn2');
        const step3Li = document.getElementById('step3-li');
        if (conn2)   conn2.classList.replace('bg-border', 'bg-primary');
        if (step3Li) {
            step3Li.querySelector('div').classList.remove('border-border', 'text-slate-500');
            step3Li.querySelector('div').classList.add('bg-primary', 'text-white', 'border-primary');
            step3Li.querySelector('span').classList.replace('text-slate-500', 'text-white');
        }

        // Enviar correo con EmailJS
        try {
            await emailjs.send('service_x9pofkj', 'template_pj5pume', {
                user_name:      session.name,
                user_email:     session.email,
                spot_name:      spot.name,
                address:        spot.address,
                total:          totalAmount.toLocaleString('es-CO'),
                duration:       booking?.hours     ?? 1,
                date:           booking?.date      ?? new Date().toLocaleDateString(),
                start_time:     booking?.startTime ?? '—',
                end_time:       booking?.endTime   ?? '—',
                reservation_id: resId,
            });
            console.log('✅ Correo enviado');
        } catch (err) {
            console.error('❌ EmailJS error:', err);
            // Continuamos aunque falle el correo
        }

        // Guardar reserva (con todos los campos para el dashboard)
        const reservations = JSON.parse(localStorage.getItem('parkly_reservations')) || [];
        reservations.push({
            id:             resId,
            spotId:         spot.id,
            spotName:       spot.name,
            address:        spot.address,
            image:          spot.image,
            user:           session.name,
            userEmail:      session.email,
            date:           booking?.date      ?? new Date().toLocaleDateString(),
            startTime:      booking?.startTime ?? '—',
            endTime:        booking?.endTime   ?? '—',
            hours:          booking?.hours     ?? 1,
            amount:         totalAmount,
            payment:        'Wompi',
            status:         'active',
            reviewSubmitted: false,
            bookedAt:       new Date().toISOString(),
        });
        localStorage.setItem('parkly_reservations', JSON.stringify(reservations));

        // Actualizar ganancias del dueño
        const allSpots  = JSON.parse(localStorage.getItem('parkly_spots')) || [];
        const spotIdx   = allSpots.findIndex(s => s.id == spot.id);
        if (spotIdx !== -1) {
            allSpots[spotIdx].earnings = (allSpots[spotIdx].earnings || 0) + totalAmount;
            allSpots[spotIdx].occupiedSpots = (allSpots[spotIdx].occupiedSpots || 0) + 1;
            localStorage.setItem('parkly_spots', JSON.stringify(allSpots));
        }

        // Limpiar booking temporal
        localStorage.removeItem('parkly_booking');

        alert(`¡Pago exitoso! Comprobante enviado a: ${session.email}`);
        window.location.href = 'search.html';
    }
});

function formatDate(dateStr) {
    if (!dateStr) return '—';
    const [y, m, d] = dateStr.split('-');
    const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return `${months[parseInt(m) - 1]} ${parseInt(d)}, ${y}`;
}