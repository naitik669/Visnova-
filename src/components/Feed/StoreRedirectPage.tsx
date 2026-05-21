import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../store/useStore';
import { STORE_RECOMMENDATIONS_ENABLED } from '../../lib/storeRecommendations';

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
        .select('id, affiliate_url, product_type, category')
        .eq('id', productId)
        .eq('is_active', true)
        .eq('safety_status', 'approved')
        .single();

      if (cancelled) return;
      if (productError || !data?.affiliate_url) {
        setError('This resource is unavailable or no longer active.');
        return;
      }

      await supabase.from('store_events').insert({
        user_id: userId || null,
        product_id: data.id,
        event_type: 'redirect',
        source_location: 'redirect',
        metadata: { product_type: data.product_type, category: data.category },
      });

      if (!cancelled) window.location.replace(data.affiliate_url);
    };

    redirect();
    return () => {
      cancelled = true;
    };
  }, [productId, userId]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      {error ? (
        <>
          <h2 className="text-xl font-black text-text-main">Resource unavailable</h2>
          <p className="max-w-sm text-sm font-semibold text-text-secondary">{error}</p>
          <Link to="/feed" className="rounded-2xl bg-accent px-5 py-3 text-[10px] font-black uppercase tracking-widest text-accent-contrast">
            Back to Feed
          </Link>
        </>
      ) : (
        <>
          <Loader2 className="animate-spin text-accent" size={28} />
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-text-secondary">Opening partner site</p>
        </>
      )}
    </div>
  );
}
