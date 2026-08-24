import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Navbar } from './components/common/Navbar';
import { ChatSidebar } from './components/chat/ChatSidebar';
import { VideoGrid } from './components/media/VideoGrid';
import { CustomVideoPlayer } from './components/player/CustomVideoPlayer';
import { AuthModal } from './components/auth/AuthModal';
import { LandingPage } from './components/landing/LandingPage';
import { TDLibChat, VideoItem } from './types/tdlib';
import { AuthState } from './types/auth';
import { StreamRangeRequest } from './types/stream';
import { tdlibClient } from './services/tdlib/tdlibClient';
import { registerServiceWorker, setChunkProvider } from './services/serviceWorker/registerServiceWorker';
import { fetchVideoChunk } from './services/streaming/streamManager';
import { useIsMobile } from './hooks/useMediaQuery';

export const App: React.FC = () => {
  const isMobile = useIsMobile();
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  // Navigation State: 'landing' (default) vs 'player' (streamer platform)
  const [currentView, setCurrentView] = useState<'landing' | 'player'>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      if (hash === '#stream' || hash === '#player' || params.get('stream') === 'true') {
        return 'player';
      }
    }
    return 'landing';
  });

  const [authState, setAuthState] = useState<AuthState>(tdlibClient.getAuthState());
  const [chats, setChats] = useState<TDLibChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<TDLibChat | null>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState(tdlibClient.getCurrentUser());

  // Listen to URL hash changes for deep linking
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      if (hash === '#stream' || hash === '#player' || params.get('stream') === 'true') {
        setCurrentView('player');
      } else if (hash === '' || hash === '#home' || hash.startsWith('#platforms') || hash.startsWith('#features') || hash.startsWith('#ios') || hash.startsWith('#faq')) {
        setCurrentView('landing');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Update hash when view changes
  const navigateTo = (view: 'landing' | 'player', hashTarget?: string) => {
    setCurrentView(view);
    if (view === 'player') {
      window.location.hash = '#stream';
    } else {
      window.location.hash = hashTarget || '#home';
    }
  };

  // Initialize Service Worker & Chunk Bridge
  useEffect(() => {
    setChunkProvider(async (req: StreamRangeRequest) => {
      return await fetchVideoChunk(req);
    });

    registerServiceWorker();
  }, []);

  // Subscribe to TDLib Auth State
  useEffect(() => {
    const unsub = tdlibClient.subscribeAuthState((state) => {
      setAuthState(state);
      setCurrentUser(tdlibClient.getCurrentUser());
    });
    return () => unsub();
  }, []);

  // Fetch chats when authenticated and entering player view
  const loadChats = useCallback(async () => {
    if (!authState.isAuthenticated) return;
    setIsLoadingChats(true);
    try {
      const chatList = await tdlibClient.getChats();
      setChats(chatList);
      if (chatList.length > 0 && !selectedChat && !isMobile) {
        setSelectedChat(chatList[0]);
      }
    } catch (e) {
      console.error('[App] Failed to load chats', e);
    } finally {
      setIsLoadingChats(false);
    }
  }, [authState.isAuthenticated, selectedChat, isMobile]);

  // Keep desktop with a selected chat by default if available
  useEffect(() => {
    if (!isMobile && !selectedChat && chats.length > 0) {
      setSelectedChat(chats[0]);
    }
  }, [isMobile, selectedChat, chats]);

  useEffect(() => {
    if (currentView === 'player' && authState.isAuthenticated) {
      loadChats();
    }
  }, [currentView, authState.isAuthenticated, loadChats]);

  // Fetch videos when selected chat changes
  const loadVideos = useCallback(async (chat: TDLibChat) => {
    setIsLoadingVideos(true);
    try {
      const videoList = await tdlibClient.getChatVideos(chat.id, chat.title);
      setVideos(videoList);
    } catch (e) {
      console.error('[App] Failed to load chat videos', e);
      setVideos([]);
    } finally {
      setIsLoadingVideos(false);
    }
  }, []);

  useEffect(() => {
    if (selectedChat) {
      loadVideos(selectedChat);
    }
  }, [selectedChat, loadVideos]);

  const handleSelectChat = (chat: TDLibChat) => {
    setSelectedChat(chat);
  };

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await loadChats();
      if (selectedChat) {
        await loadVideos(selectedChat);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogout = async () => {
    await tdlibClient.logOut();
    setChats([]);
    setSelectedChat(null);
    setVideos([]);
    setActiveVideo(null);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile || !selectedChat) return;
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;

    // Swipe right to go back: horizontal distance > 60px and horizontally dominant
    if (deltaX > 60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      setSelectedChat(null);
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  const filteredVideos = videos.filter((v) =>
    (v.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (v.fileName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (v.caption || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* LANDING PAGE VIEW */}
      {currentView === 'landing' && (
        <LandingPage
          onLaunchWeb={() => navigateTo('player')}
          currentUser={currentUser}
          isAuthenticated={authState.isAuthenticated}
        />
      )}

      {/* STREAMER PLATFORM VIEW */}
      {currentView === 'player' && (
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          {/* Edge-to-Edge Navigation Bar */}
          <Navbar
            user={currentUser}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onLogout={handleLogout}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            onBackToHome={() => navigateTo('landing', '#home')}
          />

          {/* Authentication Modal if not logged into Telegram MTProto */}
          {!authState.isAuthenticated && (
            <AuthModal
              authState={authState}
              onBackToHome={() => navigateTo('landing', '#home')}
            />
          )}

          {/* Main Content Area */}
          {authState.isAuthenticated && (
            <main className="flex-1 relative overflow-hidden w-full">
              <div
                className={`h-full flex transition-transform duration-300 ease-out md:transition-none md:transform-none ${
                  isMobile
                    ? selectedChat
                      ? '-translate-x-1/2'
                      : 'translate-x-0'
                    : 'w-full'
                }`}
                style={{
                  width: isMobile ? '200vw' : '100%',
                }}
              >
                {/* Chat List / Sidebar */}
                <div className={`h-full ${isMobile ? 'w-[100vw]' : 'w-72 lg:w-80'} flex-shrink-0`}>
                  <ChatSidebar
                    chats={chats}
                    selectedChatId={selectedChat ? selectedChat.id : null}
                    onSelectChat={handleSelectChat}
                    isLoading={isLoadingChats}
                  />
                </div>

                {/* Video Grid View */}
                <div
                  className={`h-full ${isMobile ? 'w-[100vw]' : 'flex-1'} flex-shrink-0 md:flex-shrink flex flex-col`}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                >
                  <VideoGrid
                    videos={filteredVideos}
                    chatTitle={selectedChat ? selectedChat.title : (isMobile ? 'Select a Chat' : (chats[0]?.title || 'All Videos'))}
                    isLoading={isLoadingVideos}
                    onPlayVideo={(video) => setActiveVideo(video)}
                    onBack={isMobile ? () => setSelectedChat(null) : undefined}
                  />
                </div>
              </div>
            </main>
          )}

          {/* Active Video Player Modal */}
          {activeVideo && (
            <CustomVideoPlayer
              video={activeVideo}
              onClose={() => setActiveVideo(null)}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default App;
