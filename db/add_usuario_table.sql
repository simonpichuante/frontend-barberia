-- add_usuario_table.sql
-- Añade la tabla USUARIO (id, usuario, contrasena) para autenticación
-- Crea secuencia y trigger para PK autoincremental, y una vista "usuarios" para compatibilidad

SET DEFINE OFF;

-- Secuencia para id de usuario
CREATE SEQUENCE seq_usuario START WITH 1 INCREMENT BY 1 NOCACHE;

-- Tabla USUARIO (solo los campos solicitados)
CREATE TABLE USUARIO (
  ID_USUARIO NUMBER PRIMARY KEY,
  USUARIO VARCHAR2(100) NOT NULL UNIQUE,
  CONTRASENA VARCHAR2(200) NOT NULL
);

-- Trigger para asignar PK
CREATE OR REPLACE TRIGGER trg_bi_usuario
BEFORE INSERT ON USUARIO
FOR EACH ROW
BEGIN
  :NEW.ID_USUARIO := seq_usuario.NEXTVAL;
END;
/

CREATE OR REPLACE VIEW usuarios AS
SELECT
  ID_USUARIO AS id,
  USUARIO AS usuario,
  CONTRASENA AS password_hash
FROM USUARIO;
/

COMMIT;

BEGIN
  INSERT INTO USUARIO (USUARIO, CONTRASENA) VALUES ('admin', 'qwerty');
  COMMIT;
EXCEPTION WHEN OTHERS THEN
  ROLLBACK;
END;
/

