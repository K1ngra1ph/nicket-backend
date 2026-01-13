import React, { useState, useEffect } from 'react';
import { Mail, Search, FileText, Eye, X, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [selectedPayment, setSelectedPayment] = useState<PaymentData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const getToken = () => localStorage.getItem('token');

  // 1. FETCH DATA
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

  useEffect(() => {
    fetchPayments();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterEvent, filterStatus]);

  // 2. HANDLE REFUND
  const handleRefund = async (paymentId: string) => {
    if(!window.confirm("Are you sure you want to refund this payment?")) return;
    try {
      const token = getToken();
      const response = await fetch(`/api/payments/${paymentId}/refund`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
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
    const event = events.find(e => e.eventId === eventId);
    return event ? event.name : eventId;
  };

  // 3. FILTER & SEARCH LOGIC
  const filteredPayments = payments.filter(p => {
    const searchString = [
        p._id,
        p.paymentReference,
        p.transactionReference,
        p.name,
        p.email,
        p.phone,
        p.amount,
        p.amountPaid,
        p.status,
        p.eventValue,
        getEventName(p.eventValue),
        p.selectedNumbers.join(' ')
    ].join(' ').toLowerCase();

    const matchesSearch = searchString.includes(searchTerm.toLowerCase());
    const matchesEvent = filterEvent === 'all' || p.eventValue === filterEvent;
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    
    return matchesSearch && matchesEvent && matchesStatus;
  });

  // 4. PAGINATION LOGIC
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredPayments.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);

  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  const handleExportEmails = () => {
    const uniqueEmails = Array.from(new Set(filteredPayments.map(p => p.email)));
    if (uniqueEmails.length === 0) return alert("No emails found.");
    const blob = new Blob([uniqueEmails.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `emails_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleExportDetails = () => {
    const headers = ["Payment Ref", "Transaction Ref", "Amount", "Amount Paid", "Event", "Name", "Email", "Phone", "Status", "Date"];
    const rows = filteredPayments.map(p => [
      p.paymentReference, p.transactionReference || '', p.amount, p.amountPaid, getEventName(p.eventValue), p.name, p.email, p.phone, p.status, new Date(p.createdAt).toLocaleDateString()
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const DetailRow = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div className="flex flex-col border-b border-gray-50 py-2 last:border-0">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
      <span className="text-sm text-gray-800 font-medium break-all">{value || '-'}</span>
    </div>
  );

  if (loading) return <div className="p-10 text-center text-gray-500">Loading payments...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div><h2 className="text-2xl font-bold text-gray-800">Bets & Transactions</h2><p className="text-gray-500">View and manage all ticket sales.</p></div>
        <div className="flex gap-2">
           <button onClick={handleExportEmails} className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition shadow-sm"><Mail size={16} /> Export Emails</button>
           <button onClick={handleExportDetails} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition shadow-sm"><FileText size={16} /> Export CSV</button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder="Search anything (Ref, Name, Phone, ID)..." className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-100" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <select className="px-4 py-2 rounded-xl border border-gray-200 bg-white" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">All Status</option>
          <option value="successful">Successful</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
        <select className="px-4 py-2 rounded-xl border border-gray-200 bg-white" value={filterEvent} onChange={(e) => setFilterEvent(e.target.value)}><option value="all">All Events</option>{events.map(e => (<option key={e._id} value={e.eventId}>{e.name}</option>))}</select>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Ref</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Player</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Event</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {currentItems.map((payment) => (
                <tr key={payment._id} className="hover:bg-gray-50/50 transition">
                  <td className="px-6 py-4"><span className="font-mono text-sm text-gray-600 block">{payment.paymentReference}</span></td>
                  <td className="px-6 py-4"><div className="text-sm font-medium text-gray-900">{payment.name}</div><div className="text-sm text-gray-500">{payment.email}</div></td>
                  <td className="px-6 py-4"><span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">{getEventName(payment.eventValue)}</span></td>
                  <td className="px-6 py-4"><div className="text-sm font-semibold text-gray-900">₦{payment.amountPaid.toLocaleString()}</div></td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize 
                      ${payment.status === 'successful' ? 'bg-emerald-100 text-emerald-700' : 
                        payment.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                        payment.status === 'refunded' ? 'bg-purple-100 text-purple-700' :
                        'bg-rose-100 text-rose-700'}`}>
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(payment.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right"><button onClick={() => setSelectedPayment(payment)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"><Eye size={18} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/30">
             <div className="text-sm text-gray-500">
               Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredPayments.length)} of {filteredPayments.length} entries
             </div>
             <div className="flex gap-2">
                <button 
                  onClick={prevPage} 
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-200 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-gray-600"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700">
                  Page {currentPage} of {totalPages}
                </div>
                <button 
                  onClick={nextPage} 
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-gray-200 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-gray-600"
                >
                  <ChevronRight size={16} />
                </button>
             </div>
          </div>
        )}
      </div>

      {selectedPayment && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-3xl">
              <h3 className="text-xl font-bold text-gray-800">Bet Details</h3>
              <button onClick={() => setSelectedPayment(null)} className="p-2 hover:bg-white rounded-full"><X size={20} /></button>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
               <DetailRow label="ID (_id)" value={selectedPayment._id} />
               <DetailRow label="Payment Reference" value={selectedPayment.paymentReference} />
               <DetailRow label="Transaction Reference" value={selectedPayment.transactionReference} />
               <DetailRow label="Status" value={
                 <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold capitalize ${
                   selectedPayment.status === 'successful' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'
                 }`}>{selectedPayment.status}</span>
               } />
               
               <DetailRow label="Target Amount" value={`₦${selectedPayment.amount.toLocaleString()}`} />
               <DetailRow label="Amount Paid" value={`₦${selectedPayment.amountPaid.toLocaleString()}`} />
               
               <DetailRow label="Event Value (ID)" value={selectedPayment.eventValue} />
               <DetailRow label="Event Name" value={getEventName(selectedPayment.eventValue)} />

               <DetailRow label="Player Name" value={selectedPayment.name} />
               <DetailRow label="Player Email" value={selectedPayment.email} />
               <DetailRow label="Player Phone" value={selectedPayment.phone} />
               
               <div className="col-span-1 md:col-span-2 border-b border-gray-50 py-2">
                 <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Selected Numbers</span>
                 <div className="flex gap-1 flex-wrap mt-2">
                    {selectedPayment.selectedNumbers && selectedPayment.selectedNumbers.length > 0 ? (
                     selectedPayment.selectedNumbers.map((n, index) => (
                      <span key={index} className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-md text-sm font-mono font-bold border border-indigo-200">
                        {n}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-400 italic">No numbers selected.</span>
                  )}
                 </div>
               </div>

               <DetailRow label="Created At" value={new Date(selectedPayment.createdAt).toLocaleString()} />
               <DetailRow label="Updated At" value={selectedPayment.updatedAt ? new Date(selectedPayment.updatedAt).toLocaleString() : '-'} />
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50/30 rounded-b-3xl flex justify-end gap-2">
              {selectedPayment.status === "successful" && (<button onClick={() => handleRefund(selectedPayment._id)} className="px-5 py-2.5 bg-rose-50 border border-rose-100 text-rose-600 font-medium rounded-xl hover:bg-rose-100 transition">Refund Payment</button>)}
              <button onClick={() => setSelectedPayment(null)} className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default PaymentsTable;