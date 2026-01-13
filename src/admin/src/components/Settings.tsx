import React, { useState, useEffect } from 'react';
import { 
  Shield, Trash2, AlertCircle, FileText, CheckCircle, 
  Bell, Globe, Save, Lock, Twitter, Instagram, Facebook, 
  MessageCircle, Phone, Mail 
} from 'lucide-react';
import { AuditLogEntry, UserData } from '../types';

interface SettingsProps {
  currentUser: UserData;
  auditLogs: AuditLogEntry[];
  onClearLogs: () => void;
  onLogAction: (action: string, details: string) => void;
}

const Settings: React.FC<SettingsProps> = ({ currentUser, auditLogs, onClearLogs, onLogAction }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'socials' | 'notifications' | 'audit'>('general');
  const [isSaving, setIsSaving] = useState(false);

  // Unified Settings State
  const [settings, setSettings] = useState({
    platformName: 'Nicket',
    supportEmail: '',
    currency: 'NGN',
    timezone: 'Africa/Lagos',
    maintenanceMode: false,
    socials: {
      twitter: '',
      instagram: '',
      facebook: '',
      whatsapp: '',
      phone: '',
      email: ''
    }
  });

  const [notificationSettings, setNotificationSettings] = useState({
    newTicketAlert: true,
    limitReachedAlert: false,
    weeklyReport: true,
    systemErrors: true
  });

  const isAdmin = currentUser.role === 'admin';
  const getToken = () => localStorage.getItem('token');

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        setSettings(prev => ({
          ...prev,
          ...data,
          socials: { ...prev.socials, ...(data.socials || {}) }
        }));
      })
      .catch(console.error);
  }, []);

  const saveSettingsToDB = async (sectionName: string) => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(settings)
      });

      if (res.ok) {
        onLogAction('Settings Updated', `${sectionName} updated`);
        alert(`${sectionName} saved successfully!`);
      } else {
        alert("Failed to save settings");
      }
    } catch (err) {
      console.error(err);
      alert("Error connecting to server");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettingsToDB('General Settings');
  };

  const handleSaveSocials = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettingsToDB('Social Handles');
  };

  const handleSaveNotifications = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
        onLogAction('Settings Updated', 'Notification preferences updated');
        setIsSaving(false);
        alert('Notification preferences saved successfully!');
    }, 800);
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionIcon = (action: string) => {
    if (action.includes('Delete') || action.includes('Clear')) return <Trash2 size={14} className="text-rose-500" />;
    if (action.includes('Create')) return <CheckCircle size={14} className="text-emerald-500" />;
    if (action.includes('Update') || action.includes('Status')) return <FileText size={14} className="text-blue-500" />;
    return <AlertCircle size={14} className="text-gray-500" />;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Settings</h2>
          <p className="text-gray-500">Platform configuration and security logs.</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        {/* Sidebar */}
        <div className="w-full md:w-64 bg-gray-50/50 border-r border-gray-100 p-4 space-y-2">
          <button
            onClick={() => setActiveTab('general')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
              activeTab === 'general' 
                ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-gray-200' 
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <Globe size={18} />
            General
          </button>

          <button
            onClick={() => setActiveTab('socials')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
              activeTab === 'socials' 
                ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-gray-200' 
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <MessageCircle size={18} />
            Socials & Contact
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
              activeTab === 'notifications' 
                ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-gray-200' 
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <Bell size={18} />
            Notifications
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
              activeTab === 'audit' 
                ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-gray-200' 
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <Shield size={18} />
            Audit Logs
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 md:p-8">
          
          {/* --- General Settings Tab --- */}
          {activeTab === 'general' && (
            <div className="max-w-2xl">
                <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-800">General Settings</h3>
                    <p className="text-sm text-gray-500">Configure your platform's basic information.</p>
                </div>
                
                <form onSubmit={handleSaveGeneral} className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Platform Name</label>
                        <input 
                            type="text" 
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                            value={settings.platformName}
                            onChange={(e) => setSettings({...settings, platformName: e.target.value})}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Default Currency</label>
                            <select 
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition bg-white"
                                value={settings.currency}
                                onChange={(e) => setSettings({...settings, currency: e.target.value})}
                            >
                                <option value="NGN">Nigerian Naira (₦)</option>
                                <option value="USD">US Dollar ($)</option>
                                <option value="EUR">Euro (€)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Timezone</label>
                            <select 
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition bg-white"
                                value={settings.timezone}
                                onChange={(e) => setSettings({...settings, timezone: e.target.value})}
                            >
                                <option value="Africa/Lagos">West Africa Time (Lagos)</option>
                                <option value="GMT">Greenwich Mean Time</option>
                                <option value="America/New_York">Eastern Time (US)</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Support Email</label>
                        <input 
                            type="email" 
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                            value={settings.supportEmail}
                            onChange={(e) => setSettings({...settings, supportEmail: e.target.value})}
                        />
                    </div>

                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                        <div>
                            <h4 className="text-sm font-semibold text-gray-800">Disable Lottery Access</h4>
                            <p className="text-xs text-gray-500 mt-0.5">Stops all new bets from being placed.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={settings.maintenanceMode}
                                onChange={(e) => setSettings({...settings, maintenanceMode: e.target.checked})}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>

                    <div className="pt-4 border-t border-gray-100 flex justify-end">
                        <button 
                            type="submit"
                            disabled={isSaving}
                            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition shadow-sm disabled:opacity-70"
                        >
                            {isSaving ? 'Saving...' : (
                                <>
                                    <Save size={18} />
                                    Save Changes
                                </>
                            )} 
                        </button>
                    </div>
                </form>
            </div>
          )}

          {/* --- Socials & Support Handles Tab --- */}
          {activeTab === 'socials' && (
            <div className="max-w-2xl">
                {!isAdmin ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-4">
                            <Lock size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800">Access Denied</h3>
                        <p className="text-gray-500 max-w-xs mt-2">Only system administrators can modify platform handles and support contacts.</p>
                    </div>
                ) : (
                    <>
                        <div className="mb-6 flex justify-between items-start">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">Socials & Support Contacts</h3>
                                <p className="text-sm text-gray-500">Update the links and contact details displayed on the public platform.</p>
                            </div>
                            <span className="bg-indigo-50 text-indigo-600 text-[10px] px-2 py-1 rounded font-bold border border-indigo-100 flex items-center gap-1">
                                <Shield size={10} />
                                ADMIN ONLY
                            </span>
                        </div>

                        <form onSubmit={handleSaveSocials} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Social Media Column */}
                                <div className="space-y-5">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Social Media</h4>
                                    
                                    <div className="space-y-1.5">
                                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                            <Twitter size={16} className="text-sky-400" />
                                            Twitter (X) URL
                                        </label>
                                        <input 
                                            type="url" 
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                                            placeholder="https://x.com/handle"
                                            value={settings.socials.twitter}
                                            onChange={(e) => setSettings({...settings, socials: { ...settings.socials, twitter: e.target.value }})}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                            <Instagram size={16} className="text-pink-500" />
                                            Instagram URL
                                        </label>
                                        <input 
                                            type="url" 
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                                            placeholder="https://instagram.com/handle"
                                            value={settings.socials.instagram}
                                            onChange={(e) => setSettings({...settings, socials: { ...settings.socials, instagram: e.target.value }})}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                            <Facebook size={16} className="text-blue-600" />
                                            Facebook Page URL
                                        </label>
                                        <input 
                                            type="url" 
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                                            placeholder="https://facebook.com/page"
                                            value={settings.socials.facebook}
                                            onChange={(e) => setSettings({...settings, socials: { ...settings.socials, facebook: e.target.value }})}
                                        />
                                    </div>
                                </div>

                                {/* Support Column */}
                                <div className="space-y-5">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Support & Contact</h4>

                                    <div className="space-y-1.5">
                                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                            <MessageCircle size={16} className="text-emerald-500" />
                                            WhatsApp Number
                                        </label>
                                        <input 
                                            type="text" 
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                                            placeholder="+234..."
                                            value={settings.socials.whatsapp}
                                            onChange={(e) => setSettings({...settings, socials: { ...settings.socials, whatsapp: e.target.value }})}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                            <Phone size={16} className="text-indigo-500" />
                                            Support Phone Call
                                        </label>
                                        <input 
                                            type="text" 
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                                            placeholder="+234..."
                                            value={settings.socials.phone}
                                            onChange={(e) => setSettings({...settings, socials: { ...settings.socials, phone: e.target.value }})}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                            <Mail size={16} className="text-rose-400" />
                                            Public Support Email
                                        </label>
                                        <input 
                                            type="email" 
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                                            placeholder="support@domain.com"
                                            value={settings.socials.email}
                                            onChange={(e) => setSettings({...settings, socials: { ...settings.socials, email: e.target.value }})}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100 flex justify-end">
                                <button 
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition shadow-sm disabled:opacity-70"
                                >
                                    {isSaving ? 'Updating...' : (
                                        <>
                                            <Save size={18} />
                                            Update Handles
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
          )}

          {/* --- Notification Settings Tab --- */}
          {activeTab === 'notifications' && (
            <div className="max-w-2xl">
                <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-800">Notifications</h3>
                    <p className="text-sm text-gray-500">Manage what emails you receive from the platform.</p>
                </div>

                <form onSubmit={handleSaveNotifications} className="space-y-4">
                     <div className="space-y-4">
                        {[
                            { id: 'newTicketAlert', label: 'New Ticket Sales Alerts', desc: 'Get notified immediately when a new ticket is purchased.' },
                            { id: 'limitReachedAlert', label: 'Ticket Limit Alerts', desc: 'Receive a warning when lottery numbers are running low.' },
                            { id: 'weeklyReport', label: 'Weekly Summary', desc: 'A weekly digest of your sales and performance stats.' },
                            { id: 'systemErrors', label: 'System Errors', desc: 'Critical alerts regarding payment failures or bugs.' },
                        ].map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:border-gray-200 transition">
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-800">{item.label}</h4>
                                    <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer"
                                        checked={(notificationSettings as any)[item.id]}
                                        onChange={(e) => setNotificationSettings({...notificationSettings, [item.id]: e.target.checked})}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>
                        ))}
                     </div>

                    <div className="pt-4 border-t border-gray-100 flex justify-end">
                        <button 
                            type="submit"
                            disabled={isSaving}
                            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition shadow-sm disabled:opacity-70"
                        >
                            {isSaving ? 'Saving...' : (
                                <>
                                    <Save size={18} />
                                    Save Preferences
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
          )}

          {/* --- Audit Logs Tab --- */}
          {activeTab === 'audit' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Audit Logs</h3>
                  <p className="text-sm text-gray-500">Track all significant user activities.</p>
                </div>
                {auditLogs.length > 0 && (
                  <button
                    onClick={() => {
                      if (isAdmin) {
                        if (window.confirm('Are you sure you want to clear all audit logs? This cannot be undone.')) {
                          onClearLogs();
                        }
                      } else {
                        alert('Only Administrators can clear audit logs.');
                      }
                    }}
                    disabled={!isAdmin}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
                      isAdmin 
                        ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100' 
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                    title={!isAdmin ? "Restricted to Admins" : "Clear Logs"}
                  >
                    <Trash2 size={16} />
                    Clear Logs
                  </button>
                )}
              </div>

              <div className="border border-gray-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Details</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">User</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {auditLogs.length > 0 ? (
                      auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50 transition">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-lg bg-gray-50 border border-gray-100">
                                {getActionIcon(log.action)}
                              </div>
                              <span className="text-sm font-medium text-gray-700">{log.action}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {log.details}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-gray-800">{log.performedBy}</span>
                              <span className="text-[10px] uppercase tracking-wider text-gray-400">{log.userRole}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                            {formatDate(log.timestamp)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                          <Shield size={32} className="mx-auto mb-3 opacity-20" />
                          <p>No audit logs available.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Settings;