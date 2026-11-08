import { create } from "zustand";

interface QuizUiState {
  currentIndex: number;
  revealed: Record<number, boolean>;
  setIndex: (index: number) => void;
  reveal: (index: number) => void;
  reset: () => void;
}

export const useQuizUi = create<QuizUiState>((set) => ({
  currentIndex: 0,
  revealed: {},
  setIndex: (index) => set({ currentIndex: index }),
  reveal: (index) =>
    set((state) => ({
      revealed: { ...state.revealed, [index]: true },
    })),
  reset: () => set({ currentIndex: 0, revealed: {} }),
}));
