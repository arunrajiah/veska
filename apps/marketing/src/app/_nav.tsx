'use client';

import Link from 'next/link';
import { useState } from 'react';

export function MarketingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl text-gray-900 tracking-tight">
          Veska
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8 text-sm text-gray-600">
          <Link href="#features" className="hover:text-gray-900 transition-colors">
            Features
          </Link>
          <Link href="#pricing" className="hover:text-gray-900 transition-colors">
            Pricing
          </Link>
          <Link href="/docs" className="hover:text-gray-900 transition-colors">
            Docs
          </Link>
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link
            href="http://localhost:3000"
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors px-3 py-1.5"
          >
            Sign in
          </Link>
          <Link
            href="http://localhost:3000"
            className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Start free trial
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-gray-100 bg-white px-6 py-4 flex flex-col gap-4">
          <Link
            href="#features"
            className="text-sm text-gray-700 hover:text-gray-900"
            onClick={() => setOpen(false)}
          >
            Features
          </Link>
          <Link
            href="#pricing"
            className="text-sm text-gray-700 hover:text-gray-900"
            onClick={() => setOpen(false)}
          >
            Pricing
          </Link>
          <Link
            href="/docs"
            className="text-sm text-gray-700 hover:text-gray-900"
            onClick={() => setOpen(false)}
          >
            Docs
          </Link>
          <div className="border-t border-gray-100 pt-4 flex flex-col gap-3">
            <Link
              href="http://localhost:3000"
              className="text-sm text-gray-700 hover:text-gray-900"
              onClick={() => setOpen(false)}
            >
              Sign in
            </Link>
            <Link
              href="http://localhost:3000"
              className="bg-indigo-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors text-center"
              onClick={() => setOpen(false)}
            >
              Start free trial
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
