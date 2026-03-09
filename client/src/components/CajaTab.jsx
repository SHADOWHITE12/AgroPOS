import React, { useState } from 'react';

function CajaTab({ cajaBalances, exchangeRate, userRole, hasAccess, onCerrarJornada, metricasGlobales = { totalMayor: 0, totalDetal: 0, gananciaNeta: 0 }, metricasMetodos = { 'Punto': { bruto: 0, comision: 0, neto: 0 }, 'Biopago': { bruto: 0, comision: 0, neto: 0 } }, movimientos = [] }) {
    const [activeSubTab, setActiveSubTab] = useState('general');
    const [isArqueoModalOpen, setIsArqueoModalOpen] = useState(false);
    const [arqueoFisicoUsd, setArqueoFisicoUsd] = useState('');
    const [arqueoFisicoBs, setArqueoFisicoBs] = useState('');

    const metricasCalculadas = React.useMemo(() => {
        let totalMayor = 0;
        let totalDetal = 0;
        let gananciaNeta = 0;
        const metodos = {
            'Punto': { bruto: 0, comision: 0, neto: 0 },
            'Biopago': { bruto: 0, comision: 0, neto: 0 }
        };

        (movimientos || []).forEach(ticket => {
            gananciaNeta += (ticket.gananciaNetaVenta || 0);

            ticket.productos?.forEach(item => {
                if (item.tipoVenta === 'saco') {
                    totalMayor += item.quantity;
                } else {
                    totalDetal += item.quantity;
                }
            });

            ticket.metodoPago?.forEach(m => {
                if (m.metodo === 'Punto') {
                    const bruto = m.monto;
                    const comision = bruto * 0.015;
                    metodos['Punto'].bruto += bruto;
                    metodos['Punto'].comision += comision;
                    metodos['Punto'].neto += (bruto - comision);
                } else if (m.metodo === 'Biopago') {
                    const bruto = m.monto;
                    const comision = bruto * 0.04;
                    metodos['Biopago'].bruto += bruto;
                    metodos['Biopago'].comision += comision;
                    metodos['Biopago'].neto += (bruto - comision);
                }
            });
        });

        return { totalMayor, totalDetal, gananciaNeta, metricasMetodos: metodos };
    }, [movimientos]);

    const handleGenerarArqueo = () => {
        const inputUsd = parseFloat(arqueoFisicoUsd) || 0;
        const inputBs = parseFloat(arqueoFisicoBs) || 0;

        const diffUsd = inputUsd - cajaBalances.usd;
        const diffBs = inputBs - cajaBalances.bs;

        const now = new Date().toLocaleString();

        let report = `=================================\n`;
        report += `     REPORTE DE ARQUEO DE CAJA\n`;
        report += `=================================\n\n`;
        report += `Fecha y Hora: ${now}\n`;
        report += `Tasa de Cambio: Bs ${exchangeRate.toFixed(2)}\n\n`;

        report += `--- INGRESOS POR SISTEMA ---\n`;
        report += `Fondo Inicial USD: $${cajaBalances.inicialUsd.toFixed(2)}\n`;
        report += `Fondo Inicial Bs: Bs ${cajaBalances.inicialBs.toFixed(2)}\n`;
        report += `Total Efectivo Generado USD: $${(cajaBalances.usd - cajaBalances.inicialUsd).toFixed(2)}\n`;
        report += `Total Efectivo Generado Bs: Bs ${(cajaBalances.bs - cajaBalances.inicialBs).toFixed(2)}\n`;
        report += `Total Pagos Electrónicos (Punto/PM): Bs ${cajaBalances.digitalBs.toFixed(2)}\n\n`;

        report += `--- TOTALES ESPERADOS EN GAVETA ---\n`;
        report += `Esperado USD: $${cajaBalances.usd.toFixed(2)}\n`;
        report += `Esperado Bs: Bs ${cajaBalances.bs.toFixed(2)}\n\n`;

        report += `--- EFECTIVO FÍSICO CONTADO ---\n`;
        report += `Físico USD: $${inputUsd.toFixed(2)}\n`;
        report += `Físico Bs: Bs ${inputBs.toFixed(2)}\n\n`;

        report += `--- CUADRE FINAL ---\n`;
        report += `Diferencia USD: $${diffUsd.toFixed(2)} ${diffUsd === 0 ? '(CUADRADO)' : diffUsd > 0 ? '(SOBRANTE)' : '(FALTANTE)'}\n`;
        report += `Diferencia Bs: Bs ${diffBs.toFixed(2)} ${diffBs === 0 ? '(CUADRADO)' : diffBs > 0 ? '(SOBRANTE)' : '(FALTANTE)'}\n\n`;

        report += `=================================\n`;
        report += `        FIN DEL REPORTE\n`;
        report += `=================================`;

        const blob = new Blob([report], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Arqueo_Caja_${new Date().getTime()}.txt`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        if (window.confirm("Se ha descargado el reporte. ¿Deseas cerrar la jornada y reiniciar la caja?")) {
            onCerrarJornada();
        }
    };

    return (
        <div className="caja-container">
            <div style={{ marginBottom: '1rem' }}>
                <h1 style={{ color: 'var(--primary)', marginBottom: '0.25rem' }}>💰 Gestión de Caja</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Control de ingresos, egresos y arqueos de la Agropecuaria.</p>
            </div>

            <div className="caja-tabs">
                <button
                    className={`caja-tab-btn ${activeSubTab === 'general' ? 'active' : ''}`}
                    onClick={() => setActiveSubTab('general')}
                >
                    Vista General
                </button>
                <button
                    className={`caja-tab-btn ${activeSubTab === 'movimientos' ? 'active' : ''}`}
                    onClick={() => setActiveSubTab('movimientos')}
                >
                    Movimientos
                </button>
            </div>

            {activeSubTab === 'general' && (
                <>
                    <div className="caja-cards-grid">
                        <div className="caja-card">
                            <span className="caja-card-title">💵 EFECTIVO BS</span>
                            <span className="caja-card-amount">Bs {cajaBalances.bs.toFixed(2)}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Equiv. a ${(cajaBalances.bs / exchangeRate).toFixed(2)}</span>
                        </div>
                        <div className="caja-card" style={{ borderLeft: '4px solid var(--secondary)' }}>
                            <span className="caja-card-title">💲 EFECTIVO USD</span>
                            <span className="caja-card-amount">${cajaBalances.usd.toFixed(2)}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Saldo en boveda</span>
                        </div>
                        <div className="caja-card">
                            <span className="caja-card-title">💳 BANCO / PUNTO</span>
                            <span className="caja-card-amount">Bs {cajaBalances.digitalBs.toFixed(2)}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ventas digitales reportadas</span>
                        </div>
                    </div>

                    <div style={{ marginTop: '2rem' }}>
                        <h3 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>📈 Métricas Financieras y Comisiones</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                            {/* Ganancia Neta Destacada */}
                            <div style={{ backgroundColor: '#10b981', color: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gridColumn: '1 / -1', textAlign: 'center' }}>
                                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.9 }}>Ganancia Neta</span>
                                <span style={{ fontSize: '3rem', fontWeight: '900', marginTop: '0.5rem' }}>
                                    ${metricasCalculadas.gananciaNeta.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <span style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '0.5rem' }}>Monto bruto total menos todas las comisiones descontadas</span>
                            </div>

                            {/* Volumetría Mayor vs Detal */}
                            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', borderLeft: '4px solid #3b82f6' }}>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>TOTAL VENDIDO AL MAYOR</span>
                                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#111827', marginTop: '0.5rem' }}>
                                    {metricasCalculadas.totalMayor.toLocaleString()} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>Sacos</span>
                                </div>
                            </div>
                            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', borderLeft: '4px solid #f59e0b' }}>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>TOTAL VENDIDO AL DETAL</span>
                                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#111827', marginTop: '0.5rem' }}>
                                    {metricasCalculadas.totalDetal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>Kilos</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: '2rem' }}>
                        <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Desglose de Ingresos por Método de Pago</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {['Punto', 'Biopago'].map(metodo => (
                                <div key={metodo} style={{ backgroundColor: 'white', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem', minWidth: '150px' }}>
                                        {metodo === 'Punto' ? '💳 Punto de Venta' : '🧬 Biopago'}
                                    </div>
                                    <div style={{ display: 'flex', gap: '1.5rem', flex: 1, justifyContent: 'flex-end', alignItems: 'center', fontSize: '0.95rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Bruto</span>
                                            <span style={{ fontWeight: 500 }}>${(metricasCalculadas.metricasMetodos[metodo]?.bruto || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div style={{ color: 'var(--danger)', fontWeight: 'bold' }}>-</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Comisión</span>
                                            <span style={{ color: 'var(--danger)', fontWeight: 500 }}>${(metricasCalculadas.metricasMetodos[metodo]?.comision || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div style={{ fontWeight: 'bold' }}>=</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', backgroundColor: '#ecfdf5', padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                                            <span style={{ color: '#065f46', fontSize: '0.8rem', fontWeight: 'bold' }}>Neto</span>
                                            <span style={{ color: '#059669', fontWeight: 'bold', fontSize: '1.1rem' }}>${(metricasCalculadas.metricasMetodos[metodo]?.neto || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '100%', maxWidth: '400px', margin: '0 auto', marginTop: '20px' }}>
                        {hasAccess('caja', 'editar') && (
                            <button
                                onClick={() => setIsArqueoModalOpen(true)}
                                style={{ padding: '16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', transition: 'background-color 0.3s', width: '100%' }}
                                onMouseOver={(e) => e.target.style.backgroundColor = '#1d4ed8'}
                                onMouseOut={(e) => e.target.style.backgroundColor = '#2563eb'}
                            >
                                📊 Arqueo de Caja
                            </button>
                        )}
                    </div>

                    <div style={{ marginTop: '2rem' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Resumen de Estatus</h3>
                        <div style={{ backgroundColor: 'var(--white)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--secondary)', fontWeight: 'bold' }}>
                                <span className="caja-status-dot dot-green"></span>
                                LA CAJA ESTÁ CUADRADA
                            </div>
                            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Último arqueo realizado hace 2 horas por Admin.</p>
                        </div>
                    </div>
                </>
            )}

            {activeSubTab === 'movimientos' && (
                <div style={{ maxHeight: '400px', overflowY: 'auto', backgroundColor: 'var(--white)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)' }}>
                    <table className="movimientos-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--white)', zIndex: 1 }}>
                            <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)' }}>
                                <th style={{ padding: '0.75rem 1rem' }}>Hora</th>
                                <th style={{ padding: '0.75rem 1rem' }}>Tipo</th>
                                <th style={{ padding: '0.75rem 1rem' }}>Concepto</th>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Total Pagado</th>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Método</th>
                            </tr>
                        </thead>
                        <tbody>
                            {movimientos.length > 0 ? [...movimientos].sort((a, b) => new Date(b.fechaHora) - new Date(a.fechaHora)).map((ticket, idx) => (
                                <tr key={ticket.id || idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                                        {new Date(ticket.fechaHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td style={{ padding: '0.75rem 1rem' }}>
                                        <span className="type-badge badge-venta">VENTA</span>
                                    </td>
                                    <td style={{ padding: '0.75rem 1rem', maxWidth: '250px' }}>
                                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {ticket.productos?.map(p => `${p.quantity}x ${p.name}`).join(', ') || 'Venta general'}
                                        </div>
                                    </td>
                                    <td className="price" style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 'bold' }}>
                                        ${(ticket.totalPagado || 0).toFixed(2)}
                                    </td>
                                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', backgroundColor: 'var(--color-bg)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                                            {ticket.metodoPago?.map(m => m.metodo).join(', ') || 'N/A'}
                                        </span>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No hay movimientos registrados en esta jornada.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal de Arqueo Overlay */}
            {isArqueoModalOpen && (
                <div className="modal-overlay activo">
                    <div className="modal-caja" style={{ maxWidth: '600px', backgroundColor: 'var(--white)' }}>
                        <div className="modal-header-elite" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ margin: 0 }}>📋 Confirmar Efectivo en Caja</h2>
                            <button onClick={() => setIsArqueoModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer' }}>✖</button>
                        </div>

                        <div className="arqueo-container" style={{ padding: '0 1rem', marginTop: '1rem' }}>
                            <div className="arqueo-row" style={{ fontWeight: 'bold', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                                <span>Denominación / F. Inicial</span>
                                <span>Sistema Espera</span>
                                <span>Físico (Contado)</span>
                            </div>

                            <div className="arqueo-row">
                                <span style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span>Efectivo Dólares ($)</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Inicio: ${cajaBalances.inicialUsd.toFixed(2)}</span>
                                </span>
                                <span className="price">${cajaBalances.usd.toFixed(2)}</span>
                                <input
                                    type="number"
                                    className="arqueo-input"
                                    placeholder="0.00"
                                    value={arqueoFisicoUsd}
                                    onChange={(e) => setArqueoFisicoUsd(e.target.value)}
                                />
                            </div>

                            <div className="arqueo-row">
                                <span style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span>Efectivo Bolívares (Bs)</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Inicio: Bs {cajaBalances.inicialBs.toFixed(2)}</span>
                                </span>
                                <span className="price">Bs {cajaBalances.bs.toFixed(2)}</span>
                                <input
                                    type="number"
                                    className="arqueo-input"
                                    placeholder="0.00"
                                    value={arqueoFisicoBs}
                                    onChange={(e) => setArqueoFisicoBs(e.target.value)}
                                />
                            </div>

                            <div className="arqueo-row" style={{ backgroundColor: 'var(--bg-color)', padding: '0.75rem', borderRadius: '4px', marginTop: '0.5rem' }}>
                                <span>Pagos Digitales (No físicos)</span>
                                <span className="price" style={{ color: 'var(--text-muted)' }}>Bs {cajaBalances.digitalBs.toFixed(2)}</span>
                                <span style={{ color: 'var(--secondary)', fontSize: '0.8rem', fontWeight: 'bold', textAlign: 'center' }}>Automático</span>
                            </div>

                            <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: 'var(--bg-color)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: 'bold' }}>Diferencia USD:</span>
                                <span className="price" style={{ color: ((parseFloat(arqueoFisicoUsd) || 0) - cajaBalances.usd) === 0 ? 'var(--secondary)' : 'var(--danger)' }}>
                                    ${((parseFloat(arqueoFisicoUsd) || 0) - cajaBalances.usd).toFixed(2)}
                                </span>
                            </div>

                            <div style={{ marginTop: '0.5rem', padding: '1rem', backgroundColor: 'var(--bg-color)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: 'bold' }}>Diferencia Bs:</span>
                                <span className="price" style={{ color: ((parseFloat(arqueoFisicoBs) || 0) - cajaBalances.bs) === 0 ? 'var(--secondary)' : 'var(--danger)' }}>
                                    Bs {((parseFloat(arqueoFisicoBs) || 0) - cajaBalances.bs).toFixed(2)}
                                </span>
                            </div>

                            <button
                                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-lg transition-all flex justify-center items-center"
                                style={{ marginTop: '2rem' }}
                                onClick={handleGenerarArqueo}
                            >
                                CERRAR JORNADA Y GENERAR REPORTE
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CajaTab;
