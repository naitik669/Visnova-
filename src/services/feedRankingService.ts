import { Post } from '../types';

export interface RankingContext {
  userId: string | null;
  followingIds: string[];
  circleIds: Record<string, 'friend' | 'close_friend' | 'collaborator'>;
  userInterests: Record<string, number>;
}

export function rankPosts(posts: Post[], context: RankingContext): Post[] {
  const scoredPosts = posts.map(post => {
    let score = 0;

    // 1. Recency Score (25%)
    // Normalized based on hours since post, max score for 0 hours, decaying over 7 days
    const hoursOld = (Date.now() - (post.createdAt || 0)) / (1000 * 60 * 60);
    const recencyScore = Math.max(0, 1 - (hoursOld / (24 * 7))); // Linear decay over 7 days

    // 2. Engagement Score (25%)
    // Based on relative engagement in the current set
    const engagementScore = Math.min(1, (post.likes * 1 + post.comments * 2 + post.saves * 3) / 100);

    // 3. Interest Match Score (25%)
    let interestMatchScore = 0;
    if (post.tags && post.tags.length > 0) {
      const matchCount = post.tags.reduce((acc, tag) => {
        const weight = context.userInterests[tag.toLowerCase()] || 0;
        return acc + weight;
      }, 0);
      interestMatchScore = Math.min(1, matchCount / 5); // 5 tags weight sum is "perfect"
    }

    // 4. Circle Score (20%)
    let circleScore = 0;
    if (context.userId) {
      if (context.circleIds[post.userId]) {
        const type = context.circleIds[post.userId];
        if (type === 'close_friend') circleScore = 1.0;
        else if (type === 'collaborator') circleScore = 0.8;
        else if (type === 'friend') circleScore = 0.6;
      } else if (context.followingIds.includes(post.userId)) {
        circleScore = 0.3;
      }
    }

    // 5. Post Type Boost (5%)
    let typeBoost = 0;
    if (post.type === 'achievement' || post.type === 'milestone') {
      typeBoost = 1.0;
    }

    // Final weighted score
    score = (
      recencyScore * 0.25 +
      engagementScore * 0.25 +
      interestMatchScore * 0.25 +
      circleScore * 0.20 +
      typeBoost * 0.05
    );

    return { ...post, rankScore: score };
  });

  return scoredPosts.sort((a, b) => (b as any).rankScore - (a as any).rankScore);
}
