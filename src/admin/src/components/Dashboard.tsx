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
  const totalVisitors = 45600; 

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

  if (loading) return <div className="p-8">Loading Dashboard...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
       {/* ... Your exact UI code from before goes here ... */}
       {/* Just copy the JSX return from your previous message */}
       <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Hello, Admin! 👋</h2>
          <p className="text-gray-500 mt-1">Here is an overview of your lottery platform.</p>
        </div>
        <div className="bg-white p-1 rounded-xl border border-gray-200 flex shadow-sm">
            {(['Days', 'Week', 'Month', 'Year'] as TimeFilter[]).map((filter) => (
                <button
                    key={filter}
                    onClick={() => setTimeFilter(filter)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                        timeFilter === filter ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                >
                    {filter}
                </button>
            ))}
        </div>
      </div>
      
      {/* ... The rest of your dashboard grids and charts ... */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-indigo-600 rounded-3xl p-6 text-white relative overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-indigo-500 p-2 rounded-full"><DollarSign size={20} className="text-white" /></div>
            <div className="bg-white text-indigo-600 rounded-full p-1 transform rotate-45"><ArrowUpRight size={16} /></div>
          </div>
          <p className="text-indigo-200 text-sm font-medium">Total Volume</p>
          <h3 className="text-3xl font-bold mt-1">₦{totalRevenue.toLocaleString()}</h3>
        </div>
        {/* ... Active Events & Visitors Cards ... */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
            <h3 className="text-3xl font-bold text-gray-800 mt-1">{totalActiveEvents}</h3>
            <p className="text-gray-500">Active Events</p>
        </div>
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
            <h3 className="text-3xl font-bold text-gray-800 mt-1">{totalVisitors.toLocaleString()}</h3>
            <p className="text-gray-500">Total Players</p>
        </div>
      </div>

      <div className="h-64 w-full bg-white p-6 rounded-3xl border border-gray-100">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
      </div>

    </div>
  );
};

export default Dashboard;