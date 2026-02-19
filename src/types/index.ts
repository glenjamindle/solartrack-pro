// Types for the Solar Construction Platform

export type UserRole = 'admin' | 'project_manager' | 'installer' | 'qc_inspector' | 'executive';

export interface Company {
  id: string;
  name: string;
  logo?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string | null;
  avatar?: string | null;
  companyId: string;
  company?: Company;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  location: string;
  description?: string | null;
  status: 'active' | 'completed' | 'on_hold';
  totalPiles: number;
  totalRackingTables: number;
  totalModules: number;
  startDate: string;
  endDate: string;
  actualStartDate?: string | null;
  actualEndDate?: string | null;
  plannedDailyPiles: number;
  plannedDailyRacking: number;
  plannedDailyModules: number;
  companyId: string;
  company?: Company;
  createdAt: string;
  updatedAt: string;
  progress?: {
    piles: { installed: number; total: number; percentage: number };
    racking: { installed: number; total: number; percentage: number };
    modules: { installed: number; total: number; percentage: number };
    overall: number;
  };
  schedule?: {
    totalDays: number;
    elapsedDays: number;
    expectedProgress: number;
    variance: number;
    health: 'green' | 'yellow' | 'red';
    forecastedEndDate?: string;
    daysAhead?: number;
  };
  qc?: {
    total: number;
    passed: number;
    failed: number;
    passRate: number;
  };
}

export interface ProductionEntry {
  id: string;
  date: string;
  piles: number;
  rackingTables: number;
  modules: number;
  crewId?: string | null;
  crew?: Crew | null;
  subcontractorId?: string | null;
  notes?: string | null;
  photos?: string | null;
  projectId: string;
  project?: Project;
  userId: string;
  user?: User;
  synced: boolean;
  syncId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QCIssue {
  id: string;
  itemId: string;
  description: string;
  severity: 'minor' | 'major' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  resolvedAt?: string | null;
  resolution?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QCInspectionItem {
  id: string;
  inspectionId: string;
  name: string;
  measuredValue: number;
  expectedValue: number;
  tolerance: number;
  unit: string;
  result: 'pending' | 'pass' | 'fail';
  notes?: string | null;
  photoUrl?: string | null;
  issues?: QCIssue[];
  createdAt: string;
  updatedAt: string;
}

export interface QCInspection {
  id: string;
  date: string;
  category: 'piles' | 'racking' | 'modules';
  status: 'pending' | 'passed' | 'failed' | 'needs_attention';
  projectId: string;
  project?: Project;
  userId: string;
  user?: User;
  overallResult: 'pending' | 'pass' | 'fail' | 'partial';
  notes?: string | null;
  synced: boolean;
  syncId?: string | null;
  items?: QCInspectionItem[];
  createdAt: string;
  updatedAt: string;
}

export interface Subcontractor {
  id: string;
  name: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  specialty?: string | null;
  companyId: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Crew {
  id: string;
  name: string;
  foreman?: string | null;
  size: number;
  subcontractorId?: string | null;
  subcontractor?: Subcontractor | null;
  projectId: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QCToleranceTemplate {
  id: string;
  name: string;
  category: 'piles' | 'racking' | 'modules';
  description?: string | null;
  companyId?: string | null;
  projectId?: string | null;
  items: string; // JSON string
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SyncQueueItem {
  id: string;
  userId: string;
  entityType: 'production_entry' | 'inspection';
  entityId?: string | null;
  operation: 'create' | 'update' | 'delete';
  data: string;
  status: 'pending' | 'synced' | 'failed';
  attempts: number;
  lastAttempt?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Report {
  generatedAt: string;
  reportType: 'daily' | 'weekly' | 'monthly' | 'custom';
  companySummary?: {
    totalProjects: number;
    activeProjects: number;
    totalProduction: { piles: number; rackingTables: number; modules: number };
    totalInspections: number;
    totalOpenIssues: number;
  };
  projects: Array<{
    project: { id: string; name: string; location: string; status: string };
    period: { type: string; start: string; end: string };
    production: { piles: number; rackingTables: number; modules: number; entryCount: number };
    progress: { piles: { installed: number; total: number; percentage: number }; racking: { installed: number; total: number; percentage: number }; modules: { installed: number; total: number; percentage: number }; overall: number };
    qc: { total: number; passed: number; failed: number; openIssues: number };
    schedule: { startDate: string; endDate: string; plannedDailyPiles: number; plannedDailyRacking: number; plannedDailyModules: number };
  }>;
}

// Chart data types
export interface ProgressCurveDataPoint {
  date: string;
  planned: {
    progress: number;
    piles: number;
    racking: number;
    modules: number;
  };
  actual: {
    progress: number;
    piles: number;
    racking: number;
    modules: number;
  };
}

// Form types
export interface ProductionInputForm {
  date: string;
  piles: number;
  rackingTables: number;
  modules: number;
  crewId?: string;
  notes?: string;
}

export interface InspectionForm {
  date: string;
  category: 'piles' | 'racking' | 'modules';
  items: Array<{
    name: string;
    measuredValue: number;
    expectedValue: number;
    tolerance: number;
    unit: string;
    result: 'pending' | 'pass' | 'fail';
    notes?: string;
  }>;
  notes?: string;
}
