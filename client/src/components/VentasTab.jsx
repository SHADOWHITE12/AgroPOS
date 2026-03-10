import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { Package } from 'lucide-react';
import ProductGrid from './ProductGrid';
import CartCheckout from './CartCheckout';

/**
 * VentasTab — Main POS component.
 * Handles cart, promotions, multi-payment checkout, and persistence of credits/prepagos.
 */
function VentasTab({
    exchangeRate = 36.50,
    userRole = 'Admin',
    cajaBalances = { usd: 0, bs: 0 },
    onUpdateBalances,
    onRecordSale,
    products = [],
    setProducts,
    prepagos = [],
    setPrepagos,
    deudores = [],
    setDeudores,
    descuentos = { porMetodoPago: [], porVolumen: [] },
    hasAccess,
    movimientos = []
}) {
    const [cart, setCart] = useState([]);
    const [applyPromotions, setApplyPromotions] = useState(false);

    // ── PRICE CALCULATOR (same as ProductGrid) ──────────────────────────────
    const calcSalePrice = (costo, gananciaPct) => {
        if (!costo || !gananciaPct) return parseFloat(costo) || 0;
        const m = parseFloat(gananciaPct) / 100;
        if (m >= 1) return parseFloat(costo);
        return parseFloat(costo) / (1 - m);
    };

    // ── PROMOTIONS ───────────────────────────────────────────────────────────
    const cartWithPromotions = cart.map(item => {
        const product = products.find(p => p.id === item.id);
        if (!applyPromotions || !product || item.tipoVenta !== 'saco') {
            return { ...item, originalPrice: item.price };
        }
        const volDiscount = descuentos?.porVolumen?.find(v => v.idProducto === item.id);
        if (volDiscount && item.quantity >= volDiscount.cantidadMinima) {
            return { ...item, originalPrice: item.price, price: volDiscount.precioEspecial, isPromo: true };
        }
        return { ...item, originalPrice: item.price };
    });

    const subtotal = cartWithPromotions.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    // ── CART HANDLERS ────────────────────────────────────────────────────────
    const handleAddToCart = (product, isPrepago = false, cantidad = 1, porcionText = null, overrideUnit = 'Kg') => {
        if (!product) return;
        if (product.stock <= 0 && !isPrepago) {
            Swal.fire('Sin Stock', 'Este producto no tiene existencias disponibles.', 'warning');
            return;
        }

        const unitToUse = overrideUnit;
        let productPrice;
        if (unitToUse === 'Saco') {
            productPrice = calcSalePrice(product.price, product.gananciaSacoPct);
        } else {
            const costPerKg = product.price / (product.pesoPorSaco || 50);
            productPrice = calcSalePrice(costPerKg, product.gananciaKiloPct);
        }

        const stockMax = unitToUse === 'Saco' ? product.stock : product.stock * (product.pesoPorSaco || 50);

        const existingIdx = cart.findIndex(item =>
            item.id === product.id &&
            item.metric === unitToUse &&
            item.esPrepago === isPrepago &&
            item.porcion === porcionText
        );

        if (existingIdx !== -1) {
            const existing = cart[existingIdx];
            const newQty = existing.quantity + cantidad;
            if (isPrepago || newQty <= stockMax) {
                const newCart = [...cart];
                newCart[existingIdx] = { ...existing, quantity: newQty };
                setCart(newCart);
            } else {
                Swal.fire('Stock Insuficiente', `Solo quedan ${stockMax.toFixed(2)} ${unitToUse} de ${product.name}`, 'info');
            }
        } else {
            if (isPrepago || stockMax >= cantidad) {
                setCart([...cart, {
                    id: product.id,
                    name: product.name,
                    price: productPrice,
                    quantity: cantidad,
                    metric: unitToUse,
                    esPrepago: isPrepago,
                    porcion: porcionText,
                    tipoVenta: unitToUse === 'Saco' ? 'saco' : 'detal',
                    costoBase: product.price  // store base cost for profit metrics
                }]);
            } else {
                Swal.fire('Stock Insuficiente', `Solo quedan ${stockMax.toFixed(2)} ${unitToUse} de ${product.name}`, 'info');
            }
        }
    };

    const handleUpdateQuantity = (id, delta) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const newQty = item.quantity + delta;
                if (newQty <= 0) return null;
                if (delta > 0 && !item.esPrepago) {
                    const product = products.find(p => p.id === id);
                    if (product) {
                        const stockMax = item.metric === 'Saco' ? product.stock : product.stock * (product.pesoPorSaco || 50);
                        if (newQty > stockMax) {
                            Swal.fire('Límite de Stock', 'No puedes añadir más de lo disponible en inventario.', 'info');
                            return item;
                        }
                    }
                }
                return { ...item, quantity: newQty };
            }
            return item;
        }).filter(Boolean));
    };

    const handleClearCart = () => setCart([]);

    // ── CHECKOUT (called from CartCheckout after all abonos confirmed) ───────
    const handleCheckout = async ({ abonos, vueltoUsd, vueltoBs, clienteNombre: clienteFromModal, totalDiscount }) => {
        if (cart.length === 0) return;

        const totalVenta = subtotal; // already applies promotions via cartWithPromotions
        const hasPrepagos = cart.some(item => item.esPrepago);
        const hasCredito = abonos.some(a => a.esCredito);

        // Name is now enforced and validated inside CartCheckout modal
        const clienteNombre = clienteFromModal || 'Cliente Genérico';

        // ── UPDATE BALANCES ────────────────────────────────────────────────
        let usdDelta = 0;
        let bsDelta = 0;
        let digitalBsDelta = 0;

        abonos.forEach(ab => {
            if (ab.esCredito) return; // credit doesn't add to physical cash
            if (ab.metodo === 'Efectivo $') {
                usdDelta += ab.montoUsd;
            } else if (ab.metodo === 'Efectivo Bs') {
                bsDelta += ab.montoBs;
            } else if (['Pago Móvil', 'Punto', 'Biopago', 'Punto DB/CR'].includes(ab.metodo)) {
                // Digital payments (Pago Móvil, Punto, Biopago) don't enter physical gaveta but do update digital balances
                digitalBsDelta += (ab.montoBs || (ab.montoUsd * exchangeRate));
            }
        });

        // Subtract the vuelto given back
        usdDelta -= (vueltoUsd || 0);
        bsDelta -= (vueltoBs || 0);

        if (onUpdateBalances) onUpdateBalances(usdDelta, bsDelta, digitalBsDelta);

        // ── UPDATE INVENTORY ───────────────────────────────────────────────
        const newProducts = products.map(p => {
            const cartItems = cart.filter(ci => ci.id === p.id && !ci.esPrepago);
            if (cartItems.length === 0) return p;
            let totalToSubtract = 0;
            cartItems.forEach(ci => {
                totalToSubtract += ci.metric === 'Saco'
                    ? ci.quantity
                    : ci.quantity / (p.pesoPorSaco || 50);
            });
            return { ...p, stock: Math.max(0, p.stock - totalToSubtract) };
        });

        // ── PERSIST PREPAGOS ───────────────────────────────────────────────
        let newPrepagos = [...prepagos];
        cart.filter(i => i.esPrepago).forEach(item => {
            newPrepagos.push({
                id: Date.now() + Math.random(),
                cliente: clienteNombre,
                productoId: item.id,
                productoNombre: item.name,
                cantidad: item.quantity,
                metric: item.metric,
                montoUsd: item.price * item.quantity,
                fecha: new Date().toLocaleString(),
                estado: 'Pendiente'
            });
        });

        // ── PERSIST DEUDORES (Crédito) ─────────────────────────────────────
        let newDeudores = [...deudores];
        if (hasCredito) {
            const creditAbono = abonos.find(a => a.esCredito);
            newDeudores.push({
                id: Date.now(),
                cliente: clienteNombre,
                deudaUsd: creditAbono?.montoUsd || totalVenta,
                fecha: new Date().toISOString().split('T')[0],
                estado: 'Pendiente'
            });
        }

        // ── RECORD SALE ────────────────────────────────────────────────────
        if (onRecordSale) {
            onRecordSale({
                items: cartWithPromotions.map(item => ({
                    ...item,
                    costoBase: item.costoBase || products.find(p => p.id === item.id)?.price || 0
                })),
                exchangeRate,
                cliente: clienteNombre,
                esCredito: hasCredito,
                metodosPago: abonos.map(a => ({ metodo: a.metodo, monto: a.montoUsd, montoBs: a.montoBs })),
                vueltoUsd,
                vueltoBs,
                promocionesAplicadas: applyPromotions,
                descuentoMetodoPagoTotal: totalDiscount || 0
            });
        }

        // ── PUSH STATE CHANGES ─────────────────────────────────────────────
        setProducts(newProducts);
        setPrepagos(newPrepagos);
        if (setDeudores) setDeudores(newDeudores);
        setCart([]);

        Swal.fire({
            title: '¡Venta Procesada!',
            html: `
                <div style="font-family:sans-serif; text-align:left; font-size:13px; color:#2C3E50">
                    <div style="font-weight:800; font-size:20px; margin-bottom:8px; color:#1B4332">✓ Cobro Exitoso</div>
                    <div>Total: <strong>$${totalVenta.toFixed(2)}</strong> = Bs ${(totalVenta * exchangeRate).toLocaleString()}</div>
                    ${abonos.map(a => `<div style="color:#52B788">· ${a.metodo}: $${a.montoUsd.toFixed(2)}</div>`).join('')}
                    ${(vueltoUsd > 0 || vueltoBs > 0) ? `<div style="margin-top:6px;color:#E67E22">Vuelto: $${vueltoUsd.toFixed(2)} + Bs ${vueltoBs.toFixed(0)}</div>` : ''}
                    ${hasCredito ? `<div style="color:#E74C3C; margin-top:6px">📋 Deuda registrada a: ${clienteNombre}</div>` : ''}
                    ${hasPrepagos ? `<div style="color:#E67E22; margin-top:6px">📦 Prepago guardado para: ${clienteNombre}</div>` : ''}
                </div>`,
            icon: 'success',
            confirmButtonColor: '#1B4332',
            timer: 4000,
            timerProgressBar: true
        });
    };

    // ── RENDER ───────────────────────────────────────────────────────────────
    return (
        <div className="ventas-pos-layout">
            <section className="ventas-products-panel">
                <ProductGrid
                    products={products}
                    exchangeRate={exchangeRate}
                    movimientos={movimientos}
                    onAdd={(p, isPrepago, qty, porcion, unit) =>
                        handleAddToCart(p, isPrepago || false, qty || 1, porcion, unit || 'Saco')}
                />
            </section>

            <section className="ventas-cart-panel">
                <CartCheckout
                    cart={cartWithPromotions}
                    exchangeRate={exchangeRate}
                    onUpdateQuantity={handleUpdateQuantity}
                    onRemove={(id) => setCart(prev => prev.filter(i => i.id !== id))}
                    onClear={handleClearCart}
                    onCheckout={handleCheckout}
                    applyPromotions={applyPromotions}
                    onTogglePromotions={() => setApplyPromotions(p => !p)}
                    cajaBalances={cajaBalances}
                    descuentos={descuentos}
                />
            </section>
        </div>
    );
}

export default VentasTab;
