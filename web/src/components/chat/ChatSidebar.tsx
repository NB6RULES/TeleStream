import React, { useEffect, useState } from 'react';
import { Bookmark, MessageSquare, Radio, Users, Film, CheckCircle, Search, X } from 'lucide-react';
import { TDLibChat } from '../../types/tdlib';
import { tdlibClient } from '../../services/tdlib/tdlibClient';

interface ChatSidebarProps {
  chats: TDLibChat[];
  selectedChatId: number | null;
  onSelectChat: (chat: TDLibChat) => void;
  isLoading: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

const ChatAvatar: React.FC<{ chat: TDLibChat; getChatIcon: (c: TDLibChat) => React.ReactNode }> = ({ chat, getChatIcon }) => {
  const [photoUrl, setPhotoUrl] = useState<string | null>(chat.photoUrl || null);
  const avatarRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (photoUrl || !avatarRef.current) return;

    let mounted = true;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          tdlibClient.getChatAvatar(chat.id).then((url) => {
            if (mounted && url) setPhotoUrl(url);
          });
          observer.disconnect();
        }
      },
      { rootMargin: '50px' }
    );

    if (avatarRef.current) {
      observer.observe(avatarRef.current);
    }

    return () => {
      mounted = false;
      observer.disconnect();
    };
  }, [chat.id, photoUrl]);

  if (photoUrl) {
    return (
      <div ref={avatarRef} className="w-full h-full">
        <img src={photoUrl} alt={chat.title} className="w-full h-full object-cover" />
      </div>
    );
  }
  return <div ref={avatarRef} className="w-full h-full flex items-center justify-center">{getChatIcon(chat)}</div>;
};

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  chats,
  selectedChatId,
  onSelectChat,
  isLoading,
  searchQuery = '',
  onSearchChange,
}) => {
  const getChatIcon = (chat: TDLibChat) => {
    if (chat.is_saved_messages || chat.title.toLowerCase().includes('saved')) {
      return <Bookmark className="w-4 h-4 text-telegram-blue" />;
    }
    if (chat.type.is_channel) {
      return <Radio className="w-4 h-4 text-purple-400" />;
    }
    if (chat.type['@type'] === 'chatTypeBasicGroup' || chat.type['@type'] === 'chatTypeSupergroup') {
      return <Users className="w-4 h-4 text-amber-400" />;
    }
    return <MessageSquare className="w-4 h-4 text-slate-400" />;
  };

  const filteredChats = chats.filter((c) =>
    (c.title || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside className="w-full h-full bg-slate-900/60 border-r border-slate-800/80 flex flex-col">
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Film className="w-4 h-4 text-telegram-blue" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Video Sources
          </h3>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-400">
          {filteredChats.length} / {chats.length} Chats
        </span>
      </div>

      {/* Desktop Search Bar in Sidebar */}
      {onSearchChange && (
        <div className="p-3 border-b border-slate-800/60 hidden md:block">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 bg-slate-800/60 border border-slate-700/50 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-telegram-blue focus:ring-1 focus:ring-telegram-blue transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 rounded-xl bg-slate-800/50 animate-pulse" />
            ))}
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            {searchQuery ? `No chats found matching "${searchQuery}"` : 'No chats found with video messages.'}
          </div>
        ) : (
          filteredChats.map((chat) => {
            const isSelected = selectedChatId === chat.id;
            return (
              <button
                key={chat.id}
                type="button"
                onClick={() => onSelectChat(chat)}
                className={`w-full text-left p-3 rounded-xl transition-all flex items-center space-x-3 cursor-pointer group ${
                  isSelected
                    ? 'bg-gradient-to-r from-telegram-blue/20 to-sky-500/10 border border-telegram-blue/30 text-white shadow-sm'
                    : 'hover:bg-slate-800/60 text-slate-300 hover:text-white border border-transparent'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 transition-colors ${
                    isSelected ? 'bg-telegram-blue/20 ring-2 ring-telegram-blue/40' : 'bg-slate-800 group-hover:bg-slate-700'
                  }`}
                >
                  <ChatAvatar chat={chat} getChatIcon={getChatIcon} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold truncate block leading-tight">
                      {chat.title}
                    </span>
                    {isSelected && (
                      <CheckCircle className="w-3.5 h-3.5 text-telegram-blue flex-shrink-0 ml-1" />
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500 truncate block mt-0.5">
                    {chat.is_saved_messages ? 'Cloud Personal Archive' : 'Telegram Chat Stream'}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
};
