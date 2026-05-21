import type { FinanceGoal, StoreProduct, Vision } from '../types';
import { normalizeCurrencyCode } from './currency';
import { safeArray, safeString } from './safeData';

export const STORE_RECOMMENDATIONS_ENABLED = import.meta.env.VITE_ENABLE_STORE_RECOMMENDATIONS !== 'false';

export type StoreEventType = 'impression' | 'click' | 'save' | 'add_to_goal' | 'not_interested' | 'redirect';
export type StoreEventSource = 'feed_sidebar' | 'vision_page' | 'progress_pulse' | 'resources_page' | 'redirect';

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  creator: ['creator', 'youtube', 'video', 'content', 'camera', 'thumbnail', 'script', 'editing', 'podcast'],
  study: ['study', 'exam', 'learn', 'school', 'college', 'notes', 'course', 'focus'],
  coding: ['coding', 'developer', 'programming', 'software', 'app', 'web', 'api', 'github', 'ui'],
  startup: ['startup', 'business', 'founder', 'launch', 'product', 'pitch', 'saas', 'marketing'],
  freelancing: ['freelance', 'client', 'portfolio', 'proposal', 'invoice', 'service'],
  resources: ['money', 'budget', 'resource', 'setup', 'saving', 'gear', 'tool'],
};

export function mapStoreProductRow(row: any): StoreProduct {
  return {
    id: safeString(row?.id),
    title: safeString(row?.title),
    description: safeString(row?.description),
    imageUrl: safeString(row?.image_url),
    price: row?.price === null || row?.price === undefined ? null : Number(row.price),
    currency: normalizeCurrencyCode(row?.currency),
    partnerName: safeString(row?.partner_name),
    affiliateUrl: safeString(row?.affiliate_url),
    productType: row?.product_type || 'physical_product',
    category: safeString(row?.category),
    tags: safeArray<string>(row?.tags).map(tag => safeString(tag).toLowerCase()).filter(Boolean),
    visionCategories: safeArray<string>(row?.vision_categories).map(tag => safeString(tag).toLowerCase()).filter(Boolean),
    minBudget: row?.min_budget === null || row?.min_budget === undefined ? null : Number(row.min_budget),
    maxBudget: row?.max_budget === null || row?.max_budget === undefined ? null : Number(row.max_budget),
    isDigital: !!row?.is_digital,
  };
}

export function getActiveVisionForResources(visions: Vision[]) {
  return visions
    .filter(vision => vision.status !== 'completed')
    .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))[0] || visions[0] || null;
}

function tokenizeVision(vision?: Vision | null) {
  if (!vision) return [];
  return [
    vision.title,
    vision.description,
    vision.category,
    ...(vision.tags || []),
  ].join(' ').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

function inferVisionCategories(tokens: string[]) {
  return Object.entries(CATEGORY_KEYWORDS)
    .filter(([, keywords]) => keywords.some(keyword => tokens.includes(keyword)))
    .map(([category]) => category);
}

export function scoreStoreProducts(products: StoreProduct[], options: {
  activeVision?: Vision | null;
  interests?: string[];
  financeGoals?: FinanceGoal[];
  hiddenProductIds?: Set<string>;
}) {
  const tokens = tokenizeVision(options.activeVision);
  const inferredCategories = inferVisionCategories(tokens);
  const interests = (options.interests || []).map(interest => interest.toLowerCase());
  const activeGoalText = (options.financeGoals || [])
    .filter(goal => goal.status === 'active')
    .map(goal => `${goal.title} ${goal.currency}`)
    .join(' ')
    .toLowerCase();

  return products
    .filter(product => !options.hiddenProductIds?.has(product.id))
    .map(product => {
      const categoryMatch = product.visionCategories.some(category => inferredCategories.includes(category) || tokens.includes(category));
      const tagMatchCount = product.tags.filter(tag => tokens.includes(tag) || activeGoalText.includes(tag)).length;
      const interestMatch = product.tags.some(tag => interests.includes(tag)) || product.visionCategories.some(category => interests.includes(category));
      const budgetMatch = product.price
        ? (options.financeGoals || []).some(goal => goal.status === 'active' && goal.currency === product.currency && product.price! <= Math.max(goal.targetAmount - goal.currentAmount, goal.targetAmount))
        : false;
      const recentGoalMatch = product.tags.some(tag => activeGoalText.includes(tag));
      const score =
        (categoryMatch ? 40 : 0) +
        Math.min(40, tagMatchCount * 20) +
        (budgetMatch ? 15 : 0) +
        (interestMatch ? 15 : 0) +
        (recentGoalMatch ? 10 : 0);

      const reason = options.activeVision
        ? categoryMatch
          ? `Recommended for ${options.activeVision.title}.`
          : tagMatchCount > 0
            ? `Matches your ${options.activeVision.title} keywords.`
            : 'A safe resource for your current goals.'
        : 'Create a Vision to make these suggestions sharper.';

      return { ...product, score, recommendationReason: reason };
    })
    .sort((a, b) => (b.score || 0) - (a.score || 0) || a.title.localeCompare(b.title));
}
