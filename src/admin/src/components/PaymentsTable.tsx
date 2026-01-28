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
    } catch (error) { console.error("Sync Error:", error); } 
    finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => { fetchPayments(); }, []);
  useEffect(() => { if (events.some(e => e.drawStatus === 'drawn')) fetchPayments(true); }, [events]);

  const handleRefund = async (paymentId: string) => {
    if(!window.confirm("Verify: Do you want to process a bank refund? This cannot be undone.")) return;
    try {
      const response = await fetch(`/api/payments/${paymentId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }
      });
      const result = await response.json();
      if (response.ok) {
        alert("✅ Refund successfully completed.");
        fetchPayments();
        setSelectedPayment(null);
      } else {
        alert(`❌ Error: ${result.message}`);
      }
    } catch (error) { alert("Communication error."); }
  };

  const getEventName = (id: string) => events.find(e => e._id === id)?.name || "Nicket Entry";

  const handleExportEmails = () => {
    const uniqueEmails = Array.from(new Set(filteredPayments.map(p => p.email))).join('\n');
    if (!uniqueEmails) return alert("Nothing to export.");
    const blob = new Blob([uniqueEmails], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `players_list.txt`; a.click();
  };

  const handleExportCSV = () => {
    const headers = ["Date", "Player", "Email", "Event", "Amount", "Reference", "Status", "Result"];
    const rows = filteredPayments.map(p => {
        const win = p.metadata?.winner === true || p.metadata?.winner === "true";
        const finished = events.find(e => e._id === p.eventValue)?.drawStatus === 'drawn';
        return [
            new Date(p.createdAt).toLocaleString(), p.name, p.email, getEventName(p.eventValue),
            p.amountPaid, p.paymentReference, p.status, win ? "WON" : finished ? "LOST" : "WAITING"
        ];
    });
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Reporting_Sheet.csv`; a.click();
  };

  const filteredPayments = payments.filter(p => {
    const isWinner = p.metadata?.winner === true || p.metadata?.winner === "true";
    const drawFinished = events.find(e => e._id === p.eventValue)?.drawStatus === 'drawn';
    const numsString = (p.selectedNumbers || []).join(' ');
    const searchString = `${p.paymentReference} ${p.name} ${p.email} ${getEventName(p.eventValue)} ${numsString}`.toLowerCase();

    const matchesSearch = searchString.includes(searchTerm.toLowerCase());
    const matchesEvent = filterEvent === 'all' || p.eventValue === filterEvent;
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    let matchesResult = true;
    if (filterResult === 'won') matchesResult = isWinner;
    else if (filterResult === 'lose') matchesResult = !isWinner && drawFinished;
    else if (filterResult === 'waiting') matchesResult = !isWinner && !drawFinished;
    
    return matchesSearch && matchesEvent && matchesStatus && matchesResult;
  });

  const currentItems = filteredPayments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);

  const DetailRow = ({ label, value, icon: Icon }: { label: string, value: any, icon?: any }) => (
    <div className="flex justify-between items-center py-4 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-3 text-gray-400">
        {Icon && <Icon size={16}/>}
        <span className="text-xs font-bold uppercase tracking-widest">{label}</span>
      </div>
      <span className="text-sm font-black text-gray-800 text-right truncate max-w-[200px]">{value || '---'}</span>
    </div>
  );

  if (loading) return <div className="h-screen flex items-center justify-center font-black uppercase text-gray-300 animate-pulse tracking-[0.4em]">Accounting Portal Loading...</div>;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div className="flex items-center gap-3">
            <h2 className="text-3xl font-black italic uppercase tracking-tighter text-gray-900 underline decoration-indigo-600 underline-offset-8">Payments Dashboard</h2>
            {isRefreshing && <RefreshCcw size={20} className="text-indigo-600 animate-spin" />}
        </div>
        <div className="flex gap-2">
           <button onClick={handleExportEmails} className="bg-white border border-gray-200 text-gray-600 p-2.5 px-6 rounded-2xl text-[10px] font-black uppercase shadow-sm hover:bg-gray-50">Emails</button>
           <button onClick={handleExportCSV} className="bg-indigo-600 text-white p-2.5 px-6 rounded-2xl text-[10px] font-black uppercase shadow-xl flex items-center gap-2 tracking-widest"><FileText size={14}/> Download Report</button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[35px] border border-gray-100 flex flex-col xl:flex-row gap-5 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18}/>
          <input type="text" placeholder="Find Player, Numbers or Reference ID..." className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-none bg-gray-50 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-100 transition" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
            <select className="px-5 py-3.5 rounded-2xl bg-white border border-gray-100 font-black text-[10px] uppercase tracking-widest" value={filterResult} onChange={(e) => setFilterResult(e.target.value)}>
                <option value="all">All Results</option>
                <option value="won">Win</option>
                <option value="lose">Lost</option>
                <option value="waiting">Pending Result</option>
            </select>
            <select className="px-5 py-3.5 rounded-2xl bg-white border border-gray-100 font-black text-[10px] uppercase tracking-widest" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="all">All Payments</option>
                <option value="successful">Paid</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
            </select>
            <select className="px-5 py-3.5 rounded-2xl bg-white border border-gray-100 font-black text-[10px] uppercase max-w-[150px]" value={filterEvent} onChange={(e) => setFilterEvent(e.target.value)}>
                <option value="all">All Events</option>
                {events.map(e => (<option key={e._id} value={e._id}>{e.name}</option>))}
            </select>
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-50">
                <th className="px-6 py-6 text-[10px] font-black uppercase text-gray-400">Player Record</th>
                <th className="px-6 py-6 text-[10px] font-black uppercase text-gray-400">Prize</th>
                <th className="px-6 py-6 text-[10px] font-black uppercase text-gray-400 text-center">Draw Result</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-400 text-center">Payment Status</>
                <th className="px-6 py-6 text-[10px] font-black uppercase text-gray-400 text-right pr-14">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {currentItems.map((p) => {
                const isWon = p.metadata?.winner === true || p.metadata?.winner === "true";
                const finished = events.find(e => e._id === p.eventValue)?.drawStatus === 'drawn';
                return (
                  <tr key={p._id} className="hover:bg-indigo-50/20 transition-all cursor-default">
                    <td className="px-6 py-5">
                      <div className="font-black text-gray-800 text-sm tracking-tighter">{p.name}</div>
                      <div className="text-[9px] font-mono text-gray-400 uppercase tracking-tighter">{p.paymentReference}</div>
                    </td>
                    <td className="px-6 py-5">
                        <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md uppercase tracking-widest">{getEventName(p.eventValue)}</span>
                    </td>
                    <td className="px-6 py-5 text-center">
                        {isWon ? <span className="bg-emerald-500 text-white px-3 py-1 rounded-lg text-[9px] font-black">WON</span> :
                         finished ? <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-lg text-[9px] font-black">LOSE</span> :
                         <span className="bg-amber-100 text-amber-600 px-3 py-1 rounded-lg text-[9px] font-black italic">WAITING</span>}
                    </td>
                    <td className="px-6 py-5 text-right pr-12">
                       <button onClick={() => setSelectedPayment(p)} className="p-3 bg-white border border-gray-100 shadow-sm rounded-2xl text-gray-400 hover:text-indigo-600 hover:scale-110 transition"><Eye size={18}/></button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="p-8 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Matches found: {filteredPayments.length}</p>
          <div className="flex gap-2">
            <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage===1} className="p-3 bg-white border border-gray-200 rounded-2xl disabled:opacity-20 hover:text-indigo-600"><ChevronLeft size={20}/></button>
            <div className="px-6 py-3 flex items-center font-black text-[10px] uppercase text-indigo-600 bg-indigo-50 rounded-2xl">Pg {currentPage} / {totalPages}</div>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage===totalPages} className="p-3 bg-white border border-gray-200 rounded-2xl disabled:opacity-20 hover:text-indigo-600"><ChevronRight size={20}/></button>
          </div>
        </div>
      </div>

      {selectedPayment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[500] flex items-center justify-center p-6 animate-fade-in">
           <div className="bg-white rounded-[50px] w-full max-w-lg shadow-2xl overflow-hidden border border-white">
             <div className="p-10 bg-gray-900 text-white">
               <div className="flex justify-between items-start mb-6">
                   <h3 className="text-3xl font-black italic tracking-tighter">Player Detail</h3>
                   <button onClick={() => setSelectedPayment(null)} className="p-2 rounded-full hover:bg-white/10"><X/></button>
               </div>
               <p className="text-[9px] font-black text-white/40 tracking-[0.4em] uppercase">{selectedPayment.paymentReference}</p>
             </div>
             
             <div className="px-10 py-6">
                <DetailRow icon={User} label="Record For" value={selectedPayment.name}/>
                <DetailRow icon={Calendar} label="Date/Time" value={new Date(selectedPayment.createdAt).toLocaleString()}/>
                <DetailRow icon={Trophy} label="Prize" value={getEventName(selectedPayment.eventValue)}/>
                <DetailRow icon={Bookmark} label="Result" value={
                    (selectedPayment.metadata?.winner === true || selectedPayment.metadata?.winner === "true") 
                    ? <span className="text-green-500 font-black italic">WON 💎</span>
                    : events.find(e => e._id === selectedPayment.eventValue)?.drawStatus === 'drawn'
                    ? <span className="text-rose-500 font-bold uppercase italic tracking-widest">Lost</span>
                    : <span className="text-amber-500 font-bold italic tracking-tighter">Awaiting Draw</span>
                }/>

                <div className="pt-6">
                  <div className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-3 italic">Selection Stub</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedPayment.selectedNumbers?.map((n, i) => (
                      <span key={i} className="bg-gray-50 border border-gray-100 text-gray-700 h-10 w-11 rounded-xl flex items-center justify-center font-black text-xs shadow-inner">
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
                  className={`flex-1 flex items-center justify-center gap-2 p-5 font-black rounded-[25px] uppercase text-[10px] tracking-widest 
                    ${events.find(e => e._id === selectedPayment.eventValue)?.drawStatus === 'drawn' 
                        ? 'bg-gray-100 text-gray-300 cursor-not-allowed' 
                        : 'bg-rose-600 text-white shadow-xl shadow-rose-200'}`}
                >
                  <RotateCcw size={14}/> {events.find(e => e._id === selectedPayment.eventValue)?.drawStatus === 'drawn' ? "Locked" : "Refund"}
                </button>
               )}
               <button onClick={() => setSelectedPayment(null)} className="flex-1 p-5 bg-gray-50 border border-gray-100 text-gray-500 font-black rounded-[25px] uppercase text-[10px] tracking-widest">Back</button>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};
export default PaymentsTable;
