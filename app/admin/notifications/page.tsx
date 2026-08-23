'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { getStaffUser } from '@/lib/auth';

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

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Notifications</h1>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} />
          Unread only
        </label>
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
      {loading && <p className="text-gray-500 text-sm">Loading...</p>}
      {!loading && notifications.length === 0 && <p className="text-gray-500 text-sm">No notifications.</p>}

      <div className="space-y-2">
        {notifications.map((n) => (
          <div key={n.id} className={`bg-white rounded-xl border p-4 ${!n.isRead ? 'border-blue-300' : ''}`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-sm">{n.title}</p>
                <p className="text-sm text-gray-600 mt-1">{n.body}</p>
                <p className="text-xs text-gray-400 mt-2">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
              {!n.isRead && (
                <button onClick={() => handleMarkRead(n.id)} className="text-blue-600 text-xs font-medium whitespace-nowrap ml-4">
                  Mark read
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
