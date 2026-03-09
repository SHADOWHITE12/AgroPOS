import React, { useState } from 'react';
import Swal from 'sweetalert2';

function VentasTab({ exchangeRate = 36.50, userRole = 'Admin', cajaBalances = { usd: 0, bs: 0 }, onUpdateBalances, onRecordSale, products, setProducts, prepagos, setPrepagos, deudores, setDeudores, descuentos = { porMetodoPago: [], porVolumen: [] }, hasAccess }) {
    const [cajaResumenOpen, setCajaResumenOpen] = useState(false);
    const [selectedMethod, setSelectedMethod] = useState(null);
    const [abonos, setAbonos] = useState([]);
    const [currentMonto, setCurrentMonto] = useState('');
    const [vueltoData, setVueltoData] = useState(null);
    const [vueltoUsdInput, setVueltoUsdInput] = useState('');
    const [vueltoBsInput, setVueltoBsInput] = useState('');

    const [searchTerm, setSearchTerm] = useState('');
    const [ventasUnit, setVentasUnit] = useState('Kg'); // 'Kg' or 'Saco'
    const [cart, setCart] = useState([]); // Iniciar vacío
    const [isCreditoModalOpen, setIsCreditoModalOpen] = useState(false);
    const [creditoTipo, setCreditoTipo] = useState('generico'); // 'generico' o 'constante'
    const [creditoDatos, setCreditoDatos] = useState({ cliente: '', dias: '15' });

    const [applyPromotions, setApplyPromotions] = useState(false);

    // Mapeamos el carrito filtrando promociones por volumen automáticamente sobre ventas "Saco"
    const cartWithPromotions = cart.map(item => {
        if (!applyPromotions || item.tipoVenta !== 'saco') return { ...item, originalPrice: item.price };

        const volDiscount = descuentos.porVolumen.find(v => v.idProducto === item.id);
        if (volDiscount && item.quantity >= volDiscount.cantidadMinima) {
            return { ...item, originalPrice: item.price, price: volDiscount.precioEspecial, isPromo: true };
        }
        return { ...item, originalPrice: item.price };
    });

    const subtotal = cartWithPromotions.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const subtotalSacos = cartWithPromotions.filter(item => item.tipoVenta === 'saco').reduce((acc, item) => acc + (item.price * item.quantity), 0);

    // Descuento por método de pago basado en el máximo porcentaje de los métodos abonados o seleccionado
    const methodsInCheck = [...abonos.map(ab => ab.metodo)];
    if (selectedMethod) methodsInCheck.push(selectedMethod);

    const maxDescuentoPct = methodsInCheck.reduce((max, method) => {
        const regla = descuentos.porMetodoPago.find(m => m.metodo === method);
        return regla && regla.porcentaje > max ? regla.porcentaje : max;
    }, 0);

    const descuentoMetodoPagoUsd = applyPromotions ? (subtotalSacos * (maxDescuentoPct / 100)) : 0;
    const totalVenta = subtotal - descuentoMetodoPagoUsd; // Total dinámico

    const totalAbonado = abonos.reduce((acc, curr) => acc + curr.monto, 0);
    const saldoRestante = Math.max(0, totalVenta - totalAbonado);
    const isCobrarReady = saldoRestante < 0.01 && abonos.length > 0;

    const handleCalcPrice = (costo, gananciaPct) => {
        if (!costo || !gananciaPct) return costo || 0;
        const marginDecimal = parseFloat(gananciaPct) / 100;
        if (marginDecimal >= 1) return costo;
        return (parseFloat(costo) / (1 - marginDecimal));
    };

    const handleUpdateQuantity = (id, delta) => {
        setCart(cart.map(item => {
            if (item.id === id) {
                const newQty = item.quantity + delta;

                // Allow decreasing quantity
                if (delta < 0) {
                    return { ...item, quantity: newQty };
                }

                // For increasing, check stock (unless it's prepago)
                const product = products.find(p => p.id === id);
                if (product && !item.esPrepago) {
                    const stockMax = item.metric === 'Saco' ? product.stock : product.stock * (product.pesoPorSaco || 50);
                    if (newQty > stockMax) {
                        alert(`Stock Insuficiente.Solo hay ${stockMax} ${item.metric} disponibles.`);
                        return item; // Do not increase
                    }
                }

                return { ...item, quantity: newQty };
            }
            return item;
        }).filter(item => item.quantity > 0)); // Filter out items with 0 or less
    };

    const handleRemoveFromCart = (id) => {
        setCart(cart.filter(item => item.id !== id));
    };

    const handleClearCart = () => {
        setCart([]);
        setAbonos([]);
        setVueltoData(null);
        setCurrentMonto('');
        setSelectedMethod(null);
    };

    const handleAddToCart = (product, isPrepago = false, cantidad = 1, porcionText = null, overrideUnit = null) => {
        if (product.stock === 0 && !isPrepago) return;

        const unitToUse = overrideUnit || ventasUnit;

        let productPrice = 0;
        if (unitToUse === 'Saco') {
            const costOfSaco = product.price; // El precio base ya es por saco
            productPrice = handleCalcPrice(costOfSaco, product.gananciaSacoPct);
        } else {
            const costPerKg = product.price / (product.pesoPorSaco || 50);
            productPrice = handleCalcPrice(costPerKg, product.gananciaKiloPct);
        }

        const stockMax = unitToUse === 'Saco' ? product.stock : product.stock * (product.pesoPorSaco || 50);

        // Find existing item keeping the porcionText and prepago flag into account
        const existing = cart.find(item => item.id === product.id && item.metric === unitToUse && item.esPrepago === isPrepago && item.porcion === porcionText);

        if (existing) {
            if (isPrepago) {
                handleUpdateQuantity(product.id, cantidad);
            } else if (existing.quantity + cantidad <= stockMax) {
                handleUpdateQuantity(product.id, cantidad);
            } else {
                alert(`Stock Insuficiente. Solo hay ${stockMax} ${unitToUse} disponibles.`);
            }
        } else {
            if (isPrepago || stockMax >= cantidad) {
                setCart([...cart, { id: product.id, name: product.name, price: productPrice, quantity: cantidad, metric: unitToUse, esPrepago: isPrepago, porcion: porcionText, tipoVenta: unitToUse === 'Saco' ? 'saco' : 'detal' }]);
            } else {
                alert(`Stock Insuficiente. Solo hay ${stockMax} ${unitToUse} disponibles.`);
            }
        }
    };

    const handleAddAbono = () => {
        const valorIngresado = parseFloat(currentMonto);
        if (valorIngresado > 0 && selectedMethod) {
            let montoUsd = 0;
            let montoBs = 0;
            let fisicoUsd = 0;
            let fisicoBs = 0;

            if (selectedMethod === 'Efectivo $') {
                montoUsd = valorIngresado;
                montoBs = valorIngresado * exchangeRate;
                fisicoUsd = valorIngresado;
            } else {
                montoBs = valorIngresado;
                montoUsd = valorIngresado / exchangeRate;
                if (selectedMethod === 'Efectivo Bs') {
                    fisicoBs = valorIngresado;
                }
            }

            if (montoUsd > saldoRestante) {
                if (selectedMethod === 'Efectivo $' || selectedMethod === 'Efectivo Bs') {
                    // Calculamos el vuelto en USD
                    const vueltoUsd = montoUsd - saldoRestante;
                    setVueltoData({
                        entregado: valorIngresado,
                        moneda: selectedMethod,
                        vueltoUsd: vueltoUsd,
                        vueltoBs: vueltoUsd * exchangeRate
                    });
                    setVueltoUsdInput(0);
                    setVueltoBsInput(0);
                    // Añadir exactamente lo que resta a la caja (cuadre exacto)
                    setAbonos([...abonos, { id: Date.now(), metodo: selectedMethod, monto: saldoRestante, montoBs: saldoRestante * exchangeRate, fisicoUsd, fisicoBs }]);
                } else {
                    // Métodos digitales no deben dar vuelto, solo cubren hasta la deuda exacta
                    alert(`El pago digital supera la deuda($${montoUsd.toFixed(2)} > $${saldoRestante.toFixed(2)}).Se ajustará al saldo faltante exacto.`);
                    setAbonos([...abonos, { id: Date.now(), metodo: selectedMethod, monto: saldoRestante, montoBs: saldoRestante * exchangeRate, fisicoUsd: 0, fisicoBs: 0 }]);
                }
            } else {
                setAbonos([...abonos, { id: Date.now(), metodo: selectedMethod, monto: montoUsd, montoBs: montoBs, fisicoUsd, fisicoBs }]);
            }

            setCurrentMonto('');
            setSelectedMethod(null);
        }
    };

    const handleProcessSale = (usdOut = 0, bsOut = 0, isCredit = false) => {
        const hasPrepagos = cart.some(item => item.esPrepago);
        let clienteNombre = "Cliente Genérico";

        if (hasPrepagos) {
            clienteNombre = window.prompt("Esta venta incluye productos en PREPAGO (sin stock). Ingrese obligatoriamente el NOMBRE DEL CLIENTE para guardar el apartado:");
            if (!clienteNombre || clienteNombre.trim() === "") {
                alert("Debe ingresar un nombre de cliente para procesar ventas con Prepagos.");
                return; // Abort sale
            }
        }

        let usdDelta = 0;
        let bsDelta = 0;

        let digitalBsDelta = 0;

        abonos.forEach(ab => {
            usdDelta += ab.fisicoUsd || 0;
            bsDelta += ab.fisicoBs || 0;

            // Si no es un método de dinero en efectivo físico, se va al balance digital
            if (ab.metodo !== 'Efectivo $' && ab.metodo !== 'Efectivo Bs') {
                digitalBsDelta += ab.montoBs || 0;
            }
        });

        usdDelta -= usdOut;
        bsDelta -= bsOut;

        if (onUpdateBalances) {
            onUpdateBalances(usdDelta, bsDelta, digitalBsDelta);
        }

        // Registrar prepagos y restar stock
        let newPrepagos = [...prepagos];
        let newProducts = [...products];

        cart.forEach(item => {
            if (item.esPrepago) {
                newPrepagos.push({
                    id: Date.now() + Math.random(),
                    cliente: clienteNombre,
                    productoId: item.id,
                    productoNombre: item.name,
                    cantidad: item.quantity,
                    metric: item.metric,
                    fecha: new Date().toLocaleString(),
                    estado: 'Pendiente'
                });
            } else {
                // Restar stock
                const productIndex = newProducts.findIndex(p => p.id === item.id);
                if (productIndex !== -1) {
                    let qtyToSubtract = item.quantity;
                    if (item.metric === 'Kg') {
                        // Si vende por Kg, restamos la fracción del saco.
                        // Ej: 20kg de un saco de 40kg = 0.5 sacos.
                        let pesoSacoGlobal = newProducts[productIndex].pesoPorSaco || 50;
                        qtyToSubtract = item.quantity / pesoSacoGlobal;
                    }
                    // Si la métrica de venta es 'Saco', restamos la cantidad directamente.
                    newProducts[productIndex] = {
                        ...newProducts[productIndex],
                        stock: Math.max(0, newProducts[productIndex].stock - qtyToSubtract)
                    };
                }
            }
        });

        // Emitir registro de venta para estadísticas
        if (onRecordSale) {
            const saleData = {
                items: cart.map(item => {
                    const product = products.find(p => p.id === item.id) || {};
                    return {
                        id: item.id,
                        name: item.name,
                        quantity: item.quantity,
                        metric: item.metric,
                        price: item.price,
                        costoBase: product.costoBase || 0,
                        pesoPorSaco: product.pesoPorSaco || 50,
                        tipoVenta: item.tipoVenta
                    };
                }),
                exchangeRate: exchangeRate,
                cliente: clienteNombre,
                esCredito: isCredit,
                metodosPago: abonos.map(a => ({ metodo: a.metodo, monto: a.monto })),
                promocionesAplicadas: applyPromotions,
                descuentoMetodoPagoTotal: descuentoMetodoPagoUsd
            };
            onRecordSale(saleData);
        }

        setPrepagos(newPrepagos);
        setProducts(newProducts);

        if (!isCredit) {
            alert('Venta procesada con éxito.');
        }

        setCart([]);
        setAbonos([]);
        setVueltoData(null);
    };

    const handleRemoveAbono = (idToRemove) => {
        setAbonos(abonos.filter(a => a.id !== idToRemove));
    };

    // Subcomponente de grilla para manejar input local y popover
    const ProductRow = ({ product, exchangeRate, ventasUnit, onAddToCart }) => {
        const [cantidadInputs, setCantidadInputs] = useState(1);
        const [showCalc, setShowCalc] = useState(false);
        const [calcBs, setCalcBs] = useState('');
        const [porcionText, setPorcionText] = useState(null);

        let displayPriceUsd = 0;
        if (ventasUnit === 'Saco') {
            const costOfSaco = product.price; // El precio base ya es por saco
            displayPriceUsd = handleCalcPrice(costOfSaco, product.gananciaSacoPct);
        } else {
            const costPerKg = product.price / (product.pesoPorSaco || 50);
            displayPriceUsd = handleCalcPrice(costPerKg, product.gananciaKiloPct);
        }
        const displayPriceBs = displayPriceUsd * exchangeRate;

        const isOutOfStock = product.stock === 0;

        const handleCantidadChange = (val) => {
            setCantidadInputs(val);
            setPorcionText(null); // Resetea la porción si el usuario edita la cantidad a mano
        };

        const handleAplicarCalc = () => {
            if (calcBs && !isNaN(calcBs) && Number(calcBs) > 0) {
                const calcQty = Number(calcBs) / displayPriceBs;
                setCantidadInputs(parseFloat(calcQty.toFixed(3)));
                setPorcionText(`Porción de ${Number(calcBs).toFixed(2)} Bs`);
                setShowCalc(false);
                setCalcBs('');
            }
        };

        return (
            <div className="product-row hover:shadow-md hover:border-blue-200 transition-all bg-white rounded-xl flex items-center p-3 md:p-4 border border-slate-100 gap-3" style={{ opacity: isOutOfStock ? 0.7 : 1 }}>
                <div className="product-row-left flex-1" style={{ cursor: isOutOfStock ? 'not-allowed' : 'pointer', minWidth: '150px' }} onClick={() => onAddToCart(product, false, Number(cantidadInputs) || 1, porcionText)}>
                    <div className="product-row-icon text-xl md:text-2xl">{product.icon}</div>
                    <div className="flex flex-col">
                        <span className="font-bold text-slate-800 text-sm md:text-base leading-tight">{product.name}</span>
                        <span className="text-xs text-slate-500">${displayPriceUsd.toFixed(2)} / {ventasUnit}</span>
                    </div>
                </div>

                <div className="hidden sm:flex flex-col items-end min-w-[80px]">
                    <span className="font-bold text-slate-400 text-xs">STOCK</span>
                    <span className="font-black text-slate-700 text-sm">{product.stock.toFixed(2)}</span>
                </div>

                <div className="flex flex-col items-end min-w-[70px] md:min-w-[90px]">
                    <span className="text-blue-600 font-black text-sm md:text-lg">${displayPriceUsd.toFixed(2)}</span>
                    <span className="text-[10px] md:text-xs text-slate-400 font-bold">Bs {displayPriceBs.toFixed(2)}</span>
                </div>

                {/* Calculadora Flotante y Acciones */}
                <div className="flex gap-2 items-center">
                    <div className="flex items-center gap-1">
                        <input
                            type="number"
                            step="0.001"
                            min="0.001"
                            value={cantidadInputs}
                            onChange={(e) => handleCantidadChange(e.target.value)}
                            className="abono-input w-20"
                        />
                        <button
                            onClick={() => setShowCalc(!showCalc)}
                            className="p-2 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                            title="Calculadora por Monto"
                        >
                            🧮
                        </button>

                        {/* Popover */}
                        {showCalc && (
                            <div style={{
                                position: 'absolute',
                                bottom: 'calc(100% + 5px)',
                                right: 0,
                                background: 'white',
                                padding: '1rem',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                borderRadius: '8px',
                                zIndex: 10,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.5rem',
                                border: '1px solid var(--border-color)',
                                minWidth: '200px'
                            }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Vender por Monto (Bs)</span>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input
                                        type="number"
                                        placeholder="Ej. 200"
                                        value={calcBs}
                                        onChange={e => setCalcBs(e.target.value)}
                                        style={{ width: '100%', padding: '0.4rem', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                                        autoFocus
                                    />
                                    <button
                                        onClick={handleAplicarCalc}
                                        style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.4rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', flex: 1 }}
                                    >
                                        Aplicar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        className="product-row-btn-add flex items-center gap-2 h-10 px-4"
                        disabled={isOutOfStock}
                        onClick={() => onAddToCart(product, false, Number(cantidadInputs) || 1, porcionText)}
                        title={`Añadir como ${ventasUnit}`}
                    >
                        <span>➕</span> Añadir
                    </button>
                    <button
                        className="px-4 h-10 bg-orange-400 text-white font-bold rounded-lg hover:bg-orange-500 transition-colors text-xs"
                        onClick={() => onAddToCart(product, true, Number(cantidadInputs) || 1, porcionText)}
                        title="Vender sin stock como Prepago"
                    >
                        PREPAGO
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="ventas-container flex flex-col md:flex-row w-full h-full">
            {/* LEFT COLUMN: PRODUCTS */}
            <section className="products-column w-full md:w-[60%] lg:w-[65%] p-4 md:p-6 bg-slate-50 overflow-y-auto">
                <div className="search-wrapper mb-6">
                    <input
                        type="text"
                        className="search-input w-full p-4 pl-12 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none shadow-sm transition-all text-lg"
                        placeholder="Buscar producto..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl grayscale">
                        🔍
                    </div>
                </div>

                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Catálogo</h2>
                    <div className="flex bg-slate-200 p-1 rounded-xl gap-1">
                        <button
                            className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${ventasUnit === 'Kg' ? 'bg-white text-[#2ECC71] shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                            onClick={() => setVentasUnit('Kg')}
                        >
                            POR KILO
                        </button>
                        <button
                            className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${ventasUnit === 'Saco' ? 'bg-white text-[#2ECC71] shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                            onClick={() => setVentasUnit('Saco')}
                        >
                            POR SACO
                        </button>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(product => (
                        <ProductRow key={product.id} product={product} exchangeRate={exchangeRate} ventasUnit={ventasUnit} onAddToCart={handleAddToCart} />
                    ))}
                </div>
            </section>
            {/* RIGHT COLUMN: TICKET */}
            <section className="ticket-column w-full md:w-[40%] lg:w-[35%] bg-white border-l border-slate-200 flex flex-col h-auto md:h-screen overflow-hidden">
                <div className="p-4 md:p-6 border-b border-slate-100 flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-black text-slate-800 tracking-tight">Taller de Venta</h2>
                        <button
                            onClick={handleClearCart}
                            disabled={cart.length === 0 && abonos.length === 0}
                            className="px-3 py-1.5 bg-red-50 text-red-500 font-black rounded-lg hover:bg-red-500 hover:text-white transition-all text-[10px] tracking-widest uppercase disabled:opacity-30"
                        >
                            VACIAR
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <button
                            className={`flex-1 py-3 rounded-xl text-xs font-black transition-all border-2 ${applyPromotions ? 'bg-[#1B4332] border-[#1B4332] text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}
                            onClick={() => setApplyPromotions(!applyPromotions)}
                        >
                            {applyPromotions ? '✓ PROMOCIONES ACTIVAS' : 'APLICAR PROMOCIONES'}
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                    {cartWithPromotions.map(item => (
                        <div key={item.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col gap-3 shadow-sm">
                            <div className="flex justify-between items-start">
                                <div className="flex flex-col">
                                    <span className="font-black text-slate-800 text-sm">{item.name}</span>
                                    <span className="text-[10px] uppercase font-bold text-slate-400">
                                        {item.metric} @ ${item.price.toFixed(2)}
                                        {item.esPrepago && <span className="text-amber-500 ml-1"> (PREPAGO)</span>}
                                    </span>
                                </div>
                                <button onClick={() => handleRemoveFromCart(item.id)} className="text-red-400 hover:text-red-600">✕</button>
                            </div>

                            <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <button onClick={() => handleUpdateQuantity(item.id, -1)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">-</button>
                                    <span className="font-black text-slate-800 w-12 text-center">
                                        {Number.isInteger(item.quantity) ? item.quantity : item.quantity.toFixed(1)}
                                    </span>
                                    <button onClick={() => handleUpdateQuantity(item.id, 1)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">+</button>
                                </div>
                                <div className="text-right flex flex-col">
                                    <span className="font-black text-blue-600">Bs {(item.price * item.quantity * exchangeRate).toFixed(0)}</span>
                                    <span className="text-[10px] font-bold text-slate-400">${(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {cart.length === 0 && (
                        <div className="flex-1 flex flex-col items-center justify-center opacity-30 py-10">
                            <span className="text-6xl mb-4">🛒</span>
                            <span className="font-black text-slate-500 uppercase tracking-widest">Carrito Vacío</span>
                        </div>
                    )}
                </div>

                <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-200">
                    {/* Resumen de Caja Dinámico */}
                    <div className="mb-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-center cursor-pointer" onClick={() => setCajaResumenOpen(!cajaResumenOpen)}>
                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">💰 Gaveta</span>
                            <div className="flex items-center gap-2">
                                {!cajaResumenOpen && <span className="text-xs font-bold text-slate-700">${cajaBalances.usd.toFixed(2)} | Bs {cajaBalances.bs.toFixed(0)}</span>}
                                <span className={`text-[10px] transition-transform ${cajaResumenOpen ? 'rotate-180' : ''}`}>▼</span>
                            </div>
                        </div>
                        {cajaResumenOpen && (
                            <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Dólares</span>
                                    <span className="font-bold">${cajaBalances.usd.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Bolívares</span>
                                    <span className="font-bold">Bs {cajaBalances.bs.toFixed(2)}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between items-end mb-4">
                        <span className="text-slate-500 font-bold uppercase text-xs tracking-widest">Total</span>
                        <div className="text-right">
                            <div className="text-4xl font-black text-slate-800 leading-none">Bs {(totalVenta * exchangeRate).toFixed(0)}</div>
                            <div className="text-lg font-bold text-blue-600 mt-1">${totalVenta.toFixed(2)}</div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Método de Pago</span>
                        <div className="metodos-grid">
                            <button onClick={() => setSelectedMethod('Efectivo $')} className={`btn-pago btn-efectivo-usd ${selectedMethod === 'Efectivo $' ? 'active' : ''}`}>
                                <span className="icono">💵</span>
                                <span className="texto">USD</span>
                                <span className="subtexto">Efectivo</span>
                            </button>
                            <button onClick={() => setSelectedMethod('Efectivo Bs')} className={`btn-pago btn-efectivo-bs ${selectedMethod === 'Efectivo Bs' ? 'active' : ''}`}>
                                <span className="icono">💶</span>
                                <span className="texto">BS</span>
                                <span className="subtexto">Efectivo</span>
                            </button>
                            <button onClick={() => setSelectedMethod('Pago Móvil')} className={`btn-pago btn-pago-movil ${selectedMethod === 'Pago Móvil' ? 'active' : ''}`}>
                                <span className="icono">📱</span>
                                <span className="texto">P.M</span>
                                <span className="subtexto">Móvil</span>
                            </button>
                            <button onClick={() => setSelectedMethod('Punto')} className={`btn-pago btn-punto ${selectedMethod === 'Punto' ? 'active' : ''}`}>
                                <span className="icono">💳</span>
                                <span className="texto">PUNTO</span>
                                <span className="subtexto">Tarjeta</span>
                            </button>
                            <button onClick={() => setSelectedMethod('Biopago')} className={`btn-pago btn-biopago ${selectedMethod === 'Biopago' ? 'active' : ''}`}>
                                <span className="icono">🧬</span>
                                <span className="texto">BIO</span>
                                <span className="subtexto">Huella</span>
                            </button>
                            <button
                                onClick={() => { if (hasAccess('deudores', 'crear')) setIsCreditoModalOpen(true); }}
                                className={`btn-pago btn-fiar`}
                            >
                                <span className="icono">📝</span>
                                <span className="texto">FIAR</span>
                                <span className="subtexto">Crédito</span>
                            </button>
                        </div>
                    </div>

                    {/* Área de procesar pago */}
                    <div className="mt-4">
                        {selectedMethod && !isCobrarReady && (
                            <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 mb-2">
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        className="flex-1 p-2 rounded-lg border border-slate-300 font-bold"
                                        placeholder={selectedMethod === 'Efectivo $' ? "$ 0.00" : "Bs 0.00"}
                                        value={currentMonto}
                                        onChange={(e) => setCurrentMonto(e.target.value)}
                                    />
                                    <button onClick={handleAddAbono} className="bg-blue-600 text-white px-4 rounded-lg font-black">✓</button>
                                </div>
                            </div>
                        )}

                        {abonos.length > 0 && (
                            <div className="flex flex-col gap-1 mb-4">
                                {abonos.map(ab => (
                                    <div key={ab.id} className="flex justify-between items-center bg-blue-50 p-2 rounded-lg border border-blue-100 text-xs">
                                        <span className="font-bold text-blue-700">{ab.metodo}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="font-black">Bs {ab.montoBs.toFixed(0)}</span>
                                            <button onClick={() => handleRemoveAbono(ab.id)} className="text-blue-400 font-black">✕</button>
                                        </div>
                                    </div>
                                ))}
                                <div className="mt-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (totalAbonado / totalVenta) * 100)}%` }}></div>
                                </div>
                            </div>
                        )}

                        <button
                            disabled={cart.length === 0 || (saldoRestante > 0.01 && !isCobrarReady)}
                            onClick={() => handleProcessSale(0, 0)}
                            className={`btn-cobrar-final ${isCobrarReady ? 'ready' : ''}`}
                            style={{ height: '60px', fontSize: '1.25rem' }}
                        >
                            {isCobrarReady ? '🚀 COBRAR VENTA' : saldoRestante > 0 ? `FALTA Bs ${(saldoRestante * exchangeRate).toFixed(0)}` : 'COBRAR'}
                        </button>
                    </div>
                </div>
            </section>

            {/* Credito Modal Overlay */}
            {
                isCreditoModalOpen && (
                    <div className="modal-overlay activo">
                        <div className="modal-caja" style={{ maxWidth: '400px' }}>
                            <div className="modal-header-elite">
                                <h2>Aprobar Crédito</h2>
                            </div>
                            <div className="input-grupo-elite" style={{ padding: '12px 16px', background: 'var(--bg-color)', borderBottom: '1px solid var(--border-color)' }}>
                                <label style={{ fontSize: '0.85rem' }}>Tipo de Cliente</label>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                    <button onClick={() => { setCreditoTipo('generico'); setCreditoDatos({ ...creditoDatos, cliente: '' }); }} style={{ flex: 1, padding: '0.5rem', background: creditoTipo === 'generico' ? 'var(--primary)' : 'var(--white)', color: creditoTipo === 'generico' ? 'white' : 'var(--text-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600 }}>Genérico (Nuevo)</button>
                                    <button onClick={() => { setCreditoTipo('constante'); setCreditoDatos({ ...creditoDatos, cliente: '' }); }} style={{ flex: 1, padding: '0.5rem', background: creditoTipo === 'constante' ? 'var(--primary)' : 'var(--white)', color: creditoTipo === 'constante' ? 'white' : 'var(--text-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600 }}>Constante (Lista)</button>
                                </div>
                            </div>

                            {creditoTipo === 'constante' ? (
                                <div className="input-grupo-elite" style={{ padding: '12px 16px' }}>
                                    <label>👤 Seleccionar Cliente Frecuente</label>
                                    <select
                                        value={creditoDatos.cliente}
                                        onChange={(e) => setCreditoDatos({ ...creditoDatos, cliente: e.target.value })}
                                        style={{ width: '100%', padding: '10px', fontSize: '16px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-color)', marginTop: '0.5rem' }}
                                    >
                                        <option value="">-- Seleccionar --</option>
                                        <option value="Juan Pérez">Juan Pérez</option>
                                        <option value="Finca El Roble">Finca El Roble</option>
                                        <option value="María Rodríguez">María Rodríguez</option>
                                    </select>
                                </div>
                            ) : (
                                <div className="input-grupo-elite" style={{ padding: '12px 16px' }}>
                                    <label>👤 Nombre del Cliente / Cédula</label>
                                    <input
                                        type="text"
                                        placeholder="Ej. V-12345678 / Luis Gómez"
                                        value={creditoDatos.cliente}
                                        onChange={(e) => setCreditoDatos({ ...creditoDatos, cliente: e.target.value })}
                                        style={{ textAlign: 'left', fontSize: '16px' }}
                                    />
                                </div>
                            )}

                            <div className="input-grupo-elite" style={{ padding: '12px 16px' }}>
                                <label>📅 Días de Crédito (Plazo)</label>
                                <input
                                    type="number"
                                    placeholder="15"
                                    value={creditoDatos.dias}
                                    onChange={(e) => setCreditoDatos({ ...creditoDatos, dias: e.target.value })}
                                    style={{ textAlign: 'left', fontSize: '18px' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                                <button className="btn-usar-cierre" style={{ margin: 0 }} onClick={() => setIsCreditoModalOpen(false)}>Cancelar</button>
                                <button
                                    className="btn-abrir-elite"
                                    style={{ margin: 0, padding: '14px' }}
                                    disabled={!creditoDatos.cliente || !creditoDatos.dias}
                                    onClick={() => {
                                        alert(`Crédito aprobado para ${creditoDatos.cliente} por ${creditoDatos.dias} días.\nMonto enviado a Cuentas por Cobrar: $${saldoRestante.toFixed(2)} `);

                                        const newDeudor = {
                                            id: Date.now(),
                                            cliente: creditoDatos.cliente,
                                            deudaUsd: saldoRestante,
                                            fecha: new Date().toISOString().split('T')[0],
                                            estado: 'Pendiente',
                                            abonos: []
                                        };
                                        setDeudores([...(deudores || []), newDeudor]);

                                        handleProcessSale(0, 0, true);
                                        setIsCreditoModalOpen(false);
                                        setCreditoDatos({ cliente: '', dias: '15' });
                                    }}
                                >
                                    Aprobar Crédito
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Modal de Vuelto Inteligente Overlay */}
            {
                vueltoData && (
                    <div className="modal-overlay activo">
                        <div className="modal-caja" style={{ maxWidth: '450px', textAlign: 'center' }}>
                            <div className="modal-header-elite" style={{ background: 'var(--primary)' }}>
                                <h2>💰 VUELTO A ENTREGAR</h2>
                            </div>
                            <div style={{ padding: '1.5rem 2rem 2rem 2rem' }}>
                                <div style={{ fontSize: '1.1rem', marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
                                    El cliente entregó: <br />
                                    <strong style={{ fontSize: '1.8rem', color: 'var(--text-color)' }}>
                                        {vueltoData.moneda === 'Efectivo $' ? '$' : 'Bs'} {vueltoData.entregado.toFixed(2)}
                                    </strong>
                                </div>
                                <div style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '2px solid var(--primary)', marginBottom: '1.5rem', textAlign: 'center' }}>
                                    <div style={{ color: 'var(--primary)', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '1rem', textTransform: 'uppercase' }}>Vuelto a entregar</div>
                                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--text-color)', lineHeight: 1 }}>
                                        $ {vueltoData.vueltoUsd.toFixed(2)}
                                    </div>
                                    <div style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontWeight: 600 }}>
                                        (Equivalente a Bs {vueltoData.vueltoBs.toFixed(2)} @ {exchangeRate.toFixed(2)})
                                    </div>
                                </div>

                                <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
                                    <label style={{ fontSize: '0.9rem', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Vuelto entregado al cliente en USD ($):</label>
                                    <input
                                        type="number"
                                        value={vueltoUsdInput}
                                        onChange={(e) => setVueltoUsdInput(e.target.value)}
                                        style={{ width: '100%', padding: '10px', fontSize: '1.2rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-color)' }}
                                    />
                                </div>

                                <div style={{ textAlign: 'left' }}>
                                    <label style={{ fontSize: '0.9rem', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Vuelto entregado al cliente en Bs:</label>
                                    <input
                                        type="number"
                                        value={vueltoBsInput}
                                        onChange={(e) => setVueltoBsInput(e.target.value)}
                                        style={{ width: '100%', padding: '10px', fontSize: '1.2rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-color)' }}
                                    />
                                </div>

                                {/* Reactive Falta por entregar - Snippet Obligatorio */}
                                {(() => {
                                    const vueltoFaltanteUsd = vueltoData.vueltoUsd - (parseFloat(vueltoUsdInput) || 0) - ((parseFloat(vueltoBsInput) || 0) / exchangeRate);
                                    const tasaGlobal = exchangeRate;
                                    return vueltoFaltanteUsd > 0 && (
                                        <div className="mt-4 p-4 bg-red-100 border-2 border-red-500 text-red-700 rounded-xl text-center font-black text-lg">
                                            Falta por entregar: Bs {(vueltoFaltanteUsd * tasaGlobal).toFixed(2)} <br />
                                            <span className="text-sm font-normal">(Ref: ${vueltoFaltanteUsd.toFixed(2)})</span>
                                        </div>
                                    );
                                })()}

                                <button
                                    className="btn-abrir-elite exito"
                                    style={{ marginTop: '2rem', fontSize: '1.2rem', padding: '1rem', width: '100%' }}
                                    onClick={() => handleProcessSale(parseFloat(vueltoUsdInput) || 0, parseFloat(vueltoBsInput) || 0)}
                                >
                                    ✓ CONFIRMAR Y COBRAR
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}

export default VentasTab;
