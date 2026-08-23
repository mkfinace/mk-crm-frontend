'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { getStaffUser } from '@/lib/auth';
import { cardCls, linkBtnCls } from '@/components/adminStyles';
import { IconBell } from '@/components/AdminIcons';

export default function NotificationsPage() {
  const staff = getStaffUser();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, [unreadOnly]);

  async function loadNotifications() {
    if (!staff) return;
    setLoading(true);
    setError('');
    try {
      setNotifications(await api.listNotifications(staff.id, unreadOnly));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkRead(id: string) {
    setError('');
    try {
      await api.markNotificationRead(id);
      await loadNotifications();
    } catch (e: any) {
      setError(e.message);
    }
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Notifications
          </h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : 'You\u2019re all caught up'}
          </p>
        </div>
        <label className="flex items-center gap-2 text-[13px] text-slate-600 select-none cursor-pointer">
          <input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} className="accent-[#B4872E]" />
          Unread only
        </label>
      </div>

      {error && <p className="text-red-600 text-sm mb-4 bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">{error}</p>}

      {loading && <div className="space-y-2.5">{[0, 1, 2].map((i) => <div key={i} className="h-20 bg-slate-200/50 rounded-2xl animate-pulse" />)}</div>}

      {!loading && notifications.length === 0 && (
        <div className={`${cardCls} px-5 py-12 text-center`}>
          <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <IconBell className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-sm text-slate-500">Nothing here yet.</p>
          <p className="text-[12.5px] text-slate-400 mt-0.5">You'll be notified here when a lead is assigned to you.</p>
        </div>
      )}

      <div className="space-y-2.5">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`${cardCls} p-4 flex items-start gap-3.5 ${!n.isRead ? 'border-[#D8B155]/40 bg-[#FBF3E1]/30' : ''}`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${!n.isRead ? 'bg-[#FBF3E1]' : 'bg-slate-100'}`}>
              <IconBell className={`w-[17px] h-[17px] ${!n.isRead ? 'text-[#B4872E]' : 'text-slate-400'}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[13.5px] font-medium text-slate-800">{n.title}</p>
                {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-[#D8B155] mt-1.5 shrink-0" />}
              </div>
              <p className="text-[13px] text-slate-500 mt-0.5">{n.body}</p>
              <div className="flex items-center gap-3 mt-2">
                <p className="text-[11.5px] text-slate-400">{new Date(n.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                {!n.isRead && (
                  <button onClick={() => handleMarkRead(n.id)} className={linkBtnCls}>
                    Mark as read
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
