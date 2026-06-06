import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  Edit3,
  Loader2,
  PiggyBank,
  Plus,
  Target,
  Trash2,
  Wallet
} from 'lucide-react';
import { ResponsiveModal } from '../ui/ResponsiveModal';
import { SelectMenu } from '../ui/SelectMenu';
import { DatePicker } from '../ui/DatePicker';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';
import { FinanceBillingCycle, FinanceBudget, FinanceGoal, FinanceGoalPriority, FinanceGoalStatus, FinanceSubscription, FinanceTransaction, FinanceTransactionType } from '../../types';
import { CURRENCY_OPTIONS, convertCurrencyAmount, formatCurrency, normalizeCurrencyCode } from '../../lib/currency';

type MoneyTab = 'overview' | 'transactions' | 'goals' | 'subscriptions' | 'budgets' | 'review';
type MoneyModal = 'income' | 'expense' | 'goal' | 'subscription' | 'budget' | 'review' | null;

const tabs: { id: MoneyTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'goals', label: 'Resource Goals' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'budgets', label: 'Budgets' },
  { id: 'review', label: 'Review' },
];

const incomeCategories = ['Freelance', 'Salary', 'Allowance', 'Business', 'Client Work', 'Gift', 'Refund', 'Other'];
const expenseCategories = ['Food', 'Travel', 'Software', 'Education', 'Subscriptions', 'Equipment', 'Business', 'Entertainment', 'Shopping', 'Health', 'Other'];

const formString = (form: FormData, key: string, fallback = '') => {
  const value = form.get(key);
  return typeof value === 'string' ? value : fallback;
};

const formNullableString = (form: FormData, key: string) => {
  const value = formString(form, key);
  return value || null;
};

const formatMoney = formatCurrency;

const today = () => new Date().toISOString().slice(0, 10);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="space-y-2">
    <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary">{label}</span>
    {children}
  </label>
);

const inputClass = 'w-full h-12 rounded-2xl border border-card-border bg-card px-4 text-sm font-semibold text-text-main outline-none focus:border-accent';
const textareaClass = 'w-full min-h-24 rounded-2xl border border-card-border bg-card px-4 py-3 text-sm font-semibold text-text-main outline-none focus:border-accent resize-none';

function linkedVisionName(visions: ReturnType<typeof useStore.getState>['visions'], id?: string | null) {
  return visions.find(vision => vision.id === id)?.title || null;
}

