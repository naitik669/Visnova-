import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ExternalLink, Loader2, PackageX } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../store/useStore';
import { STORE_RECOMMENDATIONS_ENABLED } from '../../lib/storeRecommendations';
import { BrandLogo } from '../BrandLogo';

export default function StoreRedirectPage() {
  const { productId } = useParams();
  const userId = useStore(state => state.user.id);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!STORE_RECOMMENDATIONS_ENABLED) {
      setError('Resource recommendations are currently disabled.');
      return;
    }

    let cancelled = false;
    const redirect = async () => {
      if (!productId) {
        setError('This resource link is invalid.');
        return;
      }

      const { data, error: productError } = await supabase
        .from('store_products')
        .select('id, affiliate_url, external_checkout_url, partner_url, product_type, category, fulfillment_type')
        .eq('id', productId)
        .eq('is_active', true)
        .eq('safety_status', 'approved')
        .single();

      if (cancelled) return;
      const destination = data?.affiliate_url || data?.external_checkout_url || data?.partner_url;
      if (productError || !destination) {
        setError('This resource is unavailable or no longer active.');
        return;
      }

      await supabase.from('store_events').insert({
        user_id: userId || null,
        product_id: data.id,
        event_type: 'redirect',
        source_location: 'redirect',
        metadata: { product_type: data.product_type, category: data.category, fulfillment_type: data.fulfillment_type },
      });

      if (!cancelled) window.location.replace(destination);
    };

    redirect();
    return () => {
      cancelled = true;
    };
  }, [productId, userId]);

  return (
    <div className="flex min-h-[70dvh] items-center justify-center px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] text-center sm:pb-20">
      {error ? (
        <div className="w-full max-w-md rounded-[1.75rem] border border-card-border bg-card p-5 shadow-2xl shadow-accent/5 sm:p-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10 text-danger">
            <PackageX size={24} />
          </div>
          <h2 className="mt-5 text-xl font-black text-text-main">Resource unavailable</h2>
          <p className="max-w-sm text-sm font-semibold text-text-secondary">{error}</p>
          <Link to="/feed" className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-accent px-5 text-[10px] font-black uppercase tracking-widest text-accent-contrast sm:w-auto">
            Back to Feed
          </Link>
        </div>
      ) : (
        <div className="w-full max-w-md rounded-[1.75rem] border border-card-border bg-card p-6 shadow-2xl shadow-accent/5">
          <BrandLogo className="mx-auto h-14 w-14 rounded-2xl shadow-lg shadow-accent/15" />
          <div className="mt-7 flex items-center justify-center gap-3 text-accent">
            <Loader2 className="animate-spin" size={22} />
            <ExternalLink size={20} />
          </div>
          <p className="mt-5 text-[10px] font-black uppercase tracking-[0.24em] text-text-secondary">Opening partner site</p>
          <p className="mx-auto mt-2 max-w-xs text-xs font-semibold leading-5 text-text-secondary/70">
            You are leaving VisNova for a partner resource. Prices and availability may change there.
          </p>
        </div>
      )}
    </div>
  );
}
