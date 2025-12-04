import React, { useEffect, useState } from "react";
import { ApiClient, Box } from "adminjs";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const api = new ApiClient();

const COLORS = ["#4F46E5", "#3B82F6", "#6366F1", "#06B6D4", "#0EA5E9", "#14B8A6"];

const Dashboard = () => {
  const [data, setData] = useState([]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  useEffect(() => {
    fetchData(month);
  }, [month]);

  const fetchData = async (month) => {
    try {
      const res = await api.get(`/api/admin/monthly-total?month=${month}`);
      setData(res.data);
    } catch (err) {
      console.error("Error fetching monthly dashboard data:", err);
    }
  };

  return (
    <Box
      style={{
        maxWidth: "980px",
        margin: "0 auto",
        padding: "32px",
      }}
    >
      {/* Header Section */}
      <div
        style={{
          textAlign: "left",
          marginBottom: "24px",
        }}
      >
        <h2
          style={{
            fontSize: "28px",
            fontWeight: "700",
            color: "#1E3A8A",
          }}
        >
          📊 Revenue Dashboard
        </h2>
        <p
          style={{
            marginTop: "6px",
            fontSize: "15px",
            color: "#4B5563",
          }}
        >
          Track total revenue earned per month across all events.
        </p>
      </div>

      {/* Filter Dropdown */}
      <div style={{ marginBottom: "24px" }}>
        <label
          style={{
            fontSize: "14px",
            fontWeight: "600",
            color: "#1E40AF",
            marginRight: "12px",
          }}
        >
          Select Month:
        </label>

        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          style={{
            padding: "10px",
            fontSize: "15px",
            borderRadius: "8px",
            border: "1px solid #CBD5E1",
            background: "#FFFFFF",
            outline: "none",
            cursor: "pointer",
            color: "#1E3A8A",
            fontWeight: 500,
          }}
        >
          {[...Array(12).keys()].map((m) => (
            <option key={m + 1} value={m + 1}>
              {new Date(0, m).toLocaleString("en-US", { month: "long" })}
            </option>
          ))}
        </select>
      </div>

      {/* Chart Card */}
      <div
        style={{
          width: "100%",
          height: "420px",
          background: "#FFFFFF",
          borderRadius: "16px",
          padding: "20px",
          boxShadow: "0px 8px 24px rgba(0, 0, 0, 0.06)",
          border: "1px solid #E5E7EB",
        }}
      >
        <h3
          style={{
            fontSize: "18px",
            marginBottom: "20px",
            fontWeight: "600",
            color: "#1D4ED8",
            textAlign: "center",
          }}
        >
          Monthly Event Revenue Breakdown
        </h3>

        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={130}
              fill="#3B82F6"
              dataKey="amountPaid"
              nameKey="eventValue"
              label={({ name, percent }) =>
                `${name} ${(percent * 100).toFixed(0)}%`
              }
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>

            <Tooltip
              formatter={(value) =>
                `₦${Number(value).toLocaleString()}`
              }
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Box>
  );
};

export default Dashboard;
