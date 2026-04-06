import { create } from "zustand";

export const useUserStore = create((set) => ({
  token: null,
  userId: null,
  email: null,       // optional
  nickname: null,    // optional
  setToken: (token) => set({ token }),
  setUserId: (userId) => set({ userId }),
  setUser: (user) =>
    set({
      userId: user.id,
      email: user.email,
      nickname: user.nickname,
    }),
  clearUser: () => set({ token: null, userId: null, email: null, nickname: null }),
}));
