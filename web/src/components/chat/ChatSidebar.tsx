import React, { useEffect, useState, useMemo } from 'react';
import {
  Search,
  X,
  Bookmark,
  Clock,
  Users,
  Radio,
  User,
  MessageSquare,
  ChevronRight,
} from 'lucide-react';
import { TDLibChat } from '../../types/tdlib';
import { tdlibClient } from '../../services/tdlib/tdlibClient';
import { FuzzySearch } from '../../utils/fuzzySearch';

export type SidebarFilterMode = 'all' | 'saved' | 'history' | 'channels' | 'groups' | 'unread';

interface ChatSidebarProps {
  chats: TDLibChat[];
  selectedChatId: number | null;
  onSelectChat: (chat: TDLibChat) => void;
  isLoading: boolean;
  filterMode?: SidebarFilterMode;
  onFilterModeChange?: (mode: SidebarFilterMode) => void;
  historyCount?: number;
}

const ChatAvatar: React.FC<{ chat: TDLibChat }> = ({ chat }) => {
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
      { rootMargin: '100px' }
    );

    observer.observe(avatarRef.current);

    return () => {
      mounted = false;
      observer.disconnect();
    };
  }, [chat.id, photoUrl]);

  const isSaved = chat.is_saved_messages || chat.title.toLowerCase().includes('saved');

  const getFallbackIcon = () => {
    if (isSaved) return <Bookmark className="w-5 h-5 text-[#007AFF]" />;
    if (chat.type.is_channel) return <Radio className="w-5 h-5 text-[#ADC6FF]" />;
    if (chat.type['@type'] === 'chatTypeBasicGroup' || chat.type['@type'] === 'chatTypeSupergroup') {
      return <Users className="w-5 h-5 text-[#ADC6FF]" />;
    }
    return <User className="w-5 h-5 text-[#ADC6FF]" />;
  };

  const getTypeBadgeIcon = () => {
    if (isSaved) return <Bookmark className="w-2.5 h-2.5 text-white" />;
    if (chat.type.is_channel) return <Radio className="w-2.5 h-2.5 text-white" />;
    if (chat.type['@type'] === 'chatTypeBasicGroup' || chat.type['@type'] === 'chatTypeSupergroup') {
      return <Users className="w-2.5 h-2.5 text-white" />;
    }
    return <User className="w-2.5 h-2.5 text-white" />;
  };

  return (
    <div ref={avatarRef} className="relative w-12 h-12 flex-shrink-0">
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={chat.title}
          className="w-12 h-12 rounded-full object-cover shadow-sm ring-1 ring-white/10"
        />
      ) : (
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm ${
            isSaved
              ? 'bg-[#007AFF]/20 ring-1 ring-[#007AFF]/40'
              : 'bg-[#1E1F23] ring-1 ring-[#292A2E]'
          }`}
        >
          {getFallbackIcon()}
        </div>
      )}

      {/* Floating Type Badge */}
      <div
        className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center p-0.5 border-2 border-[#000000] shadow ${
          isSaved ? 'bg-[#007AFF]' : 'bg-[#343539]'
        }`}
      >
        {getTypeBadgeIcon()}
      </div>
    </div>
  );
};

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  chats,
  selectedChatId,
  onSelectChat,
  isLoading,
  filterMode = 'all',
  onFilterModeChange,
  historyCount = 0,
}) => {
  const [searchText, setSearchText] = useState('');
  const [localFilter, setLocalFilter] = useState<SidebarFilterMode>(filterMode);

  useEffect(() => {
    setLocalFilter(filterMode);
  }, [filterMode]);

  const handleFilterSelect = (mode: SidebarFilterMode) => {
    setLocalFilter(mode);
    onFilterModeChange?.(mode);
  };

  // Find Saved Messages chat
  const savedChat = useMemo(() => {
    return chats.find((c) => c.is_saved_messages || c.title.toLowerCase().includes('saved'));
  }, [chats]);

  // Count unread chats
  const unreadCount = useMemo(() => {
    return chats.filter((c) => c.unread_count > 0).length;
  }, [chats]);

  // Filter & Search Chats
  const filteredChats = useMemo(() => {
    let list = [...chats];

    // Exclude saved messages from regular list (it has its own hero card)
    list = list.filter((c) => !c.is_saved_messages && !c.title.toLowerCase().includes('saved'));

    // Apply category filter
    if (localFilter === 'channels') {
      list = list.filter((c) => c.type.is_channel);
    } else if (localFilter === 'groups') {
      list = list.filter(
        (c) =>
          c.type['@type'] === 'chatTypeBasicGroup' || c.type['@type'] === 'chatTypeSupergroup'
      );
    } else if (localFilter === 'unread') {
      list = list.filter((c) => c.unread_count > 0);
    }

    // Apply fuzzy search
    if (searchText.trim()) {
      list = list
        .filter((c) => FuzzySearch.matches(searchText, c.title))
        .sort((a, b) => FuzzySearch.score(searchText, b.title) - FuzzySearch.score(searchText, a.title));
    }

    return list;
  }, [chats, localFilter, searchText]);

  const formatLastMessageDate = (timestamp?: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    if (isYesterday) return 'Yesterday';
    return date.toLocaleDateString([], { weekday: 'short' });
  };

  return (
    <aside className="w-full md:w-80 lg:w-96 flex-shrink-0 bg-[#000000] border-r border-[#1E1F23] flex flex-col h-full overflow-hidden select-none">
      {/* Search Header (iOS / WhatsApp style) - Fixed at top */}
      <div className="p-3.5 pb-2.5 border-b border-[#1E1F23] space-y-2.5 flex-shrink-0 bg-[#000000]">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#E3E2E7] tracking-tight">Chats</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#1E1F23] text-[#ADC6FF] font-semibold">
            {chats.length}
          </span>
        </div>

        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-[#8B90A0] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full bg-[#1E1F23] text-[#E3E2E7] placeholder-[#8B90A0] text-sm pl-10 pr-9 py-2 rounded-xl border border-transparent focus:border-[#007AFF] focus:bg-[#16171B] outline-none transition-all"
          />
          {searchText && (
            <button
              type="button"
              onClick={() => setSearchText('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-[#8B90A0] hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills (All, History, Channels, Groups, Unread) - Invisible Scrollbar */}
        <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar scrollbar-none text-xs font-medium py-0.5">
          {/* All */}
          <button
            type="button"
            onClick={() => handleFilterSelect('all')}
            className={`px-2.5 py-1 rounded-full transition-all cursor-pointer whitespace-nowrap ${
              localFilter === 'all'
                ? 'bg-[#1E1F23] text-[#ADC6FF] border border-[#007AFF]/40 shadow-sm font-semibold'
                : 'text-[#8B90A0] hover:text-[#E3E2E7] hover:bg-[#16171B]'
            }`}
          >
            All
          </button>

          {/* History */}
          <button
            type="button"
            onClick={() => handleFilterSelect('history')}
            className={`px-2.5 py-1 rounded-full transition-all cursor-pointer flex items-center space-x-1 whitespace-nowrap ${
              localFilter === 'history'
                ? 'bg-[#007AFF]/20 text-[#007AFF] border border-[#007AFF]/40 font-semibold'
                : 'text-[#8B90A0] hover:text-[#E3E2E7] hover:bg-[#16171B]'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>History</span>
            {historyCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-[#007AFF] text-white text-[10px] font-bold">
                {historyCount}
              </span>
            )}
          </button>

          {/* Channels */}
          <button
            type="button"
            onClick={() => handleFilterSelect('channels')}
            className={`px-2.5 py-1 rounded-full transition-all cursor-pointer whitespace-nowrap ${
              localFilter === 'channels'
                ? 'bg-[#1E1F23] text-[#ADC6FF] border border-[#007AFF]/40 font-semibold'
                : 'text-[#8B90A0] hover:text-[#E3E2E7] hover:bg-[#16171B]'
            }`}
          >
            Channels
          </button>

          {/* Groups */}
          <button
            type="button"
            onClick={() => handleFilterSelect('groups')}
            className={`px-2.5 py-1 rounded-full transition-all cursor-pointer whitespace-nowrap ${
              localFilter === 'groups'
                ? 'bg-[#1E1F23] text-[#ADC6FF] border border-[#007AFF]/40 font-semibold'
                : 'text-[#8B90A0] hover:text-[#E3E2E7] hover:bg-[#16171B]'
            }`}
          >
            Groups
          </button>

          {/* Unread (if any) */}
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => handleFilterSelect('unread')}
              className={`px-2.5 py-1 rounded-full transition-all cursor-pointer flex items-center space-x-1 whitespace-nowrap ${
                localFilter === 'unread'
                  ? 'bg-[#1E1F23] text-[#ADC6FF] border border-[#007AFF]/40 font-semibold'
                  : 'text-[#8B90A0] hover:text-[#E3E2E7] hover:bg-[#16171B]'
              }`}
            >
              <span>Unread</span>
              <span className="px-1.5 py-0.2 rounded-full bg-[#007AFF] text-white text-[10px] font-bold">
                {unreadCount}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Special Saved Messages Card (Matching native iOS TeleStream hero card) */}
      {!searchText && localFilter !== 'history' && (
        <div className="px-3 pt-3 pb-1 flex-shrink-0">
          <div
            onClick={() => {
              if (savedChat) {
                onSelectChat(savedChat);
              }
            }}
            className={`p-3 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between group shadow-sm btn-press ${
              selectedChatId === savedChat?.id
                ? 'bg-[#007AFF]/15 border-[#007AFF]/60 ring-1 ring-[#007AFF]/30'
                : 'bg-[#16171B] hover:bg-[#1E1F23] border-[#292A2E]'
            }`}
          >
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#007AFF]/20 border border-[#007AFF]/40 flex items-center justify-center text-[#007AFF] flex-shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                <Bookmark className="w-5 h-5 fill-[#007AFF]" />
              </div>
              <div className="min-w-0">
                <h4 className="text-[15px] font-bold text-white tracking-tight truncate group-hover:text-[#ADC6FF] transition-colors">
                  Saved Messages
                </h4>
                <p className="text-[11px] text-[#8B90A0] truncate">
                  Personal cloud & video bookmarks
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#8B90A0] group-hover:text-[#ADC6FF] group-hover:translate-x-0.5 transition-all flex-shrink-0 ml-2" />
          </div>
        </div>
      )}

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#1E1F23]/60">
        {isLoading && chats.length === 0 ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center space-x-3 p-2 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-[#1E1F23]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-[#1E1F23] rounded w-3/4" />
                  <div className="h-3 bg-[#1E1F23]/60 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-3 text-[#8B90A0]">
            <MessageSquare className="w-10 h-10 stroke-[1.5] text-[#343539]" />
            <div>
              <p className="text-sm font-medium text-[#C1C6D7]">No chats found</p>
              <p className="text-xs text-[#8B90A0] mt-0.5">
                {searchText ? 'Try adjusting your search query' : 'No conversations in this filter'}
              </p>
            </div>
          </div>
        ) : (
          filteredChats.map((chat) => {
            const isSelected = selectedChatId === chat.id;

            return (
              <div
                key={chat.id}
                onClick={() => onSelectChat(chat)}
                className={`flex items-center space-x-3 px-3.5 py-3 cursor-pointer transition-colors btn-press ${
                  isSelected
                    ? 'bg-[#1E1F23]/90 border-l-3 border-[#007AFF]'
                    : 'hover:bg-[#121317] border-l-3 border-transparent'
                }`}
              >
                {/* Chat Avatar */}
                <ChatAvatar chat={chat} />

                {/* Info Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[15px] font-semibold truncate leading-tight ${
                        isSelected ? 'text-white' : 'text-[#E3E2E7]'
                      }`}
                    >
                      {chat.title}
                    </span>
                    <span className="text-[11px] text-[#8B90A0] ml-2 flex-shrink-0 font-medium">
                      {formatLastMessageDate(chat.last_message?.date)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[13px] text-[#8B90A0] truncate pr-2 leading-tight">
                      {chat.last_message?.content.video
                        ? `Video: ${chat.last_message.content.video.file_name || 'Stream'}`
                        : chat.last_message?.content.caption?.text ||
                          (chat.type.is_channel ? 'Channel broadcast' : 'Telegram conversation')}
                    </p>

                    {chat.unread_count > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-[#007AFF] text-white flex-shrink-0">
                        {chat.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
