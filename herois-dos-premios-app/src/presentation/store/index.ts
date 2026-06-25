import type { User, Campaign, Coupon, Draw } from '@herois/shared';
import { create } from 'zustand';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => set({ user: null, isAuthenticated: false }),
}));

interface HomeState {
  campaigns: Campaign[];
  activeCoupons: Coupon[];
  recentDraws: Draw[];
  coinBalance: number;
  setCampaigns: (campaigns: Campaign[]) => void;
  setActiveCoupons: (coupons: Coupon[]) => void;
  setRecentDraws: (draws: Draw[]) => void;
  setCoinBalance: (balance: number) => void;
}

export const useHomeStore = create<HomeState>((set) => ({
  campaigns: [],
  activeCoupons: [],
  recentDraws: [],
  coinBalance: 0,
  setCampaigns: (campaigns) => set({ campaigns }),
  setActiveCoupons: (activeCoupons) => set({ activeCoupons }),
  setRecentDraws: (recentDraws) => set({ recentDraws }),
  setCoinBalance: (coinBalance) => set({ coinBalance }),
}));

interface PermissionsState {
  camera: boolean;
  location: boolean;
  notifications: boolean;
  setPermission: (key: keyof Omit<PermissionsState, 'setPermission'>, value: boolean) => void;
}

export const usePermissionsStore = create<PermissionsState>((set) => ({
  camera: false,
  location: false,
  notifications: false,
  setPermission: (key, value) => set({ [key]: value }),
}));