export default function MoneyPage() {
  const {
    user,
    visions,
    financeTransactions,
    financeGoals,
    financeBudgets,
    financeSubscriptions,
    financeReviews,
    moneyOverview,
    isMoneyLoading,
    fetchMoneyOverview,
    createFinanceTransaction,
    updateFinanceTransaction,
    deleteFinanceTransaction,
    createFinanceGoal,
    updateFinanceGoal,
    deleteFinanceGoal,
    contributeToFinanceGoal,
    createFinanceSubscription,
    updateFinanceSubscription,
    deleteFinanceSubscription,
    createFinanceBudget,
    updateFinanceBudget,
    deleteFinanceBudget,
    createFinanceReview,
    updateUser,
    addToast
  } = useStore();

  const [activeTab, setActiveTab] = useState<MoneyTab>('overview');
  const [modal, setModal] = useState<MoneyModal>(null);
  const [editingTransaction, setEditingTransaction] = useState<FinanceTransaction | null>(null);
  const [editingGoal, setEditingGoal] = useState<FinanceGoal | null>(null);
  const [editingSubscription, setEditingSubscription] = useState<FinanceSubscription | null>(null);
  const [contributionGoal, setContributionGoal] = useState<FinanceGoal | null>(null);
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'income' | 'expense' | 'saving'>('all');
  const [isConvertingCurrency, setIsConvertingCurrency] = useState(false);

  useEffect(() => {
    fetchMoneyOverview();
  }, [fetchMoneyOverview]);

  const visibleTransactions = useMemo(() => {
    return financeTransactions.filter(transaction => transactionFilter === 'all' || transaction.type === transactionFilter);
  }, [financeTransactions, transactionFilter]);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const activeGoals = financeGoals.filter(goal => goal.status === 'active');
  const defaultCurrency = user.defaultCurrency || 'INR';
  const currencyRows = Object.entries(moneyOverview?.currencyBreakdown || {}).filter(([, totals]) => {
    return !!totals && (totals.income !== 0 || totals.expenses !== 0 || totals.savings !== 0 || totals.budgetLeft !== 0);
  });
  const activeSubscriptions = financeSubscriptions.filter(sub => sub.active);
  const monthlySubscriptionTotal = activeSubscriptions.reduce((sum, sub) => {
    const multiplier = sub.billingCycle === 'weekly' ? 4 : sub.billingCycle === 'yearly' ? 1 / 12 : sub.billingCycle === 'quarterly' ? 1 / 3 : 1;
    return sum + (convertCurrencyAmount(sub.amount, sub.currency, defaultCurrency) * multiplier);
  }, 0);

  const closeModal = () => {
    setModal(null);
    setEditingTransaction(null);
    setEditingGoal(null);
    setEditingSubscription(null);
    setContributionGoal(null);
  };

  const handleDefaultCurrencyChange = async (nextCurrencyValue: string) => {
    const nextCurrency = normalizeCurrencyCode(nextCurrencyValue);
    const currentCurrency = normalizeCurrencyCode(defaultCurrency);
    if (nextCurrency === currentCurrency || isConvertingCurrency) return;

    setIsConvertingCurrency(true);
    try {
      const updateResults: boolean[] = [];
      for (const transaction of financeTransactions) {
        updateResults.push(await updateFinanceTransaction(transaction.id, {
          amount: convertCurrencyAmount(transaction.amount, transaction.currency, nextCurrency),
          currency: nextCurrency
        }));
      }
      for (const goal of financeGoals) {
        updateResults.push(await updateFinanceGoal(goal.id, {
          targetAmount: convertCurrencyAmount(goal.targetAmount, goal.currency, nextCurrency),
          currentAmount: convertCurrencyAmount(goal.currentAmount, goal.currency, nextCurrency),
          currency: nextCurrency
        }));
      }
      for (const budget of financeBudgets) {
        updateResults.push(await updateFinanceBudget(budget.id, {
          limitAmount: convertCurrencyAmount(budget.limitAmount, budget.currency, nextCurrency),
          spentAmount: convertCurrencyAmount(budget.spentAmount, budget.currency, nextCurrency),
          currency: nextCurrency
        }));
      }
      for (const subscription of financeSubscriptions) {
        updateResults.push(await updateFinanceSubscription(subscription.id, {
          amount: convertCurrencyAmount(subscription.amount, subscription.currency, nextCurrency),
          currency: nextCurrency
        }));
      }
      await updateUser({ defaultCurrency: nextCurrency });
      await fetchMoneyOverview();
      if (updateResults.some(result => !result)) {
        addToast({
          type: 'error',
          title: 'Currency partially updated',
          description: 'Some resource goal rows could not be converted. Refresh and try again.'
        });
      }
    } finally {
      setIsConvertingCurrency(false);
    }
  };

  const handleTransactionSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      type: formString(form, 'type') as FinanceTransactionType,
      title: formString(form, 'title'),
      amount: Number(formString(form, 'amount', '0')),
      currency: normalizeCurrencyCode(formString(form, 'currency', 'INR')),
      category: formNullableString(form, 'category'),
      transactionDate: formString(form, 'transactionDate'),
      paymentMethod: formNullableString(form, 'paymentMethod'),
      note: formNullableString(form, 'note'),
      linkedVisionId: formNullableString(form, 'linkedVisionId'),
      linkedGoalId: formNullableString(form, 'linkedGoalId')
    };
    const ok = editingTransaction
      ? await updateFinanceTransaction(editingTransaction.id, payload)
      : await createFinanceTransaction(payload);
    if (ok) closeModal();
  };

  const handleGoalSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      title: formString(form, 'title'),
      targetAmount: Number(formString(form, 'targetAmount', '0')),
      currentAmount: Number(formString(form, 'currentAmount', '0')),
      currency: normalizeCurrencyCode(formString(form, 'currency', 'INR')),
      deadline: formNullableString(form, 'deadline'),
      linkedVisionId: formNullableString(form, 'linkedVisionId'),
      priority: (formString(form, 'priority', 'medium') as FinanceGoalPriority),
      status: (formString(form, 'status', 'active') as FinanceGoalStatus)
    };
    const ok = editingGoal
      ? await updateFinanceGoal(editingGoal.id, payload)
      : await createFinanceGoal(payload);
    if (ok) closeModal();
  };

  const handleContributionSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!contributionGoal) return;
    const form = new FormData(event.currentTarget);
    const ok = await contributeToFinanceGoal(contributionGoal.id, Number(form.get('amount') || 0), String(form.get('title') || ''));
    if (ok) closeModal();
  };

  const handleSubscriptionSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      name: formString(form, 'name'),
      amount: Number(formString(form, 'amount', '0')),
      currency: normalizeCurrencyCode(formString(form, 'currency', 'INR')),
      billingCycle: formString(form, 'billingCycle', 'monthly') as FinanceBillingCycle,
      nextBillingDate: formNullableString(form, 'nextBillingDate'),
      category: formNullableString(form, 'category'),
      linkedVisionId: formNullableString(form, 'linkedVisionId'),
      active: form.get('active') !== 'false'
    };
    const ok = editingSubscription
      ? await updateFinanceSubscription(editingSubscription.id, payload)
      : await createFinanceSubscription(payload);
    if (ok) closeModal();
  };

  const handleBudgetSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const ok = await createFinanceBudget({
      month: Number(form.get('month')),
      year: Number(form.get('year')),
      category: formString(form, 'category'),
      limitAmount: Number(formString(form, 'limitAmount', '0')),
      currency: normalizeCurrencyCode(formString(form, 'currency', 'INR'))
    });
    if (ok) closeModal();
  };

  const handleReviewSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const ok = await createFinanceReview({
      periodType: 'weekly',
      periodStart: formString(form, 'periodStart'),
      periodEnd: formString(form, 'periodEnd'),
      incomeTotal: moneyOverview?.monthIncome || 0,
      expenseTotal: moneyOverview?.monthExpenses || 0,
      savingsTotal: moneyOverview?.monthSavings || 0,
      reflection: formNullableString(form, 'reflection'),
      improvement: formNullableString(form, 'improvement')
    });
    if (ok) closeModal();
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:space-y-6 sm:pb-20">
      <section className="relative overflow-hidden rounded-[1.5rem] border border-card-border bg-card p-4 shadow-sm sm:rounded-[2rem] sm:p-7">
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-accent/5 blur-3xl translate-x-1/3 -translate-y-1/3 pointer-events-none" />
        <div className="relative z-10 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-accent">
              <Wallet size={14} />
              Private Wallet
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-text-main sm:text-5xl">Wallet</h1>
              <p className="mt-2 max-w-2xl text-sm font-medium text-text-secondary sm:text-base">
                Track the money or materials your Vision needs. Keep it simple: target, current amount, currency, and linked Vision.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
            <div className="relative z-[260] min-w-0 overflow-visible rounded-2xl border border-card-border bg-bg-base p-2 sm:min-w-56">
              <p className="px-2 pb-1 text-[9px] font-black uppercase tracking-widest text-text-secondary/60">Wallet Currency</p>
              <SelectMenu
                value={defaultCurrency}
                onChange={handleDefaultCurrencyChange}
                options={CURRENCY_OPTIONS}
                triggerClassName="h-10 rounded-xl bg-card"
                menuClassName="z-[360] sm:w-72"
              />
              {isConvertingCurrency && <p className="px-2 pt-1 text-[9px] font-black uppercase tracking-widest text-accent">Converting values...</p>}
            </div>
            <button onClick={() => setModal('goal')} className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-accent px-4 text-[11px] font-black uppercase tracking-widest text-accent-contrast">
              <Target size={16} /> Add Resource Goal
            </button>
            <button onClick={() => setModal('income')} className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-success px-4 text-[11px] font-black uppercase tracking-widest text-white">
              <Plus size={16} /> Add Income
            </button>
            <button onClick={() => setModal('expense')} className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-danger/10 px-4 text-[11px] font-black uppercase tracking-widest text-danger">
              <Plus size={16} /> Add Expense
            </button>
          </div>
        </div>
      </section>

      <div className="sticky top-0 z-20 -mx-1 flex gap-2 overflow-x-auto border-y border-card-border bg-app-container/95 px-1 py-2 backdrop-blur scrollbar-hide sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'h-10 shrink-0 rounded-2xl border px-4 text-[10px] font-black uppercase tracking-widest transition-all',
              activeTab === tab.id ? 'bg-accent text-accent-contrast border-accent' : 'bg-card border-card-border text-text-secondary hover:text-text-main'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <MetricCard icon={Target} label="Active Goals" value={String(moneyOverview?.activeGoals || 0)} tone="neutral" />
            <MetricCard icon={PiggyBank} label="Linked to Visions" value={String(activeGoals.filter(goal => !!goal.linkedVisionId).length)} tone="accent" />
          </div>
          {false && currencyRows.length > 1 && (
            <section className="rounded-[1.5rem] border border-card-border bg-card p-4 sm:rounded-[2rem] sm:p-5">
              <h2 className="text-lg font-black text-text-main">Currency breakdown</h2>
              <p className="mt-1 text-xs font-semibold text-text-secondary">Multiple currencies are shown separately. Totals only convert when you change the selected currency.</p>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {currencyRows.map(([currency, totals]) => (
                  <div key={currency} className="rounded-2xl border border-card-border bg-app-container p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-accent">{currency}</p>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs font-bold">
                      <span className="text-success">{formatMoney(totals?.income || 0, currency)}</span>
                      <span className="text-danger">{formatMoney(totals?.expenses || 0, currency)}</span>
                      <span className="text-text-main">{formatMoney(totals?.savings || 0, currency)}</span>
                    </div>
                    <div className="mt-1 grid grid-cols-3 gap-2 text-[8px] font-black uppercase tracking-widest text-text-secondary/45">
                      <span>Income</span>
                      <span>Spent</span>
                      <span>Saved</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
            <section className="rounded-[1.5rem] border border-card-border bg-card p-4 sm:rounded-[2rem] sm:p-5 lg:col-span-2">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-text-main">Vision resource goals</h2>
                  <p className="text-xs font-medium text-text-secondary">Target amount, current amount, currency, and linked Vision.</p>
                </div>
                <button onClick={() => setModal('goal')} className="h-10 px-3 rounded-xl bg-surface-muted text-text-secondary text-[10px] font-black uppercase tracking-widest">New Goal</button>
              </div>
              {activeGoals.length === 0 ? (
                <EmptyState icon={<PiggyBank size={24} />} title="No resource goals yet." description="Create one goal and link it to the Vision it supports." action="Create Goal" onClick={() => setModal('goal')} />
              ) : (
                <div className="space-y-3">
                  {activeGoals.slice(0, 4).map(goal => <GoalRow key={goal.id} goal={goal} visions={visions} onContribute={() => setContributionGoal(goal)} onEdit={() => { setEditingGoal(goal); setModal('goal'); }} onDelete={() => deleteFinanceGoal(goal.id)} />)}
                </div>
              )}
            </section>

            <section className="rounded-[1.5rem] border border-card-border bg-card p-4 sm:rounded-[2rem] sm:p-5">
              <h2 className="text-lg font-black text-text-main">Upcoming</h2>
              <p className="text-xs font-medium text-text-secondary mb-4">Subscriptions due soon.</p>
              {moneyOverview?.upcomingSubscriptions?.length ? (
                <div className="space-y-3">
                  {moneyOverview.upcomingSubscriptions.map(sub => <SubscriptionRow key={sub.id} subscription={sub} visions={visions} onEdit={() => { setEditingSubscription(sub); setModal('subscription'); }} onDelete={() => deleteFinanceSubscription(sub.id)} />)}
                </div>
              ) : (
                <EmptyState icon={<CreditCard size={24} />} title="No upcoming subscriptions." description="Add recurring payments before they surprise you." action="Add Subscription" onClick={() => setModal('subscription')} />
              )}
            </section>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <section className="rounded-[1.5rem] border border-card-border bg-card p-4 sm:rounded-[2rem] sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-xl font-black text-text-main">Transactions</h2>
              <p className="text-xs font-medium text-text-secondary">Income, expenses, and saving contributions.</p>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
              {(['all', 'income', 'expense', 'saving'] as const).map(filter => (
                <button key={filter} onClick={() => setTransactionFilter(filter)} className={cn('h-9 shrink-0 rounded-xl border px-3 text-[10px] font-black uppercase tracking-widest', transactionFilter === filter ? 'bg-accent text-accent-contrast border-accent' : 'bg-surface-muted border-card-border text-text-secondary')}>
                  {filter}
                </button>
              ))}
            </div>
          </div>
          {visibleTransactions.length === 0 ? (
            <EmptyState icon={<Wallet size={24} />} title="No transactions yet." description="Start by adding income, expense, or a saving contribution." action="Add Income" onClick={() => setModal('income')} />
          ) : (
            <div className="space-y-3">
              {visibleTransactions.map(transaction => (
                <TransactionRow key={transaction.id} transaction={transaction} visions={visions} goals={financeGoals} onEdit={() => { setEditingTransaction(transaction); setModal(transaction.type === 'income' ? 'income' : 'expense'); }} onDelete={() => deleteFinanceTransaction(transaction.id)} />
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'goals' && (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {financeGoals.length === 0 ? (
            <div className="md:col-span-2 xl:col-span-3"><EmptyState icon={<Target size={24} />} title="No saving goals yet." description="Create a savings goal and link it to a Vision." action="Create Goal" onClick={() => setModal('goal')} /></div>
          ) : financeGoals.map(goal => (
            <GoalCard key={goal.id} goal={goal} visions={visions} onContribute={() => setContributionGoal(goal)} onEdit={() => { setEditingGoal(goal); setModal('goal'); }} onDelete={() => deleteFinanceGoal(goal.id)} />
          ))}
        </section>
      )}

      {activeTab === 'subscriptions' && (
        <section className="rounded-[1.5rem] border border-card-border bg-card p-4 sm:rounded-[2rem] sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-xl font-black text-text-main">Subscriptions</h2>
              <p className="text-xs font-medium text-text-secondary">Estimated monthly total: {formatMoney(monthlySubscriptionTotal, defaultCurrency)}</p>
            </div>
            <button onClick={() => setModal('subscription')} className="h-11 rounded-2xl bg-accent px-4 text-[10px] font-black uppercase tracking-widest text-accent-contrast sm:h-10">Add Subscription</button>
          </div>
          <div className="space-y-3">
            {financeSubscriptions.length ? financeSubscriptions.map(sub => <SubscriptionRow key={sub.id} subscription={sub} visions={visions} onEdit={() => { setEditingSubscription(sub); setModal('subscription'); }} onDelete={() => deleteFinanceSubscription(sub.id)} />) : <EmptyState icon={<CreditCard size={24} />} title="No subscriptions tracked." description="Add recurring payments before they surprise you." action="Add Subscription" onClick={() => setModal('subscription')} />}
          </div>
        </section>
      )}

      {activeTab === 'budgets' && (
        <section className="rounded-[1.5rem] border border-card-border bg-card p-4 sm:rounded-[2rem] sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-xl font-black text-text-main">Budgets</h2>
              <p className="text-xs font-medium text-text-secondary">Simple category limits for this month.</p>
            </div>
            <button onClick={() => setModal('budget')} className="h-11 rounded-2xl bg-accent px-4 text-[10px] font-black uppercase tracking-widest text-accent-contrast sm:h-10">Add Budget</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {financeBudgets.length ? financeBudgets.map(budget => <BudgetCard key={budget.id} budget={budget} transactions={financeTransactions} onDelete={() => deleteFinanceBudget(budget.id)} />) : <div className="md:col-span-2 xl:col-span-3"><EmptyState icon={<Wallet size={24} />} title="No budgets set." description="Set limits for categories you want to control." action="Add Budget" onClick={() => setModal('budget')} /></div>}
          </div>
        </section>
      )}

      {activeTab === 'review' && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="rounded-[1.5rem] border border-card-border bg-card p-4 sm:rounded-[2rem] sm:p-5">
            <h2 className="text-xl font-black text-text-main">Weekly Wallet Review</h2>
            <p className="text-sm font-medium text-text-secondary mt-2">Reflect on what helped your Visions, what spending leaked value, and what you will improve next week.</p>
            <button onClick={() => setModal('review')} className="mt-5 h-11 w-full rounded-2xl bg-accent px-4 text-[10px] font-black uppercase tracking-widest text-accent-contrast sm:w-auto">Write Review</button>
          </div>
          <div className="rounded-[1.5rem] border border-card-border bg-card p-4 sm:rounded-[2rem] sm:p-5">
            <h3 className="text-lg font-black text-text-main mb-4">Recent Reviews</h3>
            {financeReviews.length ? financeReviews.slice(0, 5).map(review => (
              <div key={review.id} className="border-b border-card-border/60 py-3 last:border-b-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary">{review.periodStart} to {review.periodEnd}</p>
                <p className="text-sm font-semibold text-text-main mt-1 line-clamp-2">{review.improvement || review.reflection || 'Review saved.'}</p>
              </div>
            )) : <p className="text-sm font-semibold text-text-secondary">Reviews will appear here after you save one.</p>}
          </div>
        </section>
      )}

      {isMoneyLoading && (
        <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-card-border bg-card px-4 py-2 text-[10px] font-black uppercase tracking-widest text-text-secondary shadow-sm">
          <Loader2 size={13} className="animate-spin text-accent" />
          Refreshing Wallet...
        </div>
      )}

      <ResponsiveModal open={!!modal || !!contributionGoal} onClose={closeModal} title={modalTitle(modal, editingTransaction, editingGoal, editingSubscription, contributionGoal)} subtitle="Wallet is private by default." size="md">
        <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-6">
          {(modal === 'income' || modal === 'expense') && (
            <TransactionForm mode={modal} transaction={editingTransaction} visions={visions} goals={financeGoals} onSubmit={handleTransactionSubmit} />
          )}
          {modal === 'goal' && <GoalForm goal={editingGoal} visions={visions} onSubmit={handleGoalSubmit} />}
          {!!contributionGoal && <ContributionForm goal={contributionGoal} onSubmit={handleContributionSubmit} />}
          {modal === 'subscription' && <SubscriptionForm subscription={editingSubscription} visions={visions} onSubmit={handleSubscriptionSubmit} />}
          {modal === 'budget' && <BudgetForm month={currentMonth} year={currentYear} onSubmit={handleBudgetSubmit} />}
          {modal === 'review' && <ReviewForm onSubmit={handleReviewSubmit} />}
        </div>
      </ResponsiveModal>
    </div>
  );
}

function modalTitle(modal: MoneyModal, transaction: FinanceTransaction | null, goal: FinanceGoal | null, subscription: FinanceSubscription | null, contributionGoal: FinanceGoal | null) {
  if (contributionGoal) return `Add contribution to ${contributionGoal.title}`;
  if (transaction) return 'Edit transaction';
  if (goal) return 'Edit goal';
  if (subscription) return 'Edit subscription';
  if (modal === 'income') return 'Add Income';
  if (modal === 'expense') return 'Add Expense';
  if (modal === 'goal') return 'Add Resource Goal';
  if (modal === 'subscription') return 'Add Subscription';
  if (modal === 'budget') return 'Add Budget';
  if (modal === 'review') return 'Weekly Review';
  return 'Wallet';
}

function MetricCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: 'success' | 'danger' | 'accent' | 'neutral' }) {
  const toneClass = tone === 'success' ? 'text-success bg-success/10' : tone === 'danger' ? 'text-danger bg-danger/10' : tone === 'accent' ? 'text-accent bg-accent/10' : 'text-text-secondary bg-surface-muted';
  return (
    <div className="rounded-[1.35rem] border border-card-border bg-card p-4 sm:rounded-[2rem] sm:p-5">
      <div className={cn('mb-3 flex h-10 w-10 items-center justify-center rounded-2xl sm:mb-4 sm:h-11 sm:w-11', toneClass)}><Icon size={19} /></div>
      <p className="text-[9px] font-black uppercase tracking-widest text-text-secondary sm:text-[10px]">{label}</p>
      <p className="mt-1 break-words text-xl font-black text-text-main sm:text-2xl">{value}</p>
    </div>
  );
}

function EmptyState({ icon, title, description, action, onClick }: { icon?: React.ReactNode; title: string; description: string; action: string; onClick: () => void }) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-[2rem] border border-dashed border-card-border bg-surface-muted/40 p-6 text-center">
      {icon && <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">{icon}</div>}
      <p className="text-base font-black text-text-main">{title}</p>
      <p className="mt-2 max-w-xs text-sm font-semibold leading-6 text-text-secondary/70">{description}</p>
      <button onClick={onClick} className="mt-5 flex h-12 w-full max-w-xs items-center justify-center rounded-2xl bg-accent px-4 text-[10px] font-black uppercase tracking-widest text-accent-contrast">{action}</button>
    </div>
  );
}

function TransactionRow({ transaction, visions, goals, onEdit, onDelete }: { transaction: FinanceTransaction; visions: any[]; goals: FinanceGoal[]; onEdit: () => void; onDelete: () => void }) {
  const isPositive = transaction.type === 'income';
  const isSaving = transaction.type === 'saving';
  const visionName = linkedVisionName(visions, transaction.linkedVisionId);
  const goalName = goals.find(goal => goal.id === transaction.linkedGoalId)?.title;
  return (
    <div className="grid grid-cols-[auto_1fr] gap-3 rounded-2xl border border-card-border bg-app-container p-3 sm:flex sm:items-center">
      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl', isPositive ? 'bg-success/10 text-success' : isSaving ? 'bg-accent/10 text-accent' : 'bg-danger/10 text-danger')}>
        {isPositive ? <ArrowUpRight size={18} /> : isSaving ? <PiggyBank size={18} /> : <ArrowDownLeft size={18} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-text-main truncate">{transaction.title}</p>
        <p className="text-[11px] font-semibold text-text-secondary truncate">{transaction.category || 'Other'} - {visionName || goalName || 'No Vision linked'} - {transaction.transactionDate}</p>
      </div>
      <p className={cn('col-start-2 text-sm font-black tabular-nums sm:col-auto', isPositive ? 'text-success' : isSaving ? 'text-accent' : 'text-danger')}>
        {isPositive ? '+' : '-'}{formatMoney(transaction.amount, transaction.currency)}
      </p>
      <div className="col-span-2 sm:col-auto"><RowActions onEdit={onEdit} onDelete={onDelete} /></div>
    </div>
  );
}

function GoalRow({ goal, visions, onContribute, onEdit, onDelete }: { goal: FinanceGoal; visions: any[]; onContribute: () => void; onEdit: () => void; onDelete: () => void }) {
  const progress = Math.min(100, Math.round((goal.currentAmount / Math.max(1, goal.targetAmount)) * 100));
  return (
    <div className="rounded-2xl border border-card-border bg-app-container p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-black text-text-main truncate">{goal.title}</p>
          <p className="text-[11px] font-semibold text-text-secondary truncate">{linkedVisionName(visions, goal.linkedVisionId) || 'No Vision linked'}</p>
        </div>
        <span className="text-[10px] font-black text-accent">{progress}%</span>
      </div>
      <div className="mt-3 h-2 rounded-full bg-surface-muted overflow-hidden"><div className="h-full rounded-full bg-accent" style={{ width: `${progress}%` }} /></div>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-bold text-text-main">{formatMoney(goal.currentAmount, goal.currency)} / {formatMoney(goal.targetAmount, goal.currency)}</p>
        <div className="flex gap-2">
          <button onClick={onContribute} className="h-8 px-3 rounded-xl bg-accent text-accent-contrast text-[9px] font-black uppercase tracking-widest">Add</button>
          <RowActions onEdit={onEdit} onDelete={onDelete} compact />
        </div>
      </div>
    </div>
  );
}

function GoalCard(props: Parameters<typeof GoalRow>[0]) {
  return <GoalRow {...props} />;
}

function SubscriptionRow({ subscription, visions, onEdit, onDelete }: { subscription: FinanceSubscription; visions: any[]; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-3 rounded-2xl border border-card-border bg-app-container p-3 sm:flex sm:items-center">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-warning/10 text-warning"><CreditCard size={18} /></div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-text-main truncate">{subscription.name}</p>
        <p className="text-[11px] font-semibold text-text-secondary truncate">{subscription.billingCycle} - {subscription.nextBillingDate || 'No date'} - {linkedVisionName(visions, subscription.linkedVisionId) || 'No Vision linked'}</p>
      </div>
      <p className="col-start-2 text-sm font-black text-text-main sm:col-auto">{formatMoney(subscription.amount, subscription.currency)}</p>
      <div className="col-span-2 sm:col-auto"><RowActions onEdit={onEdit} onDelete={onDelete} /></div>
    </div>
  );
}

function BudgetCard({ budget, transactions, onDelete }: { budget: FinanceBudget; transactions: FinanceTransaction[]; onDelete: () => void }) {
  const spent = transactions.filter(t => t.type === 'expense' && t.category === budget.category && new Date(`${t.transactionDate}T00:00:00`).getMonth() + 1 === budget.month && new Date(`${t.transactionDate}T00:00:00`).getFullYear() === budget.year).reduce((sum, t) => sum + t.amount, 0);
  const progress = Math.min(100, Math.round((spent / Math.max(1, budget.limitAmount)) * 100));
  const over = spent > budget.limitAmount;
  return (
    <div className="rounded-[2rem] border border-card-border bg-app-container p-5">
      <div className="flex justify-between gap-3">
        <div>
          <p className="text-sm font-black text-text-main">{budget.category}</p>
          <p className="text-[11px] font-semibold text-text-secondary">{budget.month}/{budget.year}</p>
        </div>
        <button onClick={onDelete} className="w-9 h-9 rounded-xl bg-danger/10 text-danger flex items-center justify-center"><Trash2 size={15} /></button>
      </div>
      <p className="mt-4 text-lg font-black text-text-main">{formatMoney(spent, budget.currency)} / {formatMoney(budget.limitAmount, budget.currency)}</p>
      <div className="mt-3 h-2 rounded-full bg-surface-muted overflow-hidden"><div className={cn('h-full rounded-full', over ? 'bg-danger' : 'bg-accent')} style={{ width: `${progress}%` }} /></div>
      <p className={cn('mt-2 text-[11px] font-bold', over ? 'text-danger' : 'text-text-secondary')}>{over ? `${formatMoney(spent - budget.limitAmount, budget.currency)} over` : `${formatMoney(budget.limitAmount - spent, budget.currency)} left`}</p>
    </div>
  );
}

function RowActions({ onEdit, onDelete, compact }: { onEdit: () => void; onDelete: () => void; compact?: boolean }) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button aria-label="Edit" onClick={onEdit} className={cn('flex items-center justify-center rounded-xl bg-surface-muted text-text-secondary', compact ? 'h-8 w-8' : 'h-10 w-10 sm:h-9 sm:w-9')}><Edit3 size={14} /></button>
      <button aria-label="Delete" onClick={onDelete} className={cn('flex items-center justify-center rounded-xl bg-danger/10 text-danger', compact ? 'h-8 w-8' : 'h-10 w-10 sm:h-9 sm:w-9')}><Trash2 size={14} /></button>
    </div>
  );
}

function TransactionForm({ mode, transaction, visions, goals, onSubmit }: { mode: 'income' | 'expense'; transaction: FinanceTransaction | null; visions: any[]; goals: FinanceGoal[]; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const type = transaction?.type || mode;
  const categories = type === 'income' ? incomeCategories : expenseCategories;
  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <input type="hidden" name="type" value={type} />
      <Field label="Title"><input name="title" defaultValue={transaction?.title || ''} className={inputClass} required /></Field>
      <Field label="Amount"><input name="amount" type="number" min="1" step="0.01" defaultValue={transaction?.amount || ''} className={inputClass} required /></Field>
      <Field label="Currency"><CurrencySelect defaultValue={transaction?.currency || 'INR'} /></Field>
      <Field label="Category"><FormSelect name="category" defaultValue={transaction?.category || categories[0]} options={categories.map(c => ({ value: c, label: c }))} /></Field>
      <Field label="Date"><DatePicker name="transactionDate" defaultValue={transaction?.transactionDate || today()} /></Field>
      <Field label="Payment Method"><input name="paymentMethod" defaultValue={transaction?.paymentMethod || ''} className={inputClass} placeholder="UPI, card, cash..." /></Field>
      <Field label="Linked Vision"><VisionSelect name="linkedVisionId" visions={visions} defaultValue={transaction?.linkedVisionId || ''} /></Field>
      <Field label="Linked Goal"><FormSelect name="linkedGoalId" defaultValue={transaction?.linkedGoalId || ''} options={[{ value: '', label: 'No goal' }, ...goals.map(goal => ({ value: goal.id, label: goal.title }))]} /></Field>
      <div className="sm:col-span-2"><Field label="Note"><textarea name="note" defaultValue={transaction?.note || ''} className={textareaClass} /></Field></div>
      <button className="h-12 rounded-2xl bg-accent text-[11px] font-black uppercase tracking-widest text-accent-contrast sm:col-span-2">Save Transaction</button>
    </form>
  );
}

function GoalForm({ goal, visions, onSubmit }: { goal: FinanceGoal | null; visions: any[]; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label="Goal Title"><input name="title" defaultValue={goal?.title || ''} className={inputClass} required /></Field>
      <Field label="Target Amount"><input name="targetAmount" type="number" min="1" step="0.01" defaultValue={goal?.targetAmount || ''} className={inputClass} required /></Field>
      <Field label="Current Amount"><input name="currentAmount" type="number" min="0" step="0.01" defaultValue={goal?.currentAmount || 0} className={inputClass} /></Field>
      <Field label="Currency"><CurrencySelect defaultValue={goal?.currency || 'INR'} /></Field>
      <Field label="Deadline"><DatePicker name="deadline" defaultValue={goal?.deadline || ''} placeholder="No deadline" /></Field>
      <Field label="Priority"><FormSelect name="priority" defaultValue={goal?.priority || 'medium'} options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]} /></Field>
      <Field label="Status"><FormSelect name="status" defaultValue={goal?.status || 'active'} options={[{ value: 'active', label: 'Active' }, { value: 'paused', label: 'Paused' }, { value: 'completed', label: 'Completed' }, { value: 'archived', label: 'Archived' }]} /></Field>
      <div className="sm:col-span-2"><Field label="Linked Vision"><VisionSelect name="linkedVisionId" visions={visions} defaultValue={goal?.linkedVisionId || ''} /></Field></div>
      <button className="h-12 rounded-2xl bg-accent text-[11px] font-black uppercase tracking-widest text-accent-contrast sm:col-span-2">Save Goal</button>
    </form>
  );
}

