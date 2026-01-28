import React, { useState, useEffect } from 'react';
import { 
  Mail, Search, FileText, Eye, X, ChevronLeft, ChevronRight, 
  Trophy, RotateCcw, Hash, User, Calendar, CreditCard, 
  Phone, Bookmark, Clock, RefreshCcw, AlertTriangle, Banknote 
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
  const itemsPerPage = 10;
  
  const getToken = () => localStorage.getItem('token');

  const fetchPayments = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/payments', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      }); 
      if (response.ok) {
        const data = await response.json();
        setPayments(Array.isArray(data) ? data : []);
      }
    } catch (error) { console.error("Reconciliation sync failed:", error); } 
    finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => { fetchPayments(); }, []);
  useEffect(() => { if (events.some(e => e.drawStatus === 'drawn')) fetchPayments(true); }, [events]);

  const handleRefund = async (paymentId: string) => {
    if(!window.confirm("Verify: Execute bank refund through Monnify?")) return;
    try {
      const response = await fetch(`/api/payments/${paymentId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }
      });
      const result = await response.json();
      if (response.ok) {
        alert("✅ Monnify Refund Dispatched");
        fetchPayments();
        setSelectedPayment(null);
      } else {
        alert(`❌ Bank Rejection: ${result.message}`);
      }
    } catch (error) { alert("Communication timeout."); }
  };

  const getEventName = (id: string) => events.find(e => e._id === id)?.name || "Entry";

  const handleExportEmails = () => {
    const uniqueEmails = Array.from(new Set(filteredPayments.map(p => p.email))).join('\n');
    if (!uniqueEmails) return alert("Nothing to export.");
    const blob = new Blob([uniqueEmails], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `player_database_${Date.now()}.txt`; a.click();
  };

  const handleExportCSV = () => {
    const headers = ["Transaction Date", "Player", "Email", "Event", "Expected", "Paid", "Status", "Outcome"];
    const rows = filteredPayments.map(p => {
        const win = p.metadata?.winner === true || p.metadata?.winner === "true";
        const finished = events.find(e => e._id === p.eventValue)?.drawStatus === 'drawn';
        return [
            new Date(p.createdAt).toLocaleString(), p.name, p.email, getEventName(p.eventValue),
            p.amount, p.amountPaid, p.status, win ? "WON" : finished ? "LOST" : "WAITING"
        ];
    });
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Nicket_Ledger.csv`; a.click();
  };

  const filteredPayments = payments.filter(p => {
    const isWon = p.metadata?.winner === true || p.metadata?.winner === "true";
    const eventRef = events.find(e => e._id === p.eventValue);
    const drawFinished = eventRef?.drawStatus === 'drawn';
  
    const numsSearch = (p.selectedNumbers || []).join(' ');
    const searchString = `${p.paymentReference} ${p.name} ${p.email} ${getEventName(p.eventValue)} ${numsSearch}`.toLowerCase();

    const matchesSearch = searchString.includes(searchTerm.toLowerCase());
    const matchesEvent = filterEvent === 'all' || p.eventValue === filterEvent;
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    
    let matchesResult = true;
    if (filterResult === 'won') matchesResult = isWon;
    else if (filterResult === 'lose') matchesResult = !isWon && drawFinished;
    else if (filterResult === 'waiting') matchesResult = !isWon && !drawFinished;
    
    return matchesSearch && matchesEvent && matchesStatus && matchesResult;
  });

  const currentItems = filteredPayments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);

  const DetailRow = ({ label, value, icon: Icon, color }: { label: string, value: any, icon?: any, color?: string }) => (
    <div className="flex justify-between items-center py-3 border-b border-gray-50 last:border-0 group">
      <div className="flex items-center gap-3 text-gray-300 transition-colors">
        {Icon && <Icon size={14}/>}
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">{label}</span>
      </div>
      <span className={`text-xs font-black text-right truncate max-w-[200px] ${color || 'text-gray-900'}`}>{value || '---'}</span>
    </div>
  );

  if (loading) return <div className="h-screen flex items-center justify-center font-black uppercase text-gray-300 animate-pulse tracking-[0.5em]">Syncing Bank Audit...</div>;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* 1. RE-STYLED ACTION TOPBAR */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-black italic uppercase tracking-tighter text-gray-900 underline decoration-indigo-600 underline-offset-8">Payment Dashboard</h2>
            {isRefreshing && <RefreshCcw size={18} className="animate-spin text-indigo-600" />}
          </div>
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.3em] mt-1">Nicket</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportEmails} className="bg-white border px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-sm">EMAILS</button>
          <button onClick={handleExportCSV} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 shadow-xl tracking-widest transition-all hover:bg-indigo-700">
            <FileText size={14}/> DOWNLOAD REPORT
          </button>
        </div>
      </div>

      {/* 2. RE-ADD COMPACT FILTERS */}
      <div className="bg-white p-5 rounded-[40px] border border-gray-100 flex flex-col xl:flex-row gap-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18}/>
          <input type="text" placeholder="Ref, numbers, player name, contact or picks..." className="w-full pl-12 pr-4 py-3 rounded-3xl border-none bg-gray-50/70 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-100 transition" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
            <select className="px-5 py-3 rounded-3xl bg-white border border-gray-100 font-black text-[9px] uppercase tracking-widest outline-none" value={filterResult} onChange={(e) => setFilterResult(e.target.value)}>
                <option value="all">All Results</option>
                <option value="won">🏆 Win</option>
                <option value="lose">❌ Loss</option>
                <option value="waiting">⌛ Pending Result</option>
            </select>
            <select className="px-5 py-3 rounded-3xl bg-white border border-gray-100 font-black text-[9px] uppercase tracking-widest outline-none" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="all">All Payment</option>
                <option value="successful">Successful (PAID)</option>
                <option value="pending">Waiting (Unpaid)</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
            </select>
        </div>
      </div>

      {/* 3. UPDATED TABLE: ALL COLUMNS SYNCED */}
      <div className="bg-white rounded-[45px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-50">
              <tr className="uppercase tracking-[0.2em]">
                <th className="px-8 py-6 text-[8px] text-gray-400 font-black">Player Record</th>
                <th className="px-6 py-6 text-[8px] text-gray-400 font-black text-center shrink-0">Prize</th>
                <th className="px-6 py-6 text-[8px] text-gray-400 font-black text-center">Draw Result</th>
                <th className="px-6 py-6 text-center text-[8px] text-indigo-400 font-black italic underline underline-offset-4 decoration-indigo-400/20">Payment Status</th>
                <th className="px-8 py-6 text-right text-[8px] text-gray-400 font-black pr-14">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {currentItems.map(p => {
                const isWon = p.metadata?.winner === true || p.metadata?.winner === "true";
                const finished = events.find(e => e._id === p.eventValue)?.drawStatus === 'drawn';

                return (
                  <tr key={p._id} className="hover:bg-indigo-50/10 transition-all font-bold group">
                    <td className="px-8 py-5 border-t border-transparent">
                      <div className="font-black text-gray-900 text-sm tracking-tighter">{p.name}</div>
                      <div className="text-[9px] font-mono text-indigo-500 uppercase mt-0.5">{p.paymentReference}</div>
                    </td>
                    <td className="px-6 py-5 text-center">
                        <span className="text-[9px] font-black text-indigo-400 bg-gray-50 p-1 px-2 rounded uppercase italic">{getEventName(p.eventValue)}</span>
                    </td>
                    <td className="px-6 py-5 text-center">
                        {isWon ? <span className="bg-emerald-500 text-white p-1 px-2.5 rounded text-[9px] font-black shadow-lg">WON</span> :
                         finished ? <span className="bg-rose-100 text-rose-500 p-1 px-2.5 rounded text-[9px] font-black uppercase">LOST</span> :
                         <span className="bg-amber-100 text-amber-700 p-1 px-2.5 rounded text-[9px] font-black uppercase italic animate-pulse">Awaiting Draw</span>}
                    </td>
                    <td className="px-6 py-5 text-center">
                       {/* BANK REALITY COLUMN */}
                       <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border tracking-tighter ${
                        p.status === 'successful' ? 'text-emerald-700 border-emerald-100 bg-emerald-50' : 
                        p.status === 'pending' ? 'text-amber-600 border-amber-100 bg-amber-50' : 
                        'text-rose-500 border-rose-100 bg-rose-50'
                       }`}>{p.status}</span>
                    </td>
                    <td className="px-8 py-5 text-right">
                       <button onClick={() => setSelectedPayment(p)} className="p-3 bg-white border border-gray-100 shadow-md rounded-[20px] text-gray-300 hover:text-indigo-600 group-hover:scale-105 transition-all"><Eye size={18}/></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 4. PAGINATION SYNC */}
        <div className="p-8 border-t flex flex-col sm:flex-row justify-between items-center bg-gray-50/20 gap-4">
          <p className="text-[10px] font-black uppercase text-gray-300 tracking-[0.2em] flex items-center gap-2"><Clock size={12}/> Entry Record Set: {filteredPayments.length}</p>
          <div className="flex gap-2">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage===1} className="p-3 border rounded-2xl bg-white shadow-sm disabled:opacity-20 hover:text-indigo-600 transition"><ChevronLeft size={18}/></button>
            <div className="px-8 py-3 bg-indigo-600 rounded-2xl font-black text-[10px] text-white italic tracking-tighter shadow-lg uppercase">Section {currentPage} of {totalPages}</div>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage===totalPages} className="p-3 border rounded-2xl bg-white shadow-sm disabled:opacity-20 hover:text-indigo-600 transition"><ChevronRight size={18}/></button>
          </div>
        </div>
      </div>

      {/* 5. RECEIPT AUDITOR MODAL: INCLUDES ALL FINANCIAL FIELDS */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[1000] flex items-center justify-center p-6 animate-fade-in overflow-y-auto">
           <div className="bg-white rounded-[50px] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in duration-300 border-4 border-indigo-600/10">
             <div className="p-8 bg-gray-900 text-white relative">
               <div className="flex justify-between items-start">
                   <div>
                       <h3 className="text-3xl font-black italic uppercase tracking-tighter italic">Player Record</h3>
                       <div className="bg-white/10 px-3 py-1 mt-2 inline-block rounded font-mono text-[9px] uppercase tracking-widest text-brand-dark">TID: {selectedPayment.paymentReference}</div>
                   </div>
                   <button onClick={() => setSelectedPayment(null)} className="p-2.5 bg-white/5 rounded-full hover:bg-white/20 transition border border-white/20"><X size={20}/></button>
               </div>
             </div>
             
             <div className="px-10 py-6 space-y-1">
                <DetailRow icon={User} label="Player Name" value={selectedPayment.name}/>
                <DetailRow icon={Mail} label="Payer Contact" value={selectedPayment.email}/>
                <DetailRow icon={Trophy} label="Prize" value={getEventName(selectedPayment.eventValue)}/>
                <DetailRow icon={Calendar} label="Date" value={new Date(selectedPayment.createdAt).toLocaleString()}/>
                
                {/* FINANCIAL AUDITING SECTION */}
                <DetailRow icon={Banknote} label="Expected Payment" value={`₦${selectedPayment.amount.toLocaleString()}`}/>
                <DetailRow 
                    icon={CreditCard} 
                    label="Paid Amount" 
                    value={`₦${(selectedPayment.amountPaid || 0).toLocaleString()}`}
                    color={selectedPayment.status === 'successful' ? 'text-green-500 font-black' : 'text-rose-600 font-black underline'}
                />

                <div className="pt-8 border-t border-gray-100 mt-2">
                  <div className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-3 italic flex items-center gap-1"><Hash size={14}/> Selected Picks</div>
                  <div className="flex flex-wrap gap-2.5">
                    {selectedPayment.selectedNumbers?.map((n, i) => (
                      <span key={i} className="bg-indigo-600 text-white h-11 w-12 rounded-xl flex items-center justify-center font-black text-xl shadow-lg border-2 border-indigo-400">
                        {n}
                      </span>
                    ))}
                  </div>
                </div>
             </div>

             <div className="px-10 pb-10 flex gap-2">
               {selectedPayment.status === "successful" && (
                <button 
                  onClick={() => handleRefund(selectedPayment._id)} 
                  disabled={events.find(e => e._id === selectedPayment.eventValue)?.drawStatus === 'drawn'}
                  className={`flex-[2] flex items-center justify-center gap-2 p-5 font-black rounded-3xl uppercase text-[10px] tracking-[0.2em] transition-all shadow-xl shadow-rose-200 
                    ${events.find(e => e._id === selectedPayment.eventValue)?.drawStatus === 'drawn' ? 'bg-gray-50 text-gray-300 cursor-not-allowed' : 'bg-rose-600 text-white'}`}
                >
                  <RotateCcw size={16}/> {events.find(e => e._id === selectedPayment.eventValue)?.drawStatus === 'drawn' ? "LOCKED (DRAW COMPLETE)" : "REFUND"}
                </button>
               )}
               <button onClick={() => setSelectedPayment(null)} className="flex-1 p-5 bg-white border border-gray-200 text-gray-400 font-black rounded-3xl uppercase text-[10px] tracking-widest hover:bg-gray-100 transition">Back</button>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default PaymentsTable;
