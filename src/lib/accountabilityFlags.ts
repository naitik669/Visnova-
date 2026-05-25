export const accountabilityFlags = {
  accountability: import.meta.env.VITE_ENABLE_ACCOUNTABILITY !== 'false',
  circleMomentum: import.meta.env.VITE_ENABLE_ACCOUNTABILITY !== 'false' && import.meta.env.VITE_ENABLE_CIRCLE_MOMENTUM !== 'false',
  weeklySprints: import.meta.env.VITE_ENABLE_ACCOUNTABILITY !== 'false' && import.meta.env.VITE_ENABLE_WEEKLY_SPRINTS !== 'false',
  nudges: import.meta.env.VITE_ENABLE_ACCOUNTABILITY !== 'false' && import.meta.env.VITE_ENABLE_NUDGES !== 'false'
};
