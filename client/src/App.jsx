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
import { AperturaModal, Toast } from './components/CajaModals';
import socket from './socket';
import './index.css';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('ventas');

  // Persistencia de Sesión: Leer localStorage al inicio (A prueba de balas)
  const savedCaja = JSON.parse(localStorage.getItem('agro_caja') || '{}');
  const savedRole = localStorage.getItem('agro_userRole');
  const savedUserStr = localStorage.getItem('agro_currentUser');
  const savedUser = savedUserStr ? JSON.parse(savedUserStr) : null;

  const [currentUser, setCurrentUser] = useState(savedUser);
  const [isCajaAbierta, setIsCajaAbierta] = useState(savedCaja.isCajaAbierta || false);
  const [isAperturaOpen, setIsAperturaOpen] = useState(!savedCaja.isCajaAbierta && (currentUser?.rol_nombre === 'Administrador' || currentUser?.rol === 'admin'));
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

  useEffect(() => {
    // Regla estricta: La ventana siempre se llamará "agro"
    document.title = "agro";

    // Escuchar el estado inicial desde el servidor (Fuente Única de Verdad)
    socket.on('initial_state', (state) => {
      setProducts(state.products);
      setPrepagos(state.prepagos);
      setDeudores(state.deudores || []);
      setMovimientos(state.movimientos || []);
      setHistorialTasas(state.historialTasas || []);
      setHistorialCapital(state.historialCapital || []);
      if (state.configuracionDescuentos) {
        setDescuentos(state.configuracionDescuentos);
      }
      if (state.metricasGlobales) setMetricasGlobales(state.metricasGlobales);
      if (state.metricasMetodos) setMetricasMetodos(state.metricasMetodos);

      // Sincronización Total: El servidor manda.
      setExchangeRate(state.exchangeRate);
      setCajaBalances(state.cajaBalances);
      setIsCajaAbierta(state.isCajaAbierta);
      // Solo forzamos la apertura estricta inicial si es admin (opcional)
      setIsAperturaOpen(!state.isCajaAbierta && currentUser?.rol === 'admin');

      // Actualizamos localStorage para estar en sintonía
      localStorage.setItem('agro_caja', JSON.stringify({
        isCajaAbierta: state.isCajaAbierta,
        exchangeRate: state.exchangeRate,
        cajaBalances: state.cajaBalances
      }));
    });

    socket.on('products_updated', (newProducts) => {
      setProducts(newProducts);
    });

    socket.on('prepagos_updated', (newPrepagos) => {
      setPrepagos(newPrepagos);
    });

    socket.on('deudores_updated', (newDeudores) => {
      setDeudores(newDeudores);
    });

    socket.on('movimientos_updated', (newMovimientos) => {
      setMovimientos(newMovimientos);
    });

    socket.on('descuentos_updated', (newDescuentos) => {
      setDescuentos(newDescuentos);
    });

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

      // Persistir en localStorage
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
      localStorage.removeItem('agro_caja');
      if (data.isCajaAbierta === false) setIsAperturaOpen(true);
    });

    // Limpieza de Sesión Antigua: Si el usuario no tiene permisos o el nuevo esquema de roles, forzar logout
    if (currentUser && (!currentUser.permisos || !currentUser.rol_nombre)) {
      console.warn('Sesión incompatible detectada. Forzando actualización...');
      handleLogout();
    }

    return () => {
      socket.off('initial_state');
      socket.off('products_updated');
      socket.off('prepagos_updated');
      socket.off('deudores_updated');
      socket.off('caja_updated');
      socket.off('sales_updated');
      socket.off('descuentos_updated');
      socket.off('metricas_updated');
      socket.off('caja_cerrada');
    };
  }, []);

  const handleSetProducts = (newProducts) => {
    setProducts(newProducts);
    socket.emit('update_products', newProducts);
  };

  const handleSetPrepagos = (newPrepagos) => {
    setPrepagos(newPrepagos);
    socket.emit('update_prepagos', newPrepagos);
  };

  const handleSetDeudores = (newDeudores) => {
    setDeudores(newDeudores);
    socket.emit('update_deudores', newDeudores);
  };

  const handleRecordSale = (saleData) => {
    socket.emit('record_sale', saleData);
  };

  const handleSetDescuentos = (newDescuentos) => {
    setDescuentos(newDescuentos);
    socket.emit('update_descuentos', newDescuentos);
  };

  const handleAperturaConfirm = (datos) => {
    setIsAperturaOpen(false);
    setIsCajaAbierta(true);
    setExchangeRate(datos.tasa);
    const inUsd = datos.usd || 0;
    const inBs = datos.bs || 0;
    const newBalances = { usd: inUsd, bs: inBs, digitalBs: 0, inicialUsd: inUsd, inicialBs: inBs };
    setCajaBalances(newBalances);

    localStorage.setItem('agro_caja', JSON.stringify({
      isCajaAbierta: true,
      exchangeRate: datos.tasa,
      cajaBalances: newBalances
    }));

    socket.emit('update_caja', {
      ...newBalances,
      isCajaAbierta: true,
      exchangeRate: datos.tasa
    });

    setNotification('✓ Caja abierta exitosamente con tasa de Bs ' + datos.tasa.toFixed(2));
    setTimeout(() => setNotification(null), 3000);
  };

  const handleUpdateBalances = (usdDelta, bsDelta, digitalBsDelta = 0) => {
    setCajaBalances(prev => {
      const newBalances = {
        ...prev,
        usd: prev.usd + usdDelta,
        bs: prev.bs + bsDelta,
        digitalBs: prev.digitalBs + digitalBsDelta
      };

      localStorage.setItem('agro_caja', JSON.stringify({
        isCajaAbierta: true,
        exchangeRate: exchangeRate,
        cajaBalances: newBalances
      }));

      socket.emit('update_caja', { ...newBalances });

      return newBalances;
    });
  };

  const handleCajaButtonClick = () => {
    if (isCajaAbierta) {
      setActiveTab('caja');
    } else {
      setIsAperturaOpen(true);
    }
  };

  const handleCerrarJornada = () => {
    setIsCajaAbierta(false);
    const emptyBalances = { usd: 0, bs: 0, digitalBs: 0, inicialUsd: 0, inicialBs: 0 };
    setCajaBalances(emptyBalances);

    localStorage.removeItem('agro_caja');

    socket.emit('cerrar_caja');

    setNotification('Jornada Cerrada Correctamente');
    setTimeout(() => setNotification(null), 3000);
    setIsAperturaOpen(true);
    setActiveTab('ventas');
  };

  const handleLoginComplete = (user) => {
    localStorage.setItem('agro_currentUser', JSON.stringify(user));
    setCurrentUser(user);
    const isAdmin = user.rol_nombre === 'Administrador' || user.rol === 'admin';
    if (!isCajaAbierta && isAdmin) {
      setIsAperturaOpen(true);
    }
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
  // Helper for checking modular access (CRUD)
  const hasAccess = (modulo, accion = 'leer') => {
    if (!currentUser?.permisos) return false;
    const moduloPermisos = currentUser.permisos[modulo];
    if (!moduloPermisos) return false;
    return moduloPermisos[accion] === true;
  };

  return (
    <div className="app-wrapper flex flex-col h-screen overflow-hidden">
      <nav className="main-nav flex justify-between items-center p-2 md:px-8 bg-[#1B4332] text-white shadow-md z-50 overflow-x-auto">
        <div className="flex items-center">
          <button className="hamburger-btn" onClick={() => setIsSidebarOpen(true)}>
            ☰
          </button>
          <div className="brand flex items-center gap-2 text-xl font-bold lowercase">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <span className="hidden sm:inline">agro</span>
          </div>
        </div>

        <div className="nav-links nav-links-desktop flex overflow-x-auto text-[0.7rem] sm:text-sm md:text-base font-semibold hide-scrollbar">
          {hasAccess('ventas') && (
            <div
              className={`nav-link flex-shrink-0 flex items-center px-2 py-3 sm:px-4 cursor-pointer border-b-2 transition-colors ${activeTab === 'ventas' ? 'border-[#52B788] text-white' : 'border-transparent text-white/70 hover:text-white hover:bg-white/5'}`}
              onClick={() => setActiveTab('ventas')}
            >
              🛒 VENTAS
            </div>
          )}

          {hasAccess('caja') && (
            <div
              className={`nav-link flex-shrink-0 flex items-center px-2 py-3 sm:px-4 cursor-pointer border-b-2 transition-colors ${activeTab === 'caja' ? 'border-[#52B788] text-white' : 'border-transparent text-white/70 hover:text-white hover:bg-white/5'}`}
              onClick={handleCajaButtonClick}
            >
              💰 CAJA
            </div>
          )}

          {hasAccess('inventario') && (
            <div
              className={`nav-link flex-shrink-0 flex items-center px-2 py-3 sm:px-4 cursor-pointer border-b-2 transition-colors ${activeTab === 'inventario' ? 'border-[#52B788] text-white' : 'border-transparent text-white/70 hover:text-white hover:bg-white/5'}`}
              onClick={() => setActiveTab('inventario')}
            >
              📦 INV.
            </div>
          )}

          {hasAccess('deudores') && (
            <div
              className={`nav-link flex-shrink-0 flex items-center px-2 py-3 sm:px-4 cursor-pointer border-b-2 transition-colors ${activeTab === 'deudores' ? 'border-[#52B788] text-white' : 'border-transparent text-white/70 hover:text-white hover:bg-white/5'}`}
              onClick={() => setActiveTab('deudores')}
            >
              👥 DEUD.
            </div>
          )}

          {hasAccess('prepagos') && (
            <div
              className={`nav-link flex-shrink-0 flex items-center px-2 py-3 sm:px-4 cursor-pointer border-b-2 transition-colors ${activeTab === 'prepagos' ? 'border-[#52B788] text-white' : 'border-transparent text-white/70 hover:text-white hover:bg-white/5'}`}
              onClick={() => setActiveTab('prepagos')}
            >
              🏷️ PREP.
            </div>
          )}

          {hasAccess('promociones') && (
            <div
              className={`nav-link flex-shrink-0 flex items-center px-2 py-3 sm:px-4 cursor-pointer border-b-2 transition-colors ${activeTab === 'promociones' ? 'border-[#52B788] text-white' : 'border-transparent text-white/70 hover:text-white hover:bg-white/5'}`}
              onClick={() => setActiveTab('promociones')}
            >
              🎉 PROM.
            </div>
          )}

          {hasAccess('estadisticas') && (
            <div
              className={`nav-link flex-shrink-0 flex items-center px-2 py-3 sm:px-4 cursor-pointer border-b-2 transition-colors ${activeTab === 'stats' ? 'border-[#52B788] text-white' : 'border-transparent text-white/70 hover:text-white hover:bg-white/5'}`}
              onClick={() => setActiveTab('stats')}
            >
              📊 ESTAD.
            </div>
          )}
        </div>

        <div className="flex flex-row items-center gap-4 ml-auto pl-4 flex-nowrap shrink-0">
          {hasAccess('caja') && (
            <button
              className={`btn-inicio-caja scale-75 sm:scale-100 origin-right ${isCajaAbierta ? 'abierta' : 'pulse'}`}
              onClick={handleCajaButtonClick}
            >
              <span className="icono-dinero">💰</span>
              {isCajaAbierta ? 'CAJA ABIERTA' : 'ABRIR CAJA'}
            </button>
          )}

          <div className="user-profile-container">
            <div
              className="user-profile"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
            >
              <div className="user-info">
                <div className="user-role">{currentUser?.rol_nombre || currentUser?.rol || 'Usuario'}</div>
                <div className="user-tasa">Tasa: Bs {exchangeRate.toFixed(2)}</div>
              </div>
              <div className="user-avatar">
                {(currentUser?.rol_nombre || currentUser?.rol || 'U').charAt(0)}
              </div>
            </div>
            {isProfileOpen && (
              <div className="profile-dropdown" style={{ position: 'absolute', top: '120%', right: 0, backgroundColor: 'var(--white)', color: 'var(--text-color)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', minWidth: '180px', zIndex: 1000, overflow: 'hidden' }}>
                <div className="dropdown-item" style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                  <strong>{currentUser?.nombre}</strong><br />
                  <span style={{ fontSize: '0.8rem', color: 'gray' }}>@{currentUser?.username}</span>
                </div>

                <div className="dropdown-item" style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }} onClick={() => { setActiveTab('miperfil'); setIsProfileOpen(false); }}>👤 Mi Perfil</div>

                {(hasAccess('ajustes') || currentUser?.rol_nombre === 'Administrador' || currentUser?.rol === 'admin') && (
                  <div className="dropdown-item" style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }} onClick={() => { setActiveTab('ajustes'); setIsProfileOpen(false); }}>⚙️ Ajustes y Usuarios</div>
                )}

                <div className="dropdown-item hover:bg-red-50" style={{ padding: '0.75rem 1rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--danger)' }} onClick={(e) => { e.preventDefault(); handleLogout(); }}>🚪 Cerrar Sesión</div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* MOBILE SIDEBAR */}
      <div className={`sidebar-overlay ${isSidebarOpen ? 'visible' : ''}`} onClick={() => setIsSidebarOpen(false)}></div>
      <div className={`mobile-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="p-4 border-b border-white/20 mb-4 flex justify-between items-center">
          <span className="font-bold text-xl">Menú</span>
          <button className="text-white text-2xl" onClick={() => setIsSidebarOpen(false)}>&times;</button>
        </div>
        <div className="flex flex-col gap-2">
          {hasAccess('ventas') && (
            <div className={`p-4 font-bold flex items-center gap-3 ${activeTab === 'ventas' ? 'bg-white/10' : ''}`} onClick={() => { setActiveTab('ventas'); setIsSidebarOpen(false); }}>
              🛒 VENTAS
            </div>
          )}
          {hasAccess('caja') && (
            <div className={`p-4 font-bold flex items-center gap-3 ${activeTab === 'caja' ? 'bg-white/10' : ''}`} onClick={() => { handleCajaButtonClick(); setIsSidebarOpen(false); }}>
              💰 CAJA
            </div>
          )}
          {hasAccess('inventario') && (
            <div className={`p-4 font-bold flex items-center gap-3 ${activeTab === 'inventario' ? 'bg-white/10' : ''}`} onClick={() => { setActiveTab('inventario'); setIsSidebarOpen(false); }}>
              📦 INVENTARIO
            </div>
          )}
          {hasAccess('deudores') && (
            <div className={`p-4 font-bold flex items-center gap-3 ${activeTab === 'deudores' ? 'bg-white/10' : ''}`} onClick={() => { setActiveTab('deudores'); setIsSidebarOpen(false); }}>
              👥 DEUDORES
            </div>
          )}
          {hasAccess('prepagos') && (
            <div className={`p-4 font-bold flex items-center gap-3 ${activeTab === 'prepagos' ? 'bg-white/10' : ''}`} onClick={() => { setActiveTab('prepagos'); setIsSidebarOpen(false); }}>
              🏷️ PREPAGOS
            </div>
          )}
          {hasAccess('promociones') && (
            <div className={`p-4 font-bold flex items-center gap-3 ${activeTab === 'promociones' ? 'bg-white/10' : ''}`} onClick={() => { setActiveTab('promociones'); setIsSidebarOpen(false); }}>
              🎉 PROMOCIONES
            </div>
          )}
          {hasAccess('estadisticas') && (
            <div className={`p-4 font-bold flex items-center gap-3 ${activeTab === 'stats' ? 'bg-white/10' : ''}`} onClick={() => { setActiveTab('stats'); setIsSidebarOpen(false); }}>
              📊 ESTADÍSTICAS
            </div>
          )}
        </div>
      </div>

      <main className="main-content">
        {activeTab === 'ventas' && hasAccess('ventas') && <VentasTab exchangeRate={exchangeRate} userRole={userRole} cajaBalances={cajaBalances} onUpdateBalances={handleUpdateBalances} onRecordSale={handleRecordSale} products={products} setProducts={handleSetProducts} prepagos={prepagos} setPrepagos={handleSetPrepagos} deudores={deudores} setDeudores={handleSetDeudores} descuentos={descuentos} hasAccess={hasAccess} />}
        {activeTab === 'caja' && hasAccess('caja') && <CajaTab cajaBalances={cajaBalances} exchangeRate={exchangeRate} userRole={userRole} onCerrarJornada={handleCerrarJornada} onUpdateBalances={handleUpdateBalances} metricasGlobales={metricasGlobales} metricasMetodos={metricasMetodos} movimientos={movimientos} hasAccess={hasAccess} />}

        {activeTab === 'inventario' && hasAccess('inventario') && (
          <InventoryView products={products} setProducts={handleSetProducts} exchangeRate={exchangeRate} prepagos={prepagos} setPrepagos={handleSetPrepagos} hasAccess={hasAccess} />
        )}

        {activeTab === 'deudores' && hasAccess('deudores') && <DeudoresView exchangeRate={exchangeRate} deudores={deudores} setDeudores={handleSetDeudores} userRole={userRole} hasAccess={hasAccess} />}
        {activeTab === 'prepagos' && hasAccess('prepagos') && <PrepagosView prepagos={prepagos} setPrepagos={handleSetPrepagos} userRole={userRole} hasAccess={hasAccess} />}

        {activeTab === 'promociones' && hasAccess('promociones') && (
          <PromocionesView descuentos={descuentos} setDescuentos={handleSetDescuentos} products={products} userRole={userRole} hasAccess={hasAccess} />
        )}

        {activeTab === 'stats' && hasAccess('estadisticas') && (
          <StatsView
            products={products}
            movimientos={movimientos}
            deudores={deudores}
            cajaBalances={cajaBalances}
            exchangeRate={exchangeRate}
            historialTasas={historialTasas}
            historialCapital={historialCapital}
            hasAccess={hasAccess}
          />
        )}

        {/* Nuevas Vistas de Gestión y Perfil */}
        {activeTab === 'ajustes' && (hasAccess('ajustes') || currentUser?.rol_nombre === 'Administrador' || currentUser?.rol === 'admin') && (
          <AjustesView currentUser={currentUser} />
        )}

        {activeTab === 'miperfil' && (
          <MiPerfilView
            currentUser={currentUser}
            onProfileUpdate={(updatedUser) => {
              setCurrentUser(updatedUser);
              localStorage.setItem('agro_currentUser', JSON.stringify(updatedUser));
            }}
          />
        )}
      </main>

      <AperturaModal
        isOpen={isAperturaOpen}
        onConfirm={handleAperturaConfirm}
      />

      {notification && <Toast message={notification} type="success" />}
    </div>
  );
}

export default App;