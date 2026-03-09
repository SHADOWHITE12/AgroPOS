import React, { useState } from 'react';

function DeudoresView({ exchangeRate = 36.50, deudores = [], setDeudores, hasAccess, userRole }) {
    const [isAbonoModalOpen, setIsAbonoModalOpen] = useState(false);
    const [currentDeudor, setCurrentDeudor] = useState(null);
    const [abonoAmount, setAbonoAmount] = useState('');

    const handleSaldar = (id, cliente) => {
        if (window.confirm(`¿Confirmas que ${cliente} ha saldado su deuda por completo?`)) {
            setDeudores(deudores.filter(d => d.id !== id));
            // Aquí en un futuro se registraría el ingreso en la Caja
        }
    };

    const openAbonoModal = (deudor) => {
        setCurrentDeudor(deudor);
        setAbonoAmount('');
        setIsAbonoModalOpen(true);
    };

    const handleGuardarAbono = () => {
        const amount = parseFloat(abonoAmount);
        if (isNaN(amount) || amount <= 0) {
            alert('Ingrese un monto válido.');
            return;
        }

        if (amount > currentDeudor.deudaUsd) {
            alert('El monto del abono excede la deuda actual.');
            return;
        }

        const newAbono = {
            fecha: new Date().toISOString().split('T')[0],
            monto: amount
        };

        const remainingDebt = currentDeudor.deudaUsd - amount;

        let newDeudores = deudores.map(d => {
            if (d.id === currentDeudor.id) {
                return {
                    ...d,
                    deudaUsd: remainingDebt,
                    abonos: [...(d.abonos || []), newAbono]
                };
            }
            return d;
        });

        if (remainingDebt <= 0) {
            if (window.confirm('La deuda ha sido saldada completamente. ¿Deseas eliminar al cliente de la lista de pendientes?')) {
                newDeudores = newDeudores.filter(d => d.id !== currentDeudor.id);
            }
        }

        setDeudores(newDeudores);
        setIsAbonoModalOpen(false);
        setCurrentDeudor(null);
    };

    return (
        <div className="deudores-container p-4 md:p-8 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Deudores</h2>
                    <p className="text-slate-500 text-sm">Gestión de créditos activos.</p>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 min-w-[200px]">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total por Cobrar</div>
                    <div className="text-2xl font-black text-slate-800">
                        Bs {(deudores.reduce((acc, curr) => acc + curr.deudaUsd, 0) * exchangeRate).toFixed(0)}
                    </div>
                    <div className="text-sm font-bold text-blue-600">
                        $ {deudores.reduce((acc, curr) => acc + curr.deudaUsd, 0).toFixed(2)}
                    </div>
                </div>
            </div>

            <div className="table-responsive-wrapper">
                <table className="w-full text-left border-separate border-spacing-0">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="p-4 font-black text-slate-400 uppercase text-[10px] tracking-widest border-b border-slate-100">Cliente</th>
                            <th className="p-4 font-black text-slate-400 uppercase text-[10px] tracking-widest border-b border-slate-100">Deuda Bs</th>
                            <th className="p-4 font-black text-slate-400 uppercase text-[10px] tracking-widest border-b border-slate-100">Deuda USD</th>
                            <th className="p-4 font-black text-slate-400 uppercase text-[10px] tracking-widest border-b border-slate-100">Fecha</th>
                            {hasAccess('deudores', 'editar') && <th className="p-4 font-black text-slate-400 uppercase text-[10px] tracking-widest border-b border-slate-100 text-center">Abonar</th>}
                            {hasAccess('deudores', 'eliminar') && <th className="p-4 font-black text-slate-400 uppercase text-[10px] tracking-widest border-b border-slate-100 text-right">Acción</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {deudores.length === 0 ? (
                            <tr>
                                <td colSpan={hasAccess('deudores', 'editar') || hasAccess('deudores', 'eliminar') ? "6" : "4"} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    No hay cuentas por cobrar registradas.
                                </td>
                            </tr>
                        ) : (
                            deudores.map((deudor) => (
                                <tr key={deudor.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 font-bold text-slate-700">{deudor.cliente}</td>
                                    <td className="p-4 font-black text-slate-800">Bs {(deudor.deudaUsd * exchangeRate).toFixed(0)}</td>
                                    <td className="p-4 font-bold text-blue-600">${deudor.deudaUsd.toFixed(2)}</td>
                                    <td className="p-4 text-xs text-slate-500 font-medium">
                                        {deudor.fecha}
                                        {deudor.abonos && deudor.abonos.length > 0 && (
                                            <div className="mt-2 p-2 bg-slate-100 rounded-lg text-slate-600 space-y-1">
                                                <div className="font-black text-[9px] uppercase tracking-widest text-slate-400">Abonos</div>
                                                {deudor.abonos.map((ab, i) => (
                                                    <div key={i}>${ab.monto.toFixed(2)} - {ab.fecha}</div>
                                                ))}
                                            </div>
                                        )}
                                    </td>
                                    {hasAccess('deudores', 'editar') && (
                                        <td className="p-4 text-center">
                                            <button
                                                className="bg-blue-100 text-blue-600 p-2 rounded-lg font-black text-xs hover:bg-blue-600 hover:text-white transition-all"
                                                onClick={() => openAbonoModal(deudor)}
                                            >
                                                ABONAR
                                            </button>
                                        </td>
                                    )}
                                    {hasAccess('deudores', 'eliminar') && (
                                        <td className="p-4 text-right">
                                            <button
                                                className="bg-emerald-100 text-emerald-600 p-2 rounded-lg font-black text-xs hover:bg-emerald-600 hover:text-white transition-all"
                                                onClick={() => handleSaldar(deudor.id, deudor.cliente)}
                                            >
                                                SALDAR
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal de Abono */}
            {isAbonoModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: 'var(--radius-md)', width: '90%', maxWidth: '400px', boxShadow: 'var(--shadow-lg)' }}>
                        <h3 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>Registrar Abono</h3>
                        <p style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                            Cliente: <strong>{currentDeudor?.cliente}</strong><br />
                            Deuda actual: <strong>${currentDeudor?.deudaUsd.toFixed(2)}</strong>
                        </p>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Monto del Abono ($)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={abonoAmount}
                                onChange={(e) => setAbonoAmount(e.target.value)}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '1.1rem' }}
                                placeholder="Ej. 10.00"
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={() => setIsAbonoModalOpen(false)}
                                style={{ flex: 1, padding: '0.75rem', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleGuardarAbono}
                                style={{ flex: 1, padding: '0.75rem', background: 'var(--secondary)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                Confirmar Abono
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DeudoresView;
