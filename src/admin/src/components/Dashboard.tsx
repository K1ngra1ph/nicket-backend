import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { ArrowUpRight, Users, CreditCard, DollarSign, RefreshCcw } from 'lucide-react';
import { PaymentData, EventData } from '../types';

interface DashboardProps {
  events: EventData[];
  onViewChange: (view: 'dashboard' | 'payments' | 'events' | 'users' | 'settings') => void; 
}

type TimeFilter = 'Days' | 'Week' | 'Month' | 'Year';

const Dashboard: React.FC<DashboardProps> = ({ events, onViewChange }) => {
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('Month');

  const fetchPayments = async (background = false) => {
    if (!background) setLoading(true);
    setIsSyncing(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/payments', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        setPayments(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Sync fail:", e);
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => { fetchPayments(); }, []);

  useEffect(() => {
    const timer = setInterval(() => fetchPayments(true), 30000);
    return () => clearInterval(timer);
  }, []);

  const successfulPayments = payments.filter(p => p.status === 'successful' || p.status === 'PAID');
  
  const totalRevenue = successfulPayments.reduce((acc, curr) => acc + curr.amountPaid, 0);

  const totalActiveEvents = events.filter(e => e.active).length;

  const totalUniquePlayers = new Set(successfulPayments.map(p => p.email)).size;

  const getFilteredPayments = () => {
    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;
    
    return successfulPayments.filter(p => {
      const pDate = new Date(p.createdAt);
      if (timeFilter === 'Days') return (now.getTime() - pDate.getTime()) < oneDay;
      if (timeFilter === 'Week') return (now.getTime() - pDate.getTime()) < 7 * oneDay;
      if (timeFilter === 'Month') return (now.getTime() - pDate.getTime()) < 30 * oneDay;
      if (timeFilter === 'Year') return (now.getTime() - pDate.getTime()) < 365 * oneDay;
      return true;
    });
  };

  const chartData = Object.entries(
    getFilteredPayments().reduce((acc, curr) => {
      let key = '';
      const date = new Date(curr.createdAt);
      if (timeFilter === 'Days') key = date.toLocaleTimeString([], {hour: '2-digit'});
      else if (timeFilter === 'Year') key = date.toLocaleDateString('en-US', { month: 'short' });
      else key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      acc[key] = (acc[key] || 0) + curr.amountPaid;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, revenue]) => ({ name, revenue }));

  if (loading) return <div className="p-20 text-center font-black text-gray-300 animate-pulse tracking-[0.3em]">SECURE DASHBOARD CONNECTING...</div>;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <div className="flex items-center gap-2">
             <h2 className="text-3xl font-black text-gray-900 italic uppercase tracking-tighter">Hello, Admin! 👋</h2>
             {isSyncing && <RefreshCcw size={18} className="text-indigo-600 animate-spin" />}
          </div>
          <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">Real-time performance stats</p>
        </div>
        <div className="bg-white p-1 rounded-2xl border border-gray-100 flex shadow-sm">
            {(['Days', 'Week', 'Month', 'Year'] as TimeFilter[]).map((filter) => (
                <button
                    key={filter}
                    onClick={() => setTimeFilter(filter)}
                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                        timeFilter === filter ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-900'
                    }`}
                >
                    {filter}
                </button>
            ))}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        <div className="bg-indigo-600 rounded-[40px] p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-200 group">
          <div className="flex justify-between items-start mb-6 relative z-10">
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md border border-white/10"><DollarSign size={24} className="text-white" /></div>
            
            <button 
                onClick={() => onViewChange('payments')}
                className="bg-white text-indigo-600 rounded-full p-2 shadow-xl hover:scale-125 transition-transform cursor-pointer border-none active:rotate-45"
            >
                <ArrowUpRight size={20} strokeWidth={3} />
            </button>
          </div>
          <p className="text-indigo-100 text-[10px] font-black uppercase tracking-[0.2em] relative z-10 opacity-80">Accumulated Volume</p>
          <h3 className="text-4xl font-black mt-2 relative z-10">₦{totalRevenue.toLocaleString()}</h3>
          <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-indigo-500 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
        </div>

        <div className="bg-white rounded-[40px] p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-all border-b-8 border-b-indigo-500">
            <div className="bg-indigo-50 p-3 rounded-2xl w-fit mb-4 text-indigo-600"><CreditCard size={24} /></div>
            <h3 className="text-4xl font-black text-gray-900 tracking-tighter">{totalActiveEvents}</h3>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-1">Live Raffle Tiers</p>
        </div>

        <div className="bg-white rounded-[40px] p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-all border-b-8 border-b-emerald-500">
            <div className="bg-emerald-50 p-3 rounded-2xl w-fit mb-4 text-emerald-600"><Users size={24} /></div>
            <h3 className="text-4xl font-black text-gray-900 tracking-tighter">{totalUniquePlayers.toLocaleString()}</h3>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-1">Paid Entries</p>
        </div>
      </div>

      <div className="bg-white p-10 rounded-[50px] border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-center mb-10">
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-gray-300 flex items-center gap-3">
                  <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full shadow-[0_0_10px_#4f46e5]"></div>
                  Liquidity Curve ({timeFilter})
              </h3>
          </div>
          <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="1 4" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 9, fontWeight: '800', fill: '#cbd5e1', letterSpacing: '1px'}} 
                    />
                    <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 9, fontWeight: '800', fill: '#cbd5e1'}}
                    />
                    <Tooltip 
                        cursor={{fill: '#f8fafc'}}
                        contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.1)', fontWeight: '900', textTransform: 'uppercase', fontSize: '10px'}}
                    />
                    <Bar dataKey="revenue" fill="#4f46e5" radius={[10, 10, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;
