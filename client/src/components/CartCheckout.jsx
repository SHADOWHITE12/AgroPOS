import React, { useState, useCallback } from 'react';
import { Trash2, Minus, Plus, ShoppingCart, Tag, X, CheckCircle, ChevronRight, AlertTriangle } from 'lucide-react';

const METODOS = [
    { id: 'Efectivo $', label: 'EFECTIVO\nUSD', bg: '#1B4332', ico: '💵', isUsd: true },
    { id: 'Efectivo Bs', label: 'EFECTIVO BS', bg: '#52B788', ico: '💴', isBs: true },
    { id: 'Pago Móvil', label: 'PAGO MÓVIL', bg: '#3498DB', ico: '📱', isBs: true },
    { id: 'Punto', label: 'PUNTO DB/CR', bg: '#E67E22', ico: '💳', isBs: true },
    { id: 'Biopago', label: 'BIOPAGO', bg: '#9B59B6', ico: '🔑', isBs: true },
    { id: 'Crédito', label: 'FIAR\nCRÉDITO', bg: '#F1C40F', ico: '📋', isCredit: true },
];

// ─── CHECKOUT MODAL ───────────────────────────────────────────────────────────
function CheckoutModal({
    isOpen, onClose,
    totalPendiente,    // USD remaining to pay
    exchangeRate,
    abonos,            // payments already registered [{metodo, montoUsd, montoBs}]
    onAddPago,         // (paymentObj) => void — registers partial/full payment
    onFinalConfirm,    // (vueltoUsd, vueltoBs, clienteNombre) => void
    onRemoveAbono,     // (index) => void
    cart = [],         // To calculate discount per item type
    applyPromotions = false,
    descuentos = { porMetodoPago: [] }
}) {
    const [selectedMetodo, setSelectedMetodo] = useState(null);
    const [montoBsInput, setMontoBsInput] = useState('');
    const [montoUsdInput, setMontoUsdInput] = useState('');
    const [vueltoUsdOut, setVueltoUsdOut] = useState('');
    const [vueltoBsOut, setVueltoBsOut] = useState('');
    const [clienteNombre, setClienteNombre] = useState('');
    const [step, setStep] = useState('selectMethod'); // 'selectMethod' | 'enterAmount' | 'enterChange' | 'clientName'

    const metodoInfo = METODOS.find(m => m.id === selectedMetodo) || {};
    const totalAbonado = abonos.reduce((s, a) => s + a.montoUsd, 0);
    const saldoRestante = Math.max(0, totalPendiente - totalAbonado);
    const isFullyCovered = saldoRestante < 0.01;
    const montoUsdCalc = parseFloat(montoUsdInput) || 0;
    const montoBsCalc = parseFloat(montoBsInput) || 0;

    // ── CALCULAR DESCUENTO POR MÉTODO ───────────────────────────────────────
    let descuentoAplicado = 0;
    let pctDescuento = 0;
    if (applyPromotions && selectedMetodo) {
        const config = descuentos.porMetodoPago.find(d => d.metodo === selectedMetodo);
        if (config && config.porcentaje > 0) {
            pctDescuento = config.porcentaje;
            // Solo aplica a items tipo 'saco'
            const subtotalSacos = cart.filter(i => i.tipoVenta === 'saco')
                .reduce((sum, i) => sum + (i.price * i.quantity), 0);
            descuentoAplicado = subtotalSacos * (pctDescuento / 100);
        }
    }

    const totalConPromocion = totalPendiente - descuentoAplicado;
    const saldoRestanteConPromo = Math.max(0, totalConPromocion - totalAbonado);
    const isFullyCoveredConPromo = saldoRestanteConPromo < 0.01;

    const montoUsdFromBs = montoBsCalc / (exchangeRate || 1);
    const vuelto = montoUsdCalc > 0 ? Math.max(0, montoUsdCalc - (selectedMetodo === 'Efectivo $' ? saldoRestanteConPromo : 0)) : 0;

    const hasPrepagos = cart.some(item => item.esPrepago);
    const hasCredito = abonos.some(a => a.esCredito);
    const requiresClientName = hasPrepagos || hasCredito;
    const isClientNameValid = clienteNombre.trim().length >= 3;

    if (!isOpen) return null;

    const handleSelectMetodo = (metodoId) => {
        const m = METODOS.find(x => x.id === metodoId);
        setSelectedMetodo(metodoId);
        setMontoBsInput('');
        setMontoUsdInput('');
        setVueltoUsdOut('');
        setVueltoBsOut('');
        if (m.isCredit) {
            setStep('clientName');
        } else {
            setStep('enterAmount');
        }
    };

    const handleConfirmPayment = () => {
        let montoUsdFinal = 0;
        let montoBsFinal = 0;

        if (metodoInfo?.isUsd) {
            montoUsdFinal = montoUsdCalc;
            montoBsFinal = montoUsdCalc * (exchangeRate || 1);
        } else if (metodoInfo?.isBs) {
            montoBsFinal = montoBsCalc;
            montoUsdFinal = montoUsdFromBs;
        }

        if (montoUsdFinal <= 0) return;

        const hayCambio = metodoInfo.isUsd && montoUsdCalc > saldoRestanteConPromo;

        if (hayCambio) {
            setStep('enterChange');
            return;
        }

        // Register payment (partial or full)
        onAddPago({
            metodo: selectedMetodo,
            montoUsd: montoUsdFinal,
            montoBs: montoBsFinal,
            descuentoAplicado: abonos.length === 0 ? descuentoAplicado : 0 // Only apply once OR manage globally
        });
        setStep('selectMethod');
        setSelectedMetodo(null);
    };

    const handleConfirmChange = () => {
        const montoUsdFinal = montoUsdCalc;
        const montoBsFinal = montoUsdCalc * exchangeRate;
        onAddPago({
            metodo: selectedMetodo,
            montoUsd: montoUsdFinal,
            montoBs: montoBsFinal,
            descuentoAplicado: abonos.length === 0 ? descuentoAplicado : 0
        });
        setStep('selectMethod');
        setSelectedMetodo(null);
    };

    const handleCreditConfirm = () => {
        if (!clienteNombre.trim()) return;
        onAddPago({
            metodo: 'Crédito',
            montoUsd: saldoRestanteConPromo,
            montoBs: saldoRestanteConPromo * exchangeRate,
            esCredito: true,
            cliente: clienteNombre,
            descuentoAplicado: abonos.length === 0 ? descuentoAplicado : 0
        });
        setStep('selectMethod');
        setSelectedMetodo(null);
    };

    const handleFinalConfirm = () => {
        if (!isFullyCoveredConPromo) return;
        const vueltoU = parseFloat(vueltoUsdOut) || 0;
        const vueltoB = parseFloat(vueltoBsOut) || 0;
        const creditAbono = abonos.find(a => a.esCredito);

        // Calculate total discount from ALL abonos (usually just the first one)
        const totalDiscount = abonos.reduce((s, a) => s + (a.descuentoAplicado || 0), 0);

        onFinalConfirm(vueltoU, vueltoB, creditAbono?.cliente || clienteNombre, totalDiscount);
    };

    const totalBsRestante = saldoRestanteConPromo * exchangeRate;
    const metodoActual = METODOS.find(m => m.id === selectedMetodo);

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px'
        }}>
            <div style={{
                background: 'white', borderRadius: '24px', width: '100%', maxWidth: '500px',
                boxShadow: '0 32px 80px rgba(0,0,0,0.3)', overflow: 'hidden',
                maxHeight: '90vh', display: 'flex', flexDirection: 'column'
            }}>
                {/* Header */}
                <div style={{ background: '#1B4332', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                    <div>
                        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '10px', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Proceso de Cobro</div>
                        <div style={{ color: 'white', fontSize: '18px', fontWeight: 900, letterSpacing: '-0.5px' }}>
                            💰 Caja Registradora
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '10px', padding: '8px', cursor: 'pointer', color: 'white', display: 'flex' }}>
                        <X size={18} />
                    </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                    {/* Total Summary Bar */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                        <div style={{ background: '#F8F9FA', borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
                            <div style={{ fontSize: '10px', fontWeight: 800, color: '#95A5A6', letterSpacing: '0.1em' }}>SUBTOTAL</div>
                            <div style={{ fontSize: '18px', fontWeight: 900, color: '#7F8C8D', textDecoration: descuentoAplicado > 0 ? 'line-through' : 'none' }}>${totalPendiente.toFixed(2)}</div>
                        </div>
                        <div style={{ background: isFullyCoveredConPromo ? '#D8F3DC' : '#FFF3E0', borderRadius: '14px', padding: '14px', textAlign: 'center', border: `2px solid ${isFullyCoveredConPromo ? '#52B788' : '#FFB74D'}` }}>
                            <div style={{ fontSize: '10px', fontWeight: 800, color: isFullyCoveredConPromo ? '#1B4332' : '#E65100', letterSpacing: '0.1em' }}>TOTAL A COBRAR</div>
                            <div style={{ fontSize: '22px', fontWeight: 900, color: isFullyCoveredConPromo ? '#1B4332' : '#E65100' }}>
                                {isFullyCoveredConPromo ? '✓ Cubierto' : `$${totalConPromocion.toFixed(2)}`}
                            </div>
                        </div>
                    </div>

                    {/* Promo Detail if active */}
                    {descuentoAplicado > 0 && (
                        <div style={{ background: 'linear-gradient(135deg, #FFDEE9 0%, #B5FFFC 100%)', borderRadius: '12px', padding: '10px 16px', marginBottom: '20px', border: '1px solid #FFB6C1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: '10px', fontWeight: 800, color: '#D81B60' }}>PROMO: {metodoActual?.label.replace('\n', ' ')}</div>
                                <div style={{ fontSize: '13px', fontWeight: 900, color: '#D81B60' }}>- {pctDescuento}% de descuento en Sacos</div>
                            </div>
                            <div style={{ fontSize: '18px', fontWeight: 900, color: '#D81B60' }}>-${descuentoAplicado.toFixed(2)}</div>
                        </div>
                    )}

                    {/* Restante Info */}
                    {!isFullyCoveredConPromo && abonos.length > 0 && (
                        <div style={{ background: '#FDF2F2', borderRadius: '10px', padding: '8px 12px', marginBottom: '20px', textAlign: 'center', border: '1px dashed #F8B4B4' }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: '#9B2C2C' }}>SALDO PENDIENTE REBODADO: ${saldoRestanteConPromo.toFixed(2)}</span>
                        </div>
                    )}

                    {/* Abonos registrados */}
                    {abonos.length > 0 && (
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 800, color: '#7F8C8D', letterSpacing: '0.1em', marginBottom: '8px' }}>PAGOS REGISTRADOS:</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {abonos.map((ab, i) => {
                                    const m = METODOS.find(x => x.id === ab.metodo);
                                    return (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F0FFF4', border: '1px solid #B7E4C7', borderRadius: '10px', padding: '10px 14px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 800, color: '#1B4332' }}>{m?.ico} {ab.metodo}</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '13px', fontWeight: 900, color: '#1B4332' }}>+${ab.montoUsd.toFixed(2)}</span>
                                                <button onClick={() => onRemoveAbono(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E74C3C', padding: '2px', display: 'flex' }}>
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* STEP: SELECT METHOD */}
                    {step === 'selectMethod' && !isFullyCovered && (
                        <div>
                            <div style={{ fontSize: '11px', fontWeight: 800, color: '#7F8C8D', letterSpacing: '0.1em', marginBottom: '12px' }}>
                                SELECCIONA MÉTODO DE PAGO — Pendiente: Bs {totalBsRestante.toLocaleString(undefined, { maximumFractionDigits: 0 })} / ${saldoRestanteConPromo.toFixed(2)}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                {METODOS.map(m => (
                                    <button key={m.id} onClick={() => handleSelectMetodo(m.id)}
                                        style={{
                                            background: m.bg, color: 'white', border: 'none', borderRadius: '12px',
                                            padding: '14px 10px', cursor: 'pointer', display: 'flex', flexDirection: 'column',
                                            alignItems: 'center', gap: '3px', transition: 'transform 0.1s',
                                            boxShadow: '0 4px 8px rgba(0,0,0,0.15)'
                                        }}
                                        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
                                        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                        <span style={{ fontSize: '18px' }}>{m.ico}</span>
                                        <span style={{ fontSize: '10px', fontWeight: 900, textAlign: 'center', lineHeight: '1.2', whiteSpace: 'pre-line' }}>{m.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* STEP: ENTER AMOUNT (USD or Bs) */}
                    {step === 'enterAmount' && metodoActual && (
                        <div>
                            <button onClick={() => { setStep('selectMethod'); setSelectedMetodo(null); }}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#7F8C8D', fontWeight: 800, fontSize: '12px', marginBottom: '16px', padding: 0 }}>
                                ← Volver
                            </button>

                            <div style={{ background: metodoActual.bg, borderRadius: '14px', padding: '16px 20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontSize: '24px' }}>{metodoActual.ico}</span>
                                <div>
                                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '10px', fontWeight: 800 }}>MÉTODO SELECCIONADO</div>
                                    <div style={{ color: 'white', fontSize: '16px', fontWeight: 900 }}>{metodoActual.label.replace('\n', ' ')}</div>
                                </div>
                            </div>

                            <div style={{ background: '#F8F9FA', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px', textAlign: 'center' }}>
                                <div style={{ fontSize: '10px', fontWeight: 800, color: '#7F8C8D' }}>MONTO PENDIENTE</div>
                                <div style={{ fontSize: '20px', fontWeight: 900, color: '#2C3E50' }}>
                                    {metodoActual.isBs ? `Bs ${(saldoRestanteConPromo * exchangeRate).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : `$${saldoRestanteConPromo.toFixed(2)}`}
                                </div>
                                {metodoActual.isBs && <div style={{ fontSize: '12px', color: '#95A5A6', fontWeight: 600 }}>= ${saldoRestanteConPromo.toFixed(2)} @ {exchangeRate}</div>}
                            </div>

                            {/* USD input */}
                            {metodoActual.isUsd && (
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#7F8C8D', marginBottom: '8px' }}>MONTO ENTREGADO POR EL CLIENTE ($)</label>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '20px', fontWeight: 900, color: '#BDC3C7' }}>$</span>
                                        <input
                                            type="number" autoFocus min="0" step="0.01"
                                            value={montoUsdInput}
                                            onChange={e => setMontoUsdInput(e.target.value)}
                                            placeholder={saldoRestanteConPromo.toFixed(2)}
                                            style={{ width: '100%', padding: '16px 16px 16px 40px', border: '2px solid #E9ECEF', borderRadius: '12px', fontSize: '24px', fontWeight: 900, color: '#2C3E50', outline: 'none', boxSizing: 'border-box' }}
                                            onFocus={e => e.target.style.borderColor = '#52B788'}
                                            onBlur={e => e.target.style.borderColor = '#E9ECEF'}
                                        />
                                    </div>
                                    {montoUsdCalc > saldoRestanteConPromo && (
                                        <div style={{ marginTop: '8px', background: '#D8F3DC', borderRadius: '10px', padding: '10px 14px' }}>
                                            <div style={{ fontSize: '10px', fontWeight: 800, color: '#1B4332' }}>VUELTO A CALCULAR</div>
                                            <div style={{ fontSize: '20px', fontWeight: 900, color: '#1B4332' }}>
                                                ${(montoUsdCalc - saldoRestanteConPromo).toFixed(2)}
                                                <span style={{ fontSize: '12px', fontWeight: 600, marginLeft: '8px', color: '#2D6A4F' }}>
                                                    = Bs {((montoUsdCalc - saldoRestanteConPromo) * exchangeRate).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Bs input */}
                            {metodoActual.isBs && (
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#7F8C8D', marginBottom: '8px' }}>MONTO RECIBIDO EN BS</label>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', fontWeight: 900, color: '#BDC3C7', fontStyle: 'italic' }}>Bs</span>
                                        <input
                                            type="number" autoFocus min="0" step="1"
                                            value={montoBsInput}
                                            onChange={e => setMontoBsInput(e.target.value)}
                                            placeholder={(saldoRestanteConPromo * exchangeRate).toFixed(0)}
                                            style={{ width: '100%', padding: '16px 16px 16px 46px', border: '2px solid #E9ECEF', borderRadius: '12px', fontSize: '24px', fontWeight: 900, color: '#2C3E50', outline: 'none', boxSizing: 'border-box' }}
                                            onFocus={e => e.target.style.borderColor = metodoActual.bg}
                                            onBlur={e => e.target.style.borderColor = '#E9ECEF'}
                                        />
                                    </div>
                                    {montoBsCalc > 0 && (
                                        <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#7F8C8D', fontWeight: 700, padding: '0 4px' }}>
                                            <span>Equivalente en USD: <strong style={{ color: '#2C3E50' }}>${montoUsdFromBs.toFixed(2)}</strong></span>
                                            {montoUsdFromBs < saldoRestanteConPromo && (
                                                <span style={{ color: '#E67E22', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <AlertTriangle size={12} /> Pago Parcial
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            <button
                                onClick={handleConfirmPayment}
                                disabled={metodoActual.isUsd ? montoUsdCalc <= 0 : montoBsCalc <= 0}
                                style={{
                                    width: '100%', padding: '16px',
                                    background: (metodoActual.isUsd ? montoUsdCalc > 0 : montoBsCalc > 0) ? metodoActual.bg : '#DEE2E6',
                                    color: 'white', border: 'none', borderRadius: '12px',
                                    fontSize: '13px', fontWeight: 900, cursor: (metodoActual.isUsd ? montoUsdCalc > 0 : montoBsCalc > 0) ? 'pointer' : 'not-allowed',
                                    letterSpacing: '0.1em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <ChevronRight size={18} />
                                {metodoActual.isUsd && montoUsdCalc > saldoRestanteConPromo ? 'CONTINUAR CON VUELTO' :
                                    metodoActual.isBs && montoUsdFromBs < saldoRestanteConPromo && montoBsCalc > 0 ? 'REGISTRAR PAGO PARCIAL' :
                                        'REGISTRAR PAGO'}
                            </button>
                        </div>
                    )}

                    {/* STEP: ENTER CHANGE (mixed change) */}
                    {step === 'enterChange' && metodoActual && (
                        <div>
                            <div style={{ background: '#D8F3DC', borderRadius: '14px', padding: '16px 20px', marginBottom: '16px', border: '1px solid #95D5B2' }}>
                                <div style={{ fontSize: '10px', fontWeight: 800, color: '#1B4332', marginBottom: '6px' }}>VUELTO TOTAL A DEVOLVER</div>
                                <div style={{ fontSize: '28px', fontWeight: 900, color: '#1B4332' }}>${(montoUsdCalc - saldoRestanteConPromo).toFixed(2)}</div>
                                <div style={{ fontSize: '12px', color: '#2D6A4F', fontWeight: 700 }}>= Bs {((montoUsdCalc - saldoRestanteConPromo) * exchangeRate).toLocaleString(undefined, { maximumFractionDigits: 0 })} @ {exchangeRate}</div>
                            </div>

                            <div style={{ fontSize: '11px', fontWeight: 800, color: '#7F8C8D', marginBottom: '12px' }}>¿CÓMO ENTREGAS EL VUELTO AL CLIENTE?</div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '10px', fontWeight: 800, color: '#7F8C8D', marginBottom: '6px' }}>💵 VUELTO EN USD ($)</label>
                                    <input
                                        type="number" min="0" step="0.01" value={vueltoUsdOut}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setVueltoUsdOut(val);

                                            // Lógica reactiva: Calcular remanente en Bs
                                            const vUsd = parseFloat(val) || 0;
                                            const totalVueltoUsd = (montoUsdCalc - saldoRestanteConPromo);
                                            const remanenteUsd = totalVueltoUsd - vUsd;

                                            if (remanenteUsd > 0.001) {
                                                setVueltoBsOut((remanenteUsd * exchangeRate).toFixed(0));
                                            } else {
                                                setVueltoBsOut('0');
                                            }
                                        }}
                                        placeholder="0.00"
                                        style={{ width: '100%', padding: '12px', border: '2px solid #E9ECEF', borderRadius: '10px', fontSize: '18px', fontWeight: 900, textAlign: 'center', outline: 'none', boxSizing: 'border-box' }}
                                        onFocus={e => e.target.style.borderColor = '#52B788'}
                                        onBlur={e => e.target.style.borderColor = '#E9ECEF'}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '10px', fontWeight: 800, color: '#7F8C8D', marginBottom: '6px' }}>💴 VUELTO EN BS</label>
                                    <input
                                        type="number" min="0" step="1" value={vueltoBsOut}
                                        onChange={e => setVueltoBsOut(e.target.value)}
                                        placeholder="0"
                                        style={{ width: '100%', padding: '12px', border: '2px solid #E9ECEF', borderRadius: '10px', fontSize: '18px', fontWeight: 900, textAlign: 'center', outline: 'none', boxSizing: 'border-box' }}
                                        onFocus={e => e.target.style.borderColor = '#52B788'}
                                        onBlur={e => e.target.style.borderColor = '#E9ECEF'}
                                    />
                                </div>
                            </div>

                            <button onClick={handleConfirmChange}
                                style={{ width: '100%', padding: '16px', background: '#1B4332', color: 'white', border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: 900, cursor: 'pointer', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                <CheckCircle size={18} /> REGISTRAR Y CONTINUAR
                            </button>
                        </div>
                    )}

                    {/* STEP: CLIENT NAME (for credit) */}
                    {step === 'clientName' && (
                        <div>
                            <button onClick={() => { setStep('selectMethod'); setSelectedMetodo(null); }}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#7F8C8D', fontWeight: 800, fontSize: '12px', marginBottom: '16px', padding: 0 }}>
                                ← Volver
                            </button>

                            <div style={{ background: '#FEF5E7', borderRadius: '14px', padding: '16px 20px', marginBottom: '16px', border: '1px solid #FAD7A0' }}>
                                <div style={{ fontSize: '14px', fontWeight: 900, color: '#E67E22', marginBottom: '4px' }}>📋 FIAR A CRÉDITO</div>
                                <div style={{ fontSize: '12px', color: '#7F8C8D', fontWeight: 700 }}>
                                    Esta deuda de <strong style={{ color: '#2C3E50' }}>${saldoRestanteConPromo.toFixed(2)}</strong> será registrada en Cuentas por Cobrar.
                                </div>
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#7F8C8D', marginBottom: '8px' }}>NOMBRE DEL CLIENTE / IDENTIDAD *</label>
                                <input
                                    type="text" autoFocus
                                    value={clienteNombre}
                                    onChange={e => setClienteNombre(e.target.value)}
                                    placeholder="Ej: Juan Pérez / V-12345678"
                                    style={{ width: '100%', padding: '14px 16px', border: '2px solid #FAD7A0', borderRadius: '12px', fontSize: '16px', fontWeight: 700, color: '#2C3E50', outline: 'none', boxSizing: 'border-box' }}
                                    onFocus={e => e.target.style.borderColor = '#E67E22'}
                                    onBlur={e => e.target.style.borderColor = '#FAD7A0'}
                                    onKeyDown={e => e.key === 'Enter' && clienteNombre.trim() && handleCreditConfirm()}
                                />
                            </div>

                            <button onClick={handleCreditConfirm} disabled={!clienteNombre.trim()}
                                style={{
                                    width: '100%', padding: '16px',
                                    background: clienteNombre.trim() ? '#E67E22' : '#DEE2E6',
                                    color: 'white', border: 'none', borderRadius: '12px',
                                    fontSize: '13px', fontWeight: 900, letterSpacing: '0.1em',
                                    cursor: clienteNombre.trim() ? 'pointer' : 'not-allowed',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                }}>
                                <CheckCircle size={18} /> REGISTRAR DEUDA Y CONFIRMAR
                            </button>
                        </div>
                    )}

                    {/* FINAL CONFIRM — when fully covered */}
                    {isFullyCoveredConPromo && step === 'selectMethod' && (
                        <div style={{ marginTop: '12px' }}>
                            {/* Client Identification (Mandatory for Prepagos/Credit) */}
                            {requiresClientName && (
                                <div style={{ marginBottom: '16px', background: '#FDF2F2', padding: '16px', borderRadius: '12px', border: '1px solid #F8D7DA shadow-sm' }}>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#721C24', marginBottom: '8px', textTransform: 'uppercase' }}>
                                        {hasPrepagos ? '⚠️ Identificación de Pre-pago' : '⚠️ Identificación de Crédito'}
                                    </label>
                                    <input
                                        type="text"
                                        value={clienteNombre}
                                        onChange={e => setClienteNombre(e.target.value)}
                                        placeholder="Nombre del Cliente o Cédula"
                                        style={{ width: '100%', padding: '14px', border: '2px solid #F5C6CB', borderRadius: '12px', fontSize: '16px', fontWeight: 700, outline: 'none', boxSizing: 'border-box', color: '#721C24' }}
                                    />
                                    {!isClientNameValid && clienteNombre.length > 0 && (
                                        <div style={{ fontSize: '10px', color: '#E74C3C', marginTop: '6px', fontWeight: 700 }}>Mínimo 3 caracteres obligatorios.</div>
                                    )}
                                </div>
                            )}

                            {/* Show change fields ONLY if not credit/prepago AND there's overpayment in USD */}
                            {!requiresClientName && abonos.some(a => a.metodo === 'Efectivo $') && (
                                <div style={{ marginBottom: '16px', background: '#F8F9FA', padding: '16px', borderRadius: '12px', border: '1px solid #E9ECEF' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#7F8C8D', marginBottom: '10px' }}>VUELTO ENTREGADO AL CLIENTE:</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '10px', fontWeight: 800, color: '#7F8C8D', marginBottom: '6px' }}>💵 En USD ($)</label>
                                            <input type="number" min="0" step="0.01" value={vueltoUsdOut} onChange={e => setVueltoUsdOut(e.target.value)} placeholder="0.00"
                                                style={{ width: '100%', padding: '12px', border: '2px solid #DEE2E6', borderRadius: '10px', fontSize: '18px', fontWeight: 900, textAlign: 'center', outline: 'none', boxSizing: 'border-box' }} />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '10px', fontWeight: 800, color: '#7F8C8D', marginBottom: '6px' }}>💴 En Bs</label>
                                            <input type="number" min="0" step="1" value={vueltoBsOut} onChange={e => setVueltoBsOut(e.target.value)} placeholder="0"
                                                style={{ width: '100%', padding: '12px', border: '2px solid #DEE2E6', borderRadius: '10px', fontSize: '18px', fontWeight: 900, textAlign: 'center', outline: 'none', boxSizing: 'border-box' }} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleFinalConfirm}
                                disabled={requiresClientName && !isClientNameValid}
                                style={{
                                    width: '100%', padding: '20px',
                                    background: (requiresClientName && !isClientNameValid) ? '#DEE2E6' : 'linear-gradient(135deg, #1B4332, #2D6A4F)',
                                    color: 'white', border: 'none', borderRadius: '16px',
                                    fontSize: '16px', fontWeight: 900,
                                    cursor: (requiresClientName && !isClientNameValid) ? 'not-allowed' : 'pointer',
                                    letterSpacing: '0.1em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                    boxShadow: (requiresClientName && !isClientNameValid) ? 'none' : '0 8px 24px rgba(27,67,50,0.3)',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                <CheckCircle size={22} /> CONFIRMAR Y COBRAR
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}

// ─── MAIN CART COMPONENT ──────────────────────────────────────────────────────
function CartCheckout({
    cart = [],
    exchangeRate = 450,
    onUpdateQuantity,
    onRemove,
    onClear,
    onCheckout,
    applyPromotions = false,
    onTogglePromotions,
    cajaBalances = { usd: 0, bs: 0 },
    descuentos = { porMetodoPago: [] }
}) {
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [abonos, setAbonos] = useState([]);
    const [refNum] = useState(() => Math.floor(Math.random() * 9000) + 1000);

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalBs = subtotal * exchangeRate;

    const handleOpenCheckout = () => {
        if (cart.length === 0) return;
        setAbonos([]);
        setIsCheckoutOpen(true);
    };

    const handleAddAbono = useCallback((abono) => {
        setAbonos(prev => [...prev, abono]);
    }, []);

    const handleRemoveAbono = useCallback((idx) => {
        setAbonos(prev => prev.filter((_, i) => i !== idx));
    }, []);

    const handleFinalConfirm = (vueltoUsd, vueltoBs, clienteNombre, totalDiscount) => {
        setIsCheckoutOpen(false);
        setAbonos([]);
        if (typeof onCheckout === 'function') {
            onCheckout({ abonos, vueltoUsd, vueltoBs, clienteNombre, totalDiscount });
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'white', overflow: 'hidden', borderLeft: '1px solid #E9ECEF' }}>
            {isCheckoutOpen && (
                <CheckoutModal
                    isOpen={isCheckoutOpen}
                    onClose={() => setIsCheckoutOpen(false)}
                    totalPendiente={subtotal}
                    exchangeRate={exchangeRate}
                    abonos={abonos}
                    onAddPago={handleAddAbono}
                    onRemoveAbono={handleRemoveAbono}
                    onFinalConfirm={handleFinalConfirm}
                    cart={cart}
                    applyPromotions={applyPromotions}
                    descuentos={descuentos}
                />
            )}

            {/* Header */}
            <div style={{ padding: '20px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '900', color: '#2C3E50', letterSpacing: '-0.2px' }}>Detalle de Venta</h3>
                    <span style={{ fontSize: '11px', color: '#95A5A6', fontWeight: '600' }}>Ref: #{refNum}</span>
                </div>
                <button onClick={onClear} style={{ background: 'white', border: '1px solid #FADBD8', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', color: '#E74C3C', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Trash2 size={13} strokeWidth={3} /> VACIAR VENTA
                </button>
            </div>

            {/* Cart Items */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
                {cart.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#BDC3C7', gap: '12px', opacity: 0.6 }}>
                        <div style={{ background: '#F8F9FA', padding: '20px', borderRadius: '50%' }}>
                            <ShoppingCart size={48} strokeWidth={1} />
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: '700', letterSpacing: '0.05em' }}>Carrito vacío</span>
                    </div>
                ) : (
                    cart.map(item => (
                        <div key={`${item.id}-${item.metric}-${item.porcion}`} style={{ padding: '12px 20px', borderBottom: '1px solid #F8F9FA', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '13px', fontWeight: '800', color: '#2C3E50', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {item.name}
                                    {item.isPromo && <span style={{ fontSize: '10px', color: '#27AE60', marginLeft: '6px', background: '#D8F3DC', padding: '2px 6px', borderRadius: '4px' }}>PROMO</span>}
                                    {item.esPrepago && <span style={{ fontSize: '10px', color: '#E67E22', marginLeft: '6px', background: '#FEF5E7', padding: '2px 6px', borderRadius: '4px' }}>PRE-PAGO</span>}
                                </div>
                                <div style={{ fontSize: '11px', color: '#95A5A6', fontWeight: '600', marginTop: '2px' }}>
                                    ${item.price.toFixed(2)} / {item.metric}
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button onClick={() => onUpdateQuantity(item.id, -1)} style={{ width: '28px', height: '28px', border: '1px solid #DEE2E6', borderRadius: '8px', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5D6D7E' }}>
                                    <Minus size={12} strokeWidth={3} />
                                </button>
                                <span style={{ fontSize: '14px', fontWeight: '900', color: '#2C3E50', minWidth: '30px', textAlign: 'center' }}>
                                    {Number.isInteger(item.quantity) ? item.quantity : item.quantity.toFixed(1)}
                                </span>
                                <button onClick={() => onUpdateQuantity(item.id, 1)} style={{ width: '28px', height: '28px', border: '2px solid #27AE60', borderRadius: '8px', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#27AE60' }}>
                                    <Plus size={12} strokeWidth={3} />
                                </button>
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: '900', color: '#2C3E50', minWidth: '70px', textAlign: 'right' }}>
                                ${(item.price * item.quantity).toFixed(2)}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Totals & Payment */}
            <div style={{ padding: '20px', borderTop: '1px solid #F1F5F9', background: '#FCFCFB' }}>
                {/* Totals */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#95A5A6', fontWeight: '700', marginBottom: '4px' }}>
                    <span>Subtotal: ${subtotal.toFixed(2)}</span>
                    <span>TOTAL:</span>
                </div>
                <div style={{ textAlign: 'right', marginBottom: '14px' }}>
                    <div style={{ fontSize: '40px', fontWeight: '900', color: '#2C3E50', letterSpacing: '-1.5px', lineHeight: '1' }}>
                        Bs {totalBs.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: '#27AE60', marginTop: '4px' }}>
                        $ {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                </div>

                {/* Gaveta Bar */}
                <div style={{ background: 'white', border: '1px solid #E9ECEF', borderRadius: '10px', padding: '10px 16px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#E67E22', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        ⚠️ EFECTIVO EN GAVETA
                    </span>
                    <span style={{ fontSize: '12px', color: '#2C3E50', fontWeight: '800' }}>
                        ${(cajaBalances.usd || 0).toFixed(2)} | Bs {(cajaBalances.bs || 0).toFixed(0)}
                    </span>
                </div>

                {/* Promotions Toggle */}
                <button onClick={onTogglePromotions}
                    style={{ width: '100%', padding: '10px 16px', marginBottom: '12px', background: applyPromotions ? '#D8F3DC' : 'white', border: `2px solid ${applyPromotions ? '#52B788' : '#E9ECEF'}`, borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.2s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Tag size={16} color={applyPromotions ? '#1B4332' : '#BDC3C7'} />
                        <span style={{ fontSize: '11px', fontWeight: '900', color: applyPromotions ? '#1B4332' : '#95A5A6', textTransform: 'uppercase' }}>
                            {applyPromotions ? '✓ Promociones Activas' : 'Activar Promoción'}
                        </span>
                    </div>
                    <div style={{ width: '36px', height: '20px', borderRadius: '10px', background: applyPromotions ? '#52B788' : '#DEE2E6', position: 'relative', transition: 'background 0.2s' }}>
                        <div style={{ position: 'absolute', top: '2px', left: applyPromotions ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
                    </div>
                </button>

                {/* Main Cobrar Button */}
                <button
                    onClick={handleOpenCheckout}
                    disabled={cart.length === 0}
                    style={{
                        width: '100%',
                        background: cart.length === 0 ? '#DEE2E6' : '#27AE60',
                        color: 'white', border: 'none', borderRadius: '12px',
                        padding: '20px', fontSize: '15px', fontWeight: '900',
                        cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                        letterSpacing: '0.1em',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                        boxShadow: cart.length === 0 ? 'none' : '0 6px 16px rgba(39, 174, 96, 0.3)',
                        transition: 'all 0.2s'
                    }}
                >
                    🛒 COBRAR VENTA
                </button>
            </div>
        </div>
    );
}

export default CartCheckout;
