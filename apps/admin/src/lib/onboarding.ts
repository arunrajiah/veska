'use client';

const STORAGE_KEY = 'veska_onboarding';
const DATA_KEY = 'veska_onboarding_data';

interface OnboardingProgress {
  completed: boolean;
  currentStep: number;
}

export function getOnboardingProgress(): OnboardingProgress {
  if (typeof window === 'undefined') {
    return { completed: false, currentStep: 1 };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { completed: false, currentStep: 1 };
    const parsed = JSON.parse(raw) as Partial<OnboardingProgress>;
    return {
      completed: parsed.completed ?? false,
      currentStep: parsed.currentStep ?? 1,
    };
  } catch {
    return { completed: false, currentStep: 1 };
  }
}

export function setOnboardingStep(step: number): void {
  if (typeof window === 'undefined') return;
  const current = getOnboardingProgress();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, currentStep: step }));
}

export function markOnboardingComplete(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ completed: true, currentStep: 5 }));
  document.cookie = 'veska_onboarding_done=1; path=/; max-age=31536000';
}

export interface OnboardingData {
  company?: {
    name: string;
    industry: string;
    country: string;
    currency: string;
    size: string;
  };
  modules?: string[];
  teamMembers?: Array<{ email: string; role: string }>;
  aiEnabled?: boolean;
  aiActionsEnabled?: boolean;
}

export function getOnboardingData(): OnboardingData {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(DATA_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as OnboardingData;
  } catch {
    return {};
  }
}

export function saveOnboardingData(data: Partial<OnboardingData>): void {
  if (typeof window === 'undefined') return;
  const current = getOnboardingData();
  localStorage.setItem(DATA_KEY, JSON.stringify({ ...current, ...data }));
}
