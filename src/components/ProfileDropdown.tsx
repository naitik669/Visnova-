import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, MessageSquare, Bookmark, Settings, LogOut, Bell, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

interface ProfileDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileDropdown({ isOpen, onClose }: ProfileDropdownProps) {
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, setSelectedProfileId } = useStore();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      location.reload(); // Refresh to clean up listeners and state
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const menuItems = [
    { icon: User, label: 'Profile', onClick: () => { setSelectedProfileId(null); navigate('/profile'); onClose(); } },
    { icon: MessageSquare, label: 'Your Posts', onClick: () => { setSelectedProfileId(null); navigate('/profile?tab=posts'); onClose(); } },
    { icon: Bookmark, label: 'Saved', onClick: () => { setSelectedProfileId(null); navigate('/feed?tab=saved'); onClose(); } },
    { icon: Settings, label: 'Settings', onClick: () => { setSelectedProfileId(null); navigate('/settings'); onClose(); } },
    { icon: Bell, label: 'Notifications', onClick: () => { window.dispatchEvent(new Event('open-visnova-notifications')); onClose(); } },
    { icon: HelpCircle, label: 'Help / Support', onClick: () => { window.dispatchEvent(new Event('open-visnova-help')); onClose(); } },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          className="fixed left-20 bottom-6 w-64 bg-card border border-card-border rounded-[1.5rem] shadow-2xl p-2 z-[100] overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-card-border mb-1">
            <p className="text-sm font-bold text-text-main truncate">{user.name}</p>
            <p className="text-[10px] font-medium text-text-secondary opacity-50 truncate uppercase tracking-widest">@{user.username || 'user'}</p>
          </div>

          <div className="space-y-0.5">
            {menuItems.map((item, idx) => (
              <button
                key={idx}
                onClick={item.onClick}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-text-secondary hover:text-text-main hover:bg-surface-muted transition-all group"
              >
                <item.icon size={16} className="text-text-secondary/60 group-hover:text-accent transition-colors" />
                <span className="text-sm font-semibold">{item.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-1 pt-1 border-t border-card-border">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-danger hover:bg-danger/5 transition-all group"
            >
              <LogOut size={16} className="text-danger opacity-60 group-hover:opacity-100 transition-opacity" />
              <span className="text-sm font-bold">Log out</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
