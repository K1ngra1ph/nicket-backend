import React, { useState, useEffect } from 'react';
import { Plus, User, Trash2, Shield, Lock, XCircle, Pencil } from 'lucide-react';
import { UserData, ViewState } from '../types';

interface UsersManagerProps {
  currentUser?: UserData;
}

const UsersManager: React.FC<UsersManagerProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user' as 'user' | 'admin' | 'merchant',
    permissions: ['dashboard'] as ViewState[]
  });

  const getToken = () => localStorage.getItem('token');

  // 1. FETCH USERS
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = getToken();
      const res = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Error fetching users", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // 2. CREATE / UPDATE
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingUserId ? `/api/users/${editingUserId}` : '/api/users';
      const method = editingUserId ? 'PUT' : 'POST';
      const token = getToken();

      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        alert(editingUserId ? "User updated" : "User created");
        fetchUsers();
        setIsModalOpen(false);
        resetForm();
      } else {
        const err = await response.json();
        alert("Error: " + err.message);
      }
    } catch (error) {
      console.error("Submit error", error);
    }
  };

  // 3. DELETE
  const handleDeleteUser = async (id: string) => {
    if(!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      const token = getToken();
      const response = await fetch(`/api/users/${id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) fetchUsers();
    } catch (error) {
      console.error("Delete error", error);
    }
  };

  const resetForm = () => {
    setEditingUserId(null);
    setFormData({ name: '', email: '', password: '', role: 'user', permissions: ['dashboard'] });
  };

  const handleOpenCreate = () => { resetForm(); setIsModalOpen(true); };

  const handleOpenEdit = (user: UserData) => {
    setEditingUserId(user._id);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      permissions: user.permissions || []
    });
    setIsModalOpen(true);
  };

  const togglePermission = (perm: ViewState) => {
    setFormData(prev => {
      const perms = prev.permissions.includes(perm)
        ? prev.permissions.filter(p => p !== perm)
        : [...prev.permissions, perm];
      return { ...prev, permissions: perms };
    });
  };

  if (loading) return <div>Loading users...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div><h2 className="text-2xl font-bold text-gray-800">User Management</h2><p className="text-gray-500">Manage system access, roles, and permissions.</p></div>
        <button onClick={handleOpenCreate} className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition shadow-sm w-full md:w-auto"><Plus size={18} /> Add User</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {users.map((user) => (
          <div key={user._id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition duration-300 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className={`p-2 rounded-xl ${user.role === 'admin' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>{user.role === 'admin' ? <Shield size={20} /> : <User size={20} />}</div>
                {currentUser && currentUser._id === user._id && (<span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded">YOU</span>)}
              </div>
              <h3 className="text-xl font-bold text-gray-800">{user.name}</h3>
              <p className="text-sm text-gray-500 mb-4">{user.email}</p>
              <div className="space-y-3"><div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Access Permissions</div><div className="flex flex-wrap gap-2">{user.permissions && user.permissions.map(perm => (<span key={perm} className="px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 capitalize">{perm}</span>))}</div></div>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-50 flex justify-end items-center gap-2">
                <button onClick={() => handleOpenEdit(user)} className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition"><Pencil size={16} /> Edit</button>
                <button onClick={() => handleDeleteUser(user._id)} className="flex items-center gap-2 text-sm text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition"><Trash2 size={16} /> Delete</button>
            </div>
          </div>
        ))}
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center"><h3 className="text-xl font-bold text-gray-800">{editingUserId ? 'Edit User' : 'Add New User'}</h3><button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition"><XCircle size={24} /></button></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label><input type="text" required className="w-full px-4 py-2.5 rounded-xl border border-gray-200" placeholder="e.g. John Doe" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label><input type="email" required className="w-full px-4 py-2.5 rounded-xl border border-gray-200" placeholder="user@example.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">{editingUserId ? 'New Password (Optional)' : 'Password'}</label><input type="password" required={!editingUserId} className="w-full px-4 py-2.5 rounded-xl border border-gray-200" placeholder="Enter password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} /></div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">Role</label><div className="flex gap-4">{['user', 'admin', 'merchant'].map(r => (<label key={r} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="role" value={r} checked={formData.role === r} onChange={() => setFormData({...formData, role: r as any})} className="text-indigo-600" /><span className="text-gray-700 capitalize">{r}</span></label>))}</div></div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100"><label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><Lock size={16} className="text-gray-400" /> View Permissions</label><div className="space-y-3">{['dashboard', 'events', 'payments'].map((view) => (<label key={view} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-white rounded-lg transition"><input type="checkbox" checked={formData.permissions.includes(view as ViewState)} onChange={() => togglePermission(view as ViewState)} className="w-5 h-5 text-indigo-600 rounded border-gray-300" /><span className="capitalize font-medium text-gray-700">{view}</span></label>))}</div></div>
              <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition">{editingUserId ? 'Save Changes' : 'Create User'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default UsersManager;