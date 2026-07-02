'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setTokens as apiSetTokens } from '@/lib/api';

interface User {
  id: string;
  email: string;
  nickname: string;
  avatarUrl?: string;
  role: string;
  subscription: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      login: (user, accessToken, refreshToken) => {
        apiSetTokens(accessToken, refreshToken);
        set({ user, accessToken, refreshToken, isAuthenticated: true });
      },
      logout: () => {
        apiSetTokens('', '');
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },
      setTokens: (accessToken, refreshToken) => {
        apiSetTokens(accessToken, refreshToken);
        set({ accessToken, refreshToken });
      },
    }),
    {
      name: 'sagent-auth',
      onRehydrateStorage: () => {
        return (state) => {
          if (state?.accessToken && state?.refreshToken) {
            apiSetTokens(state.accessToken, state.refreshToken);
          }
        };
      },
    },
  ),
);

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  agentType?: string;
  timestamp: Date;
}

interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
  setStreaming: (streaming: boolean) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isStreaming: false,
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  clearMessages: () => set({ messages: [] }),
  setStreaming: (streaming) => set({ isStreaming: streaming }),
}));

interface EditorState {
  code: string;
  language: string;
  exerciseId: string | null;
  setCode: (code: string) => void;
  setLanguage: (language: string) => void;
  setExerciseId: (id: string | null) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  code: '',
  language: 'javascript',
  exerciseId: null,
  setCode: (code) => set({ code }),
  setLanguage: (language) => set({ language }),
  setExerciseId: (id) => set({ exerciseId: id }),
}));
