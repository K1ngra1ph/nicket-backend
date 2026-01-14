import React, { useState, useEffect } from 'react';
import { Plus, Calendar, MapPin, CheckCircle, XCircle, FileText, Banknote, Trash2, Upload, Image as ImageIcon } from 'lucide-react';
import { EventData } from '../types';

const EventsManager = () => {
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    date: '',
    price: '',
    currency: 'NGN',
    active: true,
    image: ''
  });

  const getToken = () => localStorage.getItem('token');

  // 1. FETCH EVENTS
  const fetchEvents = async () => {
    try {
      const token = getToken();
      const response = await fetch('/api/events', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // 2. HANDLE IMAGE UPLOAD (Convert File to Base64)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Image is too large. Please choose an image under 2MB.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  // 3. CREATE EVENT
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...formData, price: Number(formData.price) };
      const token = getToken();

      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        alert("Event created successfully!");
        fetchEvents();
        setIsModalOpen(false);
        setFormData({ name: '', location: '', date: '', price: '', currency: 'NGN', active: true, image: '' });
      } else {
        alert("Failed to create event");
      }
    } catch (error) {
      console.error("Create error:", error);
    }
  };

  // 4. TOGGLE & DELETE HANDLERS
  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const token = getToken();
      const response = await fetch(`/api/events/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ active: !currentStatus })
      });
      if (response.ok) fetchEvents();
    } catch (error) { console.error("Toggle error:", error); }
  };

  const handleDelete = async (id: string) => {
    if(!window.confirm("Are you sure? This will delete the event.")) return;
    try {
      const token = getToken();
      const response = await fetch(`/api/events/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (response.ok) fetchEvents();
    } catch (error) { console.error("Delete error:", error); }
  };

  const handleExportEvents = () => { /* ... existing export logic ... */ };

  if (loading) return <div>Loading events...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div><h2 className="text-2xl font-bold text-gray-800">Lottery Events</h2><p className="text-gray-500">Create and manage your lottery draws.</p></div>
        <div className="flex gap-3 w-full md:w-auto">
          <button onClick={() => setIsModalOpen(true)} className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition shadow-sm w-full md:w-auto"><Plus size={18} /> Create Event</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {events.map((event) => (
          <div key={event._id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition duration-300 flex flex-col justify-between">
            <div>
              {/* IMAGE PREVIEW IN CARD */}
              <div className="w-full h-40 bg-gray-100 rounded-xl mb-4 overflow-hidden relative">
                {event.image ? (
                  <img src={event.image} alt={event.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <ImageIcon size={40} />
                  </div>
                )}
                <div className={`absolute top-2 right-2 p-1.5 rounded-lg ${event.active ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-500'}`}>
                  {event.active ? <CheckCircle size={16} /> : <XCircle size={16} />}
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-gray-800 mb-1">{event.name}</h3>
              <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-700 mb-3">
                  <Banknote size={14} /> Bet: {event.currency} {Number(event.price).toLocaleString()}
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-sm text-gray-500"><div className="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center text-gray-400"><MapPin size={14} /></div><span>{event.location}</span></div>
                <div className="flex items-center gap-3 text-sm text-gray-500"><div className="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center text-gray-400"><Calendar size={14} /></div><span>{event.date}</span></div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-50 flex justify-between items-center">
                <button onClick={() => handleToggleStatus(event._id, event.active)} className={`text-xs font-bold uppercase tracking-wider ${event.active ? 'text-rose-600' : 'text-emerald-600'}`}>{event.active ? 'Deactivate' : 'Activate'}</button>
                <button onClick={() => handleDelete(event._id)} className="p-2 text-gray-400 hover:text-rose-600 transition"><Trash2 size={18} /></button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center"><h3 className="text-xl font-bold text-gray-800">Create Lottery Event</h3><button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition"><XCircle size={24} /></button></div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              
              {/* IMAGE UPLOAD INPUT */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Event Image</label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition relative">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageUpload} 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {formData.image ? (
                    <img src={formData.image} alt="Preview" className="h-32 object-cover rounded-lg shadow-sm" />
                  ) : (
                    <>
                      <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-2"><Upload size={20} /></div>
                      <p className="text-sm text-gray-500 font-medium">Click to upload image</p>
                      <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 2MB</p>
                    </>
                  )}
                </div>
              </div>

              <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">Event Name</label><input type="text" required className="w-full px-4 py-2.5 rounded-xl border border-gray-200" placeholder="e.g. Mega Jackpot" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
              
              <div className="grid grid-cols-2 gap-5">
                <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">Draw Date</label><input type="date" required className="w-full px-4 py-2.5 rounded-xl border border-gray-200" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} /></div>
                <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">Currency</label><select className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white" value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})}><option value="NGN">NGN (₦)</option><option value="USD">USD ($)</option></select></div>
              </div>
              
              <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">Ticket Price</label><input type="number" required className="w-full px-4 py-2.5 rounded-xl border border-gray-200" placeholder="e.g. 5000" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} /></div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">Platform/Location</label><input type="text" required className="w-full px-4 py-2.5 rounded-xl border border-gray-200" placeholder="e.g. Online" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} /></div>
              
              <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition">Create Lottery Event</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default EventsManager;