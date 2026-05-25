import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ArrowUpRight, ExternalLink, HelpCircle, Package, RefreshCw, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/currency';
import {
  getActiveVisionForResources,
  isStarterStoreProduct,
  mapStoreProductRow,
  scoreStoreProducts,
  STARTER_STORE_PRODUCTS,
  STORE_RECOMMENDATIONS_ENABLED,
  type StoreEventSource,
  type StoreEventType,
} from '../../lib/storeRecommendations';
import { useStore } from '../../store/useStore';
import type { StoreProduct } from '../../types';

const FEED_RESOURCE_LIMIT = 3;

const logStoreEvent = async (
  product: StoreProduct,
  eventType: StoreEventType,
  sourceLocation: StoreEventSource,
  userId?: string,
  linkedVisionId?: string | null,
) => {
  if (!STORE_RECOMMENDATIONS_ENABLED || !product.id || isStarterStoreProduct(product.id)) return;
  const { error } = await supabase.from('store_events').insert({
    user_id: userId || null,
    product_id: product.id,
    event_type: eventType,
    source_location: sourceLocation,
    linked_vision_id: linkedVisionId || null,
    metadata: { product_type: product.productType, category: product.category },
  });
  if (error) console.error('Failed to log resource event:', error);
};

export function ProductPreviewModal({
  product,
  onClose,
  onSave,
  onAddGoal,
  onHide,
}: {
  product: StoreProduct;
  onClose: () => void;
  onSave: () => void;
  onAddGoal: () => void;
  onHide: () => void;
}) {
  const partnerHref = isStarterStoreProduct(product.id)
    ? product.externalCheckoutUrl || product.affiliateUrl || product.partnerUrl || '#'
    : `/store/redirect/${product.id}`;
  const fulfillmentLabel = product.fulfillmentType === 'digital_external'
    ? 'Digital partner'
    : product.fulfillmentType === 'affiliate_external'
      ? 'Partner checkout'
      : 'Future fulfillment';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[260] flex items-center justify-center bg-black/45 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-card-border bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative h-48 bg-accent/5">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-accent">
              <Package size={42} />
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-card/90 text-text-secondary shadow-sm"
            aria-label="Close resource preview"
          >
            <X size={16} />
          </button>
        </div>
        <div className="space-y-5 p-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-accent">{product.partnerName || 'Partner resource'}</p>
            <h3 className="mt-2 text-2xl font-black tracking-tight text-text-main">{product.title}</h3>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-text-secondary">{product.description || product.shortDescription}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-accent/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-accent">
              {product.price ? formatCurrency(product.price, product.currency) : 'Free / varies'}
            </span>
            <span className="rounded-full bg-surface-muted px-3 py-1 text-[10px] font-black uppercase tracking-widest text-text-secondary">
              {product.productType.replace(/_/g, ' ')}
            </span>
            <span className="rounded-full bg-surface-muted px-3 py-1 text-[10px] font-black uppercase tracking-widest text-text-secondary">
              {fulfillmentLabel}
            </span>
          </div>
          <div className="rounded-2xl border border-card-border bg-surface-muted p-4 text-xs font-semibold leading-relaxed text-text-secondary">
            {product.recommendationReason || 'Recommended because it can support one of your current goals.'}
          </div>
          <div className="rounded-2xl bg-warning/10 p-4 text-[11px] font-bold leading-relaxed text-text-secondary">
            {product.isDigital
              ? 'This digital product is delivered by a third-party creator or platform. VisNova may earn a commission.'
              : 'This product is sold and fulfilled by a third-party partner. VisNova may earn a commission.'}
            {' '}Prices and availability can change on partner sites.
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <button onClick={onSave} className="h-11 rounded-2xl bg-accent text-[10px] font-black uppercase tracking-widest text-accent-contrast">
              Save to Vision
            </button>
            <button onClick={onAddGoal} className="h-11 rounded-2xl border border-card-border bg-surface-muted text-[10px] font-black uppercase tracking-widest text-text-main">
              Add Money Goal
            </button>
            <button onClick={onHide} className="h-11 rounded-2xl border border-card-border text-[10px] font-black uppercase tracking-widest text-text-secondary">
              Not Interested
            </button>
            <a
              href={partnerHref}
              target="_blank"
              rel="noreferrer"
              className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-text-main text-[10px] font-black uppercase tracking-widest text-bg-base"
            >
              View Partner <ExternalLink size={13} />
            </a>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function FeedResourceRecommendations() {
  const navigate = useNavigate();
  const user = useStore(state => state.user);
  const userInterests = useStore(state => state.userInterests);
  const visions = useStore(state => state.visions);
  const financeGoals = useStore(state => state.financeGoals);
  const createFinanceGoal = useStore(state => state.createFinanceGoal);
  const addToast = useStore(state => state.addToast);
  const activeVision = useMemo(() => getActiveVisionForResources(visions), [visions]);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [hiddenProductIds, setHiddenProductIds] = useState<Set<string>>(new Set());
  const [savedProductIds, setSavedProductIds] = useState<Set<string>>(new Set());
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);
  const [whyOpen, setWhyOpen] = useState(false);
  const [loading, setLoading] = useState(STORE_RECOMMENDATIONS_ENABLED);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!STORE_RECOMMENDATIONS_ENABLED || !user.id) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      const [{ data: rows, error: productError }, { data: savedRows }] = await Promise.all([
        supabase
          .from('store_products')
          .select('*')
          .eq('is_active', true)
          .eq('safety_status', 'approved')
          .limit(24),
        supabase
          .from('user_saved_products')
          .select('product_id,status')
          .eq('user_id', user.id),
      ]);
      if (cancelled) return;
      if (productError) {
        console.error('Failed to load resource recommendations:', productError);
        const code = (productError as any)?.code || '';
        if (code === '42P01' || code === 'PGRST205' || code === 'PGRST200') {
          setProducts(STARTER_STORE_PRODUCTS);
          setError('');
        } else {
          setError('Resources could not load.');
          setProducts([]);
        }
      } else {
        setProducts((rows || []).map(mapStoreProductRow));
        setHiddenProductIds(new Set((savedRows || []).filter(row => row.status === 'not_interested' || row.status === 'hidden').map(row => row.product_id)));
        setSavedProductIds(new Set((savedRows || []).filter(row => row.status !== 'not_interested' && row.status !== 'hidden').map(row => row.product_id)));
      }
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user.id, retryKey]);

  const interestSignals = useMemo(() => {
    const explicitInterests = (user.interests || []).map(interest => interest.toLowerCase());
    const learnedInterests = Object.entries(userInterests || {})
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([tag]) => tag.toLowerCase());
    return Array.from(new Set([...explicitInterests, ...learnedInterests])).slice(0, 8);
  }, [user.interests, userInterests]);

  const matchedSignals = useMemo(() => {
    const signals = [...interestSignals];
    if (activeVision?.category) signals.unshift(activeVision.category);
    (activeVision?.tags || []).forEach(tag => signals.push(tag));
    return Array.from(new Set(signals.map(signal => signal.toLowerCase()).filter(Boolean))).slice(0, 4);
  }, [activeVision?.category, activeVision?.tags, interestSignals]);

  const hasUsefulSignal = !!activeVision || interestSignals.length > 0 || financeGoals.some(goal => goal.status === 'active') || savedProductIds.size > 0;
  const displayProducts = products.length > 0 && hasUsefulSignal ? products : STARTER_STORE_PRODUCTS;
  const isStarterMode = !hasUsefulSignal || products.length === 0;

  const recommendations = useMemo(() => (
    scoreStoreProducts(displayProducts, {
      activeVision,
      financeGoals,
      interests: interestSignals,
      hiddenProductIds,
    }).slice(0, FEED_RESOURCE_LIMIT)
  ), [displayProducts, activeVision, financeGoals, interestSignals, hiddenProductIds]);

  useEffect(() => {
    recommendations.forEach(product => {
      logStoreEvent(product, 'impression', 'feed_sidebar', user.id, activeVision?.id);
    });
  }, [recommendations.map(product => product.id).join('|'), user.id, activeVision?.id]);

  if (!STORE_RECOMMENDATIONS_ENABLED) return null;

  const saveProduct = async (product: StoreProduct) => {
    if (!user.id) return;
    if (isStarterStoreProduct(product.id)) {
      setSavedProductIds(prev => new Set(prev).add(product.id));
      addToast({ type: 'success', title: 'Starter resource saved', description: 'Saved for this session. Create a Vision to connect real resources.' });
      return;
    }
    const { error: saveError } = await supabase.from('user_saved_products').upsert({
      user_id: user.id,
      product_id: product.id,
      linked_vision_id: activeVision?.id || null,
      status: 'saved',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,product_id' });
    if (saveError) {
      console.error('Failed to save resource:', saveError);
      addToast({ type: 'error', title: 'Save failed', description: 'Could not save this resource.' });
      return;
    }
    setSavedProductIds(prev => new Set(prev).add(product.id));
    await logStoreEvent(product, 'save', 'feed_sidebar', user.id, activeVision?.id);
    addToast({ type: 'success', title: 'Resource saved', description: activeVision ? `Saved to ${activeVision.title}.` : 'Saved to your resources.' });
  };

  const hideProduct = async (product: StoreProduct) => {
    if (!user.id) return;
    if (isStarterStoreProduct(product.id)) {
      setHiddenProductIds(prev => new Set(prev).add(product.id));
      setSelectedProduct(null);
      return;
    }
    await supabase.from('user_saved_products').upsert({
      user_id: user.id,
      product_id: product.id,
      linked_vision_id: activeVision?.id || null,
      status: 'not_interested',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,product_id' });
    setHiddenProductIds(prev => new Set(prev).add(product.id));
    setSelectedProduct(null);
    await logStoreEvent(product, 'not_interested', 'feed_sidebar', user.id, activeVision?.id);
  };

  const addMoneyGoal = async (product: StoreProduct) => {
    if (!product.price) {
      addToast({ type: 'info', title: 'Price unavailable', description: 'This resource does not have a fixed price.' });
      return;
    }
    const created = await createFinanceGoal({
      title: product.title,
      targetAmount: product.price,
      currentAmount: 0,
      currency: product.currency,
      linkedVisionId: activeVision?.id || null,
      priority: 'medium',
      status: 'active',
    });
    if (created) {
      await saveProduct(product);
      await logStoreEvent(product, 'add_to_goal', 'feed_sidebar', user.id, activeVision?.id);
      setSelectedProduct(null);
    }
  };

  return (
    <aside className="space-y-3">
      <div className="rounded-[1.6rem] border border-card-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.24em] text-accent">Resources</p>
            <h3 className="mt-1 text-base font-black tracking-tight text-text-main">Matched picks</h3>
            <p className="mt-1 text-[11px] font-bold leading-relaxed text-text-secondary">
              {isStarterMode ? 'Starter resources until your interests sharpen.' : activeVision ? `Based on ${activeVision.title}` : 'Based on your interests'}
            </p>
            {matchedSignals.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {matchedSignals.map(signal => (
                  <span key={signal} className="rounded-full bg-accent/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-accent">
                    {signal}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <Package size={16} />
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-20 animate-pulse rounded-2xl bg-surface-muted" />
            ))}
          </div>
        ) : error ? (
          <div className="space-y-3 rounded-2xl border border-card-border bg-surface-muted p-4 text-xs font-bold text-text-secondary">
            <p>{error}</p>
            <button onClick={() => setRetryKey(key => key + 1)} className="inline-flex items-center gap-2 rounded-xl bg-card px-3 py-2 text-[9px] font-black uppercase tracking-widest text-accent">
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        ) : recommendations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-card-border p-4 text-xs font-bold leading-relaxed text-text-secondary">
            No resources available yet. Create a Vision to sharpen suggestions.
          </div>
        ) : (
          <div className="space-y-2.5">
            {isStarterMode && (
              <div className="rounded-xl border border-card-border bg-accent/5 p-2.5 text-[11px] font-bold leading-relaxed text-text-secondary">
                <span className="text-text-main">Starter picks.</span> Add interests or a Vision for tighter matches.
              </div>
            )}
            {recommendations.map(product => (
              <button
                key={product.id}
                onClick={() => {
                  setSelectedProduct(product);
                  logStoreEvent(product, 'click', 'feed_sidebar', user.id, activeVision?.id);
                }}
                className="group w-full rounded-xl border border-card-border bg-surface-muted/60 p-2.5 text-left transition-all hover:border-accent/30 hover:bg-card hover:shadow-sm"
              >
                <div className="flex gap-2.5">
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-card">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-accent">
                        <Package size={18} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-black text-text-main">{product.title}</p>
                    <p className="mt-0.5 text-[11px] font-black text-accent">{product.price ? formatCurrency(product.price, product.currency) : 'Free / varies'}</p>
                    <p className="mt-0.5 line-clamp-1 text-[10px] font-semibold leading-snug text-text-secondary/70">{product.recommendationReason}</p>
                  </div>
                  <ArrowUpRight size={14} className="mt-1 text-text-secondary/30 transition-colors group-hover:text-accent" />
                </div>
                <div className="mt-2 flex gap-2">
                  <span className={cn(
                    "rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-widest",
                    savedProductIds.has(product.id) ? "bg-success/10 text-success" : "bg-card text-text-secondary"
                  )}>
                    {savedProductIds.has(product.id) ? 'Saved' : 'Save'}
                  </span>
                  <span className="rounded-full bg-card px-2.5 py-1 text-[8px] font-black uppercase tracking-widest text-text-secondary">
                    Why this?
                  </span>
                </div>
              </button>
            ))}
            <button
              onClick={() => navigate('/store')}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-accent text-[10px] font-black uppercase tracking-widest text-accent-contrast transition-transform active:scale-95"
            >
              View more resources <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>

      <button
        onClick={() => setWhyOpen(true)}
        className="flex items-center gap-2 px-2 text-[10px] font-black uppercase tracking-widest text-text-secondary/70 transition-colors hover:text-accent"
      >
        <HelpCircle size={13} /> Why am I seeing this?
      </button>

      <AnimatePresence>
        {whyOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[260] flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm"
            onClick={() => setWhyOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              className="max-w-sm rounded-[2rem] border border-card-border bg-card p-6 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-accent">Why this?</p>
                  <h3 className="mt-2 text-xl font-black text-text-main">Resources follow your goals.</h3>
                </div>
                <button onClick={() => setWhyOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-2xl bg-surface-muted text-text-secondary">
                  <X size={15} />
                </button>
              </div>
              <p className="mt-4 text-sm font-semibold leading-6 text-text-secondary">
                Recommendations use selected interests, active Visions, saved resources, money goals, and product interactions. Private messages, journals, notes, and private logs are not used.
              </p>
            </motion.div>
          </motion.div>
        )}
        {selectedProduct && (
          <ProductPreviewModal
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
            onSave={() => saveProduct(selectedProduct)}
            onAddGoal={() => addMoneyGoal(selectedProduct)}
            onHide={() => hideProduct(selectedProduct)}
          />
        )}
      </AnimatePresence>
    </aside>
  );
}
