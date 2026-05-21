import type { FinanceGoal, StoreFulfillmentType, StoreProduct, StoreProductType, Vision } from '../types';
import { normalizeCurrencyCode } from './currency';
import { safeArray, safeString } from './safeData';

export const STORE_RECOMMENDATIONS_ENABLED = import.meta.env.VITE_ENABLE_STORE_RECOMMENDATIONS !== 'false';

export type StoreEventType = 'impression' | 'click' | 'save' | 'add_to_goal' | 'not_interested' | 'redirect' | 'view_more' | 'preference_changed';
export type StoreEventSource = 'feed_sidebar' | 'vision_page' | 'progress_pulse' | 'resources_page' | 'redirect' | 'store_view';

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  creator: ['creator', 'youtube', 'video', 'content', 'camera', 'thumbnail', 'script', 'editing', 'podcast'],
  study: ['study', 'exam', 'learn', 'school', 'college', 'notes', 'course', 'focus'],
  coding: ['coding', 'developer', 'programming', 'software', 'app', 'web', 'api', 'github', 'ui'],
  startup: ['startup', 'business', 'founder', 'launch', 'product', 'pitch', 'saas', 'marketing'],
  freelancing: ['freelance', 'client', 'portfolio', 'proposal', 'invoice', 'service'],
  resources: ['money', 'budget', 'resource', 'setup', 'saving', 'gear', 'tool'],
};

const STORE_PRODUCT_TYPES = new Set<StoreProductType>([
  'physical_product',
  'digital_template',
  'course',
  'book',
  'software',
  'creator_tool',
  'study_resource',
  'startup_tool',
  'productivity_kit',
]);

const STORE_FULFILLMENT_TYPES = new Set<StoreFulfillmentType>([
  'affiliate_external',
  'digital_external',
  'digital_internal_future',
  'dropship_future',
  'manual_partner_future',
]);

export const isStarterStoreProduct = (productId?: string) => safeString(productId).startsWith('starter-');

const coerceProductType = (value: unknown): StoreProductType => {
  const normalized = safeString(value) as StoreProductType;
  return STORE_PRODUCT_TYPES.has(normalized) ? normalized : 'physical_product';
};

const coerceFulfillmentType = (value: unknown, isDigital: boolean): StoreFulfillmentType => {
  const normalized = safeString(value) as StoreFulfillmentType;
  if (STORE_FULFILLMENT_TYPES.has(normalized)) return normalized;
  return isDigital ? 'digital_external' : 'affiliate_external';
};

export function mapStoreProductRow(row: any): StoreProduct {
  const isDigital = !!row?.is_digital;
  return {
    id: safeString(row?.id),
    title: safeString(row?.title),
    description: safeString(row?.description),
    shortDescription: safeString(row?.short_description),
    imageUrl: safeString(row?.image_url),
    galleryUrls: safeArray<string>(row?.gallery_urls).map(url => safeString(url)).filter(Boolean),
    price: row?.price === null || row?.price === undefined ? null : Number(row.price),
    compareAtPrice: row?.compare_at_price === null || row?.compare_at_price === undefined ? null : Number(row.compare_at_price),
    currency: normalizeCurrencyCode(row?.currency),
    partnerName: safeString(row?.partner_name),
    partnerUrl: safeString(row?.partner_url),
    affiliateUrl: safeString(row?.affiliate_url),
    externalCheckoutUrl: safeString(row?.external_checkout_url),
    digitalDeliveryUrl: safeString(row?.digital_delivery_url),
    productType: coerceProductType(row?.product_type),
    fulfillmentType: coerceFulfillmentType(row?.fulfillment_type, isDigital),
    category: safeString(row?.category),
    tags: safeArray<string>(row?.tags).map(tag => safeString(tag).toLowerCase()).filter(Boolean),
    visionCategories: safeArray<string>(row?.vision_categories).map(tag => safeString(tag).toLowerCase()).filter(Boolean),
    stockStatus: safeString(row?.stock_status) || 'unknown',
    minBudget: row?.min_budget === null || row?.min_budget === undefined ? null : Number(row.min_budget),
    maxBudget: row?.max_budget === null || row?.max_budget === undefined ? null : Number(row.max_budget),
    isDigital,
    recommendationPriority: Number(row?.recommendation_priority || 0),
  };
}

