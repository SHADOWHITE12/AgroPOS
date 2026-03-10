import React, { useState, useEffect } from 'react';
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
import socket from './socket';
import {
  ShoppingCart,
  Wallet,
  Package,
  Users,
  Tag,
  Gift,
  BarChart3,
  Settings,
  User,
  LogOut,
  Menu,
  ChevronDown
} from 'lucide-react';
import './index.css';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('ventas');

  // Persistencia de Sesión
  const savedCaja = JSON.parse(localStorage.getItem('agro_caja') || '{}');
  const savedRole = localStorage.getItem('agro_userRole');
  const savedUserStr = localStorage.getItem('agro_currentUser');
  const savedUser = savedUserStr ? JSON.parse(savedUserStr) : null;

  const [currentUser, setCurrentUser] = useState(savedUser);
  const [isCajaAbierta, setIsCajaAbierta] = useState(savedCaja.isCajaAbierta || false);
  const [isAperturaOpen, setIsAperturaOpen] = useState(!savedCaja.isCajaAbierta && (savedUser?.rol_nombre === 'Administrador' || savedUser?.rol === 'admin'));
  const [isCierreOpen, setIsCierreOpen] = useState(false);
  const [notification, setNotification] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(savedCaja.exchangeRate || 0);
  const [cajaBalances, setCajaBalances] = useState(savedCaja.cajaBalances || { usd: 0, bs: 0, digitalBs: 0, inicialUsd: 0, inicialBs: 0 });

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
  // ultimoCierre: timestamp del último Cierre Z (usado para filtrar métricas del turno actual en CajaTab)
  const [ultimoCierre, setUltimoCierre] = useState(savedCaja.ultimoCierre || new Date(0).toISOString());

  useEffect(() => {
    document.title = "agro";

    socket.on('initial_state', (state) => {
      setProducts(state.products);
      setPrepagos(state.prepagos);
      setDeudores(state.deudores || []);
      setMovimientos(state.movimientos || []);
      setHistorialTasas(state.historialTasas || []);
      setHistorialCapital(state.historialCapital || []);
      if (state.configuracionDescuentos) setDescuentos(state.configuracionDescuentos);
      if (state.metricasGlobales) setMetricasGlobales(state.metricasGlobales);
      if (state.metricasMetodos) setMetricasMetodos(state.metricasMetodos);
      setExchangeRate(state.exchangeRate);
      setCajaBalances(state.cajaBalances);
      setIsCajaAbierta(state.isCajaAbierta);
      setIsAperturaOpen(!state.isCajaAbierta && currentUser?.rol === 'admin');
      if (state.ultimoCierre) setUltimoCierre(state.ultimoCierre);
      localStorage.setItem('agro_caja', JSON.stringify({
        isCajaAbierta: state.isCajaAbierta,
        exchangeRate: state.exchangeRate,
        cajaBalances: state.cajaBalances,
        ultimoCierre: state.ultimoCierre || new Date(0).toISOString()
      }));
    });

    socket.on('products_updated', (newProducts) => setProducts(newProducts));
    socket.on('prepagos_updated', (newPrepagos) => setPrepagos(newPrepagos));
    socket.on('deudores_updated', (newDeudores) => setDeudores(newDeudores));
    socket.on('movimientos_updated', (newMovimientos) => setMovimientos(newMovimientos));
    socket.on('descuentos_updated', (newDescuentos) => setDescuentos(newDescuentos));
    socket.on('metricas_updated', ({ metricasGlobales: newGlobales, metricasMetodos: newMetodos }) => {
      if (newGlobales) setMetricasGlobales(newGlobales);
      if (newMetodos) setMetricasMetodos(newMetodos);
    });
    socket.on('caja_updated', (fullState) => {
      setCajaBalances(fullState.cajaBalances);
      setExchangeRate(fullState.exchangeRate);
      setIsCajaAbierta(fullState.isCajaAbierta);
      setHistorialTasas(fullState.historialTasas || []);
      setHistorialCapital(fullState.historialCapital || []);
      localStorage.setItem('agro_caja', JSON.stringify({
        isCajaAbierta: fullState.isCajaAbierta,
        exchangeRate: fullState.exchangeRate,
        cajaBalances: fullState.cajaBalances
      }));
      if (fullState.isCajaAbierta) setIsAperturaOpen(false);
    });
    socket.on('caja_cerrada', (data) => {
      setCajaBalances(data.cajaBalances);
      setIsCajaAbierta(data.isCajaAbierta);
      // setMovimientos([]); // Se conserva el historial para estadísticas
      if (data.metricasGlobales) setMetricasGlobales(data.metricasGlobales);
      if (data.metricasMetodos) setMetricasMetodos(data.metricasMetodos);
      // Actualizar el ultimoCierre para que CajaTab filtre solo el nuevo turno
      if (data.ultimoCierre) {
        setUltimoCierre(data.ultimoCierre);
        localStorage.setItem('agro_caja', JSON.stringify({
          isCajaAbierta: false,
          exchangeRate: exchangeRate,
          cajaBalances: data.cajaBalances,
          ultimoCierre: data.ultimoCierre
        }));
      } else {
        localStorage.removeItem('agro_caja');
      }
      if (data.isCajaAbierta === false) setIsAperturaOpen(true);
    });

    if (currentUser && (!currentUser.permisos || !currentUser.rol_nombre)) {
      handleLogout();
    }

    return () => {
      socket.off('initial_state');
      socket.off('products_updated');
      socket.off('prepagos_updated');
      socket.off('deudores_updated');
      socket.off('caja_updated');
      socket.off('movimientos_updated');
      socket.off('descuentos_updated');
      socket.off('metricas_updated');
      socket.off('caja_cerrada');
    };
  }, []);

  const handleSetProducts = (newProducts) => { setProducts(newProducts); socket.emit('update_products', newProducts); };
  const handleSetPrepagos = (newPrepagos) => { setPrepagos(newPrepagos); socket.emit('update_prepagos', newPrepagos); };
  const handleSetDeudores = (newDeudores) => { setDeudores(newDeudores); socket.emit('update_deudores', newDeudores); };
  const handleRecordSale = (saleData) => socket.emit('record_sale', saleData);
  const handleSetDescuentos = (newDescuentos) => { setDescuentos(newDescuentos); socket.emit('update_descuentos', newDescuentos); };

  const handleAperturaConfirm = (datos) => {
    setIsAperturaOpen(false);
    setIsCajaAbierta(true);
    setExchangeRate(datos.tasa);
    const inUsd = datos.usd || 0;
    const inBs = datos.bs || 0;
    const newBalances = { usd: inUsd, bs: inBs, digitalBs: 0, inicialUsd: inUsd, inicialBs: inBs };
    setCajaBalances(newBalances);
    localStorage.setItem('agro_caja', JSON.stringify({ isCajaAbierta: true, exchangeRate: datos.tasa, cajaBalances: newBalances }));
    socket.emit('update_caja', { ...newBalances, isCajaAbierta: true, exchangeRate: datos.tasa });
    setNotification('✓ Caja abierta exitosamente con tasa de Bs ' + datos.tasa.toFixed(2));
    setTimeout(() => setNotification(null), 3000);
  };

  const handleUpdateBalances = (usdDelta, bsDelta, digitalBsDelta = 0) => {
    setCajaBalances(prev => {
      const newBalances = { ...prev, usd: prev.usd + usdDelta, bs: prev.bs + bsDelta, digitalBs: prev.digitalBs + digitalBsDelta };
      localStorage.setItem('agro_caja', JSON.stringify({ isCajaAbierta: true, exchangeRate: exchangeRate, cajaBalances: newBalances }));
      socket.emit('update_caja', { ...newBalances });
      return newBalances;
    });
  };

  const handleCajaButtonClick = () => {
    if (isCajaAbierta) setActiveTab('caja');
    else setIsAperturaOpen(true);
  };

  const handleCerrarJornada = () => {
    setIsCierreOpen(false);
    setIsCajaAbierta(false);
    // Calcular totales del turno actual para enviarlos al servidor y guardarlos en cierres_caja
    const turnoMovimientos = movimientos.filter(m => {
      if (!m.fechaHora) return false;
      return new Date(m.fechaHora) > new Date(ultimoCierre);
    });
    let turnoGanancia = 0, turnoMayor = 0, turnoDetal = 0, turnoTotal = 0;
    const metodosPagoTotales = {};
    turnoMovimientos.forEach(m => {
      turnoGanancia += (m.gananciaNetaVenta || 0);
      turnoTotal += (m.totalPagado || 0);
      m.productos?.forEach(p => {
        if (p.tipoVenta === 'saco') turnoMayor += p.quantity;
        else turnoDetal += p.quantity;
      });
      m.metodoPago?.forEach(mp => {
        const key = mp.metodo || 'Otro';
        metodosPagoTotales[key] = (metodosPagoTotales[key] || 0) + (mp.monto || 0);
      });
    });
    const turnoTotales = {
      gananciaNeta: turnoGanancia,
      totalPagado: turnoTotal,
      totalMayor: turnoMayor,
      totalDetal: turnoDetal,
      metodosPago: metodosPagoTotales
    };
    const emptyBalances = { usd: 0, bs: 0, digitalBs: 0, inicialUsd: 0, inicialBs: 0 };
    setCajaBalances(emptyBalances);
    setMetricasGlobales({ totalMayor: 0, totalDetal: 0, gananciaNeta: 0 });
    setMetricasMetodos({
      'Punto': { bruto: 0, comision: 0, neto: 0 },
      'Biopago': { bruto: 0, comision: 0, neto: 0 }
    });
    // Enviar cierre con los totales del turno al servidor
    socket.emit('cerrar_caja', turnoTotales);
    setNotification('Jornada Cerrada Correctamente');
    setTimeout(() => setNotification(null), 3000);
    setIsAperturaOpen(true);
    setActiveTab('ventas');
  };

  const handleLoginComplete = (user) => {
    localStorage.setItem('agro_currentUser', JSON.stringify(user));
    setCurrentUser(user);
    const isAdmin = user.rol_nombre === 'Administrador' || user.rol === 'admin';
    if (!isCajaAbierta && isAdmin) setIsAperturaOpen(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('agro_currentUser');
    setCurrentUser(null);
    setIsProfileOpen(false);
  };

  if (!currentUser) {
    return <Login onLoginComplete={handleLoginComplete} />;
  }

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
        {/* Brand */}
        <div className="brand">
          <Package size={26} className="text-[#52B788]" />
          <span>agro</span>
        </div>

        {/* Navigation Links */}
        <div className="nav-links nav-links-desktop">
          {hasAccess('ventas') && (
            <div
              className={`nav-link ${activeTab === 'ventas' ? 'active' : ''}`}
              onClick={() => setActiveTab('ventas')}
            >
              <ShoppingCart size={14} className="mr-1.5 inline" />
              VENTAS
            </div>
          )}
          {hasAccess('caja') && (
            <div
              className={`nav-link ${activeTab === 'caja' ? 'active' : ''}`}
              onClick={handleCajaButtonClick}
            >
              <Wallet size={14} className="mr-1.5 inline" />
              CAJA
            </div>
          )}
          {hasAccess('inventario') && (
            <div
              className={`nav-link ${activeTab === 'inventario' ? 'active' : ''}`}
              onClick={() => setActiveTab('inventario')}
            >
              <Package size={14} className="mr-1.5 inline" />
              INV.
            </div>
          )}
          {hasAccess('deudores') && (
            <div
              className={`nav-link ${activeTab === 'deudores' ? 'active' : ''}`}
              onClick={() => setActiveTab('deudores')}
            >
              <Users size={14} className="mr-1.5 inline" />
              DEUD.
            </div>
          )}
          {hasAccess('prepagos') && (
            <div
              className={`nav-link ${activeTab === 'prepagos' ? 'active' : ''}`}
              onClick={() => setActiveTab('prepagos')}
            >
              <Tag size={14} className="mr-1.5 inline" />
              PREP.
            </div>
          )}
          {hasAccess('promociones') && (
            <div
              className={`nav-link ${activeTab === 'promociones' ? 'active' : ''}`}
              onClick={() => setActiveTab('promociones')}
            >
              <Gift size={14} className="mr-1.5 inline" />
              PROM.
            </div>
          )}
          {hasAccess('estadisticas') && (
            <div
              className={`nav-link ${activeTab === 'stats' ? 'active' : ''}`}
              onClick={() => setActiveTab('stats')}
            >
              <BarChart3 size={14} className="mr-1.5 inline" />
              ESTAD.
            </div>
          )}
        </div>

        {/* Right Side: Caja Button + User */}
        <div className="nav-right flex items-center gap-3">
          {/* Mobile Hamburger */}
          <button className="hamburger-btn md:hidden" onClick={() => setIsSidebarOpen(true)}>
            <Menu size={22} />
          </button>

          {hasAccess('caja') && (
            <button
              className={`btn-inicio-caja ${isCajaAbierta ? 'abierta' : 'pulse'}`}
              onClick={handleCajaButtonClick}
            >
              <span className="icono-dinero">💰</span>
              {isCajaAbierta ? 'CAJA ABIERTA' : 'ABRIR CAJA'}
            </button>
          )}

          {/* User Profile */}
          <div className="user-profile-container">
            <div
              className="user-profile"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
            >
              <div className="user-info hidden sm:block">
                <div className="user-role">{currentUser?.rol_nombre || currentUser?.rol || 'Usuario'}</div>
                <div className="user-tasa">Bs {exchangeRate.toFixed(2)}</div>
              </div>
              <div className="user-avatar">
                {(currentUser?.rol_nombre || currentUser?.rol || 'U').charAt(0)}
              </div>
              <ChevronDown size={14} className={`transition-transform text-white/60 ${isProfileOpen ? 'rotate-180' : ''}`} />
            </div>

            {isProfileOpen && (
              <div className="profile-dropdown">
                <div className="dropdown-header">
                  <div className="font-black text-slate-800 uppercase tracking-tighter">{currentUser?.nombre}</div>
                  <div className="text-xs text-slate-400 font-bold">@{currentUser?.username}</div>
                </div>
                <div className="dropdown-item" onClick={() => { setActiveTab('miperfil'); setIsProfileOpen(false); }}>
                  <User size={15} className="text-slate-400" /> Mi Perfil
                </div>
                {(hasAccess('ajustes') || currentUser?.rol_nombre === 'Administrador' || currentUser?.rol === 'admin') && (
                  <div className="dropdown-item" onClick={() => { setActiveTab('ajustes'); setIsProfileOpen(false); }}>
                    <Settings size={15} className="text-slate-400" /> Ajustes
                  </div>
                )}
                <div className="dropdown-item danger" onClick={handleLogout}>
                  <LogOut size={15} /> Cerrar Sesión
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ── MOBILE SIDEBAR ──────────────────────────────────────────────── */}
      <div className={`sidebar-overlay ${isSidebarOpen ? 'visible' : ''}`} onClick={() => setIsSidebarOpen(false)} />
      <div className={`mobile-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="mobile-sidebar-header">
          <span className="font-bold text-xl">Menú</span>
          <button onClick={() => setIsSidebarOpen(false)} className="text-2xl">&times;</button>
        </div>
        <div className="flex flex-col gap-1 p-2">
          {hasAccess('ventas') && (
            <div className={`mobile-nav-item ${activeTab === 'ventas' ? 'active' : ''}`} onClick={() => { setActiveTab('ventas'); setIsSidebarOpen(false); }}>
              <ShoppingCart size={18} /> VENTAS
            </div>
          )}
          {hasAccess('caja') && (
            <div className={`mobile-nav-item ${activeTab === 'caja' ? 'active' : ''}`} onClick={() => { handleCajaButtonClick(); setIsSidebarOpen(false); }}>
              <Wallet size={18} /> CAJA
            </div>
          )}
          {hasAccess('inventario') && (
            <div className={`mobile-nav-item ${activeTab === 'inventario' ? 'active' : ''}`} onClick={() => { setActiveTab('inventario'); setIsSidebarOpen(false); }}>
              <Package size={18} /> INVENTARIO
            </div>
          )}
          {hasAccess('deudores') && (
            <div className={`mobile-nav-item ${activeTab === 'deudores' ? 'active' : ''}`} onClick={() => { setActiveTab('deudores'); setIsSidebarOpen(false); }}>
              <Users size={18} /> DEUDORES
            </div>
          )}
          {hasAccess('prepagos') && (
            <div className={`mobile-nav-item ${activeTab === 'prepagos' ? 'active' : ''}`} onClick={() => { setActiveTab('prepagos'); setIsSidebarOpen(false); }}>
              <Tag size={18} /> PREPAGOS
            </div>
          )}
          {hasAccess('promociones') && (
            <div className={`mobile-nav-item ${activeTab === 'promociones' ? 'active' : ''}`} onClick={() => { setActiveTab('promociones'); setIsSidebarOpen(false); }}>
              <Gift size={18} /> PROMOCIONES
            </div>
          )}
          {hasAccess('estadisticas') && (
            <div className={`mobile-nav-item ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => { setActiveTab('stats'); setIsSidebarOpen(false); }}>
              <BarChart3 size={18} /> ESTADÍSTICAS
            </div>
          )}
        </div>
      </div>

      {/* ── MAIN CONTENT ────────────────────────────────────────────────── */}
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
      <CierreModal
        isOpen={isCierreOpen}
        onClose={() => setIsCierreOpen(false)}
        exchangeRate={exchangeRate}
        cajaBalances={cajaBalances}
        movimientos={movimientos}
        onConfirmCierre={handleCerrarJornada}
      />
      {notification && <Toast message={notification} type="success" />}
    </div>
  );
}

export default App;