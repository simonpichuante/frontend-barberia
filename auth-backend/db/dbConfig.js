// filepath: c:\development\frontend-barberia\auth-backend\db\dbConfig.js
// Implementación mínima en memoria para pruebas locales.
// No pretende ser una réplica completa de OracleDB, sólo cubre lo necesario
// para los queries usados en authController.js (SELECT por usuario, SELECT por id, INSERT INTO USUARIO).

let nextId = 2;
const users = [
  // Usuario de prueba por defecto: usuario 'admin' con contraseña 'admin' (texto plano, sólo para pruebas locales)
  { ID_USUARIO: 1, USUARIO: 'admin', CONTRASENA: 'admin' }
];

async function execute(sql, params) {
  const s = (sql || '').toUpperCase();
  // SELECT por usuario
  if (s.includes('FROM USUARIO') && s.includes('WHERE USUARIO =')) {
    const usuario = params && (params.u || params.USUARIO || params.usuario);
    const row = users.find(u => u.USUARIO === usuario);
    if (row) return { rows: [row] };
    return { rows: [] };
  }

  // SELECT por id
  if (s.includes('FROM USUARIO') && s.includes('WHERE ID_USUARIO =')) {
    const id = params && (params.id || params.ID);
    const row = users.find(u => String(u.ID_USUARIO) === String(id));
    if (row) return { rows: [row] };
    return { rows: [] };
  }

  // INSERT INTO USUARIO (USUARIO, CONTRASENA) VALUES (:u, :ph)
  if (s.startsWith('INSERT') && s.includes('INTO USUARIO')) {
    const usuario = params && (params.u || params.USUARIO || params.usuario);
    const ph = params && (params.ph || params.PH || params.password_hash || params.password);
    const newUser = { ID_USUARIO: nextId++, USUARIO: usuario, CONTRASENA: ph };
    users.push(newUser);
    return { rowsAffected: 1 };
  }

  // Por defecto, intentar devolver un array vacío para evitar excepciones.
  return { rows: [] };
}

module.exports = { execute };
