'use client';

export interface BulkActionBarAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

export interface BulkActionBarProps {
  selectedCount: number;
  actions: BulkActionBarAction[];
  onClear: () => void;
}

export function BulkActionBar({ selectedCount, actions, onClear }: BulkActionBarProps) {
  const visible = selectedCount > 0;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-6 pointer-events-none transition-transform duration-300 ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div
        role="toolbar"
        aria-label="Bulk actions"
        className="pointer-events-auto flex items-center gap-3 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-2xl"
      >
        <span aria-live="polite" className="text-sm font-medium text-gray-300 mr-1">
          {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
        </span>
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${
              action.variant === 'danger'
                ? 'bg-red-500 hover:bg-red-400 text-white'
                : 'bg-white text-gray-900 hover:bg-gray-100'
            }`}
          >
            {action.label}
          </button>
        ))}
        <button
          onClick={onClear}
          className="text-sm px-3 py-1.5 rounded-lg font-medium text-gray-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
