import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  Edit3,
  PiggyBank,
  Plus,
  Target,
  Trash2,
  Wallet
} from 'lucide-react';
import { ResponsiveModal } from '../ui/ResponsiveModal';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';
import { FinanceBillingCycle, FinanceBudget, FinanceGoal, FinanceGoalPriority, FinanceGoalStatus, FinanceSubscription, FinanceTransaction, FinanceTransactionType } from '../../types';

type MoneyTab = 'overview' | 'transactions' | 'goals' | 'subscriptions' | 'budgets' | 'review';
type MoneyModal = 'income' | 'expense' | 'goal' | 'subscription' | 'budget' | 'review' | null;

const tabs: { id: MoneyTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'goals', label: 'Goals' },
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

const formatMoney = (amount: number, currency = 'INR') => {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount || 0);
  } catch {
    return `${currency} ${Math.round(amount || 0).toLocaleString('en-IN')}`;
  }
};

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
    deleteFinanceBudget,
    createFinanceReview
  } = useStore();

  const [activeTab, setActiveTab] = useState<MoneyTab>('overview');
  const [modal, setModal] = useState<MoneyModal>(null);
  const [editingTransaction, setEditingTransaction] = useState<FinanceTransaction | null>(null);
  const [editingGoal, setEditingGoal] = useState<FinanceGoal | null>(null);
  const [editingSubscription, setEditingSubscription] = useState<FinanceSubscription | null>(null);
  const [contributionGoal, setContributionGoal] = useState<FinanceGoal | null>(null);
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'income' | 'expense' | 'saving'>('all');

  useEffect(() => {
    fetchMoneyOverview();
  }, [fetchMoneyOverview]);

  const visibleTransactions = useMemo(() => {
    return financeTransactions.filter(transaction => transactionFilter === 'all' || transaction.type === transactionFilter);
  }, [financeTransactions, transactionFilter]);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const activeGoals = financeGoals.filter(goal => goal.status === 'active');
  const activeSubscriptions = financeSubscriptions.filter(sub => sub.active);
  const monthlySubscriptionTotal = activeSubscriptions.reduce((sum, sub) => {
    const multiplier = sub.billingCycle === 'weekly' ? 4 : sub.billingCycle === 'yearly' ? 1 / 12 : sub.billingCycle === 'quarterly' ? 1 / 3 : 1;
    return sum + (sub.amount * multiplier);
  }, 0);

  const closeModal = () => {
    setModal(null);
    setEditingTransaction(null);
    setEditingGoal(null);
    setEditingSubscription(null);
    setContributionGoal(null);
  };

  const handleTransactionSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      type: formString(form, 'type') as FinanceTransactionType,
      title: formString(form, 'title'),
      amount: Number(formString(form, 'amount', '0')),
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
      limitAmount: Number(formString(form, 'limitAmount', '0'))
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
    <div className="w-full max-w-[1400px] mx-auto space-y-6 pb-20">
      <section className="rounded-[2rem] bg-card border border-card-border p-5 sm:p-7 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-accent/5 blur-3xl translate-x-1/3 -translate-y-1/3 pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-accent">
              <Wallet size={14} />
              Private Wallet
            </div>
            <div>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-text-main">Wallet</h1>
              <p className="mt-2 max-w-2xl text-sm sm:text-base font-medium text-text-secondary">
                Track spending, subscriptions, and savings connected to your Visions.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setModal('income')} className="h-11 px-4 rounded-2xl bg-success text-white text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
              <Plus size={16} /> Add Income
            </button>
            <button onClick={() => setModal('expense')} className="h-11 px-4 rounded-2xl bg-danger/10 text-danger text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
              <Plus size={16} /> Add Expense
            </button>
            <button onClick={() => setModal('goal')} className="h-11 px-4 rounded-2xl bg-accent text-accent-contrast text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
              <Target size={16} /> Add Goal
            </button>
          </div>
        </div>
      </section>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'shrink-0 h-10 px-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all',
              activeTab === tab.id ? 'bg-accent text-accent-contrast border-accent' : 'bg-card border-card-border text-text-secondary hover:text-text-main'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <MetricCard icon={ArrowUpRight} label="This Month Income" value={formatMoney(moneyOverview?.monthIncome || 0)} tone="success" />
            <MetricCard icon={ArrowDownLeft} label="This Month Expenses" value={formatMoney(moneyOverview?.monthExpenses || 0)} tone="danger" />
            <MetricCard icon={PiggyBank} label="Saved This Month" value={formatMoney(moneyOverview?.monthSavings || 0)} tone="accent" />
            <MetricCard icon={Target} label="Active Goals" value={String(moneyOverview?.activeGoals || 0)} tone="neutral" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <section className="lg:col-span-2 rounded-[2rem] bg-card border border-card-border p-5">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-lg font-black text-text-main">Vision funding</h2>
                  <p className="text-xs font-medium text-text-secondary">Saving goals linked to your long-term work.</p>
                </div>
                <button onClick={() => setModal('goal')} className="h-10 px-3 rounded-xl bg-surface-muted text-text-secondary text-[10px] font-black uppercase tracking-widest">New Goal</button>
              </div>
              {activeGoals.length === 0 ? (
                <EmptyState title="No saving goals yet." description="Create a savings goal and link it to a Vision." action="Create Goal" onClick={() => setModal('goal')} />
              ) : (
                <div className="space-y-3">
                  {activeGoals.slice(0, 4).map(goal => <GoalRow key={goal.id} goal={goal} visions={visions} onContribute={() => setContributionGoal(goal)} onEdit={() => { setEditingGoal(goal); setModal('goal'); }} onDelete={() => deleteFinanceGoal(goal.id)} />)}
                </div>
              )}
            </section>

            <section className="rounded-[2rem] bg-card border border-card-border p-5">
              <h2 className="text-lg font-black text-text-main">Upcoming</h2>
              <p className="text-xs font-medium text-text-secondary mb-4">Subscriptions due soon.</p>
              {moneyOverview?.upcomingSubscriptions?.length ? (
                <div className="space-y-3">
                  {moneyOverview.upcomingSubscriptions.map(sub => <SubscriptionRow key={sub.id} subscription={sub} visions={visions} onEdit={() => { setEditingSubscription(sub); setModal('subscription'); }} onDelete={() => deleteFinanceSubscription(sub.id)} />)}
                </div>
              ) : (
                <EmptyState title="No upcoming subscriptions." description="Add recurring payments before they surprise you." action="Add Subscription" onClick={() => setModal('subscription')} />
              )}
            </section>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <section className="rounded-[2rem] bg-card border border-card-border p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-xl font-black text-text-main">Transactions</h2>
              <p className="text-xs font-medium text-text-secondary">Income, expenses, and saving contributions.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['all', 'income', 'expense', 'saving'] as const).map(filter => (
                <button key={filter} onClick={() => setTransactionFilter(filter)} className={cn('h-9 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest border', transactionFilter === filter ? 'bg-accent text-accent-contrast border-accent' : 'bg-surface-muted border-card-border text-text-secondary')}>
                  {filter}
                </button>
              ))}
            </div>
          </div>
          {visibleTransactions.length === 0 ? (
            <EmptyState title="No transactions yet." description="Start by adding income, expense, or a saving contribution." action="Add Income" onClick={() => setModal('income')} />
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
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {financeGoals.length === 0 ? (
            <div className="md:col-span-2 xl:col-span-3"><EmptyState title="No saving goals yet." description="Create a savings goal and link it to a Vision." action="Create Goal" onClick={() => setModal('goal')} /></div>
          ) : financeGoals.map(goal => (
            <GoalCard key={goal.id} goal={goal} visions={visions} onContribute={() => setContributionGoal(goal)} onEdit={() => { setEditingGoal(goal); setModal('goal'); }} onDelete={() => deleteFinanceGoal(goal.id)} />
          ))}
        </section>
      )}

      {activeTab === 'subscriptions' && (
        <section className="rounded-[2rem] bg-card border border-card-border p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-xl font-black text-text-main">Subscriptions</h2>
              <p className="text-xs font-medium text-text-secondary">Estimated monthly total: {formatMoney(monthlySubscriptionTotal)}</p>
            </div>
            <button onClick={() => setModal('subscription')} className="h-10 px-4 rounded-2xl bg-accent text-accent-contrast text-[10px] font-black uppercase tracking-widest">Add Subscription</button>
          </div>
          <div className="space-y-3">
            {financeSubscriptions.length ? financeSubscriptions.map(sub => <SubscriptionRow key={sub.id} subscription={sub} visions={visions} onEdit={() => { setEditingSubscription(sub); setModal('subscription'); }} onDelete={() => deleteFinanceSubscription(sub.id)} />) : <EmptyState title="No subscriptions tracked." description="Add recurring payments before they surprise you." action="Add Subscription" onClick={() => setModal('subscription')} />}
          </div>
        </section>
      )}

      {activeTab === 'budgets' && (
        <section className="rounded-[2rem] bg-card border border-card-border p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-xl font-black text-text-main">Budgets</h2>
              <p className="text-xs font-medium text-text-secondary">Simple category limits for this month.</p>
            </div>
            <button onClick={() => setModal('budget')} className="h-10 px-4 rounded-2xl bg-accent text-accent-contrast text-[10px] font-black uppercase tracking-widest">Add Budget</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {financeBudgets.length ? financeBudgets.map(budget => <BudgetCard key={budget.id} budget={budget} transactions={financeTransactions} onDelete={() => deleteFinanceBudget(budget.id)} />) : <div className="md:col-span-2 xl:col-span-3"><EmptyState title="No budgets set." description="Set limits for categories you want to control." action="Add Budget" onClick={() => setModal('budget')} /></div>}
          </div>
        </section>
      )}

      {activeTab === 'review' && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="rounded-[2rem] bg-card border border-card-border p-5">
            <h2 className="text-xl font-black text-text-main">Weekly Wallet Review</h2>
            <p className="text-sm font-medium text-text-secondary mt-2">Reflect on what helped your Visions, what spending leaked value, and what you will improve next week.</p>
            <button onClick={() => setModal('review')} className="mt-5 h-11 px-4 rounded-2xl bg-accent text-accent-contrast text-[10px] font-black uppercase tracking-widest">Write Review</button>
          </div>
          <div className="rounded-[2rem] bg-card border border-card-border p-5">
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

      {isMoneyLoading && <p className="text-center text-[10px] font-black uppercase tracking-widest text-text-secondary">Refreshing Wallet...</p>}

      <ResponsiveModal open={!!modal || !!contributionGoal} onClose={closeModal} title={modalTitle(modal, editingTransaction, editingGoal, editingSubscription, contributionGoal)} subtitle="Wallet is private by default." size="md">
        <div className="p-4 sm:p-6">
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
  if (modal === 'goal') return 'Add Saving Goal';
  if (modal === 'subscription') return 'Add Subscription';
  if (modal === 'budget') return 'Add Budget';
  if (modal === 'review') return 'Weekly Review';
  return 'Wallet';
}

function MetricCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: 'success' | 'danger' | 'accent' | 'neutral' }) {
  const toneClass = tone === 'success' ? 'text-success bg-success/10' : tone === 'danger' ? 'text-danger bg-danger/10' : tone === 'accent' ? 'text-accent bg-accent/10' : 'text-text-secondary bg-surface-muted';
  return (
    <div className="rounded-[2rem] bg-card border border-card-border p-5">
      <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center mb-4', toneClass)}><Icon size={19} /></div>
      <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary">{label}</p>
      <p className="mt-1 text-2xl font-black text-text-main">{value}</p>
    </div>
  );
}

function EmptyState({ title, description, action, onClick }: { title: string; description: string; action: string; onClick: () => void }) {
  return (
    <div className="rounded-[2rem] border border-dashed border-card-border bg-surface-muted/40 p-6 text-center">
      <p className="text-sm font-black text-text-main">{title}</p>
      <p className="mt-1 text-xs font-medium text-text-secondary">{description}</p>
      <button onClick={onClick} className="mt-4 h-10 px-4 rounded-2xl bg-accent text-accent-contrast text-[10px] font-black uppercase tracking-widest">{action}</button>
    </div>
  );
}

function TransactionRow({ transaction, visions, goals, onEdit, onDelete }: { transaction: FinanceTransaction; visions: any[]; goals: FinanceGoal[]; onEdit: () => void; onDelete: () => void }) {
  const isPositive = transaction.type === 'income';
  const isSaving = transaction.type === 'saving';
  const visionName = linkedVisionName(visions, transaction.linkedVisionId);
  const goalName = goals.find(goal => goal.id === transaction.linkedGoalId)?.title;
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-card-border bg-app-container p-3">
      <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center shrink-0', isPositive ? 'bg-success/10 text-success' : isSaving ? 'bg-accent/10 text-accent' : 'bg-danger/10 text-danger')}>
        {isPositive ? <ArrowUpRight size={18} /> : isSaving ? <PiggyBank size={18} /> : <ArrowDownLeft size={18} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-text-main truncate">{transaction.title}</p>
        <p className="text-[11px] font-semibold text-text-secondary truncate">{transaction.category || 'Other'} - {visionName || goalName || 'No Vision linked'} - {transaction.transactionDate}</p>
      </div>
      <p className={cn('text-sm font-black tabular-nums', isPositive ? 'text-success' : isSaving ? 'text-accent' : 'text-danger')}>
        {isPositive ? '+' : '-'}{formatMoney(transaction.amount, transaction.currency)}
      </p>
      <RowActions onEdit={onEdit} onDelete={onDelete} />
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
      <div className="mt-3 flex items-center justify-between gap-3">
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
    <div className="flex items-center gap-3 rounded-2xl border border-card-border bg-app-container p-3">
      <div className="w-11 h-11 rounded-2xl bg-warning/10 text-warning flex items-center justify-center shrink-0"><CreditCard size={18} /></div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-text-main truncate">{subscription.name}</p>
        <p className="text-[11px] font-semibold text-text-secondary truncate">{subscription.billingCycle} - {subscription.nextBillingDate || 'No date'} - {linkedVisionName(visions, subscription.linkedVisionId) || 'No Vision linked'}</p>
      </div>
      <p className="text-sm font-black text-text-main">{formatMoney(subscription.amount, subscription.currency)}</p>
      <RowActions onEdit={onEdit} onDelete={onDelete} />
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
    <div className="flex items-center gap-1 shrink-0">
      <button onClick={onEdit} className={cn('rounded-xl bg-surface-muted text-text-secondary flex items-center justify-center', compact ? 'w-8 h-8' : 'w-9 h-9')}><Edit3 size={14} /></button>
      <button onClick={onDelete} className={cn('rounded-xl bg-danger/10 text-danger flex items-center justify-center', compact ? 'w-8 h-8' : 'w-9 h-9')}><Trash2 size={14} /></button>
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
      <Field label="Category"><select name="category" defaultValue={transaction?.category || categories[0]} className={inputClass}>{categories.map(c => <option key={c}>{c}</option>)}</select></Field>
      <Field label="Date"><input name="transactionDate" type="date" defaultValue={transaction?.transactionDate || today()} className={inputClass} /></Field>
      <Field label="Payment Method"><input name="paymentMethod" defaultValue={transaction?.paymentMethod || ''} className={inputClass} placeholder="UPI, card, cash..." /></Field>
      <Field label="Linked Vision"><VisionSelect name="linkedVisionId" visions={visions} defaultValue={transaction?.linkedVisionId || ''} /></Field>
      <Field label="Linked Goal"><select name="linkedGoalId" defaultValue={transaction?.linkedGoalId || ''} className={inputClass}><option value="">No goal</option>{goals.map(goal => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</select></Field>
      <div className="sm:col-span-2"><Field label="Note"><textarea name="note" defaultValue={transaction?.note || ''} className={textareaClass} /></Field></div>
      <button className="sm:col-span-2 h-12 rounded-2xl bg-accent text-accent-contrast text-[11px] font-black uppercase tracking-widest">Save Transaction</button>
    </form>
  );
}

function GoalForm({ goal, visions, onSubmit }: { goal: FinanceGoal | null; visions: any[]; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label="Goal Title"><input name="title" defaultValue={goal?.title || ''} className={inputClass} required /></Field>
      <Field label="Target Amount"><input name="targetAmount" type="number" min="1" step="0.01" defaultValue={goal?.targetAmount || ''} className={inputClass} required /></Field>
      <Field label="Current Amount"><input name="currentAmount" type="number" min="0" step="0.01" defaultValue={goal?.currentAmount || 0} className={inputClass} /></Field>
      <Field label="Deadline"><input name="deadline" type="date" defaultValue={goal?.deadline || ''} className={inputClass} /></Field>
      <Field label="Priority"><select name="priority" defaultValue={goal?.priority || 'medium'} className={inputClass}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></Field>
      <Field label="Status"><select name="status" defaultValue={goal?.status || 'active'} className={inputClass}><option value="active">Active</option><option value="paused">Paused</option><option value="completed">Completed</option><option value="archived">Archived</option></select></Field>
      <div className="sm:col-span-2"><Field label="Linked Vision"><VisionSelect name="linkedVisionId" visions={visions} defaultValue={goal?.linkedVisionId || ''} /></Field></div>
      <button className="sm:col-span-2 h-12 rounded-2xl bg-accent text-accent-contrast text-[11px] font-black uppercase tracking-widest">Save Goal</button>
    </form>
  );
}

function ContributionForm({ goal, onSubmit }: { goal: FinanceGoal; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Contribution Title"><input name="title" defaultValue={`Contribution to ${goal.title}`} className={inputClass} /></Field>
      <Field label="Amount"><input name="amount" type="number" min="1" step="0.01" className={inputClass} required /></Field>
      <button className="w-full h-12 rounded-2xl bg-accent text-accent-contrast text-[11px] font-black uppercase tracking-widest">Add Contribution</button>
    </form>
  );
}

function SubscriptionForm({ subscription, visions, onSubmit }: { subscription: FinanceSubscription | null; visions: any[]; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label="Name"><input name="name" defaultValue={subscription?.name || ''} className={inputClass} required /></Field>
      <Field label="Amount"><input name="amount" type="number" min="1" step="0.01" defaultValue={subscription?.amount || ''} className={inputClass} required /></Field>
      <Field label="Billing Cycle"><select name="billingCycle" defaultValue={subscription?.billingCycle || 'monthly'} className={inputClass}><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option><option value="custom">Custom</option></select></Field>
      <Field label="Next Billing"><input name="nextBillingDate" type="date" defaultValue={subscription?.nextBillingDate || ''} className={inputClass} /></Field>
      <Field label="Category"><input name="category" defaultValue={subscription?.category || 'Subscriptions'} className={inputClass} /></Field>
      <Field label="Status"><select name="active" defaultValue={subscription?.active === false ? 'false' : 'true'} className={inputClass}><option value="true">Active</option><option value="false">Inactive</option></select></Field>
      <div className="sm:col-span-2"><Field label="Linked Vision"><VisionSelect name="linkedVisionId" visions={visions} defaultValue={subscription?.linkedVisionId || ''} /></Field></div>
      <button className="sm:col-span-2 h-12 rounded-2xl bg-accent text-accent-contrast text-[11px] font-black uppercase tracking-widest">Save Subscription</button>
    </form>
  );
}

function BudgetForm({ month, year, onSubmit }: { month: number; year: number; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label="Category"><select name="category" className={inputClass}>{expenseCategories.map(c => <option key={c}>{c}</option>)}</select></Field>
      <Field label="Limit"><input name="limitAmount" type="number" min="1" step="0.01" className={inputClass} required /></Field>
      <Field label="Month"><input name="month" type="number" min="1" max="12" defaultValue={month} className={inputClass} /></Field>
      <Field label="Year"><input name="year" type="number" min="2000" max="2100" defaultValue={year} className={inputClass} /></Field>
      <button className="sm:col-span-2 h-12 rounded-2xl bg-accent text-accent-contrast text-[11px] font-black uppercase tracking-widest">Save Budget</button>
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
        <Field label="Period Start"><input name="periodStart" type="date" defaultValue={start.toISOString().slice(0, 10)} className={inputClass} /></Field>
        <Field label="Period End"><input name="periodEnd" type="date" defaultValue={end.toISOString().slice(0, 10)} className={inputClass} /></Field>
      </div>
      <Field label="What spending helped your Visions?"><textarea name="reflection" className={textareaClass} /></Field>
      <Field label="What money habit will you improve next week?"><textarea name="improvement" className={textareaClass} /></Field>
      <button className="w-full h-12 rounded-2xl bg-accent text-accent-contrast text-[11px] font-black uppercase tracking-widest">Save Review</button>
    </form>
  );
}

function VisionSelect({ name, visions, defaultValue }: { name: string; visions: any[]; defaultValue?: string }) {
  return (
    <select name={name} defaultValue={defaultValue || ''} className={inputClass}>
      <option value="">No Vision linked</option>
      {visions.map(vision => <option key={vision.id} value={vision.id}>{vision.title}</option>)}
    </select>
  );
}
