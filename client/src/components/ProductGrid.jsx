import React, { useState } from 'react';

function ProductGrid({ products, exchangeRate, onAdd, onOpenUnit }) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="left-panel">
            {/* Tools Row */}
            <div className="search-container">
                <input
                    type="text"
                    placeholder="🔍 Buscar por nombre, código de barras, SKU..."
                    className="search-input"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button className="action-button outline">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="4 7 4 4 20 4 20 7"></polyline>
                        <line x1="9" y1="20" x2="15" y2="20"></line>
                        <line x1="12" y1="4" x2="12" y2="20"></line>
                    </svg>
                </button>
                <button className="action-button outline" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 3h16a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"></path>
                        <path d="M8 13v8a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-8"></path>
                    </svg>
                    Escanear Código
                </button>
            </div>

            {/* Product List */}
            <div className="product-grid" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {filteredProducts.map(product => (
                    <div key={product.id} className="product-item" style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1rem', cursor: 'pointer', transition: 'box-shadow 0.2s' }} onClick={() => onAdd(product)}>
                        <div className="product-info" style={{ flex: 1 }}>
                            <div className="product-image" style={{ backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#718096' }}>
                                {product.name.charAt(0)}
                            </div>
                            <div className="product-meta">
                                <span className="product-name">{product.name}</span>
                                <span className="product-sku">SKU: {product.sku}</span>
                                <span style={{ fontSize: '0.8rem', color: product.isFractional ? 'var(--color-secondary)' : 'var(--color-primary)' }}>
                                    Stock: {product.isFractional ? `${product.stockOpen} ${product.openMetric}` : `${product.stockClosed} Sacos/Und`}
                                </span>
                            </div>
                        </div>

                        <div className="product-price" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--color-primary)' }}>
                                ${product.price.toFixed(2)} {product.isFractional && `x ${product.openMetric}`}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                Bs {(product.price * exchangeRate).toFixed(2)}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1.5rem' }}>
                            {!product.isFractional && product.stockClosed > 0 && (
                                <button
                                    className="btn btn-outline"
                                    style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onOpenUnit(product.id);
                                    }}
                                >
                                    ✂️ Abrir
                                </button>
                            )}
                            <button
                                className="btn btn-primary"
                                style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAdd(product);
                                }}
                            >
                                + Añadir
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default ProductGrid;
