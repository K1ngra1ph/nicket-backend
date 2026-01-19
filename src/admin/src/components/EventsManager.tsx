import React, { useState, useEffect } from 'react';
import { 
  Plus, Calendar, MapPin, CheckCircle, XCircle, 
  Banknote, Trash2, Upload, Image as ImageIcon, 
  Trophy, X, Hash 
} from 'lucide-react';
import { EventData } from '../types';

const EventsManager = () => {
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // New States for Drawing System
  const [drawModalEvent, setDrawModalEvent] = useState<EventData | null>(null);
  const [winNumInput, setWinNumInput] = useState<number | ''>('');
  const [inventory, setInventory] = useState<Record<number, number>>({});
  
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

  // 2. DRAWING LOGIC FUNCTIONS
  const openDrawModal = async (event: EventData) => {
    try {
      // Fetch availability for THIS specific event to show the admin the inventory
      const res = await fetch(`https://nicket-backend.onrender.com/api/numbers/availability?eventId=${event._id}`);
      const data = await res.json();
      setInventory(data);
      setDrawModalEvent(event);
      setWinNumInput(''); // Reset input
    } catch (err) {
      alert("Error loading inventory stats for this event.");
    }
  };

  const handleExecuteDraw = async () => {
    if (!winNumInput || !drawModalEvent) return alert("Please enter a winning number.");
    if (winNumInput < 1 || winNumInput > 100) return alert("Number must be between 1 and 100.");
    
    if (!window.confirm(`WARNING: Executing draw with number ${winNumInput}. This will close the raffle and mark winners permanently. Proceed?`)) return;

    try {
      const res = await fetch(`https://nicket-backend.onrender.com/api/events/${drawModalEvent._id}/draw`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${getToken()}` 
        },
        body: JSON.stringify({ winningNumber: winNumInput })
      });

      if (res.ok) {
        alert("DRAW COMPLETED SUCCESSFULLY!");
        setDrawModalEvent(null);
        fetchEvents(); // Refresh the list to show "Drawn" status
      } else {
        const err = await res.json();
        alert("Draw failed: " + err.message);
      }
    } catch (err) {
      alert("Connection error executing draw.");
    }
  };

  // 3. IMAGE UPLOAD
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

  // 4. CRUD HANDLERS
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...formData, price: Number(formData.price) };
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        alert("Event created!");
        fetchEvents();
        setIsModalOpen(false);
        setFormData({ name: '', location: '', date: '', price: '', currency: 'NGN', active: true, image: '' });
      }
    } catch (error) { console.error("Create error:", error); }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/events/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ active: !currentStatus })
      });
      if (response.ok) fetchEvents();
    } catch (error) { console.error("Toggle error:", error); }
  };

  const handleDelete = async (id: string) => {
    if(!window.confirm("Are you sure? This will delete the event.")) return;
    try {
      const response = await fetch(`/api/events/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } });
      if (response.ok) fetchEvents();
    } catch (error) { console.error("Delete error:", error); }
  };

  if (loading) return <div className="p-10 text-center font-bold text-gray-400 animate-pulse">LOADING LOTTERY SYSTEM...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Lottery Events</h2>
          <p className="text-gray-500 text-sm">Create prizes and execute official draws.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg w-full md:w-auto">
          <Plus size={20} /> Create New Prize
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {events.map((event) => (
          <div key={event._id} className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-full h-40 bg-gray-50 rounded-2xl mb-4 overflow-hidden relative border border-gray-100">
                {event.image ? (
                  <img src={event.image} alt={event.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-300"><ImageIcon size={40} /></div>
                )}
                <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${event.drawStatus === 'drawn' ? 'bg-emerald-500 text-white' : event.active ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {event.drawStatus === 'drawn' ? 'Finished' : event.active ? 'Live' : 'Hidden'}
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-gray-800 mb-1">{event.name}</h3>
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 mb-4 uppercase tracking-tighter">
                  <Banknote size={14} /> Ticket: {event.currency} {Number(event.price).toLocaleString()}
              </div>
              
              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-3 text-sm text-gray-500 font-medium"><MapPin size={14} className="text-gray-300" /><span>{event.location}</span></div>
                <div className="flex items-center gap-3 text-sm text-gray-500 font-medium"><Calendar size={14} className="text-gray-300" /><span>{event.date}</span></div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-50 flex justify-between items-center">
                {event.drawStatus === 'open' ? (
                  <div className="flex gap-4 items-center">
                    <button onClick={() => openDrawModal(event)} className="text-xs font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800">Execute Draw</button>
                    <button onClick={() => handleToggleStatus(event._id, event.active)} className="text-[10px] font-bold uppercase text-gray-400 hover:text-gray-600">{event.active ? 'Deactivate' : 'Activate'}</button>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Winning Number</span>
                    <span className="text-lg font-black text-gray-800">{event.winningNumber}</span>
                  </div>
                )}
                <button onClick={() => handleDelete(event._id)} className="p-2 text-gray-300 hover:text-rose-600 transition"><Trash2 size={18} /></button>
            </div>
          </div>
        ))}
      </div>

      {/* --- MODAL: EXECUTE DRAW --- */}
      {drawModalEvent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl p-8 animate-in zoom-in duration-200 overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-2">
                  <Trophy className="text-brand-gold" /> Execute Draw
                </h3>
                <p className="text-gray-500 text-sm">{drawModalEvent.name}</p>
              </div>
              <button onClick={() => setDrawModalEvent(null)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition"><X size={20}/></button>
            </div>

            {/* Inventory Tracker */}
            <div className="mb-8">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <Hash size={12} /> Live Inventory (Sold / 10)
              </h4>
              <div className="grid grid-cols-10 gap-1 max-h-[220px] overflow-y-auto p-3 bg-gray-50 rounded-2xl border border-gray-100">
                {Array.from({ length: 100 }, (_, i) => i + 1).map(num => (
                  <div key={num} className={`text-[9px] py-1 rounded-lg border text-center font-black transition-all ${inventory[num] >= 10 ? 'bg-rose-500 text-white border-rose-600' : inventory[num] > 0 ? 'bg-white text-indigo-600 border-indigo-100' : 'bg-white text-gray-300 border-gray-50 opacity-40'}`}>
                    {num}
                    <div className={`text-[7px] ${inventory[num] >= 10 ? 'text-white' : 'text-gray-400'}`}>{inventory[num] || 0}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest text-center">Enter Final Winning Number</label>
              <input 
                type="number" 
                min="1" max="100"
                className="w-full p-6 rounded-3xl bg-gray-50 border-2 border-indigo-100 focus:border-indigo-500 outline-none text-4xl font-black text-center transition-all"
                placeholder="00"
                value={winNumInput}
                onChange={(e) => setWinNumInput(Number(e.target.value))}
              />
              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                <p className="text-[10px] text-rose-600 font-bold text-center uppercase tracking-widest leading-relaxed">
                  ⚠️ Permanent Action: Confirming this will finalize winners, notify players, and archive this event.
                </p>
              </div>
              
              <button 
                onClick={handleExecuteDraw}
                className="w-full bg-indigo-600 text-white py-5 rounded-3xl font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl hover:shadow-indigo-200 transition-all active:scale-[0.98]"
              >
                Confirm & Finalize Draw
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: CREATE EVENT (Existing) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800 uppercase italic tracking-tighter">New Lottery Prize</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400"><XCircle size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-2">Prize Image</label>
                <div className="border-2 border-dashed border-gray-100 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition relative">
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  {formData.image ? (
                    <img src={formData.image} alt="Preview" className="h-32 object-cover rounded-xl shadow-sm" />
                  ) : (
                    <>
                      <Upload size={24} className="text-indigo-500 mb-2" />
                      <p className="text-xs text-gray-500 font-bold uppercase">Click to upload</p>
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-4">
                  <input type="text" required className="w-full p-4 rounded-xl border border-gray-100 bg-gray-50/50" placeholder="Prize Name (e.g. iPhone 15 Pro Max)" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  <div className="grid grid-cols-2 gap-4">
                    <input type="date" required className="w-full p-4 rounded-xl border border-gray-100 bg-gray-50/50" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                    <input type="number" required className="w-full p-4 rounded-xl border border-gray-100 bg-gray-50/50" placeholder="Ticket Price (₦)" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                  </div>
                  <input type="text" required className="w-full p-4 rounded-xl border border-gray-100 bg-gray-50/50" placeholder="Location/Platform" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl transition-all">Publish Prize</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default EventsManager;