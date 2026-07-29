'use client';

import { useState } from 'react';
import { Radio } from 'lucide-react';
import type { NotifChannel, NotifRoute } from './page.js';
import { ChannelCard } from './_channel-card.js';
import { ChannelModal } from './_channel-modal.js';
import { RoutingTab } from './_routing-tab.js';

interface Props {
  initialChannels: NotifChannel[];
  initialRoutes: NotifRoute[];
}

type Tab = 'channels' | 'routing';

export function ChannelsClient({ initialChannels, initialRoutes }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('channels');
  const [channels, setChannels] = useState<NotifChannel[]>(initialChannels);
  const [routes, setRoutes] = useState<NotifRoute[]>(initialRoutes);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<NotifChannel | null>(null);

  function handleChannelSaved(channel: NotifChannel, isNew: boolean) {
    if (isNew) {
      setChannels((prev) => [channel, ...prev]);
    } else {
      setChannels((prev) => prev.map((c) => (c.id === channel.id ? channel : c)));
    }
  }

  function handleChannelDeleted(id: string) {
    setChannels((prev) => prev.filter((c) => c.id !== id));
  }

  function handleToggle(id: string, enabled: boolean) {
    setChannels((prev) => prev.map((c) => (c.id === id ? { ...c, enabled } : c)));
  }

  return (
    <div className="px-8 py-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Radio size={20} className="text-gray-600" />
          <h1 className="text-2xl font-semibold text-gray-900">Channels</h1>
        </div>
        {activeTab === 'channels' && (
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            + Add Channel
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {(['channels', 'routing'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
              activeTab === tab
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'channels' ? 'Channels' : 'Routing'}
          </button>
        ))}
      </div>

      {/* Channels Tab */}
      {activeTab === 'channels' && (
        <div className="space-y-3">
          {channels.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center">
              <Radio size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium mb-1">No channels configured</p>
              <p className="text-sm text-gray-400 mb-4">
                Connect Slack, Email, WhatsApp or Telegram to start sending notifications.
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Add your first channel
              </button>
            </div>
          ) : (
            channels.map((channel) => (
              <ChannelCard
                key={channel.id}
                channel={channel}
                onEdit={() => setEditingChannel(channel)}
                onDeleted={() => handleChannelDeleted(channel.id)}
                onToggle={(enabled) => handleToggle(channel.id, enabled)}
              />
            ))
          )}
        </div>
      )}

      {/* Routing Tab */}
      {activeTab === 'routing' && (
        <RoutingTab channels={channels} routes={routes} onRoutesChange={setRoutes} />
      )}

      {/* Add channel modal */}
      {showAddModal && (
        <ChannelModal
          mode="add"
          onClose={() => setShowAddModal(false)}
          onSaved={(ch) => {
            handleChannelSaved(ch, true);
            setShowAddModal(false);
          }}
        />
      )}

      {/* Edit channel modal */}
      {editingChannel && (
        <ChannelModal
          mode="edit"
          channel={editingChannel}
          onClose={() => setEditingChannel(null)}
          onSaved={(ch) => {
            handleChannelSaved(ch, false);
            setEditingChannel(null);
          }}
        />
      )}
    </div>
  );
}
