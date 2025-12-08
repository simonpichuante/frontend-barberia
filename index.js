document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('main-content');
    const API_BASE_URL = 'http://localhost:3000/api';
    const AUTH_BACKEND = 'http://localhost:3000';

    // Parche de fetch (no añadimos Authorization en este modo)
    (function(){
        const originalFetch = window.fetch.bind(window);
        window.fetch = async function(input, init) {
            try {
                return originalFetch(input, init);
            } catch (e) { return originalFetch(input, init); }
        };
    })();

    // estado de autenticación
    let isAuthenticated = true;
    // Inicio inmediato de la aplicación
    (function init() {
        showClientes();
    })();

    // --- NAVEGACIÓN ---
    const navLinks = {
        'nav-clientes': showClientes,
        'nav-barberos': showBarberos,
        'nav-servicios': showServicios,
        'nav-citas': showCitas,
        'nav-agenda': showAgenda,
    };

    Object.keys(navLinks).forEach(id => {
        document.getElementById(id).addEventListener('click', (e) => {
            e.preventDefault();
            if (!isAuthenticated) { alert('Por favor inicia sesión para continuar'); return; }
            navLinks[id]();
        });
    });

    // Añadir enlace de reportes dinámicamente
    const navReportes = document.createElement('li');
    navReportes.innerHTML = `<a href="#" id="nav-reportes">Reportes</a>`;
    document.querySelector('nav ul').appendChild(navReportes);
    document.getElementById('nav-reportes').addEventListener('click', (e) => { e.preventDefault(); if (!isAuthenticated) { alert('Por favor inicia sesión para continuar'); return; } showReportes(); });

    // Renderizar area de autenticación (usuario + logout)
    // renderAuthArea ya no muestra nada en index (el HTML fue eliminado). Mantenemos una función vacía
    function renderAuthArea(usuario) {
        // Intencionalmente vacío: no mostramos usuario ni botón de logout en la cabecera del index.
    }

    // --- UTILIDADES ---
    function updateNav(activeId) {
        document.querySelectorAll('nav ul li a').forEach(link => {
            link.classList.remove('active');
        });
        const activeLink = document.getElementById(activeId);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }

    // Normaliza claves de objetos a snake_case en minúsculas (maneja camelCase, PascalCase, espacios y guiones)
    function toSnakeCaseKey(key) {
        if (typeof key !== 'string') return key;
        // Reemplaza espacios y guiones por guion bajo
        let k = key.replace(/[\s-]+/g, '_');
        // Inserta guion bajo entre minúscula y mayúscula (camel/pascal)
        k = k.replace(/([a-z\d])([A-Z])/g, '$1_$2');
        // Inserta guion bajo entre letras y números
        k = k.replace(/([A-Za-z])([0-9])/g, '$1_$2').replace(/([0-9])([A-Za-z])/g, '$1_$2');
        // Normaliza múltiples guiones bajos y pasa a minúsculas
        k = k.replace(/__+/g, '_').toLowerCase();
        return k;
    }

    // Función para convertir las claves de un objeto (o array de objetos) a snake_case minúsculas de forma recursiva
    function convertKeysToLowerCase(obj) {
        if (Array.isArray(obj)) {
            return obj.map(item => convertKeysToLowerCase(item));
        } else if (typeof obj === 'object' && obj !== null) {
            return Object.keys(obj).reduce((acc, key) => {
                const newKey = toSnakeCaseKey(key);
                acc[newKey] = convertKeysToLowerCase(obj[key]);
                return acc;
            }, {});
        }
        return obj;
    }

    // Utilidades para valores seguros y flags del backend
    function isTruthyOne(v) {
        return v === 1 || v === '1' || v === true || v === 'true';
    }
    function safe(v, fallback = '') {
        return (v ?? fallback);
    }
    function pick(obj, keys, fallback = '') {
        if (!obj || !Array.isArray(keys)) return fallback;
        for (const k of keys) {
            const val = obj[k];
            if (val !== undefined && val !== null) return val;
        }
        return fallback;
    }
    function formatDateTime(v) {
        if (!v) return '';
        const d = new Date(v);
        return isNaN(d.getTime()) ? '' : d.toLocaleString();
    }
    function isAvailable(v) {
        if (isTruthyOne(v)) return true;
        if (typeof v === 'string') {
            const s = v.toLowerCase();
            return s.includes('disp'); // 'disponible'
        }
        return false;
    }

    // Convierte cualquier entrada a arreglo
    function asArray(data) {
        if (Array.isArray(data)) return data;
        if (data === null || data === undefined) return [];
        return [data];
    }

    // Busca en profundidad el primer arreglo encontrable dentro de un objeto
    function findFirstArrayDeep(obj, maxDepth = 5) {
        const seen = new Set();
        function helper(o, depth) {
            if (!o || depth > maxDepth || seen.has(o)) return null;
            seen.add(o);
            if (Array.isArray(o)) return o;
            if (typeof o === 'object') {
                for (const val of Object.values(o)) {
                    const found = helper(val, depth + 1);
                    if (found) return found;
                }
            }
            return null;
        }
        return helper(obj, 0);
    }

    async function fetchData(url) {
        const response = await fetch(url);
        if (!response.ok) {
            const errorBody = await response.text();
            console.error("Error response body:", errorBody);
            throw new Error(`Error ${response.status} al cargar datos de ${url}`);
        }
        const data = await response.json();
        const convertedData = convertKeysToLowerCase(data);

        function unwrapPayload(payload) {
            if (Array.isArray(payload)) return payload;
            if (payload && typeof payload === 'object') {
                // Intentar claves comunes
                const preferKeys = ['data','result','rows','items','recordset','records','lista','list','resultado','response','cursor'];
                for (const k of preferKeys) {
                    if (payload[k] !== undefined) {
                        const v = payload[k];
                        if (Array.isArray(v)) return v;
                        if (v && typeof v === 'object') {
                            // si el valor es un objeto que contiene un único array, devolverlo
                            const arrVals = Object.values(v).filter(val => Array.isArray(val));
                            if (arrVals.length === 1) return arrVals[0];
                        }
                    }
                }
                // Si el objeto tiene exactamente una propiedad que es array, devolver ese array
                const arrays = Object.values(payload).filter(v => Array.isArray(v));
                if (arrays.length === 1) return arrays[0];
            }
            return payload;
        }

        let unwrapped = unwrapPayload(convertedData);
        if (!Array.isArray(unwrapped)) {
            const deepArray = findFirstArrayDeep(unwrapped);
            if (Array.isArray(deepArray)) unwrapped = deepArray;
        }
        // Asegura que los consumidores puedan iterar sin errores
        return Array.isArray(unwrapped) ? unwrapped : asArray(unwrapped);
    }

    // --- SECCIÓN CLIENTES ---
    async function showClientes() {
        updateNav('nav-clientes');
        mainContent.innerHTML = `
            <h2>Gestión de Clientes</h2>
            <div id="form-container"></div>
            <div id="list-container">
                <h3>Listado de Clientes</h3>
                <table id="data-table">
                    <thead><tr><th>RUT</th><th>Nombre</th><th>Apellido</th><th>Correo</th><th>Celular</th><th>Acciones</th></tr></thead>
                    <tbody></tbody>
                </table>
            </div>`;
        renderClientForm();
        loadClientes();
    }
    async function loadClientes() {
        try {
            const clientes = await fetchData(`${API_BASE_URL}/clientes`);
            const tableBody = document.querySelector('#data-table tbody');
            tableBody.innerHTML = '';
            clientes.forEach(cliente => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${safe(pick(cliente, ['rut','rut_cliente','rut_cliente_num']))}</td>
                    <td>${safe(pick(cliente, ['nombre','nombres','cliente_nombre','nombre_cliente']))}</td>
                    <td>${safe(pick(cliente, ['apellido','apellidos']))}</td>
                    <td>${safe(pick(cliente, ['correo','email','correo_electronico']))}</td>
                    <td>${safe(pick(cliente, ['celular','telefono','telefono_movil']))}</td>
                    <td>
                        <button class="edit-btn" data-id="${safe(pick(cliente, ['id_cliente','id']))}">Editar</button>
                        <button class="delete-btn" data-id="${safe(pick(cliente, ['id_cliente','id']))}">Eliminar</button>
                    </td>`;
                tableBody.appendChild(row);
            });
            document.querySelectorAll('#data-table .edit-btn').forEach(btn => btn.addEventListener('click', (e) => handleEditClient(e.target.dataset.id)));
            document.querySelectorAll('#data-table .delete-btn').forEach(btn => btn.addEventListener('click', (e) => handleDeleteClient(e.target.dataset.id)));
        } catch (error) {
            document.getElementById('list-container').innerHTML += `<p style="color:red;">${error.message}</p>`;
        }
    }
    function renderClientForm(cliente = {}) {
        const idCli = pick(cliente, ['id_cliente','id']);
        const isEditing = !!idCli;
        document.getElementById('form-container').innerHTML = `
            <h3>${isEditing ? 'Editar Cliente' : 'Agregar Nuevo Cliente'}</h3>
            <form id="client-form">
                <input type="hidden" id="id_cliente" value="${safe(idCli)}">
                <label for="rut">RUT:</label>
                <input type="text" id="rut" value="${safe(pick(cliente, ['rut','rut_cliente','rut_cliente_num']))}" required>
                <label for="nombre">Nombre:</label>
                <input type="text" id="nombre" value="${safe(pick(cliente, ['nombre','nombres','cliente_nombre','nombre_cliente']))}" required>
                <label for="apellido">Apellido:</label>
                <input type="text" id="apellido" value="${safe(pick(cliente, ['apellido','apellidos']))}">
                <label for="correo">Correo:</label>
                <input type="email" id="correo" value="${safe(pick(cliente, ['correo','email','correo_electronico']))}">
                <label for="celular">Celular:</label>
                <input type="text" id="celular" value="${safe(pick(cliente, ['celular','telefono','telefono_movil']))}">
                <button type="submit">${isEditing ? 'Actualizar' : 'Guardar'}</button>
                ${isEditing ? '<button type="button" id="cancel-edit">Cancelar</button>' : ''}
            </form>`;
        document.getElementById('client-form').addEventListener('submit', handleSaveClient);
        if (isEditing) document.getElementById('cancel-edit').addEventListener('click', () => renderClientForm());
    }
    async function handleSaveClient(e) {
        e.preventDefault();
        const form = e.target;
        const id = form.querySelector('#id_cliente').value;
        const data = {
            rut: form.querySelector('#rut').value,
            nombre: form.querySelector('#nombre').value,
            apellido: form.querySelector('#apellido').value,
            correo: form.querySelector('#correo').value,
            celular: form.querySelector('#celular').value,
        };
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_BASE_URL}/clientes/${id}` : `${API_BASE_URL}/clientes`;
        try {
            await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
            showClientes();
        } catch (error) { alert(error.message); }
    }
    async function handleEditClient(id) {
        try {
            const cli = await fetchData(`${API_BASE_URL}/clientes/${id}`);
            const cliente = Array.isArray(cli) ? cli[0] : cli;
            renderClientForm(cliente);
        } catch (error) { alert(error.message); }
    }
    async function handleDeleteClient(id) {
        if (!confirm('¿Eliminar cliente?')) return;
        try {
            await fetch(`${API_BASE_URL}/clientes/${id}`, { method: 'DELETE' });
            showClientes();
        } catch (error) { alert(error.message); }
    }

    // --- SECCIÓN BARBEROS ---
    async function showBarberos() {
        updateNav('nav-barberos');
        mainContent.innerHTML = `
            <h2>Gestión de Barberos</h2>
            <div id="form-container"></div>
            <div id="list-container">
                <h3>Listado de Barberos</h3>
                <table id="data-table">
                    <thead><tr><th>Usuario</th><th>Nombre</th><th>Activo</th><th>Acciones</th></tr></thead>
                    <tbody></tbody>
                </table>
            </div>`;
        renderBarberoForm();
        loadBarberos();
    }
    async function loadBarberos() {
        try {
            const barberos = await fetchData(`${API_BASE_URL}/barberos`);
            const tableBody = document.querySelector('#data-table tbody');
            tableBody.innerHTML = '';
            barberos.forEach(barbero => {
                const row = document.createElement('tr');
                const idBarbero = pick(barbero, ['id_barbero','id']);
                row.innerHTML = `
                    <td>${safe(pick(barbero, ['usuario','user','username']))}</td>
                    <td>${safe(pick(barbero, ['nombre','nombre_barbero','barbero_nombre']))}</td>
                    <td>${isTruthyOne(pick(barbero, ['activo','habilitado','estado'])) ? 'Sí' : 'No'}</td>
                    <td>
                        <button class="edit-btn" data-id="${safe(idBarbero)}">Editar</button>
                        <button class="delete-btn" data-id="${safe(idBarbero)}">Eliminar</button>
                    </td>`;
                tableBody.appendChild(row);
            });
            document.querySelectorAll('#data-table .edit-btn').forEach(btn => btn.addEventListener('click', (e) => handleEditBarbero(e.target.dataset.id)));
            document.querySelectorAll('#data-table .delete-btn').forEach(btn => btn.addEventListener('click', (e) => handleDeleteBarbero(e.target.dataset.id)));
        } catch (error) {
            document.getElementById('list-container').innerHTML += `<p style="color:red;">${error.message}</p>`;
        }
    }
    function renderBarberoForm(barbero = {}) {
        const isEditing = !!barbero.id_barbero;
        document.getElementById('form-container').innerHTML = `
            <h3>${isEditing ? 'Editar Barbero' : 'Agregar Nuevo Barbero'}</h3>
            <form id="barbero-form">
                <input type="hidden" id="id_barbero" value="${barbero.id_barbero || ''}">
                <label for="usuario">Usuario:</label>
                <input type="text" id="usuario" value="${barbero.usuario || ''}" required>
                <label for="nombre">Nombre:</label>
                <input type="text" id="nombre" value="${barbero.nombre || ''}" required>
                <label for="password">Contraseña:</label>
                <input type="password" id="password" ${isEditing ? 'placeholder="No cambiar"' : 'required'}>
                <label for="activo">Activo:</label>
                <select id="activo">
                    <option value="1" ${barbero.activo === '1' ? 'selected' : ''}>Sí</option>
                    <option value="0" ${barbero.activo === '0' ? 'selected' : ''}>No</option>
                </select>
                <button type="submit">${isEditing ? 'Actualizar' : 'Guardar'}</button>
                ${isEditing ? '<button type="button" id="cancel-edit">Cancelar</button>' : ''}
            </form>`;
        document.getElementById('barbero-form').addEventListener('submit', handleSaveBarbero);
        if (isEditing) document.getElementById('cancel-edit').addEventListener('click', () => renderBarberoForm());
    }
    async function handleSaveBarbero(e) {
        e.preventDefault();
        const form = e.target;
        const id = form.querySelector('#id_barbero').value;
        const data = {
            usuario: form.querySelector('#usuario').value,
            nombre: form.querySelector('#nombre').value,
            password: form.querySelector('#password').value,
            activo: form.querySelector('#activo').value,
        };
        if (id && !data.password) delete data.password;
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_BASE_URL}/barberos/${id}` : `${API_BASE_URL}/barberos`;
        try {
            await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
            showBarberos();
        } catch (error) { alert(error.message); }
    }
    async function handleEditBarbero(id) {
        try {
            const res = await fetchData(`${API_BASE_URL}/barberos/${id}`);
            const barbero = Array.isArray(res) ? res[0] : res;
            renderBarberoForm(barbero);
        } catch (error) { alert(error.message); }
    }
    async function handleDeleteBarbero(id) {
        if (!confirm('¿Eliminar barbero?')) return;
        try {
            await fetch(`${API_BASE_URL}/barberos/${id}`, { method: 'DELETE' });
            showBarberos();
        } catch (error) { alert(error.message); }
    }

    // --- SECCIÓN SERVICIOS ---
    async function showServicios() {
        updateNav('nav-servicios');
        mainContent.innerHTML = `
            <h2>Gestión de Servicios</h2>
            <div id="form-container"></div>
            <div id="list-container">
                <h3>Listado de Servicios</h3>
                <table id="data-table">
                    <thead><tr><th>Nombre</th><th>Duración (min)</th><th>Precio</th><th>Acciones</th></tr></thead>
                    <tbody></tbody>
                </table>
            </div>`;
        renderServicioForm();
        loadServicios();
    }
    async function loadServicios() {
        try {
            const servicios = await fetchData(`${API_BASE_URL}/servicios`);
            const tableBody = document.querySelector('#data-table tbody');
            tableBody.innerHTML = '';
            servicios.forEach(s => {
                const row = document.createElement('tr');
                const idServicio = pick(s, ['id_servicio','id']);
                row.innerHTML = `
                    <td>${safe(pick(s, ['nombre','servicio_nombre','nombre_servicio']))}</td>
                    <td>${safe(pick(s, ['duracion_min','duracion','minutos']))}</td>
                    <td>$${safe(pick(s, ['precio','valor','costo']), 0)}</td>
                    <td>
                        <button class="edit-btn" data-id="${safe(idServicio)}">Editar</button>
                        <button class="delete-btn" data-id="${safe(idServicio)}">Eliminar</button>
                    </td>`;
                tableBody.appendChild(row);
            });
            document.querySelectorAll('#data-table .edit-btn').forEach(btn => btn.addEventListener('click', (e) => handleEditServicio(e.target.dataset.id)));
            document.querySelectorAll('#data-table .delete-btn').forEach(btn => btn.addEventListener('click', (e) => handleDeleteServicio(e.target.dataset.id)));
        } catch (error) {
            document.getElementById('list-container').innerHTML += `<p style="color:red;">${error.message}</p>`;
        }
    }
    function renderServicioForm(servicio = {}) {
        const isEditing = !!servicio.id_servicio;
        document.getElementById('form-container').innerHTML = `
            <h3>${isEditing ? 'Editar Servicio' : 'Agregar Nuevo Servicio'}</h3>
            <form id="servicio-form">
                <input type="hidden" id="id_servicio" value="${servicio.id_servicio || ''}">
                <label for="nombre">Nombre:</label>
                <input type="text" id="nombre" value="${servicio.nombre || ''}" required>
                <label for="duracion_min">Duración (min):</label>
                <input type="number" id="duracion_min" value="${servicio.duracion_min || ''}" required>
                <label for="precio">Precio:</label>
                <input type="number" id="precio" step="1" value="${servicio.precio || ''}" required>
                <button type="submit">${isEditing ? 'Actualizar' : 'Guardar'}</button>
                ${isEditing ? '<button type="button" id="cancel-edit">Cancelar</button>' : ''}
            </form>`;
        document.getElementById('servicio-form').addEventListener('submit', handleSaveServicio);
        if (isEditing) document.getElementById('cancel-edit').addEventListener('click', () => renderServicioForm());
    }
    async function handleSaveServicio(e) {
        e.preventDefault();
        const form = e.target;
        const id = form.querySelector('#id_servicio').value;
        const data = {
            nombre: form.querySelector('#nombre').value,
            duracion_min: form.querySelector('#duracion_min').value,
            precio: form.querySelector('#precio').value,
        };
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_BASE_URL}/servicios/${id}` : `${API_BASE_URL}/servicios`;
        try {
            await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
            showServicios();
        } catch (error) { alert(error.message); }
    }
    async function handleEditServicio(id) {
        try {
            const servicio = await fetchData(`${API_BASE_URL}/servicios/${id}`);
            const s = Array.isArray(servicio) ? servicio[0] : servicio;
            renderServicioForm(s);
        } catch (error) { alert(error.message); }
    }
    async function handleDeleteServicio(id) {
        if (!confirm('¿Eliminar servicio?')) return;
        try {
            await fetch(`${API_BASE_URL}/servicios/${id}`, { method: 'DELETE' });
            showServicios();
        } catch (error) { alert(error.message); }
    }

    // --- SECCIÓN AGENDA ---
    async function showAgenda() {
        updateNav('nav-agenda');
        mainContent.innerHTML = `
            <h2>Agenda de Horas Disponibles</h2>
            <div id="form-container"></div>
            <div id="list-container">
                <h3>Horas Disponibles</h3>
                <table id="data-table">
                    <thead><tr><th>Fecha y Hora</th><th>Barbero</th><th>Disponible</th><th>Acciones</th></tr></thead>
                    <tbody></tbody>
                </table>
            </div>`;
        renderAgendaForm();
        loadHorasDisponibles();
    }
    async function loadHorasDisponibles() {
        try {
            const [horas, barberos] = await Promise.all([
                fetchData(`${API_BASE_URL}/horas`),
                fetchData(`${API_BASE_URL}/barberos`)
            ]);

            const barberosMap = new Map(barberos.map(b => [pick(b, ['id_barbero','id']), pick(b, ['nombre','nombre_barbero','barbero_nombre'])]));

            const tableBody = document.querySelector('#data-table tbody');
            tableBody.innerHTML = '';
            horas.forEach(h => {
                const idBarbero = pick(h, ['id_barbero','barbero_id','id']);
                const idHora = pick(h, ['id_hora','id']);
                const disponible = pick(h, ['disponible','estado','libre']);
                const fecha = pick(h, ['fecha_hora','fecha','fecha_programada']);
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${formatDateTime(fecha)}</td>
                    <td>${safe(barberosMap.get(idBarbero), 'Sin asignar')}</td>
                    <td>${isTruthyOne(disponible) || isAvailable(disponible) ? 'Sí' : 'No'}</td>
                    <td>
                        <button class="delete-btn" data-id="${safe(idHora)}">Eliminar</button>
                    </td>`;
                tableBody.appendChild(row);
            });
            document.querySelectorAll('#data-table .delete-btn').forEach(btn => btn.addEventListener('click', (e) => handleDeleteHora(e.target.dataset.id)));
        } catch (error) {
            document.getElementById('list-container').innerHTML += `<p style="color:red;">${error.message}</p>`;
        }
    }
    async function renderAgendaForm() {
        const barberos = await fetchData(`${API_BASE_URL}/barberos`);
        let barberosOptions = barberos.map(b => {
            const id = pick(b, ['id_barbero','id']);
            const name = pick(b, ['nombre','nombre_barbero','barbero_nombre']);
            return `<option value="${id}">${safe(name)}</option>`;
        }).join('');

        document.getElementById('form-container').innerHTML = `
            <h3>Agregar Hora Disponible</h3>
            <form id="agenda-form">
                <label for="fecha_hora">Fecha y Hora:</label>
                <input type="datetime-local" id="fecha_hora" required>
                <label for="id_barbero">Barbero (opcional):</label>
                <select id="id_barbero"><option value="">Sin asignar</option>${barberosOptions}</select>
                <button type="submit">Agregar Hora</button>
            </form>`;
        document.getElementById('agenda-form').addEventListener('submit', handleSaveHora);
    }
    async function handleSaveHora(e) {
        e.preventDefault();
        const form = e.target;
        const data = {
            id_agenda: 1,
            fecha_hora: form.querySelector('#fecha_hora').value,
            id_barbero: form.querySelector('#id_barbero').value || null,
        };
        try {
            await fetch(`${API_BASE_URL}/horas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
            showAgenda();
        } catch (error) { alert(error.message); }
    }
    async function handleDeleteHora(id) {
        if (!confirm('¿Eliminar esta hora disponible?')) return;
        try {
            await fetch(`${API_BASE_URL}/horas/${id}`, { method: 'DELETE' });
            showAgenda();
        } catch (error) { alert(error.message); }
    }

    // --- SECCIÓN CITAS ---
    async function showCitas() {
        updateNav('nav-citas');
        mainContent.innerHTML = `
            <h2>Gestión de Citas</h2>
            <div id="form-container"></div>
            <div id="list-container">
                <h3>Listado de Citas</h3>
                <table id="data-table">
                    <thead><tr><th>Cliente</th><th>Servicio</th><th>Barbero</th><th>Fecha</th><th>Estado</th><th>Acciones</th></tr></thead>
                    <tbody></tbody>
                </table>
            </div>`;
        renderCitaForm();
        loadCitas();
    }
    async function loadCitas() {
        try {
            const [citas, clientes, servicios, barberos] = await Promise.all([
                fetchData(`${API_BASE_URL}/citas`),
                fetchData(`${API_BASE_URL}/clientes`),
                fetchData(`${API_BASE_URL}/servicios`),
                fetchData(`${API_BASE_URL}/barberos`)
            ]);

            // Construir mapas de id -> nombre para resolver cuando el backend no envía los nombres ya unidos
            const clientesMap = new Map(clientes.map(cl => {
                const id = pick(cl, ['id_cliente','id']);
                const nombre = `${safe(pick(cl, ['nombre','nombres','cliente_nombre','nombre_cliente']))} ${safe(pick(cl, ['apellido','apellidos']))}`.trim();
                return [String(id ?? ''), nombre];
            }));
            const serviciosMap = new Map(servicios.map(s => {
                const id = pick(s, ['id_servicio','id']);
                const nombre = safe(pick(s, ['nombre','servicio_nombre','nombre_servicio']));
                return [String(id ?? ''), nombre];
            }));
            const barberosMap = new Map(barberos.map(b => {
                const id = pick(b, ['id_barbero','id']);
                const nombre = safe(pick(b, ['nombre','nombre_barbero','barbero_nombre']));
                return [String(id ?? ''), nombre];
            }));

            const tableBody = document.querySelector('#data-table tbody');
            tableBody.innerHTML = '';
            citas.forEach(c => {
                const row = document.createElement('tr');
                const idCita = pick(c, ['id_cita','id']);

                const idCliente = pick(c, ['id_cliente','cliente_id','id_cliente_fk','id']);
                let clienteNombre = pick(c, ['cliente_nombre','nombre_cliente','cliente','nombre']);
                if (!clienteNombre) clienteNombre = clientesMap.get(String(idCliente ?? '')) || '';

                const idServicio = pick(c, ['id_servicio','servicio_id','id_servicio_fk']);
                let servicioNombre = pick(c, ['servicio_nombre','nombre_servicio','servicio','nombre']);
                if (!servicioNombre) servicioNombre = serviciosMap.get(String(idServicio ?? '')) || '';

                const idBarbero = pick(c, ['id_barbero','barbero_id','id_barbero_fk']);
                let barberoNombre = pick(c, ['barbero_nombre','nombre_barbero','barbero','nombre']);
                if (!barberoNombre) barberoNombre = barberosMap.get(String(idBarbero ?? '')) || '';

                const fecha = pick(c, ['fecha_programada','fecha','fecha_hora']);
                row.innerHTML = `
                    <td>${safe(clienteNombre, 'N/A')}</td>
                    <td>${safe(servicioNombre, 'N/A')}</td>
                    <td>${safe(barberoNombre, 'Sin Asignar')}</td>
                    <td>${formatDateTime(fecha)}</td>
                    <td>${safe(pick(c, ['estado','status']))}</td>
                    <td>
                        <button class="edit-btn" data-id="${safe(idCita)}">Editar</button>
                        <button class="delete-btn" data-id="${safe(idCita)}">Cancelar</button>
                    </td>`;
                tableBody.appendChild(row);
            });
            document.querySelectorAll('#data-table .edit-btn').forEach(btn => btn.addEventListener('click', (e) => handleEditCita(e.target.dataset.id)));
            document.querySelectorAll('#data-table .delete-btn').forEach(btn => btn.addEventListener('click', (e) => handleCancelCita(e.target.dataset.id)));
        } catch (error) {
            document.getElementById('list-container').innerHTML += `<p style="color:red;">${error.message}</p>`;
        }
    }
    async function renderCitaForm(cita = {}) {
        const isEditing = !!cita.id_cita;
        const [clientes, servicios, barberos] = await Promise.all([
            fetchData(`${API_BASE_URL}/clientes`),
            fetchData(`${API_BASE_URL}/servicios`),
            fetchData(`${API_BASE_URL}/barberos`)
        ]);

        const selCliente = pick(cita, ['id_cliente','cliente_id','id']);
        const selServicio = pick(cita, ['id_servicio','servicio_id']);
        const selBarbero = pick(cita, ['id_barbero','barbero_id']);

        const clientesOptions = clientes.map(c => {
            const id = pick(c, ['id_cliente','id']);
            const nombre = `${safe(pick(c, ['nombre','nombres','cliente_nombre','nombre_cliente']))} ${safe(pick(c, ['apellido','apellidos']))}`.trim();
            const selected = String(selCliente ?? '') === String(id ?? '') ? 'selected' : '';
            return `<option value="${id}" ${selected}>${nombre}</option>`;
        }).join('');
        const serviciosOptions = servicios.map(s => {
            const id = pick(s, ['id_servicio','id']);
            const nombre = safe(pick(s, ['nombre','servicio_nombre','nombre_servicio']));
            const selected = String(selServicio ?? '') === String(id ?? '') ? 'selected' : '';
            return `<option value="${id}" ${selected}>${nombre}</option>`;
        }).join('');
        const barberosOptions = barberos.map(b => {
            const id = pick(b, ['id_barbero','id']);
            const nombre = safe(pick(b, ['nombre','nombre_barbero','barbero_nombre']));
            const selected = String(selBarbero ?? '') === String(id ?? '') ? 'selected' : '';
            return `<option value="${id}" ${selected}>${nombre}</option>`;
        }).join('');

        document.getElementById('form-container').innerHTML = `
            <h3>${isEditing ? 'Editar Cita' : 'Agendar Nueva Cita'}</h3>
            <form id="cita-form">
                <input type="hidden" id="id_cita" value="${safe(pick(cita, ['id_cita','id']))}">
                <label for="id_cliente">Cliente:</label>
                <select id="id_cliente" required ${isEditing ? 'disabled' : ''}>${clientesOptions}</select>
                <label for="id_servicio">Servicio:</label>
                <select id="id_servicio" required ${isEditing ? 'disabled' : ''}>${serviciosOptions}</select>
                <label for="id_barbero">Barbero:</label>
                <select id="id_barbero" required>${barberosOptions}</select>
                <label for="fecha_programada">Fecha y Hora:</label>
                <input type="datetime-local" id="fecha_programada" value="${cita.fecha_programada ? new Date(cita.fecha_programada).toISOString().slice(0,16) : ''}" required>
                <label for="estado">Estado:</label>
                <input type="text" id="estado" value="${cita.estado || 'PENDIENTE'}" required>
                <label for="observaciones">Observaciones:</label>
                <textarea id="observaciones">${cita.observaciones || ''}</textarea>
                <button type="submit">${isEditing ? 'Actualizar' : 'Guardar'}</button>
                ${isEditing ? '<button type="button" id="cancel-edit">Cancelar</button>' : ''}
            </form>`;
        document.getElementById('cita-form').addEventListener('submit', handleSaveCita);
        if (isEditing) document.getElementById('cancel-edit').addEventListener('click', () => renderCitaForm());
    }
    async function handleSaveCita(e) {
        e.preventDefault();
        const form = e.target;
        const id = form.querySelector('#id_cita').value;
        const data = {
            id_cliente: form.querySelector('#id_cliente').value,
            id_servicio: form.querySelector('#id_servicio').value,
            id_barbero: form.querySelector('#id_barbero').value,
            fecha_programada: form.querySelector('#fecha_programada').value,
            estado: form.querySelector('#estado').value,
            observaciones: form.querySelector('#observaciones').value,
        };
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_BASE_URL}/citas/${id}` : `${API_BASE_URL}/citas`;
        try {
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
            if (!res.ok) {
                let msg = 'Error al guardar la cita';
                try {
                    const ct = res.headers.get('content-type') || '';
                    if (ct.includes('application/json')) {
                        const err = await res.json();
                        msg = err.error || err.message || msg;
                    } else {
                        const text = await res.text();
                        if (text) msg = text;
                    }
                } catch (_) { /* ignore parse errors */ }
                throw new Error(msg);
            }
            showCitas();
        } catch (error) { alert(error.message); }
    }
    async function handleEditCita(id) {
        try {
            const citaArr = await fetchData(`${API_BASE_URL}/citas/${id}`);
            const cita = Array.isArray(citaArr) ? citaArr[0] : citaArr;
            const idCliente = pick(cita, ['id_cliente','cliente_id','id']);
            if (idCliente) {
                const clienteArr = await fetchData(`${API_BASE_URL}/clientes/${idCliente}`);
                const cliente = Array.isArray(clienteArr) ? clienteArr[0] : clienteArr;
                const nombre = `${safe(pick(cliente, ['nombre','nombres','cliente_nombre','nombre_cliente']))} ${safe(pick(cliente, ['apellido','apellidos']))}`.trim();
                cita.cliente_nombre = nombre;
            }
            renderCitaForm(cita);
        } catch (error) { alert(error.message); }
    }
    async function handleCancelCita(id) {
        if (!confirm('¿Cancelar esta cita?')) return;
        try {
            let motivo = prompt("Motivo de la cancelación:", "Cancelado por usuario");
            if (motivo === null) return;
            motivo = String(motivo).trim() || 'Cancelado por usuario';

            // Construir payload con varias claves alternativas por compatibilidad con distintos backends
            const idNum = Number(id);
            if (!Number.isFinite(idNum)) throw new Error('ID de cita inválido');

            const payload = {
                // claves comunes
                id_cita: idNum,
                id: idNum,
                idCita: idNum,
                p_id_cita: idNum,
                // motivo / observaciones
                motivo: motivo,
                motivo_cancelacion: motivo,
                observaciones: motivo,
                // estado que normalmente espera la SP PA_CITA_UPDATE
                estado: 'CANCELADA',
                status: 'CANCELADA'
            };

            console.debug('Enviando payload cancelar-cita:', payload);

            const res = await fetch(`${API_BASE_URL}/gestores/cancelar-cita`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const rawText = await res.text().catch(() => '');
            // intentar parsear JSON si es posible
            let parsed = null;
            try { parsed = rawText ? JSON.parse(rawText) : null; } catch (_) { parsed = null; }
            console.debug('Respuesta cancelar-cita:', { status: res.status, rawText, parsed });

            if (!res.ok) {
                let msg = 'Error al cancelar la cita';
                if (parsed) msg = parsed.error || parsed.message || parsed.mensaje || JSON.stringify(parsed) || msg;
                else if (rawText) msg = rawText;
                throw new Error(msg);
            }

            if (parsed && (parsed.mensaje || parsed.message || parsed.ok)) alert(parsed.mensaje || parsed.message || 'Cita cancelada');
            else alert('Cita cancelada');

            showCitas();
        } catch (error) { alert(`No se pudo cancelar la cita: ${error.message}`); }
    }

    // --- SECCIÓN REPORTES ---
    function showReportes() {
        updateNav('nav-reportes');
        mainContent.innerHTML = `
            <h2>Reportes</h2>
            <div id="report-selector" class="form">
                <label for="report-type">Seleccionar Reporte:</label>
                <select id="report-type">
                    <option value="">-- Elija un reporte --</option>
                    <option value="servicios">Servicios más solicitados</option>
                    <option value="barberos">Citas por barbero</option>
                    <option value="cancelaciones">Tasa de cancelación</option>
                </select>
                <label for="report-anio">Año:</label>
                <input type="number" id="report-anio" value="${new Date().getFullYear()}">
                <label for="report-mes">Mes:</label>
                <input type="number" id="report-mes" value="${new Date().getMonth() + 1}">
                <button id="generate-report">Generar</button>
            </div>
            <div id="report-content"></div>`;

        document.getElementById('generate-report').addEventListener('click', generateReport);
    }

    async function generateReport() {
        const reportType = document.getElementById('report-type').value;
        const anio = document.getElementById('report-anio').value;
        const mes = document.getElementById('report-mes').value;
        const reportContent = document.getElementById('report-content');
        reportContent.innerHTML = 'Generando...';

        if (!reportType) {
            reportContent.innerHTML = '<p style="color:orange;">Por favor, seleccione un tipo de reporte.</p>';
            return;
        }

        try {
            await fetch(`${API_BASE_URL}/reportes/${reportType}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ anio, mes })
            });

            const data = await fetchData(`${API_BASE_URL}/reportes/${reportType}?anio=${anio}&mes=${mes}`);

            if (!data || data.length === 0) {
                reportContent.innerHTML = '<p>No hay datos para este período.</p>';
                return;
            }

            let table = '<table>';
            if (reportType === 'servicios') {
                table += '<thead><tr><th>Servicio</th><th>Cantidad</th></tr></thead><tbody>';
                data.forEach(item => {
                    const nombreServ = safe(pick(item, ['servicio','nombre_servicio','nombre']), 'N/A');
                    const cantidad = safe(pick(item, ['cantidad','total','count']), 0);
                    table += `<tr><td>${nombreServ}</td><td>${cantidad}</td></tr>`;
                });
            } else if (reportType === 'barberos') {
                table += '<thead><tr><th>Barbero</th><th>Cantidad de Citas</th></tr></thead><tbody>';
                data.forEach(item => {
                    const nombreBar = safe(pick(item, ['nombre_barbero','barbero','barbero_nombre','nombre']), 'N/A');
                    const cantidad = safe(pick(item, ['cantidad','total','count']), 0);
                    table += `<tr><td>${nombreBar}</td><td>${cantidad}</td></tr>`;
                });
            } else if (reportType === 'cancelaciones') {
                table += '<thead><tr><th>Canceladas</th><th>Totales</th><th>Tasa</th></tr></thead><tbody>';
                data.forEach(item => {
                    const tasaVal = pick(item, ['tasa','ratio','porcentaje']);
                    const tasa = Number(tasaVal ?? 0);
                    const canceladas = safe(pick(item, ['canceladas','cancelados','cancel']), 0);
                    const totales = safe(pick(item, ['totales','total']), 0);
                    table += `<tr><td>${canceladas}</td><td>${totales}</td><td>${(isFinite(tasa) ? tasa * 100 : 0).toFixed(2)}%</td></tr>`;
                });
            }
            table += '</tbody></table>';
            reportContent.innerHTML = table;

        } catch (error) {
            reportContent.innerHTML = `<p style="color:red;">Error al generar el reporte: ${error.message}</p>`;
        }
    }

    // Carga inicial
});
