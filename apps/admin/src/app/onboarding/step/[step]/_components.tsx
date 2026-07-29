'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  getOnboardingData,
  saveOnboardingData,
  setOnboardingStep,
  markOnboardingComplete,
  type OnboardingData,
} from '@/lib/onboarding.js';

// ─── Constants ──────────────────────────────────────────────────────────────

const INDUSTRIES = ['Manufacturing', 'Retail', 'Services', 'Technology', 'Healthcare', 'Other'];

const COUNTRIES = [
  'United States',
  'United Kingdom',
  'Australia',
  'Canada',
  'Singapore',
  'India',
  'United Arab Emirates',
  'Germany',
  'France',
  'Netherlands',
  'Japan',
  'South Korea',
  'Brazil',
  'Mexico',
  'South Africa',
  'New Zealand',
  'Ireland',
  'Sweden',
  'Norway',
  'Denmark',
];

const CURRENCIES = [
  { code: 'USD', label: 'USD — US Dollar' },
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'GBP', label: 'GBP — British Pound' },
  { code: 'AUD', label: 'AUD — Australian Dollar' },
  { code: 'CAD', label: 'CAD — Canadian Dollar' },
  { code: 'SGD', label: 'SGD — Singapore Dollar' },
  { code: 'INR', label: 'INR — Indian Rupee' },
  { code: 'AED', label: 'AED — UAE Dirham' },
];

const COMPANY_SIZES = ['1–10', '11–50', '51–200', '200+'];

const ROLES = ['Admin', 'Manager', 'Employee', 'Viewer'];

const MODULES = [
  {
    id: 'finance',
    name: 'Finance & Invoicing',
    description: 'Manage invoices, expenses, and financial reports.',
    icon: '💰',
    alwaysOn: true,
  },
  {
    id: 'hr',
    name: 'HR & Payroll',
    description: 'Employee records, leave management, and payroll runs.',
    icon: '👥',
    alwaysOn: false,
  },
  {
    id: 'inventory',
    name: 'Inventory',
    description: 'Track stock levels, movements, and reorder points.',
    icon: '📦',
    alwaysOn: false,
  },
  {
    id: 'crm',
    name: 'CRM & Sales',
    description: 'Manage leads, contacts, deals, and pipelines.',
    icon: '🤝',
    alwaysOn: false,
  },
  {
    id: 'projects',
    name: 'Projects & Time',
    description: 'Track projects, tasks, milestones, and time logs.',
    icon: '📋',
    alwaysOn: false,
  },
  {
    id: 'purchasing',
    name: 'Purchasing',
    description: 'Purchase orders, vendor management, and GRNs.',
    icon: '🛒',
    alwaysOn: false,
  },
  {
    id: 'support',
    name: 'Support & Helpdesk',
    description: 'Tickets, SLAs, knowledge base, and customer portal.',
    icon: '🎧',
    alwaysOn: false,
  },
  {
    id: 'assets',
    name: 'Assets',
    description: 'Asset register, depreciation, and maintenance logs.',
    icon: '🏭',
    alwaysOn: false,
  },
  {
    id: 'contracts',
    name: 'Contracts',
    description: 'Contract lifecycle, renewals, and approvals.',
    icon: '📝',
    alwaysOn: false,
  },
];

const STEP_LABELS = ['Company', 'Modules', 'Team', 'AI Setup', 'Ready!'];

// ─── Step Indicator ──────────────────────────────────────────────────────────

