const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// REDIRECCIÓN DE LOGS PARA DEPURACIÓN
const logFile = fs.createWriteStream(path.join(__dirname, 'debug.log'), { flags: 'a' });
const originalLog = console.log;
console.log = function (...args) {
    const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ');
    logFile.write(`[${new Date().toISOString()}] ${msg}\n`);
    originalLog.apply(console, args);
};
const originalError = console.error;
console.error = function (...args) {
    const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ');
    logFile.write(`[${new Date().toISOString()}] ERROR: ${msg}\n`);
    originalError.apply(console, args);
};

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const pool = require('./config/db.js');
const inventarioInicial = require('./config/inventario_base.js');

const STATE_FILE = path.join(__dirname, 'state.json');
const BACKUPS_DIR = path.join(__dirname, 'respaldos');

// Ensure backups directory exists
if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

// Respaldo Automático Diario
function crearRespaldoDiario() {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(BACKUPS_DIR, `backup_state_${timestamp}.json`);
        fs.writeFileSync(backupFile, JSON.stringify(globalState, null, 2));
        console.log(`[BACKUP] Respaldo diario creado exitosamente en: ${backupFile}`);
    } catch (err) {
        console.error('[ERROR] No se pudo crear el respaldo diario:', err);
    }
}

// INITIAL STATE
let globalState = {
    products: inventarioInicial,
    prepagos: [],
    deudores: [],
    cajaBalances: { usd: 0, bs: 0, digitalBs: 0, inicialUsd: 0, inicialBs: 0 },
    exchangeRate: 36.50,
    isCajaAbierta: false,
    movimientos: [],
    historialTasas: [],
    historialCapital: [],
    configuracionDescuentos: {
        porMetodoPago: [],
        porVolumen: []
    }
};

// Cargar estado inicial desde state.json si existe
if (fs.existsSync(STATE_FILE)) {
    try {
        const rawData = fs.readFileSync(STATE_FILE, 'utf8');
        const savedState = JSON.parse(rawData);
        globalState = { ...globalState, ...savedState };
        console.log('[SISTEMA] Estado previo cargado desde state.json');
    } catch (err) {
        console.error('[ERROR] No se pudo leer el archivo state.json:', err);
    }
}

