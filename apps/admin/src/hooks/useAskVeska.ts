'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';

// ─── Context ─────────────────────────────────────────────────────────────────

export interface AskVeskaContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const AskVeskaContext = createContext<AskVeskaContextValue | null>(null);

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Returns the shared Ask Veska panel state from context.
 * Must be used inside <AskVeskaProvider>.
 */
export function useAskVeska(): AskVeskaContextValue {
  const ctx = useContext(AskVeskaContext);
  if (ctx === null) {
    throw new Error('useAskVeska must be used inside <AskVeskaProvider>');
  }
  return ctx;
}

/**
 * Creates the root state for the Ask Veska panel.
 * Used once inside AskVeskaProvider.
 */
export function useAskVeskaState(): AskVeskaContextValue {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggle();
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggle]);

  return { isOpen, open, close, toggle };
}
