import { supabase } from '../lib/supabase';

export type NotificationType = 'like' | 'save' | 'comment' | 'follow' | 'mention' | 'reply' | 'achievement' | 'nova_capsule_unlocked' | 'nudge' | 'proof_request' | 'sprint_progress' | 'sprint_completed' | 'help_reply' | 'circle_momentum' | 'encouragement';

export interface NotificationPayload {
  userId: string;
  actorId: string;
  type: NotificationType;
  postId?: string;
  commentId?: string;
  entityId?: string;
  content?: string;
  message: string;
}

export const notificationService = {
  async send(payload: NotificationPayload) {
    if (payload.userId === payload.actorId) return; // Don't notify self

    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: payload.userId,
          actor_id: payload.actorId,
          type: payload.type,
          post_id: payload.postId,
          comment_id: payload.commentId,
          entity_id: payload.entityId,
          content: payload.content,
          message: payload.message,
          is_read: false
        });

      if (error) throw error;
    } catch (err) {
      console.error('Failed to send notification via notificationService:', err);
    }
  },

  async sendMany(payloads: NotificationPayload[]) {
    const uniquePayloads = Array.from(
      new Map(
        payloads
          .filter(payload => payload.userId && payload.actorId && payload.userId !== payload.actorId)
          .map(payload => [`${payload.userId}:${payload.actorId}:${payload.type}:${payload.postId || ''}:${payload.commentId || ''}`, payload])
      ).values()
    );

    if (uniquePayloads.length === 0) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .insert(uniquePayloads.map(payload => ({
          user_id: payload.userId,
          actor_id: payload.actorId,
          type: payload.type,
          post_id: payload.postId,
          comment_id: payload.commentId,
          entity_id: payload.entityId,
          content: payload.content,
          message: payload.message,
          is_read: false
        })));

      if (error) throw error;
    } catch (err) {
      console.error('Failed to send notifications via notificationService:', err);
    }
  },

  async markAsRead(id: string) {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  },

  async markAllAsRead(userId: string) {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  }
};
