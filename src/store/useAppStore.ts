import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Project, Company, ProductionEntry, QCInspection, Crew, Subcontractor, QCToleranceTemplate } from '@/types';

// Offline queue item for local storage
interface OfflineQueueItem {
  id: string;
  type: 'production' | 'inspection';
  operation: 'create' | 'update' | 'delete';
  data: Record<string, unknown>;
  timestamp: number;
}

interface AppState {
  // Current user and company
  currentUser: User | null;
  currentCompany: Company | null;
  
  // Navigation state
  currentView: 'company' | 'project' | 'production' | 'inspection' | 'reports' | 'settings';
  selectedProjectId: string | null;
  
  // Data
  projects: Project[];
  productionEntries: ProductionEntry[];
  inspections: QCInspection[];
  crews: Crew[];
  subcontractors: Subcontractor[];
  qcTemplates: QCToleranceTemplate[];
  
  // Offline state
  isOnline: boolean;
  offlineQueue: OfflineQueueItem[];
  pendingSyncCount: number;
  
  // Loading states
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setCurrentUser: (user: User | null) => void;
  setCurrentCompany: (company: Company | null) => void;
  setCurrentView: (view: AppState['currentView']) => void;
  setSelectedProject: (projectId: string | null) => void;
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (project: Project) => void;
  setProductionEntries: (entries: ProductionEntry[]) => void;
  addProductionEntry: (entry: ProductionEntry) => void;
  setInspections: (inspections: QCInspection[]) => void;
  addInspection: (inspection: QCInspection) => void;
  setCrews: (crews: Crew[]) => void;
  setSubcontractors: (subcontractors: Subcontractor[]) => void;
  setQCTemplates: (templates: QCToleranceTemplate[]) => void;
  setIsOnline: (isOnline: boolean) => void;
  addToOfflineQueue: (item: OfflineQueueItem) => void;
  removeFromOfflineQueue: (id: string) => void;
  setPendingSyncCount: (count: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  currentUser: null,
  currentCompany: null,
  currentView: 'company' as const,
  selectedProjectId: null,
  projects: [],
  productionEntries: [],
  inspections: [],
  crews: [],
  subcontractors: [],
  qcTemplates: [],
  isOnline: true,
  offlineQueue: [],
  pendingSyncCount: 0,
  isLoading: false,
  error: null,
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...initialState,
      
      setCurrentUser: (user) => set({ currentUser: user }),
      setCurrentCompany: (company) => set({ currentCompany: company }),
      setCurrentView: (view) => set({ currentView: view }),
      setSelectedProject: (projectId) => set({ selectedProjectId: projectId }),
      
      setProjects: (projects) => set({ projects }),
      addProject: (project) => set((state) => ({ 
        projects: [...state.projects, project] 
      })),
      updateProject: (project) => set((state) => ({
        projects: state.projects.map((p) => 
          p.id === project.id ? project : p
        )
      })),
      
      setProductionEntries: (entries) => set({ productionEntries: entries }),
      addProductionEntry: (entry) => set((state) => ({ 
        productionEntries: [entry, ...state.productionEntries] 
      })),
      
      setInspections: (inspections) => set({ inspections }),
      addInspection: (inspection) => set((state) => ({ 
        inspections: [inspection, ...state.inspections] 
      })),
      
      setCrews: (crews) => set({ crews }),
      setSubcontractors: (subcontractors) => set({ subcontractors }),
      setQCTemplates: (templates) => set({ qcTemplates: templates }),
      
      setIsOnline: (isOnline) => set({ isOnline }),
      addToOfflineQueue: (item) => set((state) => ({ 
        offlineQueue: [...state.offlineQueue, item],
        pendingSyncCount: state.pendingSyncCount + 1
      })),
      removeFromOfflineQueue: (id) => set((state) => ({ 
        offlineQueue: state.offlineQueue.filter((item) => item.id !== id),
        pendingSyncCount: Math.max(0, state.pendingSyncCount - 1)
      })),
      setPendingSyncCount: (count) => set({ pendingSyncCount: count }),
      
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      
      reset: () => set(initialState),
    }),
    {
      name: 'solar-platform-storage',
      partialize: (state) => ({
        currentUser: state.currentUser,
        currentCompany: state.currentCompany,
        offlineQueue: state.offlineQueue,
        pendingSyncCount: state.pendingSyncCount,
      }),
    }
  )
);

// Selectors
export const selectCurrentProject = (state: AppState) => 
  state.projects.find((p) => p.id === state.selectedProjectId);

export const selectActiveProjects = (state: AppState) => 
  state.projects.filter((p) => p.status === 'active');

export const selectProjectEntries = (projectId: string) => (state: AppState) =>
  state.productionEntries.filter((e) => e.projectId === projectId);

export const selectProjectInspections = (projectId: string) => (state: AppState) =>
  state.inspections.filter((i) => i.projectId === projectId);
