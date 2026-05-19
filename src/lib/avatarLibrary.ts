export const VISNOVA_PROFILE_AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&backgroundColor=ffdfbf',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Jovan&backgroundColor=c0aede',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Sasha&backgroundColor=d1d4f9',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Toby&backgroundColor=b6e3f4',
  'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Gizmo&backgroundColor=ffd5dc',
  'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Beeper&backgroundColor=c0aede',
  'https://api.dicebear.com/7.x/identicon/svg?seed=Zen&backgroundColor=f1f5f9',
  'https://api.dicebear.com/7.x/shapes/svg?seed=Inspire&backgroundColor=ecfdf5',
  'https://api.dicebear.com/7.x/big-smile/svg?seed=Joy&backgroundColor=fff7ed',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=VisNova&backgroundColor=f0f9ff',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Creative&backgroundColor=fdf2f8',
] as const;

export const VISNOVA_DEFAULT_AVATAR = VISNOVA_PROFILE_AVATARS[0];

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function randomIndex() {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] % VISNOVA_PROFILE_AVATARS.length;
  }
  return Math.floor(Math.random() * VISNOVA_PROFILE_AVATARS.length);
}

export function getRandomVisNovaAvatar(seed?: string) {
  const index = seed ? hashString(seed) % VISNOVA_PROFILE_AVATARS.length : randomIndex();
  return VISNOVA_PROFILE_AVATARS[index] || VISNOVA_DEFAULT_AVATAR;
}
