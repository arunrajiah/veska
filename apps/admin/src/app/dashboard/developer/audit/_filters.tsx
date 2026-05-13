'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';

interface AuditFiltersProps {
  initialAction: string;
  initialEntityType: string;
}

export default function AuditFilters({ initialAction, initialEntityType }: AuditFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [action, setAction] = useState(initialAction);
  const [entityType, setEntityType] = useState(initialEntityType);

  function applyFilters(newAction: string, newEntityType: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (newAction.trim()) {
      params.set('action', newAction.trim());
    } else {
      params.delete('action');
    }
    if (newEntityType.trim()) {
      params.set('entityType', newEntityType.trim());
    } else {
      params.delete('entityType');
    }
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  }

  return (
    <div className="flex items-center gap-3 mb-2">
      <input
        type="text"
        value={action}
        onChange={(e) => {
          setAction(e.target.value);
          applyFilters(e.target.value, entityType);
        }}
        placeholder="Filter by action…"
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 w-48"
      />
      <input
        type="text"
        value={entityType}
        onChange={(e) => {
          setEntityType(e.target.value);
          applyFilters(action, e.target.value);
        }}
        placeholder="Filter by entity type…"
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 w-48"
      />
      {(action || entityType) && (
        <button
          onClick={() => {
            setAction('');
            setEntityType('');
            applyFilters('', '');
          }}
          className="text-sm text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
        >
          Clear
        </button>
      )}
    </div>
  );
}
