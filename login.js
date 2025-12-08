// login.js - formulario de login simple y gestión de usuario (página independiente)
(function(){
  const SCRIPT_VERSION = '1.1.0';
  console.info('[login.js] version', SCRIPT_VERSION);

  // Probar primero ruta relativa (para que Vite dev server la proxee), luego hosts directos
  const CANDIDATE_BASES = ['', 'http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:4000'];
  const USER_KEY = 'bb_user';

  function el(html){ const template = document.createElement('template'); template.innerHTML = html.trim(); return template.content.firstChild; }
  function setUser(u){ localStorage.setItem(USER_KEY, u); }
  function getUser(){ return localStorage.getItem(USER_KEY); }
  function clearUser(){ localStorage.removeItem(USER_KEY); }

  // Parche de fetch mínimo (no añadimos Authorization en este modo)
  (function(){
    const originalFetch = window.fetch.bind(window);
    window.fetch = async function(input, init){
      try { return originalFetch(input, init); } catch (e){ return originalFetch(input, init); }
    };
  })();

  // Ejecuta el login: probar múltiples bases hasta que una responda
  async function doLogin() {
    const usuarioEl = document.getElementById('login-usuario');
    const passwordEl = document.getElementById('login-password');
    if (!usuarioEl || !passwordEl) return;
    const usuario = usuarioEl.value.trim();
    const password = passwordEl.value;
    if (!usuario || !password) { alert('Usuario y password requeridos'); return; }

    const payload = { usuario, password };
    let finalErr = null;

    console.debug('[login] candidate bases:', CANDIDATE_BASES);

    for (const base of CANDIDATE_BASES) {
      const baseUrl = (base === '') ? '' : base.replace(/\/$/, '');
      try {
        // health check
        try {
          const healthUrl = (baseUrl === '') ? '/health' : `${baseUrl}/health`;
          const healthRes = await fetch(healthUrl);
          const healthText = await healthRes.text().catch(() => null);
          console.debug('[login] health', healthUrl, healthRes.status, healthText);
          if (!healthRes.ok) {
            finalErr = `Health ${healthUrl}: ${healthRes.status} ${healthRes.statusText}` + (healthText ? ' - ' + healthText : '');
            continue; // probar siguiente base
          }
        } catch (hErr) {
          console.warn('[login] health request error for', baseUrl, hErr && hErr.message ? hErr.message : hErr);
          finalErr = hErr && hErr.message ? hErr.message : hErr;
          continue; // probar siguiente base
        }

        // intentar login
        const url = `${baseUrl}/auth/login`;
        console.debug('[login] intentando POST a', url);
        const res = await fetch(url, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const contentType = res.headers.get('content-type') || '';
        const text = await res.text().catch(() => null);
        let data = null;
        try { data = text ? JSON.parse(text) : null; } catch (_) { data = null; }

        // Si la respuesta es HTML, muy probable que estemos recibiendo la página del dev server (Vite)
        if (contentType.includes('text/html') || (typeof text === 'string' && text.trim().startsWith('<!DOCTYPE html'))) {
          const hint = `La respuesta parece ser HTML (probablemente el servidor de frontend). URL: ${url}. Respuesta: ${text ? text.slice(0,200) : '<<empty>>'}`;
          console.warn('[login] posible respuesta HTML (dev server) detectada', hint);
          alert('Login falló: la respuesta del servidor parece ser una página HTML del servidor de desarrollo (Vite). Esto significa que la petición no está llegando al backend.\n\nComprueba que el backend esté arrancado en uno de estos hosts:\n' + CANDIDATE_BASES.join(', ') + '\n\nAdemás, en DevTools > Network revisa la petición POST y confirma la URL exacta solicitada.\n\nDetalle: ' + (text ? text.slice(0,1000) : 'sin cuerpo'));
          return;
        }

        if (!res.ok) {
          const msg = (data && (data.error || data.message)) || text || `${res.status} ${res.statusText}`;
          // Si el servidor respondió 4xx/5xx no probamos otras bases: hay backend activo pero rechazó
          alert('Login falló: ' + msg);
          return;
        }

        if (data && data.ok) {
          setUser(data.usuario || usuario);
          window.location.href = 'index.html';
          return;
        }

        finalErr = 'Respuesta inesperada del servidor: ' + (text || JSON.stringify(data) || String(res.status));
        continue;
      } catch (err) {
        console.warn('[login] error de red probando', base, err && err.message ? err.message : err);
        finalErr = err && err.message ? err.message : err;
        continue;
      }
    }

    // Si ninguna base respondió correctamente
    console.error('[login] ninguna base respondió correctamente', finalErr);
    alert('Login falló: Ningún backend respondió correctamente. Detalle: ' + (finalErr && finalErr.message ? finalErr.message : finalErr));
  }

  // Enlazar submit/click
  function attachLoginForm() {
    const form = document.getElementById('login-form');
    if (!form) return;
    form.addEventListener('submit', async (e) => { e.preventDefault(); await doLogin(); });
    const btn = document.getElementById('login-submit');
    if (btn) btn.addEventListener('click', async (e) => { e.preventDefault(); await doLogin(); });
  }

  document.addEventListener('DOMContentLoaded', () => { attachLoginForm(); });
})();
