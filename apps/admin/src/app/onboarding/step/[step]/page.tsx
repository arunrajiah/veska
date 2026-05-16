import { notFound } from 'next/navigation';
import { OnboardingWizard } from './_components.js';

interface Props {
  params: Promise<{ step: string }>;
}

export default async function OnboardingStepPage({ params }: Props) {
  const { step } = await params;
  const stepNum = parseInt(step, 10);

  if (isNaN(stepNum) || stepNum < 1 || stepNum > 5) {
    notFound();
  }

  return <OnboardingWizard step={stepNum} />;
}
