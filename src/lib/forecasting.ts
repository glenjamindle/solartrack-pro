// Forecasting and schedule calculation utilities

export interface Project {
  id: string;
  name: string;
  totalPiles: number;
  totalRackingTables: number;
  totalModules: number;
  plannedStartDate: Date;
  plannedEndDate: Date;
  plannedPilesPerDay: number;
  plannedRackingPerDay: number;
  plannedModulesPerDay: number;
}

export interface ProductionEntry {
  date: Date;
  piles: number;
  rackingTables: number;
  modules: number;
}

export interface ForecastResult {
  plannedProgress: number[];
  actualProgress: number[];
  dates: string[];
  projectedCompletionDate: Date | null;
  daysVariance: number;
  scheduleHealth: 'green' | 'yellow' | 'red';
  remainingWork: {
    piles: number;
    racking: number;
    modules: number;
  };
  averageDailyProduction: {
    piles: number;
    racking: number;
    modules: number;
  };
}

export function calculateForecast(
  project: Project,
  productionEntries: ProductionEntry[]
): ForecastResult {
  const today = new Date();
  const startDate = new Date(project.plannedStartDate);
  const endDate = new Date(project.plannedEndDate);
  
  // Total project duration in days
  const totalDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  
  // Days elapsed since start
  const daysElapsed = Math.max(0, Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  
  // Calculate cumulative production
  const sortedEntries = [...productionEntries].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  let cumulativeModules = 0;
  const actualProgress: number[] = [];
  const dates: string[] = [];
  
  // Generate date array for the chart
  for (let i = 0; i <= Math.min(daysElapsed, totalDays); i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
    
    // Find production for this date
    const dayEntries = sortedEntries.filter(e => {
      const entryDate = new Date(e.date).toISOString().split('T')[0];
      return entryDate === date.toISOString().split('T')[0];
    });
    
    const dayModules = dayEntries.reduce((sum, e) => sum + e.modules, 0);
    cumulativeModules += dayModules;
    
    const progress = project.totalModules > 0 
      ? Math.min(100, (cumulativeModules / project.totalModules) * 100)
      : 0;
    actualProgress.push(progress);
  }
  
  // Calculate planned progress curve (linear for simplicity, can be enhanced)
  const plannedProgress: number[] = [];
  for (let i = 0; i <= totalDays; i++) {
    const progress = (i / totalDays) * 100;
    plannedProgress.push(progress);
  }
  
  // Calculate totals from entries
  const totalInstalled = {
    piles: productionEntries.reduce((sum, e) => sum + e.piles, 0),
    racking: productionEntries.reduce((sum, e) => sum + e.rackingTables, 0),
    modules: productionEntries.reduce((sum, e) => sum + e.modules, 0),
  };
  
  // Calculate remaining work
  const remainingWork = {
    piles: Math.max(0, project.totalPiles - totalInstalled.piles),
    racking: Math.max(0, project.totalRackingTables - totalInstalled.racking),
    modules: Math.max(0, project.totalModules - totalInstalled.modules),
  };
  
  // Calculate rolling 7-day average (or all available days if less than 7)
  const recentEntries = sortedEntries.slice(-7);
  const avgDaily = {
    piles: recentEntries.length > 0 
      ? recentEntries.reduce((sum, e) => sum + e.piles, 0) / recentEntries.length 
      : project.plannedPilesPerDay,
    racking: recentEntries.length > 0 
      ? recentEntries.reduce((sum, e) => sum + e.rackingTables, 0) / recentEntries.length 
      : project.plannedRackingPerDay,
    modules: recentEntries.length > 0 
      ? recentEntries.reduce((sum, e) => sum + e.modules, 0) / recentEntries.length 
      : project.plannedModulesPerDay,
  };
  
  // Calculate projected completion date based on remaining modules and average daily production
  let projectedCompletionDate: Date | null = null;
  let daysVariance = 0;
  
  if (avgDaily.modules > 0 && remainingWork.modules > 0) {
    const daysNeeded = Math.ceil(remainingWork.modules / avgDaily.modules);
    projectedCompletionDate = new Date(today);
    projectedCompletionDate.setDate(projectedCompletionDate.getDate() + daysNeeded);
    
    daysVariance = Math.ceil((projectedCompletionDate.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
  } else if (remainingWork.modules === 0) {
    projectedCompletionDate = today;
    daysVariance = Math.ceil((today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
  }
  
  // Determine schedule health
  let scheduleHealth: 'green' | 'yellow' | 'red';
  if (daysVariance <= 0) {
    scheduleHealth = 'green'; // On or ahead of schedule
  } else if (daysVariance <= 7) {
    scheduleHealth = 'yellow'; // Minor delay
  } else {
    scheduleHealth = 'red'; // Significant delay
  }
  
  return {
    plannedProgress,
    actualProgress,
    dates,
    projectedCompletionDate,
    daysVariance,
    scheduleHealth,
    remainingWork,
    averageDailyProduction: avgDaily,
  };
}

export function getPercentComplete(
  project: Project,
  productionEntries: ProductionEntry[]
): {
  piles: number;
  racking: number;
  modules: number;
  overall: number;
} {
  const totals = {
    piles: productionEntries.reduce((sum, e) => sum + e.piles, 0),
    racking: productionEntries.reduce((sum, e) => sum + e.rackingTables, 0),
    modules: productionEntries.reduce((sum, e) => sum + e.modules, 0),
  };
  
  const pilesPercent = project.totalPiles > 0 ? (totals.piles / project.totalPiles) * 100 : 0;
  const rackingPercent = project.totalRackingTables > 0 ? (totals.racking / project.totalRackingTables) * 100 : 0;
  const modulesPercent = project.totalModules > 0 ? (totals.modules / project.totalModules) * 100 : 0;
  
  // Weighted overall (modules typically represent most of the work)
  const overall = (pilesPercent * 0.15 + rackingPercent * 0.25 + modulesPercent * 0.6);
  
  return {
    piles: Math.round(pilesPercent * 10) / 10,
    racking: Math.round(rackingPercent * 10) / 10,
    modules: Math.round(modulesPercent * 10) / 10,
    overall: Math.round(overall * 10) / 10,
  };
}

export function getProductionStats(
  productionEntries: ProductionEntry[],
  type: 'today' | 'week' | 'month'
): { piles: number; racking: number; modules: number } {
  const today = new Date();
  let startDate: Date;
  
  switch (type) {
    case 'today':
      startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      break;
    case 'week':
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 7);
      break;
    case 'month':
      startDate = new Date(today);
      startDate.setMonth(startDate.getMonth() - 1);
      break;
  }
  
  const filteredEntries = productionEntries.filter(e => new Date(e.date) >= startDate);
  
  return {
    piles: filteredEntries.reduce((sum, e) => sum + e.piles, 0),
    racking: filteredEntries.reduce((sum, e) => sum + e.rackingTables, 0),
    modules: filteredEntries.reduce((sum, e) => sum + e.modules, 0),
  };
}
