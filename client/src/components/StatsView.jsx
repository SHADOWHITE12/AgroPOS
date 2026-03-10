import React, { useState, useMemo } from 'react';
import { BarChart3, TrendingUp, Package, Scale, PieChart, Users, BookOpen } from 'lucide-react';

function StatsView({ products, movimientos = [], cajaBalances, exchangeRate }) {
    const [dateFilter, setDateFilter] = useState('todo');

    const stats = useMemo(() => {
        const productBreakdown = {};
        let totalGananciaNeta = 0;
        let totalVentasSacos = 0;
        let totalVentasKilos = 0;

        const now = new Date();
        now.setHours(23, 59, 59, 999);
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const filteredMovimientos = movimientos.filter(m => {
            if (dateFilter === 'todo') return true;
            if (!m.fechaHora) return false;
            const ticketDate = new Date(m.fechaHora);
            
            // Normalizar fechas para comparación (Inicio del día)
            const hoy = new Date(); 
            hoy.setHours(0, 0, 0, 0);
            const manana = new Date(hoy);
            manana.setDate(manana.getDate() + 1);

            if (dateFilter === 'hoy') {
                return ticketDate >= hoy && ticketDate < manana;
            }
            if (dateFilter === 'semana') {
                const past = new Date(hoy);
                past.setDate(hoy.getDate() - 7);
                return ticketDate >= past && ticketDate < manana;
            }
            if (dateFilter === 'mes') {
                const startM = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
                return ticketDate >= startM && ticketDate < manana;
            }
            return true;
        });

        const ventasProcesadas = [...filteredMovimientos]
            .sort((a, b) => new Date(b.fechaHora) - new Date(a.fechaHora))
            .map(ticket => {
                try {
                    // Fallbacks if new metrics are missing (legacy records)
                    const saleProfit = ticket.gananciaNetaVenta || 0;
                    const saleSacos = ticket.ventaBrutaSacos || 0;
                    const saleDetal = ticket.ventaBrutaKilos || 0;

                    totalGananciaNeta += saleProfit;
                    totalVentasSacos += saleSacos;
                    totalVentasKilos += saleDetal;

                    const currentItems = ticket.productos || ticket.items || [];
                    currentItems.forEach(item => {
                        const product = products.find(p => p.id === item.id) || {};
                        const metric = (product.pesoPorSaco && product.pesoPorSaco > 0) ? 'Sacos' : (product.metric || 'un');
                        const prodId = item.id || item.productId || 'desconocido';
                        if (!productBreakdown[prodId]) {
                            productBreakdown[prodId] = { name: item.name || product.name || 'Producto Borrado', totalUnits: 0, metric };
                        }
                        productBreakdown[prodId].totalUnits += (item.quantity || 0);
                    });

                    return {
                        ...ticket,
                        fechaHoraStr: ticket.fechaHora ? new Date(ticket.fechaHora).toLocaleString() : 'N/A',
                        resumenProductos: currentItems.map(i => `${i.quantity} ${i.name}`).join(', ') || 'N/A',
                        metodosAgrupados: Array.isArray(ticket.metodoPago) ? ticket.metodoPago.map(m => m.metodo).join(', ') : 'N/A',
                        montoBruto: ticket.totalPagado || 0,
                    };
                } catch (err) {
                    console.error("Error procesando ticket id:", ticket.id, err);
                    return null;
                }
            }).filter(t => t !== null);

        const inventoryValue = products.reduce((acc, p) => acc + ((p.price || 0) * (p.stock || 0)), 0);
        const cashValue = (cajaBalances?.usd || 0) + ((cajaBalances?.bs || 0) / (exchangeRate || 1)) + ((cajaBalances?.digitalBs || 0) / (exchangeRate || 1));
        const totalCapitalUsd = inventoryValue + cashValue;

        return {
            totalCapitalUsd, inventoryValue, cashValue,
            productBreakdown: Object.values(productBreakdown).sort((a, b) => b.totalUnits - a.totalUnits),
            ventasProcesadas, totalGananciaNeta, totalVentasSacos, totalVentasKilos
        };
    }, [products, movimientos, cajaBalances, exchangeRate, dateFilter]);

    const filterLabels = { hoy: 'HOY', semana: 'SEMANA', mes: 'MES', todo: 'HISTÓRICO' };

    return (
        <div className="stats-view-container">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#2C3E50', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                        📊 Estadísticas de Facturación
                    </h2>
                    <p style={{ fontSize: '11px', color: '#95A5A6', margin: '4px 0 0', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Métricas financieras y registro histórico completo
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'white', padding: '8px 16px', borderRadius: '12px', border: '1px solid #E9ECEF', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    <span style={{ fontSize: '12px', color: '#95A5A6', fontWeight: '700' }}>Tasa Actual:</span>
                    <span style={{ fontSize: '12px', color: '#2C3E50', fontWeight: '900' }}>Bs {(exchangeRate || 0).toFixed(2)}</span>
                </div>
            </div>

            {/* Date Filters */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', flexWrap: 'wrap' }}>
                {Object.entries(filterLabels).map(([key, label]) => (
                    <button
                        key={key}
                        onClick={() => setDateFilter(key)}
                        style={{
                            padding: '8px 24px',
                            borderRadius: '10px',
                            border: 'none',
                            background: dateFilter === key ? '#2C3E50' : 'white',
                            color: dateFilter === key ? 'white' : '#95A5A6',
                            fontSize: '11px',
                            fontWeight: '900',
                            cursor: 'pointer',
                            letterSpacing: '0.1em',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                            transition: 'all 0.2s'
                        }}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Top 3 Metric Cards — Full Width */}
            <div className="stats-cards-grid">
                {/* GANANCIA NETA */}
                <div style={{ background: '#27AE60', borderRadius: '16px', padding: '24px', color: 'white', boxShadow: '0 10px 20px rgba(39, 174, 96, 0.15)' }}>
                    <div style={{ fontSize: '11px', fontWeight: '900', opacity: 0.9, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '0.1em' }}>
                        ✦ GANANCIA TOTAL NETA
                    </div>
                    <div style={{ fontSize: '38px', fontWeight: '900', letterSpacing: '-1.5px' }}>
                        ${(stats.totalGananciaNeta || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '10px', fontWeight: '600' }}>Ganancia limpia tras costos de inventario</div>
                </div>

                {/* VENTAS SACOS */}
                <div style={{ background: 'white', border: '1px solid #E9ECEF', borderLeft: '6px solid #E67E22', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                    <div style={{ fontSize: '11px', fontWeight: '900', color: '#E67E22', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '0.1em' }}>
                        📦 VENTAS POR SACOS (BRUTO)
                    </div>
                    <div style={{ fontSize: '38px', fontWeight: '900', color: '#2C3E50', letterSpacing: '-1.5px' }}>
                        ${(stats.totalVentasSacos || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: '12px', color: '#95A5A6', fontWeight: '600', marginTop: '10px' }}>Dinero cobrado por ventas al mayor</div>
                </div>

                {/* VENTAS KILOS */}
                <div style={{ background: 'white', border: '1px solid #E9ECEF', borderLeft: '6px solid #3498DB', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                    <div style={{ fontSize: '11px', fontWeight: '900', color: '#3498DB', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '0.1em' }}>
                        ⚖️ VENTAS POR KILOS (BRUTO)
                    </div>
                    <div style={{ fontSize: '38px', fontWeight: '900', color: '#2C3E50', letterSpacing: '-1.5px' }}>
                        ${(stats.totalVentasKilos || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: '12px', color: '#95A5A6', fontWeight: '600', marginTop: '10px' }}>Dinero cobrado por ventas al detal</div>
                </div>
            </div>

            {/* Bottom Section: Tables — Full Width Grid */}
            <div className="stats-bottom-grid">
                {/* Capital Table */}
                <div style={{ background: 'white', border: '1px solid #E9ECEF', borderRadius: '16px', padding: '30px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '900', color: '#2C3E50', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <PieChart size={20} /> Composición de Capital e Inventario
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {[
                            { label: 'Valor Físico Inventario', value: stats.inventoryValue },
                            { label: 'Liquidez en Caja/Bancos', value: stats.cashValue },
                            { label: 'Capital Total Sistema', value: stats.totalCapitalUsd, isTotal: true }
                        ].map((row, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', borderBottom: row.isTotal ? 'none' : '1px solid #F1F5F9' }}>
                                <span style={{ fontSize: '14px', fontWeight: row.isTotal ? '900' : '700', color: row.isTotal ? '#3498DB' : '#5D6D7E' }}>{row.label}</span>
                                <span style={{ fontSize: row.isTotal ? '18px' : '15px', fontWeight: '900', color: row.isTotal ? '#3498DB' : '#2C3E50' }}>
                                    ${(row.value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Ranking Table */}
                <div style={{ background: 'white', border: '1px solid #E9ECEF', borderRadius: '16px', padding: '30px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '900', color: '#2C3E50', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <TrendingUp size={20} /> Ranking Histórico de Productos Vendidos
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                        {stats.productBreakdown.slice(0, 5).map((p, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F8F9FA' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: '900', color: idx === 0 ? '#F1C40F' : '#BDC3C7' }}>PO.{idx + 1}</span>
                                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#2C3E50' }}>{p.name}</span>
                                </div>
                                <span style={{ fontSize: '13px', fontWeight: '900', color: '#27AE60' }}>{(p.totalUnits || 0).toFixed(0)} {p.metric}</span>
                            </div>
                        ))}
                        {stats.productBreakdown.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#BDC3C7', fontSize: '13px' }}>Sin ventas registradas</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Historical Ledger Table — Full Width */}
            <div style={{ background: 'white', border: '1px solid #E9ECEF', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', width: '100%' }}>
                <div style={{ padding: '24px 30px', borderBottom: '1px solid #F1F5F9', background: '#FCFCFB' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#2C3E50', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <BookOpen size={20} /> Registro Histórico de Ventas (Libro Mayor)
                    </h3>
                    <p style={{ fontSize: '11px', color: '#95A5A6', margin: '4px 0 0', fontWeight: '700' }}>AUDITORÍA DETALLADA DE CADA TICKET PROCESADO</p>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#F8F9FA', borderBottom: '2px solid #F1F5F9' }}>
                                <th style={{ padding: '16px 30px', textAlign: 'left', fontSize: '11px', fontWeight: '900', color: '#95A5A6', letterSpacing: '0.1em' }}>FECHA / HORA</th>
                                <th style={{ padding: '16px 30px', textAlign: 'left', fontSize: '11px', fontWeight: '900', color: '#95A5A6', letterSpacing: '0.1em' }}>PRODUCTOS (RESUMEN)</th>
                                <th style={{ padding: '16px 30px', textAlign: 'right', fontSize: '11px', fontWeight: '900', color: '#95A5A6', letterSpacing: '0.1em' }}>TOTAL</th>
                                <th style={{ padding: '16px 30px', textAlign: 'right', fontSize: '11px', fontWeight: '900', color: '#27AE60', letterSpacing: '0.1em' }}>GANANCIA</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.ventasProcesadas.length > 0 ? (
                                stats.ventasProcesadas.map((v, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                        <td style={{ padding: '16px 30px', fontSize: '12px', color: '#7F8C8D', fontFamily: 'monospace' }}>{v.fechaHoraStr}</td>
                                        <td style={{ padding: '16px 30px', fontSize: '13px', fontWeight: '700', color: '#2C3E50' }}>{v.resumenProductos}</td>
                                        <td style={{ padding: '16px 30px', fontSize: '14px', fontWeight: '900', textAlign: 'right', color: '#2C3E50' }}>${(v.totalPagado || 0).toFixed(2)}</td>
                                        <td style={{ padding: '16px 30px', fontSize: '14px', fontWeight: '900', textAlign: 'right', color: '#27AE60' }}>${(v.gananciaNetaVenta || 0).toFixed(2)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#95A5A6', fontWeight: '700' }}>
                                        No hay ventas registradas en este período
                                    </td>
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
