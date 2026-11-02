import { create } from "zustand";

interface ToastState {
  message: string;
  type: "success" | "error" | "warning" | "info";
}

interface UIState {
  activeChannelId: string;
  setActiveChannelId: (id: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
  selectedCommentId: string | null;
  setSelectedCommentId: (id: string | null) => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  toast: ToastState | null;
  showToast: (message: string, type?: "success" | "error" | "warning" | "info") => void;
  hideToast: () => void;
  // Trigger re-fetching across routes
  refreshTrigger: number;
  triggerRefresh: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeChannelId: "", // No default - channels must be loaded from the database
  setActiveChannelId: (id) => set({ activeChannelId: id }),
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  sidebarCollapsed: false,
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleSidebarCollapsed: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  selectedCommentId: null,
  setSelectedCommentId: (id) => set({ selectedCommentId: id }),
  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  toast: null,
  showToast: (message: any, type = "success") => {
    let formattedMessage = "Notification";
    if (typeof message === "string") {
      formattedMessage = message;
    } else if (message && typeof message === "object") {
      if ("message" in message && typeof message.message === "string") {
        formattedMessage = message.message;
      } else if ("error" in message && typeof message.error === "string") {
        formattedMessage = message.error;
      } else if ("checkedCount" in message || "repliedCount" in message) {
        formattedMessage = `YouTube poll: ${message.checkedCount || 0} checked, ${message.repliedCount || 0} replied`;
      } else {
        formattedMessage = JSON.stringify(message);
      }
    } else if (message != null) {
      formattedMessage = String(message);
    }

    set({ toast: { message: formattedMessage, type } });
    // Auto-dismiss toast
    setTimeout(() => {
      set((state) => {
        if (state.toast?.message === formattedMessage) {
          return { toast: null };
        }
        return {};
      });
    }, 4000);
  },
  hideToast: () => set({ toast: null }),
  refreshTrigger: 0,
  triggerRefresh: () => set((state) => ({ refreshTrigger: state.refreshTrigger + 1 })),
}));
