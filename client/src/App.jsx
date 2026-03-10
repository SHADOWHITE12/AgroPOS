import React, { useState, useEffect, useCallback } from 'react';
import VentasTab from './components/VentasTab';
import CajaTab from './components/CajaTab';
import DeudoresView from './components/DeudoresView';
import PrepagosView from './components/PrepagosView';
import InventoryView from './components/InventoryView';
import StatsView from './components/StatsView';
import PromocionesView from './components/PromocionesView';
import Login from './components/Login';
import AjustesView from './components/AjustesView';
import MiPerfilView from './components/MiPerfilView';
import CierreModal from './components/CierreModal';
import { AperturaModal, Toast } from './components/CajaModals';
import { supabase } from './lib/supabaseClient';
import {
  ShoppingCart, Wallet, Package, Users,
  Tag, Gift, BarChart3, Settings, User, LogOut, Menu, ChevronDown
} from 'lucide-react';
import './index.css';

// ─── HELPERS ─────────────────────────────────────────────────────────────────

// Calcula ganancia neta de un movimiento dado el costo y precio de venta
function calcGananciaNeta(movimientos) {
  return movimientos.reduce((acc, m) => acc + (m.ganancia_neta_venta || m.gananciaNetaVenta || 0), 0);
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('ventas');

  // Persistencia de sesión
  const savedCaja = JSON.parse(localStorage.getItem('agro_caja') || '{}');
  const savedUserStr = localStorage.getItem('agro_currentUser');
  const savedUser = savedUserStr ? JSON.parse(savedUserStr) : null;

  const [currentUser, setCurrentUser] = useState(savedUser);
  const [isCajaAbierta, setIsCajaAbierta] = useState(savedCaja.isCajaAbierta || false);
  const [isAperturaOpen, setIsAperturaOpen] = useState(false);
  const [isCierreOpen, setIsCierreOpen] = useState(false);
  const [notification, setNotification] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(savedCaja.exchangeRate || 0);
  const [cajaBalances, setCajaBalances] = useState(savedCaja.cajaBalances || { usd: 0, bs: 0, digitalBs: 0, inicialUsd: 0, inicialBs: 0 });
  const [ultimoCierre, setUltimoCierre] = useState(savedCaja.ultimoCierre || new Date(0).toISOString());

  const [products, setProducts] = useState([]);
  const [prepagos, setPrepagos] = useState([]);
  const [deudores, setDeudores] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [historialTasas, setHistorialTasas] = useState([]);
  const [historialCapital, setHistorialCapital] = useState([]);
  const [descuentos, setDescuentos] = useState({ porMetodoPago: [], porVolumen: [] });
  const [metricasGlobales, setMetricasGlobales] = useState({ totalMayor: 0, totalDetal: 0, gananciaNeta: 0 });
  const [metricasMetodos, setMetricasMetodos] = useState({
    'Punto': { bruto: 0, comision: 0, neto: 0 },
    'Biopago': { bruto: 0, comision: 0, neto: 0 }
  });

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // ─── CARGA INICIAL DESDE SUPABASE ─────────────────────────────────────────

  useEffect(() => {
    document.title = 'agro';
    if (!currentUser) return;

    const loadInitialData = async () => {
      // Productos
      const { data: prods } = await supabase.from('productos').select('*');
      if (prods) setProducts(prods);

      // Prepagos
      const { data: prepagoRows } = await supabase.from('prepagos').select('*');
      if (prepagoRows) setPrepagos(prepagoRows);

      // Deudores
      const { data: deudoresRows } = await supabase.from('deudores').select('*');
      if (deudoresRows) setDeudores(deudoresRows);

      // Historial de ventas (movimientos)
      const { data: movRows } = await supabase.from('historial_ventas').select('*').order('created_at', { ascending: false });
      if (movRows) setMovimientos(movRows.map(r => ({
        ...r,
        fechaHora: r.fecha_hora || r.created_at,
        gananciaNetaVenta: r.ganancia_neta_venta || 0,
        totalPagado: r.total_pagado || 0,
        metodoPago: r.metodo_pago || [],
        productos: r.productos || [],
      })));

      // Caja diaria
      const { data: cajaRows } = await supabase.from('caja_diaria').select('*').eq('id', 1).limit(1);
      if (cajaRows && cajaRows[0]) {
        const c = cajaRows[0];
        const balances = { usd: c.efectivo_usd || 0, bs: c.efectivo_bs || 0, digitalBs: c.digital_bs || 0, inicialUsd: c.inicial_usd || 0, inicialBs: c.inicial_bs || 0 };
        setCajaBalances(balances);
        setExchangeRate(c.tasa_cambio || 0);
        setIsCajaAbierta(c.estado === 'abierta');
        if (c.estado !== 'abierta' && (currentUser?.rol_nombre === 'Administrador' || currentUser?.rol === 'admin')) {
          setIsAperturaOpen(true);
        }
      }

      // Último cierre
      const { data: cierreRows } = await supabase.from('cierres_caja').select('created_at').order('created_at', { ascending: false }).limit(1);
      if (cierreRows && cierreRows[0]) {
        setUltimoCierre(cierreRows[0].created_at);
      }

      // Configuracion descuentos
      const { data: descRows } = await supabase.from('configuracion_descuentos').select('*').limit(1);
      if (descRows && descRows[0]) {
        setDescuentos({
          porMetodoPago: descRows[0].por_metodo_pago || [],
          porVolumen: descRows[0].por_volumen || []
        });
      }
    };

    loadInitialData();

    // ─── SUPABASE REALTIME SUBSCRIPTIONS ──────────────────────────────────
    const channel = supabase
      .channel('agro-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, () => {
        supabase.from('productos').select('*').then(({ data }) => { if (data) setProducts(data); });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prepagos' }, () => {
        supabase.from('prepagos').select('*').then(({ data }) => { if (data) setPrepagos(data); });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deudores' }, () => {
        supabase.from('deudores').select('*').then(({ data }) => { if (data) setDeudores(data); });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'historial_ventas' }, (payload) => {
        const r = payload.new;
        const m = { ...r, fechaHora: r.fecha_hora || r.created_at, gananciaNetaVenta: r.ganancia_neta_venta || 0, totalPagado: r.total_pagado || 0, metodoPago: r.metodo_pago || [], productos: r.productos || [] };
        setMovimientos(prev => [m, ...prev]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'caja_diaria' }, (payload) => {
        const c = payload.new;
        setCajaBalances({ usd: c.efectivo_usd || 0, bs: c.efectivo_bs || 0, digitalBs: c.digital_bs || 0, inicialUsd: c.inicial_usd || 0, inicialBs: c.inicial_bs || 0 });
        setExchangeRate(c.tasa_cambio || 0);
        setIsCajaAbierta(c.estado === 'abierta');
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cierres_caja' }, (payload) => {
        setUltimoCierre(payload.new.created_at);
        setCajaBalances({ usd: 0, bs: 0, digitalBs: 0, inicialUsd: 0, inicialBs: 0 });
        setIsCajaAbierta(false);
        setIsAperturaOpen(currentUser?.rol_nombre === 'Administrador' || currentUser?.rol === 'admin');
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser]);

  // ─── HANDLERS ─────────────────────────────────────────────────────────────

  const handleSetProducts = useCallback(async (newProducts) => {
    setProducts(newProducts);
    // Upsert cada producto modificado
    for (const p of newProducts) {
      await supabase.from('productos').upsert({ ...p }, { onConflict: 'id' });
    }
  }, []);

  const handleSetPrepagos = useCallback(async (newPrepagos) => {
    setPrepagos(newPrepagos);
    await supabase.from('prepagos').upsert(newPrepagos, { onConflict: 'id' });
  }, []);

  const handleSetDeudores = useCallback(async (newDeudores) => {
    setDeudores(newDeudores);
    await supabase.from('deudores').upsert(newDeudores, { onConflict: 'id' });
  }, []);

  const handleRecordSale = useCallback(async (saleData) => {
    // Insertar venta en historial_ventas
    const row = {
      fecha_hora: saleData.fechaHora || new Date().toISOString(),
      productos: saleData.productos || [],
      total_pagado: saleData.totalPagado || 0,
      ganancia_neta_venta: saleData.gananciaNetaVenta || 0,
      metodo_pago: saleData.metodoPago || [],
      tipo_venta: saleData.tipoVenta || 'Venta',
      cliente: saleData.cliente || null,
    };
    const { error } = await supabase.from('historial_ventas').insert(row);
    if (error) console.error('[RecordSale] Error:', error);
  }, []);

  const handleSetDescuentos = useCallback(async (newDescuentos) => {
    setDescuentos(newDescuentos);
    await supabase.from('configuracion_descuentos').upsert({
      id: 1,
      por_metodo_pago: newDescuentos.porMetodoPago,
      por_volumen: newDescuentos.porVolumen
    }, { onConflict: 'id' });
  }, []);

  const handleUpdateBalances = useCallback(async (usdDelta, bsDelta, digitalBsDelta = 0) => {
    setCajaBalances(prev => {
      const newBalances = { ...prev, usd: prev.usd + usdDelta, bs: prev.bs + bsDelta, digitalBs: prev.digitalBs + digitalBsDelta };
      localStorage.setItem('agro_caja', JSON.stringify({ isCajaAbierta: true, exchangeRate, cajaBalances: newBalances }));
      // Actualizar en Supabase
      supabase.from('caja_diaria').update({ efectivo_usd: newBalances.usd, efectivo_bs: newBalances.bs, digital_bs: newBalances.digitalBs }).eq('id', 1);
      return newBalances;
    });
  }, [exchangeRate]);

  const handleAperturaConfirm = useCallback(async (datos) => {
    const inUsd = datos.usd || 0;
    const inBs = datos.bs || 0;
    const newBalances = { usd: inUsd, bs: inBs, digitalBs: 0, inicialUsd: inUsd, inicialBs: inBs };
    setIsAperturaOpen(false);
    setIsCajaAbierta(true);
    setExchangeRate(datos.tasa);
    setCajaBalances(newBalances);
    localStorage.setItem('agro_caja', JSON.stringify({ isCajaAbierta: true, exchangeRate: datos.tasa, cajaBalances: newBalances }));
    // Persistir en Supabase
    await supabase.from('caja_diaria').upsert({
      id: 1,
      estado: 'abierta',
      tasa_cambio: datos.tasa,
      efectivo_usd: inUsd,
      efectivo_bs: inBs,
      digital_bs: 0,
      inicial_usd: inUsd,
      inicial_bs: inBs,
    }, { onConflict: 'id' });
    showNotification(`✓ Caja abierta con tasa Bs ${datos.tasa.toFixed(2)}`);
  }, []);

  const handleCerrarJornada = useCallback(async () => {
    setIsCierreOpen(false);

    // Calcular totales del turno actual
    const turnoMovimientos = movimientos.filter(m => m.fechaHora && new Date(m.fechaHora) > new Date(ultimoCierre));
    let turnoGanancia = 0, turnoMayor = 0, turnoDetal = 0, turnoTotal = 0;
    const metodosPagoTotales = {};
    turnoMovimientos.forEach(m => {
      turnoGanancia += (m.gananciaNetaVenta || 0);
      turnoTotal += (m.totalPagado || 0);
      m.productos?.forEach(p => { if (p.tipoVenta === 'saco') turnoMayor += p.quantity; else turnoDetal += p.quantity; });
      m.metodoPago?.forEach(mp => { const k = mp.metodo || 'Otro'; metodosPagoTotales[k] = (metodosPagoTotales[k] || 0) + (mp.monto || 0); });
    });

    // Guardar cierre en Supabase (el Realtime listener actualizará el estado)
    await supabase.from('cierres_caja').insert({
      ganancia_neta: turnoGanancia,
      total_pagado: turnoTotal,
      total_mayor: turnoMayor,
      total_detal: turnoDetal,
      metodos_pago: metodosPagoTotales,
    });

    // Resetear caja en Supabase
    await supabase.from('caja_diaria').update({
      estado: 'cerrada',
      efectivo_usd: 0, efectivo_bs: 0, digital_bs: 0,
      inicial_usd: 0, inicial_bs: 0,
    }).eq('id', 1);

    setIsCajaAbierta(false);
    setCajaBalances({ usd: 0, bs: 0, digitalBs: 0, inicialUsd: 0, inicialBs: 0 });
    setMetricasGlobales({ totalMayor: 0, totalDetal: 0, gananciaNeta: 0 });
    setMetricasMetodos({ 'Punto': { bruto: 0, comision: 0, neto: 0 }, 'Biopago': { bruto: 0, comision: 0, neto: 0 } });
    setIsAperturaOpen(currentUser?.rol_nombre === 'Administrador' || currentUser?.rol === 'admin');
    setActiveTab('ventas');
    showNotification('Jornada Cerrada Correctamente');
  }, [movimientos, ultimoCierre, currentUser]);

  const handleLoginComplete = (user) => {
    localStorage.setItem('agro_currentUser', JSON.stringify(user));
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('agro_currentUser');
    setCurrentUser(null);
    setIsProfileOpen(false);
  };

  const handleCajaButtonClick = () => {
    if (isCajaAbierta) setActiveTab('caja');
    else setIsAperturaOpen(true);
  };

  if (!currentUser) return <Login onLoginComplete={handleLoginComplete} />;

  const userRole = currentUser.rol_nombre || 'Desconocido';
  const hasAccess = (modulo, accion = 'leer') => {
    if (!currentUser?.permisos) return false;
    const moduloPermisos = currentUser.permisos[modulo];
    if (!moduloPermisos) return false;
    return moduloPermisos[accion] === true;
  };

  return (
    <div className="app-wrapper">
      {/* ── TOP NAV BAR ──────────────────────────────────────────────────── */}
      <nav className="main-nav">
        <div className="brand">
          <Package size={26} className="text-[#52B788]" />
          <span>agro</span>
        </div>

        <div className="nav-links nav-links-desktop">
          {hasAccess('ventas') && (<div className={`nav-link ${activeTab === 'ventas' ? 'active' : ''}`} onClick={() => setActiveTab('ventas')}><ShoppingCart size={14} className="mr-1.5 inline" />VENTAS</div>)}
          {hasAccess('caja') && (<div className={`nav-link ${activeTab === 'caja' ? 'active' : ''}`} onClick={handleCajaButtonClick}><Wallet size={14} className="mr-1.5 inline" />CAJA</div>)}
          {hasAccess('inventario') && (<div className={`nav-link ${activeTab === 'inventario' ? 'active' : ''}`} onClick={() => setActiveTab('inventario')}><Package size={14} className="mr-1.5 inline" />INV.</div>)}
          {hasAccess('deudores') && (<div className={`nav-link ${activeTab === 'deudores' ? 'active' : ''}`} onClick={() => setActiveTab('deudores')}><Users size={14} className="mr-1.5 inline" />DEUD.</div>)}
          {hasAccess('prepagos') && (<div className={`nav-link ${activeTab === 'prepagos' ? 'active' : ''}`} onClick={() => setActiveTab('prepagos')}><Tag size={14} className="mr-1.5 inline" />PREP.</div>)}
          {hasAccess('promociones') && (<div className={`nav-link ${activeTab === 'promociones' ? 'active' : ''}`} onClick={() => setActiveTab('promociones')}><Gift size={14} className="mr-1.5 inline" />PROM.</div>)}
          {hasAccess('estadisticas') && (<div className={`nav-link ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}><BarChart3 size={14} className="mr-1.5 inline" />ESTAD.</div>)}
        </div>

        <div className="nav-right flex items-center gap-3">
          <button className="hamburger-btn md:hidden" onClick={() => setIsSidebarOpen(true)}><Menu size={22} /></button>
          {hasAccess('caja') && (
            <button className={`btn-inicio-caja ${isCajaAbierta ? 'abierta' : 'pulse'}`} onClick={handleCajaButtonClick}>
              <span className="icono-dinero">💰</span>
              {isCajaAbierta ? 'CAJA ABIERTA' : 'ABRIR CAJA'}
            </button>
          )}
          <div className="user-profile-container">
            <div className="user-profile" onClick={() => setIsProfileOpen(!isProfileOpen)}>
              <div className="user-info hidden sm:block">
                <div className="user-role">{currentUser?.rol_nombre || currentUser?.rol || 'Usuario'}</div>
                <div className="user-tasa">Bs {exchangeRate.toFixed(2)}</div>
              </div>
              <div className="user-avatar">{(currentUser?.rol_nombre || currentUser?.rol || 'U').charAt(0)}</div>
              <ChevronDown size={14} className={`transition-transform text-white/60 ${isProfileOpen ? 'rotate-180' : ''}`} />
            </div>
            {isProfileOpen && (
              <div className="profile-dropdown">
                <div className="dropdown-header">
                  <div className="font-black text-slate-800 uppercase tracking-tighter">{currentUser?.nombre}</div>
                  <div className="text-xs text-slate-400 font-bold">@{currentUser?.username}</div>
                </div>
                <div className="dropdown-item" onClick={() => { setActiveTab('miperfil'); setIsProfileOpen(false); }}><User size={15} className="text-slate-400" /> Mi Perfil</div>
                {(hasAccess('ajustes') || currentUser?.rol_nombre === 'Administrador' || currentUser?.rol === 'admin') && (
                  <div className="dropdown-item" onClick={() => { setActiveTab('ajustes'); setIsProfileOpen(false); }}><Settings size={15} className="text-slate-400" /> Ajustes</div>
                )}
                <div className="dropdown-item danger" onClick={handleLogout}><LogOut size={15} /> Cerrar Sesión</div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ── MOBILE SIDEBAR ───────────────────────────────────────────────── */}
      <div className={`sidebar-overlay ${isSidebarOpen ? 'visible' : ''}`} onClick={() => setIsSidebarOpen(false)} />
      <div className={`mobile-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="mobile-sidebar-header">
          <span className="font-bold text-xl">Menú</span>
          <button onClick={() => setIsSidebarOpen(false)} className="text-2xl">&times;</button>
        </div>
        <div className="flex flex-col gap-1 p-2">
          {hasAccess('ventas') && (<div className={`mobile-nav-item ${activeTab === 'ventas' ? 'active' : ''}`} onClick={() => { setActiveTab('ventas'); setIsSidebarOpen(false); }}><ShoppingCart size={18} /> VENTAS</div>)}
          {hasAccess('caja') && (<div className={`mobile-nav-item ${activeTab === 'caja' ? 'active' : ''}`} onClick={() => { handleCajaButtonClick(); setIsSidebarOpen(false); }}><Wallet size={18} /> CAJA</div>)}
          {hasAccess('inventario') && (<div className={`mobile-nav-item ${activeTab === 'inventario' ? 'active' : ''}`} onClick={() => { setActiveTab('inventario'); setIsSidebarOpen(false); }}><Package size={18} /> INVENTARIO</div>)}
          {hasAccess('deudores') && (<div className={`mobile-nav-item ${activeTab === 'deudores' ? 'active' : ''}`} onClick={() => { setActiveTab('deudores'); setIsSidebarOpen(false); }}><Users size={18} /> DEUDORES</div>)}
          {hasAccess('prepagos') && (<div className={`mobile-nav-item ${activeTab === 'prepagos' ? 'active' : ''}`} onClick={() => { setActiveTab('prepagos'); setIsSidebarOpen(false); }}><Tag size={18} /> PREPAGOS</div>)}
          {hasAccess('promociones') && (<div className={`mobile-nav-item ${activeTab === 'promociones' ? 'active' : ''}`} onClick={() => { setActiveTab('promociones'); setIsSidebarOpen(false); }}><Gift size={18} /> PROMOCIONES</div>)}
          {hasAccess('estadisticas') && (<div className={`mobile-nav-item ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => { setActiveTab('stats'); setIsSidebarOpen(false); }}><BarChart3 size={18} /> ESTADÍSTICAS</div>)}
        </div>
      </div>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
      <main className="main-content">
        {activeTab === 'ventas' && hasAccess('ventas') && <VentasTab exchangeRate={exchangeRate} userRole={userRole} cajaBalances={cajaBalances} onUpdateBalances={handleUpdateBalances} onRecordSale={handleRecordSale} products={products} setProducts={handleSetProducts} prepagos={prepagos} setPrepagos={handleSetPrepagos} deudores={deudores} setDeudores={handleSetDeudores} descuentos={descuentos} hasAccess={hasAccess} movimientos={movimientos} />}
        {activeTab === 'caja' && hasAccess('caja') && <CajaTab cajaBalances={cajaBalances} exchangeRate={exchangeRate} userRole={userRole} onOpenCierre={() => setIsCierreOpen(true)} onUpdateBalances={handleUpdateBalances} metricasGlobales={metricasGlobales} metricasMetodos={metricasMetodos} movimientos={movimientos} hasAccess={hasAccess} ultimoCierre={ultimoCierre} />}
        {activeTab === 'inventario' && hasAccess('inventario') && <InventoryView products={products} setProducts={handleSetProducts} exchangeRate={exchangeRate} prepagos={prepagos} setPrepagos={handleSetPrepagos} hasAccess={hasAccess} movimientos={movimientos} />}
        {activeTab === 'deudores' && hasAccess('deudores') && <DeudoresView exchangeRate={exchangeRate} deudores={deudores} setDeudores={handleSetDeudores} userRole={userRole} hasAccess={hasAccess} />}
        {activeTab === 'prepagos' && hasAccess('prepagos') && <PrepagosView prepagos={prepagos} setPrepagos={handleSetPrepagos} userRole={userRole} hasAccess={hasAccess} />}
        {activeTab === 'promociones' && hasAccess('promociones') && <PromocionesView descuentos={descuentos} setDescuentos={handleSetDescuentos} products={products} userRole={userRole} hasAccess={hasAccess} />}
        {activeTab === 'stats' && hasAccess('estadisticas') && <StatsView products={products} movimientos={movimientos} deudores={deudores} cajaBalances={cajaBalances} exchangeRate={exchangeRate} historialTasas={historialTasas} historialCapital={historialCapital} hasAccess={hasAccess} />}
        {activeTab === 'ajustes' && (hasAccess('ajustes') || currentUser?.rol_nombre === 'Administrador' || currentUser?.rol === 'admin') && <AjustesView currentUser={currentUser} />}
        {activeTab === 'miperfil' && <MiPerfilView currentUser={currentUser} onProfileUpdate={(u) => { setCurrentUser(u); localStorage.setItem('agro_currentUser', JSON.stringify(u)); }} />}
      </main>

      <AperturaModal isOpen={isAperturaOpen} onConfirm={handleAperturaConfirm} />
      <CierreModal isOpen={isCierreOpen} onClose={() => setIsCierreOpen(false)} exchangeRate={exchangeRate} cajaBalances={cajaBalances} movimientos={movimientos} onConfirmCierre={handleCerrarJornada} />
      {notification && <Toast message={notification} type="success" />}
    </div>
  );
}

export default App;