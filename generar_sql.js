const fs = require('fs');
const path = require('path');

const stateFile = path.join(__dirname, 'state.json');
const outputFile = path.join(__dirname, 'importar_datos.sql');

if (!fs.existsSync(stateFile)) {
    console.error('El archivo state.json no existe.');
    process.exit(1);
}

const data = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
let sqlStr = `-- Dump de Datos desde state.json para agro_db\n\n`;

// 1. Productos
if (data.products && data.products.length > 0) {
    sqlStr += `-- Tabla: productos\n`;
    sqlStr += `INSERT IGNORE INTO \`productos\` (\`id\`, \`name\`, \`price\`, \`precioKilo\`, \`precioSaco\`, \`pesoPorSaco\`, \`costoBase\`, \`gananciaSacoPct\`, \`gananciaKiloPct\`, \`stock\`, \`metric\`, \`icon\`) VALUES\n`;

    const productValues = data.products.map(p => {
        const id = p.id;
        const name = p.name ? `'${p.name.replace(/'/g, "''")}'` : "''";
        const price = p.price || 0;
        const precioKilo = p.precioKilo || 0;
        const precioSaco = p.precioSaco || 0;
        const pesoPorSaco = p.pesoPorSaco || 0;
        const costoBase = p.costoBase || 0;
        const gananciaSacoPct = p.gananciaSacoPct || 0;
        const gananciaKiloPct = p.gananciaKiloPct || 0;
        const stock = p.stock || 0;
        const metric = p.metric ? `'${p.metric.replace(/'/g, "''")}'` : "''";
        const icon = p.icon ? `'${p.icon.replace(/'/g, "''")}'` : "''";

        return `(${id}, ${name}, ${price}, ${precioKilo}, ${precioSaco}, ${pesoPorSaco}, ${costoBase}, ${gananciaSacoPct}, ${gananciaKiloPct}, ${stock}, ${metric}, ${icon})`;
    });

    sqlStr += productValues.join(',\n') + ';\n\n';
}

// 2. Caja Diaria
if (data.cajaBalances) {
    sqlStr += `-- Tabla: caja_diaria\n`;
    const c = data.cajaBalances;
    const isCajaAbierta = data.isCajaAbierta || c.isCajaAbierta ? 'TRUE' : 'FALSE';
    const exchangeRate = data.exchangeRate || c.exchangeRate || 36.5;

    sqlStr += `INSERT IGNORE INTO \`caja_diaria\` (\`id\`, \`usd\`, \`bs\`, \`digitalBs\`, \`inicialUsd\`, \`inicialBs\`, \`isCajaAbierta\`, \`exchangeRate\`) VALUES `;
    sqlStr += `(1, ${c.usd || 0}, ${c.bs || 0}, ${c.digitalBs || 0}, ${c.inicialUsd || 0}, ${c.inicialBs || 0}, ${isCajaAbierta}, ${exchangeRate});\n\n`;
}

// 3. Movimientos
if (data.movimientos && data.movimientos.length > 0) {
    sqlStr += `-- Tabla: historial_ventas\n`;
    sqlStr += `INSERT IGNORE INTO \`historial_ventas\` (\`id\`, \`fechaHora\`, \`totalPagado\`, \`gananciaNetaVenta\`, \`gananciaSacos\`, \`gananciaKilos\`, \`ventaBrutaSacos\`, \`ventaBrutaKilos\`, \`metodosPago\`, \`productos\`, \`exchangeRate\`, \`cliente\`, \`esCredito\`, \`promocionesAplicadas\`, \`descuentoMetodoPagoTotal\`) VALUES\n`;

    const movValues = data.movimientos.map(m => {
        const id = m.id ? `'${m.id}'` : `'${Date.now() + Math.random()}'`;

        let fechaFormat = "''";
        if (m.fechaHora) {
            try {
                fechaFormat = `'${new Date(m.fechaHora).toISOString().slice(0, 19).replace('T', ' ')}'`;
            } catch (e) { }
        }

        const totalPagado = m.totalPagado || 0;
        const gananciaNetaVenta = m.gananciaNetaVenta || 0;
        const gananciaSacos = m.gananciaSacos || 0;
        const gananciaKilos = m.gananciaKilos || 0;
        const ventaBrutaSacos = m.ventaBrutaSacos || 0;
        const ventaBrutaKilos = m.ventaBrutaKilos || 0;

        const metodosPagoRaw = m.metodosPago || m.metodoPago || [];
        const metodosPago = `'${JSON.stringify(metodosPagoRaw).replace(/'/g, "''")}'`;

        const productosRaw = m.items || m.productos || [];
        const productos = `'${JSON.stringify(productosRaw).replace(/'/g, "''")}'`;

        const exchangeRate = m.exchangeRate || 1;
        const cliente = m.cliente ? `'${m.cliente.replace(/'/g, "''")}'` : "'Cliente Genérico'";
        const esCredito = m.esCredito ? 'TRUE' : 'FALSE';
        const promocionesAplicadas = m.promocionesAplicadas ? 'TRUE' : 'FALSE';
        const descuentoMetodoPagoTotal = m.descuentoMetodoPagoTotal || 0;

        return `(${id}, ${fechaFormat}, ${totalPagado}, ${gananciaNetaVenta}, ${gananciaSacos}, ${gananciaKilos}, ${ventaBrutaSacos}, ${ventaBrutaKilos}, ${metodosPago}, ${productos}, ${exchangeRate}, ${cliente}, ${esCredito}, ${promocionesAplicadas}, ${descuentoMetodoPagoTotal})`;
    });

    sqlStr += movValues.join(',\n') + ';\n';
}

fs.writeFileSync(outputFile, sqlStr);
console.log(`Archivo SQL generado satisfactoriamente en: ${outputFile}`);
