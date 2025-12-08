const bcrypt = require('bcryptjs');
const db = require('../db/dbConfig');
let oracledb = null;
try {
  oracledb = require('oracledb');
} catch (e) {
  // oracledb es opcional en entorno de desarrollo local (usamos db/dbConfig.js simulado)
  oracledb = null;
}

async function findUserByUsuario(usuario) {
  // Ajustado para la tabla USUARIO (ID_USUARIO, USUARIO, CONTRASENA)
  const sql = `SELECT ID_USUARIO AS id, USUARIO AS usuario, CONTRASENA AS password_hash FROM USUARIO WHERE USUARIO = :u`;
  const r = await db.execute(sql, { u: usuario });
  const rows = (r && r.rows) ? r.rows : (Array.isArray(r) ? r : []);
  return (rows && rows.length) ? rows[0] : null;
}

async function findUserById(id) {
  const sql = `SELECT ID_USUARIO AS id, USUARIO AS usuario FROM USUARIO WHERE ID_USUARIO = :id`;
  const r = await db.execute(sql, { id });
  const rows = (r && r.rows) ? r.rows : (Array.isArray(r) ? r : []);
  return (rows && rows.length) ? rows[0] : null;
}

async function login(req, res) {
  try {
    const { usuario, password } = req.body;
    console.log(`[auth] login attempt for user: ${usuario}`);
    if (!usuario || !password) return res.status(400).json({ ok: false, error: 'usuario y password requeridos' });

    const userRow = await findUserByUsuario(usuario);
    console.log('[auth] userRow from DB:', !!userRow);
    if (!userRow) return res.status(401).json({ ok: false, error: 'Credenciales inválidas' });

    // leer hash en varias capitalizaciones
    const hash = userRow.PASSWORD_HASH || userRow.password_hash || userRow.PASSWORD_hash || userRow.CONTRASENA || userRow.contrasena;
    if (!hash) return res.status(401).json({ ok: false, error: 'Credenciales inválidas' });

    // Comparar: si es hash bcrypt usar compare, si no comparar en texto plano
    let ok = false;
    if (typeof hash === 'string' && hash.startsWith('$2')) {
      ok = await bcrypt.compare(password, hash);
    } else {
      ok = (password === hash);
    }
    console.log('[auth] password match:', ok);
    if (!ok) return res.status(401).json({ ok: false, error: 'Credenciales inválidas' });

    // Éxito: devolver ok y el usuario
    res.json({ ok: true, usuario: userRow.USUARIO || userRow.usuario });
  } catch (err) {
    console.error('Login error', err);
    res.status(500).json({ ok: false, error: 'Error interno' });
  }
}

async function register(req, res) {
  try {
    const { usuario, email, password } = req.body;
    if (!usuario || !password) return res.status(400).json({ ok: false, error: 'usuario y password requeridos' });

    const exists = await findUserByUsuario(usuario);
    if (exists) return res.status(409).json({ ok: false, error: 'Usuario ya existe' });

    const hash = await bcrypt.hash(password, 10);
    const sql = `INSERT INTO USUARIO (USUARIO, CONTRASENA) VALUES (:u, :ph)`;
    await db.execute(sql, { u: usuario, ph: hash });

    // recuperar id
    const newUser = await findUserByUsuario(usuario);
    res.status(201).json({ ok: true, id: newUser && (newUser.ID || newUser.id) });
  } catch (err) {
    console.error('Register error', err);
    res.status(500).json({ ok: false, error: 'Error interno' });
  }
}

// Mantener /auth/me simple para compatibilidad: si existe query ?usuario=<user> devolverá usuario
async function me(req, res) {
  try {
    const qUser = req.query.usuario;
    if (!qUser) return res.status(400).json({ ok: false, error: 'usuario query requerido' });
    const user = await findUserByUsuario(qUser);
    if (!user) return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
    res.json({ ok: true, usuario: user.USUARIO || user.usuario });
  } catch (err) {
    console.error('Me error', err);
    res.status(500).json({ ok: false, error: 'Error interno' });
  }
}

module.exports = { login, register, me };
