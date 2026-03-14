import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { upsertUserProfile } from '../lib/cloudSync';

interface AuthStore {
  user: User | null;
  isGuest: boolean;
  loading: boolean;

  // Initialise auth state from Supabase session
  init: () => Promise<void>;

  // Sign in with Google OAuth
  signInWithGoogle: () => Promise<void>;

  // Continue as guest (localStorage only)
  continueAsGuest: () => void;

  // Sign out (returns to welcome screen)
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isGuest: false,
      loading: true,

      init: async () => {
        // Check for existing Supabase session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          set({ user: session.user, isGuest: false, loading: false });
          upsertUserProfile(session.user);
        } else {
          set({ loading: false });
        }

        // Listen for auth state changes (e.g. OAuth redirect back)
        supabase.auth.onAuthStateChange((_event, session) => {
          if (session?.user) {
            // Clear guest flag when user signs in
            set({ user: session.user, isGuest: false });
            upsertUserProfile(session.user);
          } else {
            set({ user: null });
          }
        });
      },

      signInWithGoogle: async () => {
        await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin,
          },
        });
      },

      continueAsGuest: () => {
        set({ isGuest: true });
      },

      signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, isGuest: false });
      },
    }),
    {
      name: 'spades-keeper-auth',
      partialize: (state) => ({ isGuest: state.isGuest }),
    }
  )
);
