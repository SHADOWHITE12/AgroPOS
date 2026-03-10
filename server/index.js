const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*", // allow any origin in local network
        methods: ["GET", "POST"]
    }
});

const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, 'state.json');

// INITIAL STATE
let globalState = {
    products: [
        { id: 1, name: 'Maíz Amarillo Granel', price: 0.45, stock: 85, metric: 'kg', icon: '🌽', stockPercent: 85, stockStatus: 'stock-ok' },
        { id: 2, name: 'Sorgo Especial', price: 0.38, stock: 120, metric: 'kg', icon: '🌾', stockPercent: 100, stockStatus: 'stock-ok' },
        { id: 3, name: 'Concentrado Aves Saco', price: 25.0, stock: 5, metric: 'sacos', icon: '🐔', stockPercent: 25, stockStatus: 'stock-low' },
        { id: 4, name: 'Alimento Ganado 40kg', price: 32.0, stock: 1, metric: 'sacos', icon: '🐄', stockPercent: 5, stockStatus: 'stock-critical' },
        { id: 5, name: 'Medicina Veterinaria 1L', price: 15.0, stock: 0, metric: 'un', icon: '💉', stockPercent: 0, stockStatus: 'stock-critical' },
        { id: 6, name: 'Melaza Bidón', price: 12.5, stock: 24, metric: 'un', icon: '🏺', stockPercent: 60, stockStatus: 'stock-ok' },
        { id: 7, name: 'Alimento Cerdos 40kg', price: 28.5, stock: 15, metric: 'sacos', icon: '🐷', stockPercent: 75, stockStatus: 'stock-ok', pesoPorSaco: 40 },
        { id: 8, name: 'Bloque Nutricional 5kg', price: 18.0, stock: 10, metric: 'un', icon: '🧱', stockPercent: 50, stockStatus: 'stock-ok' },
        { id: 9, name: 'Semilla de Pasto Saco', price: 45.0, stock: 200, metric: 'kg', icon: '☘️', stockPercent: 90, stockStatus: 'stock-ok', pesoPorSaco: 25 },
        { id: 10, name: 'Herbicida Total 5L', price: 35.0, stock: 8, metric: 'un', icon: '🧪', stockPercent: 40, stockStatus: 'stock-low' },
        { id: 11, name: 'Comedero Plástico L', price: 22.5, stock: 12, metric: 'un', icon: '🍽️', stockPercent: 60, stockStatus: 'stock-ok' },
    ],
    prepagos: [],
    deudores: [
        { id: 1, cliente: 'Juan Pérez', deudaUsd: 15.50, fecha: new Date('2023-10-25').toISOString().split('T')[0], estado: 'Pendiente' },
        { id: 2, cliente: 'Finca El Roble', deudaUsd: 120.00, fecha: new Date('2023-10-26').toISOString().split('T')[0], estado: 'Pendiente' },
        { id: 3, cliente: 'María Rodríguez', deudaUsd: 8.75, fecha: new Date('2023-10-28').toISOString().split('T')[0], estado: 'Pendiente' },
    ],
    cajaBalances: { usd: 0, bs: 0, digitalBs: 0, inicialUsd: 0, inicialBs: 0 },
    exchangeRate: 36.50,
    isCajaAbierta: false,
    comisionesBancarias: {
        puntoVenta: 0.015, // 1.5%
        biopago: 0.04      // .0%
    },
    movimientos: [],
    metricasGlobales: { totalMayor: 0, totalDetal: 0, gananciaNeta: 0 },
    metricasMetodos: {
        'Punto': { bruto: 0, comision: 0, neto: 0 },
        'Biopago': { bruto: 0, comision: 0, neto: 0 }
    },
    historialCierresCaja: []
};

// Load state if exists
if (fs.existsSync(STATE_FILE)) {
    try {
        const data = fs.readFileSync(STATE_FILE, 'utf8');
        globalState = JSON.parse(data);
        // Migración: Si existe historialVentas pero no movimientos, migrar los datos
        if (globalState.historialVentas && !globalState.movimientos) {
            globalState.movimientos = globalState.historialVentas;
            delete globalState.historialVentas;
            console.log('Migrated historialVentas to movimientos');
        }
        console.log('State loaded from state.json');
    } catch (err) {
        console.error('Error loading state:', err);
    }
}

