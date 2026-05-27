import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { ArrowLeft, ExternalLink, Package, Search, SlidersHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/currency';
import {
  getActiveVisionForResources,
  isStarterStoreProduct,
  mapStoreProductRow,
  scoreStoreProducts,
  STARTER_STORE_PRODUCTS,
  STORE_RECOMMENDATIONS_ENABLED,
} from '../../lib/storeRecommendations';
import { useStore } from '../../store/useStore';
import type { StoreProduct } from '../../types';
import { ProductPreviewModal } from './FeedResourceRecommendations';

const categories = ['All', 'Creator', 'Study', 'Coding', 'Startup', 'Digital'];

export default function StoreResourcesPage() {
  const navigate = useNavigate();
  const user = useStore(state => state.user);
  const visions = useStore(state => state.visions);
  const financeGoals = useStore(state => state.financeGoals);
  const createFinanceGoal = useStore(state => state.createFinanceGoal);
  const addToast = useStore(state => state.addToast);
  const activeVision = useMemo(() => getActiveVisionForResources(visions), [visions]);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);
  const [savedProductIds, setSavedProductIds] = useState<Set<string>>(new Set());
  const [hiddenProductIds, setHiddenProductIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(STORE_RECOMMENDATIONS_ENABLED);

  useEffect(() => {
    if (!STORE_RECOMMENDATIONS_ENABLED || !user.id) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const [{ data: rows, error: productError }, { data: savedRows }] = await Promise.all([
        supabase
          .from('store_products')
          .select('*')
          .eq('is_active', true)
          .eq('safety_status', 'approved')
          .limit(80),
        supabase
          .from('user_saved_products')
          .select('product_id,status')
          .eq('user_id', user.id),
      ]);
      if (cancelled) return;
      if (productError) {
        console.error('Failed to load Store resources:', productError);
        setProducts(STARTER_STORE_PRODUCTS);
      } else {
        setProducts((rows || []).map(mapStoreProductRow));
      }
      setSavedProductIds(new Set((savedRows || []).filter(row => row.status !== 'not_interested' && row.status !== 'hidden').map(row => row.product_id)));
      setHiddenProductIds(new Set((savedRows || []).filter(row => row.status === 'not_interested' || row.status === 'hidden').map(row => row.product_id)));
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  const hasSignals = !!activeVision || (user.interests || []).length > 0 || financeGoals.some(goal => goal.status === 'active');
  const baseProducts = products.length > 0 && hasSignals ? products : STARTER_STORE_PRODUCTS;
  const filteredProducts = useMemo(() => {
    const scored = scoreStoreProducts(baseProducts, {
      activeVision,
      financeGoals,
      interests: user.interests || [],
      hiddenProductIds,
    });
    const normalizedQuery = query.trim().toLowerCase();
    return scored.filter(product => {
      const matchesQuery = !normalizedQuery || `${product.title} ${product.description} ${product.category} ${product.tags.join(' ')}`.toLowerCase().includes(normalizedQuery);
      const matchesCategory = category === 'All'
        || product.category?.toLowerCase().includes(category.toLowerCase())
        || product.visionCategories.includes(category.toLowerCase())
        || (category === 'Digital' && product.isDigital);
      return matchesQuery && matchesCategory;
    });
  }, [baseProducts, activeVision, financeGoals, user.interests, hiddenProductIds, query, category]);

  const saveProduct = async (product: StoreProduct) => {
    if (!user.id) return;
    if (isStarterStoreProduct(product.id)) {
      setSavedProductIds(prev => new Set(prev).add(product.id));
      addToast({ type: 'success', title: 'Starter resource saved', description: 'Saved for this session.' });
      return;
    }
    const { error } = await supabase.from('user_saved_products').upsert({
      user_id: user.id,
      product_id: product.id,
      linked_vision_id: activeVision?.id || null,
      status: 'saved',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,product_id' });
    if (error) {
      addToast({ type: 'error', title: 'Save failed', description: 'Could not save this resource.' });
      return;
    }
    setSavedProductIds(prev => new Set(prev).add(product.id));
    addToast({ type: 'success', title: 'Resource saved', description: activeVision ? `Saved to ${activeVision.title}.` : 'Saved to your resources.' });
  };

  const hideProduct = async (product: StoreProduct) => {
    if (!user.id) return;
    if (!isStarterStoreProduct(product.id)) {
      await supabase.from('user_saved_products').upsert({
        user_id: user.id,
        product_id: product.id,
        linked_vision_id: activeVision?.id || null,
        status: 'not_interested',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,product_id' });
    }
    setHiddenProductIds(prev => new Set(prev).add(product.id));
    setSelectedProduct(null);
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
      setSelectedProduct(null);
    }
  };

  if (!STORE_RECOMMENDATIONS_ENABLED) {
    return (
      <div className="mx-auto max-w-2xl rounded-[1.75rem] border border-card-border bg-card p-5 text-center shadow-sm sm:rounded-[2rem] sm:p-8">
        <h1 className="text-2xl font-black text-text-main">Resource recommendations are off</h1>
        <p className="mt-3 text-sm font-semibold text-text-secondary">You can keep using VisNova without the resource layer.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:space-y-5 sm:pb-10">
      <div className="rounded-[1.75rem] border border-card-border bg-card p-4 shadow-sm sm:rounded-[2rem] md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <button onClick={() => navigate(-1)} className="mt-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-surface-muted text-text-secondary">
              <ArrowLeft size={18} />
            </button>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-accent">Resources</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-text-main sm:text-3xl">For your Vision</h1>
              <p className="mt-2 max-w-xl text-sm font-semibold leading-relaxed text-text-secondary">
                Browse useful templates, creator tools, study kits, and startup resources without adding Store to the main navigation.
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-card-border bg-surface-muted px-4 py-3 text-xs font-bold text-text-secondary">
            {activeVision ? `Context: ${activeVision.title}` : 'Starter mode'}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-[1.75rem] border border-card-border bg-card p-3 shadow-sm sm:rounded-[2rem] sm:p-4 md:flex-row md:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl bg-surface-muted px-4 py-3">
          <Search size={16} className="text-text-secondary" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search templates, tools, planners..."
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-text-main outline-none placeholder:text-text-secondary/50"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
          {categories.map(item => (
            <button
              key={item}
              onClick={() => setCategory(item)}
              className={`h-10 shrink-0 rounded-2xl px-4 text-[10px] font-black uppercase tracking-widest transition-colors ${category === item ? 'bg-accent text-accent-contrast' : 'bg-surface-muted text-text-secondary'}`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-56 animate-pulse rounded-[1.75rem] bg-card sm:h-72 sm:rounded-[2rem]" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {filteredProducts.map(product => (
            <button
              key={product.id}
              onClick={() => setSelectedProduct(product)}
              className="group overflow-hidden rounded-[1.75rem] border border-card-border bg-card text-left shadow-sm transition-all hover:-translate-y-1 hover:border-accent/30 hover:shadow-xl sm:rounded-[2rem]"
            >
              <div className="h-32 bg-surface-muted sm:h-40">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-accent">
                    <Package size={32} />
                  </div>
                )}
              </div>
              <div className="space-y-3 p-3 sm:p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-black text-text-main">{product.title}</p>
                    <p className="mt-1 text-xs font-bold text-text-secondary">{product.partnerName || 'Partner resource'}</p>
                  </div>
                  <ExternalLink size={15} className="mt-1 shrink-0 text-text-secondary/40 group-hover:text-accent" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-accent/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-accent">
                    {product.price ? formatCurrency(product.price, product.currency) : 'Free / varies'}
                  </span>
                  <span className="rounded-full bg-surface-muted px-3 py-1 text-[10px] font-black uppercase tracking-widest text-text-secondary">
                    {product.isDigital ? 'Digital' : 'Partner'}
                  </span>
                </div>
                <p className="line-clamp-2 text-xs font-semibold leading-relaxed text-text-secondary">{product.recommendationReason}</p>
                <span className="inline-flex rounded-full bg-surface-muted px-3 py-1 text-[9px] font-black uppercase tracking-widest text-text-secondary">
                  {savedProductIds.has(product.id) ? 'Saved' : 'Save or add goal'}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {!loading && filteredProducts.length === 0 && (
        <div className="rounded-[1.75rem] border border-dashed border-card-border bg-card p-6 text-center sm:rounded-[2rem] sm:p-8">
          <SlidersHorizontal className="mx-auto text-accent" size={28} />
          <h2 className="mt-4 text-xl font-black text-text-main">No matching resources</h2>
          <p className="mt-2 text-sm font-semibold text-text-secondary">Try another category or search term.</p>
        </div>
      )}

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
    </div>
  );
}
