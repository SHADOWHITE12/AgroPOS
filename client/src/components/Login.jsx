import React, { useState } from 'react';
import socket from '../socket';
import Swal from 'sweetalert2';
import FarmBackground from './FarmBackground';
import { User, Lock, LogIn, ShieldCheck } from 'lucide-react';

function Login({ onLoginComplete }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!username || !password) {
            Swal.fire('Error', 'Debe ingresar usuario y contraseña', 'error');
            return;
        }

        setIsLoading(true);

        socket.emit('login', { username, password }, (response) => {
            setIsLoading(false);
            if (response.success) {
                // Success
                const Toast = Swal.mixin({
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 2000,
                    timerProgressBar: true
                });
                Toast.fire({
                    icon: 'success',
                    title: `¡Bienvenido, ${response.user.nombre}!`
                });
                onLoginComplete(response.user);
            } else {
                // Failure
                Swal.fire({
                    icon: 'error',
                    title: 'Acceso Denegado',
                    text: response.message || 'Credenciales inválidas'
                });
            }
        });
    };

    return (
        <div className="login-screen flex items-center justify-center min-h-screen relative overflow-hidden bg-slate-900">
            <FarmBackground />

            {/* Overlay sutil para mejorar legibilidad */}
            <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] z-0"></div>

            <div className="login-card glass-effect !bg-white/10 !border-white/20 p-10 md:p-12 w-full max-w-md rounded-[3rem] shadow-2xl relative z-10 animate-scaleIn mx-4">
                <div className="flex flex-col items-center mb-10">
                    <div className="w-20 h-20 bg-[#52B788]/20 rounded-[2rem] flex items-center justify-center text-[#52B788] mb-6 shadow-inner ring-1 ring-white/20">
                        <ShieldCheck size={40} strokeWidth={2.5} />
                    </div>
                    <h1 className="text-4xl font-black text-white lowercase tracking-tighter mb-2">agro</h1>
                    <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em]">Sistema de Gestión Elite</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2 group">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest pl-1 group-focus-within:text-[#52B788] transition-colors">Usuario</label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#52B788] transition-colors" size={18} />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Ingresa tu usuario"
                                className="w-full bg-white/5 border border-white/10 p-4 pl-12 rounded-2xl font-bold text-white placeholder:text-white/20 outline-none focus:ring-2 focus:ring-[#52B788]/50 focus:border-[#52B788]/50 transition-all"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="space-y-2 group">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest pl-1 group-focus-within:text-[#52B788] transition-colors">Contraseña</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#52B788] transition-colors" size={18} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-white/5 border border-white/10 p-4 pl-12 rounded-2xl font-bold text-white placeholder:text-white/20 outline-none focus:ring-2 focus:ring-[#52B788]/50 focus:border-[#52B788]/50 transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <div className="relative flex items-center">
                                <input type="checkbox" className="peer appearance-none w-5 h-5 border border-white/20 rounded-md checked:bg-[#52B788] checked:border-[#52B788] transition-all cursor-pointer" />
                                <div className="absolute text-white scale-0 peer-checked:scale-100 transition-transform left-1 top-1">
                                    <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20"><path d="M0 11l2-2 5 5L18 3l2 2L7 18z" /></svg>
                                </div>
                            </div>
                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest group-hover:text-white/60 transition-colors">Recordarme</span>
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-[#52B788] text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-[#52B788]/20 hover:bg-[#40916C] transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <LogIn size={18} strokeWidth={3} />
                                Acceder al Sistema
                            </>
                        )}
                    </button>

                    <div className="pt-8 text-center border-t border-white/10">
                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">
                            &copy; 2024 AGRO POS &bull; VERSIÓN ELITE
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default Login;
