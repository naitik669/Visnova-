import { sanitizePlainText, sanitizeText } from './security';

export const MONEY_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'] as const;
export const MONEY_TRANSACTION_TYPES = ['income', 'expense', 'transfer', 'saving'] as const;
export const MONEY_BILLING_CYCLES = ['weekly', 'monthly', 'quarterly', 'yearly', 'custom'] as const;
export const MONEY_GOAL_STATUSES = ['active', 'completed', 'paused', 'archived'] as const;
export const MONEY_PRIORITIES = ['low', 'medium', 'high'] as const;

const MAX_AMOUNT = 10000000;

const asAmount = (value: unknown, label: string) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT) {
    throw new Error(`${label} must be between 1 and 10,000,000.`);
  }
  return Math.round(amount * 100) / 100;
};

const asDate = (value: unknown, fallback?: string) => {
  const raw = sanitizeText(value || fallback || new Date().toISOString().slice(0, 10), 20);
  const date = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(date.getTime())) throw new Error('Use a valid date.');
  return raw.slice(0, 10);
};

const asOptionalDate = (value: unknown) => {
  if (!value) return null;
  return asDate(value);
};

const asCurrency = (value: unknown) => {
  const currency = sanitizeText(value || 'INR', 3).toUpperCase();
  return MONEY_CURRENCIES.includes(currency as any) ? currency : 'INR';
};

export function validateFinanceTransaction(payload: any) {
  const type = MONEY_TRANSACTION_TYPES.includes(payload?.type) ? payload.type : 'expense';
  const title = sanitizeText(payload?.title, 120);
  if (!title) throw new Error('Transaction title is required.');

  return {
    type,
    title,
    amount: asAmount(payload?.amount, 'Amount'),
    currency: asCurrency(payload?.currency),
    category: sanitizeText(payload?.category || 'Other', 50) || 'Other',
    note: sanitizePlainText(payload?.note || '', 500),
    transaction_date: asDate(payload?.transaction_date || payload?.transactionDate),
    payment_method: sanitizeText(payload?.payment_method || payload?.paymentMethod || '', 50) || null,
    linked_vision_id: payload?.linked_vision_id || payload?.linkedVisionId || null,
    linked_goal_id: payload?.linked_goal_id || payload?.linkedGoalId || null,
    is_recurring: !!(payload?.is_recurring || payload?.isRecurring)
  };
}

export function validateFinanceGoal(payload: any) {
  const title = sanitizeText(payload?.title, 120);
  if (!title) throw new Error('Goal title is required.');
  const targetAmount = asAmount(payload?.target_amount ?? payload?.targetAmount, 'Target amount');
  const currentAmount = Math.max(0, Math.min(Number(payload?.current_amount ?? payload?.currentAmount ?? 0) || 0, targetAmount));
  const priority = MONEY_PRIORITIES.includes(payload?.priority) ? payload.priority : 'medium';
  const status = MONEY_GOAL_STATUSES.includes(payload?.status) ? payload.status : 'active';

  return {
    title,
    target_amount: targetAmount,
    current_amount: Math.round(currentAmount * 100) / 100,
    currency: asCurrency(payload?.currency),
    deadline: asOptionalDate(payload?.deadline),
    linked_vision_id: payload?.linked_vision_id || payload?.linkedVisionId || null,
    priority,
    status
  };
}

export function validateFinanceSubscription(payload: any) {
  const name = sanitizeText(payload?.name, 120);
  if (!name) throw new Error('Subscription name is required.');
  const billingCycle = MONEY_BILLING_CYCLES.includes(payload?.billing_cycle || payload?.billingCycle)
    ? (payload?.billing_cycle || payload?.billingCycle)
    : 'monthly';

  return {
    name,
    amount: asAmount(payload?.amount, 'Subscription amount'),
    currency: asCurrency(payload?.currency),
    billing_cycle: billingCycle,
    next_billing_date: asOptionalDate(payload?.next_billing_date || payload?.nextBillingDate),
    category: sanitizeText(payload?.category || 'Subscriptions', 50) || 'Subscriptions',
    linked_vision_id: payload?.linked_vision_id || payload?.linkedVisionId || null,
    active: payload?.active !== false
  };
}

export function validateFinanceBudget(payload: any) {
  const now = new Date();
  const month = Number(payload?.month || now.getMonth() + 1);
  const year = Number(payload?.year || now.getFullYear());
  const category = sanitizeText(payload?.category, 50);
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error('Choose a valid month.');
  if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new Error('Choose a valid year.');
  if (!category) throw new Error('Budget category is required.');

  return {
    month,
    year,
    category,
    limit_amount: asAmount(payload?.limit_amount ?? payload?.limitAmount, 'Budget limit'),
    currency: asCurrency(payload?.currency)
  };
}

export function validateFinanceReview(payload: any) {
  const periodType = payload?.period_type === 'monthly' || payload?.periodType === 'monthly' ? 'monthly' : 'weekly';
  return {
    period_type: periodType,
    period_start: asDate(payload?.period_start || payload?.periodStart),
    period_end: asDate(payload?.period_end || payload?.periodEnd),
    income_total: Math.max(0, Number(payload?.income_total ?? payload?.incomeTotal ?? 0) || 0),
    expense_total: Math.max(0, Number(payload?.expense_total ?? payload?.expenseTotal ?? 0) || 0),
    savings_total: Math.max(0, Number(payload?.savings_total ?? payload?.savingsTotal ?? 0) || 0),
    reflection: sanitizePlainText(payload?.reflection || '', 2000),
    improvement: sanitizePlainText(payload?.improvement || '', 1000)
  };
}
