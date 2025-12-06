document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('main-content');
    const API_BASE_URL = 'http://localhost:3000/api';

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
            navLinks[id]();
        });
    });

    // Añadir enlace de reportes dinámicamente
    const navReportes = document.createElement('li');
    navReportes.innerHTML = `<a href="#" id="nav-reportes">Reportes</a>`;
    document.querySelector('nav ul').appendChild(navReportes);
    document.getElementById('nav-reportes').addEventListener('click', (e) => { e.preventDefault(); showReportes(); });


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

    async function fetchData(url) {
        const response = await fetch(url);
        if (!response.ok) {
            const errorBody = await response.text();
            console.error("Error response body:", errorBody);
            throw new Error(`Error ${response.status} al cargar datos de ${url}`);
        }
        return response.json();
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
                    <td>${cliente.RUT}</td>
                    <td>${cliente.NOMBRE}</td>
                    <td>${cliente.APELLIDO}</td>
                    <td>${cliente.CORREO}</td>
                    <td>${cliente.CELULAR}</td>
                    <td>
                        <button class="edit-btn" data-id="${cliente.ID_CLIENTE}">Editar</button>
                        <button class="delete-btn" data-id="${cliente.ID_CLIENTE}">Eliminar</button>
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
        const isEditing = !!cliente.ID_CLIENTE;
        document.getElementById('form-container').innerHTML = `
            <h3>${isEditing ? 'Editar Cliente' : 'Agregar Nuevo Cliente'}</h3>
            <form id="client-form">
                <input type="hidden" id="id_cliente" value="${cliente.ID_CLIENTE || ''}">
                <label for="rut">RUT:</label>
                <input type="text" id="rut" value="${cliente.RUT || ''}" required>
                <label for="nombre">Nombre:</label>
                <input type="text" id="nombre" value="${cliente.NOMBRE || ''}" required>
                <label for="apellido">Apellido:</label>
                <input type="text" id="apellido" value="${cliente.APELLIDO || ''}">
                <label for="correo">Correo:</label>
                <input type="email" id="correo" value="${cliente.CORREO || ''}">
                <label for="celular">Celular:</label>
                <input type="text" id="celular" value="${cliente.CELULAR || ''}">
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
            const cliente = await fetchData(`${API_BASE_URL}/clientes/${id}`);
            renderClientForm(cliente[0]);
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
                row.innerHTML = `
                    <td>${barbero.USUARIO}</td>
                    <td>${barbero.NOMBRE}</td>
                    <td>${barbero.ACTIVO === '1' ? 'Sí' : 'No'}</td>
                    <td>
                        <button class="edit-btn" data-id="${barbero.ID_BARBERO}">Editar</button>
                        <button class="delete-btn" data-id="${barbero.ID_BARBERO}">Eliminar</button>
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
        const isEditing = !!barbero.ID_BARBERO;
        document.getElementById('form-container').innerHTML = `
            <h3>${isEditing ? 'Editar Barbero' : 'Agregar Nuevo Barbero'}</h3>
            <form id="barbero-form">
                <input type="hidden" id="id_barbero" value="${barbero.ID_BARBERO || ''}">
                <label for="usuario">Usuario:</label>
                <input type="text" id="usuario" value="${barbero.USUARIO || ''}" required>
                <label for="nombre">Nombre:</label>
                <input type="text" id="nombre" value="${barbero.NOMBRE || ''}" required>
                <label for="password">Contraseña:</label>
                <input type="password" id="password" ${isEditing ? 'placeholder="No cambiar"' : 'required'}>
                <label for="activo">Activo:</label>
                <select id="activo">
                    <option value="1" ${barbero.ACTIVO === '1' ? 'selected' : ''}>Sí</option>
                    <option value="0" ${barbero.ACTIVO === '0' ? 'selected' : ''}>No</option>
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
            const barbero = await fetchData(`${API_BASE_URL}/barberos/${id}`);
            renderBarberoForm(barbero[0]);
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
                row.innerHTML = `
                    <td>${s.NOMBRE}</td>
                    <td>${s.DURACION_MIN}</td>
                    <td>$${s.PRECIO}</td>
                    <td>
                        <button class="edit-btn" data-id="${s.ID_SERVICIO}">Editar</button>
                        <button class="delete-btn" data-id="${s.ID_SERVICIO}">Eliminar</button>
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
        const isEditing = !!servicio.ID_SERVICIO;
        document.getElementById('form-container').innerHTML = `
            <h3>${isEditing ? 'Editar Servicio' : 'Agregar Nuevo Servicio'}</h3>
            <form id="servicio-form">
                <input type="hidden" id="id_servicio" value="${servicio.ID_SERVICIO || ''}">
                <label for="nombre">Nombre:</label>
                <input type="text" id="nombre" value="${servicio.NOMBRE || ''}" required>
                <label for="duracion_min">Duración (min):</label>
                <input type="number" id="duracion_min" value="${servicio.DURACION_MIN || ''}" required>
                <label for="precio">Precio:</label>
                <input type="number" id="precio" step="1" value="${servicio.PRECIO || ''}" required>
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
            renderServicioForm(servicio[0]);
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
            
            const barberosMap = new Map(barberos.map(b => [b.ID_BARBERO, b.NOMBRE]));

            const tableBody = document.querySelector('#data-table tbody');
            tableBody.innerHTML = '';
            horas.forEach(h => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${new Date(h.FECHA_HORA).toLocaleString()}</td>
                    <td>${barberosMap.get(h.ID_BARBERO) || 'Sin asignar'}</td>
                    <td>${h.DISPONIBLE === '1' ? 'Sí' : 'No'}</td>
                    <td>
                        <button class="delete-btn" data-id="${h.ID_HORA}">Eliminar</button>
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
        let barberosOptions = barberos.map(b => `<option value="${b.ID_BARBERO}">${b.NOMBRE}</option>`).join('');

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
            const citas = await fetchData(`${API_BASE_URL}/citas`);
            const tableBody = document.querySelector('#data-table tbody');
            tableBody.innerHTML = '';
            citas.forEach(c => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${c.CLIENTE_NOMBRE || 'N/A'}</td>
                    <td>${c.SERVICIO_NOMBRE || 'N/A'}</td>
                    <td>${c.BARBERO_NOMBRE || 'Sin Asignar'}</td>
                    <td>${new Date(c.FECHA_PROGRAMADA).toLocaleString()}</td>
                    <td>${c.ESTADO}</td>
                    <td>
                        <button class="edit-btn" data-id="${c.ID_CITA}">Editar</button>
                        <button class="delete-btn" data-id="${c.ID_CITA}">Cancelar</button>
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
        const isEditing = !!cita.ID_CITA;
        const [clientes, servicios, barberos] = await Promise.all([
            fetchData(`${API_BASE_URL}/clientes`),
            fetchData(`${API_BASE_URL}/servicios`),
            fetchData(`${API_BASE_URL}/barberos`)
        ]);

        const clientesOptions = clientes.map(c => `<option value="${c.ID_CLIENTE}" ${cita.ID_CLIENTE == c.ID_CLIENTE ? 'selected' : ''}>${c.NOMBRE} ${c.APELLIDO}</option>`).join('');
        const serviciosOptions = servicios.map(s => `<option value="${s.ID_SERVICIO}" ${cita.ID_SERVICIO == s.ID_SERVICIO ? 'selected' : ''}>${s.NOMBRE}</option>`).join('');
        const barberosOptions = barberos.map(b => `<option value="${b.ID_BARBERO}" ${cita.ID_BARBERO == b.ID_BARBERO ? 'selected' : ''}>${b.NOMBRE}</option>`).join('');

        document.getElementById('form-container').innerHTML = `
            <h3>${isEditing ? 'Editar Cita' : 'Agendar Nueva Cita'}</h3>
            <form id="cita-form">
                <input type="hidden" id="id_cita" value="${cita.ID_CITA || ''}">
                <label for="id_cliente">Cliente:</label>
                <select id="id_cliente" required ${isEditing ? 'disabled' : ''}>${clientesOptions}</select>
                <label for="id_servicio">Servicio:</label>
                <select id="id_servicio" required ${isEditing ? 'disabled' : ''}>${serviciosOptions}</select>
                <label for="id_barbero">Barbero:</label>
                <select id="id_barbero" required>${barberosOptions}</select>
                <label for="fecha_programada">Fecha y Hora:</label>
                <input type="datetime-local" id="fecha_programada" value="${cita.FECHA_PROGRAMADA ? new Date(cita.FECHA_PROGRAMADA).toISOString().slice(0,16) : ''}" required>
                <label for="estado">Estado:</label>
                <input type="text" id="estado" value="${cita.ESTADO || 'PENDIENTE'}" required>
                <label for="observaciones">Observaciones:</label>
                <textarea id="observaciones">${cita.OBSERVACIONES || ''}</textarea>
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
                const err = await res.json();
                throw new Error(err.message || 'Error al guardar la cita');
            }
            showCitas();
        } catch (error) { alert(error.message); }
    }
    async function handleEditCita(id) {
        try {
            const cita = await fetchData(`${API_BASE_URL}/citas/${id}`);
            const cliente = await fetchData(`${API_BASE_URL}/clientes/${cita[0].ID_CLIENTE}`);
            cita[0].CLIENTE_NOMBRE = `${cliente[0].NOMBRE} ${cliente[0].APELLIDO}`;
            renderCitaForm(cita[0]);
        } catch (error) { alert(error.message); }
    }
    async function handleCancelCita(id) {
        if (!confirm('¿Cancelar esta cita?')) return;
        try {
            const motivo = prompt("Motivo de la cancelación:", "Cancelado por usuario");
            if (motivo === null) return;
            
            await fetch(`${API_BASE_URL}/gestores/cancelar-cita`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ id_cita: id, motivo: motivo }) 
            });
            showCitas();
        } catch (error) { alert(error.message); }
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
                    table += `<tr><td>${item.SERVICIO}</td><td>${item.CANTIDAD}</td></tr>`;
                });
            } else if (reportType === 'barberos') {
                table += '<thead><tr><th>Barbero</th><th>Cantidad de Citas</th></tr></thead><tbody>';
                data.forEach(item => {
                    table += `<tr><td>${item.NOMBRE_BARBERO}</td><td>${item.CANTIDAD}</td></tr>`;
                });
            } else if (reportType === 'cancelaciones') {
                table += '<thead><tr><th>Canceladas</th><th>Totales</th><th>Tasa</th></tr></thead><tbody>';
                data.forEach(item => {
                    table += `<tr><td>${item.CANCELADAS}</td><td>${item.TOTALES}</td><td>${(item.TASA * 100).toFixed(2)}%</td></tr>`;
                });
            }
            table += '</tbody></table>';
            reportContent.innerHTML = table;

        } catch (error) {
            reportContent.innerHTML = `<p style="color:red;">Error al generar el reporte: ${error.message}</p>`;
        }
    }

    // Carga inicial
    showClientes();
});
