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

const supabase = require('./config/db.js');
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
        const { data: productosRows, error: prodErr } = await supabase.from('productos').select('*');
        const { data: cajaRows, error: cajaErr } = await supabase.from('caja_diaria').select('*').eq('id', 1);
        const { data: movimientosRows, error: movErr } = await supabase.from('historial_ventas').select('*');
        // Obtener el último cierre de turno para filtrar métricas de Caja
        const { data: cierresRows, error: cierresErr } = await supabase
            .from('cierres_caja')
            .select('created_at')
            .order('created_at', { ascending: false })
            .limit(1);

        if (prodErr) throw prodErr;
        if (cajaErr) throw cajaErr;
        if (movErr) throw movErr;

        // Mapear el historial desde la BD reconstruyendo los JSON
        const movimientosFormateados = (movimientosRows || []).map(row => ({
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

        globalState.products = (productosRows || []).map(p => ({
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

        if (cajaRows && cajaRows.length > 0) {
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
        // Guardar el timestamp del último cierre de turno
        if (cierresRows && cierresRows.length > 0) {
            globalState.ultimoCierre = cierresRows[0].created_at;
        } else {
            // Si no hay cierres, usar una fecha muy antigua como referencia
            globalState.ultimoCierre = new Date(0).toISOString();
        }

    } catch (err) {
        console.error("Error cargando el estado inicial desde Supabase:", err);
    }

    // Send initial state to the newly connected client (incluye ultimoCierre para la Caja)
    socket.emit('initial_state', { ...globalState, ultimoCierre: globalState.ultimoCierre || new Date(0).toISOString() });

    // Listen for product updates
    socket.on('update_products', async (newProducts) => {
        try {
            await supabase.from('productos').delete().neq('id', -1);

            const { error: insertErr } = await supabase.from('productos').insert(newProducts);
            if (insertErr) throw insertErr;

            globalState.products = newProducts;
            io.emit('products_updated', newProducts);
        } catch (err) {
            console.error('Error actualizando productos en Supabase:', err);
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
            const { error: cajaErr } = await supabase.from('caja_diaria').upsert({
                id: 1,
                usd: globalState.cajaBalances.usd || 0,
                bs: globalState.cajaBalances.bs || 0,
                digitalBs: globalState.cajaBalances.digitalBs || 0,
                inicialUsd: globalState.cajaBalances.inicialUsd || 0,
                inicialBs: globalState.cajaBalances.inicialBs || 0,
                isCajaAbierta: globalState.isCajaAbierta,
                exchangeRate: globalState.exchangeRate
            });
            if (cajaErr) throw cajaErr;
        } catch (err) {
            console.error('Error updating caja in Supabase:', err);
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

    // Listen for isolated caja closing (Cierre Z - Reporte de Turno)
    socket.on('cerrar_caja', async (turnoTotales) => {
        try {
            console.log('[SISTEMA] Iniciando Cierre Z (Preservando Historial, Aislando Turno)...');
            
            // 1. Resetear balances de caja (Aislamiento de turno)
            globalState.cajaBalances = { usd: 0, bs: 0, digitalBs: 0, inicialUsd: 0, inicialBs: 0 };
            globalState.isCajaAbierta = false;

            // 2. Conservar movimientos en memoria y base de datos para estadísticas globales
            // globalState.movimientos = []; // MANTENER HISTORIAL PARA ESTAD.
            
            // 3. Registrar el cierre de turno en la tabla cierres_caja
            const { data: cierreData, error: cierreErr } = await supabase.from('cierres_caja').insert({
                ganancia_neta: turnoTotales?.gananciaNeta || 0,
                total_pagado: turnoTotales?.totalPagado || 0,
                total_mayor: turnoTotales?.totalMayor || 0,
                total_detal: turnoTotales?.totalDetal || 0,
                metodos_pago: turnoTotales?.metodosPago || {}
            }).select('created_at').single();

            if (cierreErr) {
                console.error('[DATABASE] Error insertando cierre de turno:', cierreErr);
            }

            // 4. El nuevo ultimoCierre es el timestamp del cierre recién registrado
            const nuevoUltimoCierre = cierreData?.created_at || new Date().toISOString();
            globalState.ultimoCierre = nuevoUltimoCierre;

            // 5. Actualizar estado de la caja en Supabase
            await supabase.from('caja_diaria').upsert({
                id: 1,
                usd: 0,
                bs: 0,
                digitalBs: 0,
                inicialUsd: 0,
                inicialBs: 0,
                isCajaAbierta: false,
                exchangeRate: globalState.exchangeRate
            });

            // 6. Emitir evento de caja cerrada con el nuevo ultimoCierre para que el frontend lo use
            io.emit('caja_cerrada', {
                cajaBalances: globalState.cajaBalances,
                isCajaAbierta: false,
                movimientos: globalState.movimientos || [],
                ultimoCierre: nuevoUltimoCierre
            });
            
            console.log('[SISTEMA] Cierre Z completado. Nuevo ultimoCierre:', nuevoUltimoCierre);

        } catch (err) {
            console.error('[SISTEMA] Error crítico durante el cierre de caja:', err);
        }
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
            const ticketFecha = new Date(ticket.fechaHora).toISOString();

            // 1. Insert ticket
            const { error: insertErr } = await supabase.from('historial_ventas').insert({
                id: ticket.id,
                fechaHora: ticketFecha,
                totalPagado: ticket.totalPagado,
                gananciaNetaVenta: ticket.gananciaNetaVenta,
                gananciaSacos: ticket.gananciaSacos,
                gananciaKilos: ticket.gananciaKilos,
                ventaBrutaSacos: ticket.ventaBrutaSacos,
                ventaBrutaKilos: ticket.ventaBrutaKilos,
                metodosPago: ticket.metodoPago || [],
                productos: ticket.productos || [],
                exchangeRate: ticket.exchangeRate || globalState.exchangeRate || 1,
                cliente: ticket.cliente || 'Cliente Genérico',
                esCredito: ticket.esCredito || false,
                promocionesAplicadas: ticket.promocionesAplicadas || false,
                descuentoMetodoPagoTotal: ticket.descuentoMetodoPagoTotal || 0
            });

            if (insertErr) throw insertErr;

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

                // Get current stock directly from in-memory state for calculation, then update Supabase
                const memProduct = globalState.products.find(p => p.id === item.id);
                if (memProduct) {
                    const newStock = memProduct.stock - deduction;
                    await supabase.from('productos').update({ stock: newStock }).eq('id', item.id);
                    // Update in-memory state implicitly
                    memProduct.stock = newStock;
                }
            }

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
            const { data: userRows, error: userErr } = await supabase
                .from('usuarios')
                .select('*, roles(nombre)')
                .eq('username', username)
                .eq('activo', true);

            if (userErr) throw userErr;

            if (userRows && userRows.length > 0) {
                const user = userRows[0];

                const match = await bcrypt.compare(password, user.password);

                if (match) {
                    const { password: _, roles: userRoles, ...userSafe } = user;
                    userSafe.rol_nombre = userRoles ? userRoles.nombre : null;

                    // Fetch permissions from relational tables
                    const { data: permRows, error: permErr } = await supabase
                        .from('role_permissions')
                        .select('permisos(modulo, accion)')
                        .eq('role_id', user.rol_id);

                    if (permErr) throw permErr;

                    // Reconstruct permissions object for frontend compatibility
                    const reconstructedPerms = {};
                    (permRows || []).forEach(rp => {
                        const p = rp.permisos;
                        if (p) {
                            if (!reconstructedPerms[p.modulo]) {
                                reconstructedPerms[p.modulo] = { leer: false, crear: false, editar: false, eliminar: false };
                            }
                            reconstructedPerms[p.modulo][p.accion] = true;
                        }
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
            const { data, error } = await supabase
                .from('usuarios')
                .select(`id, username, nombre, activo, rol_id, roles(nombre)`);

            if (error) throw error;

            const rows = (data || []).map(u => ({
                id: u.id,
                username: u.username,
                nombre: u.nombre,
                activo: u.activo,
                rol_id: u.rol_id,
                rol_nombre: u.roles ? u.roles.nombre : null
            }));

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

            const { error } = await supabase.from('usuarios').insert({
                username, password: hashedPassword, nombre, rol_id, activo
            });

            if (error) throw error;
            callback({ success: true, message: 'Usuario creado exitosamente' });
        } catch (err) {
            console.error('Error creating user:', err);
            if (err.code === '23505' || err.code === 'ER_DUP_ENTRY') { // Handle both just in case
                return callback({ success: false, message: 'El nombre de usuario ya existe' });
            }
            callback({ success: false, message: 'Error al crear usuario' });
        }
    });

    socket.on('update_usuario', async (userData, callback) => {
        try {
            const { id, username, password, nombre, rol_id, activo } = userData;
            let updatePayload = { username, nombre, rol_id, activo };

            if (password) {
                const salt = await bcrypt.genSalt(10);
                updatePayload.password = await bcrypt.hash(password, salt);
            }

            const { error } = await supabase.from('usuarios').update(updatePayload).eq('id', id);

            if (error) throw error;
            callback({ success: true, message: 'Usuario actualizado exitosamente' });
        } catch (err) {
            console.error('Error updating user:', err);
            if (err.code === '23505' || err.code === 'ER_DUP_ENTRY') {
                return callback({ success: false, message: 'El nombre de usuario ya existe' });
            }
            callback({ success: false, message: 'Error al actualizar usuario' });
        }
    });

    socket.on('delete_usuario', async (id, callback) => {
        try {
            const { error } = await supabase.from('usuarios').delete().eq('id', id);
            if (error) throw error;
            callback({ success: true, message: 'Usuario eliminado' });
        } catch (err) {
            console.error('Error deleting user:', err);
            callback({ success: false, message: 'Error al eliminar usuario' });
        }
    });

    // --- Roles Management Events ---
    socket.on('get_roles', async (callback) => {
        try {
            const { data: roles, error: rolesErr } = await supabase.from('roles').select('*');
            const { data: rolePerms, error: permsErr } = await supabase
                .from('role_permissions')
                .select('role_id, permisos(modulo, accion)');

            if (rolesErr) throw rolesErr;
            if (permsErr) throw permsErr;

            const safeRoles = (roles || []).map(r => {
                const perms = {};
                (rolePerms || [])
                    .filter(rp => rp.role_id === r.id)
                    .forEach(rp => {
                        const p = rp.permisos;
                        if (p) {
                            if (!perms[p.modulo]) perms[p.modulo] = { leer: false, crear: false, editar: false, eliminar: false };
                            perms[p.modulo][p.accion] = true;
                        }
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

            const { data: newRole, error: roleError } = await supabase
                .from('roles')
                .insert({ nombre })
                .select()
                .single();

            if (roleError) throw roleError;
            const roleId = newRole.id;

            // Save permissions to role_permissions
            const { data: allPermisos } = await supabase.from('permisos').select('id, slug');

            const rpInserts = [];
            for (const modulo in permisos) {
                for (const accion in permisos[modulo]) {
                    if (permisos[modulo][accion] === true) {
                        const slug = `${modulo}.${accion}`;
                        const pMatch = (allPermisos || []).find(p => p.slug === slug);
                        if (pMatch) {
                            rpInserts.push({ role_id: roleId, permiso_id: pMatch.id });
                        }
                    }
                }
            }

            if (rpInserts.length > 0) {
                await supabase.from('role_permissions').insert(rpInserts);
            }

            callback({ success: true, message: 'Rol creado exitosamente' });
        } catch (err) {
            console.error('Error creating rol:', err);
            if (err.code === '23505') {
                return callback({ success: false, message: 'El nombre del rol ya existe' });
            }
            callback({ success: false, message: 'Error al crear rol' });
        }
    });

    socket.on('update_rol', async (rolData, callback) => {
        try {
            const { id, nombre, permisos } = rolData;

            const { error: roleErr } = await supabase.from('roles').update({ nombre }).eq('id', id);
            if (roleErr) throw roleErr;

            // Sync permissions
            await supabase.from('role_permissions').delete().eq('role_id', id);

            const { data: allPermisos } = await supabase.from('permisos').select('id, slug');
            const rpInserts = [];

            for (const modulo in permisos) {
                for (const accion in permisos[modulo]) {
                    if (permisos[modulo][accion] === true) {
                        const slug = `${modulo}.${accion}`;
                        const pMatch = (allPermisos || []).find(p => p.slug === slug);
                        if (pMatch) {
                            rpInserts.push({ role_id: id, permiso_id: pMatch.id });
                        }
                    }
                }
            }

            if (rpInserts.length > 0) {
                await supabase.from('role_permissions').insert(rpInserts);
            }

            callback({ success: true, message: 'Rol actualizado exitosamente' });
        } catch (err) {
            console.error('Error updating rol:', err);
            if (err.code === '23505') {
                return callback({ success: false, message: 'El nombre del rol ya existe' });
            }
            callback({ success: false, message: 'Error al actualizar rol' });
        }
    });

    socket.on('delete_rol', async (id, callback) => {
        try {
            const { error } = await supabase.from('roles').delete().eq('id', id);
            if (error) throw error;
            callback({ success: true, message: 'Rol eliminado exitosamente' });
        } catch (err) {
            console.error('Error deleting rol:', err);
            callback({ success: false, message: 'Error al eliminar rol. Asegúrese de que no esté en uso.' });
        }
    });

    // --- Backup Management Events ---
    socket.on('backup_database_json', async (callback) => {
        try {
            console.log('Generando respaldo completo de la Base de Datos Supabase...');
            const backupData = {};

            const { data: productos } = await supabase.from('productos').select('*');
            backupData.productos = productos || [];

            const { data: ventas } = await supabase.from('historial_ventas').select('*');
            backupData.historial_ventas = ventas || [];

            const { data: caja } = await supabase.from('caja_diaria').select('*');
            backupData.caja_diaria = caja || [];

            const { data: roles } = await supabase.from('roles').select('*');
            backupData.roles = roles || [];

            const { data: usuarios } = await supabase.from('usuarios').select('id, username, nombre, rol_id, activo');
            backupData.usuarios = usuarios || [];

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
            const { error } = await supabase.from('usuarios').update({ username, nombre }).eq('id', id);
            if (error) throw error;
            callback({ success: true, message: 'Perfil actualizado' });
        } catch (err) {
            console.error('Error updating profile:', err);
            callback({ success: false, message: 'Error al actualizar perfil' });
        }
    });

    socket.on('cambiar_password', async (data, callback) => {
        try {
            const { id, currentPassword, newPassword } = data;
            const { data: user, error: userErr } = await supabase.from('usuarios').select('password').eq('id', id).single();

            if (userErr || !user) return callback({ success: false, message: 'Usuario no encontrado' });

            const match = await bcrypt.compare(currentPassword, user.password);
            if (!match) return callback({ success: false, message: 'La contraseña actual es incorrecta' });

            const salt = await bcrypt.genSalt(10);
            const hashedNew = await bcrypt.hash(newPassword, salt);

            const { error: updateErr } = await supabase.from('usuarios').update({ password: hashedNew }).eq('id', id);
            if (updateErr) throw updateErr;

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

const PORT = process.env.PORT || 3001;

// En PRODUCCIÓN: servir el frontend compilado (Vite build) como archivos estáticos.
// Express asume el rol de servidor web, entregando index.html para cualquier ruta
// que no sea un API/WebSocket. Esto permite el patrón de monolito en Render/Railway.
const clientDistPath = path.join(__dirname, 'client', 'dist');
if (require('fs').existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));
    // Catch-all: devuelve index.html para rutas de cliente (React Router)
    app.get('*', (req, res) => {
        res.sendFile(path.join(clientDistPath, 'index.html'));
    });
    console.log(`[SERVIDOR] Sirviendo frontend desde: ${clientDistPath}`);
} else {
    console.log('[SERVIDOR] Modo desarrollo: frontend NO encontrado en client/dist');
}

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en puerto ${PORT} — Conectado a Supabase.`);
});
