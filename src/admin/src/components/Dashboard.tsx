import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { ArrowUpRight, Users, CreditCard, DollarSign } from 'lucide-react';
import { PaymentData, EventData } from '../types';

interface DashboardProps {
  events: EventData[];
}

type TimeFilter = 'Days' | 'Week' | 'Month' | 'Year';

const Dashboard: React.FC<DashboardProps> = ({ events }) => {
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('Month');

  useEffect(() => {
    const fetchPayments = async () => {
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
          if (Array.isArray(data)) {
            setPayments(data);
          } else {
            setPayments([]);
          }
        } else {
          console.error("Failed to fetch payments");
          setPayments([]);
        }
      } catch (e) {
        console.error("Dashboard fetch error", e);
        setPayments([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, []);

  const totalRevenue = payments
    .filter(p => p.status === 'successful')
    .reduce((acc, curr) => acc + curr.amountPaid, 0);

  const totalActiveEvents = events.filter(e => e.active).length;
  const totalUniquePlayers = new Set(payments.map(p => p.email)).size;

  const getFilteredPayments = () => {
    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;
    
    return payments.filter(p => {
      const pDate = new Date(p.createdAt);
      if (timeFilter === 'Days') return (now.getTime() - pDate.getTime()) < oneDay;
      if (timeFilter === 'Week') return (now.getTime() - pDate.getTime()) < 7 * oneDay;
      if (timeFilter === 'Month') return (now.getTime() - pDate.getTime()) < 30 * oneDay;
      if (timeFilter === 'Year') return (now.getTime() - pDate.getTime()) < 365 * oneDay;
      return true;
    });
  };

  const filteredPayments = getFilteredPayments();

  const chartDataMap = filteredPayments.reduce((acc, curr) => {
    if (curr.status === 'successful') {
      let key = '';
      const date = new Date(curr.createdAt);
      
      if (timeFilter === 'Days') key = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      else if (timeFilter === 'Year') key = date.toLocaleDateString('en-US', { month: 'short' });
      else key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      acc[key] = (acc[key] || 0) + curr.amountPaid;
    }
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.keys(chartDataMap).map(key => ({
    name: key,
    revenue: chartDataMap[key]
  }));

  if (loading) return <div className="p-10 text-center font-bold text-gray-400 animate-pulse uppercase tracking-widest">Generating Analytics...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Hello, Admin! 👋</h2>
          <p className="text-gray-500 mt-1">Here is an overview of your platform performance.</p>
        </div>
        <div className="bg-white p-1 rounded-xl border border-gray-100 flex shadow-sm">
            {(['Days', 'Week', 'Month', 'Year'] as TimeFilter[]).map((filter) => (
                <button
                    key={filter}
                    onClick={() => setTimeFilter(filter)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        timeFilter === filter ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                    }`}
                >
                    {filter}
                </button>
            ))}
        </div>
      </div>
      
      {/* STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Revenue Card */}
        <div className="bg-indigo-600 rounded-[32px] p-6 text-white relative overflow-hidden shadow-xl shadow-indigo-200">
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md"><DollarSign size={20} className="text-white" /></div>
            <div className="bg-white text-indigo-600 rounded-full p-1 transform rotate-45 shadow-lg"><ArrowUpRight size={16} /></div>
          </div>
          <p className="text-indigo-100 text-xs font-black uppercase tracking-widest relative z-10">Total Volume</p>
          <h3 className="text-3xl font-black mt-1 relative z-10">₦{totalRevenue.toLocaleString()}</h3>
          {/* Background decoration */}
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
        </div>

        {/* Active Events Card */}
        <div className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="bg-indigo-50 p-2 rounded-xl w-fit mb-4 text-indigo-600"><CreditCard size={20} /></div>
            <h3 className="text-3xl font-black text-gray-800 mt-1">{totalActiveEvents}</h3>
            <p className="text-gray-400 text-xs font-black uppercase tracking-widest mt-1">Live Events</p>
        </div>

        {/* Total Players Card (NOW DYNAMIC) */}
        <div className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="bg-emerald-50 p-2 rounded-xl w-fit mb-4 text-emerald-600"><Users size={20} /></div>
            <h3 className="text-3xl font-black text-gray-800 mt-1">{totalUniquePlayers.toLocaleString()}</h3>
            <p className="text-gray-400 text-xs font-black uppercase tracking-widest mt-1">Registered Players</p>
        </div>
      </div>

      {/* REVENUE CHART */}
      <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-8">
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                  Revenue Growth ({timeFilter})
              </h3>
          </div>
          <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} 
                    />
                    <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}}
                    />
                    <Tooltip 
                        cursor={{fill: '#f8fafc'}}
                        contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold'}}
                    />
                    <Bar dataKey="revenue" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;