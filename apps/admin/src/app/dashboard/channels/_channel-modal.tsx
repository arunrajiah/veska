'use client';

import { useState } from 'react';
import { X, Hash, Mail, MessageCircle, Send } from 'lucide-react';
import type { NotifChannel } from './page.js';

const CHANNEL_TYPES = [
  { value: 'slack', label: 'Slack', Icon: Hash },
  { value: 'email', label: 'Email', Icon: Mail },
  { value: 'whatsapp', label: 'WhatsApp', Icon: MessageCircle },
  { value: 'telegram', label: 'Telegram', Icon: Send },
] as const;

type ChannelType = (typeof CHANNEL_TYPES)[number]['value'];

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

function getCookie(name: string): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.split('; ').find((r) => r.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=')[1] ?? '') : '';
}

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

interface FieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}

function Field({ label, required, children }: FieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent';
const selectClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white';

interface SlackConfigProps {
  config: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

function SlackConfigFields({ config, onChange }: SlackConfigProps) {
  return (
    <>
      <Field label="Bot Token" required>
        <input
          type="password"
          value={config.botToken ?? ''}
          onChange={(e) => onChange('botToken', e.target.value)}
          placeholder="xoxb-..."
          className={inputClass}
        />
      </Field>
      <Field label="Signing Secret" required>
        <input
          type="password"
          value={config.signingSecret ?? ''}
          onChange={(e) => onChange('signingSecret', e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="Default Channel">
        <input
          type="text"
          value={config.defaultChannel ?? ''}
          onChange={(e) => onChange('defaultChannel', e.target.value)}
          placeholder="#general"
          className={inputClass}
        />
      </Field>
    </>
  );
}

interface EmailConfigProps {
  config: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

function EmailConfigFields({ config, onChange }: EmailConfigProps) {
  const provider = config.provider ?? 'resend';

  return (
    <>
      <Field label="Provider" required>
        <select
          value={provider}
          onChange={(e) => onChange('provider', e.target.value)}
          className={selectClass}
        >
          <option value="resend">Resend</option>
          <option value="smtp">SMTP</option>
        </select>
      </Field>

      {provider === 'resend' ? (
        <>
          <Field label="Resend API Key" required>
            <input
              type="password"
              value={config.resendApiKey ?? ''}
              onChange={(e) => onChange('resendApiKey', e.target.value)}
              placeholder="re_..."
              className={inputClass}
            />
          </Field>
          <Field label="From Address" required>
            <input
              type="email"
              value={config.fromAddress ?? ''}
              onChange={(e) => onChange('fromAddress', e.target.value)}
              placeholder="no-reply@example.com"
              className={inputClass}
            />
          </Field>
          <Field label="From Name">
            <input
              type="text"
              value={config.fromName ?? ''}
              onChange={(e) => onChange('fromName', e.target.value)}
              placeholder="Veska Notifications"
              className={inputClass}
            />
          </Field>
        </>
      ) : (
        <>
          <Field label="SMTP Host" required>
            <input
              type="text"
              value={config.host ?? ''}
              onChange={(e) => onChange('host', e.target.value)}
              placeholder="smtp.example.com"
              className={inputClass}
            />
          </Field>
          <Field label="Port" required>
            <input
              type="number"
              value={config.port ?? '587'}
              onChange={(e) => onChange('port', e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Username">
            <input
              type="text"
              value={config.username ?? ''}
              onChange={(e) => onChange('username', e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              value={config.password ?? ''}
              onChange={(e) => onChange('password', e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="From Address" required>
            <input
              type="email"
              value={config.fromAddress ?? ''}
              onChange={(e) => onChange('fromAddress', e.target.value)}
              placeholder="no-reply@example.com"
              className={inputClass}
            />
          </Field>
          <Field label="From Name">
            <input
              type="text"
              value={config.fromName ?? ''}
              onChange={(e) => onChange('fromName', e.target.value)}
              className={inputClass}
            />
          </Field>
        </>
      )}
    </>
  );
}

interface WhatsAppConfigProps {
  config: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

function WhatsAppConfigFields({ config, onChange }: WhatsAppConfigProps) {
  return (
    <>
      <Field label="Access Token" required>
        <input
          type="password"
          value={config.accessToken ?? ''}
          onChange={(e) => onChange('accessToken', e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="Phone Number ID" required>
        <input
          type="text"
          value={config.phoneNumberId ?? ''}
          onChange={(e) => onChange('phoneNumberId', e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="Webhook Verify Token" required>
        <input
          type="password"
          value={config.verifyToken ?? ''}
          onChange={(e) => onChange('verifyToken', e.target.value)}
          className={inputClass}
        />
      </Field>
    </>
  );
}

interface TelegramConfigProps {
  config: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

function TelegramConfigFields({ config, onChange }: TelegramConfigProps) {
  return (
    <>
      <Field label="Bot Token" required>
        <input
          type="password"
          value={config.botToken ?? ''}
          onChange={(e) => onChange('botToken', e.target.value)}
          placeholder="123456:ABC-..."
          className={inputClass}
        />
      </Field>
      <Field label="Webhook Secret">
        <input
          type="password"
          value={config.webhookSecret ?? ''}
          onChange={(e) => onChange('webhookSecret', e.target.value)}
          className={inputClass}
        />
      </Field>
    </>
  );
}

interface Props {
  mode: 'add' | 'edit';
  channel?: NotifChannel;
  onClose: () => void;
  onSaved: (channel: NotifChannel) => void;
}

export function ChannelModal({ mode, channel, onClose, onSaved }: Props) {
  const [type, setType] = useState<ChannelType>(channel?.type ?? 'slack');
  const [name, setName] = useState(channel?.name ?? '');
  const [config, setConfig] = useState<Record<string, string>>(
    (channel?.config as Record<string, string>) ?? {},
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function handleConfigChange(key: string, value: string) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    setSaving(true);
    setError('');

    try {
      let res: Response;
      if (mode === 'add') {
        res = await clientFetch('/api/v1/notification-channels/channels', {
          method: 'POST',
          body: JSON.stringify({ type, name: name.trim(), config, enabled: true }),
        });
      } else {
        res = await clientFetch(`/api/v1/notification-channels/channels/${channel!.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name: name.trim(), config }),
        });
      }

      if (!res.ok) {
        const text = await res.text();
        setError(`Failed to save: ${text}`);
        return;
      }

      const saved = (await res.json()) as NotifChannel;
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {mode === 'add' ? 'Connect a Channel' : 'Edit Channel'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Type selector (only for add) */}
          {mode === 'add' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Channel Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {CHANNEL_TYPES.map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setType(value);
                      setConfig({});
                    }}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-medium transition-colors ${
                      type === value
                        ? 'border-gray-900 bg-gray-50 text-gray-900'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <Icon size={18} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Name */}
          <Field label="Channel Name" required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                type === 'slack'
                  ? 'Slack #general'
                  : type === 'email'
                  ? 'Transactional Email'
                  : type === 'whatsapp'
                  ? 'WhatsApp Business'
                  : 'Telegram Bot'
              }
              className={inputClass}
            />
          </Field>

          {/* Dynamic config fields */}
          {type === 'slack' && (
            <SlackConfigFields config={config} onChange={handleConfigChange} />
          )}
          {type === 'email' && (
            <EmailConfigFields config={config} onChange={handleConfigChange} />
          )}
          {type === 'whatsapp' && (
            <WhatsAppConfigFields config={config} onChange={handleConfigChange} />
          )}
          {type === 'telegram' && (
            <TelegramConfigFields config={config} onChange={handleConfigChange} />
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-sm border border-gray-200 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : mode === 'add' ? 'Connect' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
