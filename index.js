document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('main-content');

    // Navegación
    document.getElementById('nav-clientes').addEventListener('click', (e) => {
        e.preventDefault();
        showClientes();
    });

    document.getElementById('nav-barberos').addEventListener('click', (e) => {
        e.preventDefault();
        mainContent.innerHTML = '<h2>Gestión de Barberos (Próximamente)</h2>';
    });

    document.getElementById('nav-servicios').addEventListener('click', (e) => {
        e.preventDefault();
        mainContent.innerHTML = '<h2>Gestión de Servicios (Próximamente)</h2>';
    });
    
    document.getElementById('nav-citas').addEventListener('click', (e) => {
        e.preventDefault();
        mainContent.innerHTML = '<h2>Gestión de Citas (Próximamente)</h2>';
    });

    document.getElementById('nav-agenda').addEventListener('click', (e) => {
        e.preventDefault();
        mainContent.innerHTML = '<h2>Gestión de Agenda (Próximamente)</h2>';
    });


    // --- SECCIÓN CLIENTES ---
    async function showClientes() {
        mainContent.innerHTML = `
            <h2>Gestión de Clientes</h2>
            <div id="client-form-container"></div>
            <div id="client-list-container">
                <h3>Listado de Clientes</h3>
                <table id="client-table">
                    <thead>
                        <tr>
                            <th>RUT</th>
                            <th>Nombre</th>
                            <th>Apellido</th>
                            <th>Correo</th>
                            <th>Celular</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- Filas de clientes aquí -->
                    </tbody>
                </table>
            </div>
        `;
        renderClientForm();
        loadClientes();
    }

    async function loadClientes() {
        try {
            // Asumo que la API está en /api/clientes
            const response = await fetch('/api/clientes');
            if (!response.ok) throw new Error('Error al cargar los clientes');
            const clientes = await response.json();

            const tableBody = document.querySelector('#client-table tbody');
            tableBody.innerHTML = ''; // Limpiar tabla
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
                    </td>
                `;
                tableBody.appendChild(row);
            });

            // Event listeners para botones
            document.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', (e) => handleEditClient(e.target.dataset.id));
            });
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => handleDeleteClient(e.target.dataset.id));
            });

        } catch (error) {
            mainContent.innerHTML += `<p style="color:red;">${error.message}</p>`;
        }
    }

    function renderClientForm(cliente = {}) {
        const formContainer = document.getElementById('client-form-container');
        const isEditing = cliente.ID_CLIENTE;
        formContainer.innerHTML = `
            <h3>${isEditing ? 'Editar Cliente' : 'Agregar Nuevo Cliente'}</h3>
            <form id="client-form">
                <input type="hidden" id="id_cliente" value="${cliente.ID_CLIENTE || ''}">
                <label for="rut">RUT:</label>
                <input type="text" id="rut" name="rut" value="${cliente.RUT || ''}" required>
                <label for="nombre">Nombre:</label>
                <input type="text" id="nombre" name="nombre" value="${cliente.NOMBRE || ''}" required>
                <label for="apellido">Apellido:</label>
                <input type="text" id="apellido" name="apellido" value="${cliente.APELLIDO || ''}">
                <label for="correo">Correo:</label>
                <input type="email" id="correo" name="correo" value="${cliente.CORREO || ''}">
                <label for="celular">Celular:</label>
                <input type="text" id="celular" name="celular" value="${cliente.CELULAR || ''}">
                <button type="submit">${isEditing ? 'Actualizar' : 'Guardar'}</button>
                ${isEditing ? '<button type="button" id="cancel-edit">Cancelar</button>' : ''}
            </form>
        `;

        document.getElementById('client-form').addEventListener('submit', handleSaveClient);
        if (isEditing) {
            document.getElementById('cancel-edit').addEventListener('click', () => renderClientForm());
        }
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
        const url = id ? `/api/clientes/${id}` : '/api/clientes';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('Error al guardar el cliente.');
            
            showClientes(); // Recargar la vista de clientes
        } catch (error) {
            alert(error.message);
        }
    }

    async function handleEditClient(id) {
        try {
            const response = await fetch(`/api/clientes/${id}`);
            if (!response.ok) throw new Error('No se pudo cargar el cliente para editar.');
            const cliente = await response.json();
            renderClientForm(cliente[0]); // El procedure devuelve un array
        } catch (error) {
            alert(error.message);
        }
    }

    async function handleDeleteClient(id) {
        if (!confirm('¿Estás seguro de que deseas eliminar este cliente?')) return;

        try {
            const response = await fetch(`/api/clientes/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Error al eliminar el cliente.');
            
            showClientes(); // Recargar la vista de clientes
        } catch (error) {
            alert(error.message);
        }
    }

    // Cargar vista inicial
    showClientes();
});