function saveState() {
    try {
        fs.writeFileSync(STATE_FILE, JSON.stringify(globalState, null, 2));
        console.log('State saved successfully to state.json');
    } catch (err) {
        console.error('Error saving state:', err);
    }
}

io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id} from ${socket.handshake.address}`);

    // Send initial state to the newly connected client
    socket.emit('initial_state', globalState);

    // Listen for product updates
    socket.on('update_products', (newProducts) => {
        globalState.products = newProducts;
        saveState();
        io.emit('products_updated', newProducts);
    });

    // Listen for prepagos updates
    socket.on('update_prepagos', (newPrepagos) => {
        globalState.prepagos = newPrepagos;
        saveState();
        io.emit('prepagos_updated', newPrepagos);
    });

    // Listen for deudores updates
    socket.on('update_deudores', (newDeudores) => {
        globalState.deudores = newDeudores;
        saveState();
        io.emit('deudores_updated', newDeudores);
    });

    // Listen for caja updates
    socket.on('update_caja', (newBalances) => {
        // We merged balances + status + rate in one event for simplicity or handle separately
        globalState.cajaBalances = { ...globalState.cajaBalances, ...newBalances };
        if (newBalances.isCajaAbierta !== undefined) globalState.isCajaAbierta = newBalances.isCajaAbierta;
        if (newBalances.exchangeRate !== undefined) globalState.exchangeRate = newBalances.exchangeRate;

        saveState();
        io.emit('caja_updated', globalState); // Send full object for consistency
    });

    // Listen for isolated caja closing
    socket.on('cerrar_caja', () => {
        // 1. Guardar montos finales del día (Historial)
        const timestamp = new Date().toISOString();
        const cierreRecord = {
            fecha: timestamp,
            balancesFinales: { ...globalState.cajaBalances },
            tasaCierre: globalState.exchangeRate,
            metricasDia: { ...globalState.metricasGlobales }
        };

        globalState.historialCierresCaja = globalState.historialCierresCaja || [];
        globalState.historialCierresCaja.push(cierreRecord);

        // 2. SOLO poner a cero los valores temporales de la caja actual (Aislamiento)
        globalState.cajaBalances = { usd: 0, bs: 0, digitalBs: 0, inicialUsd: 0, inicialBs: 0 };
        globalState.isCajaAbierta = false;

        // 3. Resetear Métricas de desempeño para el nuevo turno
        globalState.metricasGlobales = { totalMayor: 0, totalDetal: 0, gananciaNeta: 0 };
        globalState.metricasMetodos = {
            'Punto': { bruto: 0, comision: 0, neto: 0 },
            'Biopago': { bruto: 0, comision: 0, neto: 0 }
        };

        saveState();

        // 4. Emitir evento exclusivo de caja cerrada
        io.emit('caja_cerrada', {
            cajaBalances: globalState.cajaBalances,
            isCajaAbierta: false,
            historialCierresCaja: globalState.historialCierresCaja,
            metricasGlobales: globalState.metricasGlobales,
            metricasMetodos: globalState.metricasMetodos
        });
    });

    // Listen for new sales
    socket.on('record_sale', (saleData) => {
        const timestamp = new Date().toISOString();
        const saleRecord = { ...saleData, timestamp };
        let gananciaVenta = 0;
        let totalMetricasSacos = 0;
        let totalMetricasKilos = 0;

        // Process items: metrics + profit
        (saleData.items || []).forEach(item => {
            const isSaco = item.tipoVenta === 'saco';
            if (isSaco) {
                totalMetricasSacos += item.quantity;
            } else {
                totalMetricasKilos += item.quantity;
            }
            const costPerUnit = item.costoBase || 0;
            const itemProfit = (item.price - costPerUnit) * item.quantity;
            gananciaVenta += Math.max(0, itemProfit);
        });

        globalState.metricasGlobales.totalMayor += totalMetricasSacos;
        globalState.metricasGlobales.totalDetal += totalMetricasKilos;

        // Process bank commissions for digital methods
        let comisionesTotalesUsd = 0;
        (saleData.metodosPago || []).forEach(m => {
            const montoUsd = m.monto || 0;
            if (m.metodo === 'Punto' || m.metodo === 'Punto DB/CR') {
                const comision = montoUsd * (globalState.comisionesBancarias.puntoVenta || 0.015);
                comisionesTotalesUsd += comision;
                globalState.metricasMetodos['Punto'].bruto += montoUsd;
                globalState.metricasMetodos['Punto'].comision += comision;
                globalState.metricasMetodos['Punto'].neto += montoUsd - comision;
            } else if (m.metodo === 'Biopago') {
                const comision = montoUsd * (globalState.comisionesBancarias.biopago || 0.04);
                comisionesTotalesUsd += comision;
                globalState.metricasMetodos['Biopago'].bruto += montoUsd;
                globalState.metricasMetodos['Biopago'].comision += comision;
                globalState.metricasMetodos['Biopago'].neto += montoUsd - comision;
            }
        });

        const descuentoMetodoUsd = saleData.descuentoMetodoPagoTotal || 0;
        const finalProfit = (gananciaVenta - comisionesTotalesUsd - descuentoMetodoUsd);
        globalState.metricasGlobales.gananciaNeta += finalProfit;

        // Enhance saleRecord for persistent statistics
        saleRecord.gananciaNetaVenta = finalProfit;
        saleRecord.ventaBrutaSacos = (saleData.items || [])
            .filter(i => i.tipoVenta === 'saco')
            .reduce((sum, i) => sum + (i.price * i.quantity), 0);
        saleRecord.ventaBrutaKilos = (saleData.items || [])
            .filter(i => i.tipoVenta === 'detal')
            .reduce((sum, i) => sum + (i.price * i.quantity), 0);
        saleRecord.totalPagado = saleData.totalPagado || (saleData.items || []).reduce((sum, i) => sum + (i.price * i.quantity), 0);
        saleRecord.fechaHora = timestamp; // Coincide con StatsView.jsx expects m.fechaHora

        // ── AUTO-INSERT DEUDORES if credit payment ─────────────────────────
        const creditPago = (saleData.metodosPago || []).find(m => m.metodo === 'Crédito');
        if (saleData.esCredito || creditPago) {
            const deudaUsd = creditPago?.monto || (saleData.items || []).reduce((s, i) => s + i.price * i.quantity, 0);
            const newDeudor = {
                id: Date.now(),
                cliente: saleData.cliente || 'Cliente Desconocido',
                deudaUsd: deudaUsd,
                fecha: timestamp.split('T')[0],
                estado: 'Pendiente'
            };
            globalState.deudores = globalState.deudores || [];
            globalState.deudores.push(newDeudor);
            io.emit('deudores_updated', globalState.deudores);
            console.log(`[Crédito] Nueva deuda registrada para ${newDeudor.cliente}: $${newDeudor.deudaUsd.toFixed(2)}`);
        }

        // ── AUTO-INSERT PREPAGOS if prepago items ──────────────────────────
        const prepagoItems = (saleData.items || []).filter(i => i.esPrepago);
        if (prepagoItems.length > 0) {
            globalState.prepagos = globalState.prepagos || [];
            prepagoItems.forEach(item => {
                globalState.prepagos.push({
                    id: Date.now() + Math.random(),
                    cliente: saleData.cliente || 'Cliente Desconocido',
                    productoId: item.id,
                    productoNombre: item.name,
                    cantidad: item.quantity,
                    metric: item.metric,
                    montoUsd: item.price * item.quantity,
                    fecha: new Date().toLocaleString(),
                    estado: 'Pendiente'
                });
            });
            io.emit('prepagos_updated', globalState.prepagos);
            console.log(`[Prepago] ${prepagoItems.length} prepago(s) registrados para ${saleData.cliente}`);
        }

        globalState.movimientos = globalState.movimientos || [];
        globalState.movimientos.push(saleRecord);
        saveState();

        io.emit('movimientos_updated', globalState.movimientos);
        io.emit('metricas_updated', {
            metricasGlobales: globalState.metricasGlobales,
            metricasMetodos: globalState.metricasMetodos
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = 3001;
server.listen(PORT, () => {
    console.log(`WebSocket server running on port ${PORT}`);
    console.log(`Global State synchronized through memory.`);
});
