import React, { useState } from 'react';

function CartCheckout({ cart, exchangeRate, onUpdateQuantity, onRemove, onClear }) {
    const [discountPercent, setDiscountPercent] = useState(0);
    const [amountBs, setAmountBs] = useState('');
    const [selectedMethod, setSelectedMethod] = useState('cash'); // 'cash', 'card', 'usd'

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total = subtotal * (1 - discountPercent / 100);

    const handleAmountBsChange = (val) => {
        setAmountBs(val);
    };

    return (
        <div className="right-panel">
            {/* Order Details Header */}
            <div className="order-details" style={{ flex: 1 }}>
                <div className="order-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <h2 className="order-title">DETALLES ORDEN</h2>
                        <span className="badge">Items: {cart.length}</span>
                    </div>
                    <span className="text-danger" onClick={onClear}>Borrar Todo ✕</span>
                </div>

                {/* Cart Item List */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-text-muted)', paddingBottom: '0.5rem', borderBottom: '1px solid var(--color-border)', marginTop: '1rem' }}>
                    <span style={{ flex: 2 }}>Producto</span>
                    <span style={{ flex: 1, textAlign: 'center' }}>Precio ($/Bs)</span>
                    <span style={{ flex: 1, textAlign: 'center' }}>Cant.</span>
                    <span style={{ flex: 1, textAlign: 'right' }}>Subtotal</span>
                </div>

                <div className="product-list" style={{ overflowY: 'auto', flex: 1 }}>
                    {cart.map(item => (
                        <div key={item.id} className="product-item" style={{ padding: '0.5rem 0' }}>
                            <div className="product-name" style={{ flex: 2, fontSize: '0.85rem' }}>
                                {item.name}
                            </div>
                            <div className="product-price" style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column' }}>
                                <span>${item.price.toFixed(2)}</span>
                                <span style={{ fontSize: '0.75rem' }}>Bs {(item.price * exchangeRate).toFixed(2)}</span>
                            </div>
                            <div className="product-quantity" style={{ justifyContent: 'center' }}>
                                <button className="qty-btn" onClick={() => onUpdateQuantity(item.id, -1)}>-</button>
                                <span style={{ fontSize: '0.85rem', minWidth: '20px', textAlign: 'center' }}>{item.quantity}</span>
                                <button className="qty-btn" onClick={() => onUpdateQuantity(item.id, 1)}>+</button>
                            </div>
                            <div className="product-subtotal" style={{ fontSize: '0.85rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', alignItems: 'center' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Bs {(item.price * item.quantity * exchangeRate).toFixed(2)}</span>
                                </div>
                                <span className="product-action" onClick={() => onRemove(item.id)} style={{ marginLeft: '0.5rem' }}>🗑️</span>
                            </div>
                        </div>
                    ))}
                    {cart.length === 0 && (
                        <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginTop: '2rem' }}>
                            El carrito está vacío
                        </div>
                    )}
                </div>
            </div>

            {/* Invoice Details */}
            <div className="invoice-card">
                <div className="invoice-header">
                    <span className="invoice-title">FACTURA</span>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>#43102</span>
                </div>

                <div className="customer-actions">
                    <button className="btn btn-outline" style={{ flex: 1, fontSize: '0.85rem' }}>
                        👤 CI/RIF Cliente
                    </button>
                    <button className="btn btn-outline" style={{ flex: 1, fontSize: '0.85rem' }}>
                        ➕ Nuevo Cliente
                    </button>
                </div>

                <div className="summary-rows">
                    <h3 style={{ fontSize: '1rem', margin: '0.5rem 0' }}>Resumen de Pago</h3>

                    <div className="summary-row">
                        <span>Subtotal</span>
                        <span>${subtotal.toFixed(2)}</span>
                    </div>

                    <div className="summary-row">
                        <span>Descuento %</span>
                        <input
                            type="number"
                            value={discountPercent}
                            onChange={(e) => setDiscountPercent(Number(e.target.value))}
                            style={{ width: '60px', textAlign: 'right', padding: '0.2rem', borderRadius: '4px', border: '1px solid #ccc' }}
                        />
                    </div>

                    {/* Calculadora de Despacho */}
                    {cart.some(i => i.isFractional) && (
                        <div className="calc-row">
                            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>🧮 Calculadora de Despacho (Solo Detal)</label>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <input
                                    type="number"
                                    placeholder="Monto a comprar en Bs"
                                    value={amountBs}
                                    onChange={(e) => handleAmountBsChange(e.target.value)}
                                    style={{ flex: 1, padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                                />
                                <span style={{ fontSize: '0.8rem' }}>Tasa: {exchangeRate}</span>
                            </div>
                            {amountBs && (
                                <div style={{ marginTop: '0.25rem', color: 'var(--color-primary)' }}>
                                    Equivale a ${(amountBs / exchangeRate).toFixed(2)}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="summary-row total">
                        <span>Total a Pagar</span>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.25rem', color: 'var(--color-primary)' }}>${total.toFixed(2)}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 'normal' }}>
                                Bs {(total * exchangeRate).toFixed(2)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment Methods */}
            <div className="payment-methods">
                <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Seleccionar Método</span>
                <div className="method-grid">
                    <div className={`method-button ${selectedMethod === 'cash' ? 'active' : ''}`} onClick={() => setSelectedMethod('cash')}>
                        <span style={{ fontSize: '1.5rem' }}>💵</span>
                        <span>Efectivo Bs</span>
                    </div>
                    <div className={`method-button ${selectedMethod === 'usd' ? 'active' : ''}`} onClick={() => {
                        setSelectedMethod('usd');
                        setDiscountPercent(5);
                    }}>
                        <span style={{ fontSize: '1.5rem' }}>💲</span>
                        <span>Efectivo $</span>
                    </div>
                    <div className={`method-button ${selectedMethod === 'card' ? 'active' : ''}`} onClick={() => setSelectedMethod('card')}>
                        <span style={{ fontSize: '1.5rem' }}>💳</span>
                        <span>Punto / PM</span>
                    </div>
                </div>

                <div className="checkout-actions">
                    <button className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }} onClick={() => alert('Procesando pago por Total: $' + total.toFixed(2))}>
                        💳 Procesar Pago
                    </button>
                    <div className="checkout-split">
                        <button className="btn btn-warning">
                            ⏸️ En Espera
                        </button>
                        <button className="btn btn-danger" onClick={onClear}>
                            ❌ Cancelar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CartCheckout;
