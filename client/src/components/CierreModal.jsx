import React from 'react';

function CierreModal({ isOpen, onClose, exchangeRate }) {
    if (!isOpen) return null;

    // Datos simulados del cierre de caja
    const mockVentasBs = 4500.00;
    const mockVentasUsd = 120.00;
    const mockPunto = 3500.00;
    const totalEquivalenteUsd = (mockVentasBs / exchangeRate) + mockVentasUsd + (mockPunto / exchangeRate);

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ backgroundColor: 'var(--color-surface)', padding: '2rem', borderRadius: 'var(--radius-lg)', width: '500px', maxWidth: '90%', boxShadow: 'var(--shadow-lg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>📊 Cierre de Caja (X/Z)</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', backgroundColor: 'var(--color-bg-main)', borderRadius: 'var(--radius-sm)' }}>
                        <span>Efectivo Bs:</span>
                        <span style={{ fontWeight: 'bold' }}>Bs {mockVentasBs.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', backgroundColor: 'var(--color-bg-main)', borderRadius: 'var(--radius-sm)' }}>
                        <span>Efectivo USD:</span>
                        <span style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>${mockVentasUsd.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', backgroundColor: 'var(--color-bg-main)', borderRadius: 'var(--radius-sm)' }}>
                        <span>Punto de Venta / PM:</span>
                        <span style={{ fontWeight: 'bold' }}>Bs {mockPunto.toFixed(2)}</span>
                    </div>

                    <div style={{ borderTop: '2px dashed var(--color-border)', margin: '0.5rem 0' }}></div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', fontSize: '1.2rem' }}>
                        <span>Total Equivalente Cierre:</span>
                        <span style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>${totalEquivalenteUsd.toFixed(2)}</span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
                    <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => { alert('Cierre de caja procesado.'); onClose(); }}>Imprimir Cierre Z</button>
                </div>
            </div>
        </div>
    );
}

export default CierreModal;
