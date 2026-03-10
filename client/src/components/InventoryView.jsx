import React, { useState } from 'react';
import Swal from 'sweetalert2';
import {
    Package,
    Plus,
    Minus,
    Edit3,
    Trash2,
    Save,
    Search,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    X
} from 'lucide-react';

function InventoryView({ products, setProducts, exchangeRate, prepagos, setPrepagos, hasAccess, movimientos = [] }) {
    const [isAddProductOpen, setIsAddProductOpen] = useState(false);
    const [newProduct, setNewProduct] = useState({
        name: '',
        costoBase: '',
        pesoTotalKg: '',
        gananciaSacoPct: '',
        gananciaKiloPct: ''
    });

    const [isEditProductOpen, setIsEditProductOpen] = useState(false);
    const [productToEdit, setProductToEdit] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('az'); // 'az' | 'stock-desc' | 'stock-asc' | 'popular'

    // Calcular popularidad desde historial de ventas
    const popularityMap = React.useMemo(() => {
        const map = {};
        (movimientos || []).forEach(ticket => {
            (ticket.productos || []).forEach(item => {
                map[item.id] = (map[item.id] || 0) + (item.quantity || 1);
            });
        });
        return map;
    }, [movimientos]);

    const sortedFilteredProducts = React.useMemo(() => {
        return [...(products || [])]
            .filter(p => (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => {
                if (sortBy === 'stock-desc') return (b.stock || 0) - (a.stock || 0);
                if (sortBy === 'stock-asc')  return (a.stock || 0) - (b.stock || 0);
                if (sortBy === 'popular') return (popularityMap[b.id] || 0) - (popularityMap[a.id] || 0);
                return (a.name || '').localeCompare(b.name || '');
            });
    }, [products, searchTerm, sortBy, popularityMap]);

    const handleCalcPrice = (costo, gananciaPct) => {
        if (!costo || !gananciaPct) return 0;
        const marginDecimal = parseFloat(gananciaPct) / 100;
        if (marginDecimal >= 1) return "Error (Margen >= 100%)";
        return (parseFloat(costo) / (1 - marginDecimal)).toFixed(2);
    };

    const handleAddProductSubmit = (e) => {
        e.preventDefault();
        let costPerKg = parseFloat(newProduct.costoBase) / parseFloat(newProduct.pesoTotalKg);
        const marginDecimal = parseFloat(newProduct.gananciaKiloPct) / 100;
        let finalPricePerKg = 0;
        if (marginDecimal < 1) {
            finalPricePerKg = costPerKg / (1 - marginDecimal);
        }

        const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;

        const costPerUnit = parseFloat(newProduct.costoBase);

        const productToAdd = {
            id: newId,
            name: newProduct.name,
            price: costPerUnit, // EL PRECIO EN DB ES EL COSTO BASE
            precioKilo: 0, // Se calculará dinámicamente en el render o se puede omitir
            precioSaco: 0,
            pesoPorSaco: parseFloat(newProduct.pesoTotalKg),
            costoBase: parseFloat(newProduct.costoBase),
            gananciaSacoPct: parseFloat(newProduct.gananciaSacoPct),
            gananciaKiloPct: parseFloat(newProduct.gananciaKiloPct),
            stock: 0,
            metric: 'kg',
            icon: '📦'
        };

        setProducts([...products, productToAdd]);
        setIsAddProductOpen(false);
        setNewProduct({ name: '', costoBase: '', pesoTotalKg: '', gananciaSacoPct: '', gananciaKiloPct: '' });
        Swal.fire({
            icon: 'success',
            title: 'Producto Agregado',
            text: `El producto "${productToAdd.name}" ha sido creado con stock 0.`,
            confirmButtonColor: '#3b82f6'
        });
    };

    const handleIngresarStock = async (product) => {
        const isSacoLogic = product.pesoPorSaco && product.pesoPorSaco > 0;
        const { value: amountStr } = await Swal.fire({
            title: 'Cargar Stock',
            text: isSacoLogic
                ? `¿Cuántos sacos/bultos entraron de: ${product.name}?`
                : `Ingresar cantidad de stock para: ${product.name}`,
            input: 'number',
            inputAttributes: { min: 0, step: '0.01' },
            showCancelButton: true,
            confirmButtonText: 'Cargar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#10b981'
        });

        if (!amountStr || isNaN(amountStr) || Number(amountStr) <= 0) return;

        let amount = Number(amountStr);
        const originalAmount = amount;
        const displayUnit = isSacoLogic ? 'Sacos' : 'un';
        let displayAdded = `${amount} ${displayUnit}`;

        let reservedForPrepagos = 0;
        let newPrepagos = [...prepagos];
        const pendingForProduct = newPrepagos.filter(p => p.productoId === product.id && p.estado === 'Pendiente');

        if (pendingForProduct.length > 0) {
            for (let prepago of pendingForProduct) {
                if (amount <= 0) break;
                // Prepagos now also work in sacks/units
                let amountNeeded = prepago.cantidad;

                if (amount >= amountNeeded) {
                    amount -= amountNeeded;
                    reservedForPrepagos += amountNeeded;
                    const index = newPrepagos.findIndex(p => p.id === prepago.id);
                    newPrepagos[index].estado = 'Reservado/Listo para entregar';
                } else {
                    const index = newPrepagos.findIndex(p => p.id === prepago.id);
                    newPrepagos[index].cantidad -= amount;
                    if (newPrepagos[index].cantidad <= 0) newPrepagos[index].estado = 'Reservado/Listo para entregar';
                    reservedForPrepagos += amount;
                    amount = 0;
                }
            }
        }

        const freeStockAdded = amount;
        const newProducts = products.map(p => {
            if (p.id === product.id) {
                return { ...p, stock: p.stock + freeStockAdded };
            }
            return p;
        });

        setPrepagos(newPrepagos);
        setProducts(newProducts);

        let msg = `Se ingresaron ${originalAmount} ${displayUnit}.`;
        if (reservedForPrepagos > 0) {
            msg += `<br>⚠️ Apartados: ${reservedForPrepagos} ${displayUnit} para Prepagos.`;
        }
        msg += `<br>✅ Stock libre en inventario: ${freeStockAdded.toFixed(2)} ${displayUnit}.`;

        Swal.fire({
            icon: 'success',
            title: 'Carga Completada',
            html: msg,
            confirmButtonColor: '#10b981'
        });
    };

    const handleRestarStock = async (product) => {
        const isSacoLogic = product.pesoPorSaco && product.pesoPorSaco > 0;
        const { value: amountStr } = await Swal.fire({
            title: 'Restar del Inventario',
            text: isSacoLogic
                ? `¿Cuántos sacos/bultos desea RESTAR de: ${product.name}?`
                : `Ingresar cantidad a RESTAR para: ${product.name}`,
            input: 'number',
            inputAttributes: { min: 0, step: '0.01' },
            showCancelButton: true,
            confirmButtonText: 'Restar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#f59e0b'
        });

        if (!amountStr || isNaN(amountStr) || Number(amountStr) <= 0) return;

        let amount = Number(amountStr);

        if (amount > product.stock) {
            const result = await Swal.fire({
                title: 'Stock Excedido',
                text: `La cantidad a restar (${amount.toFixed(2)}) es mayor al stock actual (${product.stock.toFixed(2)}). ¿Desea dejar el stock en 0?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, poner a 0',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#ef4444'
            });
            if (!result.isConfirmed) return;
            amount = product.stock;
        }

        const newProducts = products.map(p => {
            if (p.id === product.id) {
                return { ...p, stock: Math.max(0, p.stock - amount) };
            }
            return p;
        });

        setProducts(newProducts);
        Swal.fire({
            icon: 'success',
            title: 'Stock Reducido',
            text: `Se restaron ${amount.toFixed(2)} unidades a "${product.name}".`,
            timer: 2000,
            showConfirmButton: false
        });
    };

    const handleDeleteProduct = async (product) => {
        const result = await Swal.fire({
            title: '¿Eliminar Producto?',
            text: `Está a punto de borrar "${product.name}" permanentemente.`,
            icon: 'error',
            showCancelButton: true,
            confirmButtonText: 'Sí, Eliminar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#ef4444'
        });

        if (result.isConfirmed) {
            const newProducts = products.filter(p => p.id !== product.id);
            setProducts(newProducts);
            Swal.fire('Eliminado', 'El producto ha sido quitado del catálogo.', 'success');
        }
    };

    const handleEditProductClick = (product) => {
        setProductToEdit({
            ...product,
            costoBase: product.costoBase || 0,
            pesoTotalKg: product.pesoPorSaco || product.pesoTotalKg || 0,
            gananciaSacoPct: product.gananciaSacoPct || 0,
            gananciaKiloPct: product.gananciaKiloPct || 0
        });
        setIsEditProductOpen(true);
    };

    const handleEditProductSubmit = (e) => {
        e.preventDefault();
        let costPerKg = parseFloat(productToEdit.costoBase) / parseFloat(productToEdit.pesoTotalKg);
        const marginDecimal = parseFloat(productToEdit.gananciaKiloPct) / 100;
        let finalPricePerKg = 0;
        if (marginDecimal < 1) {
            finalPricePerKg = costPerKg / (1 - marginDecimal);
        }

        const costPerUnit = parseFloat(productToEdit.costoBase);

        const updatedProducts = products.map(p => {
            if (p.id === productToEdit.id) {
                return {
                    ...p,
                    name: productToEdit.name,
                    price: costPerUnit, // EL PRECIO EN DB ES EL COSTO BASE
                    pesoPorSaco: parseFloat(productToEdit.pesoTotalKg),
                    costoBase: parseFloat(productToEdit.costoBase),
                    gananciaSacoPct: parseFloat(productToEdit.gananciaSacoPct),
                    gananciaKiloPct: parseFloat(productToEdit.gananciaKiloPct),
                };
            }
            return p;
        });

        setProducts(updatedProducts);
        setIsEditProductOpen(false);
        setProductToEdit(null);
        Swal.fire({
            icon: 'success',
            title: 'Producto Actualizado',
            text: `Cambios guardados en "${productToEdit.name}".`,
            confirmButtonColor: '#3b82f6'
        });
    };

    return (
        <div className="full-tab-container inventory-inner animate-fadeIn">
            {/* Header: Title + Search/Sort + Add Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
                        <Package size={28} className="text-[#52B788]" />
                        Gestión de Inventario
                    </h2>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Control de existencias y precios</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end', flex: 1 }}>
                    {/* Search */}
                    <div style={{ position: 'relative', minWidth: '180px', maxWidth: '260px', flex: 1 }}>
                        <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#95A5A6' }} />
                        <input
                            type="text"
                            placeholder="Buscar producto..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 12px 10px 32px',
                                background: 'white',
                                border: '1px solid #E9ECEF',
                                borderRadius: '10px',
                                fontSize: '12px',
                                fontWeight: '700',
                                color: '#2C3E50',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    {/* Sort Pills */}
                    <div style={{ display: 'flex', background: '#F1F5F9', padding: '3px', borderRadius: '10px', gap: '2px', flexShrink: 0 }}>
                        {[['az', 'A-Z'], ['stock-desc', '📦 Mayor'], ['stock-asc', '⚠️ Menor'], ['popular', '🔥 Top']].map(([val, label]) => (
                            <button
                                key={val}
                                onClick={() => setSortBy(val)}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    fontSize: '10px',
                                    fontWeight: '900',
                                    cursor: 'pointer',
                                    background: sortBy === val ? 'white' : 'transparent',
                                    color: sortBy === val ? '#2C3E50' : '#95A5A6',
                                    boxShadow: sortBy === val ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                                    transition: 'all 0.15s',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {hasAccess('inventario', 'crear') && (
                        <button
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#52B788', color: 'white', padding: '10px 20px', borderRadius: '12px', fontWeight: '900', fontSize: '0.8rem', letterSpacing: '0.05em', textTransform: 'uppercase', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(82,183,136,0.3)', flexShrink: 0 }}
                            onClick={() => setIsAddProductOpen(true)}
                        >
                            <Plus size={16} strokeWidth={3} />
                            Añadir
                        </button>
                    )}
                </div>
            </div>


            {/* DESKTOP TABLE */}
            <div className="inventory-table-wrapper">
                <div className="glass-effect rounded-[2rem] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-black/5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                    <th className="p-6">SKU</th>
                                    <th className="p-6">Producto</th>
                                    <th className="p-6">Existencia</th>
                                    <th className="p-6">Costos</th>
                                    <th className="p-6">P. Saco</th>
                                    <th className="p-6">P. Kilo</th>
                                    <th className="p-6 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5">
                                {sortedFilteredProducts.map(p => (
                                    <tr key={p.id} className="hover:bg-black/[0.02] transition-colors group">
                                        <td className="p-6">
                                            <span className="font-mono text-slate-300 font-bold">#{p.id.toString().padStart(4, '0')}</span>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex flex-col">
                                                <span className="font-black text-slate-700 uppercase tracking-tighter">{p.name}</span>
                                                {p.metric === 'kg' && (
                                                    <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest mt-0.5">Venta al Granel</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-sm font-black ${p.stock <= 5 ? 'text-red-500' : 'text-slate-600'}`}>
                                                    {p.stock.toFixed(2)}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">
                                                    {(p.pesoPorSaco && p.pesoPorSaco > 0) ? 'Sacos' : 'un'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex flex-col">
                                                <span className="font-black text-slate-700 text-sm">${p.price.toFixed(2)}</span>
                                                <span className="text-[10px] font-bold text-slate-400 tracking-tighter uppercase whitespace-nowrap">
                                                    Eq. ${(p.price / (p.pesoPorSaco || 1)).toFixed(2)} / kg
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <span className="text-[#1B4332] font-black text-sm">${handleCalcPrice(p.price, p.gananciaSacoPct)}</span>
                                        </td>
                                        <td className="p-6">
                                            <span className="text-[#52B788] font-black text-sm">${handleCalcPrice(p.price / (p.pesoPorSaco || 1), p.gananciaKiloPct)}</span>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex gap-2 justify-center flex-wrap">
                                                {hasAccess('inventario', 'editar') && (
                                                    <>
                                                        <button className="btn-accion-cargar" onClick={() => handleIngresarStock(p)} title="Ingresar Stock">
                                                            <Plus size={14} strokeWidth={3} /> CARGAR
                                                        </button>
                                                        <button className="btn-accion-restar" onClick={() => handleRestarStock(p)} title="Restar Stock">
                                                            <Minus size={14} strokeWidth={3} /> RESTAR
                                                        </button>
                                                        <button className="btn-accion-editar" onClick={() => handleEditProductClick(p)} title="Editar">
                                                            <Edit3 size={14} />
                                                        </button>
                                                    </>
                                                )}
                                                {hasAccess('inventario', 'eliminar') && (
                                                    <button className="btn-accion-eliminar" onClick={() => handleDeleteProduct(p)} title="Eliminar">
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* MOBILE PRODUCT CARDS */}
            <div className="inventory-cards-mobile">
                {sortedFilteredProducts.map(p => (
                    <div key={p.id} className="inv-product-card">
                        <div className="inv-product-card-header">
                            <span className="inv-product-card-name">{p.name}</span>
                            <span className={`inv-product-card-stock ${p.stock <= 5 ? 'low' : ''}`}>
                                {p.stock.toFixed(2)} {(p.pesoPorSaco && p.pesoPorSaco > 0) ? 'Sacos' : 'un'}
                            </span>
                        </div>
                        <div className="inv-product-card-prices">
                            <div className="inv-price-cell">
                                <span className="inv-price-cell-label">Costo</span>
                                <span className="inv-price-cell-value">${p.price.toFixed(2)}</span>
                            </div>
                            <div className="inv-price-cell">
                                <span className="inv-price-cell-label">P. Saco</span>
                                <span className="inv-price-cell-value" style={{ color: '#1B4332' }}>${handleCalcPrice(p.price, p.gananciaSacoPct)}</span>
                            </div>
                            <div className="inv-price-cell">
                                <span className="inv-price-cell-label">P. Kilo</span>
                                <span className="inv-price-cell-value" style={{ color: '#52B788' }}>${handleCalcPrice(p.price / (p.pesoPorSaco || 1), p.gananciaKiloPct)}</span>
                            </div>
                        </div>
                        <div className="inv-product-card-actions">
                            {hasAccess('inventario', 'editar') && (
                                <>
                                    <button className="btn-accion-cargar" onClick={() => handleIngresarStock(p)}><Plus size={13} strokeWidth={3} /> CARGAR</button>
                                    <button className="btn-accion-restar" onClick={() => handleRestarStock(p)}><Minus size={13} strokeWidth={3} /> RESTAR</button>
                                    <button className="btn-accion-editar" onClick={() => handleEditProductClick(p)}><Edit3 size={13} /></button>
                                </>
                            )}
                            {hasAccess('inventario', 'eliminar') && (
                                <button className="btn-accion-eliminar" onClick={() => handleDeleteProduct(p)}><Trash2 size={13} /></button>
                            )}
                        </div>
                    </div>
                ))}
            </div>


            {/* Modal Añadir Producto */}
            {isAddProductOpen && (
                <div className="modal-overlay activo flex items-center justify-center p-4 z-[2000]">
                    <div className="glass-effect rounded-[2.5rem] w-full max-w-lg p-8 md:p-10 shadow-2xl relative animate-scaleIn">
                        <button onClick={() => setIsAddProductOpen(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 transition-colors">
                            <X size={24} />
                        </button>

                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-[#52B788]/20 rounded-2xl flex items-center justify-center text-[#2ECC71]">
                                <Plus size={28} />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Nuevo Producto</h3>
                        </div>

                        <form onSubmit={handleAddProductSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nombre Comercial</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-black/5 border-none p-4 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-[#52B788] outline-none"
                                    value={newProduct.name}
                                    onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                                    placeholder="Ej. Saco de Maíz Blanco"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Costo ($)</label>
                                    <input
                                        type="number" step="0.01" required
                                        className="w-full bg-black/5 border-none p-4 rounded-xl font-bold text-slate-700 outline-none"
                                        value={newProduct.costoBase}
                                        onChange={e => setNewProduct({ ...newProduct, costoBase: e.target.value })}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Peso (Kg)</label>
                                    <input
                                        type="number" step="0.01" required
                                        className="w-full bg-black/5 border-none p-4 rounded-xl font-bold text-slate-700 outline-none"
                                        value={newProduct.pesoTotalKg}
                                        onChange={e => setNewProduct({ ...newProduct, pesoTotalKg: e.target.value })}
                                        placeholder="40"
                                    />
                                </div>
                            </div>

                            <div className="bg-white/50 backdrop-blur-sm p-6 rounded-3xl border border-black/5 space-y-6">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center border-b border-black/5 pb-4">Estrategia de Precios</h4>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">% Ganancia Saco</label>
                                        <input
                                            type="number" step="0.1" required
                                            className="w-full bg-white border-2 border-slate-100 p-3 rounded-xl font-black text-[#1B4332] outline-none text-center"
                                            value={newProduct.gananciaSacoPct}
                                            onChange={e => setNewProduct({ ...newProduct, gananciaSacoPct: e.target.value })}
                                        />
                                        {newProduct.costoBase && newProduct.gananciaSacoPct && (
                                            <p className="text-[10px] font-black text-emerald-600 text-center uppercase tracking-tighter">
                                                PvP: ${handleCalcPrice(newProduct.costoBase, newProduct.gananciaSacoPct)}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">% Ganancia Kilo</label>
                                        <input
                                            type="number" step="0.1" required
                                            className="w-full bg-white border-2 border-slate-100 p-3 rounded-xl font-black text-blue-600 outline-none text-center"
                                            value={newProduct.gananciaKiloPct}
                                            onChange={e => setNewProduct({ ...newProduct, gananciaKiloPct: e.target.value })}
                                        />
                                        {newProduct.costoBase && newProduct.pesoTotalKg && newProduct.gananciaKiloPct && (
                                            <p className="text-[10px] font-black text-blue-500 text-center uppercase tracking-tighter">
                                                PvP Kilo: ${handleCalcPrice(parseFloat(newProduct.costoBase) / parseFloat(newProduct.pesoTotalKg), newProduct.gananciaKiloPct)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="submit"
                                    className="flex-1 bg-[#1B4332] text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-[#1B4332]/20 hover:bg-[#2D6A4F] transition-all flex items-center justify-center gap-3"
                                >
                                    <Save size={18} />
                                    Guardar Producto
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Editar Producto */}
            {isEditProductOpen && productToEdit && (
                <div className="modal-overlay activo flex items-center justify-center p-4 z-[2000]">
                    <div className="glass-effect rounded-[2.5rem] w-full max-w-lg p-8 md:p-10 shadow-2xl relative animate-scaleIn">
                        <button onClick={() => setIsEditProductOpen(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 transition-colors">
                            <X size={24} />
                        </button>

                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-600">
                                <Edit3 size={28} />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Editar Producto</h3>
                        </div>

                        <form onSubmit={handleEditProductSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nombre Comercial</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-black/5 border-none p-4 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                                    value={productToEdit.name}
                                    onChange={e => setProductToEdit({ ...productToEdit, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Costo ($)</label>
                                    <input
                                        type="number" step="0.01" required
                                        className="w-full bg-black/5 border-none p-4 rounded-xl font-bold text-slate-700 outline-none"
                                        value={productToEdit.costoBase}
                                        onChange={e => setProductToEdit({ ...productToEdit, costoBase: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Peso (Kg)</label>
                                    <input
                                        type="number" step="0.01" required
                                        className="w-full bg-black/5 border-none p-4 rounded-xl font-bold text-slate-700 outline-none"
                                        value={productToEdit.pesoTotalKg}
                                        onChange={e => setProductToEdit({ ...productToEdit, pesoTotalKg: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="bg-white/50 backdrop-blur-sm p-6 rounded-3xl border border-black/5 space-y-6">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center border-b border-black/5 pb-4">Estrategia de Precios</h4>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">% Ganancia Saco</label>
                                        <input
                                            type="number" step="0.1" required
                                            className="w-full bg-white border-2 border-slate-100 p-3 rounded-xl font-black text-[#1B4332] outline-none text-center"
                                            value={productToEdit.gananciaSacoPct}
                                            onChange={e => setProductToEdit({ ...productToEdit, gananciaSacoPct: e.target.value })}
                                        />
                                        {productToEdit.costoBase && productToEdit.gananciaSacoPct && (
                                            <p className="text-[10px] font-black text-emerald-600 text-center uppercase tracking-tighter">
                                                PvP: ${handleCalcPrice(productToEdit.costoBase, productToEdit.gananciaSacoPct)}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">% Ganancia Kilo</label>
                                        <input
                                            type="number" step="0.1" required
                                            className="w-full bg-white border-2 border-slate-100 p-3 rounded-xl font-black text-blue-600 outline-none text-center"
                                            value={productToEdit.gananciaKiloPct}
                                            onChange={e => setProductToEdit({ ...productToEdit, gananciaKiloPct: e.target.value })}
                                        />
                                        {productToEdit.costoBase && productToEdit.pesoTotalKg && productToEdit.gananciaKiloPct && (
                                            <p className="text-[10px] font-black text-blue-500 text-center uppercase tracking-tighter">
                                                PvP Kilo: ${handleCalcPrice(parseFloat(productToEdit.costoBase) / parseFloat(productToEdit.pesoTotalKg), productToEdit.gananciaKiloPct)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="submit"
                                    className="flex-1 bg-blue-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-3"
                                >
                                    <Save size={18} />
                                    Guardar Cambios
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default InventoryView;
