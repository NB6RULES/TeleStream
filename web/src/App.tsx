import React, { useEffect, useState, useCallback } from 'react';
import { tdlibClient } from './services/tdlib/tdlibClient';
import { AuthState } from './types/auth';
import { TDLibChat, VideoItem, TDLibUser } from './types/tdlib';
import { AuthModal } from './components/auth/AuthModal';
import { Navbar } from './components/common/Navbar';
import { ChatSidebar } from './components/chat/ChatSidebar';
import { VideoGrid } from './components/media/VideoGrid';
import { CustomVideoPlayer } from './components/player/CustomVideoPlayer';
import { registerServiceWorker, setChunkProvider } from './services/serviceWorker/registerServiceWorker';
import { StreamRangeRequest } from './types/stream';
import { fetchVideoChunk } from './services/streaming/streamManager';

export const App: React.FC = () => {
  const [authState, setAuthState] = useState<AuthState>(tdlibClient.getAuthState());
  const [currentUser, setCurrentUser] = useState<TDLibUser | null>(tdlibClient.getCurrentUser());
  const [chats, setChats] = useState<TDLibChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<TDLibChat | null>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [isServiceWorkerReady, setIsServiceWorkerReady] = useState(false);

  // Initialize Service Worker & Chunk Bridge
  useEffect(() => {
    // Register chunk provider FIRST so it's ready when the SW starts asking
    setChunkProvider(async (req: StreamRangeRequest) => {
      return await fetchVideoChunk(req);
    });

    registerServiceWorker().then((ready) => {
      setIsServiceWorkerReady(ready);
      if (!ready) {
        // SW installed but not controlling yet (first visit). It will control on next page load.
        // For now, the user can still browse chats; video playback requires one refresh.
        console.log('[App] Service Worker installed but not controlling yet. Video streaming available after refresh.');
      }
    });
  }, []);

  // Subscribe to TDLib Auth State
  useEffect(() => {
    const unsub = tdlibClient.subscribeAuthState((state) => {
      setAuthState(state);
      setCurrentUser(tdlibClient.getCurrentUser());
    });
    return () => unsub();
  }, []);

  // Fetch chats when authenticated
  const loadChats = useCallback(async () => {
    if (!authState.isAuthenticated) return;
    setIsLoadingChats(true);
    try {
      const chatList = await tdlibClient.getChats();
      setChats(chatList);
      if (chatList.length > 0 && !selectedChat) {
        setSelectedChat(chatList[0]);
      }
    } catch (e) {
      console.error('[Load Chats Error]', e);
    } finally {
      setIsLoadingChats(false);
    }
  }, [authState.isAuthenticated, selectedChat]);

  useEffect(() => {
    if (authState.isAuthenticated) {
      loadChats();
    }
  }, [authState.isAuthenticated, loadChats]);

  // Fetch videos when selected chat changes
  const loadVideos = useCallback(async () => {
    if (!selectedChat) return;
    setIsLoadingVideos(true);
    try {
      const videoList = await tdlibClient.getChatVideos(selectedChat.id, selectedChat.title);
      setVideos(videoList);
    } catch (e) {
      console.error('[Load Videos Error]', e);
    } finally {
      setIsLoadingVideos(false);
    }
  }, [selectedChat]);

  useEffect(() => {
    if (selectedChat) {
      loadVideos();
    }
  }, [selectedChat, loadVideos]);

  // Filter videos by search query
  const filteredVideos = videos.filter((v) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      v.title.toLowerCase().includes(q) ||
      v.fileName.toLowerCase().includes(q) ||
      (v.caption && v.caption.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f19] text-slate-100 selection:bg-telegram-blue selection:text-white">
      {/* Auth Modal Overlay */}
      <AuthModal authState={authState} />

      {/* Main App Layout */}
      {authState.isAuthenticated && (
        <>
          <Navbar
            user={currentUser}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onLogout={() => tdlibClient.logOut()}
            onRefresh={() => {
              loadChats();
              loadVideos();
            }}
            isRefreshing={isLoadingChats || isLoadingVideos}
            isServiceWorkerReady={isServiceWorkerReady}
          />

          <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
            <ChatSidebar
              chats={chats}
              selectedChatId={selectedChat?.id || null}
              onSelectChat={(chat) => setSelectedChat(chat)}
              isLoading={isLoadingChats}
            />

            <VideoGrid
              videos={filteredVideos}
              chatTitle={selectedChat ? selectedChat.title : 'All Videos'}
              isLoading={isLoadingVideos}
              onPlayVideo={(video) => setActiveVideo(video)}
              isChatSelected={!!selectedChat}
              onBack={() => setSelectedChat(null)}
            />
          </main>
        </>
      )}

      {/* Active Video Player Modal */}
      {activeVideo && (
        isServiceWorkerReady ? (
          <CustomVideoPlayer
            video={activeVideo}
            onClose={() => setActiveVideo(null)}
          />
        ) : (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: '#000', color: '#fff', zIndex: 9999,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
          }}>
            <h2>Streaming Engine Not Ready</h2>
            <p>The Service Worker was bypassed (likely due to a Hard Refresh).</p>
            <p>Video streaming requires the local stream interceptor.</p>
            <button 
              onClick={() => window.location.reload()}
              style={{ marginTop: '20px', padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}
            >
              Reload Page Normally
            </button>
            <button 
              onClick={() => setActiveVideo(null)}
              style={{ marginTop: '10px', padding: '10px 20px', fontSize: '16px', cursor: 'pointer', background: 'transparent', border: '1px solid #fff', color: '#fff' }}
            >
              Cancel
            </button>
          </div>
        )
      )}
    </div>
  );
};

export default App;
