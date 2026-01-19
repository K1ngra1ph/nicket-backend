import React, { useState, useEffect } from 'react';
import { Mail, Search, FileText, Eye, X, ChevronLeft, ChevronRight, Trophy, RotateCcw, Hash, User, Calendar, CreditCard } from 'lucide-react';
import { PaymentData, EventData } from '../types';

interface PaymentsTableProps {
  events: EventData[]; 
}

const PaymentsTable: React.FC<PaymentsTableProps> = ({ events }) => {
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEvent, setFilterEvent] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterResult, setFilterResult] = useState('all');
  const [selectedPayment, setSelectedPayment] = useState<PaymentData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const getToken = () => localStorage.getItem('token');

  // 1. DATA FETCHING
  const fetchPayments = async () => {
    try {
      setLoading(true);
      const token = getToken();
      const response = await fetch('/api/payments', {
        headers: { 'Authorization': `Bearer ${token}` }
      }); 
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setPayments(data);
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPayments(); }, []);

  // Reset pagination on search/filter change
  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterEvent, filterStatus, filterResult]);

  // 2. ADMINISTRATIVE ACTIONS
  const handleRefund = async (paymentId: string) => {
    if(!window.confirm("Are you sure you want to refund this payment? This cannot be undone.")) return;
    try {
      const token = getToken();
      const response = await fetch(`/api/payments/${paymentId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        alert("Refund processed successfully");
        fetchPayments();
        setSelectedPayment(null);
      } else {
        alert("Failed to process refund");
      }
    } catch (error) {
      console.error("Refund error", error);
    }
  };

  const getEventName = (eventId: string) => {
    const event = events.find(e => e._id === eventId);
    return event ? event.name : eventId;
  };

  // 3. EXPORT LOGIC
  const handleExportEmails = () => {
    const uniqueEmails = Array.from(new Set(filteredPayments.map(p => p.email)));
    if (uniqueEmails.length === 0) return alert("No emails found.");
    const blob = new Blob([uniqueEmails.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `emails_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const handleExportDetails = () => {
    const headers = ["Ref", "Player", "Email", "Event", "Amount", "Status", "Result", "Numbers", "Date"];
    const rows = filteredPayments.map(p => [
      p.paymentReference, p.name, p.email, getEventName(p.eventValue), p.amountPaid, p.status, 
      p.metadata?.winner ? 'WON' : 'LOSE', p.selectedNumbers.join('|'), new Date(p.createdAt).toLocaleDateString()
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `nicket_report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const filteredPayments = payments.filter(p => {
    const isWinner = p.metadata?.winner === true || p.metadata?.winner === "true";
    const isLost = p.metadata?.winner === false || p.metadata?.winner === "false";
    
    const searchString = [
        p.paymentReference, p.name, p.email, p.phone, p.amountPaid, 
        getEventName(p.eventValue), p.selectedNumbers.join(' ')
    ].join(' ').toLowerCase();

    const matchesSearch = searchString.includes(searchTerm.toLowerCase());
    const matchesEvent = filterEvent === 'all' || p.eventValue === filterEvent;
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    
    let matchesResult = true;
    if (filterResult === 'won') matchesResult = isWinner;
    else if (filterResult === 'lose') matchesResult = isLost;
    else if (filterResult === 'waiting') matchesResult = !isWinner && !isLost;
    
    return matchesSearch && matchesEvent && matchesStatus && matchesResult;
  });

  // 5. PAGINATION CALCULATIONS
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredPayments.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);

  const DetailRow = ({ label, value, icon: Icon }: { label: string, value: React.ReactNode, icon?: any }) => (
    <div className="flex flex-col border-b border-gray-50 py-3 last:border-0">
      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
        {Icon && <Icon size={10} />} {label}
      </span>
      <span className="text-sm text-gray-800 font-bold break-all mt-1">{value || '-'}</span>
    </div>
  );

  if (loading) return <div className="p-20 text-center animate-pulse text-gray-400 font-bold uppercase tracking-widest">Synchronizing Bank Data...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Export Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Bets & Transactions</h2>
          <p className="text-gray-500 text-sm font-medium">Manage player entries and financial records.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
           <button onClick={handleExportEmails} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-50 transition shadow-sm"><Mail size={16} /> Emails</button>
           <button onClick={handleExportDetails} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition shadow-sm"><FileText size={16} /> CSV Report</button>
        </div>
      </div>

      {/* Advanced Filter Bar */}
      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder="Search Reference, Player, or Numbers..." className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-100 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select className="px-4 py-3 rounded-2xl border border-gray-100 bg-white font-bold text-xs" value={filterResult} onChange={(e) => setFilterResult(e.target.value)}>
                <option value="all">Result: All</option>
                <option value="won">🏆 Winners</option>
                <option value="lose">❌ Lost</option>
                <option value="waiting">⏳ Waiting</option>
            </select>
            <select className="px-4 py-3 rounded-2xl border border-gray-100 bg-white font-bold text-xs" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="all">Status: All</option>
                <option value="successful">Successful</option>
                <option value="pending">Pending</option>
                <option value="refunded">Refunded</option>
            </select>
            <select className="px-4 py-3 rounded-2xl border border-gray-100 bg-white font-bold text-xs" value={filterEvent} onChange={(e) => setFilterEvent(e.target.value)}>
                <option value="all">All Events</option>
                {events.map(e => (<option key={e._id} value={e._id}>{e.name}</option>))}
            </select>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-400">Player Record</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-400">Raffle Event</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-400 text-center">Draw Result</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-400 text-center">Payment Status</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-400 text-right">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {currentItems.map((p) => (
                <tr key={p._id} className="hover:bg-indigo-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-gray-900">{p.name}</div>
                    <div className="text-[10px] font-mono text-gray-400 uppercase tracking-tighter">{p.paymentReference}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1.5 rounded-lg uppercase">
                        {getEventName(p.eventValue)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {(p.metadata?.winner === true || p.metadata?.winner === "true") ? (
                      <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                        <Trophy size={10} /> Winner
                      </span>
                    ) : (p.metadata?.winner === false || p.metadata?.winner === "false") ? (
                      <span className="bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-[10px] font-black uppercase border border-rose-100">Lose</span>
                    ) : (
                      <span className="bg-gray-100 text-gray-400 px-3 py-1 rounded-full text-[10px] font-black uppercase">Waiting</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border
                      ${p.status === 'successful' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                        p.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-100' : 
                        'bg-gray-50 text-gray-500 border-gray-100'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => setSelectedPayment(p)} className="p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-white rounded-xl transition shadow-sm border border-transparent hover:border-indigo-100"><Eye size={20}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-8 py-5 bg-gray-50/50 border-t border-gray-100">
             <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
               Page {currentPage} of {totalPages}
             </div>
             <div className="flex gap-2">
                <button onClick={() => setCurrentPage(prev => Math.max(prev-1, 1))} disabled={currentPage === 1} className="p-2 rounded-xl border border-gray-200 bg-white disabled:opacity-30 hover:bg-indigo-50 hover:text-indigo-600 transition"><ChevronLeft size={18}/></button>
                <button onClick={() => setCurrentPage(prev => Math.min(prev+1, totalPages))} disabled={currentPage === totalPages} className="p-2 rounded-xl border border-gray-200 bg-white disabled:opacity-30 hover:bg-indigo-50 hover:text-indigo-600 transition"><ChevronRight size={18}/></button>
             </div>
        </div>
      </div>

      {/* Transaction Details Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-indigo-600 text-white">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tighter italic">Entry Detail Review</h3>
                <p className="text-indigo-100 text-xs font-medium uppercase mt-1">Status: {selectedPayment.status}</p>
              </div>
              <button onClick={() => setSelectedPayment(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition"><X size={24} /></button>
            </div>
            
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2">
               <DetailRow icon={User} label="Player Name" value={selectedPayment.name} />
               <DetailRow icon={Mail} label="Player Email" value={selectedPayment.email} />
               <DetailRow icon={Calendar} label="Event Name" value={getEventName(selectedPayment.eventValue)} />
               <DetailRow icon={CreditCard} label="Paid Amount" value={`₦${selectedPayment.amountPaid.toLocaleString()}`} />
               <DetailRow icon={FileText} label="Reference" value={selectedPayment.paymentReference} />
               <DetailRow icon={Trophy} label="Draw Outcome" value={
                 (selectedPayment.metadata?.winner === true || selectedPayment.metadata?.winner === "true") 
                 ? <span className="text-green-600">WINNER 🏆</span> 
                 : <span className="text-gray-400">NO WIN</span>
               } />

               {/* Numbers Section */}
               <div className="col-span-1 md:col-span-2 pt-6 pb-2">
                 <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><Hash size={10}/> Player Selections</span>
                 <div className="flex gap-2 flex-wrap mt-3">
                    {selectedPayment.selectedNumbers?.map((n, i) => (
                      <span key={i} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-lg font-black shadow-md border border-indigo-500">
                        {n}
                      </span>
                    ))}
                 </div>
               </div>
            </div>

            <div className="p-8 bg-gray-50/50 border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-3">
              {selectedPayment.status === "successful" && (
                <button onClick={() => handleRefund(selectedPayment._id)} className="flex items-center justify-center gap-2 px-6 py-3.5 bg-rose-50 text-rose-600 font-black text-xs uppercase rounded-2xl hover:bg-rose-100 transition border border-rose-100">
                  <RotateCcw size={14} /> Refund Player
                </button>
              )}
              <button onClick={() => setSelectedPayment(null)} className="px-10 py-3.5 bg-white border border-gray-200 text-gray-700 font-black text-xs uppercase rounded-2xl hover:bg-gray-100 transition shadow-sm">Close Record</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentsTable;