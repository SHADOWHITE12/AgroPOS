import React from 'react';

function PrepagosView({ prepagos, setPrepagos, userRole, hasAccess }) {
    const handleDespachar = (id, cliente, producto) => {
        if (window.confirm(`¿Confirmas que se ha entregado el producto ${producto} al cliente ${cliente}?`)) {
            setPrepagos(prepagos.map(p =>
                p.id === id ? { ...p, estado: 'Entregado' } : p
            ));
        }
    };

    const handleEliminar = (id) => {
        if (window.confirm(`¿Deseas eliminar este registro de prepago del historial?`)) {
            setPrepagos(prepagos.filter(p => p.id !== id));
        }
    };

    return (
        <div className="prepagos-container p-4 md:p-8 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Prepagos</h2>
                    <p className="text-slate-500 text-sm">Mercancía pagada pendiente de entrega.</p>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 min-w-[200px]">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Órdenes Pendientes</div>
                    <div className="text-3xl font-black text-amber-500">
                        {prepagos.filter(p => p.estado === 'Pendiente').length}
                    </div>
                </div>
            </div>

            <div className="table-responsive-wrapper">
                <table className="w-full text-left border-separate border-spacing-0">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="p-4 font-black text-slate-400 uppercase text-[10px] tracking-widest border-b border-slate-100">Cliente</th>
                            <th className="p-4 font-black text-slate-400 uppercase text-[10px] tracking-widest border-b border-slate-100">Producto</th>
                            <th className="p-4 font-black text-slate-400 uppercase text-[10px] tracking-widest border-b border-slate-100">Cantidad</th>
                            <th className="p-4 font-black text-slate-400 uppercase text-[10px] tracking-widest border-b border-slate-100">Fecha</th>
                            <th className="p-4 font-black text-slate-400 uppercase text-[10px] tracking-widest border-b border-slate-100">Estado</th>
                            {hasAccess('prepagos', 'editar') && <th className="p-4 font-black text-slate-400 uppercase text-[10px] tracking-widest border-b border-slate-100 text-right">Acción</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {prepagos.length === 0 ? (
                            <tr>
                                <td colSpan={hasAccess('prepagos', 'editar') ? "6" : "5"} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    No hay prepagos registrados actualmente.
                                </td>
                            </tr>
                        ) : (
                            prepagos.map((prepago) => (
                                <tr key={prepago.id} className={`hover:bg-slate-50 transition-colors ${prepago.estado === 'Entregado' ? 'opacity-50' : ''}`}>
                                    <td className="p-4 font-bold text-slate-700">{prepago.cliente}</td>
                                    <td className="p-4 text-slate-600 font-medium">{prepago.productoNombre}</td>
                                    <td className="p-4 font-black text-slate-800">{prepago.cantidad} {prepago.metric}</td>
                                    <td className="p-4 text-xs text-slate-500">{prepago.fecha}</td>
                                    <td className="p-4 text-xs font-bold">
                                        <span className={`px-2 py-1 rounded-full uppercase tracking-widest text-[9px] ${prepago.estado === 'Pendiente' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                            {prepago.estado}
                                        </span>
                                    </td>
                                    {hasAccess('prepagos', 'editar') && (
                                        <td className="p-4 text-right">
                                            {prepago.estado === 'Pendiente' ? (
                                                <button
                                                    className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-black text-[10px] hover:bg-emerald-600 transition-all border shadow-sm"
                                                    onClick={() => handleDespachar(prepago.id, prepago.cliente, prepago.productoNombre)}
                                                >
                                                    ENTREGAR
                                                </button>
                                            ) : (
                                                <button
                                                    className="bg-slate-200 text-slate-500 px-3 py-1.5 rounded-lg font-black text-[10px] hover:bg-red-500 hover:text-white transition-all border shadow-sm"
                                                    onClick={() => handleEliminar(prepago.id)}
                                                >
                                                    LIMPIAR
                                                </button>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default PrepagosView;
