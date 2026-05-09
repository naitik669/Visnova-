import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, MessageSquare, Bookmark, Settings, LogOut, Bell, HelpCircle, MessageCircleWarning } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';

interface ProfileDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileDropdown({ isOpen, onClose }: ProfileDropdownProps) {
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, setSelectedProfileId, signOut } = useStore();

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
      await signOut();
      onClose();
      navigate('/');
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
    { icon: MessageCircleWarning, label: 'Feedback', onClick: () => { navigate('/feedback'); onClose(); } },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          className="visnova-menu fixed left-3 right-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] sm:left-20 sm:right-auto sm:bottom-6 w-auto sm:w-72 max-h-[calc(100dvh-6rem)] overflow-y-auto custom-scrollbar p-2 z-[100]"
        >
          <div className="px-4 py-3 border-b border-card-border/70 mb-1">
            <p className="text-sm font-bold text-text-main truncate">{user.name}</p>
            <p className="text-[10px] font-medium text-text-secondary opacity-50 truncate uppercase tracking-widest">@{user.username || 'user'}</p>
          </div>

          <div className="space-y-0.5">
            {menuItems.map((item, idx) => (
              <button
                key={idx}
                onClick={item.onClick}
                className="visnova-menu-item group"
              >
                <item.icon size={16} className="text-text-secondary/60 group-hover:text-accent transition-colors" />
                <span className="text-sm font-semibold">{item.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-1 pt-1 border-t border-card-border">
            <button
              onClick={handleLogout}
              className="visnova-menu-item visnova-menu-item-danger group"
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
