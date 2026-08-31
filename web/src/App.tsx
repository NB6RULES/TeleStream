import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/common/Navbar';
import { ChatSidebar, SidebarFilterMode } from './components/chat/ChatSidebar';
import { VideoGrid } from './components/media/VideoGrid';
import { HistoryView } from './components/history/HistoryView';
import { SettingsView } from './components/settings/SettingsView';
import { CustomVideoPlayer } from './components/player/CustomVideoPlayer';
import { AuthModal } from './components/auth/AuthModal';
import { LandingPage } from './components/landing/LandingPage';
import { tdlibClient } from './services/tdlib/tdlibClient';
import { TDLibChat, VideoItem } from './types/tdlib';
import { AuthState } from './types/auth';
import { StreamRangeRequest } from './types/stream';
import { registerServiceWorker, setChunkProvider } from './services/serviceWorker/registerServiceWorker';
import { fetchVideoChunk } from './services/streaming/streamManager';
import { appSettingsStore, ContinueWatchingItem } from './services/storage/appSettingsStore';
import { usePwaInstall } from './utils/usePwaInstall';
import { Download, X } from 'lucide-react';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'landing' | 'player'>(() => {
    const hash = window.location.hash.toLowerCase();
    const params = new URLSearchParams(window.location.search);
    if (hash === '#stream' || hash === '#player' || params.get('stream') === 'true') {
      return 'player';
    }
    return 'landing';
  });

  const [authState, setAuthState] = useState<AuthState>(tdlibClient.getAuthState());
  const [chats, setChats] = useState<TDLibChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<TDLibChat | null>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);
  const [filterMode, setFilterMode] = useState<SidebarFilterMode>('all');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [mobileDetailActive, setMobileDetailActive] = useState(false);

  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState(tdlibClient.getCurrentUser());

  // PWA installation manager
  const { showMobileBanner, promptInstall, dismissMobileBanner } = usePwaInstall();

  // Continue Watching / Watch History Store state
  const [continueWatching, setContinueWatching] = useState<ContinueWatchingItem[]>(() =>
    appSettingsStore.getContinueWatching()
  );

  // Subscribe to Continue Watching updates
  useEffect(() => {
    const unsub = appSettingsStore.subscribe(() => {
      setContinueWatching(appSettingsStore.getContinueWatching());
    });
    return () => unsub();
  }, []);

  // Listen to URL hash changes for deep linking
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      if (hash === '#stream' || hash === '#player' || params.get('stream') === 'true') {
        setCurrentView('player');
      } else if (
        hash === '' ||
        hash === '#home' ||
        hash.startsWith('#platforms') ||
        hash.startsWith('#features') ||
        hash.startsWith('#ios') ||
        hash.startsWith('#faq')
      ) {
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

  // Fetch Chats when user is authenticated
  const loadChats = useCallback(async () => {
    if (!authState.isAuthenticated) return;
    setIsLoadingChats(true);
    try {
      const chatList = await tdlibClient.getChats();
      setChats(chatList);

      // Auto-select Saved Messages or first active chat on desktop if none selected
      if (!selectedChat && chatList.length > 0) {
        const savedMessagesChat = chatList.find((c) => c.is_saved_messages);
        const defaultChat = savedMessagesChat || chatList[0];
        setSelectedChat(defaultChat);
      }
    } catch (e) {
      console.error('[App] Failed to load Telegram chats', e);
    } finally {
      setIsLoadingChats(false);
    }
  }, [authState.isAuthenticated, selectedChat]);

  useEffect(() => {
    if (authState.isAuthenticated) {
      loadChats();
    }
  }, [authState.isAuthenticated, loadChats]);

  // Load Videos for selected chat
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
    if (filterMode === 'history') {
      setFilterMode('all');
    }
    // On mobile, tap to view chat files
    setMobileDetailActive(true);
  };

  const handleFilterModeChange = (mode: SidebarFilterMode) => {
    setFilterMode(mode);
    if (mode === 'saved') {
      const savedChat = chats.find(
        (c) => c.is_saved_messages || c.title.toLowerCase().includes('saved')
      );
      if (savedChat) {
        setSelectedChat(savedChat);
        setMobileDetailActive(true);
      }
    } else if (mode === 'history') {
      setMobileDetailActive(true);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (selectedChat) {
        await Promise.all([loadChats(), loadVideos(selectedChat)]);
      } else {
        await loadChats();
      }
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleLogout = async () => {
    await tdlibClient.logOut();
    setChats([]);
    setSelectedChat(null);
    setVideos([]);
    setActiveVideo(null);
    setIsSettingsOpen(false);
    setMobileDetailActive(false);
  };

  return (
    <div className="min-h-screen bg-[#000000] text-[#E3E2E7] flex flex-col font-sans selection:bg-[#007AFF] selection:text-white">
      {/* LANDING PAGE VIEW */}
      {currentView === 'landing' && (
        <LandingPage
          onLaunchWeb={() => navigateTo('player')}
          currentUser={currentUser}
          isAuthenticated={authState.isAuthenticated}
        />
      )}

      {/* STREAMER PLATFORM VIEW (WhatsApp Android / iOS 2-Pane Clean Layout) */}
      {currentView === 'player' && (
        <div className="flex-1 flex flex-col h-screen h-[100dvh] overflow-hidden bg-[#000000] fixed inset-0">
          {/* Edge-to-Edge Navigation Bar with Settings in Header */}
          <Navbar
            user={currentUser}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onLogout={handleLogout}
            onInstall={promptInstall}
          />

          {/* Authentication Modal if not logged into Telegram MTProto */}
          {!authState.isAuthenticated && (
            <AuthModal
              authState={authState}
              onBackToHome={() => navigateTo('landing', '#home')}
            />
          )}

          {/* Main Content Area (WhatsApp Mobile Master-Detail + Desktop 2-Pane) */}
          {authState.isAuthenticated && (
            <div className="flex-1 flex w-full h-[calc(100vh-53px)] overflow-hidden">
              {/* Chat Sidebar: Full width on mobile when !mobileDetailActive, hidden when viewing files */}
              <div
                className={`h-full ${
                  mobileDetailActive ? 'hidden md:flex' : 'flex w-full'
                } md:w-80 lg:w-96 flex-shrink-0`}
              >
                <ChatSidebar
                  chats={chats}
                  selectedChatId={selectedChat ? selectedChat.id : null}
                  onSelectChat={handleSelectChat}
                  isLoading={isLoadingChats}
                  filterMode={filterMode}
                  onFilterModeChange={handleFilterModeChange}
                  historyCount={continueWatching.length}
                />
              </div>

              {/* Main Content Area: Hidden on mobile until a chat or history is selected */}
              <main
                className={`h-full flex-1 ${
                  mobileDetailActive ? 'flex w-full' : 'hidden md:flex'
                } overflow-hidden bg-[#000000]`}
              >
                {filterMode === 'history' ? (
                  /* Watch History Screen */
                  <HistoryView
                    items={continueWatching}
                    onPlayVideo={(video) => setActiveVideo(video)}
                    onBrowseChats={() => {
                      setFilterMode('all');
                      setMobileDetailActive(false);
                    }}
                    onBack={() => {
                      setFilterMode('all');
                      setMobileDetailActive(false);
                    }}
                  />
                ) : (
                  /* Video Stream Grid for Selected Chat / Saved Messages */
                  <VideoGrid
                    videos={videos}
                    chatTitle={selectedChat ? selectedChat.title : 'All Videos'}
                    chatId={selectedChat ? selectedChat.id : null}
                    isLoading={isLoadingVideos}
                    onPlayVideo={(video) => setActiveVideo(video)}
                    continueWatchingItems={continueWatching}
                    onBack={() => setMobileDetailActive(false)}
                  />
                )}
              </main>
            </div>
          )}

          {/* iOS Settings Sheet Modal Overlay */}
          {isSettingsOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-200">
              <div className="w-full max-w-2xl h-[85vh] max-h-[800px] bg-[#121317] border border-[#292A2E] rounded-3xl overflow-hidden shadow-2xl flex flex-col">
                <SettingsView
                  user={currentUser}
                  onLogout={handleLogout}
                  onClose={() => setIsSettingsOpen(false)}
                  onInstall={promptInstall}
                />
              </div>
            </div>
          )}

          {/* Active Video Player Modal (Zero-wait Virtual Streaming) */}
          {activeVideo && (
            <CustomVideoPlayer
              video={activeVideo}
              onClose={() => setActiveVideo(null)}
            />
          )}

          {/* Floating Non-intrusive Mobile PWA Install Card */}
          {showMobileBanner && (
            <div className="fixed bottom-4 inset-x-3 z-40 sm:hidden animate-in slide-in-from-bottom-5 duration-300">
              <div className="p-3 rounded-2xl bg-[#16171B]/95 backdrop-blur-xl border border-[#007AFF]/40 shadow-2xl flex items-center justify-between gap-2.5">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-[#007AFF]/20 border border-[#007AFF]/40 flex items-center justify-center text-[#007AFF] flex-shrink-0">
                    <Download className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white tracking-tight truncate">Install TeleStream</h4>
                    <p className="text-[10px] text-[#8B90A0] truncate">Add to Home Screen for fast native streaming</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={promptInstall}
                    className="px-3 py-1.5 rounded-xl bg-[#007AFF] hover:bg-[#0062cc] text-white font-semibold text-xs transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    Install
                  </button>
                  <button
                    type="button"
                    onClick={dismissMobileBanner}
                    className="p-1.5 rounded-xl text-[#8B90A0] hover:text-white transition-colors cursor-pointer"
                    title="Dismiss"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default App;
