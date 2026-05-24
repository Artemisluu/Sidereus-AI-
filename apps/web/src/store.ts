import { create } from "zustand"

interface AppStore {
  theme: "light" | "dark"
  viewMode: "table" | "card"
  globalError: string
  setTheme: (theme: "light" | "dark") => void
  toggleTheme: () => void
  setViewMode: (mode: "table" | "card") => void
  setGlobalError: (error: string) => void
}

const initialTheme = (localStorage.getItem("sidereus-theme") as "light" | "dark" | null) ?? "light"

export const useAppStore = create<AppStore>((set) => ({
  theme: initialTheme,
  viewMode: "table",
  globalError: "",
  setTheme: (theme) => {
    localStorage.setItem("sidereus-theme", theme)
    set({ theme })
  },
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === "light" ? "dark" : "light"
      localStorage.setItem("sidereus-theme", next)
      return { theme: next }
    }),
  setViewMode: (viewMode) => set({ viewMode }),
  setGlobalError: (globalError) => set({ globalError }),
}))
