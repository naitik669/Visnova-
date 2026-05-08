import { supabase } from '../lib/supabase';

export interface TrendingTopic {
  tag: string;
  postCount: number;
  likeCount: number;
  commentCount: number;
  saveCount: number;
  score: number;
}

export interface SuggestedUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  bio?: string;
  verified?: boolean;
  reason?: string;
  score: number;
  is_following: boolean;
}

const COLD_START_TOPICS = [
  'productivity', 'study', 'coding', 'business', 'animation', 
  'fitness', 'mindset', 'growth', 'money', 'career', 'lifestyle', 'goals'
];

export async function getTrendingTopics(): Promise<TrendingTopic[]> {
  try {
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    // Fetch tags from recent posts with engagement
    const { data: tagData, error } = await supabase
      .from('post_tags')
      .select(`
        tag,
        post:posts!inner (
          id,
          likes:post_likes(count),
          comments:comments(count),
          saves:saved_posts(count),
          created_at
        )
      `)
      .gte('post.created_at', last7Days.toISOString());

    if (error) throw error;

    if (!tagData || tagData.length === 0) {
      // Cold start: return default topics
      return COLD_START_TOPICS.map(tag => ({
        tag,
        postCount: 0,
        likeCount: 0,
        commentCount: 0,
        saveCount: 0,
        score: 0
      }));
    }

    const tagStats: Record<string, { postCount: number, likes: number, comments: number, saves: number }> = {};

    tagData.forEach((item: any) => {
      const tag = item.tag.toLowerCase();
      if (!tagStats[tag]) {
        tagStats[tag] = { postCount: 0, likes: 0, comments: 0, saves: 0 };
      }
      tagStats[tag].postCount += 1;
      tagStats[tag].likes += item.post.likes[0]?.count || 0;
      tagStats[tag].comments += item.post.comments[0]?.count || 0;
      tagStats[tag].saves += item.post.saves[0]?.count || 0;
    });

    const trending = Object.entries(tagStats).map(([tag, stats]) => {
      const score = (
        stats.postCount * 0.40 +
        stats.likes * 0.25 +
        stats.comments * 0.20 +
        stats.saves * 0.15
      );
      return {
        tag,
        postCount: stats.postCount,
        likeCount: stats.likes,
        commentCount: stats.comments,
        saveCount: stats.saves,
        score: Number(score.toFixed(2))
      };
    });

    return trending.sort((a, b) => b.score - a.score).slice(0, 20);
  } catch (err) {
    console.error('Error fetching trending topics:', err);
    return COLD_START_TOPICS.map(tag => ({
      tag,
      postCount: 0,
      likeCount: 0,
      commentCount: 0,
      saveCount: 0,
      score: 0
    }));
  }
}

export async function getSuggestedUsers(currentUserId: string | null): Promise<SuggestedUser[]> {
  if (!currentUserId) return [];

  try {
    // 1. Fetch current user's interests and following list
    const [interestsRes, followsRes] = await Promise.all([
      supabase.from('user_interests').select('tag').eq('user_id', currentUserId),
      supabase.from('follows').select('following_id').eq('follower_id', currentUserId)
    ]);

    const userInterests = new Set(interestsRes.data?.map(i => i.tag.toLowerCase()) || []);
    const followingIds = new Set(followsRes.data?.map(f => f.following_id) || []);
    followingIds.add(currentUserId); // Don't suggest self

    // 2. Fetch blocks to exclude (bidirectional)
    const { data: blocks } = await supabase
      .from('blocked_users')
      .select('blocker_id, blocked_id')
      .or(`blocker_id.eq.${currentUserId},blocked_id.eq.${currentUserId}`);
    
    const blockedIds = new Set<string>();
    blocks?.forEach(b => {
      blockedIds.add(b.blocker_id === currentUserId ? b.blocked_id : b.blocker_id);
    });

    // 3. Fetch potential candidates
    // We limit and sample to avoid heavy processing
    const { data: candidates, error: candError } = await supabase
      .from('profiles')
      .select(`
        id,
        username,
        display_name,
        avatar_url,
        bio,
        interests,
        verified,
        created_at
      `)
      .not('id', 'in', `(${Array.from(followingIds).concat(Array.from(blockedIds)).join(',') || '00000000-0000-0000-0000-000000000000'})`)
      .limit(50);

    if (candError) throw candError;
    if (!candidates) return [];

    // 4. Fetch mutual connection data if possible
    // For simplicity in v1, we check if candidates follow people you follow or vice-versa
    // Optimized: get current user's following list's following list (deep join) might be too slow
    // We'll stick to a simpler "active recently" boost for v1 suggested profiles unless we have user_follows for candidates

    const scoredUsers = await Promise.all(candidates.map(async (cand) => {
      let interestMatchScore = 0;
      if (cand.interests && cand.interests.length > 0) {
        const matches = cand.interests.filter(i => userInterests.has(i.toLowerCase())).length;
        interestMatchScore = Math.min(1, matches / 3); // 3 matching interests is perfect
      }

      // Mutual connection score (placeholder for now or basic check)
      let mutualScore = 0;

      // Recent activity score (last post date)
      const { data: lastPost } = await supabase
        .from('posts')
        .select('created_at')
        .eq('user_id', cand.id)
        .eq('archived', false)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      let activityScore = 0;
      if (lastPost) {
        const daysSincePost = (Date.now() - new Date(lastPost.created_at).getTime()) / (1000 * 60 * 60 * 24);
        activityScore = Math.max(0, 1 - (daysSincePost / 30)); // 0 if no post in 30 days
      }

      // Profile completion
      const profileCompletion = (
        (cand.username ? 0.4 : 0) + 
        (cand.bio ? 0.3 : 0) + 
        (cand.avatar_url ? 0.3 : 0)
      );

      const score = (
        interestMatchScore * 0.40 +
        mutualScore * 0.25 +
        activityScore * 0.20 +
        profileCompletion * 0.15
      );

      let reason = 'New tailored match';
      if (interestMatchScore > 0.5) reason = 'Similar interests';
      else if (activityScore > 0.8) reason = 'Recently active';
      else if (profileCompletion > 0.9) reason = 'Top contributor';

      return {
        id: cand.id,
        username: cand.username || 'explorer',
        display_name: cand.display_name || cand.username || 'Explorer',
        avatar_url: cand.avatar_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${cand.id}`,
        bio: cand.bio,
        verified: !!cand.verified,
        reason,
        score: Number(score.toFixed(2)),
        is_following: false
      };
    }));

    return scoredUsers.sort((a, b) => b.score - a.score).slice(0, 10);
  } catch (err) {
    console.error('Error fetching suggested users:', err);
    return [];
  }
}
