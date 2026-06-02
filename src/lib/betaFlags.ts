export const betaFlags = {
  assistant: import.meta.env.VITE_ENABLE_ASSISTANT === 'true',
  storeRecommendations: import.meta.env.VITE_ENABLE_STORE_RECOMMENDATIONS === 'true',
  analytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
};
