import React from 'react';
import {
    X,
    BarChart3,
    DollarSign,
    CreditCard,
    Printer,
    Calculator,
    ChevronRight,
    Wallet
} from 'lucide-react';

function CierreModal({ isOpen, onClose, exchangeRate, cajaBalances, movimientos = [], onConfirmCierre }) {
    if (!isOpen) return null;

    const stats = React.useMemo(() => {
        let puntoBs = 0;
        let biopagoBs = 0;
        let pagoMovilBs = 0;

        const startOfDay = new Date(); startOfDay.setHours(0,0,0,0);

        movimientos.filter(m => {
            if (!m.fechaHora) return false;
            const d = new Date(m.fechaHora);
            return d >= startOfDay;
        }).forEach(ticket => {
            ticket.metodoPago?.forEach(m => {
                const montoBs = m.montoBs || (m.monto * (ticket.exchangeRate || exchangeRate)) || 0;
                if (m.metodo === 'Punto' || m.metodo === 'Punto DB/CR') puntoBs += montoBs;
                else if (m.metodo === 'Biopago') biopagoBs += montoBs;
                else if (m.metodo === 'Pago Móvil') pagoMovilBs += montoBs;
            });
        });

        const digitalTotalBs = puntoBs + biopagoBs + pagoMovilBs;
        const totalEquivalenteUsd = (cajaBalances.bs / (exchangeRate || 1)) + cajaBalances.usd + (digitalTotalBs / (exchangeRate || 1));

        return { puntoBs, biopagoBs, pagoMovilBs, digitalTotalBs, totalEquivalenteUsd };
    }, [movimientos, cajaBalances, exchangeRate]);

    const handlePrint = () => {
        const now = new Date().toLocaleString();
        let report = `=================================\n`;
        report += `      REPORTE DE CIERRE (Z)\n`;
        report += `=================================\n\n`;
        report += `Fecha: ${now}\n`;
        report += `Tasa: Bs ${exchangeRate.toFixed(2)}\n\n`;
        report += `--- EFECTIVO EN CAJA ---\n`;
        report += `Bolívares: Bs ${cajaBalances.bs.toLocaleString()}\n`;
        report += `Dólares: $${cajaBalances.usd.toLocaleString()}\n\n`;
        report += `--- VENTAS DIGITALES ---\n`;
        report += `Punto de Venta: Bs ${stats.puntoBs.toLocaleString()}\n`;
        report += `Biopago: Bs ${stats.biopagoBs.toLocaleString()}\n`;
        report += `Pago Móvil: Bs ${stats.pagoMovilBs.toLocaleString()}\n`;
        report += `TOTAL DIGITAL: Bs ${stats.digitalTotalBs.toLocaleString()}\n\n`;
        report += `--- BALANCE TOTAL ---\n`;
        report += `TOTAL USD EQUIV: $${stats.totalEquivalenteUsd.toFixed(2)}\n\n`;
        report += `=================================\n`;

        const blob = new Blob([report], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        a.download = `Reporte_Z_${new Date().getTime()}.txt`;
        document.body.appendChild(a); a.click();
        window.URL.revokeObjectURL(url); document.body.removeChild(a);

        if (window.confirm('¿Deseas cerrar la jornada permanentemente?')) {
            onConfirmCierre();
        }
    };

    return (
        <div className="modal-overlay activo">
            <div className="modal-caja !max-w-md animate-modalEnter !p-10" style={{ overflowY: 'auto', maxHeight: '95vh' }}>
                <div className="modal-header-elite !mb-6">
                    <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-[#1B4332] mx-auto mb-4 shadow-inner">
                        <BarChart3 size={28} />
                    </div>
                    <h2 className="!text-xl font-black text-slate-800 uppercase tracking-tighter">Cierre de Jornada</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1 italic">RESUMEN FINANCIERO (Z)</p>
                </div>

                <div className="space-y-3 mb-8">
                    {/* EFECTIVO EN CAJA */}
                    <div className="p-5 bg-slate-50 rounded-3xl border border-transparent hover:border-slate-100 transition-all">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-4 border-b border-slate-200 pb-2 flex items-center gap-2">
                            <Wallet size={12} className="text-emerald-500" /> EFECTIVO EN GAVETA
                        </span>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[8px] font-black text-slate-300 uppercase mb-1">DÓLARES ($)</p>
                                <p className="text-xl font-black text-emerald-600">${cajaBalances.usd.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-[8px] font-black text-slate-300 uppercase mb-1">BOLÍVARES (BS)</p>
                                <p className="text-xl font-black text-slate-800">Bs {cajaBalances.bs.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    {/* VENTAS DIGITALES */}
                    <div className="p-5 bg-slate-50 rounded-3xl border border-transparent hover:border-slate-100 transition-all">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-4 border-b border-slate-200 pb-2 flex items-center gap-2">
                            <CreditCard size={12} className="text-purple-500" /> VENTAS DIGITALES (DETALLE)
                        </span>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center px-1">
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Punto de Venta</span>
                                <span className="text-xs font-black text-slate-700">Bs {stats.puntoBs.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center px-1">
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Biopago</span>
                                <span className="text-xs font-black text-slate-700">Bs {stats.biopagoBs.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center px-1">
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Pago Móvil</span>
                                <span className="text-xs font-black text-slate-700">Bs {stats.pagoMovilBs.toLocaleString()}</span>
                            </div>
                            <div className="pt-2 mt-2 border-t border-dashed border-slate-200 flex justify-between items-center px-1">
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-purple-600 uppercase">SUBTOTAL DIGITAL</span>
                                    <span className="text-[8px] font-bold text-slate-400 italic">Equiv. ${(stats.digitalTotalBs / (exchangeRate || 1)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <span className="text-sm font-black text-purple-600 italic">Bs {stats.digitalTotalBs.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* CONSOLIDADO TOTAL */}
                    <div className="mt-4">
                        <div className="flex flex-col items-center justify-center p-8 bg-[#1B4332] rounded-[2.5rem] shadow-xl shadow-emerald-900/40 relative overflow-hidden text-center group">
                            <div className="absolute -right-6 -bottom-6 opacity-10 rotate-12 text-white group-hover:scale-110 transition-transform duration-700">
                                <Calculator size={120} />
                            </div>
                            <span className="relative z-10 text-[10px] font-black text-emerald-200 uppercase tracking-[0.4em] mb-3">VENTA TOTAL CONSOLIDADA</span>
                            <div className="relative z-10 flex flex-col items-center">
                                <h3 className="text-5xl font-black text-white tracking-tighter leading-none mb-2">
                                    ${stats.totalEquivalenteUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </h3>
                                <div className="bg-white/10 backdrop-blur-sm px-6 py-1.5 rounded-full border border-white/20">
                                    <p className="text-[8px] font-black text-white uppercase tracking-widest italic opacity-80">
                                        Efectivo + Digitales ($)
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 sticky bottom-0 bg-white pt-4 mt-6 border-t border-slate-100">
                    <button
                        className="flex-1 py-4 rounded-2xl bg-white text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-50 transition-all border-2 border-slate-100 hover:border-slate-200 active:scale-95 shadow-sm"
                        onClick={onClose}
                    >
                        REGRESAR
                    </button>
                    <button
                        className="flex-[2] py-4 rounded-2xl bg-gradient-to-tr from-[#1B4332] to-[#2D6A4F] text-white font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:shadow-xl hover:shadow-emerald-900/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all"
                        onClick={handlePrint}
                    >
                        <Printer size={16} /> EMITIR REPORTE (Z)
                    </button>
                </div>
            </div>
        </div>
    );
}

export default CierreModal;
