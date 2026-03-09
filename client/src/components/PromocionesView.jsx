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
        Swal.fire({
            icon: 'success',
            title: 'Descuento Asignado',
            text: `Se configuró ${pct}% de descuento para ${newPagoMetodo}.`,
            timer: 2000,
            showConfirmButton: false
        });
    };

    const handleDeleteMetodoPago = (metodo) => {
        const updated = {
            ...descuentos,
            porMetodoPago: descuentos.porMetodoPago.filter(m => m.metodo !== metodo)
        };
        setDescuentos(updated);
    };

    const handleAddVolumen = (e) => {
        e.preventDefault();
        const prodId = parseInt(newVolProductoId);
        const minQty = parseInt(newVolMinimo);
        const specialPrice = parseFloat(newVolPrecioEspecial);

        if (!prodId || isNaN(minQty) || minQty <= 1 || isNaN(specialPrice) || specialPrice <= 0) {
            Swal.fire('Error', 'Verifique los datos de la promoción por volumen. La cantidad mínima debe ser > 1.', 'error');
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
        Swal.fire({
            icon: 'success',
            title: 'Promoción Guardada',
            text: `Precio especial fijado para ${product?.name} al llevar ${minQty} sacos o más.`,
            timer: 2000,
            showConfirmButton: false
        });
    };

    const handleDeleteVolumen = (idProducto) => {
        const updated = {
            ...descuentos,
            porVolumen: descuentos.porVolumen.filter(v => v.idProducto !== idProducto)
        };
        setDescuentos(updated);
    };

    return (
        <div className="promociones-container p-4 md:p-8 max-w-7xl mx-auto space-y-8">
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Promociones</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* ---------- DESCUENTOS POR METODO DE PAGO ---------- */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                    <h3 className="text-lg font-black text-emerald-600 uppercase tracking-widest mb-2">Métodos de Pago</h3>
                    <p className="text-slate-500 text-xs mb-6">Descuentos automáticos al pagar por Saco.</p>

                    {hasAccess('promociones', 'crear') && (
                        <form onSubmit={handleAddMetodoPago} className="flex gap-2 mb-6">
                            <select
                                className="flex-1 p-2.5 rounded-xl border border-slate-200 text-sm font-bold bg-slate-50"
                                value={newPagoMetodo}
                                onChange={(e) => setNewPagoMetodo(e.target.value)}
                            >
                                {metodosPagoDisponibles.map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                max="100"
                                placeholder="%"
                                required
                                className="w-20 p-2.5 rounded-xl border border-slate-200 text-center font-black"
                                value={newPagoPct}
                                onChange={(e) => setNewPagoPct(e.target.value)}
                            />
                            <button type="submit" className="bg-emerald-500 text-white px-4 rounded-xl font-black hover:bg-emerald-600 transition-colors">
                                +
                            </button>
                        </form>
                    )}

                    <div className="table-responsive-wrapper border border-slate-100 rounded-xl">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <th className="p-3">Método</th>
                                    <th className="p-3 text-center">Desc (%)</th>
                                    {hasAccess('promociones', 'eliminar') && <th className="p-3 text-right">Acción</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {descuentos.porMetodoPago.map((d, i) => (
                                    <tr key={i} className="border-t border-slate-50">
                                        <td className="p-3 font-bold text-slate-700 text-sm">{d.metodo}</td>
                                        <td className="p-3 text-center font-black text-emerald-600">{d.porcentaje}%</td>
                                        {hasAccess('promociones', 'eliminar') && (
                                            <td className="p-3 text-right">
                                                <button
                                                    onClick={() => handleDeleteMetodoPago(d.metodo)}
                                                    className="bg-red-50 text-red-500 px-2 py-1 rounded-md text-[10px] font-black hover:bg-red-500 hover:text-white transition-colors"
                                                >
                                                    QUITAR
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                                {descuentos.porMetodoPago.length === 0 && (
                                    <tr>
                                        <td colSpan={hasAccess('promociones', 'eliminar') ? "3" : "2"} style={{ padding: '1rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.9rem' }}>No hay descuentos configurados.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ---------- PRECIOS ESPECIALES POR VOLUMEN ---------- */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                    <h3 className="text-lg font-black text-blue-600 uppercase tracking-widest mb-2">Precios al Mayor</h3>
                    <p className="text-slate-500 text-xs mb-6">Precio especial por cantidad de sacos.</p>

                    {hasAccess('promociones', 'crear') && (
                        <form onSubmit={handleAddVolumen} className="flex flex-col gap-3 mb-6">
                            <select
                                className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-bold bg-slate-50"
                                value={newVolProductoId}
                                onChange={(e) => setNewVolProductoId(e.target.value)}
                                required
                            >
                                <option value="">-- Seleccionar Producto --</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} (${p.price.toFixed(2)})</option>
                                ))}
                            </select>

                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    min="2"
                                    placeholder="Mínimo"
                                    required
                                    className="flex-1 p-2.5 rounded-xl border border-slate-200 text-sm font-black"
                                    value={newVolMinimo}
                                    onChange={(e) => setNewVolMinimo(e.target.value)}
                                />
                                <div className="relative flex-[1.5]">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        placeholder="Precio"
                                        required
                                        className="w-full pl-7 p-2.5 rounded-xl border border-slate-200 text-sm font-black"
                                        value={newVolPrecioEspecial}
                                        onChange={(e) => setNewVolPrecioEspecial(e.target.value)}
                                    />
                                </div>
                                <button type="submit" className="bg-blue-600 text-white px-4 rounded-xl font-black hover:bg-blue-700 transition-colors">
                                    +
                                </button>
                            </div>
                        </form>
                    )}

                    <div className="table-responsive-wrapper border border-slate-100 rounded-xl">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <th className="p-3">Producto</th>
                                    <th className="p-3 text-center">Condición</th>
                                    {hasAccess('promociones', 'eliminar') && <th className="p-3 text-right">Acción</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {descuentos.porVolumen.map((v, i) => {
                                    const prod = products.find(p => p.id === v.idProducto);
                                    return (
                                        <tr key={i} className="border-t border-slate-50">
                                            <td className="p-3 text-sm font-bold text-slate-700">{prod ? prod.name : 'Desc.'}</td>
                                            <td className="p-3 text-center font-medium">
                                                <span className="block text-slate-400 text-[10px]">&ge; {v.cantidadMinima} sacos</span>
                                                <span className="font-black text-blue-600 text-sm">${v.precioEspecial.toFixed(2)}</span>
                                            </td>
                                            {hasAccess('promociones', 'eliminar') && (
                                                <td className="p-3 text-right">
                                                    <button
                                                        onClick={() => handleDeleteVolumen(v.idProducto)}
                                                        className="bg-red-50 text-red-500 px-2 py-1 rounded-md text-[10px] font-black hover:bg-red-500 hover:text-white transition-colors"
                                                    >
                                                        QUITAR
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                                {descuentos.porVolumen.length === 0 && (
                                    <tr>
                                        <td colSpan={hasAccess('promociones', 'eliminar') ? "3" : "2"} style={{ padding: '1rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.9rem' }}>No hay precios al mayor configurados.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PromocionesView;
