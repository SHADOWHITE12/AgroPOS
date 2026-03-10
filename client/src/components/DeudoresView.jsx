import React, { useState } from 'react';
import Swal from 'sweetalert2';

function DeudoresView({ exchangeRate = 36.50, deudores = [], setDeudores, hasAccess, userRole }) {
    const [isAbonoModalOpen, setIsAbonoModalOpen] = useState(false);
    const [currentDeudor, setCurrentDeudor] = useState(null);
    const [abonoAmount, setAbonoAmount] = useState('');

    const handleSaldar = (id, cliente) => {
        Swal.fire({
            title: '¿Saldar Deuda?',
            text: `¿Has recibido el pago total de ${cliente}?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#52B788',
            cancelButtonColor: '#ff4d4d',
            confirmButtonText: 'Sí, Pago Recibido',
            cancelButtonText: 'Cancelar',
        }).then((result) => {
            if (result.isConfirmed) {
                setDeudores(deudores.filter(d => d.id !== id));
                Swal.fire('¡Éxito!', 'La deuda ha sido saldada.', 'success');
            }
        });
    };

    const openAbonoModal = (deudor) => {
        setCurrentDeudor(deudor);
        setAbonoAmount('');
        setIsAbonoModalOpen(true);
    };

    const handleGuardarAbono = () => {
        const amount = parseFloat(abonoAmount);
        if (isNaN(amount) || amount <= 0) {
            Swal.fire('Error', 'Ingrese un monto válido.', 'error');
            return;
        }
        if (amount > currentDeudor.deudaUsd) {
            Swal.fire('Monto Excedido', 'El abono no puede ser mayor a la deuda.', 'warning');
            return;
        }
        const remainingDebt = currentDeudor.deudaUsd - amount;
        const processAbono = () => {
            const newAbono = { fecha: new Date().toISOString().split('T')[0], monto: amount };
            let newDeudores = deudores.map(d => {
                if (d.id === currentDeudor.id) {
                    return { ...d, deudaUsd: remainingDebt, abonos: [...(d.abonos || []), newAbono] };
                }
                return d;
            });
            if (remainingDebt <= 0) newDeudores = newDeudores.filter(d => d.id !== currentDeudor.id);
            setDeudores(newDeudores);
            setIsAbonoModalOpen(false);
            setCurrentDeudor(null);
            Swal.fire('Abono Registrado', 'La cuenta ha sido actualizada.', 'success');
        };
        if (remainingDebt === 0) {
            Swal.fire({
                title: 'Deuda Saldada',
                text: 'Este abono cubre el total de la deuda. El cliente será removido de la lista.',
                icon: 'info',
                showCancelButton: true,
                confirmButtonText: 'Continuar',
            }).then(processAbono);
        } else {
            processAbono();
        }
    };

    const totalPorCobrarUsd = deudores.reduce((acc, curr) => acc + curr.deudaUsd, 0);

    return (
        <div style={{ padding: '2rem', background: '#f4f4f4', minHeight: '100%' }}>
            {/* Header Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#2d3748', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        👥 Cuentas por Cobrar (Deudores)
                    </h2>
                    <p style={{ fontSize: '0.8rem', color: '#718096', margin: '4px 0 0' }}>Gestiona los créditos activos de los clientes.</p>
                </div>

                {/* Total Card */}
                <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 24px', minWidth: '180px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '0.7rem', color: '#718096', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Total por Cobrar</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#2d3748' }}>Bs {(totalPorCobrarUsd * exchangeRate).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</div>
                    <div style={{ fontSize: '0.8rem', color: '#52B788', fontWeight: '700' }}>$ {totalPorCobrarUsd.toFixed(2)}</div>
                </div>
            </div>

            {/* Table Card */}
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                <th style={{ padding: '14px 20px', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cliente</th>
                                <th style={{ padding: '14px 20px', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Deuda Total (Bs)</th>
                                <th style={{ padding: '14px 20px', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Deuda ($)</th>
                                <th style={{ padding: '14px 20px', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Fecha Crédito</th>
                                <th style={{ padding: '14px 20px', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {deudores.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#a0aec0', fontSize: '0.85rem' }}>
                                        ✅ No existen deudas pendientes
                                    </td>
                                </tr>
                            ) : (
                                deudores.map((deudor) => (
                                    <tr key={deudor.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '14px 20px', fontWeight: '700', color: '#2d3748' }}>{deudor.cliente}</td>
                                        <td style={{ padding: '14px 20px', fontWeight: '700', color: '#2d3748' }}>
                                            Bs {(deudor.deudaUsd * exchangeRate).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td style={{ padding: '14px 20px', fontWeight: '700', color: '#2d3748' }}>${deudor.deudaUsd.toFixed(2)}</td>
                                        <td style={{ padding: '14px 20px', color: '#64748b', fontSize: '0.85rem' }}>{deudor.fecha}</td>
                                        <td style={{ padding: '14px 20px' }}>
                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                {hasAccess('deudores', 'editar') && (
                                                    <button
                                                        onClick={() => openAbonoModal(deudor)}
                                                        style={{ background: '#EBF8FF', color: '#2B6CB0', border: '1px solid #BEE3F8', borderRadius: '8px', padding: '6px 14px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}
                                                    >
                                                        + Abono ($)
                                                    </button>
                                                )}
                                                {hasAccess('deudores', 'eliminar') && (
                                                    <button
                                                        onClick={() => handleSaldar(deudor.id, deudor.cliente)}
                                                        style={{ background: '#F0FFF4', color: '#276749', border: '1px solid #C6F6D5', borderRadius: '8px', padding: '6px 14px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}
                                                    >
                                                        ✓ Saldar Deuda
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Abono Modal */}
            {isAbonoModalOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', padding: '1rem' }}>
                    <div style={{ background: 'white', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '420px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#2d3748', marginBottom: '8px' }}>Registrar Abono</h3>
                        <p style={{ fontSize: '0.8rem', color: '#718096', marginBottom: '20px' }}>Cliente: <strong>{currentDeudor?.cliente}</strong></p>

                        <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
                            <div>
                                <div style={{ fontSize: '0.7rem', color: '#718096', fontWeight: '700', textTransform: 'uppercase' }}>Deuda Pendiente</div>
                                <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#2d3748' }}>${currentDeudor?.deudaUsd.toFixed(2)}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.7rem', color: '#718096', fontWeight: '700', textTransform: 'uppercase' }}>En Bolívares</div>
                                <div style={{ fontSize: '1rem', fontWeight: '900', color: '#52B788' }}>Bs {(currentDeudor?.deudaUsd * exchangeRate).toLocaleString()}</div>
                            </div>
                        </div>

                        <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Monto a abonar ($)</label>
                        <input
                            type="number"
                            step="0.01"
                            autoFocus
                            value={abonoAmount}
                            onChange={(e) => setAbonoAmount(e.target.value)}
                            placeholder="0.00"
                            style={{ width: '100%', padding: '12px 16px', fontSize: '1.2rem', fontWeight: '900', border: '2px solid #e2e8f0', borderRadius: '10px', outline: 'none', marginBottom: '24px', boxSizing: 'border-box' }}
                        />

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <button onClick={() => setIsAbonoModalOpen(false)} style={{ padding: '12px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer' }}>
                                Cancelar
                            </button>
                            <button onClick={handleGuardarAbono} style={{ padding: '12px', background: '#3B82F6', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer' }}>
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DeudoresView;