function StepIndicator({ current, labels }: { current: number; labels?: string[] }) {
  const displayLabels = labels ?? STEP_LABELS;
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {displayLabels.map((label, idx) => {
        const stepNum = idx + 1;
        const isCompleted = stepNum < current;
        const isCurrent = stepNum === current;
        return (
          <div key={stepNum} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={[
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors',
                  isCompleted
                    ? 'bg-indigo-600 text-white'
                    : isCurrent
                      ? 'bg-indigo-600 text-white ring-4 ring-indigo-100'
                      : 'bg-gray-200 text-gray-500',
                ].join(' ')}
              >
                {isCompleted ? '✓' : stepNum}
              </div>
              <span
                className={[
                  'text-xs mt-1 whitespace-nowrap',
                  isCurrent ? 'text-indigo-600 font-medium' : 'text-gray-400',
                ].join(' ')}
              >
                {label}
              </span>
            </div>
            {idx < displayLabels.length - 1 && (
              <div
                className={[
                  'h-0.5 w-12 mx-1 mb-5 transition-colors',
                  isCompleted ? 'bg-indigo-600' : 'bg-gray-200',
                ].join(' ')}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1: Company Profile ─────────────────────────────────────────────────

function Step1({ onNext }: { onNext: () => void }) {
  const data = getOnboardingData();
  const [name, setName] = useState(data.company?.name ?? '');
  const [industry, setIndustry] = useState(data.company?.industry ?? '');
  const [country, setCountry] = useState(data.company?.country ?? '');
  const [currency, setCurrency] = useState(data.company?.currency ?? 'USD');
  const [size, setSize] = useState(data.company?.size ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e['name'] = 'Company name is required';
    if (!industry) e['industry'] = 'Please select an industry';
    if (!country) e['country'] = 'Please select a country';
    if (!currency) e['currency'] = 'Please select a currency';
    if (!size) e['size'] = 'Please select a company size';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleNext() {
    if (!validate()) return;
    saveOnboardingData({ company: { name, industry, country, currency, size } });
    onNext();
  }

  const fieldClass =
    'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent';
  const errorClass = 'text-xs text-red-500 mt-1';

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Tell us about your company</h2>
      <p className="text-sm text-gray-500 mb-6">This helps us tailor Veska to your business.</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Company name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Acme Corp"
            className={fieldClass}
          />
          {errors['name'] && <p className={errorClass}>{errors['name']}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className={fieldClass}
          >
            <option value="">Select industry…</option>
            {INDUSTRIES.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
          {errors['industry'] && <p className={errorClass}>{errors['industry']}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className={fieldClass}
            >
              <option value="">Select country…</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {errors['country'] && <p className={errorClass}>{errors['country']}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className={fieldClass}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
            {errors['currency'] && <p className={errorClass}>{errors['currency']}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Company size</label>
          <div className="flex flex-wrap gap-2">
            {COMPANY_SIZES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
                className={[
                  'flex-1 py-2 text-sm rounded-lg border transition-colors',
                  size === s
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium'
                    : 'border-gray-200 text-gray-600 hover:border-indigo-300',
                ].join(' ')}
              >
                {s}
              </button>
            ))}
          </div>
          {errors['size'] && <p className={errorClass}>{errors['size']}</p>}
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={handleNext}
          className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

// ─── Step 2: Enable Modules ─────────────────────────────────────────────────

function Step2({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const data = getOnboardingData();
  const [enabled, setEnabled] = useState<Set<string>>(new Set(data.modules ?? ['finance']));

  function toggle(id: string) {
    if (id === 'finance') return; // always on
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleNext() {
    saveOnboardingData({ modules: Array.from(enabled) });
    onNext();
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Enable modules</h2>
      <p className="text-sm text-gray-500 mb-6">
        Select the modules your business needs. You can change this later.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {MODULES.map((mod) => {
          const isOn = enabled.has(mod.id);
          return (
            <button
              key={mod.id}
              type="button"
              onClick={() => toggle(mod.id)}
              disabled={mod.alwaysOn}
              className={[
                'relative text-left p-3 rounded-xl border-2 transition-all',
                mod.alwaysOn
                  ? 'border-indigo-300 bg-indigo-50 opacity-70 cursor-default'
                  : isOn
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 bg-white hover:border-indigo-300',
              ].join(' ')}
            >
              <div className="text-xl mb-1">{mod.icon}</div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-semibold text-gray-800 leading-tight">
                  {mod.name}
                </span>
                <div
                  className={[
                    'w-8 h-4 rounded-full flex-shrink-0 transition-colors relative',
                    isOn ? 'bg-indigo-600' : 'bg-gray-300',
                    mod.alwaysOn ? 'opacity-60' : '',
                  ].join(' ')}
                >
                  <div
                    className={[
                      'absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform',
                      isOn ? 'translate-x-4' : 'translate-x-0.5',
                    ].join(' ')}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1 leading-tight">{mod.description}</p>
              {mod.alwaysOn && (
                <span className="absolute top-2 right-2 text-xs text-indigo-500 font-medium">
                  Required
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-2.5 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={handleNext}
          className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: Invite Team ─────────────────────────────────────────────────────

interface TeamMember {
  email: string;
  role: string;
}

function Step3({
  onNext,
  onBack,
  onSkip,
}: {
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  const data = getOnboardingData();
  const [members, setMembers] = useState<TeamMember[]>(
    data.teamMembers && data.teamMembers.length > 0
      ? data.teamMembers
      : [{ email: '', role: 'Employee' }],
  );
  const [errors, setErrors] = useState<string[]>([]);

  function addMember() {
    if (members.length >= 5) return;
    setMembers((prev) => [...prev, { email: '', role: 'Employee' }]);
  }

  function removeMember(idx: number) {
    setMembers((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateMember(idx: number, field: keyof TeamMember, value: string) {
    setMembers((prev) => prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m)));
  }

  function validate() {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const errs: string[] = [];
    for (const m of members) {
      if (m.email.trim() && !emailRegex.test(m.email.trim())) {
        errs.push(m.email);
      }
    }
    setErrors(errs);
    return errs.length === 0;
  }

  function handleNext() {
    if (!validate()) return;
    const filled = members.filter((m) => m.email.trim());
    saveOnboardingData({ teamMembers: filled });
    onNext();
  }

  const fieldClass =
    'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent';

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Invite your team</h2>
      <p className="text-sm text-gray-500 mb-6">
        Add up to 5 team members. They&apos;ll receive a magic-link invite email.
      </p>

      <div className="space-y-3">
        {members.map((member, idx) => (
          <div key={idx} className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
            <input
              type="email"
              value={member.email}
              onChange={(e) => updateMember(idx, 'email', e.target.value)}
              placeholder="colleague@company.com"
              className={`${fieldClass} flex-1 ${errors.includes(member.email) ? 'border-red-400' : ''}`}
            />
            <select
              value={member.role}
              onChange={(e) => updateMember(idx, 'role', e.target.value)}
              className={`${fieldClass} w-32`}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            {members.length > 1 && (
              <button
                type="button"
                onClick={() => removeMember(idx)}
                className="text-gray-400 hover:text-red-500 transition-colors p-1"
                aria-label="Remove"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      {errors.length > 0 && (
        <p className="text-xs text-red-500 mt-2">Please enter valid email addresses.</p>
      )}

      {members.length < 5 && (
        <button
          type="button"
          onClick={addMember}
          className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
        >
          + Add another
        </button>
      )}

      <div className="mt-8 flex justify-between items-center">
        <button
          onClick={onBack}
          className="px-6 py-2.5 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          ← Back
        </button>
        <div className="flex items-center gap-4">
          <button
            onClick={onSkip}
            className="text-sm text-gray-500 hover:text-gray-700 underline underline-offset-2"
          >
            Skip
          </button>
          <button
            onClick={handleNext}
            className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Step 4: AI Setup ────────────────────────────────────────────────────────

interface ProviderInfo {
  provider: string;
  isLocal: boolean;
  model: string;
}

function Step4({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const data = getOnboardingData();
  const [aiEnabled, setAiEnabled] = useState(data.aiEnabled !== false);
  const [aiActions, setAiActions] = useState(data.aiActionsEnabled !== false);
  const [providerInfo, setProviderInfo] = useState<ProviderInfo | null>(null);
  const [loadingProvider, setLoadingProvider] = useState(true);

  const fetchProvider = useCallback(async () => {
    try {
      const res = await fetch(`/api/veska/ai/provider-info`, {
        headers: { 'x-tenant-id': process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant' },
      });
      if (res.ok) {
        const json = (await res.json()) as ProviderInfo;
        setProviderInfo(json);
      }
    } catch {
      // ignore — provider info is non-critical
    } finally {
      setLoadingProvider(false);
    }
  }, []);

  useEffect(() => {
    void fetchProvider();
  }, [fetchProvider]);

  function handleNext() {
    saveOnboardingData({ aiEnabled, aiActionsEnabled: aiActions });
    onNext();
  }

  const providerLabel = providerInfo
    ? providerInfo.isLocal
      ? `Local (Ollama) — ${providerInfo.model}`
      : `Cloud (Anthropic) — ${providerInfo.model}`
    : null;

  const badgeColor = providerInfo?.isLocal
    ? 'bg-amber-100 text-amber-700 border-amber-200'
    : 'bg-green-100 text-green-700 border-green-200';

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-1">AI setup</h2>
      <p className="text-sm text-gray-500 mb-6">
        Your AI assistant can answer questions, draft invoices, analyse expenses, and help your team
        work faster.
      </p>

      {/* Provider info */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Current AI provider</span>
          {loadingProvider ? (
            <span className="text-xs text-gray-400">Loading…</span>
          ) : providerLabel ? (
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${badgeColor}`}>
              {providerLabel}
            </span>
          ) : (
            <span className="text-xs text-gray-400">Unavailable</span>
          )}
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200">
          <div>
            <p className="text-sm font-medium text-gray-900">Enable AI for all users</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Users can chat with the AI assistant and get suggestions.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAiEnabled((v) => !v)}
            className={[
              'w-12 h-6 rounded-full relative transition-colors',
              aiEnabled ? 'bg-indigo-600' : 'bg-gray-300',
            ].join(' ')}
          >
            <div
              className={[
                'absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform',
                aiEnabled ? 'translate-x-7' : 'translate-x-1',
              ].join(' ')}
            />
          </button>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200">
          <div>
            <p className="text-sm font-medium text-gray-900">Allow AI to take actions</p>
            <p className="text-xs text-gray-500 mt-0.5">
              AI can create records, update statuses, and perform tasks.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAiActions((v) => !v)}
            className={[
              'w-12 h-6 rounded-full relative transition-colors',
              aiActions ? 'bg-indigo-600' : 'bg-gray-300',
            ].join(' ')}
          >
            <div
              className={[
                'absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform',
                aiActions ? 'translate-x-7' : 'translate-x-1',
              ].join(' ')}
            />
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-4">
        You can configure AI permissions per role in{' '}
        <span className="text-gray-600">Settings → Roles</span>.
      </p>

      <div className="mt-8 flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-2.5 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={handleNext}
          className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

// ─── Confetti ────────────────────────────────────────────────────────────────

const CONFETTI_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#ef4444',
  '#f97316',
  '#14b8a6',
  '#a855f7',
  '#84cc16',
  '#06b6d4',
];

function Confetti() {
  const dots = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length] ?? '#6366f1',
    left: `${5 + ((i * 4.5) % 90)}%`,
    delay: `${(i * 0.15) % 1.5}s`,
    size: 8 + (i % 3) * 4,
    duration: `${1.5 + (i % 4) * 0.3}s`,
  }));

  return (
    <>
      <style>{`
        @keyframes confetti-rise {
          0%   { transform: translateY(60px) rotate(0deg); opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(-120px) rotate(${Math.random() > 0.5 ? '' : '-'}720deg); opacity: 0; }
        }
        .confetti-dot {
          position: absolute;
          border-radius: 2px;
          animation: confetti-rise var(--dur) ease-out var(--delay) infinite;
        }
      `}</style>
      <div className="relative h-20 overflow-hidden mb-4">
        {dots.map((dot) => (
          <div
            key={dot.id}
            className="confetti-dot"
            style={
              {
                left: dot.left,
                bottom: 0,
                width: dot.size,
                height: dot.size,
                backgroundColor: dot.color,
                '--delay': dot.delay,
                '--dur': dot.duration,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
    </>
  );
}

// ─── Step 5: Ready ───────────────────────────────────────────────────────────

function Step5({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const data = getOnboardingData();

  const moduleCount = data.modules?.length ?? 1;
  const memberCount = (data.teamMembers ?? []).filter((m) => m.email.trim()).length;
  const companyName = data.company?.name ?? 'your company';

  const submitOnboarding = useCallback(async () => {
    if (submitted || submitting) return;
    setSubmitting(true);
    try {
      await fetch(`/api/veska/setup/onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant',
        },
        body: JSON.stringify({
          company: data.company,
          modules: data.modules,
          teamMembers: data.teamMembers,
          aiEnabled: data.aiEnabled,
        }),
      });
    } catch {
      // fire-and-forget — don't block completion
    } finally {
      setSubmitting(false);
      setSubmitted(true);
      markOnboardingComplete();
    }
  }, [data, submitted, submitting]);

  useEffect(() => {
    void submitOnboarding();
  }, [submitOnboarding]);

  function handleDashboard() {
    router.push('/dashboard');
  }

  return (
    <div className="text-center">
      <Confetti />

      <div className="text-5xl mb-4">🎉</div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re ready!</h2>
      <p className="text-gray-500 mb-8">
        Veska is configured and ready to go. Here&apos;s what was set up:
      </p>

      <div className="bg-gray-50 rounded-xl border border-gray-100 p-6 text-left space-y-3 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 text-sm">
            🏢
          </div>
          <div>
            <p className="text-xs text-gray-500">Company</p>
            <p className="text-sm font-medium text-gray-900">{companyName}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 text-sm">
            📦
          </div>
          <div>
            <p className="text-xs text-gray-500">Modules enabled</p>
            <p className="text-sm font-medium text-gray-900">
              {moduleCount} module{moduleCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 text-sm">
            👥
          </div>
          <div>
            <p className="text-xs text-gray-500">Team members invited</p>
            <p className="text-sm font-medium text-gray-900">
              {memberCount > 0
                ? `${memberCount} invite${memberCount !== 1 ? 's' : ''} sent`
                : 'None — you can invite later'}
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={handleDashboard}
        disabled={submitting}
        className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors text-base disabled:opacity-60"
      >
        {submitting ? 'Finalising…' : 'Go to Dashboard →'}
      </button>

      <a
        href="/dashboard/ai"
        className="block mt-4 text-sm text-gray-500 hover:text-indigo-600 underline underline-offset-2 transition-colors"
      >
        Take a tour with the AI assistant
      </a>

      <div className="mt-4">
        <button onClick={onBack} className="text-xs text-gray-400 hover:text-gray-600">
          ← Back
        </button>
      </div>
    </div>
  );
}

// ─── Main Wizard ─────────────────────────────────────────────────────────────

export function OnboardingWizard({ step }: { step: number }) {
  const router = useRouter();
  const t = useTranslations('onboarding');

  function goTo(targetStep: number) {
    setOnboardingStep(targetStep);
    router.push(`/onboarding/step/${targetStep}` as any);
  }

  function next() {
    goTo(step + 1);
  }
  function back() {
    goTo(step - 1);
  }
  function skip() {
    goTo(step + 1);
  }

  // Update the progress bar width via DOM (layout is a server component)
  useEffect(() => {
    const bar = document.getElementById('onboarding-progress-bar');
    if (bar) {
      bar.style.width = `${(step / 5) * 100}%`;
    }
  }, [step]);

  return (
    <div className="flex items-start justify-center min-h-[calc(100vh-2rem)] px-4 sm:px-6 py-8 sm:py-12">
      <div className="w-full max-w-2xl">
        <div className="mb-6 text-center">
          <span className="text-xl font-bold text-indigo-600 tracking-tight">Veska</span>
          <p className="text-xs text-gray-400 mt-0.5">Setup wizard</p>
        </div>

        <StepIndicator
          current={step}
          labels={[t('step1'), t('step2'), t('step3'), t('step4'), t('step5')]}
        />

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-8">
          {step === 1 && <Step1 onNext={next} />}
          {step === 2 && <Step2 onNext={next} onBack={back} />}
          {step === 3 && <Step3 onNext={next} onBack={back} onSkip={skip} />}
          {step === 4 && <Step4 onNext={next} onBack={back} />}
          {step === 5 && <Step5 onBack={back} />}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">Step {step} of 5</p>
      </div>
    </div>
  );
}
