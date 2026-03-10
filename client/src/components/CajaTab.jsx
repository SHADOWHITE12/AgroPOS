import React, { useState } from 'react';
import { Download, Calculator, TrendingUp, CreditCard, BarChart3 } from 'lucide-react';

function CajaTab({ cajaBalances, exchangeRate, userRole, hasAccess, onOpenCierre, movimientos = [], metricasGlobales, metricasMetodos, ultimoCierre }) {
    const [activeSubTab, setActiveSubTab] = useState('general');
    const [arqueoFisicoUsd, setArqueoFisicoUsd] = useState('');
    const [arqueoFisicoBs, setArqueoFisicoBs] = useState('');

    const metricas = React.useMemo(() => {
        // === TURNO ACTUAL: Ventas desde el último Cierre Z ===
        // El timestamp ultimoCierre viene de Supabase (tabla cierres_caja)
        // Si no hay ningún cierre, se usa epoch (1970) para incluir todo
        const turnoLimite = new Date(ultimoCierre || new Date(0).toISOString());
        const turnoMovimientos = (movimientos || []).filter(m => {
            if (!m.fechaHora) return false;
            return new Date(m.fechaHora) > turnoLimite;
        });

        let turnoGanancia = 0, turnoMayor = 0, turnoDetal = 0;
        let turnoBrutoPunto = 0, turnoComisionPunto = 0;
        let turnoBrutoBiopago = 0, turnoComisionBiopago = 0;

        turnoMovimientos.forEach(ticket => {
            turnoGanancia += (ticket.gananciaNetaVenta || 0);
            ticket.productos?.forEach(item => {
                if (item.tipoVenta === 'saco') turnoMayor += item.quantity;
                else turnoDetal += item.quantity;
            });
            ticket.metodoPago?.forEach(m => {
                const b = m.monto || 0;
                if (m.metodo === 'Punto' || m.metodo === 'Punto DB/CR') {
                    const c = b * 0.015;
                    turnoBrutoPunto += b; turnoComisionPunto += c;
                } else if (m.metodo === 'Biopago') {
                    const c = b * 0.04;
                    turnoBrutoBiopago += b; turnoComisionBiopago += c;
                }
            });
        });

        // === HOY: Ventas del día calendario (para referencia en el desglose) ===
        const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
        const hoyMovimientos = (movimientos || []).filter(m => new Date(m.fechaHora) >= startOfDay);

        let hoyGanancia = 0, hoyMayor = 0, hoyDetal = 0;
        let hoyBrutoPunto = 0, hoyComisionPunto = 0, hoyBrutoBiopago = 0, hoyComisionBiopago = 0;

        hoyMovimientos.forEach(ticket => {
            hoyGanancia += (ticket.gananciaNetaVenta || 0);
            ticket.productos?.forEach(item => {
                if (item.tipoVenta === 'saco') hoyMayor += item.quantity;
                else hoyDetal += item.quantity;
            });
            ticket.metodoPago?.forEach(m => {
                const b = m.monto || 0;
                if (m.metodo === 'Punto' || m.metodo === 'Punto DB/CR') {
                    const c = b * 0.015;
                    hoyBrutoPunto += b; hoyComisionPunto += c;
                } else if (m.metodo === 'Biopago') {
                    const c = b * 0.04;
                    hoyBrutoBiopago += b; hoyComisionBiopago += c;
                }
            });
        });

        return {
            // Turno: métricas desde el último Cierre Z (se resetean a 0 en cada cierre)
            turno: {
                totalMayor: turnoMayor,
                totalDetal: turnoDetal,
                gananciaNeta: turnoGanancia,
                brutoPunto: turnoBrutoPunto,
                comisionPunto: turnoComisionPunto,
                brutoBiopago: turnoBrutoBiopago,
                comisionBiopago: turnoComisionBiopago
            },
            // Hoy: métricas del día calendario (no se resetean con el cierre)
            hoy: {
                totalMayor: hoyMayor, totalDetal: hoyDetal, gananciaNeta: hoyGanancia,
                brutoPunto: hoyBrutoPunto, comisionPunto: hoyComisionPunto,
                brutoBiopago: hoyBrutoBiopago, comisionBiopago: hoyComisionBiopago
            }
        };
    }, [movimientos, ultimoCierre]);

    // handleGenerarArqueo replaced by CierreModal logic

    return (
        <div style={{ padding: '30px', overflowY: 'auto', height: '100%', background: '#F8F9FA' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
                <div>
                    <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#2C3E50', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        💰 Gestión de Caja
                    </h2>
                    <p style={{ fontSize: '11px', color: '#95A5A6', margin: '4px 0 0', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        CONTROL DE INGRESOS Y ARQUEOS
                    </p>
                </div>
                <div style={{ display: 'flex', background: '#EbEEf2', padding: '4px', borderRadius: '10px', gap: '4px' }}>
                    <button
                        onClick={() => setActiveSubTab('general')}
                        style={{ padding: '8px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '900', background: activeSubTab === 'general' ? 'white' : 'transparent', color: activeSubTab === 'general' ? '#2C3E50' : '#95A5A6', boxShadow: activeSubTab === 'general' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}
                    >
                        PANEL GENERAL
                    </button>
                    <button
                        onClick={() => setActiveSubTab('movimientos')}
                        style={{ padding: '8px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '900', background: activeSubTab === 'movimientos' ? 'white' : 'transparent', color: activeSubTab === 'movimientos' ? '#2C3E50' : '#95A5A6', boxShadow: activeSubTab === 'movimientos' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}
                    >
                        HISTORIAL
                    </button>
                </div>
            </div>

            {activeSubTab === 'general' ? (
                <>
                    {/* Arqueo / Cierre Section — Prominent at the top */}
                    {(userRole === 'Administrador' || (hasAccess && hasAccess('caja', 'cerrar'))) && (
                        <div style={{ background: 'linear-gradient(135deg, #1B4332, #2D6A4F)', borderRadius: '20px', padding: '30px', boxShadow: '0 10px 25px rgba(27, 67, 50, 0.15)', textAlign: 'left', marginBottom: '30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                <div style={{ width: '56px', height: '56px', background: 'rgba(255,255,255,0.1)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                    <Download size={28} />
                                </div>
                                <div style={{ textAlign: 'left' }}>
                                    <h3 style={{ fontSize: '18px', fontWeight: '900', color: 'white', margin: 0 }}>Cierre de Jornada (Reporte Z)</h3>
                                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', margin: '4px 0 0' }}>
                                        Verifica cierres físicos y genera el reporte de facturación.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onOpenCierre}
                                style={{
                                    background: 'white',
                                    color: '#1B4332',
                                    border: 'none',
                                    padding: '14px 32px',
                                    borderRadius: '12px',
                                    fontSize: '13px',
                                    fontWeight: '900',
                                    cursor: 'pointer',
                                    boxShadow: '0 6px 12px rgba(0,0,0,0.1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                                onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                            >
                                <BarChart3 size={18} /> CERRAR JORNADA
                            </button>
                        </div>
                    )}
                    {/* Top 3 Balance Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                        {/* EFECTIVO BS */}
                        <div style={{ background: 'white', border: '1px solid #E9ECEF', borderLeft: '5px solid #27AE60', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                            <div style={{ fontSize: '11px', fontWeight: '800', color: '#27AE60', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '8px', height: '8px', background: '#27AE60', borderRadius: '50%' }}></span> EFECTIVO BS
                            </div>
                            <div style={{ fontSize: '32px', fontWeight: '900', color: '#2C3E50', letterSpacing: '-1px' }}>
                                Bs {cajaBalances.bs.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                            <div style={{ fontSize: '12px', color: '#95A5A6', fontWeight: '600', marginTop: '6px' }}>
                                Equiv. a ${(cajaBalances.bs / exchangeRate).toFixed(2)}
                            </div>
                        </div>

                        {/* EFECTIVO USD */}
                        <div style={{ background: 'white', border: '1px solid #E9ECEF', borderLeft: '5px solid #3498DB', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                            <div style={{ fontSize: '11px', fontWeight: '800', color: '#3498DB', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '8px', height: '8px', background: '#3498DB', borderRadius: '50%' }}></span> EFECTIVO USD
                            </div>
                            <div style={{ fontSize: '32px', fontWeight: '900', color: '#2C3E50', letterSpacing: '-1px' }}>
                                ${cajaBalances.usd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                            <div style={{ fontSize: '12px', color: '#95A5A6', fontWeight: '600', marginTop: '6px' }}>Saldo en Gaveta</div>
                        </div>

                        {/* BANCO / PUNTO */}
                        <div style={{ background: 'white', border: '1px solid #E9ECEF', borderLeft: '5px solid #9B59B6', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                            <div style={{ fontSize: '11px', fontWeight: '800', color: '#9B59B6', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '8px', height: '8px', background: '#9B59B6', borderRadius: '50%' }}></span> BANCO / PUNTO
                            </div>
                            <div style={{ fontSize: '32px', fontWeight: '900', color: '#2C3E50', letterSpacing: '-1px' }}>
                                Bs {cajaBalances.digitalBs.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                            <div style={{ fontSize: '12px', color: '#95A5A6', fontWeight: '600', marginTop: '6px' }}>Ventas digitales reportadas</div>
                        </div>
                    </div>

                    {/* Section Label */}
                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#5D6D7E', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Calculator size={18} /> Métricas Financieras y Comisiones
                    </div>

                    {/* Ganancia Neta Banner */}
                    <div style={{ background: '#27AE60', borderRadius: '16px', padding: '40px', textAlign: 'center', color: 'white', marginBottom: '24px', boxShadow: '0 10px 20px rgba(39, 174, 96, 0.15)' }}>
                        <div style={{ fontSize: '16px', fontWeight: '800', letterSpacing: '0.15em', marginBottom: '12px', opacity: 0.9 }}>GANANCIA NETA</div>
                        <div style={{ fontSize: '64px', fontWeight: '900', letterSpacing: '-2px', textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                            ${metricas.turno.gananciaNeta.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div style={{ fontSize: '14px', opacity: 0.8, marginTop: '10px', fontWeight: '600' }}>Ganancia del turno actual (desde el último Cierre Z)</div>
                    </div>

                    {/* Al Mayor / Al Detal */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                        <div style={{ background: 'white', border: '1px solid #E9ECEF', borderLeft: '6px solid #3498DB', borderRadius: '12px', padding: '24px' }}>
                            <div style={{ fontSize: '11px', fontWeight: '800', color: '#7F8C8D', letterSpacing: '0.1em', marginBottom: '10px' }}>VENDIDO EN TURNO AL MAYOR</div>
                            <div style={{ fontSize: '32px', fontWeight: '900', color: '#2C3E50' }}>{metricas.turno.totalMayor} <span style={{ fontSize: '16px', color: '#BDC3C7' }}>Sacos</span></div>
                        </div>
                        <div style={{ background: 'white', border: '1px solid #E9ECEF', borderLeft: '6px solid #E67E22', borderRadius: '12px', padding: '24px' }}>
                            <div style={{ fontSize: '11px', fontWeight: '800', color: '#7F8C8D', letterSpacing: '0.1em', marginBottom: '10px' }}>VENDIDO EN TURNO AL DETAL</div>
                            <div style={{ fontSize: '32px', fontWeight: '900', color: '#2C3E50' }}>{metricas.turno.totalDetal.toFixed(2)} <span style={{ fontSize: '16px', color: '#BDC3C7' }}>Kilos</span></div>
                        </div>
                    </div>

                    {/* Desglose List */}
                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#5D6D7E', marginBottom: '16px' }}>Desglose de Ingresos por Método de Pago</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '30px' }}>
                        {[
                            { name: 'Punto de Venta', color: '#3498DB', bruto: metricas.turno.brutoPunto, comision: metricas.turno.comisionPunto, hoyBruto: metricas.hoy.brutoPunto },
                            { name: 'Biopago', color: '#27AE60', bruto: metricas.turno.brutoBiopago, comision: metricas.turno.comisionBiopago, hoyBruto: metricas.hoy.brutoBiopago }
                        ].map((item, i) => (
                            <div key={i} style={{ background: 'white', border: '1px solid #E9ECEF', borderRadius: '12px', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ width: '10px', height: '10px', background: item.color, borderRadius: '50%' }}></span>
                                    <span style={{ fontSize: '14px', fontWeight: '900', color: '#2C3E50' }}>{item.name}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '30px', fontSize: '13px' }}>
                                    <div style={{ color: '#95A5A6', fontWeight: '700' }}>Turno <span style={{ color: '#2C3E50', marginLeft: '6px' }}>${item.bruto.toFixed(2)}</span></div>
                                    <span style={{ color: '#DEE2E6' }}>|</span>
                                    <div style={{ color: '#95A5A6', fontWeight: '700' }}>Hoy <span style={{ color: '#2C3E50', marginLeft: '6px' }}>${item.hoyBruto.toFixed(2)}</span></div>
                                    <div style={{ background: '#D5F5E3', padding: '6px 16px', borderRadius: '8px', color: '#1E8449', fontWeight: '900' }}>
                                        Neto Turno ${(item.bruto - item.comision).toFixed(2)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Cierre section moved to top of general tab */}
                </>
            ) : (
                <div style={{ background: 'white', border: '1px solid #E9ECEF', borderRadius: '16px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#F8F9FA', borderBottom: '2px solid #F1F5F9' }}>
                                <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '11px', color: '#95A5A6', fontWeight: '800' }}>FECHA / HORA</th>
                                <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '11px', color: '#95A5A6', fontWeight: '800' }}>PRODUCTOS</th>
                                <th style={{ padding: '16px 20px', textAlign: 'right', fontSize: '11px', color: '#95A5A6', fontWeight: '800' }}>TOTAL</th>
                                <th style={{ padding: '16px 20px', textAlign: 'right', fontSize: '11px', color: '#27AE60', fontWeight: '800' }}>GANANCIA</th>
                            </tr>
                        </thead>
                        <tbody>
                            {movimientos.length > 0 ? [...movimientos].reverse().map((m, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                    <td style={{ padding: '16px 20px', fontSize: '12px', color: '#7F8C8D', fontFamily: 'monospace' }}>{new Date(m.fechaHora).toLocaleString()}</td>
                                    <td style={{ padding: '16px 20px', fontSize: '12px', fontWeight: '700', color: '#2C3E50' }}>{m.productos?.map(p => `${p.quantity}x ${p.name}`).join(', ')}</td>
                                    <td style={{ padding: '16px 20px', fontSize: '14px', fontWeight: '900', textAlign: 'right', color: '#2C3E50' }}>${(m.totalPagado || 0).toFixed(2)}</td>
                                    <td style={{ padding: '16px 20px', fontSize: '14px', fontWeight: '900', textAlign: 'right', color: '#27AE60' }}>${(m.gananciaNetaVenta || 0).toFixed(2)}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan="4" style={{ padding: '60px', textAlign: 'center', color: '#BDC3C7' }}>No hay movimientos registrados</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default CajaTab;
