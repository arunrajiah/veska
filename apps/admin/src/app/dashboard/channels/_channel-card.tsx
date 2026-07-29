'use client';

import { useState } from 'react';
import { Hash, Mail, MessageCircle, Send, Settings, Trash2 } from 'lucide-react';
import type { NotifChannel } from './page.js';

const CHANNEL_ICONS = {
  slack: Hash,
  email: Mail,
  whatsapp: MessageCircle,
  telegram: Send,
};

const CHANNEL_LABELS: Record<string, string> = {
  slack: 'Slack',
  email: 'Email',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
};

const TYPE_COLORS: Record<string, string> = {
  slack: 'bg-purple-100 text-purple-700',
  email: 'bg-blue-100 text-blue-700',
  whatsapp: 'bg-green-100 text-green-700',
  telegram: 'bg-sky-100 text-sky-700',
};

interface Props {
  channel: NotifChannel;
  onEdit: () => void;
  onDeleted: () => void;
  onToggle: (enabled: boolean) => void;
}

function getCookie(name: string): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.split('; ').find((r) => r.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=')[1] ?? '') : '';
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

async function clientFetch(path: string, init: RequestInit = {}) {
  const tenantId = getCookie('veska_tenant') || TENANT_ID;
  const identityId = getCookie('veska_identity') || getCookie('veska_user') || 'system';
  const sessionToken = getCookie('veska_session');

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Veska-Tenant-Id': tenantId,
      'X-Veska-Identity-Id': identityId,
      ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  return res;
}

export function ChannelCard({ channel, onEdit, onDeleted, onToggle }: Props) {
  const [toggling, setToggling] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const Icon = CHANNEL_ICONS[channel.type] ?? Hash;
  const label = CHANNEL_LABELS[channel.type] ?? channel.type;
  const typeColor = TYPE_COLORS[channel.type] ?? 'bg-gray-100 text-gray-700';

  async function handleToggle() {
    setToggling(true);
    try {
      const res = await clientFetch(`/api/v1/notification-channels/channels/${channel.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled: !channel.enabled }),
      });
      if (res.ok) {
        onToggle(!channel.enabled);
      }
    } catch {
      // silently ignore
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await clientFetch(`/api/v1/notification-channels/channels/${channel.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        onDeleted();
      }
    } catch {
      // silently ignore
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-start justify-between gap-4">
        {/* Left: icon + info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Icon size={18} className="text-gray-600" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-gray-900 truncate">{channel.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColor}`}>
                {label}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Added {new Date(channel.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Right: status + toggle */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <div
              className={`w-2 h-2 rounded-full ${channel.enabled ? 'bg-green-500' : 'bg-gray-300'}`}
            />
            <span className="text-xs text-gray-500">
              {channel.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>

          {/* Toggle */}
          <button
            onClick={handleToggle}
            disabled={toggling}
            aria-label={channel.enabled ? 'Disable channel' : 'Enable channel'}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
              channel.enabled ? 'bg-gray-900' : 'bg-gray-200'
            } ${toggling ? 'opacity-50' : ''}`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                channel.enabled ? 'translate-x-4' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 mt-4">
        {confirmDelete ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Remove this channel?</span>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-gray-500 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {deleting ? 'Removing…' : 'Remove'}
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 text-xs border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Settings size={12} />
              Settings
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 text-xs border border-red-200 text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 size={12} />
              Remove
            </button>
          </>
        )}
      </div>
    </div>
  );
}
