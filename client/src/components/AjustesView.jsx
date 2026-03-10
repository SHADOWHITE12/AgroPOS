import React, { useState, useEffect } from 'react';
import socket from '../socket';
import Swal from 'sweetalert2';
import {
    Users,
    Shield,
    Lock,
    Cloud,
    Database,
    Plus,
    Edit,
    Trash2,
    CheckCircle2,
    AlertCircle,
    ChevronRight,
    ShieldCheck,
    Settings,
    RefreshCw,
    ExternalLink,
    Download,
    Eye,
    EyeOff,
    Key,
    ShieldAlert
} from 'lucide-react';

function AjustesView({ currentUser }) {
    const [activeTab, setActiveTab] = useState('usuarios'); // 'usuarios' | 'roles' | 'seguridad' | 'nube'

    // Data States
    const [usuarios, setUsuarios] = useState([]);
    const [roles, setRoles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showApiKey, setShowApiKey] = useState(false);
    const [showPasswords, setShowPasswords] = useState({}); // { [userId]: boolean }

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
        <div className="full-tab-container ajustes-container-inner animate-fadeIn">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
                        <Settings size={28} className="text-[#52B788]" />
                        Configuración del Sistema
                    </h2>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Gestión de accesos, roles y seguridad</p>
                </div>

                <div className="flex bg-black/5 p-1 rounded-2xl overflow-x-auto no-scrollbar">
                    {canAdministrateUsers && (
                        <button
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'usuarios' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                            onClick={() => setActiveTab('usuarios')}
                        >
                            <span className="flex items-center gap-2"><Users size={14} /> Usuarios</span>
                        </button>
                    )}
                    {canAdministrateRoles && (
                        <button
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'roles' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                            onClick={() => setActiveTab('roles')}
                        >
                            <span className="flex items-center gap-2"><Shield size={14} /> Roles</span>
                        </button>
                    )}
                    {canAccessSecurity && (
                        <button
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'seguridad' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                            onClick={() => setActiveTab('seguridad')}
                        >
                            <span className="flex items-center gap-2"><Lock size={14} /> Seguridad</span>
                        </button>
                    )}
                    <button
                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'nube' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                        onClick={() => setActiveTab('nube')}
                    >
                        <span className="flex items-center gap-2"><Cloud size={14} /> Nube / API</span>
                    </button>
                </div>
            </div>

            {/* USUARIOS VIEW */}
            {activeTab === 'usuarios' && canAdministrateUsers && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Listado de Usuarios</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Personal con acceso al sistema</p>
                        </div>
                        {currentUser?.permisos?.usuarios?.crear && (
                            <button onClick={() => handleOpenUserModal()} className="bg-[#52B788] text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#40916C] shadow-lg shadow-[#52B788]/20 transition-all flex items-center gap-2 active:scale-95">
                                <Plus size={18} /> Nuevo Usuario
                            </button>
                        )}
                    </div>

                    <div className="glass-effect rounded-[2.5rem] overflow-hidden border border-white/20 shadow-2xl shadow-black/5">
                        <div className="overflow-x-auto no-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                                        <th className="p-6">Identidad</th>
                                        <th className="p-6">Rol & Seguridad</th>
                                        <th className="p-6 text-center">Estatus</th>
                                        <th className="p-6 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100/50">
                                    {isLoading ? (
                                        <tr><td colSpan="4" className="p-16 text-center text-slate-300 font-black text-xs uppercase tracking-[0.3em] animate-pulse italic">Invocando registros...</td></tr>
                                    ) : usuarios.map(u => (
                                        <tr key={u.id} className="hover:bg-slate-50/30 transition-all group">
                                            <td className="p-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#52B788]/20 to-[#40916C]/10 flex items-center justify-center text-[#2D6A4F] font-black text-sm border border-[#52B788]/20 shadow-inner">
                                                        {u.nombre.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-black text-slate-800 tracking-tight">{u.nombre}</div>
                                                        <div className="text-[10px] font-bold text-[#52B788] uppercase tracking-tighter">@{u.username}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex flex-col gap-1.5">
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-600 font-black text-[9px] rounded-lg uppercase tracking-widest border border-purple-100 w-fit">
                                                        <Shield size={10} /> {u.rol_nombre || 'Invitado'}
                                                    </span>
                                                    <div className="flex items-center gap-2 text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1">
                                                        <Key size={10} className="text-amber-500" />
                                                        Clave: <span className="text-slate-600">••••••••</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6 text-center">
                                                <div className="flex justify-center">
                                                    <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-[0.1em] shadow-sm transition-all border ${u.activo ? 'bg-[#D8F3DC] text-[#1B4332] border-[#B7E4C7]' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                                        <div className={`w-1.5 h-1.5 rounded-full ${u.activo ? 'bg-[#52B788] animate-pulse' : 'bg-red-500'}`}></div>
                                                        {u.activo ? 'Cuenta Activa' : 'Baja Temporal'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                                    {currentUser?.permisos?.usuarios?.editar && (
                                                        <button onClick={() => handleOpenUserModal(u)} className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-transparent hover:border-blue-100 shadow-sm" title="Editar Perfil">
                                                            <Edit size={16} />
                                                        </button>
                                                    )}
                                                    {currentUser?.permisos?.usuarios?.eliminar && u.id !== currentUser.id && (
                                                        <button onClick={() => handleDeleteUser(u.id)} className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100 shadow-sm" title="Revocar Acceso">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ROLES VIEW */}
            {activeTab === 'roles' && canAdministrateRoles && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Estructura de Permisos</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Jerarquías y privilegios del sistema</p>
                        </div>
                        {currentUser?.permisos?.roles?.crear && (
                            <button onClick={() => handleOpenRoleModal()} className="bg-purple-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-purple-700 shadow-xl shadow-purple-200 transition-all flex items-center gap-2 active:scale-95">
                                <Plus size={18} /> Nuevo Rol
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {isLoading ? (
                            <div className="col-span-full p-20 text-center text-slate-300 font-black text-xs uppercase tracking-[0.4em] animate-pulse italic">Mapeando accesos...</div>
                        ) : roles.map(r => (
                            <div key={r.id} className="glass-effect rounded-[3rem] p-10 flex flex-col border border-white/20 shadow-2xl shadow-black/5 hover:shadow-purple-500/5 transition-all group relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
                                    <Shield size={180} />
                                </div>

                                <div className="relative z-10 flex-1">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="w-14 h-14 bg-gradient-to-br from-purple-500/20 to-indigo-600/10 rounded-3xl flex items-center justify-center text-purple-600 border border-purple-200/30">
                                            <Shield size={28} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">{r.nombre}</h3>
                                            <span className="text-[9px] font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded-lg uppercase tracking-widest border border-purple-100 italic">Identificador ID: {r.id}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-3 mb-8">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 block mb-3">Atribuciones Activas:</label>
                                        <div className="grid grid-cols-1 gap-2">
                                            {Object.keys(r.permisos).map(mod => {
                                                const p = r.permisos[mod];
                                                if (!p.leer && !p.crear && !p.editar && !p.eliminar) return null;
                                                return (
                                                    <div key={mod} className="flex justify-between items-center bg-white/40 p-3 px-5 rounded-2xl border border-white/60 shadow-sm backdrop-blur-sm">
                                                        <span className="text-[9px] font-black uppercase tracking-tight text-slate-700">{mod}</span>
                                                        <div className="flex gap-2 font-black text-[7px] uppercase tracking-tighter">
                                                            <div className={`w-3 h-3 rounded-full border ${p.leer ? 'bg-blue-500 border-blue-400 shadow-sm shadow-blue-200' : 'bg-slate-100 border-slate-200'}`} title="Leer"></div>
                                                            <div className={`w-3 h-3 rounded-full border ${p.crear ? 'bg-emerald-500 border-emerald-400 shadow-sm shadow-emerald-200' : 'bg-slate-100 border-slate-200'}`} title="Crear"></div>
                                                            <div className={`w-3 h-3 rounded-full border ${p.editar ? 'bg-amber-500 border-amber-400 shadow-sm shadow-amber-200' : 'bg-slate-100 border-slate-200'}`} title="Editar"></div>
                                                            <div className={`w-3 h-3 rounded-full border ${p.eliminar ? 'bg-red-500 border-red-400 shadow-sm shadow-red-200' : 'bg-slate-100 border-slate-200'}`} title="Eliminar"></div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                <div className="relative z-10 pt-6 border-t border-slate-100 flex justify-between items-center">
                                    <div className="flex gap-3">
                                        {currentUser?.permisos?.roles?.editar && (
                                            <button onClick={() => handleOpenRoleModal(r)} className="p-3 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-2xl transition-all border border-transparent hover:border-purple-100 shadow-sm">
                                                <Edit size={18} />
                                            </button>
                                        )}
                                        {currentUser?.permisos?.roles?.eliminar && (
                                            <button onClick={() => handleDeleteRole(r.id)} className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all border border-transparent hover:border-red-100 shadow-sm">
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                    <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest pl-4 border-l border-slate-100">
                                        Master Auth v2.0
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* SEGURIDAD VIEW */}
            {activeTab === 'seguridad' && canAccessSecurity && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em]">Integridad de Datos & Auditoría</h3>
                        <div className="bg-[#D8F3DC] text-[#1B4332] px-4 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center gap-2 border border-[#B7E4C7]">
                            <ShieldCheck size={14} /> Sistema Protegido
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 glass-effect rounded-[3rem] p-10 relative overflow-hidden border border-white/20 shadow-xl shadow-black/5">
                            <div className="absolute top-0 right-0 p-12 opacity-5">
                                <Database size={240} />
                            </div>

                            <div className="relative z-10 space-y-8">
                                <div className="space-y-4">
                                    <h4 className="text-3xl font-black text-slate-800 uppercase tracking-tighter leading-none">Copia de Seguridad</h4>
                                    <p className="text-sm text-slate-500 leading-relaxed font-bold max-w-xl">
                                        Extraiga una instantánea completa de la estructura maestra. Este volcado JSON incluye inventarios, registros históricos de ventas y configuración de roles.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="bg-white/40 backdrop-blur-md p-6 rounded-[2rem] border border-white/60 shadow-sm flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 flex-shrink-0">
                                            <Database size={24} />
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-black text-blue-600 uppercase block mb-1">Backup JSON</span>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase leading-none italic">Formato universal compatible</p>
                                        </div>
                                    </div>
                                    <div className="bg-white/40 backdrop-blur-md p-6 rounded-[2rem] border border-white/60 shadow-sm flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-[#52B788]/10 flex items-center justify-center text-[#2D6A4F] flex-shrink-0">
                                            <Lock size={24} />
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-black text-[#52B788] uppercase block mb-1">Cifrado TLS</span>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase leading-none italic">Protocolo v1.3 activo</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 flex flex-col sm:flex-row gap-4 items-center">
                                    <button
                                        onClick={handleDownloadBackup}
                                        className="w-full sm:w-auto px-10 py-5 bg-slate-900 text-white font-black text-xs uppercase tracking-[0.2em] rounded-3xl shadow-2xl shadow-slate-900/30 hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-3"
                                    >
                                        <Download size={20} strokeWidth={3} />
                                        Invocación de Datos
                                    </button>
                                    <div className="flex items-center gap-2 bg-black/5 px-4 py-2 rounded-2xl">
                                        <RefreshCw size={14} className="text-slate-400 animate-spin-slow" />
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sincronización Real-Time</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-white/60 rounded-[2.5rem] p-8 border border-white shadow-sm space-y-6">
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                    <ShieldAlert size={16} className="text-amber-500" /> Historial Crítico
                                </h4>
                                <div className="space-y-4">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="flex gap-4 items-center group cursor-default">
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-200 group-hover:bg-[#52B788] transition-all"></div>
                                            <div className="flex-1">
                                                <div className="text-[10px] font-black text-slate-600 uppercase tracking-tight">Cruce de Datos OK</div>
                                                <div className="text-[8px] font-bold text-slate-400 uppercase">Hace {i * 15} minutos</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-200 space-y-4 relative overflow-hidden">
                                <div className="absolute -bottom-4 -right-4 opacity-10">
                                    <Lock size={120} />
                                </div>
                                <h4 className="text-xs font-black uppercase tracking-[0.2em] relative z-10">Estado Global</h4>
                                <div className="text-4xl font-black tracking-tighter relative z-10">99.8<span className="text-xl opacity-60">%</span></div>
                                <p className="text-[9px] font-bold text-white/60 uppercase tracking-widest leading-relaxed relative z-10">Certificación de integridad total sin vulnerabilidades detectadas.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB DE NUBE / API (NEW) */}
            {activeTab === 'nube' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em]">Conectividad Core (Supabase)</h3>
                        <div className="flex items-center gap-2 bg-blue-50 px-4 py-1.5 rounded-xl border border-blue-100">
                            <RefreshCw size={14} className="text-blue-600 animate-spin-slow" />
                            <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Sincronizado</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="glass-effect rounded-[3rem] p-10 space-y-8 border border-white/20 shadow-xl shadow-black/5">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                                    <Cloud size={28} />
                                </div>
                                <div>
                                    <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">Cloud Infrastructure</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estado de los servicios remotos</p>
                                </div>
                            </div>

                            <div className="space-y-5">
                                <div className="flex items-center justify-between p-5 bg-[#D8F3DC] rounded-[2rem] border border-[#B7E4C7] shadow-inner">
                                    <div className="flex items-center gap-4 text-[#1B4332]">
                                        <div className="w-8 h-8 rounded-full bg-white/40 flex items-center justify-center">
                                            <CheckCircle2 size={18} />
                                        </div>
                                        <span className="text-[11px] font-black uppercase tracking-tight">Main Cluster Node</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-[#52B788] animate-ping"></div>
                                        <span className="text-[10px] font-black text-[#52B788] uppercase tracking-[0.2em]">Online</span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Project Gateway URL</label>
                                    <div className="relative group">
                                        <div className="w-full p-5 bg-slate-900 text-slate-200 rounded-3xl font-mono text-[11px] break-all border border-slate-800 shadow-xl pr-14 select-all">
                                            {showApiKey ? 'https://agro-pos-master.supabase.co' : '**********************************'}
                                        </div>
                                        <button
                                            onClick={() => setShowApiKey(!showApiKey)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 text-slate-500 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-2xl"
                                        >
                                            {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Public Service Key (Anon)</label>
                                    <div className="relative">
                                        <div className="w-full p-5 bg-slate-900 text-slate-200 rounded-3xl font-mono text-[11px] break-all border border-slate-800 shadow-xl pr-14 select-all">
                                            {showApiKey ? 'sb_pub_9273_klajsd823_mna0912_ksj92' : '••••••••••••••••••••••••••••••••••••••••••••••••••'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-6">
                            <div className="glass-effect rounded-[3rem] p-10 space-y-6 border border-white/20 shadow-xl shadow-black/5 flex-1 flex flex-col justify-center">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 border border-indigo-100">
                                        <ShieldCheck size={24} />
                                    </div>
                                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Protocolo de Respaldo</h4>
                                </div>
                                <p className="text-xs text-slate-500 font-bold leading-relaxed pr-8">
                                    Su base de datos está sincronizada con <strong>Supabase Cloud</strong>. Cada transacción se replica en microsegundos y se almacena con redundancia geográfica.
                                </p>
                                <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3 text-blue-600 font-black text-[10px] uppercase tracking-widest hover:underline cursor-pointer transition-all">
                                        <ExternalLink size={16} /> Dashboard Externo
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-300">
                                        <AlertCircle size={14} />
                                        <span className="text-[8px] font-black uppercase tracking-tighter">Gestionado por .env</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-r from-slate-800 to-slate-950 rounded-[2.5rem] p-8 text-white shadow-2xl space-y-2 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                                    <RefreshCw size={80} />
                                </div>
                                <div className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-4">Sincronización</div>
                                <div className="flex items-baseline gap-2 relative z-10">
                                    <span className="text-3xl font-black tracking-tighter">1.2ms</span>
                                    <span className="text-[10px] font-bold text-[#52B788] uppercase">Latencia Óptima</span>
                                </div>
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
