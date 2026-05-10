CREATE TABLE IF NOT EXISTS public.finance_goals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  target_amount numeric(12,2) NOT NULL CHECK (target_amount >= 0),
  current_amount numeric(12,2) DEFAULT 0 CHECK (current_amount >= 0),
  currency text DEFAULT 'INR',
  deadline date,
  linked_vision_id uuid REFERENCES public.visions(id) ON DELETE SET NULL,
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finance_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('income', 'expense', 'transfer', 'saving')),
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  currency text DEFAULT 'INR',
  category text,
  title text NOT NULL,
  note text,
  transaction_date date DEFAULT CURRENT_DATE,
  payment_method text,
  linked_vision_id uuid REFERENCES public.visions(id) ON DELETE SET NULL,
  linked_goal_id uuid REFERENCES public.finance_goals(id) ON DELETE SET NULL,
  receipt_url text,
  receipt_path text,
  is_recurring boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.finance_budgets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  year integer NOT NULL,
  category text NOT NULL,
  limit_amount numeric(12,2) NOT NULL CHECK (limit_amount >= 0),
  spent_amount numeric(12,2) DEFAULT 0 CHECK (spent_amount >= 0),
  currency text DEFAULT 'INR',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, month, year, category)
);

CREATE TABLE IF NOT EXISTS public.finance_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  currency text DEFAULT 'INR',
  billing_cycle text DEFAULT 'monthly' CHECK (billing_cycle IN ('weekly', 'monthly', 'quarterly', 'yearly', 'custom')),
  next_billing_date date,
  category text,
  linked_vision_id uuid REFERENCES public.visions(id) ON DELETE SET NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finance_reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  period_type text DEFAULT 'weekly' CHECK (period_type IN ('weekly', 'monthly')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  income_total numeric(12,2) DEFAULT 0,
  expense_total numeric(12,2) DEFAULT 0,
  savings_total numeric(12,2) DEFAULT 0,
  reflection text,
  improvement text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_finance_transactions_user_date
  ON public.finance_transactions (user_id, transaction_date DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_finance_transactions_goal
  ON public.finance_transactions (linked_goal_id)
  WHERE linked_goal_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_finance_goals_user_status
  ON public.finance_goals (user_id, status);

CREATE INDEX IF NOT EXISTS idx_finance_subscriptions_user_next
  ON public.finance_subscriptions (user_id, next_billing_date)
  WHERE active = true;

ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS finance_transactions_select_own ON public.finance_transactions;
DROP POLICY IF EXISTS finance_transactions_insert_own ON public.finance_transactions;
DROP POLICY IF EXISTS finance_transactions_update_own ON public.finance_transactions;
DROP POLICY IF EXISTS finance_transactions_delete_own ON public.finance_transactions;

CREATE POLICY finance_transactions_select_own ON public.finance_transactions
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY finance_transactions_insert_own ON public.finance_transactions
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY finance_transactions_update_own ON public.finance_transactions
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY finance_transactions_delete_own ON public.finance_transactions
FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS finance_goals_select_own ON public.finance_goals;
DROP POLICY IF EXISTS finance_goals_insert_own ON public.finance_goals;
DROP POLICY IF EXISTS finance_goals_update_own ON public.finance_goals;
DROP POLICY IF EXISTS finance_goals_delete_own ON public.finance_goals;

CREATE POLICY finance_goals_select_own ON public.finance_goals
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY finance_goals_insert_own ON public.finance_goals
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY finance_goals_update_own ON public.finance_goals
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY finance_goals_delete_own ON public.finance_goals
FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS finance_budgets_select_own ON public.finance_budgets;
DROP POLICY IF EXISTS finance_budgets_insert_own ON public.finance_budgets;
DROP POLICY IF EXISTS finance_budgets_update_own ON public.finance_budgets;
DROP POLICY IF EXISTS finance_budgets_delete_own ON public.finance_budgets;

CREATE POLICY finance_budgets_select_own ON public.finance_budgets
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY finance_budgets_insert_own ON public.finance_budgets
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY finance_budgets_update_own ON public.finance_budgets
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY finance_budgets_delete_own ON public.finance_budgets
FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS finance_subscriptions_select_own ON public.finance_subscriptions;
DROP POLICY IF EXISTS finance_subscriptions_insert_own ON public.finance_subscriptions;
DROP POLICY IF EXISTS finance_subscriptions_update_own ON public.finance_subscriptions;
DROP POLICY IF EXISTS finance_subscriptions_delete_own ON public.finance_subscriptions;

CREATE POLICY finance_subscriptions_select_own ON public.finance_subscriptions
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY finance_subscriptions_insert_own ON public.finance_subscriptions
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY finance_subscriptions_update_own ON public.finance_subscriptions
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY finance_subscriptions_delete_own ON public.finance_subscriptions
FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS finance_reviews_select_own ON public.finance_reviews;
DROP POLICY IF EXISTS finance_reviews_insert_own ON public.finance_reviews;
DROP POLICY IF EXISTS finance_reviews_update_own ON public.finance_reviews;
DROP POLICY IF EXISTS finance_reviews_delete_own ON public.finance_reviews;

CREATE POLICY finance_reviews_select_own ON public.finance_reviews
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY finance_reviews_insert_own ON public.finance_reviews
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY finance_reviews_update_own ON public.finance_reviews
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY finance_reviews_delete_own ON public.finance_reviews
FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_goals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_budgets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_reviews TO authenticated;
