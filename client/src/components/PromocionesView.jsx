import React, { useState } from 'react';
import Swal from 'sweetalert2';

function PromocionesView({ descuentos, setDescuentos, products, userRole, hasAccess }) {
    const [newPagoMetodo, setNewPagoMetodo] = useState('Efectivo $');
    const [newPagoPct, setNewPagoPct] = useState('');
    const [newVolProductoId, setNewVolProductoId] = useState('');
    const [newVolMinimo, setNewVolMinimo] = useState('');
    const [newVolPrecioEspecial, setNewVolPrecioEspecial] = useState('');

    const metodosPagoDisponibles = ['Efectivo $', 'Efectivo Bs', 'Pago Móvil', 'Transferencia', 'Punto', 'Biopago'];

    const handleAddMetodoPago = (e) => {
        e.preventDefault();
        const pct = parseFloat(newPagoPct);
        if (isNaN(pct) || pct <= 0 || pct > 100) return;
        const updated = { ...descuentos };
        const existingIndex = updated.porMetodoPago.findIndex(m => m.metodo === newPagoMetodo);
        if (existingIndex !== -1) {
            updated.porMetodoPago[existingIndex].porcentaje = pct;
        } else {
            updated.porMetodoPago.push({ metodo: newPagoMetodo, porcentaje: pct });
        }
        setDescuentos(updated);
        setNewPagoPct('');
        Swal.fire({ icon: 'success', title: 'Descuento Asignado', text: `Se configuró ${pct}% de descuento para ${newPagoMetodo}.`, timer: 2000, showConfirmButton: false });
    };

    const handleDeleteMetodoPago = (metodo) => {
        setDescuentos({ ...descuentos, porMetodoPago: descuentos.porMetodoPago.filter(m => m.metodo !== metodo) });
    };

    const handleAddVolumen = (e) => {
        e.preventDefault();
        const prodId = parseInt(newVolProductoId);
        const minQty = parseInt(newVolMinimo);
        const specialPrice = parseFloat(newVolPrecioEspecial);
        if (!prodId || isNaN(minQty) || minQty <= 1 || isNaN(specialPrice) || specialPrice <= 0) {
            Swal.fire('Error', 'Verifique los datos. La cantidad mínima debe ser > 1.', 'error');
            return;
        }
        const updated = { ...descuentos };
        const existingIndex = updated.porVolumen.findIndex(v => v.idProducto === prodId);
        if (existingIndex !== -1) {
            updated.porVolumen[existingIndex] = { idProducto: prodId, cantidadMinima: minQty, precioEspecial: specialPrice };
        } else {
            updated.porVolumen.push({ idProducto: prodId, cantidadMinima: minQty, precioEspecial: specialPrice });
        }
        setDescuentos(updated);
        setNewVolProductoId('');
        setNewVolMinimo('');
        setNewVolPrecioEspecial('');
        const product = products.find(p => p.id === prodId);
        Swal.fire({ icon: 'success', title: 'Promoción Guardada', text: `Precio especial para ${product?.name} al llevar ${minQty} sacos.`, timer: 2000, showConfirmButton: false });
    };

    const handleDeleteVolumen = (idProducto) => {
        setDescuentos({ ...descuentos, porVolumen: descuentos.porVolumen.filter(v => v.idProducto !== idProducto) });
    };

    const sectionCard = { background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' };
    const th = { padding: '12px 16px', fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', background: '#f8fafc', borderBottom: '2px solid #e2e8f0' };
    const td = { padding: '12px 16px', borderBottom: '1px solid #f1f5f9' };

    return (
        <div style={{ padding: '2rem', background: '#f4f4f4', minHeight: '100%' }}>
            {/* Header */}
            <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#2d3748', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    🏷️ Gestión de Promociones
                </h2>
                <p style={{ fontSize: '0.8rem', color: '#718096', margin: '4px 0 0' }}>Configuración de descuentos estratégicos y precios al mayor.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem' }}>

                {/* ── DESCUENTOS POR MÉTODO DE PAGO ── */}
                <div style={sectionCard}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#fcfcfb' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '900', color: '#2d3748', margin: 0 }}>💳 Descuentos por Método de Pago</h3>
                        <p style={{ fontSize: '0.75rem', color: '#718096', margin: '2px 0 0' }}>Incentivos por tipo de transacción (solo Sacos)</p>
                    </div>

                    {hasAccess('promociones', 'crear') && (
                        <form onSubmit={handleAddMetodoPago} style={{ display: 'flex', gap: '8px', padding: '14px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', flexWrap: 'wrap' }}>
                            <select
                                value={newPagoMetodo}
                                onChange={(e) => setNewPagoMetodo(e.target.value)}
                                style={{ flex: 1, minWidth: '140px', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600' }}
                            >
                                {metodosPagoDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <input
                                type="number" step="0.01" min="0.01" max="100" placeholder="%" required
                                value={newPagoPct} onChange={(e) => setNewPagoPct(e.target.value)}
                                style={{ width: '70px', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '700', textAlign: 'center', color: '#16a34a' }}
                            />
                            <button type="submit" style={{ padding: '8px 18px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer' }}>
                                + Agregar
                            </button>
                        </form>
                    )}

                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={th}>Método</th>
                                <th style={{ ...th, textAlign: 'center' }}>Descuento</th>
                                {hasAccess('promociones', 'eliminar') && <th style={{ ...th, width: '50px' }}></th>}
                            </tr>
                        </thead>
                        <tbody>
                            {descuentos.porMetodoPago.map((d, i) => (
                                <tr key={i}>
                                    <td style={td}><span style={{ fontWeight: '700', color: '#2d3748' }}>{d.metodo}</span></td>
                                    <td style={{ ...td, textAlign: 'center' }}>
                                        <span style={{ background: '#F0FFF4', color: '#276749', padding: '3px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '700', border: '1px solid #C6F6D5' }}>-{d.porcentaje}%</span>
                                    </td>
                                    {hasAccess('promociones', 'eliminar') && (
                                        <td style={td}>
                                            <button onClick={() => handleDeleteMetodoPago(d.metodo)} style={{ background: 'none', border: 'none', color: '#CBD5E0', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }} title="Eliminar">🗑</button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                            {descuentos.porMetodoPago.length === 0 && (
                                <tr><td colSpan="3" style={{ ...td, textAlign: 'center', color: '#a0aec0', fontSize: '0.82rem' }}>Sin reglas activas</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* ── PRECIOS POR VOLUMEN ── */}
                <div style={sectionCard}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#fcfcfb' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '900', color: '#2d3748', margin: 0 }}>📦 Ventas al Mayor (Precios por Volumen)</h3>
                        <p style={{ fontSize: '0.75rem', color: '#718096', margin: '2px 0 0' }}>Precio especial al superar cantidad mínima</p>
                    </div>

                    {hasAccess('promociones', 'crear') && (
                        <form onSubmit={handleAddVolumen} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '14px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                            <select
                                value={newVolProductoId} onChange={(e) => setNewVolProductoId(e.target.value)} required
                                style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600' }}
                            >
                                <option value="">Seleccione un producto...</option>
                                {products.map(p => <option key={p.id} value={p.id}>{p.name} - ${p.price.toFixed(2)}</option>)}
                            </select>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="number" min="2" placeholder="Mín. Sacos" required
                                    value={newVolMinimo} onChange={(e) => setNewVolMinimo(e.target.value)}
                                    style={{ flex: 1, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '700' }}
                                />
                                <input
                                    type="number" step="0.01" min="0.01" placeholder="Precio $" required
                                    value={newVolPrecioEspecial} onChange={(e) => setNewVolPrecioEspecial(e.target.value)}
                                    style={{ flex: 1, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '700', color: '#2563eb' }}
                                />
                                <button type="submit" style={{ padding: '8px 18px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer' }}>
                                    + Agregar
                                </button>
                            </div>
                        </form>
                    )}

                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={th}>Producto</th>
                                <th style={{ ...th, textAlign: 'center' }}>Configuración</th>
                                {hasAccess('promociones', 'eliminar') && <th style={{ ...th, width: '50px' }}></th>}
                            </tr>
                        </thead>
                        <tbody>
                            {descuentos.porVolumen.map((v, i) => {
                                const prod = products.find(p => p.id === v.idProducto);
                                return (
                                    <tr key={i}>
                                        <td style={td}>
                                            <div style={{ fontWeight: '700', color: '#2d3748', fontSize: '0.9rem' }}>{prod ? prod.name : 'Desconocido'}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#718096' }}>Regular: ${prod?.price.toFixed(2)}</div>
                                        </td>
                                        <td style={{ ...td, textAlign: 'center' }}>
                                            <div style={{ fontWeight: '900', color: '#2563eb', fontSize: '0.95rem' }}>${v.precioEspecial.toFixed(2)}</div>
                                            <div style={{ fontSize: '0.72rem', color: '#718096', fontWeight: '600' }}>≥ {v.cantidadMinima} Sacos</div>
                                        </td>
                                        {hasAccess('promociones', 'eliminar') && (
                                            <td style={td}>
                                                <button onClick={() => handleDeleteVolumen(v.idProducto)} style={{ background: 'none', border: 'none', color: '#CBD5E0', cursor: 'pointer', fontSize: '1rem' }} title="Eliminar">🗑</button>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                            {descuentos.porVolumen.length === 0 && (
                                <tr><td colSpan="3" style={{ ...td, textAlign: 'center', color: '#a0aec0', fontSize: '0.82rem' }}>Sin promociones activas</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default PromocionesView;
