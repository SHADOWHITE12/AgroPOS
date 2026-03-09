import React from 'react';

export function Modal({ isOpen, title, onClose, children }) {
    if (!isOpen) return null;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
            <div style={{ backgroundColor: 'var(--white)', borderRadius: 'var(--radius-lg)', width: '90%', maxWidth: '500px', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '1.25rem', color: 'var(--primary)' }}>{title}</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
                </div>
                <div style={{ padding: '2rem' }}>
                    {children}
                </div>
            </div>
        </div>
    );
}

export function AperturaModal({ isOpen, onConfirm }) {
    const [tasa, setTasa] = React.useState('');
    const [usd, setUsd] = React.useState('');
    const [bs, setBs] = React.useState('');

    // La apertura exige que la tasa sea válida (>0) y al menos un monto en gaveta (aunque sea 0)
    const isValido = parseFloat(tasa) > 0 && usd !== '' && bs !== '';
    const totalCalculado = isValido ? (parseFloat(usd) || 0) + ((parseFloat(bs) || 0) / parseFloat(tasa)) : 0;

    const [isSuccess, setIsSuccess] = React.useState(false);

    const handleAbrir = () => {
        setIsSuccess(true);
        setTimeout(() => {
            onConfirm({
                tasa: parseFloat(tasa),
                usd: parseFloat(usd) || 0,
                bs: parseFloat(bs) || 0,
                fecha: new Date().toISOString()
            });
            setIsSuccess(false);
            setTasa('');
            setUsd('');
            setBs('');
        }, 800);
    };

    return (
        <div className={`modal-overlay ${isOpen ? 'activo' : ''}`}>
            <div className="modal-caja">
                <div className="modal-header-elite">
                    <span className="icono-sol">☀️</span>
                    <h2>APERTURA DE CAJA</h2>
                </div>

                <div className="modal-body">
                    <div className="input-grupo-elite" style={{ marginBottom: '1rem', borderLeft: '4px solid var(--secondary)' }}>
                        <label>
                            <span>📈</span>
                            Tasa del Día (Bs/$)
                        </label>
                        <input
                            type="number"
                            placeholder="Ej. 36.50"
                            value={tasa}
                            onChange={(e) => setTasa(e.target.value)}
                        />
                    </div>

                    <div className="input-grupo-elite">
                        <label>
                            <span>💵</span>
                            Fondo Gaveta ($)
                        </label>
                        <input
                            type="number"
                            placeholder="0.00"
                            value={usd}
                            onChange={(e) => setUsd(e.target.value)}
                        />
                    </div>

                    <div className="input-grupo-elite">
                        <label>
                            <span>💶</span>
                            Fondo Gaveta (Bs)
                        </label>
                        <input
                            type="number"
                            placeholder="0.00"
                            value={bs}
                            onChange={(e) => setBs(e.target.value)}
                        />
                    </div>

                    <button className="btn-usar-cierre">
                        <span>🔄</span> Usar cierre de ayer
                    </button>

                    <button
                        className={`btn-abrir-elite ${isSuccess ? 'exito' : ''}`}
                        disabled={!isValido || isSuccess}
                        onClick={handleAbrir}
                    >
                        {isSuccess ? '✓ CAJA ABIERTA' :
                            isValido ? `ABRIR CON $${totalCalculado.toFixed(2)}` : 'ABRIR CAJA'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export function CambioDivisasModal({ isOpen, onClose }) {
    return (
        <Modal isOpen={isOpen} title="🔄 CAMBIO DE DIVISAS" onClose={onClose}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 1fr', gap: '0.5rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>DESDE</label>
                        <select className="search-input" style={{ padding: '0.5rem' }}>
                            <option>$ Dólares</option>
                            <option>Bs Bolívares</option>
                        </select>
                    </div>
                    <div style={{ textAlign: 'center', fontSize: '1.25rem', marginTop: '1rem' }}>➔</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>HACIA</label>
                        <select className="search-input" style={{ padding: '0.5rem' }}>
                            <option>Bs Bolívares</option>
                            <option>$ Dólares</option>
                        </select>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>MONTO A CAMBIAR</label>
                    <input type="number" className="search-input" placeholder="0.00" style={{ padding: '0.75rem' }} />
                </div>

                <div style={{ backgroundColor: 'var(--bg-color)', padding: '1rem', borderRadius: 'var(--radius-md)', fontSize: '0.9rem' }}>
                    <strong>Recibirás:</strong> <span style={{ color: 'var(--secondary)', fontWeight: 'bold' }}>Bs 1,825.00</span>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Tasa aplicada: 36.50</div>
                </div>

                <button className="btn-cobrar">CONFIRMAR CAMBIO</button>
            </div>
        </Modal>
    );
}

export function Toast({ message, type = 'info' }) {
    const bgColor = type === 'success' ? 'var(--secondary)' : type === 'error' ? 'var(--danger)' : 'var(--primary)';
    return (
        <div style={{ position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', backgroundColor: bgColor, color: 'white', padding: '1rem 2rem', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', fontWeight: 600, zIndex: 2000, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span>🔔</span>
            {message}
        </div>
    );
}
