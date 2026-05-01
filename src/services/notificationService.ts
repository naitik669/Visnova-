import { supabase } from '../lib/supabase';
import { auth } from '../lib/firebase';

export type NotificationType = 'like' | 'comment' | 'follow' | 'mention' | 'reply';

export interface NotificationPayload {
  userId: string;
  actorId: string;
  type: NotificationType;
  entityId?: string;
  content?: string;
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
          entity_id: payload.entityId,
          content: payload.content
        });

      if (error) throw error;
    } catch (err) {
      console.error('Failed to send notification:', err);
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
