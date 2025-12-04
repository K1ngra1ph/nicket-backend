// src/components/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { ApiClient } from "adminjs";
import {
  Box,
  H2,
  Text,
  Select,
  Table,
  TableRow,
  TableCell,
  TableHead,
  TableBody,
  Button,
  Loader,
  Label,
} from "@adminjs/design-system";

const api = new ApiClient();

const Dashboard = () => {
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState("");
  const [loading, setLoading] = useState(false);
  const [revenue, setRevenue] = useState({ totalRevenue: 0, totalTransactions: 0 });
  const [availability, setAvailability] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/api/admin/analytics/events");
        setEvents(res.data || []);
        if (res.data && res.data.length) {
          setEventId(res.data[0]._id);
        }
      } catch (err) {
        console.error("Failed to load events", err);
      }
    })();
  }, []);

  useEffect(() => {
    if (!eventId) return;
    loadAll(eventId);
  }, [eventId]);

  const loadAll = async (id) => {
    setLoading(true);
    try {
      const [revRes, avRes] = await Promise.all([
        api.get(`/api/admin/analytics/revenue?eventId=${id}`),
        api.get(`/api/admin/analytics/availability?eventId=${id}`)
      ]);
      setRevenue(revRes.data || { totalRevenue: 0, totalTransactions: 0 });
      setAvailability(avRes.data || []);
    } catch (err) {
      console.error("Failed to load analytics", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box variant="grey" p="xl">
      <H2>📊 Event Analytics Dashboard</H2>
      <Text color="grey70" mb="lg">Select an event to view revenue & number availability.</Text>

      <Box mb="lg" display="flex" alignItems="center" gap="md">
        <Label>Event</Label>
        <Select
          options={events.map(e => ({ value: e._id, label: e.name }))}
          value={eventId}
          onChange={(val) => setEventId(val)}
          width="320px"
        />
        <Button onClick={() => loadAll(eventId)} size="sm" variant="primary">Refresh</Button>
      </Box>

      {loading ? <Loader /> : (
        <>
          <Box display="grid" gridTemplateColumns="1fr 1fr" gap="lg" mb="lg">
            <Box variant="white" p="lg" borderRadius="lg" boxShadow="card">
              <Text fontWeight="600">Total Revenue</Text>
              <H2>₦{Number(revenue.totalRevenue || 0).toLocaleString()}</H2>
            </Box>
            <Box variant="white" p="lg" borderRadius="lg" boxShadow="card">
              <Text fontWeight="600">Total Transactions</Text>
              <H2>{Number(revenue.totalTransactions || 0)}</H2>
            </Box>
          </Box>

          <Box variant="white" p="lg" borderRadius="lg" boxShadow="card" mb="lg">
            <Text fontWeight="600" mb="sm">Number Availability (first 20 shown)</Text>

            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Number</TableCell>
                  <TableCell>Used</TableCell>
                  <TableCell>Available</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {availability.slice(0, 20).map((r) => (
                  <TableRow key={r.number}>
                    <TableCell>{r.number}</TableCell>
                    <TableCell>{r.used}</TableCell>
                    <TableCell>{r.available}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>

          <Box variant="white" p="lg" borderRadius="lg" boxShadow="card">
            <Text fontWeight="600" mb="sm">Availability Summary</Text>
            <Text>Numbers available: {availability.filter(a => a.available > 0).length}</Text>
            <Text>Numbers sold: {availability.filter(a => a.used > 0).length}</Text>
          </Box>
        </>
      )}
    </Box>
  );
};

export default Dashboard;
