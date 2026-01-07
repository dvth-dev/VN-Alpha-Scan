import React, { useState } from 'react';
import { LayoutDashboard, Settings, TrendingUp, LogOut, Bell, Search, Menu, X } from 'lucide-react';

const AdminLayout = ({ children, activeTab, onTabChange }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  const menuItems = [
    { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { id: 'competitions', icon: <TrendingUp size={20} />, label: 'Alpha Competitions' },
    { id: 'settings', icon: <Settings size={20} />, label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0b10] text-slate-200 font-sans selection:bg-indigo-500/30">
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full bg-[#11121a] border-r border-slate-800/50 transition-all duration-300 z-50 ${isSidebarOpen ? 'w-64' : 'w-20'
          }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-20 flex items-center px-6 border-b border-slate-800/50">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl text-center">A</span>
            </div>
            {isSidebarOpen && (
              <span className="ml-3 font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                AlphaAdmin
              </span>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-6 px-4 space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onTabChange && onTabChange(item.id)}
                className={`w-full flex items-center px-3 py-3 rounded-xl transition-all duration-200 group ${activeTab === item.id
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.05)]'
                  : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                  }`}
              >
                <span className={`${activeTab === item.id ? 'text-indigo-400' : 'group-hover:text-indigo-400 transition-colors'}`}>
                  {item.icon}
                </span>
                {isSidebarOpen && <span className="ml-3 font-medium">{item.label}</span>}
              </button>
            ))}
          </nav>

          {/* User Profile / Logout */}
          <div className="p-4 border-t border-slate-800/50">
            <button className="w-full flex items-center px-3 py-3 rounded-xl text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-all duration-200">
              <LogOut size={20} />
              {isSidebarOpen && <span className="ml-3 font-medium">Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`transition-all duration-300 ${isSidebarOpen ? 'pl-64' : 'pl-20'}`}>
        {/* Header */}
        <header className="h-20 bg-[#0a0b10]/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-800/50 flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="relative group hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
              <input
                type="text"
                placeholder="Search analytics..."
                className="bg-slate-900 border border-slate-800 rounded-xl py-2 pl-10 pr-4 w-64 focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-600"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-all">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full border-2 border-[#0a0b10]"></span>
            </button>
            <div className="h-8 w-[1px] bg-slate-800 mx-2"></div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-200 leading-none">Admin User</p>
                <p className="text-xs text-slate-500 mt-1">Super Admin</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                <span className="text-indigo-400 font-bold">AD</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