export const STARTER_STORE_PRODUCTS: StoreProduct[] = [
  {
    id: 'starter-weekly-focus-planner',
    title: 'Weekly Focus Planner',
    description: 'A simple weekly planning template for choosing one next move and logging proof.',
    shortDescription: 'Plan the week around one Vision.',
    imageUrl: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&w=640&q=80',
    galleryUrls: [],
    price: 0,
    compareAtPrice: null,
    currency: 'INR',
    partnerName: 'VisNova Starter Picks',
    partnerUrl: 'https://example.com/visnova/weekly-focus-planner',
    affiliateUrl: 'https://example.com/visnova/weekly-focus-planner',
    externalCheckoutUrl: 'https://example.com/visnova/weekly-focus-planner',
    productType: 'productivity_kit',
    fulfillmentType: 'digital_external',
    category: 'Productivity templates',
    tags: ['planner', 'focus', 'goal', 'weekly'],
    visionCategories: ['resources', 'study', 'startup'],
    stockStatus: 'available',
    minBudget: null,
    maxBudget: null,
    isDigital: true,
    recommendationPriority: 4,
    recommendationReason: 'Popular starter resource for turning a Vision into weekly action.',
  },
  {
    id: 'starter-creator-checklist',
    title: 'Creator Starter Checklist',
    description: 'A setup checklist for microphones, lights, thumbnails, editing, and publishing rhythm.',
    shortDescription: 'Creator setup without the overwhelm.',
    imageUrl: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=640&q=80',
    galleryUrls: [],
    price: 199,
    compareAtPrice: null,
    currency: 'INR',
    partnerName: 'VisNova Starter Picks',
    partnerUrl: 'https://example.com/visnova/creator-starter-checklist',
    affiliateUrl: 'https://example.com/visnova/creator-starter-checklist',
    externalCheckoutUrl: 'https://example.com/visnova/creator-starter-checklist',
    productType: 'digital_template',
    fulfillmentType: 'digital_external',
    category: 'Creator setup',
    tags: ['creator', 'youtube', 'setup', 'checklist'],
    visionCategories: ['creator'],
    stockStatus: 'available',
    minBudget: null,
    maxBudget: null,
    isDigital: true,
    recommendationPriority: 3,
    recommendationReason: 'Starter resource for creators, builders, and public proof updates.',
  },
  {
    id: 'starter-study-sprint-planner',
    title: 'Study Sprint Planner',
    description: 'Plan revision blocks, weak areas, exam dates, and daily study proof.',
    shortDescription: 'A clean sprint planner for study goals.',
    imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=640&q=80',
    galleryUrls: [],
    price: 149,
    compareAtPrice: null,
    currency: 'INR',
    partnerName: 'VisNova Starter Picks',
    partnerUrl: 'https://example.com/visnova/study-sprint-planner',
    affiliateUrl: 'https://example.com/visnova/study-sprint-planner',
    externalCheckoutUrl: 'https://example.com/visnova/study-sprint-planner',
    productType: 'study_resource',
    fulfillmentType: 'digital_external',
    category: 'Study resources',
    tags: ['study', 'planner', 'exam', 'focus'],
    visionCategories: ['study'],
    stockStatus: 'available',
    minBudget: null,
    maxBudget: null,
    isDigital: true,
    recommendationPriority: 3,
    recommendationReason: 'Popular starter resource for study and exam Visions.',
  },
  {
    id: 'starter-portfolio-template',
    title: 'Portfolio Starter Template',
    description: 'A starter structure for projects, case studies, proof logs, and public work.',
    shortDescription: 'Turn proof into a portfolio.',
    imageUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=640&q=80',
    galleryUrls: [],
    price: 9,
    compareAtPrice: null,
    currency: 'USD',
    partnerName: 'VisNova Starter Picks',
    partnerUrl: 'https://example.com/visnova/portfolio-starter-template',
    affiliateUrl: 'https://example.com/visnova/portfolio-starter-template',
    externalCheckoutUrl: 'https://example.com/visnova/portfolio-starter-template',
    productType: 'startup_tool',
    fulfillmentType: 'digital_external',
    category: 'Coding resources',
    tags: ['coding', 'portfolio', 'template', 'startup'],
    visionCategories: ['coding', 'startup'],
    stockStatus: 'available',
    minBudget: null,
    maxBudget: null,
    isDigital: true,
    recommendationPriority: 3,
    recommendationReason: 'Starter resource for builders who want visible proof of work.',
  },
];

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
        (recentGoalMatch ? 10 : 0) +
        (product.recommendationPriority || 0);

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
