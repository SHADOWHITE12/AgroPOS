import React, { useState } from 'react';
import socket from '../socket';
import Swal from 'sweetalert2';

function MiPerfilView({ currentUser, onProfileUpdate }) {
    const [nombre, setNombre] = useState(currentUser.nombre || '');
    const [username, setUsername] = useState(currentUser.username || '');

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [isLoadingProfile, setIsLoadingProfile] = useState(false);
    const [isLoadingPassword, setIsLoadingPassword] = useState(false);

    const handleUpdateProfile = (e) => {
        e.preventDefault();
        if (!nombre || !username) return Swal.fire('Error', 'Nombre y Username son requeridos', 'error');

        setIsLoadingProfile(true);
        socket.emit('update_profile', { id: currentUser.id, nombre, username }, (res) => {
            setIsLoadingProfile(false);
            if (res.success) {
                Swal.fire('¡Éxito!', res.message, 'success');
                onProfileUpdate({ ...currentUser, nombre, username });
            } else {
                Swal.fire('Error', res.message, 'error');
            }
        });
    };

    const handleChangePassword = (e) => {
        e.preventDefault();
        if (!currentPassword || !newPassword || !confirmPassword) {
            return Swal.fire('Error', 'Todos los campos de contraseña son requeridos', 'error');
        }
        if (newPassword !== confirmPassword) {
            return Swal.fire('Error', 'Las contraseñas nuevas no coinciden', 'error');
        }

        setIsLoadingPassword(true);
        socket.emit('cambiar_password', { id: currentUser.id, currentPassword, newPassword }, (res) => {
            setIsLoadingPassword(false);
            if (res.success) {
                Swal.fire('¡Éxito!', res.message, 'success');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                Swal.fire('Error', res.message, 'error');
            }
        });
    };

    return (
        <div className="perfil-container p-4 md:p-8 max-w-4xl mx-auto space-y-8">
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Mi Perfil</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 md:p-8 space-y-6">
                    <div>
                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest border-b border-slate-50 pb-4 mb-6">Datos Personales</h3>
                        <form onSubmit={handleUpdateProfile} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nombre Real</label>
                                <input
                                    type="text"
                                    value={nombre}
                                    onChange={e => setNombre(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none font-bold"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">ID de Acceso</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none font-black text-blue-600"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoadingProfile}
                                className="w-full bg-blue-600 text-white py-3 px-6 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
                            >
                                {isLoadingProfile ? 'Sincronizando...' : 'Guardar Cambios'}
                            </button>
                        </form>
                    </div>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 md:p-8 space-y-6">
                    <div>
                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest border-b border-slate-50 pb-4 mb-6">Seguridad</h3>
                        <form onSubmit={handleChangePassword} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Contraseña Actual</label>
                                <input
                                    type="password"
                                    value={currentPassword}
                                    onChange={e => setCurrentPassword(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none font-bold"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nueva Contraseña</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none font-bold"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Confirmar Nueva</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none font-bold"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoadingPassword}
                                className="w-full bg-emerald-600 text-white py-3 px-6 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
                            >
                                {isLoadingPassword ? 'Validando...' : 'Cambiar Clave'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default MiPerfilView;