function ContributionForm({ goal, onSubmit }: { goal: FinanceGoal; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Contribution Title"><input name="title" defaultValue={`Contribution to ${goal.title}`} className={inputClass} /></Field>
      <Field label="Amount"><input name="amount" type="number" min="1" step="0.01" className={inputClass} required /></Field>
      <button className="h-12 w-full rounded-2xl bg-accent text-[11px] font-black uppercase tracking-widest text-accent-contrast">Add Contribution</button>
    </form>
  );
}

function SubscriptionForm({ subscription, visions, onSubmit }: { subscription: FinanceSubscription | null; visions: any[]; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label="Name"><input name="name" defaultValue={subscription?.name || ''} className={inputClass} required /></Field>
      <Field label="Amount"><input name="amount" type="number" min="1" step="0.01" defaultValue={subscription?.amount || ''} className={inputClass} required /></Field>
      <Field label="Currency"><CurrencySelect defaultValue={subscription?.currency || 'INR'} /></Field>
      <Field label="Billing Cycle"><FormSelect name="billingCycle" defaultValue={subscription?.billingCycle || 'monthly'} options={[{ value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }, { value: 'quarterly', label: 'Quarterly' }, { value: 'yearly', label: 'Yearly' }, { value: 'custom', label: 'Custom' }]} /></Field>
      <Field label="Next Billing"><DatePicker name="nextBillingDate" defaultValue={subscription?.nextBillingDate || ''} placeholder="Select billing date" /></Field>
      <Field label="Category"><input name="category" defaultValue={subscription?.category || 'Subscriptions'} className={inputClass} /></Field>
      <Field label="Status"><FormSelect name="active" defaultValue={subscription?.active === false ? 'false' : 'true'} options={[{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }]} /></Field>
      <div className="sm:col-span-2"><Field label="Linked Vision"><VisionSelect name="linkedVisionId" visions={visions} defaultValue={subscription?.linkedVisionId || ''} /></Field></div>
      <button className="h-12 rounded-2xl bg-accent text-[11px] font-black uppercase tracking-widest text-accent-contrast sm:col-span-2">Save Subscription</button>
    </form>
  );
}

