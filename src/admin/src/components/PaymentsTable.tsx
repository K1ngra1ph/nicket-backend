import React, { useState, useEffect } from 'react';
import { Mail, Search, FileText, Eye, X, ChevronLeft, ChevronRight, Trophy, RotateCcw, Hash, User, Calendar, CreditCard, Phone, Bookmark, Clock, RefreshCcw, AlertTriangle } from 'lucide-react';
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
        setPayments(data);
      }
    } catch (error) { console.error("Data Sync Error:", error); } 
    finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => { fetchPayments(); }, []);
  useEffect(() => { if (events.some(e => e.drawStatus === 'drawn')) fetchPayments(true); }, [events]);

  const handleRefund = async (paymentId: string) => {
    if(!window.confirm("Verify: Process REAL bank refund through Monnify? This action is permanent.")) return;
    try {
      const response = await fetch(`/api/payments/${paymentId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }
      });
      const result = await response.json();
      if (response.ok) {
        alert("✅ Money returned to user successfully.");
        fetchPayments();
        setSelectedPayment(null);
      } else {
        alert(`❌ Refund Failed: ${result.message || 'Check wallet balance.'}`);
      }
    } catch (error) { alert("Communication Error"); }
  };

  const getEventName = (id: string) => events.find(e => e._id === id)?.name || "Unknown Event";

  const handleExportEmails = () => {
    const uniqueEmails = Array.from(new Set(filteredPayments.map(p => p.email))).join('\n');
    if (!uniqueEmails) return alert("No results found to export.");
    const blob = new Blob([uniqueEmails], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `Nicket_Emails.txt`; a.click();
  };

  const handleExportCSV = () => {
    const headers = ["Date", "Name", "Email", "Phone", "Event", "Amount", "Status", "Outcome", "Numbers"];
    const rows = filteredPayments.map(p => {
        const isWon = p.metadata?.winner === true || p.metadata?.winner === "true";
        const finished = events.find(e => e._id === p.eventValue)?.drawStatus === 'drawn';
        return [
            new Date(p.createdAt).toLocaleString(), p.name, p.email, p.phone, getEventName(p.eventValue),
            p.amountPaid, p.status, isWon ? "WON" : finished ? "LOST" : "WAITING", p.selectedNumbers.join(' ')
        ];
    });
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Reporting_Session.csv`; a.click();
  };

  const filteredPayments = payments.filter(p => {
    const isWinner = p.metadata?.winner === true || p.metadata?.winner === "true";
    const drawFinished = events.find(e => e._id === p.eventValue)?.drawStatus === 'drawn';
    const numSearch = (p.selectedNumbers || []).join(' '); 
    const searchString = `${p.paymentReference} ${p.name} ${p.email} ${p.phone} ${getEventName(p.eventValue)} ${numSearch}`.toLowerCase();

    const matchesSearch = searchString.includes(searchTerm.toLowerCase());
    const matchesEvent = filterEvent === 'all' || p.eventValue === filterEvent;
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    
    let matchesResult = true;
    if (filterResult === 'won') matchesResult = isWinner;
    else if (filterResult === 'lose') matchesResult = !isWinner && drawFinished;
    else if (filterResult === 'waiting') matchesResult = !isWinner && !drawFinished;
    
    return matchesSearch && matchesEvent && matchesStatus && matchesResult;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const currentItems = filteredPayments.slice(indexOfLastItem - itemsPerPage, indexOfLastItem);
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);

  const DetailRow = ({ label, value, icon: Icon }: { label: string, value: any, icon?: any }) => (
    <div className="flex justify-between items-center py-3 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-3 text-gray-400">
        {Icon && <Icon size={14}/>}
        <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <span className="text-xs font-black text-gray-900 text-right">{value || 'N/A'}</span>
    </div>
  );

  if (loading) return <div className="h-screen flex items-center justify-center font-black uppercase text-gray-400 animate-pulse tracking-[0.4em]">Vault Access Initiating...</div>;

  const selectedEventDrawn = selectedPayment ? events.find(e => e._id === selectedPayment.eventValue)?.drawStatus === 'drawn' : false;

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
            <div className="flex items-center gap-3">
                <h2 className="text-3xl font-black italic uppercase tracking-tighter text-gray-900">Payment Dashboard</h2>
                {isRefreshing && <RefreshCcw size={18} className="text-indigo-600 animate-spin" />}
            </div>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Nicket</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
           <button onClick={handleExportEmails} className="flex-1 bg-white border border-gray-200 text-gray-500 p-3 px-8 rounded-2xl text-[10px] font-black uppercase shadow-sm">Unique Emails</button>
           <button onClick={handleExportCSV} className="flex-1 bg-indigo-600 text-white p-3 px-8 rounded-2xl text-[10px] font-black uppercase shadow-xl flex items-center gap-2"><FileText size={14}/> Master CSV</button>
        </div>
      </div>

      <div className="bg-white p-5 rounded-[40px] border border-gray-100 flex flex-col xl:flex-row gap-5 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20}/>
          <input type="text" placeholder="Ref, Email, Player Name or Picks..." className="w-full pl-14 pr-4 py-4 rounded-3xl border-none bg-gray-50 font-bold text-sm outline-none ring-1 ring-transparent focus:ring-indigo-100 transition" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap items-center">
            <select className="px-5 py-4 rounded-3xl bg-white border border-gray-100 font-black text-[10px] uppercase tracking-widest" value={filterResult} onChange={(e) => setFilterResult(e.target.value)}>
                <option value="all">All Results</option>
                <option value="won">Wins</option>
                <option value="lose">Lose</option>
                <option value="waiting">Draw Pending</option>
            </select>
            <select className="px-5 py-4 rounded-3xl bg-white border border-gray-100 font-black text-[10px] uppercase tracking-widest" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="all">Payment Status</option>
                <option value="successful">Success</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
            </select>
            <select className="px-5 py-4 rounded-3xl bg-white border border-gray-100 font-black text-[10px] uppercase max-w-[150px]" value={filterEvent} onChange={(e) => setFilterEvent(e.target.value)}>
                <option value="all">All Event</option>
                {events.map(e => (<option key={e._id} value={e._id}>{e.name}</option>))}
            </select>
        </div>
      </div>

      <div className="bg-white rounded-[45px] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-7 text-[10px] font-black uppercase text-gray-400">Player Record</th>
                <th className="px-6 py-7 text-[10px] font-black uppercase text-gray-400">Event</th> 
                <th className="px-6 py-7 text-[10px] font-black uppercase text-gray-400 text-center">Result</th>
                <th className="px-6 py-7 text-[10px] font-black uppercase text-gray-400 text-center">Payment Status</th>
                <th className="px-8 py-7 text-[10px] font-black uppercase text-gray-400 text-right">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 font-bold">
              {currentItems.map((p) => {
                const isWon = p.metadata?.winner === true || p.metadata?.winner === "true";
                const finished = events.find(e => e._id === p.eventValue)?.drawStatus === 'drawn';
                return (
                  <tr key={p._id} className="hover:bg-indigo-50/10 transition-all">
                    <td className="px-8 py-5 border-t border-transparent first:border-t-0">
                      <div className="font-black text-gray-800 text-sm tracking-tight">{p.name}</div>
                      <div className="text-[9px] font-mono text-indigo-400 uppercase tracking-tighter">{p.paymentReference}</div>
                    </td>
                    <td className="px-6 py-5">
                        <span className="text-[10px] font-black text-indigo-600 bg-indigo-50/80 px-2 py-1 rounded uppercase tracking-tighter">{getEventName(p.eventValue)}</span>
                    </td>
                    <td className="px-6 py-5 text-center">
                        {isWon ? <span className="bg-green-600 text-white p-1 px-3 rounded-md text-[9px] font-black uppercase">WON</span> :
                         finished ? <span className="bg-rose-100 text-rose-500 p-1 px-3 rounded-md text-[9px] font-black uppercase">LOSE</span> :
                         <span className="bg-amber-100 text-amber-700 p-1 px-3 rounded-md text-[9px] font-black uppercase tracking-widest italic animate-pulse">WAITING</span>}
                    </td>
                    <td className="px-6 py-5 text-center uppercase text-[10px] font-black tracking-widest">
                       <span className={p.status === 'successful' ? 'text-emerald-500' : p.status === 'refunded' ? 'text-indigo-400' : 'text-amber-500'}>{p.status}</span>
                    </td>
                    <td className="px-8 py-5 text-right">
                       <button onClick={() => setSelectedPayment(p)} className="p-3 bg-white border border-gray-100 shadow-sm rounded-2xl text-gray-400 hover:text-indigo-600 hover:scale-105 transition-all"><Eye size={20}/></button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="p-10 border-t flex flex-col sm:flex-row justify-between items-center gap-6 bg-gray-50/20">
          <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2"><Clock size={12}/> DB Count: {filteredPayments.length} Tickets Found</p>
          <div className="flex gap-2">
            <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage===1} className="p-3 bg-white border border-gray-200 rounded-2xl disabled:opacity-20 hover:text-indigo-600 transition-all shadow-sm"><ChevronLeft size={24}/></button>
            <div className="px-8 py-3 bg-white border border-indigo-100 rounded-2xl flex items-center font-black text-xs uppercase text-indigo-600">Page {currentPage} of {totalPages}</div>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage===totalPages} className="p-3 bg-white border border-gray-200 rounded-2xl disabled:opacity-20 hover:text-indigo-600 transition-all shadow-sm"><ChevronRight size={24}/></button>
          </div>
        </div>
      </div>

      {selectedPayment && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[1000] flex items-center justify-center p-6 animate-fade-in overflow-y-auto">
           <div className="bg-white rounded-[60px] w-full max-w-xl shadow-2xl overflow-hidden border border-white">
             <div className="p-10 bg-indigo-700 text-white relative">
               <div className="flex justify-between items-start">
                   <div>
                       <h3 className="text-4xl font-black italic uppercase tracking-tighter italic">Player Record</h3>
                       <p className="text-[10px] font-black text-white/50 tracking-[0.4em] uppercase mt-2">{selectedPayment.paymentReference}</p>
                   </div>
                   <button onClick={() => setSelectedPayment(null)} className="p-3 rounded-full hover:bg-white/10 transition-colors border border-white/20"><X size={20}/></button>
               </div>
             </div>
             
             <div className="px-12 py-10 space-y-1">
                <DetailRow icon={User} label="Record Name" value={selectedPayment.name}/>
                <DetailRow icon={Mail} label="Player Contact" value={selectedPayment.email}/>
                <DetailRow icon={Bookmark} label="Ticket ID" value={selectedPayment.paymentReference}/>
                <DetailRow icon={Calendar} label="Transaction Datetime" value={new Date(selectedPayment.createdAt).toLocaleString()}/>
                <DetailRow icon={Trophy} label="Prize" value={getEventName(selectedPayment.eventValue)}/>
                <DetailRow icon={RotateCcw} label="Draw Outcome" value={
                    (selectedPayment.metadata?.winner === true || selectedPayment.metadata?.winner === "true") 
                    ? <span className="text-green-500 font-black italic tracking-widest">WON DRAW 🏆</span>
                    : selectedEventDrawn ? <span className="text-rose-500 font-bold uppercase tracking-widest italic opacity-50">LOST </span>
                    : <span className="text-amber-500 font-bold italic tracking-tighter uppercase">WAITING FOR RESULTS ⌛</span>
                }/>

                <div className="pt-8 mt-6 border-t border-gray-100">
                  <div className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-4 italic flex items-center gap-1"><Hash size={14}/> Selection Stub</div>
                  <div className="flex flex-wrap gap-2.5">
                    {selectedPayment.selectedNumbers?.map((n, i) => (
                      <span key={i} className="bg-gray-100 border border-gray-100 text-indigo-700 h-11 w-12 rounded-xl flex items-center justify-center font-black text-lg shadow-sm border-b-4 border-b-gray-200">
                        {n}
                      </span>
                    ))}
                  </div>
                </div>
             </div>

             <div className="px-12 pb-12 flex gap-3">
               {selectedPayment.status === "successful" && (
                <button 
                  onClick={() => handleRefund(selectedPayment._id)} 
                  disabled={selectedEventDrawn}
                  className={`flex-[2] flex items-center justify-center gap-3 p-5 font-black rounded-[32px] uppercase text-[10px] tracking-[0.2em] transition-all 
                    ${selectedEventDrawn ? 'bg-gray-50 text-gray-300 cursor-not-allowed border' : 'bg-rose-600 text-white shadow-xl hover:scale-[0.98]'}`}
                >
                  {selectedEventDrawn ? <AlertTriangle size={14}/> : <RotateCcw size={16}/>}
                  {selectedEventDrawn ? "Draw Complete (LOCKED)" : "Refund"}
                </button>
               )}
               <button onClick={() => setSelectedPayment(null)} className="flex-1 p-5 bg-white border border-gray-200 text-gray-500 font-black rounded-[32px] uppercase text-[10px] tracking-widest">Back</button>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};
export default PaymentsTable;
