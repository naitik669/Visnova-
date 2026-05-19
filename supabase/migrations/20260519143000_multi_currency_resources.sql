-- Multi-currency Wallet/Resources support and Vision resource readiness.
-- Safe for existing INR rows: no data is dropped and old null currencies become INR.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS default_currency text DEFAULT 'INR';

ALTER TABLE IF EXISTS public.finance_goals
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'INR';

ALTER TABLE IF EXISTS public.finance_transactions
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'INR';

ALTER TABLE IF EXISTS public.finance_budgets
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'INR';

ALTER TABLE IF EXISTS public.finance_subscriptions
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'INR';

UPDATE public.profiles SET default_currency = 'INR' WHERE default_currency IS NULL;
UPDATE public.finance_goals SET currency = 'INR' WHERE currency IS NULL;
UPDATE public.finance_transactions SET currency = 'INR' WHERE currency IS NULL;
UPDATE public.finance_budgets SET currency = 'INR' WHERE currency IS NULL;
UPDATE public.finance_subscriptions SET currency = 'INR' WHERE currency IS NULL;

CREATE TABLE IF NOT EXISTS public.vision_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vision_id uuid REFERENCES public.visions(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  description text,
  resource_type text DEFAULT 'resource',
  source_url text,
  estimated_price numeric(12,2),
  currency text DEFAULT 'INR',
  purchase_status text DEFAULT 'planned',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.vision_resources
  ADD COLUMN IF NOT EXISTS estimated_price numeric(12,2),
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS purchase_status text DEFAULT 'planned';

UPDATE public.vision_resources SET currency = 'INR' WHERE currency IS NULL;
UPDATE public.vision_resources SET purchase_status = 'planned' WHERE purchase_status IS NULL;

CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  vision_id uuid REFERENCES public.visions(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT '',
  description text,
  source_url text,
  image_url text,
  price numeric(12,2),
  currency text DEFAULT 'INR',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS price numeric(12,2),
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'INR';

UPDATE public.products SET currency = 'INR' WHERE currency IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_default_currency_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_default_currency_check
      CHECK (default_currency IN ('INR','USD','EUR','GBP','JPY','AUD','CAD','SGD','AED')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'finance_goals_currency_check'
  ) THEN
    ALTER TABLE public.finance_goals
      ADD CONSTRAINT finance_goals_currency_check
      CHECK (currency IN ('INR','USD','EUR','GBP','JPY','AUD','CAD','SGD','AED')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'finance_transactions_currency_check'
  ) THEN
    ALTER TABLE public.finance_transactions
      ADD CONSTRAINT finance_transactions_currency_check
      CHECK (currency IN ('INR','USD','EUR','GBP','JPY','AUD','CAD','SGD','AED')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'finance_budgets_currency_check'
  ) THEN
    ALTER TABLE public.finance_budgets
      ADD CONSTRAINT finance_budgets_currency_check
      CHECK (currency IN ('INR','USD','EUR','GBP','JPY','AUD','CAD','SGD','AED')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'finance_subscriptions_currency_check'
  ) THEN
    ALTER TABLE public.finance_subscriptions
      ADD CONSTRAINT finance_subscriptions_currency_check
      CHECK (currency IN ('INR','USD','EUR','GBP','JPY','AUD','CAD','SGD','AED')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vision_resources_currency_check'
  ) THEN
    ALTER TABLE public.vision_resources
      ADD CONSTRAINT vision_resources_currency_check
      CHECK (currency IN ('INR','USD','EUR','GBP','JPY','AUD','CAD','SGD','AED')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vision_resources_purchase_status_check'
  ) THEN
    ALTER TABLE public.vision_resources
      ADD CONSTRAINT vision_resources_purchase_status_check
      CHECK (purchase_status IN ('planned','saved','purchased','skipped')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_currency_check'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_currency_check
      CHECK (currency IN ('INR','USD','EUR','GBP','JPY','AUD','CAD','SGD','AED')) NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS vision_resources_user_vision_idx ON public.vision_resources(user_id, vision_id);
CREATE INDEX IF NOT EXISTS vision_resources_status_idx ON public.vision_resources(purchase_status);
CREATE INDEX IF NOT EXISTS products_user_vision_idx ON public.products(user_id, vision_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_vision_resources_updated_at ON public.vision_resources;
CREATE TRIGGER set_vision_resources_updated_at
BEFORE UPDATE ON public.vision_resources
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_products_updated_at ON public.products;
CREATE TRIGGER set_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.vision_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vision_resources_select_own ON public.vision_resources;
DROP POLICY IF EXISTS vision_resources_insert_own ON public.vision_resources;
DROP POLICY IF EXISTS vision_resources_update_own ON public.vision_resources;
DROP POLICY IF EXISTS vision_resources_delete_own ON public.vision_resources;

CREATE POLICY vision_resources_select_own ON public.vision_resources
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY vision_resources_insert_own ON public.vision_resources
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY vision_resources_update_own ON public.vision_resources
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY vision_resources_delete_own ON public.vision_resources
FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS products_select_own ON public.products;
DROP POLICY IF EXISTS products_insert_own ON public.products;
DROP POLICY IF EXISTS products_update_own ON public.products;
DROP POLICY IF EXISTS products_delete_own ON public.products;

CREATE POLICY products_select_own ON public.products
FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY products_insert_own ON public.products
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY products_update_own ON public.products
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY products_delete_own ON public.products
FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vision_resources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
