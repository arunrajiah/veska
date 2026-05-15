export type PlanId = 'free' | 'starter' | 'growth' | 'business' | 'enterprise';

export interface Plan {
  id: PlanId;
  name: string;
  monthlyPrice: number | null; // null = custom/contact sales
  annualPrice: number | null;
  limits: {
    seats: number | 'unlimited';
    storage: number | 'unlimited'; // GB
    apiCallsPerMonth: number | 'unlimited';
    customFields: number | 'unlimited';
    workflows: number | 'unlimited';
    integrations: number | 'unlimited';
    auditLogRetentionDays: number | 'unlimited';
    priceLists: number | 'unlimited';
    productVariants: number | 'unlimited';
    discountCodes: number | 'unlimited';
  };
  features: string[];
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    limits: {
      seats: 3,
      storage: 1,
      apiCallsPerMonth: 1_000,
      customFields: 5,
      workflows: 2,
      integrations: 2,
      auditLogRetentionDays: 7,
      priceLists: 1,
      productVariants: 0,
      discountCodes: 0,
    },
    features: [
      'Core CRM',
      'Basic Inventory',
      'Up to 3 seats',
      'Community support',
    ],
  },

  starter: {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 49,
    annualPrice: 39,
    limits: {
      seats: 10,
      storage: 10,
      apiCallsPerMonth: 50_000,
      customFields: 25,
      workflows: 10,
      integrations: 5,
      auditLogRetentionDays: 30,
      priceLists: 3,
      productVariants: 50,
      discountCodes: 5,
    },
    features: [
      'Everything in Free',
      'Full CRM',
      'Finance & Invoicing',
      'Email support',
      'Basic reporting',
    ],
  },

  growth: {
    id: 'growth',
    name: 'Growth',
    monthlyPrice: 149,
    annualPrice: 119,
    limits: {
      seats: 50,
      storage: 100,
      apiCallsPerMonth: 500_000,
      customFields: 100,
      workflows: 50,
      integrations: 20,
      auditLogRetentionDays: 90,
      priceLists: 10,
      productVariants: 500,
      discountCodes: 25,
    },
    features: [
      'Everything in Starter',
      'HR & Payroll',
      'Projects & Time tracking',
      'Knowledge Base & LMS',
      'Priority support',
      'Advanced analytics',
    ],
  },

  business: {
    id: 'business',
    name: 'Business',
    monthlyPrice: 399,
    annualPrice: 319,
    limits: {
      seats: 200,
      storage: 500,
      apiCallsPerMonth: 2_000_000,
      customFields: 'unlimited',
      workflows: 'unlimited',
      integrations: 'unlimited',
      auditLogRetentionDays: 365,
      priceLists: 50,
      productVariants: 'unlimited',
      discountCodes: 'unlimited',
    },
    features: [
      'Everything in Growth',
      'Advanced workflows & approvals',
      'SSO / SAML',
      'Custom roles & permissions',
      'Dedicated support',
      'Audit log (1 yr)',
    ],
  },

  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: null,
    annualPrice: null,
    limits: {
      seats: 'unlimited',
      storage: 'unlimited',
      apiCallsPerMonth: 'unlimited',
      customFields: 'unlimited',
      workflows: 'unlimited',
      integrations: 'unlimited',
      auditLogRetentionDays: 'unlimited',
      priceLists: 'unlimited',
      productVariants: 'unlimited',
      discountCodes: 'unlimited',
    },
    features: [
      'Everything in Business',
      'Unlimited seats',
      'Custom SLA',
      'On-premise / private cloud option',
      'Dedicated CSM',
      'Custom integrations',
    ],
  },
};

export function getPlan(id: PlanId): Plan {
  return PLANS[id];
}

export function getLimit<K extends keyof Plan['limits']>(
  planId: PlanId,
  key: K,
): Plan['limits'][K] {
  return PLANS[planId].limits[key];
}
