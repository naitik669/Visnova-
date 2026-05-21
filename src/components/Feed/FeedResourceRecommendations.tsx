import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUpRight, Bookmark, ExternalLink, Loader2, Package, PiggyBank, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/currency';
import {
  getActiveVisionForResources,
  mapStoreProductRow,
  scoreStoreProducts,
  STORE_RECOMMENDATIONS_ENABLED,
  type StoreEventSource,
  type StoreEventType,
} from '../../lib/storeRecommendations';
import { useStore } from '../../store/useStore';
import type { StoreProduct } from '../../types';

const logStoreEvent = async (
  product: StoreProduct,
  eventType: StoreEventType,
  sourceLocation: StoreEventSource,
  userId?: string,
  linkedVisionId?: string | null,
) => {
  if (!STORE_RECOMMENDATIONS_ENABLED || !product.id) return;
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

function ProductPreviewModal({
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
            <p className="mt-2 text-sm font-semibold leading-relaxed text-text-secondary">{product.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-accent/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-accent">
              {product.price ? formatCurrency(product.price, product.currency) : 'Free / varies'}
            </span>
            <span className="rounded-full bg-surface-muted px-3 py-1 text-[10px] font-black uppercase tracking-widest text-text-secondary">
              {product.isDigital ? 'Digital' : 'Resource'}
            </span>
          </div>
          <div className="rounded-2xl border border-card-border bg-surface-muted p-4 text-xs font-semibold leading-relaxed text-text-secondary">
            {product.recommendationReason || 'Recommended because it can support one of your current goals.'}
          </div>
          <div className="rounded-2xl bg-warning/10 p-4 text-[11px] font-bold leading-relaxed text-text-secondary">
            Sold and fulfilled by a third-party partner. VisNova may earn a commission. Prices and availability can change on partner sites.
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
              href={`/store/redirect/${product.id}`}
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
  const user = useStore(state => state.user);
  const visions = useStore(state => state.visions);
  const financeGoals = useStore(state => state.financeGoals);
  const createFinanceGoal = useStore(state => state.createFinanceGoal);
  const addToast = useStore(state => state.addToast);
  const activeVision = useMemo(() => getActiveVisionForResources(visions), [visions]);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [hiddenProductIds, setHiddenProductIds] = useState<Set<string>>(new Set());
  const [savedProductIds, setSavedProductIds] = useState<Set<string>>(new Set());
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);
  const [loading, setLoading] = useState(STORE_RECOMMENDATIONS_ENABLED);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!STORE_RECOMMENDATIONS_ENABLED || !user.id) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const [{ data: rows, error: productError }, { data: savedRows }] = await Promise.all([
        supabase
          .from('store_products')
          .select('*')
          .eq('is_active', true)
          .eq('safety_status', 'approved')
          .limit(40),
        supabase
          .from('user_saved_products')
          .select('product_id,status')
          .eq('user_id', user.id),
      ]);
      if (cancelled) return;
      if (productError) {
        console.error('Failed to load resource recommendations:', productError);
        setError('Resources could not load.');
        setProducts([]);
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
  }, [user.id]);

  const recommendations = useMemo(() => (
    scoreStoreProducts(products, {
      activeVision,
      financeGoals,
      interests: user.interests || [],
      hiddenProductIds,
    }).slice(0, 4)
  ), [products, activeVision, financeGoals, user.interests, hiddenProductIds]);

  useEffect(() => {
    recommendations.forEach(product => {
      logStoreEvent(product, 'impression', 'feed_sidebar', user.id, activeVision?.id);
    });
  }, [recommendations.map(product => product.id).join('|'), user.id, activeVision?.id]);

  if (!STORE_RECOMMENDATIONS_ENABLED) return null;

  const saveProduct = async (product: StoreProduct) => {
    if (!user.id) return;
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
    <aside className="sticky top-5 space-y-4">
      <div className="rounded-[2rem] border border-card-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.24em] text-accent">Resources</p>
            <h3 className="mt-1 text-lg font-black tracking-tight text-text-main">For your Vision</h3>
            <p className="mt-1 text-[11px] font-bold leading-relaxed text-text-secondary">
              {activeVision ? `Based on ${activeVision.title}` : 'Based on your current goals'}
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <Package size={17} />
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-20 animate-pulse rounded-2xl bg-surface-muted" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-card-border bg-surface-muted p-4 text-xs font-bold text-text-secondary">{error}</div>
        ) : recommendations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-card-border p-4 text-xs font-bold leading-relaxed text-text-secondary">
            No recommendations yet. Create a Vision or save resources to sharpen suggestions.
          </div>
        ) : (
          <div className="space-y-3">
            {recommendations.map(product => (
              <button
                key={product.id}
                onClick={() => {
                  setSelectedProduct(product);
                  logStoreEvent(product, 'click', 'feed_sidebar', user.id, activeVision?.id);
                }}
                className="group w-full rounded-2xl border border-card-border bg-surface-muted/60 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-accent/30 hover:bg-card hover:shadow-sm"
              >
                <div className="flex gap-3">
                  <div className="h-14 w-14 overflow-hidden rounded-xl bg-card">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-accent">
                        <Package size={18} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-text-main">{product.title}</p>
                    <p className="mt-0.5 text-[11px] font-black text-accent">{product.price ? formatCurrency(product.price, product.currency) : 'Free / varies'}</p>
                    <p className="mt-1 line-clamp-2 text-[10px] font-semibold leading-snug text-text-secondary/70">{product.recommendationReason}</p>
                  </div>
                  <ArrowUpRight size={14} className="mt-1 text-text-secondary/30 transition-colors group-hover:text-accent" />
                </div>
                <div className="mt-3 flex gap-2">
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
          </div>
        )}
      </div>

      <div className="rounded-[1.5rem] border border-card-border bg-card/70 p-4 text-[10px] font-bold leading-relaxed text-text-secondary">
        Private messages, journals, notes, and private logs are never used for recommendations.
      </div>

      <AnimatePresence>
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
