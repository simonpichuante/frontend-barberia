require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const authController = require('./controllers/authController');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Logging simple de peticiones para diagnóstico
app.use((req, res, next) => {
  console.log(`[http] ${req.method} ${req.originalUrl}`);
  next();
});

// Health endpoints para diagnóstico rápido
app.get('/', (req, res) => {
  res.json({ ok: true, service: 'auth-backend' });
});
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/auth/login', authController.login);
app.post('/auth/register', authController.register);
app.get('/auth/me', authController.me);

// Handler catch-all para devolver JSON cuando la ruta no exista (mejor que HTML)
app.use((req, res) => {
  res.status(404).json({ error: 'not found', path: req.originalUrl });
});

// Middleware de manejo de errores para que devolvamos mensajes legibles
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Auth backend listening on ${PORT}`));
