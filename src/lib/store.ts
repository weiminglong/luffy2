import { create } from "zustand";

interface RangeState {
  range: string;
  setRange: (r: string) => void;
}

export const useRangeStore = create<RangeState>((set) => ({
  range: "30d",
  setRange: (r: string) => set({ range: r }),
}));
