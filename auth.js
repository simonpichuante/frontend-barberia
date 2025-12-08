// auth.js - simple UI de login/registro y manejo de usuario (sin JWT)
(function(){
  const AUTH_BACKEND = 'http://localhost:3000';
  const USER_KEY = 'bb_user';

  function el(html){ const template = document.createElement('template'); template.innerHTML = html.trim(); return template.content.firstChild; }

  function setUser(u){ localStorage.setItem(USER_KEY, u); }
  function getUser(){ return localStorage.getItem(USER_KEY); }
  function clearUser(){ localStorage.removeItem(USER_KEY); }

  function renderLogged(usuario){
    const area = document.getElementById('auth-area');
    if (!area) return;
    area.innerHTML = '';
    const node = el(`<div class="auth-logged">Bienvenido, <strong>${usuario}</strong> <button id="logout-btn">Cerrar sesión</button></div>`);
    area.appendChild(node);
    document.getElementById('logout-btn').addEventListener('click', () => {
      clearUser(); window.location.reload();
    });
  }

  function renderLogin(){
    const area = document.getElementById('auth-area');
    area.innerHTML = '';
    const node = el(`
      <div class="auth-box">
        <form id="login-form">
          <input placeholder="Usuario" id="login-usuario" required>
          <input placeholder="Contraseña" id="login-password" type="password" required>
          <button type="submit">Iniciar sesión</button>
        </form>
        <div class="auth-links">¿No tienes cuenta? <a href="#" id="show-register">Regístrate</a></div>
      </div>
    `);
    area.appendChild(node);
    document.getElementById('login-form').addEventListener('submit', async (e)=>{
      e.preventDefault();
      const usuario = document.getElementById('login-usuario').value.trim();
      const password = document.getElementById('login-password').value;
      if (!usuario || password.length < 1) { alert('Usuario y password requeridos'); return; }
      try {
        const res = await fetch(`${AUTH_BACKEND}/auth/login`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usuario, password })
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error((data && (data.error || data.message)) || `Error ${res.status}`);
        // Guardar usuario en localStorage y renderizar
        setUser(data.usuario || usuario);
        await fetchMeAndRender();
        window.dispatchEvent(new Event('auth:login'));
        window.dispatchEvent(new CustomEvent('auth:ready', { detail: { authenticated: true, usuario: data.usuario || usuario } }));
      } catch (err){ alert('Error: '+err.message); }
    });
    document.getElementById('show-register').addEventListener('click', (e)=>{ e.preventDefault(); renderRegister(); });
  }

  function renderRegister(){
    const area = document.getElementById('auth-area');
    area.innerHTML = '';
    const node = el(`
      <div class="auth-box">
        <form id="reg-form">
          <input placeholder="Usuario" id="reg-usuario" required>
          <input placeholder="Email (opcional)" id="reg-email">
          <input placeholder="Contraseña" id="reg-password" type="password" required>
          <button type="submit">Registrar</button>
        </form>
        <div class="auth-links">¿Ya tienes cuenta? <a href="#" id="show-login">Iniciar sesión</a></div>
      </div>
    `);
    area.appendChild(node);
    document.getElementById('reg-form').addEventListener('submit', async (e)=>{
      e.preventDefault();
      const usuario = document.getElementById('reg-usuario').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const password = document.getElementById('reg-password').value;
      if (!usuario || password.length < 6) { alert('Usuario requerido y password mínimo 6 caracteres'); return; }
      try {
        const res = await fetch(`${AUTH_BACKEND}/auth/register`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usuario, email, password })
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error((data && (data.error || data.message)) || `Error ${res.status}`);
        alert('Registrado correctamente. Inicia sesión.');
        renderLogin();
      } catch (err){ alert('Error: '+err.message); }
    });
    document.getElementById('show-login').addEventListener('click', (e)=>{ e.preventDefault(); renderLogin(); });
  }

  async function fetchMeAndRender(){
    const usuario = getUser();
    if (!usuario) { renderLogin(); window.dispatchEvent(new CustomEvent('auth:ready', { detail: { authenticated: false } })); return; }
    try {
      renderLogged(usuario);
      window.dispatchEvent(new CustomEvent('auth:ready', { detail: { authenticated: true, usuario } }));
    } catch (e) { clearUser(); renderLogin(); window.dispatchEvent(new CustomEvent('auth:ready', { detail: { authenticated: false } })); }
  }

  // Parche simple de fetch para añadir Authorization cuando llamamos al API backend (puede ajustarse)
  (function(){
    const originalFetch = window.fetch.bind(window);
    window.fetch = async function(input, init){
      try {
        let url = (typeof input === 'string') ? input : input.url;
        const token = null; // no usamos token en este flujo
        if (token && url && (url.includes('/api') || url.startsWith('http://localhost:3000') || url.startsWith('http://localhost:4000') )){
          init = init || {};
          init.headers = init.headers || {};
          if (init.headers && !(init.headers instanceof Headers)){
            init.headers['Authorization'] = 'Bearer '+token;
          } else if (init.headers instanceof Headers){
            init.headers.set('Authorization','Bearer '+token);
          }
        }
        return originalFetch(input, init);
      } catch (e){ return originalFetch(input, init); }
    };
  })();

  // Inicializar
  document.addEventListener('DOMContentLoaded', ()=>{ fetchMeAndRender(); });
})();
