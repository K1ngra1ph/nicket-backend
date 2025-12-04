import React, { useEffect, useState } from "react";
import { ApiClient } from "adminjs";
import {
  Box,
  H2,
  Text,
  Select,
  Loader,
  Label,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@adminjs/design-system";

const api = new ApiClient();

const Dashboard = () => {
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    eventName: "",
    totalRevenue: 0,
    totalPayments: 0,
    soldNumbers: 0,
    availableNumbers: 0,
    maxNumbers: 0
  });

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const res = await api.get("/api/admin/events");
      const list = res.data || [];
      setEvents(list);

      if (list.length) setEventId(list[0]._id);
    } catch (err) {
      console.error("Failed to load events:", err);
    }
  };

  useEffect(() => {
    if (eventId) loadAnalytics(eventId);
  }, [eventId]);

  const loadAnalytics = async (id) => {
    setLoading(true);
    try {
      const res = await api.get(`/api/admin/revenue-analytics?eventId=${id}`);
      setStats(res.data);
    } catch (err) {
      console.error("Failed to load analytics:", err);
    }
    setLoading(false);
  };

  return (
    <Box variant="grey" p="xl">
      <H2 mb="xl">📊 Event Analytics Dashboard</H2>

      <Box mb="xl">
        <Label>Choose Event</Label>
        <Select
          width="350px"
          value={eventId}
          options={events.map(e => ({ value: e._id, label: e.name }))}
          onChange={(val) => setEventId(val)}
        />
      </Box>

      {loading ? (
        <Loader />
      ) : (
        <>
          {/* KPI Cards */}
          <Box display="grid" gridTemplateColumns="repeat(3, 1fr)" gap="lg" mb="xl">
            <CardStat title="Revenue" value={`₦${stats.totalRevenue.toLocaleString()}`} />
            <CardStat title="Transactions" value={stats.totalPayments} />
            <CardStat title="Numbers Sold" value={`${stats.soldNumbers}/${stats.maxNumbers}`} />
          </Box>

          {/* Availability bar */}
          <Box variant="white" p="lg" borderRadius="lg" boxShadow="card">
            <Text fontWeight="bold" mb="md">🎟 Number Availability</Text>

            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Status</TableCell>
                  <TableCell>Count</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Available</TableCell>
                  <TableCell>{stats.availableNumbers}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Sold</TableCell>
                  <TableCell>{stats.soldNumbers}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Box>
        </>
      )}
    </Box>
  );
};

const CardStat = ({ title, value }) => (
  <Box variant="white" p="lg" borderRadius="xl" boxShadow="card">
    <Text color="grey60" fontSize="sm" mb="xs">{title}</Text>
    <H2>{value}</H2>
  </Box>
);

export default Dashboard;