function BudgetForm({ month, year, onSubmit }: { month: number; year: number; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label="Category"><FormSelect name="category" defaultValue={expenseCategories[0]} options={expenseCategories.map(c => ({ value: c, label: c }))} /></Field>
      <Field label="Limit"><input name="limitAmount" type="number" min="1" step="0.01" className={inputClass} required /></Field>
      <Field label="Currency"><CurrencySelect /></Field>
      <Field label="Month"><input name="month" type="number" min="1" max="12" defaultValue={month} className={inputClass} /></Field>
      <Field label="Year"><input name="year" type="number" min="2000" max="2100" defaultValue={year} className={inputClass} /></Field>
      <button className="h-12 rounded-2xl bg-accent text-[11px] font-black uppercase tracking-widest text-accent-contrast sm:col-span-2">Save Budget</button>
    </form>
  );
}

function ReviewForm({ onSubmit }: { onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Period Start"><DatePicker name="periodStart" defaultValue={start.toISOString().slice(0, 10)} /></Field>
        <Field label="Period End"><DatePicker name="periodEnd" defaultValue={end.toISOString().slice(0, 10)} /></Field>
      </div>
      <Field label="What spending helped your Visions?"><textarea name="reflection" className={textareaClass} /></Field>
      <Field label="What money habit will you improve next week?"><textarea name="improvement" className={textareaClass} /></Field>
      <button className="h-12 w-full rounded-2xl bg-accent text-[11px] font-black uppercase tracking-widest text-accent-contrast">Save Review</button>
    </form>
  );
}

function VisionSelect({ name, visions, defaultValue }: { name: string; visions: any[]; defaultValue?: string }) {
  return <FormSelect name={name} defaultValue={defaultValue || ''} options={[{ value: '', label: 'No Vision linked' }, ...visions.map(vision => ({ value: vision.id, label: vision.title }))]} />;
}

function CurrencySelect({ defaultValue = 'INR' }: { defaultValue?: string }) {
  return <FormSelect name="currency" defaultValue={defaultValue} options={CURRENCY_OPTIONS} />;
}

function FormSelect({ name, defaultValue = '', options }: { name: string; defaultValue?: string; options: Array<{ value: string; label: string }> }) {
  const [value, setValue] = useState(defaultValue);

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <SelectMenu value={value} onChange={setValue} options={options} />
    </>
  );
}