io.on('connection', async (socket) => {
    console.log(`New client connected: ${socket.id} from ${socket.handshake.address}`);

    try {
        const [productosRows] = await pool.query('SELECT * FROM productos');
        const [cajaRows] = await pool.query('SELECT * FROM caja_diaria WHERE id = 1');
        const [movimientosRows] = await pool.query('SELECT * FROM historial_ventas');

        // Mapear el historial desde la BD reconstruyendo los JSON
        const movimientosFormateados = movimientosRows.map(row => ({
            id: row.id,
            fechaHora: row.fechaHora,
            totalPagado: parseFloat(row.totalPagado),
            gananciaNetaVenta: parseFloat(row.gananciaNetaVenta),
            gananciaSacos: parseFloat(row.gananciaSacos),
            gananciaKilos: parseFloat(row.gananciaKilos),
            ventaBrutaSacos: parseFloat(row.ventaBrutaSacos),
            ventaBrutaKilos: parseFloat(row.ventaBrutaKilos),
            metodoPago: typeof row.metodosPago === 'string' ? JSON.parse(row.metodosPago) : row.metodosPago,
            productos: typeof row.productos === 'string' ? JSON.parse(row.productos) : row.productos,
            exchangeRate: parseFloat(row.exchangeRate),
            cliente: row.cliente,
            esCredito: Boolean(row.esCredito),
            promocionesAplicadas: Boolean(row.promocionesAplicadas),
            descuentoMetodoPagoTotal: parseFloat(row.descuentoMetodoPagoTotal)
        }));

        globalState.products = productosRows.map(p => ({
            ...p,
            price: parseFloat(p.price),
            precioKilo: parseFloat(p.precioKilo),
            precioSaco: parseFloat(p.precioSaco),
            pesoPorSaco: parseFloat(p.pesoPorSaco),
            costoBase: parseFloat(p.costoBase),
            gananciaSacoPct: parseFloat(p.gananciaSacoPct),
            gananciaKiloPct: parseFloat(p.gananciaKiloPct),
            stock: parseFloat(p.stock)
        }));

        if (cajaRows.length > 0) {
            const cajaObj = cajaRows[0];
            globalState.cajaBalances = {
                usd: parseFloat(cajaObj.usd),
                bs: parseFloat(cajaObj.bs),
                digitalBs: parseFloat(cajaObj.digitalBs),
                inicialUsd: parseFloat(cajaObj.inicialUsd),
                inicialBs: parseFloat(cajaObj.inicialBs)
            };
            globalState.isCajaAbierta = Boolean(cajaObj.isCajaAbierta);
            globalState.exchangeRate = parseFloat(cajaObj.exchangeRate);
        }

        globalState.movimientos = movimientosFormateados;

    } catch (err) {
        console.error("Error cargando el estado inicial desde MySQL:", err);
    }

    // Send initial state to the newly connected client
    socket.emit('initial_state', globalState);

    // Listen for product updates
    socket.on('update_products', async (newProducts) => {
        try {
            const connection = await pool.getConnection();
            await connection.query('START TRANSACTION');
            await connection.query('TRUNCATE TABLE productos');
            for (let p of newProducts) {
                await connection.query(`
                    INSERT INTO productos (id, name, price, precioKilo, precioSaco, pesoPorSaco, costoBase, gananciaSacoPct, gananciaKiloPct, stock, metric, icon)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [p.id, p.name, p.price, p.precioKilo, p.precioSaco, p.pesoPorSaco, p.costoBase, p.gananciaSacoPct, p.gananciaKiloPct, p.stock, p.metric, p.icon]);
            }
            await connection.query('COMMIT');
            connection.release();

            globalState.products = newProducts;
            io.emit('products_updated', newProducts);
        } catch (err) {
            console.error('Error actualizando productos en MySQL:', err);
        }
    });

    // Listen for prepagos updates
    socket.on('update_prepagos', (newPrepagos) => {
        globalState.prepagos = newPrepagos;
        io.emit('prepagos_updated', newPrepagos);
    });

    // Listen for deudores updates
    socket.on('update_deudores', (newDeudores) => {
        globalState.deudores = newDeudores;
        io.emit('deudores_updated', newDeudores);
    });

    // Listen for descuentos updates
    socket.on('update_descuentos', (newDescuentos) => {
        globalState.configuracionDescuentos = newDescuentos;
        io.emit('descuentos_updated', newDescuentos);
    });

    // Listen for caja updates
    socket.on('update_caja', async (newBalances) => {
        const oldRate = globalState.exchangeRate;
        const wasOpen = globalState.isCajaAbierta;

        globalState.cajaBalances = { ...globalState.cajaBalances, ...newBalances };
        if (newBalances.isCajaAbierta !== undefined) globalState.isCajaAbierta = newBalances.isCajaAbierta;
        if (newBalances.exchangeRate !== undefined) globalState.exchangeRate = newBalances.exchangeRate;

        // DB Persistence for Caja
        try {
            await pool.query(`
                UPDATE caja_diaria 
                SET usd = ?, bs = ?, digitalBs = ?, inicialUsd = ?, inicialBs = ?, isCajaAbierta = ?, exchangeRate = ?
                WHERE id = 1
            `, [
                globalState.cajaBalances.usd || 0,
                globalState.cajaBalances.bs || 0,
                globalState.cajaBalances.digitalBs || 0,
                globalState.cajaBalances.inicialUsd || 0,
                globalState.cajaBalances.inicialBs || 0,
                globalState.isCajaAbierta,
                globalState.exchangeRate
            ]);
        } catch (err) {
            console.error('Error updating caja in DB:', err);
        }

        // Track rate history
        if (newBalances.exchangeRate !== undefined && newBalances.exchangeRate !== oldRate) {
            globalState.historialTasas.push({
                fecha: new Date().toISOString().split('T')[0],
                tasa: newBalances.exchangeRate
            });
        }

        // Track capital history on closure (STRICT p.price * p.stock)
        if (wasOpen && globalState.isCajaAbierta === false) {
            const inventoryValue = globalState.products.reduce((acc, p) => {
                return acc + (p.price * p.stock);
            }, 0);
            globalState.historialCapital.push({
                fecha: new Date().toISOString().split('T')[0],
                valorInventario: inventoryValue
            });

            // Disparar respaldo justo al cerrar la caja, antes de resetear valores temporales
            crearRespaldoDiario();
        }

        io.emit('caja_updated', globalState);
    });

    // Listen for sales records
    socket.on('record_sale', async (saleRecord) => {
        let gananciaTotalSacos = 0;
        let gananciaTotalKilos = 0;
        let totalSacosBruto = 0;
        let totalKilosBruto = 0;

        saleRecord.items.forEach(item => {
            const product = globalState.products.find(p => p.id === item.id) || {};
            const itemGross = item.price * item.quantity;

            if (item.tipoVenta === 'saco') {
                const costoSaco = product.price || 0; // price in product is the cost
                const gananciaSaco = (item.price - costoSaco) * item.quantity;
                gananciaTotalSacos += (gananciaSaco > 0 ? gananciaSaco : 0);
                totalSacosBruto += itemGross;
            } else { // kilos or un
                const costoKg = (product.price || 0) / (product.pesoPorSaco || 50);
                const gananciaKilo = (item.price - costoKg) * item.quantity;
                gananciaTotalKilos += (gananciaKilo > 0 ? gananciaKilo : 0);
                totalKilosBruto += itemGross;
            }
        });

        const gananciaNetaBruta = gananciaTotalSacos + gananciaTotalKilos;
        const totalPagadoUsd = saleRecord.metodosPago.reduce((acc, m) => acc + m.monto, 0);
        const comisionesDescontadas = saleRecord.descuentoMetodoPagoTotal || 0;
        const gananciaNetaFinal = gananciaNetaBruta - comisionesDescontadas;

        const ticket = {
            id: Date.now().toString(),
            fechaHora: new Date().toISOString(),
            ...saleRecord,
            metodoPago: saleRecord.metodosPago, // keeping it for the array structured
            productos: saleRecord.items,
            totalPagado: totalPagadoUsd,
            gananciaNetaVenta: gananciaNetaFinal,
            gananciaSacos: gananciaTotalSacos,
            gananciaKilos: gananciaTotalKilos,
            ventaBrutaSacos: totalSacosBruto,
            ventaBrutaKilos: totalKilosBruto,
        };

        try {
            const connection = await pool.getConnection();
            await connection.query('START TRANSACTION');

            const ticketFecha = new Date(ticket.fechaHora).toISOString().slice(0, 19).replace('T', ' ');

            // 1. Insert ticket
            await connection.query(`
                INSERT INTO historial_ventas 
                (id, fechaHora, totalPagado, gananciaNetaVenta, gananciaSacos, gananciaKilos, ventaBrutaSacos, ventaBrutaKilos, metodosPago, productos, exchangeRate, cliente, esCredito, promocionesAplicadas, descuentoMetodoPagoTotal)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                ticket.id, ticketFecha, ticket.totalPagado, ticket.gananciaNetaVenta,
                ticket.gananciaSacos, ticket.gananciaKilos, ticket.ventaBrutaSacos, ticket.ventaBrutaKilos,
                JSON.stringify(ticket.metodoPago || []), JSON.stringify(ticket.productos || []),
                ticket.exchangeRate || globalState.exchangeRate || 1, ticket.cliente || 'Cliente Genérico',
                ticket.esCredito || false, ticket.promocionesAplicadas || false, ticket.descuentoMetodoPagoTotal || 0
            ]);

            // 2. Decrement stock
            for (let item of saleRecord.items) {
                let deduction = item.quantity;
                if (item.tipoVenta === 'detal') {
                    const productObj = globalState.products.find(p => p.id === item.id);
                    if (productObj && productObj.pesoPorSaco) {
                        deduction = item.quantity / productObj.pesoPorSaco;
                    } else {
                        deduction = item.quantity / 50;
                    }
                }
                await connection.query('UPDATE productos SET stock = stock - ? WHERE id = ?', [deduction, item.id]);

                // Update in-memory state implicitly for other sockets without DB requery
                const memProduct = globalState.products.find(p => p.id === item.id);
                if (memProduct) {
                    memProduct.stock -= deduction;
                }
            }

            await connection.query('COMMIT');
            connection.release();

            if (!globalState.movimientos) globalState.movimientos = [];
            globalState.movimientos.push(ticket);

            // To ensure clients also see the updated products dynamically based on stock deduc.
            io.emit('products_updated', globalState.products);
            io.emit('movimientos_updated', globalState.movimientos);

        } catch (err) {
            console.error('Database Transaction Error on Checkout:', err);
        }
    });

    // Listen for Authentication (Login)
    socket.on('login', async ({ username, password }, callback) => {
        console.log(`[AUTH] Intento de login: usuario="${username}"`);
        try {
            const [rows] = await pool.query(`
                SELECT u.*, r.nombre as rol_nombre
                FROM usuarios u 
                LEFT JOIN roles r ON u.rol_id = r.id 
                WHERE u.username = ? AND u.activo = 1
            `, [username]);

            if (rows.length > 0) {
                const user = rows[0];

                const match = await bcrypt.compare(password, user.password);

                if (match) {
                    const { password: _, ...userSafe } = user;

                    // Fetch permissions from relational tables
                    const [permRows] = await pool.query(`
                        SELECT p.modulo, p.accion 
                        FROM role_permissions rp
                        JOIN permisos p ON rp.permiso_id = p.id
                        WHERE rp.role_id = ?
                    `, [user.rol_id]);

                    // Reconstruct permissions object for frontend compatibility
                    const reconstructedPerms = {};
                    permRows.forEach(p => {
                        if (!reconstructedPerms[p.modulo]) {
                            reconstructedPerms[p.modulo] = { leer: false, crear: false, editar: false, eliminar: false };
                        }
                        reconstructedPerms[p.modulo][p.accion] = true;
                    });

                    userSafe.permisos = reconstructedPerms;

                    callback({ action: 'login', success: true, user: userSafe });
                } else {
                    callback({ action: 'login', success: false, message: 'Usuario o contraseña incorrectos.' });
                }
            } else {
                callback({ action: 'login', success: false, message: 'Usuario o contraseña incorrectos, o cuenta inactiva.' });
            }
        } catch (error) {
            console.error('Login Error:', error);
            callback({ action: 'login', success: false, message: 'Error interno del servidor durante la autenticación.' });
        }
    });

    // --- User Management Events (CRUD) --- 
    socket.on('get_usuarios', async (callback) => {
        try {
            const [rows] = await pool.query(`
                SELECT u.id, u.username, u.nombre, u.activo, u.rol_id, r.nombre as rol_nombre 
                FROM usuarios u 
                LEFT JOIN roles r ON u.rol_id = r.id
            `);
            callback({ success: true, usuarios: rows });
        } catch (err) {
            console.error('Error fetching users:', err);
            callback({ success: false, message: 'Error al obtener usuarios' });
        }
    });

    socket.on('create_usuario', async (userData, callback) => {
        try {
            const { username, password, nombre, rol_id, activo } = userData;
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            await pool.query(
                'INSERT INTO usuarios (username, password, nombre, rol_id, activo) VALUES (?, ?, ?, ?, ?)',
                [username, hashedPassword, nombre, rol_id, activo]
            );
            callback({ success: true, message: 'Usuario creado exitosamente' });
        } catch (err) {
            console.error('Error creating user:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                return callback({ success: false, message: 'El nombre de usuario ya existe' });
            }
            callback({ success: false, message: 'Error al crear usuario' });
        }
    });

    socket.on('update_usuario', async (userData, callback) => {
        try {
            const { id, username, password, nombre, rol_id, activo } = userData;

            if (password) {
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(password, salt);
                await pool.query(
                    'UPDATE usuarios SET username=?, password=?, nombre=?, rol_id=?, activo=? WHERE id=?',
                    [username, hashedPassword, nombre, rol_id, activo, id]
                );
            } else {
                await pool.query(
                    'UPDATE usuarios SET username=?, nombre=?, rol_id=?, activo=? WHERE id=?',
                    [username, nombre, rol_id, activo, id]
                );
            }
            callback({ success: true, message: 'Usuario actualizado exitosamente' });
        } catch (err) {
            console.error('Error updating user:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                return callback({ success: false, message: 'El nombre de usuario ya existe' });
            }
            callback({ success: false, message: 'Error al actualizar usuario' });
        }
    });

    socket.on('delete_usuario', async (id, callback) => {
        try {
            await pool.query('DELETE FROM usuarios WHERE id = ?', [id]);
            callback({ success: true, message: 'Usuario eliminado' });
        } catch (err) {
            console.error('Error deleting user:', err);
            callback({ success: false, message: 'Error al eliminar usuario' });
        }
    });

    // --- Roles Management Events ---
    socket.on('get_roles', async (callback) => {
        try {
            const [roles] = await pool.query('SELECT * FROM roles');
            const [rolePerms] = await pool.query(`
                SELECT rp.role_id, p.modulo, p.accion 
                FROM role_permissions rp
                JOIN permisos p ON rp.permiso_id = p.id
            `);

            const safeRoles = roles.map(r => {
                const perms = {};
                rolePerms
                    .filter(rp => rp.role_id === r.id)
                    .forEach(rp => {
                        if (!perms[rp.modulo]) perms[rp.modulo] = { leer: false, crear: false, editar: false, eliminar: false };
                        perms[rp.modulo][rp.accion] = true;
                    });
                return { ...r, permisos: perms };
            });
            callback({ success: true, roles: safeRoles });
        } catch (err) {
            console.error('Error fetching roles:', err);
            callback({ success: false, message: 'Error al obtener roles' });
        }
    });

    socket.on('create_rol', async (rolData, callback) => {
        try {
            const { nombre, permisos } = rolData;
            const [result] = await pool.query('INSERT INTO roles (nombre) VALUES (?)', [nombre]);
            const roleId = result.insertId;

            // Save permissions to role_permissions
            const [allPermisos] = await pool.query('SELECT id, slug FROM permisos');
            for (const modulo in permisos) {
                for (const accion in permisos[modulo]) {
                    if (permisos[modulo][accion] === true) {
                        const slug = `${modulo}.${accion}`;
                        const pMatch = allPermisos.find(p => p.slug === slug);
                        if (pMatch) {
                            await pool.query('INSERT INTO role_permissions (role_id, permiso_id) VALUES (?, ?)', [roleId, pMatch.id]);
                        }
                    }
                }
            }
            callback({ success: true, message: 'Rol creado exitosamente' });
        } catch (err) {
            console.error('Error creating rol:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                return callback({ success: false, message: 'El nombre del rol ya existe' });
            }
            callback({ success: false, message: 'Error al crear rol' });
        }
    });

    socket.on('update_rol', async (rolData, callback) => {
        try {
            const { id, nombre, permisos } = rolData;
            await pool.query('UPDATE roles SET nombre=? WHERE id=?', [nombre, id]);

            // Sync permissions
            await pool.query('DELETE FROM role_permissions WHERE role_id = ?', [id]);
            const [allPermisos] = await pool.query('SELECT id, slug FROM permisos');
            for (const modulo in permisos) {
                for (const accion in permisos[modulo]) {
                    if (permisos[modulo][accion] === true) {
                        const slug = `${modulo}.${accion}`;
                        const pMatch = allPermisos.find(p => p.slug === slug);
                        if (pMatch) {
                            await pool.query('INSERT INTO role_permissions (role_id, permiso_id) VALUES (?, ?)', [id, pMatch.id]);
                        }
                    }
                }
            }
            callback({ success: true, message: 'Rol actualizado exitosamente' });
        } catch (err) {
            console.error('Error updating rol:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                return callback({ success: false, message: 'El nombre del rol ya existe' });
            }
            callback({ success: false, message: 'Error al actualizar rol' });
        }
    });

    socket.on('delete_rol', async (id, callback) => {
        try {
            // Reasignar usuarios a NULL u otro rol por omisión, o dejar que la BD actue ON DELETE SET NULL
            await pool.query('DELETE FROM roles WHERE id = ?', [id]);
            callback({ success: true, message: 'Rol eliminado exitosamente' });
        } catch (err) {
            console.error('Error deleting rol:', err);
            callback({ success: false, message: 'Error al eliminar rol. Asegúrese de que no esté en uso.' });
        }
    });

    // --- Backup Management Events ---
    socket.on('backup_database_json', async (callback) => {
        try {
            console.log('Generando respaldo completo de la Base de Datos...');
            const backupData = {};

            const [productos] = await pool.query('SELECT * FROM productos');
            backupData.productos = productos;

            const [ventas] = await pool.query('SELECT * FROM historial_ventas');
            backupData.historial_ventas = ventas;

            const [caja] = await pool.query('SELECT * FROM caja_diaria');
            backupData.caja_diaria = caja;

            const [roles] = await pool.query('SELECT * FROM roles');
            backupData.roles = roles;

            const [usuarios] = await pool.query('SELECT id, username, nombre, rol_id, activo FROM usuarios'); // Omitir passwords del backup json por seguridad, o incluirlos encriptados si se desea
            backupData.usuarios = usuarios;

            console.log('Respaldo generado exitosamente.');
            callback({ success: true, data: backupData });
        } catch (err) {
            console.error('Error generando respaldo de DB:', err);
            callback({ success: false, message: 'Error interno al generar el archivo de respaldo.' });
        }
    });

    // --- Profile Management Events ---
    socket.on('update_profile', async (profileData, callback) => {
        try {
            const { id, username, nombre } = profileData;
            await pool.query('UPDATE usuarios SET username=?, nombre=? WHERE id=?', [username, nombre, id]);
            callback({ success: true, message: 'Perfil actualizado' });
        } catch (err) {
            console.error('Error updating profile:', err);
            callback({ success: false, message: 'Error al actualizar perfil' });
        }
    });

    socket.on('cambiar_password', async (data, callback) => {
        try {
            const { id, currentPassword, newPassword } = data;
            const [rows] = await pool.query('SELECT password FROM usuarios WHERE id = ?', [id]);

            if (rows.length === 0) return callback({ success: false, message: 'Usuario no encontrado' });

            const match = await bcrypt.compare(currentPassword, rows[0].password);
            if (!match) return callback({ success: false, message: 'La contraseña actual es incorrecta' });

            const salt = await bcrypt.genSalt(10);
            const hashedNew = await bcrypt.hash(newPassword, salt);

            await pool.query('UPDATE usuarios SET password=? WHERE id=?', [hashedNew, id]);
            callback({ success: true, message: 'Contraseña actualizada exitosamente' });

        } catch (err) {
            console.error('Error changing password:', err);
            callback({ success: false, message: 'Error interno al cambiar contraseña' });
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = 3001;

async function initDB() {
    console.log('Conectando e inicializando MySQL Database (agro_db)...');
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS productos (
                id INT PRIMARY KEY,
                name VARCHAR(255),
                price DECIMAL(10,2),
                precioKilo DECIMAL(10,2) DEFAULT 0,
                precioSaco DECIMAL(10,2) DEFAULT 0,
                pesoPorSaco DECIMAL(10,2),
                costoBase DECIMAL(10,2),
                gananciaSacoPct DECIMAL(10,2),
                gananciaKiloPct DECIMAL(10,2),
                stock DECIMAL(10,2),
                metric VARCHAR(50),
                icon VARCHAR(50)
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS historial_ventas (
                id VARCHAR(255) PRIMARY KEY,
                fechaHora DATETIME,
                totalPagado DECIMAL(10,2),
                gananciaNetaVenta DECIMAL(10,2),
                gananciaSacos DECIMAL(10,2),
                gananciaKilos DECIMAL(10,2),
                ventaBrutaSacos DECIMAL(10,2),
                ventaBrutaKilos DECIMAL(10,2),
                metodosPago JSON,
                productos JSON,
                exchangeRate DECIMAL(10,2),
                cliente VARCHAR(255),
                esCredito BOOLEAN,
                promocionesAplicadas BOOLEAN,
                descuentoMetodoPagoTotal DECIMAL(10,2)
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS caja_diaria (
                id INT PRIMARY KEY DEFAULT 1,
                usd DECIMAL(10,2),
                bs DECIMAL(10,2),
                digitalBs DECIMAL(10,2),
                inicialUsd DECIMAL(10,2),
                inicialBs DECIMAL(10,2),
                isCajaAbierta BOOLEAN,
                exchangeRate DECIMAL(10,2)
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS permisos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                modulo VARCHAR(50) NOT NULL,
                accion VARCHAR(50) NOT NULL,
                slug VARCHAR(100) UNIQUE NOT NULL
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS role_permissions (
                role_id INT,
                permiso_id INT,
                PRIMARY KEY (role_id, permiso_id),
                FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
                FOREIGN KEY (permiso_id) REFERENCES permisos(id) ON DELETE CASCADE
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS roles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nombre VARCHAR(100) UNIQUE NOT NULL,
                permisos JSON
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                nombre VARCHAR(100),
                activo BOOLEAN DEFAULT TRUE,
                rol_id INT,
                FOREIGN KEY (rol_id) REFERENCES roles(id) ON DELETE SET NULL
            )
        `);

        // Migración forzada: Asegurar que rol_id existe si la tabla ya existía sin él
        try { await pool.query('ALTER TABLE usuarios ADD COLUMN rol_id INT AFTER activo'); } catch (e) { }
        try { await pool.query('ALTER TABLE usuarios ADD CONSTRAINT fk_rol_id FOREIGN KEY (rol_id) REFERENCES roles(id) ON DELETE SET NULL'); } catch (e) { }

        // REPARACIÓN: Asignar rol_id a usuarios que quedaron huérfanos tras la migración
        await pool.query("UPDATE usuarios SET rol_id = 1 WHERE username = 'admin' AND rol_id IS NULL");
        await pool.query("UPDATE usuarios SET rol_id = 2 WHERE username = 'caja' AND rol_id IS NULL");
        // Por si hay otros usuarios sin rol, asignarles Cajero por defecto
        await pool.query("UPDATE usuarios SET rol_id = 2 WHERE rol_id IS NULL");

        // Ejecutar migraciones si la BD es antigua (ignorar errores si ya se aplicaron)
        try { await pool.query('ALTER TABLE usuarios DROP COLUMN rol'); } catch (e) { }
        try { await pool.query('ALTER TABLE usuarios DROP COLUMN permisos'); } catch (e) { }

        // Check if we need to seed products from the loaded state.json
        const [rows] = await pool.query('SELECT COUNT(*) as count FROM productos');
        if (rows[0].count === 0 && globalState.products && globalState.products.length > 0) {
            console.log('Migrando productos de state.json a MySQL...');
            for (let p of globalState.products) {
                await pool.query(`
                    INSERT INTO productos (id, name, price, precioKilo, precioSaco, pesoPorSaco, costoBase, gananciaSacoPct, gananciaKiloPct, stock, metric, icon)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [p.id, p.name, p.price, p.precioKilo, p.precioSaco, p.pesoPorSaco, p.costoBase, p.gananciaSacoPct, p.gananciaKiloPct, p.stock, p.metric, p.icon]);
            }
            console.log('Productos migrados exitosamente a MySQL.');
        }

        // Initialize caja table if empty
        const [cajaRows] = await pool.query('SELECT COUNT(*) as count FROM caja_diaria');
        if (cajaRows[0].count === 0) {
            await pool.query(`
                INSERT INTO caja_diaria (id, usd, bs, digitalBs, inicialUsd, inicialBs, isCajaAbierta, exchangeRate)
                VALUES (1, ?, ?, ?, ?, ?, ?, ?)
            `, [
                globalState.cajaBalances.usd || 0,
                globalState.cajaBalances.bs || 0,
                globalState.cajaBalances.digitalBs || 0,
                globalState.cajaBalances.inicialUsd || 0,
                globalState.cajaBalances.inicialBs || 0,
                globalState.isCajaAbierta || false,
                globalState.exchangeRate || 36.5
            ]);
            console.log('Métricas de Caja Diaria inicializadas en MySQL.');
        }

        const [permisosCount] = await pool.query('SELECT COUNT(*) as count FROM permisos');
        if (permisosCount[0].count === 0) {
            console.log('Sembrando catálogo de permisos relacionales...');
            const modulos = ['ventas', 'caja', 'inventario', 'deudores', 'prepagos', 'promociones', 'estadisticas', 'usuarios', 'roles', 'ajustes'];
            const acciones = ['leer', 'crear', 'editar', 'eliminar'];

            for (const modulo of modulos) {
                for (const accion of acciones) {
                    const slug = `${modulo}.${accion}`;
                    await pool.query('INSERT IGNORE INTO permisos (modulo, accion, slug) VALUES (?, ?, ?)', [modulo, accion, slug]);
                }
            }
        }

        const [rolesDesc] = await pool.query('SELECT COUNT(*) as count FROM roles');
        if (rolesDesc[0].count === 0) {
            const adminPermisos = JSON.stringify({
                ventas: { leer: true, crear: true, editar: true, eliminar: true },
                caja: { leer: true, crear: true, editar: true, eliminar: true },
                inventario: { leer: true, crear: true, editar: true, eliminar: true },
                deudores: { leer: true, crear: true, editar: true, eliminar: true },
                prepagos: { leer: true, crear: true, editar: true, eliminar: true },
                promociones: { leer: true, crear: true, editar: true, eliminar: true },
                estadisticas: { leer: true, crear: true, editar: true, eliminar: true },
                usuarios: { leer: true, crear: true, editar: true, eliminar: true },
                roles: { leer: true, crear: true, editar: true, eliminar: true }
            });

            const cajeroPermisos = JSON.stringify({
                ventas: { leer: true, crear: true, editar: false, eliminar: false },
                caja: { leer: true, crear: true, editar: false, eliminar: false },
                inventario: { leer: false, crear: false, editar: false, eliminar: false },
                deudores: { leer: false, crear: false, editar: false, eliminar: false },
                prepagos: { leer: false, crear: false, editar: false, eliminar: false },
                promociones: { leer: false, crear: false, editar: false, eliminar: false },
                estadisticas: { leer: false, crear: false, editar: false, eliminar: false },
                usuarios: { leer: false, crear: false, editar: false, eliminar: false },
                roles: { leer: false, crear: false, editar: false, eliminar: false }
            });

            await pool.query("INSERT INTO roles (id, nombre, permisos) VALUES (1, 'Administrador', ?)", [adminPermisos]);
            await pool.query("INSERT INTO roles (id, nombre, permisos) VALUES (2, 'Cajero Base', ?)", [cajeroPermisos]);
            console.log('Tabla de roles inicializada con Administrador y Cajero.');
        }

        // MIGRACIÓN DE JSON A RELACIONAL: Si role_permissions está vacío, migrar desde roles.permisos
        const [rolePermsCount] = await pool.query('SELECT COUNT(*) as count FROM role_permissions');
        if (rolePermsCount[0].count === 0) {
            console.log('Migrando permisos de JSON a tablas relacionales...');
            const [allRoles] = await pool.query('SELECT id, permisos FROM roles');
            const [allPermisos] = await pool.query('SELECT id, slug FROM permisos');

            for (const rol of allRoles) {
                if (!rol.permisos) continue;
                const permsObj = typeof rol.permisos === 'string' ? JSON.parse(rol.permisos) : rol.permisos;

                for (const modulo in permsObj) {
                    for (const accion in permsObj[modulo]) {
                        if (permsObj[modulo][accion] === true) {
                            const slug = `${modulo}.${accion}`;
                            const pMatch = allPermisos.find(p => p.slug === slug);
                            if (pMatch) {
                                await pool.query('INSERT IGNORE INTO role_permissions (role_id, permiso_id) VALUES (?, ?)', [rol.id, pMatch.id]);
                            }
                        }
                    }
                }
            }
            console.log('Migración relacional completada.');
        }

        // AUTO-REPARACIÓN: Asegurar que el Administrador (ID 1) siempre tenga TODOS los permisos
        console.log('Verificando acceso total para el Administrador...');
        const [allPerms] = await pool.query('SELECT id FROM permisos');
        for (const p of allPerms) {
            await pool.query('INSERT IGNORE INTO role_permissions (role_id, permiso_id) VALUES (?, ?)', [1, p.id]);
        }
        console.log('Permisos de Administrador actualizados a nivel relacional.');

        // Initialize default admin user if table is empty
        const [userRows] = await pool.query('SELECT COUNT(*) as count FROM usuarios');
        if (userRows[0].count === 0) {
            const salt = await bcrypt.genSalt(10);
            const hashAdmin = await bcrypt.hash('123456', salt);
            const hashCaja = await bcrypt.hash('caja123', salt);

            await pool.query(`
                INSERT INTO usuarios (username, password, nombre, rol_id, activo)
                VALUES ('admin', ?, 'Administrador Principal', 1, true),
                       ('caja', ?, 'Cajero Turno', 2, true)
            `, [hashAdmin, hashCaja]);
            console.log('Usuarios por defecto inicializados con nuevos role IDs relacionados.');
        }

    } catch (err) {
        console.error('Error inicializando base de datos MySQL:', err);
    }
}

initDB().then(() => {
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`WebSocket server running on port ${PORT} connected to MySQL.`);
    });
});
