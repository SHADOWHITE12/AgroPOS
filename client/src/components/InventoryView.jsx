import React, { useState } from 'react';
import Swal from 'sweetalert2';

function InventoryView({ products, setProducts, exchangeRate, prepagos, setPrepagos, hasAccess }) {
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
        <div className="workspace" style={{ padding: '1rem md:2rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', backgroundColor: 'var(--color-bg-main)', flex: 1, width: '100%' }}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>📦 Gestión de Inventario</h2>
                {hasAccess('inventario', 'crear') && (
                    <button
                        className="btn-mobile-full"
                        style={{ padding: '10px 20px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}
                        onClick={() => setIsAddProductOpen(true)}
                    >
                        ➕ Añadir Producto
                    </button>
                )}
            </div>

            <div className="table-responsive-wrapper">
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                            <th style={{ padding: '1rem' }}>SKU</th>
                            <th style={{ padding: '1rem' }}>Producto</th>
                            <th style={{ padding: '1rem' }}>Stock</th>
                            <th style={{ padding: '1rem' }}>Costo Base</th>
                            <th style={{ padding: '1rem' }}>Saco ($)</th>
                            <th style={{ padding: '1rem' }}>Kg ($)</th>
                            <th style={{ padding: '1rem', textAlign: 'center' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map(p => (
                            <tr key={p.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                <td style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>{p.id.toString().padStart(4, '0')}</td>
                                <td style={{ padding: '1rem', fontWeight: '500' }}>{p.name} {p.metric === 'kg' && <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold">GRANEL</span>}</td>
                                <td style={{ padding: '1rem', color: p.stock <= 0 ? 'var(--danger)' : 'inherit', fontWeight: 'bold' }}>
                                    {p.stock.toFixed(2)} {(p.pesoPorSaco && p.pesoPorSaco > 0) ? 'Sacos' : 'un'}
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontWeight: 'bold' }}>${p.price.toFixed(2)}</span>
                                        <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>${(p.price / (p.pesoPorSaco || 1)).toFixed(2)} / kg</span>
                                    </div>
                                </td>
                                <td style={{ padding: '1rem', color: '#16a34a', fontWeight: 'bold' }}>
                                    ${handleCalcPrice(p.price, p.gananciaSacoPct)}
                                </td>
                                <td style={{ padding: '1rem', color: '#2563eb', fontWeight: 'bold' }}>
                                    ${handleCalcPrice(p.price / (p.pesoPorSaco || 1), p.gananciaKiloPct)}
                                </td>
                                <td style={{ padding: '1rem', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                        {hasAccess('inventario', 'editar') && (
                                            <>
                                                <button
                                                    className="btn-abrir-elite !px-2 !py-1"
                                                    style={{ fontSize: '0.75rem', margin: 0, borderRadius: 'var(--radius-sm)', backgroundColor: '#10b981' }}
                                                    onClick={() => handleIngresarStock(p)}
                                                >
                                                    + Stock
                                                </button>
                                                <button
                                                    className="btn-abrir-elite !px-2 !py-1"
                                                    style={{ fontSize: '0.75rem', margin: 0, borderRadius: 'var(--radius-sm)', backgroundColor: '#f59e0b' }}
                                                    onClick={() => handleRestarStock(p)}
                                                >
                                                    - Stock
                                                </button>
                                                <button
                                                    className="btn-abrir-elite !px-2 !py-1"
                                                    style={{ fontSize: '0.75rem', margin: 0, borderRadius: 'var(--radius-sm)', backgroundColor: '#3b82f6' }}
                                                    onClick={() => handleEditProductClick(p)}
                                                    title="Editar"
                                                >
                                                    ✏️
                                                </button>
                                            </>
                                        )}
                                        {hasAccess('inventario', 'eliminar') && (
                                            <button
                                                className="btn-abrir-elite !px-2 !py-1"
                                                style={{ fontSize: '0.75rem', margin: 0, borderRadius: 'var(--radius-sm)', backgroundColor: '#ef4444' }}
                                                onClick={() => handleDeleteProduct(p)}
                                                title="Eliminar"
                                            >
                                                🗑️
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal Añadir Producto */}
            {isAddProductOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '500px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>➕ Añadir Nuevo Producto</h3>

                        <form onSubmit={handleAddProductSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#4b5563' }}>Nombre del Producto</label>
                                <input
                                    type="text"
                                    required
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
                                    value={newProduct.name}
                                    onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                                    placeholder="Ej. Saco de Maíz, Harina..."
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#4b5563' }}>Costo Total ($)</label>
                                    <input
                                        type="number" step="0.01" required
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
                                        value={newProduct.costoBase}
                                        onChange={e => setNewProduct({ ...newProduct, costoBase: e.target.value })}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#4b5563' }}>Peso Total (Kg)</label>
                                    <input
                                        type="number" step="0.01" required
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
                                        value={newProduct.pesoTotalKg}
                                        onChange={e => setNewProduct({ ...newProduct, pesoTotalKg: e.target.value })}
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div style={{ backgroundColor: '#f3f4f6', padding: '1rem', borderRadius: '8px', marginTop: '0.5rem' }}>
                                <h4 style={{ fontWeight: 'bold', marginBottom: '1rem', fontSize: '0.9rem', color: '#374151', textTransform: 'uppercase' }}>Configuración de Ganancias</h4>

                                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#4b5563' }}>Margen Saco (%)</label>
                                        <input
                                            type="number" step="0.1" required
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                            value={newProduct.gananciaSacoPct}
                                            onChange={e => setNewProduct({ ...newProduct, gananciaSacoPct: e.target.value })}
                                        />
                                        {newProduct.costoBase && newProduct.gananciaSacoPct && (
                                            <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#16a34a', fontWeight: 'bold' }}>
                                                Venta Saco: ${handleCalcPrice(newProduct.costoBase, newProduct.gananciaSacoPct)}
                                            </p>
                                        )}
                                    </div>

                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#4b5563' }}>Margen Detal (%)</label>
                                        <input
                                            type="number" step="0.1" required
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                            value={newProduct.gananciaKiloPct}
                                            onChange={e => setNewProduct({ ...newProduct, gananciaKiloPct: e.target.value })}
                                        />
                                        {newProduct.costoBase && newProduct.pesoTotalKg && newProduct.gananciaKiloPct && (
                                            <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#2563eb', fontWeight: 'bold' }}>
                                                Venta Kilo: ${handleCalcPrice(parseFloat(newProduct.costoBase) / parseFloat(newProduct.pesoTotalKg), newProduct.gananciaKiloPct)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 mt-4">
                                <button type="button" onClick={() => setIsAddProductOpen(false)} style={{ flex: 1, padding: '12px', backgroundColor: '#e5e7eb', color: '#4b5563', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }} className="btn-mobile-full">
                                    Cancelar
                                </button>
                                <button type="submit" style={{ flex: 1, padding: '12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }} className="btn-mobile-full">
                                    💾 Guardar Producto
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Editar Producto */}
            {isEditProductOpen && productToEdit && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '500px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>✏️ Editar Producto</h3>

                        <form onSubmit={handleEditProductSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#4b5563' }}>Nombre del Producto</label>
                                <input
                                    type="text"
                                    required
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
                                    value={productToEdit.name}
                                    onChange={e => setProductToEdit({ ...productToEdit, name: e.target.value })}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#4b5563' }}>Costo Total ($)</label>
                                    <input
                                        type="number" step="0.01" required
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
                                        value={productToEdit.costoBase}
                                        onChange={e => setProductToEdit({ ...productToEdit, costoBase: e.target.value })}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#4b5563' }}>Peso Total (Kg)</label>
                                    <input
                                        type="number" step="0.01" required
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
                                        value={productToEdit.pesoTotalKg}
                                        onChange={e => setProductToEdit({ ...productToEdit, pesoTotalKg: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div style={{ backgroundColor: '#f3f4f6', padding: '1rem', borderRadius: '8px', marginTop: '0.5rem' }}>
                                <h4 style={{ fontWeight: 'bold', marginBottom: '1rem', fontSize: '0.9rem', color: '#374151', textTransform: 'uppercase' }}>Configuración de Ganancias</h4>

                                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#4b5563' }}>Margen Saco (%)</label>
                                        <input
                                            type="number" step="0.1" required
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                            value={productToEdit.gananciaSacoPct}
                                            onChange={e => setProductToEdit({ ...productToEdit, gananciaSacoPct: e.target.value })}
                                        />
                                        {productToEdit.costoBase && productToEdit.gananciaSacoPct && (
                                            <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#16a34a', fontWeight: 'bold' }}>
                                                Venta Saco: ${handleCalcPrice(productToEdit.costoBase, productToEdit.gananciaSacoPct)}
                                            </p>
                                        )}
                                    </div>

                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#4b5563' }}>Margen Detal (%)</label>
                                        <input
                                            type="number" step="0.1" required
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                            value={productToEdit.gananciaKiloPct}
                                            onChange={e => setProductToEdit({ ...productToEdit, gananciaKiloPct: e.target.value })}
                                        />
                                        {productToEdit.costoBase && productToEdit.pesoTotalKg && productToEdit.gananciaKiloPct && (
                                            <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#2563eb', fontWeight: 'bold' }}>
                                                Venta Kilo: ${handleCalcPrice(parseFloat(productToEdit.costoBase) / parseFloat(productToEdit.pesoTotalKg), productToEdit.gananciaKiloPct)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 mt-4">
                                <button type="button" onClick={() => setIsEditProductOpen(false)} style={{ flex: 1, padding: '12px', backgroundColor: '#e5e7eb', color: '#4b5563', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }} className="btn-mobile-full">
                                    Cancelar
                                </button>
                                <button type="submit" style={{ flex: 1, padding: '12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }} className="btn-mobile-full">
                                    💾 Guardar Cambios
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
