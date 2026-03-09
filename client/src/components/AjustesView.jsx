import React, { useState, useEffect } from 'react';
import socket from '../socket';
import Swal from 'sweetalert2';

function AjustesView({ currentUser }) {
    const [activeTab, setActiveTab] = useState('usuarios'); // 'usuarios' | 'roles' | 'seguridad'

    // Data States
    const [usuarios, setUsuarios] = useState([]);
    const [roles, setRoles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modals States
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [editingRole, setEditingRole] = useState(null);

    const modulos = [
        { id: 'ventas', label: 'Ventas (POS)' },
        { id: 'caja', label: 'Caja Diaria' },
        { id: 'inventario', label: 'Inventario' },
        { id: 'deudores', label: 'Deudores' },
        { id: 'prepagos', label: 'Prepagos' },
        { id: 'promociones', label: 'Promociones' },
        { id: 'estadisticas', label: 'Estadísticas' },
        { id: 'usuarios', label: 'Gestión Usuarios' },
        { id: 'roles', label: 'Gestión Roles' },
    ];

    const defaultPermisosForm = modulos.reduce((acc, mod) => {
        acc[mod.id] = { leer: false, crear: false, editar: false, eliminar: false };
        return acc;
    }, {});

    const [userForm, setUserForm] = useState({
        username: '', password: '', nombre: '', rol_id: '', activo: true
    });

    const [roleForm, setRoleForm] = useState({
        nombre: '', permisos: defaultPermisosForm
    });

    const fetchData = () => {
        setIsLoading(true);
        socket.emit('get_roles', (resRoles) => {
            if (resRoles.success) setRoles(resRoles.roles);
            socket.emit('get_usuarios', (resUsers) => {
                setIsLoading(false);
                if (resUsers.success) setUsuarios(resUsers.usuarios);
            });
        });
    };

    useEffect(() => {
        fetchData();
    }, []);

    // --- Usuarios Handlers ---
    const handleOpenUserModal = (user = null) => {
        if (roles.length === 0) return Swal.fire('Error', 'Primero debes crear un Rol', 'error');
        setEditingUser(user);
        setUserForm({
            id: user?.id,
            username: user?.username || '',
            password: '',
            nombre: user?.nombre || '',
            rol_id: user?.rol_id || roles[0].id,
            activo: user !== null ? user.activo : true
        });
        setIsUserModalOpen(true);
    };

    const handleUserSubmit = (e) => {
        e.preventDefault();
        if (!userForm.username || !userForm.nombre) return Swal.fire('Error', 'Requeridos', 'error');
        if (!editingUser && !userForm.password) return Swal.fire('Error', 'Password requerido', 'error');

        const eventName = editingUser ? 'update_usuario' : 'create_usuario';
        socket.emit(eventName, userForm, (res) => {
            if (res.success) {
                Swal.fire('Éxito', res.message, 'success');
                setIsUserModalOpen(false);
                fetchData();
            } else Swal.fire('Error', res.message, 'error');
        });
    };

    const handleDeleteUser = (id) => {
        if (id === currentUser.id) return Swal.fire('Error', 'No puedes eliminarte a ti mismo', 'error');
        Swal.fire({
            title: '¿Seguro?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, eliminar'
        }).then((r) => {
            if (r.isConfirmed) {
                socket.emit('delete_usuario', id, (res) => {
                    if (res.success) fetchData();
                    else Swal.fire('Error', res.message, 'error');
                });
            }
        });
    };

    // --- Roles Handlers ---
    const handleOpenRoleModal = (role = null) => {
        setEditingRole(role);
        if (role) {
            setRoleForm({ id: role.id, nombre: role.nombre, permisos: { ...defaultPermisosForm, ...role.permisos } });
        } else {
            setRoleForm({ nombre: '', permisos: defaultPermisosForm });
        }
        setIsRoleModalOpen(true);
    };

    const handePermisoChange = (modulo, accion, value) => {
        setRoleForm(prev => ({
            ...prev,
            permisos: {
                ...prev.permisos,
                [modulo]: { ...prev.permisos[modulo], [accion]: value }
            }
        }));
    };

    const handleRoleSubmit = (e) => {
        e.preventDefault();
        if (!roleForm.nombre) return Swal.fire('Error', 'Nombre del rol es requerido', 'error');
        const eventName = editingRole ? 'update_rol' : 'create_rol';
        socket.emit(eventName, roleForm, (res) => {
            if (res.success) {
                Swal.fire('Éxito', res.message, 'success');
                setIsRoleModalOpen(false);
                fetchData();
            } else Swal.fire('Error', res.message, 'error');
        });
    };

    const handleDeleteRole = (id) => {
        Swal.fire({
            title: '¿Seguro?', text: 'Cuidado: Usuarios con este rol podrían perder acceso.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí'
        }).then(r => {
            if (r.isConfirmed) {
                socket.emit('delete_rol', id, res => {
                    if (res.success) fetchData();
                    else Swal.fire('Error', res.message, 'error');
                });
            }
        });
    };

    // --- Seguridad Handlers ---
    const handleDownloadBackup = () => {
        Swal.fire({
            title: 'Generando Respaldo',
            text: 'Por favor espera mientras se extraen los datos...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        socket.emit('backup_database_json', (res) => {
            if (res.success) {
                const dataStr = JSON.stringify(res.data, null, 2);
                const blob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                const d = new Date();
                const dString = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                link.download = `AgroBackup_${dString}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                Swal.fire('Éxito', 'El respaldo de la base de datos se ha descargado correctamente.', 'success');
            } else {
                Swal.fire('Error', res.message || 'Error al generar el respaldo', 'error');
            }
        });
    };

    // Permisos helpers
    const canAdministrateUsers = currentUser?.permisos?.usuarios?.leer;
    const canAdministrateRoles = currentUser?.permisos?.roles?.leer;
    const canAccessSecurity = currentUser?.permisos?.ajustes?.eliminar || canAdministrateRoles; // Solo Admins de alto nivel

    if (!canAdministrateUsers && !canAdministrateRoles && !canAccessSecurity) {
        return <div className="p-8 text-center text-red-500 font-bold">No tienes permisos para ver Ajustes.</div>;
    }

    return (
        <div className="ajustes-container p-4 md:p-8 max-w-7xl mx-auto space-y-8">
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Ajustes y Usuarios</h2>

            {/* Settings Navigation Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-200 no-scrollbar flex-nowrap">
                {canAdministrateUsers && (
                    <button
                        className={`px-4 py-2 font-black text-xs uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${activeTab === 'usuarios' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}
                        onClick={() => setActiveTab('usuarios')}
                    >
                        Usuarios
                    </button>
                )}
                {canAdministrateRoles && (
                    <button
                        className={`px-4 py-2 font-black text-xs uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${activeTab === 'roles' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-400'}`}
                        onClick={() => setActiveTab('roles')}
                    >
                        Roles
                    </button>
                )}
                {canAccessSecurity && (
                    <button
                        className={`px-4 py-2 font-black text-xs uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${activeTab === 'seguridad' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-400'}`}
                        onClick={() => setActiveTab('seguridad')}
                    >
                        Seguridad
                    </button>
                )}
            </div>

            {/* USUARIOS VIEW */}
            {activeTab === 'usuarios' && canAdministrateUsers && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <h3 className="text-xl font-black text-slate-700 uppercase tracking-tight">Usuarios</h3>
                        {currentUser?.permisos?.usuarios?.crear && (
                            <button onClick={() => handleOpenUserModal()} className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all">+ Nuevo</button>
                        )}
                    </div>
                    <div className="table-responsive-wrapper border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                        <table className="w-full text-left border-separate border-spacing-0">
                            <thead className="bg-slate-50">
                                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest uppercase">
                                    <th className="p-4 border-b border-slate-100 text-slate-400">Acceso</th>
                                    <th className="p-4 border-b border-slate-100 text-slate-400">Nombre</th>
                                    <th className="p-4 border-b border-slate-100 text-slate-400">Rol</th>
                                    <th className="p-4 border-b border-slate-100 text-slate-400 text-center">Estado</th>
                                    <th className="p-4 border-b border-slate-100 text-slate-400 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? <tr><td colSpan="5" className="p-8 text-center text-slate-300 font-black italic">Sincronizando...</td></tr> :
                                    usuarios.map(u => (
                                        <tr key={u.id} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="p-4 border-b border-slate-50 font-black text-blue-600">@{u.username}</td>
                                            <td className="p-4 border-b border-slate-50 font-bold text-slate-700">{u.nombre}</td>
                                            <td className="p-4 border-b border-slate-50">
                                                <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-500 font-black text-[9px] uppercase tracking-widest">{u.rol_nombre || 'Sin Rol'}</span>
                                            </td>
                                            <td className="p-4 border-b border-slate-50 text-center">
                                                <span className={`px-2 py-1 rounded-md font-black text-[9px] uppercase tracking-widest ${u.activo ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>{u.activo ? 'ACTIVO' : 'BAJA'}</span>
                                            </td>
                                            <td className="p-4 border-b border-slate-50 flex justify-end gap-2">
                                                {currentUser?.permisos?.usuarios?.editar && (
                                                    <button onClick={() => handleOpenUserModal(u)} className="p-2 text-blue-500 hover:bg-blue-100 rounded-lg transition-all" title="Editar">
                                                        ✏️
                                                    </button>
                                                )}
                                                {currentUser?.permisos?.usuarios?.eliminar && u.id !== currentUser.id && (
                                                    <button onClick={() => handleDeleteUser(u.id)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-all" title="Eliminar">
                                                        🗑️
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ROLES VIEW */}
            {activeTab === 'roles' && canAdministrateRoles && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <h3 className="text-xl font-black text-slate-700 uppercase tracking-tight">Roles y Seguridad</h3>
                        {currentUser?.permisos?.roles?.crear && (
                            <button onClick={() => handleOpenRoleModal()} className="w-full sm:w-auto bg-purple-600 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-purple-700 shadow-lg shadow-purple-100 transition-all">+ Nuevo</button>
                        )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {isLoading ? <p className="text-slate-300 font-black italic p-4">Analizando...</p> : roles.map(r => (
                            <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
                                <div>
                                    <h3 className="text-lg font-black text-purple-900 border-b border-slate-50 pb-3 mb-4 flex items-center gap-2">🛡️ {r.nombre}</h3>
                                    <div className="text-[10px] text-slate-500 flex flex-col gap-2 mb-6 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
                                        {Object.keys(r.permisos).map(mod => {
                                            const p = r.permisos[mod];
                                            if (!p.leer && !p.crear && !p.editar && !p.eliminar) return null;
                                            return (
                                                <div key={mod} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg">
                                                    <span className="font-black uppercase tracking-tight text-slate-400">{mod}</span>
                                                    <span className="font-black text-slate-700 flex gap-1">
                                                        {p.leer && <span className="text-blue-500" title="Leer">R</span>}
                                                        {p.crear && <span className="text-emerald-500" title="Crear">C</span>}
                                                        {p.editar && <span className="text-amber-500" title="Update">U</span>}
                                                        {p.eliminar && <span className="text-red-500" title="Delete">D</span>}
                                                    </span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                                <div className="flex gap-2 justify-end border-t border-slate-50 pt-4 mt-auto">
                                    {currentUser?.permisos?.roles?.editar && (
                                        <button onClick={() => handleOpenRoleModal(r)} className="px-3 py-1.5 bg-purple-100 text-purple-600 font-black rounded-lg hover:bg-purple-600 hover:text-white transition-all text-[10px] tracking-widest uppercase">
                                            MODIFICAR
                                        </button>
                                    )}
                                    {currentUser?.permisos?.roles?.eliminar && (
                                        <button onClick={() => handleDeleteRole(r.id)} className="px-3 py-1.5 bg-red-50 text-red-500 font-black rounded-lg hover:bg-red-500 hover:text-white transition-all text-[10px] tracking-widest uppercase">
                                            BORRAR
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* SEGURIDAD VIEW */}
            {activeTab === 'seguridad' && canAccessSecurity && (
                <div className="space-y-6">
                    <h3 className="text-xl font-black text-slate-700 uppercase tracking-tight">Seguridad</h3>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
                        <h4 className="text-lg font-black text-slate-800 mb-2 border-b border-slate-50 pb-4">Extracción de Datos</h4>
                        <p className="text-sm text-slate-500 mb-8 font-medium">Genere un respaldo completo en formato JSON para auditorías o recuperación.</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                                <h4 className="font-bold text-blue-900 mb-2">Contenido del Respaldo:</h4>
                                <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
                                    <li>Inventario (Productos y Stock)</li>
                                    <li>Historial de Ventas Clínicas</li>
                                    <li>Caja Diaria Auditada</li>
                                    <li>Listado de Usuarios Creados</li>
                                    <li>Matrices de Roles Duros</li>
                                </ul>
                            </div>

                            <div className="flex flex-col justify-center items-center p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                                <span className="text-4xl mb-3">📦</span>
                                <button
                                    onClick={handleDownloadBackup}
                                    className="px-6 py-3 bg-[#E74C3C] hover:bg-[#C0392B] text-white font-bold rounded-lg shadow-md transition w-full max-w-xs flex items-center justify-center gap-2"
                                >
                                    ⬇️ Descargar Backup JSON
                                </button>
                                <span className="text-xs text-gray-400 mt-3 text-center">Invocación Directa al Servidor Central MySQL</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* USER MODAL */}
            {isUserModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 md:p-8 my-auto transform transition-all">
                        <h3 className="text-2xl font-black mb-8 text-slate-800 uppercase tracking-tight">{editingUser ? 'Editar' : 'Nuevo'} Usuario</h3>
                        <form onSubmit={handleUserSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nombre Real</label>
                                <input type="text" value={userForm.nombre} onChange={e => setUserForm({ ...userForm, nombre: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none font-bold placeholder:text-slate-300" placeholder="Ej: Juan Pérez" required />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">ID de Acceso</label>
                                <input type="text" value={userForm.username} onChange={e => setUserForm({ ...userForm, username: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none font-black text-blue-600 placeholder:text-slate-300" placeholder="Ej: jperez" required />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Contraseña {editingUser && <span className="text-[8px] italic text-slate-400 font-normal normal-case">(Opcional)</span>}</label>
                                <input type="password" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none font-bold" required={!editingUser} />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Rol</label>
                                    <select value={userForm.rol_id} onChange={e => setUserForm({ ...userForm, rol_id: Number(e.target.value) })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none font-black text-purple-600 uppercase text-xs">
                                        {roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-center pt-4 sm:pt-6">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${userForm.activo ? 'bg-emerald-500 border-emerald-500' : 'bg-slate-50 border-slate-200'}`}>
                                            {userForm.activo && <span className="text-white font-black text-xs">✓</span>}
                                        </div>
                                        <input type="checkbox" checked={userForm.activo} onChange={e => setUserForm({ ...userForm, activo: e.target.checked })} className="hidden" />
                                        <span className="font-black text-[10px] uppercase tracking-widest text-slate-500 group-hover:text-slate-800">Cuenta Activa</span>
                                    </label>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 pt-6">
                                <button type="button" onClick={() => setIsUserModalOpen(false)} className="flex-1 px-6 py-3 bg-slate-100 text-slate-500 font-black rounded-xl hover:bg-slate-200 transition-all text-xs tracking-widest uppercase">Cancelar</button>
                                <button type="submit" className="flex-1 px-6 py-3 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition-all text-xs tracking-widest uppercase shadow-lg shadow-blue-100">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ROLE MODAL */}
            {isRoleModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-0 sm:p-4">
                    <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col h-full sm:h-auto sm:max-h-[90vh] overflow-hidden transform transition-all">

                        <div className="p-6 border-b border-slate-100 flex-shrink-0 bg-white">
                            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{editingRole ? 'Editar' : 'Nuevo'} Rol</h3>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 space-y-8 no-scrollbar bg-slate-50/30">
                            <form id="roleForm" onSubmit={handleRoleSubmit} className="space-y-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nombre del Rol</label>
                                    <input type="text" value={roleForm.nombre} onChange={e => setRoleForm({ ...roleForm, nombre: e.target.value })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-purple-600 outline-none font-black text-purple-900 text-xl placeholder:text-slate-200" placeholder="Ej: Administrador" required />
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-end border-b border-slate-100 pb-2">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-tight">Permisos por Módulo</h4>
                                        <div className="hidden sm:flex gap-4 text-[8px] font-black text-slate-300 tracking-widest uppercase">
                                            <span>Leer</span>
                                            <span>Crear</span>
                                            <span>Editar</span>
                                            <span>Baja</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {modulos.map(mod => (
                                            <div key={mod.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl border border-slate-100 bg-white shadow-sm gap-4">
                                                <span className="font-black text-xs text-slate-600 uppercase tracking-widest">{mod.label}</span>
                                                <div className="flex gap-6 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
                                                    <label className="flex flex-col items-center gap-1 cursor-pointer group" title="Leer">
                                                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${roleForm.permisos[mod.id]?.leer ? 'bg-blue-500 border-blue-500' : 'bg-slate-50 border-slate-200'}`}>
                                                            {roleForm.permisos[mod.id]?.leer && <span className="text-white font-black text-[10px]">R</span>}
                                                        </div>
                                                        <input type="checkbox" checked={roleForm.permisos[mod.id]?.leer || false} onChange={e => handePermisoChange(mod.id, 'leer', e.target.checked)} className="hidden" />
                                                        <span className="text-[8px] font-black text-slate-300 sm:hidden">L</span>
                                                    </label>
                                                    <label className="flex flex-col items-center gap-1 cursor-pointer group" title="Crear">
                                                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${roleForm.permisos[mod.id]?.crear ? 'bg-emerald-500 border-emerald-500' : 'bg-slate-50 border-slate-200'}`}>
                                                            {roleForm.permisos[mod.id]?.crear && <span className="text-white font-black text-[10px]">C</span>}
                                                        </div>
                                                        <input type="checkbox" checked={roleForm.permisos[mod.id]?.crear || false} onChange={e => handePermisoChange(mod.id, 'crear', e.target.checked)} className="hidden" />
                                                        <span className="text-[8px] font-black text-slate-300 sm:hidden">C</span>
                                                    </label>
                                                    <label className="flex flex-col items-center gap-1 cursor-pointer group" title="Editar">
                                                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${roleForm.permisos[mod.id]?.editar ? 'bg-amber-500 border-amber-500' : 'bg-slate-50 border-slate-200'}`}>
                                                            {roleForm.permisos[mod.id]?.editar && <span className="text-white font-black text-[10px]">U</span>}
                                                        </div>
                                                        <input type="checkbox" checked={roleForm.permisos[mod.id]?.editar || false} onChange={e => handePermisoChange(mod.id, 'editar', e.target.checked)} className="hidden" />
                                                        <span className="text-[8px] font-black text-slate-300 sm:hidden">U</span>
                                                    </label>
                                                    <label className="flex flex-col items-center gap-1 cursor-pointer group" title="Borrar">
                                                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${roleForm.permisos[mod.id]?.eliminar ? 'bg-red-500 border-red-500' : 'bg-slate-50 border-slate-200'}`}>
                                                            {roleForm.permisos[mod.id]?.eliminar && <span className="text-white font-black text-[10px]">D</span>}
                                                        </div>
                                                        <input type="checkbox" checked={roleForm.permisos[mod.id]?.eliminar || false} onChange={e => handePermisoChange(mod.id, 'eliminar', e.target.checked)} className="hidden" />
                                                        <span className="text-[8px] font-black text-slate-300 sm:hidden">D</span>
                                                    </label>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-white flex flex-col sm:flex-row justify-end gap-3 flex-shrink-0">
                            <button type="button" onClick={() => setIsRoleModalOpen(false)} className="px-6 py-3 bg-slate-100 text-slate-500 font-black rounded-xl hover:bg-slate-200 transition-all text-sm tracking-widest uppercase">Cancelar</button>
                            <button type="submit" form="roleForm" className="px-6 py-3 bg-purple-600 text-white font-black rounded-xl hover:bg-purple-700 transition-all text-sm tracking-widest uppercase shadow-lg shadow-purple-100">Guardar Rol</button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}

export default AjustesView;
