import { create } from "zustand";

export type StatusType = "idle" | "loading" | "success" | "error";

interface StatusItem {
  id: string;
  type: StatusType;
  message: string;
  icon: "db" | "folder" | "file" | "save";
}

interface StatusState {
  statuses: StatusItem[];
  addStatus: (status: Omit<StatusItem, "id">) => void;
  removeStatus: (id: string) => void;
  /** Clears the transient "loading" toasts; success/error toasts auto-expire. */
  clearStatus: () => void;
}

export const useStatusStore = create<StatusState>((set) => ({
  statuses: [],

  addStatus: (status) =>
    set((state) => {
      const newStatus: StatusItem = {
        ...status,
        id: crypto.randomUUID(),
      };

      // Auto-remove success/error after 3 seconds
      if (status.type === "success" || status.type === "error") {
        setTimeout(() => {
          set((s) => ({
            statuses: s.statuses.filter((item) => item.id !== newStatus.id),
          }));
        }, 3000);
      }

      return {
        statuses: [newStatus, ...state.statuses].slice(0, 3),
      };
    }),

  removeStatus: (id) =>
    set((state) => ({
      statuses: state.statuses.filter((item) => item.id !== id),
    })),

  clearStatus: () =>
    set((state) => ({
      statuses: state.statuses.filter((item) => item.type !== "loading"),
    })),
}));

// Helper untuk digunakan di luar React components
export const addStatus = (status: Omit<StatusItem, "id">) => {
  useStatusStore.getState().addStatus(status);
};

export const removeStatus = (id: string) => {
  useStatusStore.getState().removeStatus(id);
};

export const clearStatus = () => {
  useStatusStore.getState().clearStatus();
};
