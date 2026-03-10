import React, { useState } from 'react';
import { Search, Plus, ArrowUpDown } from 'lucide-react';

function ProductGrid({ products = [], exchangeRate = 450, onAdd, movimientos = [] }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('Saco'); // 'Kg' or 'Saco'
    const [sortBy, setSortBy] = useState('az'); // 'az' | 'stock-desc' | 'stock-asc' | 'popular'

    // Calcular popularidad de cada producto desde el historial de ventas
    const popularityMap = React.useMemo(() => {
        const map = {};
        (movimientos || []).forEach(ticket => {
            (ticket.productos || []).forEach(item => {
                map[item.id] = (map[item.id] || 0) + (item.quantity || 1);
            });
        });
        return map;
    }, [movimientos]);

    const filteredProducts = products
        .filter(p =>
            (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            ((p.sku || '').toLowerCase().includes(searchTerm.toLowerCase()))
        )
        .sort((a, b) => {
            if (sortBy === 'stock-desc') return (b.stock || 0) - (a.stock || 0);
            if (sortBy === 'stock-asc')  return (a.stock || 0) - (b.stock || 0);
            if (sortBy === 'popular') return (popularityMap[b.id] || 0) - (popularityMap[a.id] || 0);
            // Default: A-Z
            return (a.name || '').localeCompare(b.name || '');
        });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px', background: '#F9F7F2' }}>
            {/* Search Input - Full Width */}
            <div style={{ position: 'relative', marginBottom: '12px' }}>
                <input
                    type="text"
                    placeholder="Escribe para buscar producto..."
                    style={{
                        width: '100%',
                        padding: '14px 20px',
                        background: 'white',
                        border: '1px solid #E9ECEF',
                        borderRadius: '12px',
                        fontSize: '13px',
                        fontWeight: '700',
                        color: '#2C3E50',
                        outline: 'none',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                        boxSizing: 'border-box'
                    }}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search size={18} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#3498DB' }} />
            </div>

            {/* Sort Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <ArrowUpDown size={14} style={{ color: '#95A5A6', flexShrink: 0 }} />
                {[['az', 'A-Z'], ['stock-desc', '📦 Mayor Stock'], ['stock-asc', '⚠️ Menor Stock'], ['popular', '🔥 Top Ventas']].map(([val, label]) => (
                    <button
                        key={val}
                        onClick={() => setSortBy(val)}
                        style={{
                            padding: '5px 12px',
                            borderRadius: '20px',
                            border: sortBy === val ? 'none' : '1px solid #E9ECEF',
                            fontSize: '10px',
                            fontWeight: '900',
                            cursor: 'pointer',
                            background: sortBy === val ? '#2C3E50' : 'white',
                            color: sortBy === val ? 'white' : '#95A5A6',
                            transition: 'all 0.15s',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Catalog Header: Title + Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '0 4px' }}>
                <h2 style={{ fontSize: '15px', fontWeight: '900', color: '#2C3E50', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Catálogo de Productos
                </h2>
                <div style={{ display: 'flex', background: '#F1F5F9', padding: '4px', borderRadius: '30px', gap: '4px' }}>
                    <button
                        onClick={() => setViewMode('Kg')}
                        style={{
                            padding: '6px 16px',
                            borderRadius: '25px',
                            border: 'none',
                            fontSize: '11px',
                            fontWeight: '900',
                            cursor: 'pointer',
                            background: viewMode === 'Kg' ? '#2C3E50' : 'transparent',
                            color: viewMode === 'Kg' ? 'white' : '#95A5A6',
                            transition: 'all 0.2s'
                        }}
                    >
                        Kg
                    </button>
                    <button
                        onClick={() => setViewMode('Saco')}
                        style={{
                            padding: '6px 16px',
                            borderRadius: '25px',
                            border: 'none',
                            fontSize: '11px',
                            fontWeight: '900',
                            cursor: 'pointer',
                            background: viewMode === 'Saco' ? '#2C3E50' : 'transparent',
                            color: viewMode === 'Saco' ? 'white' : '#95A5A6',
                            transition: 'all 0.2s'
                        }}
                    >
                        Saco
                    </button>
                </div>
            </div>

            {/* Product List */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                    {filteredProducts.map(product => {
                        const pesoPorSaco = product.pesoPorSaco || 50;
                        const stockSacos = product.stock || 0;
                        const stockKg = stockSacos * pesoPorSaco;

                        // *** FIX: Calculate the REAL sale price (same formula as VentasTab) ***
                        const calcSalePrice = (costo, gananciaPct) => {
                            if (!costo || !gananciaPct) return parseFloat(costo) || 0;
                            const marginDecimal = parseFloat(gananciaPct) / 100;
                            if (marginDecimal >= 1) return parseFloat(costo);
                            return parseFloat(costo) / (1 - marginDecimal);
                        };

                        const precioVentaSaco = calcSalePrice(product.price, product.gananciaSacoPct);
                        const costPerKg = product.price / pesoPorSaco;
                        const precioVentaKg = calcSalePrice(costPerKg, product.gananciaKiloPct);

                        const displayStock = viewMode === 'Saco'
                            ? `${stockSacos.toFixed(1)} SACOS`
                            : `${stockKg.toFixed(0)} KG`;
                        const displayPrice = viewMode === 'Saco' ? precioVentaSaco : precioVentaKg;
                        const isLowStock = stockSacos < 5;

                        return (
                            <div
                                key={product.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    background: 'white',
                                    padding: '14px 20px',
                                    borderRadius: '12px',
                                    marginBottom: '8px',
                                    border: '1px solid #E9ECEF',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.01)'
                                }}
                            >
                                {/* Lef Side: Avatar + Name + Stock */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#F8F9FA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '900', color: '#95A5A6', flexShrink: 0 }}>
                                        {product.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: '12px', fontWeight: '900', color: '#2C3E50', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {product.name}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '3px' }}>
                                            <span style={{ fontSize: '9px', fontWeight: '800', color: isLowStock ? '#E74C3C' : '#95A5A6', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                ✦ {displayStock} {isLowStock ? 'BAJO' : ''}
                                            </span>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onAdd(product, true, 1, 'Prepago', viewMode); }}
                                                style={{ fontSize: '8px', fontWeight: '900', color: '#2C3E50', border: '1px solid #E9ECEF', borderRadius: '4px', padding: '1px 6px', background: 'white', cursor: 'pointer' }}
                                            >
                                                PRE-PAGO
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Prices + Add Button */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '15px', fontWeight: '900', color: '#2C3E50', letterSpacing: '-0.5px' }}>
                                            ${displayPrice.toFixed(2)}
                                        </div>
                                        <div style={{ fontSize: '10px', fontWeight: '700', color: '#95A5A6', marginTop: '1px' }}>
                                            Bs {(displayPrice * exchangeRate).toFixed(0)} / {viewMode === 'Saco' ? 'Saco' : 'Kg'}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => onAdd(product, false, 1, 'Venta', viewMode)}
                                        style={{
                                            width: '36px',
                                            height: '36px',
                                            borderRadius: '50%',
                                            background: '#52B788',
                                            color: 'white',
                                            border: 'none',
                                            fontSize: '18px',
                                            fontWeight: '700',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            boxShadow: '0 3px 6px rgba(82, 183, 136, 0.2)',
                                            transition: 'transform 0.1s'
                                        }}
                                        onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
                                        onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default ProductGrid;
