const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function migrate() {
    console.log('Iniciando migración de seguridad para usuarios...');

    const pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'agro_db'
    });

    try {
        // Hashear contraseñas
        const hashAdmin = await bcrypt.hash('123456', 10);
        const hashCaja = await bcrypt.hash('caja123', 10);

        // Limpiar tabla
        await pool.query('DELETE FROM usuarios');
        await pool.query('ALTER TABLE usuarios AUTO_INCREMENT = 1');

        // Insertar admin
        await pool.query(`
            INSERT INTO usuarios (username, password, nombre, rol, activo)
            VALUES (?, ?, ?, ?, ?)
        `, ['admin', hashAdmin, 'Administrador Principal', 'admin', true]);

        // Insertar caja
        await pool.query(`
            INSERT INTO usuarios (username, password, nombre, rol, activo)
            VALUES (?, ?, ?, ?, ?)
        `, ['caja', hashCaja, 'Cajero Turno', 'cajero', true]);

        console.log('✓ Usuarios reactualizados.');
        console.log('Admin: admin / 123456');
        console.log('Cajero: caja / caja123');

    } catch (error) {
        console.error('Error durante la migración:', error);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

migrate();
