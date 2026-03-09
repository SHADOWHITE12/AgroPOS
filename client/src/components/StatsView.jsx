import React, { useState, useMemo } from 'react';

function StatsView({ products, movimientos = [], deudores, cajaBalances, exchangeRate, historialTasas = [], historialCapital = [] }) {
    const [dateFilter, setDateFilter] = useState('todo'); // 'hoy' | 'semana' | 'mes' | 'todo'

    const stats = useMemo(() => {
        const productBreakdown = {};

        let totalGananciaNeta = 0;
        let totalVentasSacos = 0;
        let totalVentasKilos = 0;
        let totalIngresoBrutoUsd = 0;

        let brutoPunto = 0;
        let comisionPunto = 0;
        let brutoBiopago = 0;
        let comisionBiopago = 0;

        const now = new Date();
        now.setHours(23, 59, 59, 999);
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const filteredMovimientos = movimientos.filter(m => {
            if (dateFilter === 'todo') return true;
            const ticketDate = new Date(m.fechaHora);
            if (dateFilter === 'hoy') {
                return ticketDate >= startOfDay && ticketDate <= now;
            } else if (dateFilter === 'semana') {
                const pastWeek = new Date();
                pastWeek.setDate(now.getDate() - 7);
                pastWeek.setHours(0, 0, 0, 0);
                return ticketDate >= pastWeek && ticketDate <= now;
            } else if (dateFilter === 'mes') {
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                return ticketDate >= startOfMonth && ticketDate <= now;
            }
            return true;
        });

        const ventasProcesadas = [...filteredMovimientos].sort((a, b) => new Date(b.fechaHora) - new Date(a.fechaHora)).map(ticket => {
            totalGananciaNeta += (ticket.gananciaNetaVenta || 0);
            totalVentasSacos += (ticket.ventaBrutaSacos || 0);
            totalVentasKilos += (ticket.ventaBrutaKilos || 0);
            totalIngresoBrutoUsd += (ticket.totalPagado || 0);

            // Calculate Commissions from ticket
            let montoBruto = 0;
            let comisionDeduccion = ticket.descuentoMetodoPagoTotal || 0;
            let metodosNames = [];
            ticket.metodoPago?.forEach(m => {
                montoBruto += m.monto;
                metodosNames.push(m.metodo);
                if (m.metodo === 'Punto') {
                    const b = m.monto;
                    const c = b * 0.015;
                    brutoPunto += b;
                    comisionPunto += c;
                } else if (m.metodo === 'Biopago') {
                    const b = m.monto;
                    const c = b * 0.04;
                    brutoBiopago += b;
                    comisionBiopago += c;
                }
            });

            // Product Ranking
            ticket.productos?.forEach(item => {
                const product = products.find(p => p.id === item.id) || {};
                const metric = (product.pesoPorSaco && product.pesoPorSaco > 0) ? 'Sacos' : 'un';
                if (!productBreakdown[item.id]) {
                    productBreakdown[item.id] = { name: item.name, totalUnits: 0, metric: metric };
                }

                let qtyInBaseUnit = item.quantity;
                if (item.metric === 'Kg' && metric !== 'un') {
                    qtyInBaseUnit = item.quantity / (item.pesoPorSaco || 50);
                }
                productBreakdown[item.id].totalUnits += qtyInBaseUnit;
            });

            const resumenProductos = ticket.productos?.map(i => `${i.quantity}x ${i.name}`).join(', ') || 'N/A';
            const metodosAgrupados = metodosNames.join(', ') || 'N/A';

            return {
                ...ticket,
                fechaHoraStr: new Date(ticket.fechaHora).toLocaleString(),
                resumenProductos,
                metodosAgrupados,
                montoBruto: ticket.totalPagado || montoBruto,
                comisionDeduccion: comisionDeduccion,
                neto: (ticket.totalPagado || montoBruto) - comisionDeduccion
            };
        });

        const inventoryValue = products.reduce((acc, p) => acc + (p.price * p.stock), 0);
        const cashValue = (cajaBalances.usd || 0) + ((cajaBalances.bs || 0) / exchangeRate) + ((cajaBalances.digitalBs || 0) / exchangeRate);
        const totalCapitalUsd = inventoryValue + cashValue;

        return {
            totalCapitalUsd,
            inventoryValue,
            cashValue,
            productBreakdown: Object.values(productBreakdown).sort((a, b) => b.totalUnits - a.totalUnits),
            ventasProcesadas,
            totalGananciaNeta,
            totalVentasSacos,
            totalVentasKilos,
            brutoPunto,
            comisionPunto,
            brutoBiopago,
            comisionBiopago
        };
    }, [products, movimientos, cajaBalances, exchangeRate, dateFilter]);

    return (
        <div className="workspace" style={{ padding: '1rem md:2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto', backgroundColor: 'var(--color-bg-main)', flex: 1, width: '100%' }}>

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-color)' }}>📊 Reportes y Dashboard</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Métricas financieras del sistema</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center w-full md:w-auto">
                    <label style={{ fontWeight: 'bold', color: 'var(--text-color)' }}>Rango:</label>
                    <select
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="btn-mobile-full"
                        style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--white)', fontWeight: 'bold', outline: 'none', cursor: 'pointer' }}
                    >
                        <option value="hoy">Hoy</option>
                        <option value="semana">Últimos 7 Días</option>
                        <option value="mes">Este Mes</option>
                        <option value="todo">Récord Histórico</option>
                    </select>
                </div>
            </div>
            <div style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--color-surface)', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '0.9rem', fontWeight: '600', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                Tasa Actual: Bs {exchangeRate.toFixed(2)}
            </div>

            {/* Tarjetas de Ganancias (Cards Visuales) */}
            <div className="grid-stats-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                <div className="stats-card" style={{ backgroundColor: '#10b981', color: 'white', padding: '1.25rem', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.4)' }}>
                    <div className="flex items-center gap-2 mb-2">
                        <span>✨</span>
                        <h3 className="text-xs uppercase font-bold opacity-90 m-0">Ganancia Neta</h3>
                    </div>
                    <div className="text-3xl md:text-4xl font-black">
                        ${stats.totalGananciaNeta.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                </div>

                <div className="stats-card bg-white p-5 rounded-xl shadow-sm border-l-4 border-amber-500">
                    <div className="flex items-center gap-2 mb-2">
                        <span>📦</span>
                        <h3 className="text-xs uppercase font-bold text-gray-500 m-0">Ventas Sacos</h3>
                    </div>
                    <div className="text-2xl font-black text-amber-500">
                        ${stats.totalVentasSacos.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                </div>

                <div className="stats-card bg-white p-5 rounded-xl shadow-sm border-l-4 border-blue-500">
                    <div className="flex items-center gap-2 mb-2">
                        <span>⚖️</span>
                        <h3 className="text-xs uppercase font-bold text-gray-500 m-0">Ventas Kilos</h3>
                    </div>
                    <div className="text-2xl font-black text-blue-500">
                        ${stats.totalVentasKilos.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                </div>
            </div>

            {/* Tarjetas de Métodos de Pago Específicos */}
            <div className="grid-stats-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                <div className="stats-card bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-4 border-b border-slate-300 pb-2">
                        <span>💳</span>
                        <h3 className="font-bold text-slate-700 m-0">Punto de Venta</h3>
                    </div>
                    <div className="flex justify-between mb-1">
                        <span className="text-slate-500 font-semibold">Bruto:</span>
                        <span className="font-bold">${stats.brutoPunto.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-red-500 mb-2">
                        <span className="font-semibold">Comisión:</span>
                        <span className="font-bold">-${stats.comisionPunto.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t border-dashed border-slate-300 pt-2 text-lg font-black text-emerald-600">
                        <span>Neto:</span>
                        <span>${(stats.brutoPunto - stats.comisionPunto).toFixed(2)}</span>
                    </div>
                </div>

                <div className="stats-card bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-4 border-b border-slate-300 pb-2">
                        <span>🧬</span>
                        <h3 className="font-bold text-slate-700 m-0">Biopago</h3>
                    </div>
                    <div className="flex justify-between mb-1">
                        <span className="text-slate-500 font-semibold">Bruto:</span>
                        <span className="font-bold">${stats.brutoBiopago.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-red-500 mb-2">
                        <span className="font-semibold">Comisión:</span>
                        <span className="font-bold">-${stats.comisionBiopago.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t border-dashed border-slate-300 pt-2 text-lg font-black text-emerald-600">
                        <span>Neto:</span>
                        <span>${(stats.brutoBiopago - stats.comisionBiopago).toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* Analytics Grid (Capital y Productos) */}
            <div className="grid-stats-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h3 className="font-bold mb-4 flex items-center gap-2 text-slate-700">
                        📋 Composición de Capital
                    </h3>
                    <div className="flex flex-col gap-3">
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <span className="text-slate-500 text-sm">Inventario ($)</span>
                            <span className="font-bold">${stats.inventoryValue.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <span className="text-slate-500 text-sm">Liquidez ($)</span>
                            <span className="font-bold">${stats.cashValue.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between p-3 bg-blue-50 rounded-lg border border-blue-100 text-blue-700">
                            <span className="font-bold">Total Sistema</span>
                            <span className="font-black">${stats.totalCapitalUsd.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h3 className="font-bold mb-4 text-slate-700">🏆 Productos más vendidos</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <tbody className="divide-y divide-slate-100">
                                {stats.productBreakdown.slice(0, 5).map((p, idx) => (
                                    <tr key={idx}>
                                        <td className="py-2 font-bold text-slate-400 text-sm">#{idx + 1}</td>
                                        <td className="py-2 font-semibold text-slate-700 text-sm">{p.name}</td>
                                        <td className="py-2 text-right">
                                            <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">
                                                {p.totalUnits.toFixed(1)} {p.metric}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Tabla de Auditoría (El Libro Mayor) */}
            <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-100">
                <div className="mb-4 pb-4 border-b border-slate-100">
                    <h3 className="text-xl font-bold text-slate-800 m-0">📖 Registro de Ventas (Auditoría)</h3>
                    <p className="text-slate-500 text-sm mt-1">Historial detallado de todas las transacciones.</p>
                </div>

                <div className="table-responsive-wrapper">
                    <table className="w-full text-left min-w-[800px]">
                        <thead className="bg-slate-50 border-b-2 border-slate-200">
                            <tr className="text-xs uppercase font-bold text-slate-500">
                                <th className="p-4">Fecha / Hora</th>
                                <th className="p-4">Productos</th>
                                <th className="p-4">Método</th>
                                <th className="p-4 text-right">Total Bruto</th>
                                <th className="p-4 text-right text-emerald-600">G. Neta</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {stats.ventasProcesadas.length > 0 ? stats.ventasProcesadas.map((venta, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 text-slate-600 whitespace-nowrap">{venta.fechaHoraStr}</td>
                                    <td className="p-4 text-slate-800 max-w-[250px] truncate">{venta.resumenProductos}</td>
                                    <td className="p-4">
                                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200 text-xs">
                                            {venta.metodosAgrupados}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right font-bold text-slate-900">
                                        ${venta.montoBruto.toFixed(2)}
                                    </td>
                                    <td className="p-4 text-right font-bold text-emerald-600">
                                        ${venta.gananciaNetaVenta?.toFixed(2) || '0.00'}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" className="p-10 text-center text-slate-400 italic">No hay registros</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default StatsView;
