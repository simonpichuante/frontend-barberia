# Auth Backend (Barbería)

Backend mínimo de autenticación para la barbería.

Requisitos
- Node.js (>=14)
- Oracle Instant Client y librerías requeridas por `oracledb` configuradas en la máquina
- Base de datos Oracle con las tablas creadas (ver `../db/auth_schema.sql`)

Instalación
1. Copia `.env.example` a `.env` y ajusta las variables:
   - ORACLE_USER, ORACLE_PASSWORD, ORACLE_CONNECTIONSTRING
   - JWT_SECRET
2. Instala dependencias:

   npm install

3. Ejecuta en modo desarrollo:

   npm run dev

Uso
- POST /auth/login { usuario, password } -> { token }
- POST /auth/register { usuario, email, password } -> { id }
- GET /auth/me -> información del usuario (Bearer token requerido)

Notas
- Este backend es una plantilla; ajusta controles de seguridad, validaciones y el manejo de errores para producción.
- Asegúrate de crear el usuario administrador en la DB usando un hash bcrypt (ver ../db/auth_schema.sql comentarios).

