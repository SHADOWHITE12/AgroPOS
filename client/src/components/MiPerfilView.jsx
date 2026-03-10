import socket from '../socket';
import Swal from 'sweetalert2';
import { User, ShieldCheck, Mail, Lock, RefreshCw, Save } from 'lucide-react';

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
        <div className="perfil-container p-4 md:p-8 max-w-4xl mx-auto space-y-8 animate-fadeIn">
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
                <User size={28} className="text-[#52B788]" />
                Mi Perfil
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="glass-effect rounded-3xl p-6 md:p-8 space-y-6">
                    <div>
                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest border-b border-black/5 pb-4 mb-6 flex items-center gap-2">
                            <ShieldCheck size={18} className="text-blue-500" />
                            Datos Personales
                        </h3>
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
                                className="w-full bg-[#1B4332] text-white py-4 px-6 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#2D6A4F] transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isLoadingProfile ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                                {isLoadingProfile ? 'Sincronizando...' : 'Guardar Cambios'}
                            </button>
                        </form>
                    </div>
                </div>

                <div className="glass-effect rounded-3xl p-6 md:p-8 space-y-6">
                    <div>
                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest border-b border-black/5 pb-4 mb-6 flex items-center gap-2">
                            <Lock size={18} className="text-emerald-500" />
                            Seguridad
                        </h3>
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
                                className="w-full bg-[#52B788] text-white py-4 px-6 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#40916C] transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isLoadingPassword ? <RefreshCw className="animate-spin" size={16} /> : <Lock size={16} />}
                                {isLoadingPassword ? 'Validando...' : 'Actualizar Contraseña'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default MiPerfilView;
