import React, { useState, useEffect } from 'react';
import {
  Mail, Search, FileText, Eye, X, ChevronLeft, ChevronRight,
  Trophy, RotateCcw, Hash, User, Calendar, CreditCard,
  Bookmark, Clock, RefreshCcw, AlertTriangle, Phone, Banknote,
  CheckSquare, Square
} from 'lucide-react';
import { PaymentData, EventData } from '../types';

interface PaymentsTableProps {
  events: EventData[];
}

const PaymentsTable: React.FC<PaymentsTableProps> = ({ events }) => {
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEvent, setFilterEvent] = useState('all'); 
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterResult, setFilterResult] = useState('all');
  const [selectedPayment, setSelectedPayment] = useState<PaymentData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const itemsPerPage = 10;
  const getToken = () => localStorage.getItem('token');

  const fetchPayments = async (background = false) => {
    if (!background) setLoading(true);
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/payments', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPayments(Array.isArray(data) ? data : []);
      }
    } catch (err) { console.error('Ledger Error:', err); } 
    finally { setLoading(false); setIsRefreshing(false); }
  };

  useEffect(() => { fetchPayments(); }, []);
  useEffect(() => {
    if (events.some(e => e.drawStatus === 'drawn')) fetchPayments(true);
  }, [events]);

  const handleRefund = async (pid: string) => {
    if(!window.confirm("Verify: Execute REAL bank refund?")) return;
    try {
      const res = await fetch(`/api/payments/${pid}/refund`, { method: 'POST', headers: { 'Authorization': `Bearer ${getToken()}` } });
      const result = await res.json();
      if (res.ok) { alert("✅ Monnify Refund Dispatched"); fetchPayments(); setSelectedPayment(null); }
      else { alert(`❌ Rejected: ${result.message}`); }
    } catch (e) { alert("Network Error"); }
  };

  const getEventName = (id: string) => events.find(e => e._id === id)?.name || 'Lottery Entry';

  const getTargetData = () => {
    if (selectedIds.length > 0) {
      return payments.filter(p => selectedIds.includes(p._id));
    }
    return filteredPayments;
  };

  const handleExportEmails = () => {
    const data = getTargetData();
    const emails = Array.from(new Set(data.map(p => p.email))).join('\n');
    if (!emails) return alert('No records found to extract.');
    const blob = new Blob([emails], { type: 'text/plain' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `players_export.txt`; a.click();
  };

  const handleExportCSV = () => {
    const data = getTargetData();
    const headers = ['Timestamp', 'Payer', 'Email', 'Event', 'Paid (NGN)', 'Status', 'Draw Result', 'Bank Ref'];
    const rows = data.map(p => {
      const isWon = p.metadata?.winner === true || p.metadata?.winner === "true";
      const finished = events.find(e => e._id === p.eventValue)?.drawStatus === 'drawn';
      return [
        new Date(p.createdAt).toLocaleString(), p.name, p.email, getEventName(p.eventValue),
        p.amountPaid, p.status, isWon ? 'WON' : finished ? 'LOSE' : 'WAITING', p.paymentReference
      ];
    });
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `Financial_Report.csv`; a.click();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    const visibleIds = currentItems.map(i => i._id);
    const allCurrentSelected = visibleIds.every(id => selectedIds.includes(id));
    if (allCurrentSelected) {
        setSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
        setSelectedIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const filteredPayments = payments.filter(p => {
    const win = p.metadata?.winner === true || p.metadata?.winner === "true";
    const event = events.find(e => e._id === p.eventValue);
    const finished = event?.drawStatus === 'drawn';

    const searchContext = `${p.name} ${p.paymentReference} ${p.transactionReference} ${p.email} ${(p.selectedNumbers || []).join(' ')} ${getEventName(p.eventValue)}`.toLowerCase();
    
    if (!searchContext.includes(searchTerm.toLowerCase())) return false;
    if (filterEvent !== 'all' && p.eventValue !== filterEvent) return false;
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;

    if (filterResult === 'won') return win;
    if (filterResult === 'lose') return !win && finished;
    if (filterResult === 'waiting') return !win && !finished;
    return true;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const currentItems = filteredPayments.slice(indexOfLastItem - itemsPerPage, indexOfLastItem);
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);

  const DetailRow = ({ label, value, icon: Icon, color }: { label: string, value: any, icon?: any, color?: string }) => (
    <div className="flex justify-between items-center py-3 border-b border-gray-50 last:border-0 group">
      <div className="flex items-center gap-3 text-gray-300">
        {Icon && <Icon size={14}/>}
        <span className="text-[10px] font-black uppercase tracking-[0.15em]">{label}</span>
      </div>
      <span className={`text-xs font-black text-right truncate max-w-[230px] ${color || 'text-gray-950'}`}>{value || 'N/A'}</span>
    </div>
  );

  if (loading) return <div className="h-screen flex items-center justify-center font-black uppercase text-gray-400 animate-pulse tracking-[0.5em]">Establishing Secure Sync...</div>;

  return (
    <div className="space-y-6 pb-24 animate-fade-in px-4 lg:px-0">
      
      {/* 🟢 TOP ACTION SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-center lg:items-end gap-6 bg-white p-6 rounded-[35px] border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-black italic uppercase tracking-tighter italic decoration-indigo-600 underline-offset-4 decoration-4">Payment Dashboard</h2>
            {isRefreshing && <RefreshCcw size={20} className="animate-spin text-indigo-600" />}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Accounting Status: Verified</p>
          </div>
        </div>

        <div className="flex gap-2 w-full lg:w-auto">
          <button onClick={handleExportEmails} className="flex-1 bg-gray-50 text-gray-600 border border-gray-200 px-8 py-4 rounded-[22px] text-[10px] font-black uppercase tracking-widest hover:bg-white">
            Export Mails {selectedIds.length > 0 && `(${selectedIds.length})`}
          </button>
          <button onClick={handleExportCSV} className="flex-1 bg-indigo-700 text-white px-8 py-4 rounded-[22px] text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-xl shadow-indigo-200">
            <FileText size={16}/> Master CSV {selectedIds.length > 0 && `(${selectedIds.length})`}
          </button>
        </div>
      </div>

      {/* 🟠 CONTROL PANEL (FILTER + SEARCH) */}
      <div className="bg-white p-6 rounded-[40px] border border-gray-100 flex flex-col xl:flex-row gap-5 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={22}/>
          <input type="text" placeholder="Ref ID, player identity, or picked numbers..." className="w-full pl-16 pr-4 py-5 rounded-[28px] border-none bg-gray-50/70 font-bold text-sm focus:ring-4 focus:ring-indigo-50 transition" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex gap-3 items-center flex-wrap">
            <select className="px-5 py-4 rounded-3xl bg-white border border-gray-100 font-black text-[9px] uppercase tracking-widest" value={filterResult} onChange={(e) => setFilterResult(e.target.value)}>
                <option value="all">Any Draw Outcome</option>
                <option value="won">🏆 Win Result</option>
                <option value="lose">❌ Lost Records</option>
                <option value="waiting">⌛ Pending Sync</option>
            </select>
            <select className="px-5 py-4 rounded-3xl bg-white border border-gray-100 font-black text-[9px] uppercase tracking-widest" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="all">Any Payment Status</option>
                <option value="successful">Success (PAID)</option>
                <option value="pending">Waiting (PENDING)</option>
                <option value="failed">Incomplete/Failed</option>
            </select>
            {/* ✅ RESTORED: SPECIFIC RAFFLE DROPDOWN */}
            <select className="px-5 py-4 rounded-3xl bg-white border border-gray-100 font-black text-[9px] uppercase tracking-widest max-w-[140px]" value={filterEvent} onChange={(e) => setFilterEvent(e.target.value)}>
                <option value="all">Raffle Type: All</option>
                {events.map(e => (<option key={e._id} value={e._id}>{e.name}</option>))}
            </select>
        </div>
      </div>

      {/* 📊 MASTER TABLE VIEW */}
      <div className="bg-white rounded-[50px] border border-gray-100 shadow-lg overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/80 border-b border-gray-100 uppercase font-black">
              <tr className="tracking-[0.2em]">
                <th className="px-8 py-8 w-12 text-center" onClick={toggleSelectAll}>
                    {currentItems.every(i => selectedIds.includes(i._id)) ? <CheckSquare className="text-indigo-600" /> : <Square className="text-gray-300" />}
                </th>
                <th className="px-6 py-8 text-[9px] text-gray-400">Payer record</th>
                <th className="px-6 py-8 text-[9px] text-gray-400">Target pool</th>
                <th className="px-6 py-8 text-center text-[9px] text-gray-400">Result</th>
                <th className="px-6 py-8 text-center text-[9px] text-indigo-400 italic">Bank Status</th>
                <th className="px-8 py-8 text-right text-[9px] text-gray-400">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {currentItems.map(p => {
                const isWon = p.metadata?.winner === true || p.metadata?.winner === "true";
                const isDrawn = events.find(e => e._id === p.eventValue)?.drawStatus === 'drawn';
                const isSelected = selectedIds.includes(p._id);

                return (
                  <tr key={p._id} className={`transition-all duration-200 group ${isSelected ? 'bg-indigo-50/40' : 'hover:bg-indigo-50/10'}`}>
                    <td className="px-8 py-7 w-12 text-center" onClick={() => toggleSelect(p._id)}>
                        {isSelected ? <CheckSquare size={18} className="text-indigo-600" /> : <Square size={18} className="text-gray-200" />}
                    </td>
                    <td className="px-6 py-7">
                      <div className="font-black text-gray-800 text-sm tracking-tight">{p.name}</div>
                      <div className="text-[10px] font-mono text-indigo-400 uppercase mt-1">{p.paymentReference}</div>
                    </td>
                    <td className="px-6 py-7">
                        <span className="text-[9px] font-black text-gray-400 border border-gray-100 bg-gray-50 p-1 px-2 rounded-md uppercase italic tracking-tighter">{getEventName(p.eventValue)}</span>
                    </td>
                    <td className="px-6 py-7 text-center">
                        {isWon ? <span className="bg-green-600 text-white p-1 px-3 rounded-md text-[9px] font-black shadow-lg">Winner!</span> :
                         isDrawn ? <span className="bg-rose-50 text-rose-500 border border-rose-100 p-1 px-3 rounded-md text-[9px] font-bold">LOSE</span> :
                         <span className="bg-amber-100 text-amber-700 p-1 px-3 rounded-md text-[9px] font-black uppercase italic animate-pulse">Wait ⌛</span>}
                    </td>
                    <td className="px-6 py-7 text-center">
                       <span className={`px-2 py-0.5 rounded-[5px] text-[8px] font-black uppercase border tracking-widest ${
                        p.status === 'successful' ? 'text-emerald-500 border-emerald-100 bg-emerald-50' : 
                        p.status === 'pending' ? 'text-amber-500 border-amber-100 bg-amber-50' : 'text-rose-500 border-rose-100 bg-rose-50'
                       }`}>{p.status}</span>
                    </td>
                    <td className="px-8 py-7 text-right">
                       <button onClick={() => setSelectedPayment(p)} className="p-3 bg-white border border-gray-100 shadow-md rounded-[20px] text-gray-300 hover:text-indigo-600 hover:scale-110 transition shadow-indigo-100"><Eye size={20}/></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* PAGINATION LOGIC */}
        <div className="p-10 border-t flex flex-col lg:flex-row justify-between items-center gap-6 bg-gray-50/20">
          <p className="text-[10px] font-black uppercase text-gray-300 tracking-[0.2em] italic">Pointer Log: {filteredPayments.length} Valid Records</p>
          <div className="flex gap-2">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-4 bg-white border rounded-[22px] disabled:opacity-20 hover:text-indigo-600 transition shadow-sm"><ChevronLeft size={24}/></button>
            <div className="px-10 py-3 bg-indigo-700 text-white rounded-[22px] flex items-center font-black text-xs italic tracking-tighter uppercase shadow-2xl">Page {currentPage}</div>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-4 bg-white border rounded-[22px] disabled:opacity-20 hover:text-indigo-600 transition shadow-sm"><ChevronRight size={24}/></button>
          </div>
        </div>
      </div>

      {/* 🟠 DETAILED RECEIPT OVERHAUL (MODAL) */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[5000] flex items-center justify-center p-6 animate-fade-in overflow-y-auto">
           <div className="bg-white rounded-[70px] max-w-xl w-full overflow-hidden shadow-2xl border-[5px] border-indigo-600/5 animate-in zoom-in duration-300">
             <div className="p-12 bg-gray-950 text-white text-center">
               <h3 className="text-4xl font-black uppercase italic tracking-tighter mb-2 decoration-brand-gold underline decoration-4 underline-offset-[10px]">Registry Audit</h3>
               <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-1.5 mt-5 inline-block">
                 <span className="font-mono text-[10px] uppercase text-indigo-400 tracking-[0.4em]">UUID: {selectedPayment._id}</span>
               </div>
               <button onClick={() => setSelectedPayment(null)} className="absolute top-8 right-8 bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition"><X/></button>
             </div>
             
             <div className="px-12 py-10 space-y-1">
                <DetailRow icon={User} label="Subscriber Name" value={selectedPayment.name}/>
                <DetailRow icon={Phone} label="Account Mobile" value={selectedPayment.phone}/>
                <DetailRow icon={Mail} label="Record Email" value={selectedPayment.email}/>
                <DetailRow icon={Trophy} label="Prize Tier" value={getEventName(selectedPayment.eventValue)}/>
                <DetailRow icon={Calendar} label="Transaction Datetime" value={new Date(selectedPayment.createdAt).toLocaleString()}/>
                
                {/* ✅ ADDED: BANK TRASNCTION ID ROW */}
                <DetailRow icon={RotateCcw} label="Monnify TRX Ref" value={selectedPayment.transactionReference || 'N/A'} color="text-indigo-600"/>

                {/* ✅ MONETARY TRANSPARENCY ROWS */}
                <DetailRow icon={Banknote} label="Billed amount" value={`₦${selectedPayment.amount.toLocaleString()}`}/>
                <DetailRow 
                    icon={CreditCard} 
                    label="Bank verified payment" 
                    value={`₦${(selectedPayment.amountPaid || 0).toLocaleString()}`}
                    color={selectedPayment.status === 'successful' ? 'text-emerald-500 font-black scale-110' : 'text-rose-500 font-bold'}
                />

                <div className="pt-10">
                   <div className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-4 flex items-center gap-1 italic"><Hash size={16}/> Sealed selections Pool</div>
                   <div className="flex flex-wrap gap-3">
                     {(selectedPayment.selectedNumbers || []).map((n, i) => (
                       <span key={i} className="bg-indigo-700 text-white h-11 w-13 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg border-2 border-indigo-500/50">{n}</span>
                     ))}
                   </div>
                </div>
             </div>

             <div className="px-12 pb-12 flex gap-4">
               {selectedPayment.status === "successful" && (
                <button 
                  onClick={() => handleRefund(selectedPayment._id)} 
                  disabled={events.find(e => e._id === selectedPayment.eventValue)?.drawStatus === 'drawn'}
                  className={`flex-[3] flex items-center justify-center gap-2 p-6 font-black rounded-[40px] uppercase text-[10px] tracking-widest transition-all 
                    ${events.find(e => e._id === selectedPayment.eventValue)?.drawStatus === 'drawn' 
                        ? 'bg-gray-100 text-gray-300 border' 
                        : 'bg-rose-600 text-white shadow-xl hover:shadow-rose-100 shadow-rose-200'}`}
                >
                  <RotateCcw size={16}/> {events.find(e => e._id === selectedPayment.eventValue)?.drawStatus === 'drawn' ? "LOCKED AFTER DRAW" : "REMIT BANK REFUND"}
                </button>
               )}
               <button onClick={() => setSelectedPayment(null)} className="flex-[1] p-6 bg-white border border-gray-100 text-gray-500 font-black rounded-[40px] uppercase text-[10px] tracking-[0.2em] shadow-inner">BACK</button>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};
export default PaymentsTable;
