import React from 'react';
import Swal from 'sweetalert2';

function PrepagosView({ prepagos, setPrepagos, userRole, hasAccess }) {
    const handleDespachar = (id, cliente, producto) => {
        Swal.fire({
            title: '¿Confirmar Entrega?',
            text: `¿Has entregado ${producto} a ${cliente}?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#52B788',
            cancelButtonColor: '#94a3b8',
            confirmButtonText: 'Sí, Entregado',
            cancelButtonText: 'Cancelar',
        }).then((result) => {
            if (result.isConfirmed) {
                setPrepagos(prepagos.map(p => p.id === id ? { ...p, estado: 'Entregado' } : p));
                Swal.fire('¡Listo!', 'Entrega registrada exitosamente.', 'success');
            }
        });
    };

    const handleEliminar = (id) => {
        Swal.fire({
            title: '¿Eliminar Registro?',
            text: 'Se borrará este histórico de prepago.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Eliminar',
        }).then((result) => {
            if (result.isConfirmed) setPrepagos(prepagos.filter(p => p.id !== id));
        });
    };

    const pendingCount = prepagos.filter(p => p.estado === 'Pendiente').length;

    return (
        <div style={{ padding: '2rem', background: '#f4f4f4', minHeight: '100%' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#2d3748', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        🚚 Entregas Pendientes (Prepagos)
                    </h2>
                    <p style={{ fontSize: '0.8rem', color: '#718096', margin: '4px 0 0' }}>Control de mercancía pagada a la espera de despacho.</p>
                </div>

                {/* Stats card */}
                <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 24px', minWidth: '160px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '0.7rem', color: '#718096', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Por Despachar</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#E67E22', lineHeight: 1 }}>{pendingCount}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>Órdenes pendientes</div>
                </div>
            </div>

            {/* Table Card */}
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                <th style={{ padding: '14px 20px', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cliente</th>
                                <th style={{ padding: '14px 20px', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Producto</th>
                                <th style={{ padding: '14px 20px', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cantidad</th>
                                <th style={{ padding: '14px 20px', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Fecha</th>
                                <th style={{ padding: '14px 20px', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Estado</th>
                                <th style={{ padding: '14px 20px', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {prepagos.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#a0aec0', fontSize: '0.85rem' }}>
                                        📦 No hay prepagos registrados
                                    </td>
                                </tr>
                            ) : (
                                prepagos.map((prepago) => (
                                    <tr key={prepago.id} style={{ borderBottom: '1px solid #f1f5f9', opacity: prepago.estado === 'Entregado' ? 0.55 : 1 }}>
                                        <td style={{ padding: '14px 20px', fontWeight: '700', color: '#2d3748' }}>{prepago.cliente}</td>
                                        <td style={{ padding: '14px 20px', fontWeight: '700', color: '#2d3748' }}>{prepago.productoNombre}</td>
                                        <td style={{ padding: '14px 20px', color: '#64748b' }}>{prepago.cantidad} {prepago.metric}</td>
                                        <td style={{ padding: '14px 20px', color: '#64748b', fontSize: '0.85rem' }}>{prepago.fecha}</td>
                                        <td style={{ padding: '14px 20px' }}>
                                            <span style={{
                                                padding: '4px 10px',
                                                borderRadius: '8px',
                                                fontSize: '0.75rem',
                                                fontWeight: '700',
                                                background: prepago.estado === 'Pendiente' ? '#FFF7ED' : '#F0FFF4',
                                                color: prepago.estado === 'Pendiente' ? '#C05621' : '#276749',
                                                border: `1px solid ${prepago.estado === 'Pendiente' ? '#FED7AA' : '#C6F6D5'}`
                                            }}>
                                                {prepago.estado}
                                            </span>
                                        </td>
                                        <td style={{ padding: '14px 20px' }}>
                                            {hasAccess('prepagos', 'editar') && (
                                                prepago.estado === 'Pendiente' ? (
                                                    <button
                                                        onClick={() => handleDespachar(prepago.id, prepago.cliente, prepago.productoNombre)}
                                                        style={{ background: '#F0FFF4', color: '#276749', border: '1px solid #C6F6D5', borderRadius: '8px', padding: '6px 16px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}
                                                    >
                                                        ✓ Despachar
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleEliminar(prepago.id)}
                                                        style={{ background: '#FFF5F5', color: '#C53030', border: '1px solid #FEB2B2', borderRadius: '8px', padding: '6px 12px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}
                                                    >
                                                        🗑 Eliminar
                                                    </button>
                                                )
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default PrepagosView;
