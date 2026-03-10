import React from 'react';
import {
    X,
    Sun,
    TrendingUp,
    DollarSign,
    RefreshCw,
    ArrowRight,
    CheckCircle2,
    AlertCircle,
    Clock,
    Wallet
} from 'lucide-react';

export function Modal({ isOpen, title, onClose, children, maxWidth = 'max-w-md' }) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay activo">
            <div className={`modal-caja relative ${maxWidth} animate-modalEnter !p-10`} style={{ overflowY: 'auto', maxHeight: '90vh' }}>
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">{title}</h2>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div>
                    {children}
                </div>
            </div>
        </div>
    );
}

export function AperturaModal({ isOpen, onConfirm }) {
    const [tasa, setTasa] = React.useState('');
    const [usd, setUsd] = React.useState('');
    const [bs, setBs] = React.useState('');

    const isValido = parseFloat(tasa) > 0 && usd !== '' && bs !== '';
    const totalCalculado = isValido ? (parseFloat(usd) || 0) + ((parseFloat(bs) || 0) / parseFloat(tasa)) : 0;

    const [isSuccess, setIsSuccess] = React.useState(false);

    const handleAbrir = () => {
        setIsSuccess(true);
        setTimeout(() => {
            onConfirm({
                tasa: parseFloat(tasa),
                usd: parseFloat(usd) || 0,
                bs: parseFloat(bs) || 0,
                fecha: new Date().toISOString()
            });
            setIsSuccess(false);
            setTasa('');
            setUsd('');
            setBs('');
        }, 800);
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay activo">
            <div className="modal-caja animate-modalEnter">
                <div className="modal-header-elite">
                    <span className="icono-sol">☀️</span>
                    <h2>Apertura de Caja</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 italic">Sincronización de saldos</p>
                </div>

                <div className="space-y-4">
                    <div className="input-grupo-elite">
                        <label>
                            <TrendingUp size={14} className="text-blue-500" /> TASA DE CAMBIO (BS/$)
                        </label>
                        <input
                            type="number"
                            placeholder="0.00"
                            value={tasa}
                            onChange={(e) => setTasa(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="input-grupo-elite">
                            <label>
                                <DollarSign size={14} className="text-emerald-500" /> GAVETA ($)
                            </label>
                            <input
                                type="number"
                                placeholder="0.00"
                                value={usd}
                                onChange={(e) => setUsd(e.target.value)}
                            />
                        </div>
                        <div className="input-grupo-elite">
                            <label>
                                <Wallet size={14} className="text-[#52B788]" /> GAVETA (BS)
                            </label>
                            <input
                                type="number"
                                placeholder="0.00"
                                value={bs}
                                onChange={(e) => setBs(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        className="btn-abrir-elite mt-4"
                        disabled={!isValido || isSuccess}
                        onClick={handleAbrir}
                        style={{ background: isSuccess ? '#10B981' : undefined }}
                    >
                        {isSuccess ? '✓ JORNADA INICIADA' : isValido ? `INICIAR CON $${totalCalculado.toFixed(2)}` : 'COMPLETA LOS DATOS'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export function CambioDivisasModal({ isOpen, onClose }) {
    return (
        <Modal isOpen={isOpen} title="Cambio de Divisas" onClose={onClose} maxWidth="max-w-sm">
            <div className="space-y-8">
                <div className="flex items-center justify-between gap-4 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                    <div className="flex flex-col items-center gap-1 flex-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Desde</span>
                        <div className="text-xl font-black text-slate-800">$</div>
                    </div>
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-500/40">
                        <ArrowRight size={20} />
                    </div>
                    <div className="flex flex-col items-center gap-1 flex-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hacia</span>
                        <div className="text-xl font-black text-slate-800 italic font-serif">Bs</div>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Monto a convertir</label>
                    <div className="relative">
                        <DollarSign size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" />
                        <input
                            type="number"
                            placeholder="0.00"
                            className="w-full bg-slate-50 border-none outline-none pl-12 pr-6 py-4 rounded-2xl text-lg font-black text-slate-800"
                        />
                    </div>
                </div>

                <div className="p-6 bg-blue-50 rounded-[2rem] border border-blue-100/50 space-y-2 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                        <RefreshCw size={64} className="text-blue-600" />
                    </div>
                    <div>
                        <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest block">Recibirás estimado</span>
                        <span className="text-2xl font-black text-blue-600 tracking-tighter">Bs 1,825.00</span>
                    </div>
                    <div className="flex items-center gap-2 text-[9px] font-bold text-blue-400/80 italic">
                        <AlertCircle size={10} /> Tasa aplicada: 36.50
                    </div>
                </div>

                <button className="w-full py-5 rounded-3xl bg-blue-600 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all">
                    Confirmar Cambio
                </button>
            </div>
        </Modal>
    );
}

export function Toast({ message, type = 'info' }) {
    return (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[3000] px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-4 animate-slideUp animate-duration-300 ${type === 'success' ? 'bg-[#D8F3DC] text-[#1B4332] border border-[#52B788]/20' :
            type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' :
                'bg-slate-900 text-white'
            }`}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${type === 'success' ? 'bg-[#52B788] text-white' :
                type === 'error' ? 'bg-red-500 text-white' :
                    'bg-blue-500 text-white'
                }`}>
                {type === 'success' ? <CheckCircle2 size={16} /> : type === 'error' ? <AlertCircle size={16} /> : <Clock size={16} />}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">{message}</span>
        </div>
    );
}
