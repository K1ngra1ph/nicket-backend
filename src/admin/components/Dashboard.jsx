import React, { useEffect, useState } from 'react';
import { ApiClient, Box, H2, Select } from 'adminjs';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const api = new ApiClient();

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F'];

const Dashboard = () => {
  const [data, setData] = useState([]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  useEffect(() => {
    fetchData(month);
  }, [month]);

  const fetchData = async (month) => {
    const res = await api.get(`/api/admin/monthly-total?month=${month}`);
    setData(res.data);
  };

  return (
    <Box>
      <H2>Monthly Total Amount Paid</H2>
      <Select
        value={month}
        onChange={value => setMonth(Number(value))}
        options={[...Array(12).keya()].map(m => ({
          value: m+1,
          label: `Month ${m+1}`
        }))}
      >
        {[...Array(12).keys()].map(m => (
          <option key={m+1} value={m+1}>{`Month ${m+1}`}</option>
        ))}
      </Select>
      <PieChart width={400} height={400}>
        <Pie
          data={data}
          dataKey="amountPaid"
          nameKey="eventValue"
          cx="50%"
          cy="50%"
          outerRadius={120}
          fill="#8884d8"
          label
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </Box>
  );
};

export default Dashboard;
