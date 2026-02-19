'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { toast, Toaster } from 'sonner'
import {
  Sun, Users, Building2, MapPin, Calendar, TrendingUp, TrendingDown,
  CheckCircle, XCircle, AlertTriangle, Clock, Camera, FileText,
  Plus, BarChart3, Settings, ChevronRight, Menu, X, Upload, Download,
  Zap, Target, Award, Activity, Database, RefreshCw, LogIn, LogOut,
  Layers, Grid3X3, CircleDot, Play, Pause, Check, FileSpreadsheet
} from 'lucide-react'

// Types
interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'pm' | 'installer' | 'inspector' | 'executive'
  companyId: string
}

interface Company {
  id: string
  name: string
  slug: string
  subscription: string
  projects: Project[]
  users: User[]
  subcontractors: Subcontractor[]
  crews: Crew[]
}

interface Project {
  id: string
  name: string
  location: string
  type: string
  status: string
  totalPiles: number
  totalRackingTables: number
  totalModules: number
  plannedStartDate: string
  plannedEndDate: string
  plannedPilesPerDay: number
  plannedRackingPerDay: number
  plannedModulesPerDay: number
  productionEntries: ProductionEntry[]
  inspections: QCInspection[]
  qcIssues: QCIssue[]
}

interface ProductionEntry {
  id: string
  date: string
  piles: number
  rackingTables: number
  modules: number
  notes?: string
  user?: { id: string; name: string }
  crew?: { id: string; name: string }
  subcontractor?: { id: string; name: string }
}

interface QCInspection {
  id: string
  date: string
  category: string
  area?: string
  status: 'pass' | 'fail' | 'pending'
  notes?: string
  user?: { id: string; name: string }
  items?: QCInspectionItem[]
}

interface QCInspectionItem {
  id: string
  name: string
  measuredValue: number
  minValue: number
  maxValue: number
  unit: string
  passed: boolean
}

interface QCIssue {
  id: string
  status: string
  description: string
  category: string
  openedAt: string
}

interface Subcontractor {
  id: string
  name: string
  contactPerson?: string
}

interface Crew {
  id: string
  name: string
  leadName?: string
}

type View = 'company' | 'project' | 'production' | 'inspection' | 'reports' | 'settings'

// Demo admin user ID (matches seed data)
const DEMO_ADMIN_ID = 'demo-admin-user'

export default function SolarConstructionApp() {
  // State
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [currentView, setCurrentView] = useState<View>('company')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isOnline, setIsOnline] = useState(true)

  // Fetch data using the demo admin ID
  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(`/api/companies?userId=${DEMO_ADMIN_ID}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      if (response.ok) {
        const data = await response.json()
        setCompany(data.company)
        setUser(data.user)
      } else {
        // No data yet, need to seed
        setCompany(null)
        setUser(null)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
      setCompany(null)
    } finally {
      setLoading(false)
    }
  }, [])

  // Seed database
  const seedDatabase = async () => {
    setSeeding(true)
    try {
      // Use POST to avoid caching
      const response = await fetch('/api/seed', { 
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      const data = await response.json()
      console.log('Seed response:', data)
      if (data.alreadySeeded) {
        toast.info('Database already seeded')
      } else {
        toast.success('Database seeded successfully!')
      }
      // Refresh data after seeding
      await fetchData()
    } catch (error) {
      console.error('Seed error:', error)
      toast.error('Failed to seed database')
    } finally {
      setSeeding(false)
    }
  }

  // Initial load
  useEffect(() => {
    fetchData()

    // Network status listeners
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [fetchData])

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Sun className="w-10 h-10 text-white" />
          </div>
          <p className="text-slate-600 text-lg">Loading Solar Construction Platform...</p>
        </div>
      </div>
    )
  }

  // No company - need to seed
  if (!company) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Sun className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Welcome to SolarTrack Pro</h1>
          <p className="text-slate-600 mb-6">Construction Production & QC Platform</p>
          <button
            onClick={seedDatabase}
            disabled={seeding}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {seeding ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Setting Up Demo...
              </>
            ) : (
              <>
                <Database className="w-5 h-5" />
                Load Demo Data
              </>
            )}
          </button>
        </div>
      </div>
    )
  }

  // Calculate company-wide stats
  const companyStats = calculateCompanyStats(company)
  const todayProduction = getTodayProduction(company.projects)
  const weekProduction = getWeekProduction(company.projects)
  const monthProduction = getMonthProduction(company.projects)

  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster position="top-center" />
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-lg"
            >
              <Menu className="w-6 h-6 text-slate-600" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center">
                <Sun className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-slate-800 leading-tight">SolarTrack Pro</h1>
                <p className="text-xs text-slate-500">{company.name}</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Online/Offline indicator */}
            <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
              isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
              {isOnline ? 'Online' : 'Offline'}
            </div>
            
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
              <Users className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-700">{user?.name}</span>
              <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full capitalize">
                {user?.role}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200 z-50 transform transition-transform lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-4 border-b border-slate-200 flex items-center justify-between lg:hidden">
          <span className="font-semibold text-slate-800">Navigation</span>
          <button onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        
        <nav className="p-4 space-y-1">
          <NavItem
            icon={Building2}
            label="Company Dashboard"
            active={currentView === 'company'}
            onClick={() => { setCurrentView('company'); setSidebarOpen(false) }}
          />
          <NavItem
            icon={Target}
            label="Project Dashboard"
            active={currentView === 'project'}
            onClick={() => { setCurrentView('project'); setSidebarOpen(false) }}
            disabled={!selectedProject}
          />
          <NavItem
            icon={Plus}
            label="Input Production"
            active={currentView === 'production'}
            onClick={() => { setCurrentView('production'); setSidebarOpen(false) }}
            disabled={!selectedProject}
          />
          <NavItem
            icon={CheckCircle}
            label="QC Inspection"
            active={currentView === 'inspection'}
            onClick={() => { setCurrentView('inspection'); setSidebarOpen(false) }}
            disabled={!selectedProject}
          />
          <NavItem
            icon={FileText}
            label="Reports"
            active={currentView === 'reports'}
            onClick={() => { setCurrentView('reports'); setSidebarOpen(false) }}
            disabled={!selectedProject}
          />
          <NavItem
            icon={Settings}
            label="Settings"
            active={currentView === 'settings'}
            onClick={() => { setCurrentView('settings'); setSidebarOpen(false) }}
          />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen pb-20 lg:pb-8">
        {currentView === 'company' && (
          <CompanyDashboard
            company={company}
            stats={companyStats}
            todayProduction={todayProduction}
            weekProduction={weekProduction}
            monthProduction={monthProduction}
            onSelectProject={(project) => {
              setSelectedProject(project)
              setCurrentView('project')
            }}
          />
        )}
        
        {currentView === 'project' && selectedProject && (
          <ProjectDashboard
            project={selectedProject}
            onInputProduction={() => setCurrentView('production')}
            onCreateInspection={() => setCurrentView('inspection')}
            onViewReports={() => setCurrentView('reports')}
          />
        )}
        
        {currentView === 'production' && selectedProject && (
          <ProductionInput
            project={selectedProject}
            crews={company.crews}
            subcontractors={company.subcontractors}
            userId={user?.id || DEMO_ADMIN_ID}
            onSuccess={() => {
              toast.success('Production entry saved!')
              fetchData()
            }}
          />
        )}
        
        {currentView === 'inspection' && selectedProject && (
          <QCInspectionForm
            project={selectedProject}
            userId={user?.id || DEMO_ADMIN_ID}
            onSuccess={() => {
              toast.success('Inspection saved!')
              fetchData()
            }}
          />
        )}
        
        {currentView === 'reports' && selectedProject && (
          <ReportsView project={selectedProject} />
        )}
        
        {currentView === 'settings' && (
          <SettingsView
            company={company}
            user={user}
            onUpdate={fetchData}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 lg:hidden z-30">
        <div className="flex justify-around py-2">
          <BottomNavItem
            icon={Building2}
            label="Company"
            active={currentView === 'company'}
            onClick={() => setCurrentView('company')}
          />
          <BottomNavItem
            icon={Target}
            label="Project"
            active={currentView === 'project'}
            onClick={() => selectedProject && setCurrentView('project')}
            disabled={!selectedProject}
          />
          <BottomNavItem
            icon={Plus}
            label="Add"
            active={currentView === 'production'}
            onClick={() => selectedProject && setCurrentView('production')}
            disabled={!selectedProject}
            highlight
          />
          <BottomNavItem
            icon={CheckCircle}
            label="QC"
            active={currentView === 'inspection'}
            onClick={() => selectedProject && setCurrentView('inspection')}
            disabled={!selectedProject}
          />
          <BottomNavItem
            icon={FileText}
            label="Reports"
            active={currentView === 'reports'}
            onClick={() => selectedProject && setCurrentView('reports')}
            disabled={!selectedProject}
          />
        </div>
      </nav>
    </div>
  )
}

// Navigation Item Component
function NavItem({ icon: Icon, label, active, onClick, disabled }: {
  icon: any
  label: string
  active: boolean
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
        active
          ? 'bg-orange-50 text-orange-600 font-medium'
          : disabled
          ? 'text-slate-300 cursor-not-allowed'
          : 'text-slate-600 hover:bg-slate-50'
      }`}
    >
      <Icon className="w-5 h-5" />
      {label}
    </button>
  )
}

// Bottom Navigation Item
function BottomNavItem({ icon: Icon, label, active, onClick, disabled, highlight }: {
  icon: any
  label: string
  active: boolean
  onClick: () => void
  disabled?: boolean
  highlight?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center gap-1 px-3 py-1 ${
        disabled ? 'opacity-30' : ''
      }`}
    >
      <div className={`p-2 rounded-xl ${
        highlight
          ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white -mt-4 shadow-lg'
          : active
          ? 'text-orange-600'
          : 'text-slate-500'
      }`}>
        <Icon className="w-5 h-5" />
      </div>
      <span className={`text-xs ${active ? 'text-orange-600 font-medium' : 'text-slate-500'}`}>
        {label}
      </span>
    </button>
  )
}

// Company Dashboard Component
function CompanyDashboard({
  company,
  stats,
  todayProduction,
  weekProduction,
  monthProduction,
  onSelectProject
}: {
  company: Company
  stats: any
  todayProduction: any
  weekProduction: any
  monthProduction: any
  onSelectProject: (project: Project) => void
}) {
  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Company Dashboard</h2>
        <p className="text-slate-600">Executive overview across all projects</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Projects"
          value={stats.activeProjects}
          icon={Building2}
          color="blue"
        />
        <StatCard
          title="Modules Installed"
          value={formatNumber(stats.totalModules)}
          icon={Sun}
          color="orange"
        />
        <StatCard
          title="Company Progress"
          value={`${stats.overallProgress}%`}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          title="Open QC Issues"
          value={stats.openIssues}
          icon={AlertTriangle}
          color={stats.openIssues > 5 ? 'red' : 'yellow'}
        />
      </div>

      {/* Production Summary */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 lg:p-6">
        <h3 className="font-semibold text-slate-800 mb-4">Production Summary</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-slate-50 rounded-xl">
            <p className="text-xs text-slate-500 mb-1">Today</p>
            <p className="text-2xl font-bold text-slate-800">{formatNumber(todayProduction.modules)}</p>
            <p className="text-xs text-slate-500">modules</p>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-xl">
            <p className="text-xs text-slate-500 mb-1">This Week</p>
            <p className="text-2xl font-bold text-slate-800">{formatNumber(weekProduction.modules)}</p>
            <p className="text-xs text-slate-500">modules</p>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-xl">
            <p className="text-xs text-slate-500 mb-1">This Month</p>
            <p className="text-2xl font-bold text-slate-800">{formatNumber(monthProduction.modules)}</p>
            <p className="text-xs text-slate-500">modules</p>
          </div>
        </div>
      </div>

      {/* Project Cards */}
      <div>
        <h3 className="font-semibold text-slate-800 mb-4">Active Projects</h3>
        <div className="space-y-3">
          {company.projects.filter(p => p.status === 'active').map(project => {
            const progress = calculateProjectProgress(project)
            const health = getScheduleHealth(project)
            
            return (
              <button
                key={project.id}
                onClick={() => onSelectProject(project)}
                className="w-full bg-white rounded-2xl border border-slate-200 p-4 text-left hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-slate-800">{project.name}</h4>
                    <p className="text-sm text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {project.location}
                    </p>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    health === 'green' ? 'bg-green-100 text-green-700' :
                    health === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {health === 'green' ? 'On Track' : health === 'yellow' ? 'Minor Delay' : 'At Risk'}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-500">Overall Progress</span>
                      <span className="font-medium text-slate-800">{progress.overall}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full transition-all"
                        style={{ width: `${progress.overall}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-4 text-xs text-slate-500">
                    <span>Piles: {progress.piles}%</span>
                    <span>Racking: {progress.racking}%</span>
                    <span>Modules: {progress.modules}%</span>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-xs text-slate-500">
                      Open Issues: <span className={project.qcIssues.length > 3 ? 'text-red-600 font-medium' : ''}>{project.qcIssues.length}</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Project Dashboard Component
function ProjectDashboard({
  project,
  onInputProduction,
  onCreateInspection,
  onViewReports
}: {
  project: Project
  onInputProduction: () => void
  onCreateInspection: () => void
  onViewReports: () => void
}) {
  const progress = calculateProjectProgress(project)
  const health = getScheduleHealth(project)
  const forecast = calculateForecast(project)
  const chartData = getProgressChartData(project)

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{project.name}</h2>
            <p className="text-slate-600 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {project.location}
            </p>
          </div>
          <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${
            health === 'green' ? 'bg-green-100 text-green-700' :
            health === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'
          }`}>
            {health === 'green' ? 'On Track' : health === 'yellow' ? 'Minor Delay' : 'At Risk'}
          </div>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-3 gap-4">
        <ProgressCard
          title="Piles"
          installed={Math.round(progress.pilesInstalled)}
          total={project.totalPiles}
          percent={progress.piles}
          color="blue"
        />
        <ProgressCard
          title="Racking"
          installed={Math.round(progress.rackingInstalled)}
          total={project.totalRackingTables}
          percent={progress.racking}
          color="purple"
        />
        <ProgressCard
          title="Modules"
          installed={Math.round(progress.modulesInstalled)}
          total={project.totalModules}
          percent={progress.modules}
          color="orange"
        />
      </div>

      {/* Progress Chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 lg:p-6">
        <h3 className="font-semibold text-slate-800 mb-4">Cumulative Progress</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="plannedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" unit="%" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px'
                }}
              />
              <Area
                type="monotone"
                dataKey="planned"
                stroke="#94a3b8"
                strokeWidth={2}
                fill="url(#plannedGradient)"
                name="Planned"
              />
              <Area
                type="monotone"
                dataKey="actual"
                stroke="#f97316"
                strokeWidth={2}
                fill="url(#actualGradient)"
                name="Actual"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Forecast & QC Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Forecast */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 lg:p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Schedule Forecast</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Planned Completion</span>
              <span className="font-medium text-slate-800">
                {format(new Date(project.plannedEndDate), 'MMM d, yyyy')}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Projected Completion</span>
              <span className={`font-medium ${
                forecast.daysVariance > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {forecast.projectedDate
                  ? format(forecast.projectedDate, 'MMM d, yyyy')
                  : 'Calculating...'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Schedule Variance</span>
              <span className={`font-medium ${
                forecast.daysVariance > 0 ? 'text-red-600' :
                forecast.daysVariance < 0 ? 'text-green-600' : 'text-slate-800'
              }`}>
                {forecast.daysVariance > 0 ? `${forecast.daysVariance} days behind` :
                 forecast.daysVariance < 0 ? `${Math.abs(forecast.daysVariance)} days ahead` :
                 'On schedule'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Avg Daily Production</span>
              <span className="font-medium text-slate-800">
                {formatNumber(Math.round(forecast.avgDaily))} modules/day
              </span>
            </div>
          </div>
        </div>

        {/* QC Summary */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 lg:p-6">
          <h3 className="font-semibold text-slate-800 mb-4">QC Summary</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center p-3 bg-slate-50 rounded-xl">
              <p className="text-2xl font-bold text-slate-800">{project.inspections.length}</p>
              <p className="text-xs text-slate-500">Total Inspections</p>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-xl">
              <p className="text-2xl font-bold text-slate-800">
                {project.inspections.length > 0
                  ? Math.round((project.inspections.filter(i => i.status === 'pass').length / project.inspections.length) * 100)
                  : 100}%
              </p>
              <p className="text-xs text-slate-500">Pass Rate</p>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
            <span className="text-slate-600">Open Issues</span>
            <span className={`font-bold ${project.qcIssues.length > 3 ? 'text-red-600' : 'text-slate-800'}`}>
              {project.qcIssues.length}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={onInputProduction}
          className="bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 px-4 rounded-xl font-semibold flex flex-col items-center gap-2 shadow-lg hover:shadow-xl transition-shadow"
        >
          <Plus className="w-6 h-6" />
          <span className="text-sm">Input Production</span>
        </button>
        <button
          onClick={onCreateInspection}
          className="bg-white border-2 border-slate-200 text-slate-800 py-4 px-4 rounded-xl font-semibold flex flex-col items-center gap-2 hover:border-orange-300 hover:bg-orange-50 transition-all"
        >
          <CheckCircle className="w-6 h-6" />
          <span className="text-sm">Create Inspection</span>
        </button>
        <button
          onClick={onViewReports}
          className="bg-white border-2 border-slate-200 text-slate-800 py-4 px-4 rounded-xl font-semibold flex flex-col items-center gap-2 hover:border-orange-300 hover:bg-orange-50 transition-all"
        >
          <FileText className="w-6 h-6" />
          <span className="text-sm">View Reports</span>
        </button>
      </div>

      {/* Recent Production */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 lg:p-6">
        <h3 className="font-semibold text-slate-800 mb-4">Recent Production</h3>
        <div className="space-y-2">
          {project.productionEntries.slice(0, 5).map(entry => (
            <div key={entry.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <div>
                <p className="font-medium text-slate-800">
                  {format(new Date(entry.date), 'MMM d, yyyy')}
                </p>
                <p className="text-xs text-slate-500">{entry.user?.name || 'Unknown'}</p>
              </div>
              <div className="text-right text-sm">
                <p className="text-slate-800">
                  {entry.piles} piles • {entry.rackingTables} racking • {entry.modules} modules
                </p>
              </div>
            </div>
          ))}
          {project.productionEntries.length === 0 && (
            <p className="text-center text-slate-500 py-8">No production entries yet</p>
          )}
        </div>
      </div>
    </div>
  )
}

// Production Input Component
function ProductionInput({
  project,
  crews,
  subcontractors,
  userId,
  onSuccess
}: {
  project: Project
  crews: Crew[]
  subcontractors: Subcontractor[]
  userId: string
  onSuccess: () => void
}) {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [piles, setPiles] = useState('')
  const [racking, setRacking] = useState('')
  const [modules, setModules] = useState('')
  const [crewId, setCrewId] = useState('')
  const [subcontractorId, setSubcontractorId] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!piles && !racking && !modules) {
      toast.error('Please enter at least one value')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          piles: parseInt(piles) || 0,
          rackingTables: parseInt(racking) || 0,
          modules: parseInt(modules) || 0,
          projectId: project.id,
          userId,
          crewId: crewId || null,
          subcontractorId: subcontractorId || null,
          notes: notes || null,
        })
      })

      if (response.ok) {
        setPiles('')
        setRacking('')
        setModules('')
        setNotes('')
        onSuccess()
      } else {
        toast.error('Failed to save entry')
      }
    } catch (error) {
      toast.error('Failed to save entry')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Input Production</h2>
        <p className="text-slate-600">{project.name}</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 lg:p-6 space-y-6">
        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-lg"
          />
        </div>

        {/* Production Numbers */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <CircleDot className="w-4 h-4 inline mr-1" />
              Piles
            </label>
            <input
              type="number"
              value={piles}
              onChange={(e) => setPiles(e.target.value)}
              placeholder="0"
              className="w-full px-4 py-4 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-2xl text-center font-bold"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Grid3X3 className="w-4 h-4 inline mr-1" />
              Racking
            </label>
            <input
              type="number"
              value={racking}
              onChange={(e) => setRacking(e.target.value)}
              placeholder="0"
              className="w-full px-4 py-4 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-2xl text-center font-bold"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Sun className="w-4 h-4 inline mr-1" />
              Modules
            </label>
            <input
              type="number"
              value={modules}
              onChange={(e) => setModules(e.target.value)}
              placeholder="0"
              className="w-full px-4 py-4 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-2xl text-center font-bold"
            />
          </div>
        </div>

        {/* Crew & Subcontractor */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Crew (Optional)</label>
            <select
              value={crewId}
              onChange={(e) => setCrewId(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Select crew...</option>
              {crews.map(crew => (
                <option key={crew.id} value={crew.id}>{crew.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Subcontractor (Optional)</label>
            <select
              value={subcontractorId}
              onChange={(e) => setSubcontractorId(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Select subcontractor...</option>
              {subcontractors.map(sub => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Notes (Optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes..."
            rows={3}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
          />
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              Submit Production
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// QC Inspection Form Component
function QCInspectionForm({
  project,
  userId,
  onSuccess
}: {
  project: Project
  userId: string
  onSuccess: () => void
}) {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [category, setCategory] = useState<'piles' | 'racking' | 'modules'>('piles')
  const [area, setArea] = useState('')
  const [status, setStatus] = useState<'pass' | 'fail'>('pass')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!area) {
      toast.error('Please enter an area/row')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          category,
          area,
          status,
          notes: notes || null,
          projectId: project.id,
          userId,
          items: []
        })
      })

      if (response.ok) {
        setArea('')
        setNotes('')
        setStatus('pass')
        onSuccess()
      } else {
        toast.error('Failed to save inspection')
      }
    } catch (error) {
      toast.error('Failed to save inspection')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">QC Inspection</h2>
        <p className="text-slate-600">{project.name}</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 lg:p-6 space-y-6">
        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-lg"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
          <div className="grid grid-cols-3 gap-2">
            {(['piles', 'racking', 'modules'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`py-3 px-4 rounded-xl font-medium capitalize transition-all ${
                  category === cat
                    ? 'bg-orange-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Area */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Area / Row</label>
          <input
            type="text"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="e.g., Row 15, Block A"
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {/* Pass/Fail */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Result</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setStatus('pass')}
              className={`py-4 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                status === 'pass'
                  ? 'bg-green-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <CheckCircle className="w-5 h-5" />
              Pass
            </button>
            <button
              onClick={() => setStatus('fail')}
              className={`py-4 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                status === 'fail'
                  ? 'bg-red-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <XCircle className="w-5 h-5" />
              Fail
            </button>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add inspection notes..."
            rows={3}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              Submit Inspection
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// Reports View Component
function ReportsView({ project }: { project: Project }) {
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [loading, setLoading] = useState(false)

  const downloadCSV = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/reports?projectId=${project.id}&type=${reportType}&format=csv`)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${project.name}_${reportType}_report.csv`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('Report downloaded!')
    } catch (error) {
      toast.error('Failed to download report')
    } finally {
      setLoading(false)
    }
  }

  const progress = calculateProjectProgress(project)

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Reports</h2>
        <p className="text-slate-600">{project.name}</p>
      </div>

      {/* Report Type Selection */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 lg:p-6">
        <h3 className="font-semibold text-slate-800 mb-4">Generate Report</h3>
        <div className="grid grid-cols-3 gap-2 mb-6">
          {(['daily', 'weekly', 'monthly'] as const).map(type => (
            <button
              key={type}
              onClick={() => setReportType(type)}
              className={`py-3 px-4 rounded-xl font-medium capitalize transition-all ${
                reportType === type
                  ? 'bg-orange-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
        
        <button
          onClick={downloadCSV}
          disabled={loading}
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              Download CSV Report
            </>
          )}
        </button>
      </div>

      {/* Quick Stats */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 lg:p-6">
        <h3 className="font-semibold text-slate-800 mb-4">Quick Stats</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
            <span className="text-slate-600">Piles Progress</span>
            <span className="font-bold text-slate-800">{progress.piles}%</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
            <span className="text-slate-600">Racking Progress</span>
            <span className="font-bold text-slate-800">{progress.racking}%</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
            <span className="text-slate-600">Modules Progress</span>
            <span className="font-bold text-slate-800">{progress.modules}%</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
            <span className="text-slate-600">Overall Progress</span>
            <span className="font-bold text-orange-600">{progress.overall}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Settings View Component
function SettingsView({
  company,
  user,
  onUpdate
}: {
  company: Company
  user: User | null
  onUpdate: () => void
}) {
  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Settings</h2>
        <p className="text-slate-600">Manage your account and projects</p>
      </div>

      {/* Company Info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 lg:p-6">
        <h3 className="font-semibold text-slate-800 mb-4">Company</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
            <span className="text-slate-600">Name</span>
            <span className="font-medium text-slate-800">{company.name}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
            <span className="text-slate-600">Subscription</span>
            <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium capitalize">
              {company.subscription}
            </span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
            <span className="text-slate-600">Active Projects</span>
            <span className="font-medium text-slate-800">{company.projects.length}</span>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 lg:p-6">
        <h3 className="font-semibold text-slate-800 mb-4">Your Account</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
            <span className="text-slate-600">Name</span>
            <span className="font-medium text-slate-800">{user?.name}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
            <span className="text-slate-600">Email</span>
            <span className="font-medium text-slate-800">{user?.email}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
            <span className="text-slate-600">Role</span>
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium capitalize">
              {user?.role}
            </span>
          </div>
        </div>
      </div>

      {/* Team */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 lg:p-6">
        <h3 className="font-semibold text-slate-800 mb-4">Team Members</h3>
        <div className="space-y-2">
          {company.users.map(u => (
            <div key={u.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <span className="text-orange-600 font-medium">
                    {u.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-slate-800">{u.name}</p>
                  <p className="text-xs text-slate-500">{u.email}</p>
                </div>
              </div>
              <span className="px-2 py-1 bg-slate-200 text-slate-600 rounded-full text-xs font-medium capitalize">
                {u.role}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Stat Card Component
function StatCard({ title, value, icon: Icon, color }: {
  title: string
  value: string | number
  icon: any
  color: 'blue' | 'orange' | 'green' | 'red' | 'yellow'
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-600'
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-xl ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-sm text-slate-500">{title}</p>
    </div>
  )
}

// Progress Card Component
function ProgressCard({ title, installed, total, percent, color }: {
  title: string
  installed: number
  total: number
  percent: number
  color: 'blue' | 'purple' | 'orange'
}) {
  const colorClasses = {
    blue: 'from-blue-400 to-blue-600',
    purple: 'from-purple-400 to-purple-600',
    orange: 'from-orange-400 to-orange-600'
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
      <p className="text-sm text-slate-500 mb-2">{title}</p>
      <p className="text-2xl font-bold text-slate-800 mb-1">{percent}%</p>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full bg-gradient-to-r ${colorClasses[color]} rounded-full transition-all`}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
      <p className="text-xs text-slate-500">
        {formatNumber(installed)} / {formatNumber(total)}
      </p>
    </div>
  )
}

// Helper Functions
function calculateCompanyStats(company: Company) {
  const activeProjects = company.projects.filter(p => p.status === 'active').length
  const totalPiles = company.projects.reduce((sum, p) => sum + p.totalPiles, 0)
  const totalRacking = company.projects.reduce((sum, p) => sum + p.totalRackingTables, 0)
  const totalModules = company.projects.reduce((sum, p) => sum + p.totalModules, 0)
  const installedPiles = company.projects.reduce((sum, p) => 
    sum + p.productionEntries.reduce((s, e) => s + e.piles, 0), 0
  )
  const installedRacking = company.projects.reduce((sum, p) => 
    sum + p.productionEntries.reduce((s, e) => s + e.rackingTables, 0), 0
  )
  const installedModules = company.projects.reduce((sum, p) => 
    sum + p.productionEntries.reduce((s, e) => s + e.modules, 0), 0
  )
  const openIssues = company.projects.reduce((sum, p) => sum + p.qcIssues.length, 0)

  const overallProgress = totalModules > 0 
    ? Math.round((installedModules / totalModules) * 100)
    : 0

  return {
    activeProjects,
    totalPiles: installedPiles,
    totalRacking: installedRacking,
    totalModules: installedModules,
    overallProgress,
    openIssues
  }
}

function getTodayProduction(projects: Project[]) {
  const today = format(new Date(), 'yyyy-MM-dd')
  return projects.reduce((sum, p) => {
    const todayEntries = p.productionEntries.filter(e => 
      format(new Date(e.date), 'yyyy-MM-dd') === today
    )
    return {
      piles: sum.piles + todayEntries.reduce((s, e) => s + e.piles, 0),
      racking: sum.racking + todayEntries.reduce((s, e) => s + e.rackingTables, 0),
      modules: sum.modules + todayEntries.reduce((s, e) => s + e.modules, 0)
    }
  }, { piles: 0, racking: 0, modules: 0 })
}

function getWeekProduction(projects: Project[]) {
  const today = new Date()
  const weekStart = subDays(today, 7)
  
  return projects.reduce((sum, p) => {
    const weekEntries = p.productionEntries.filter(e => {
      const date = new Date(e.date)
      return date >= weekStart && date <= today
    })
    return {
      piles: sum.piles + weekEntries.reduce((s, e) => s + e.piles, 0),
      racking: sum.racking + weekEntries.reduce((s, e) => s + e.rackingTables, 0),
      modules: sum.modules + weekEntries.reduce((s, e) => s + e.modules, 0)
    }
  }, { piles: 0, racking: 0, modules: 0 })
}

function getMonthProduction(projects: Project[]) {
  const today = new Date()
  const monthStart = subDays(today, 30)
  
  return projects.reduce((sum, p) => {
    const monthEntries = p.productionEntries.filter(e => {
      const date = new Date(e.date)
      return date >= monthStart && date <= today
    })
    return {
      piles: sum.piles + monthEntries.reduce((s, e) => s + e.piles, 0),
      racking: sum.racking + monthEntries.reduce((s, e) => s + e.rackingTables, 0),
      modules: sum.modules + monthEntries.reduce((s, e) => s + e.modules, 0)
    }
  }, { piles: 0, racking: 0, modules: 0 })
}

function calculateProjectProgress(project: Project) {
  const installedPiles = project.productionEntries.reduce((sum, e) => sum + e.piles, 0)
  const installedRacking = project.productionEntries.reduce((sum, e) => sum + e.rackingTables, 0)
  const installedModules = project.productionEntries.reduce((sum, e) => sum + e.modules, 0)

  const piles = project.totalPiles > 0 ? Math.round((installedPiles / project.totalPiles) * 100) : 0
  const racking = project.totalRackingTables > 0 ? Math.round((installedRacking / project.totalRackingTables) * 100) : 0
  const modules = project.totalModules > 0 ? Math.round((installedModules / project.totalModules) * 100) : 0

  return {
    piles,
    racking,
    modules,
    overall: Math.round(piles * 0.15 + racking * 0.25 + modules * 0.6),
    pilesInstalled: installedPiles,
    rackingInstalled: installedRacking,
    modulesInstalled: installedModules
  }
}

function getScheduleHealth(project: Project): 'green' | 'yellow' | 'red' {
  const progress = calculateProjectProgress(project)
  const today = new Date()
  const start = new Date(project.plannedStartDate)
  const end = new Date(project.plannedEndDate)
  
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  const daysElapsed = Math.max(0, Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
  
  const expectedProgress = Math.min(100, (daysElapsed / totalDays) * 100)
  const variance = expectedProgress - progress.overall
  
  if (variance <= 0) return 'green'
  if (variance <= 5) return 'yellow'
  return 'red'
}

function calculateForecast(project: Project) {
  const today = new Date()
  const start = new Date(project.plannedStartDate)
  const end = new Date(project.plannedEndDate)
  
  const progress = calculateProjectProgress(project)
  const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
  const daysElapsed = Math.max(0, Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
  
  const avgDaily = daysElapsed > 0 ? progress.modulesInstalled / daysElapsed : project.plannedModulesPerDay
  const remaining = project.totalModules - progress.modulesInstalled
  const daysNeeded = avgDaily > 0 ? Math.ceil(remaining / avgDaily) : 0
  
  const projectedDate = new Date(today)
  projectedDate.setDate(projectedDate.getDate() + daysNeeded)
  
  const daysVariance = Math.ceil((projectedDate.getTime() - end.getTime()) / (1000 * 60 * 60 * 24))

  return {
    projectedDate: projectedDate > start ? projectedDate : null,
    daysVariance: projectedDate > start ? daysVariance : 0,
    avgDaily
  }
}

function getProgressChartData(project: Project) {
  const start = new Date(project.plannedStartDate)
  const end = new Date(project.plannedEndDate)
  const today = new Date()
  
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  const daysElapsed = Math.min(totalDays, Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
  
  const data = []
  let cumulativeModules = 0
  
  const sortedEntries = [...project.productionEntries].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )
  
  for (let i = 0; i <= Math.min(daysElapsed, totalDays); i += Math.max(1, Math.floor(totalDays / 20))) {
    const date = new Date(start)
    date.setDate(date.getDate() + i)
    
    // Find all entries up to this date
    const entriesUpToDate = sortedEntries.filter(e => new Date(e.date) <= date)
    cumulativeModules = entriesUpToDate.reduce((sum, e) => sum + e.modules, 0)
    
    const plannedProgress = (i / totalDays) * 100
    const actualProgress = project.totalModules > 0 
      ? (cumulativeModules / project.totalModules) * 100 
      : 0
    
    data.push({
      date: format(date, 'MMM d'),
      planned: Math.round(plannedProgress),
      actual: Math.round(actualProgress)
    })
  }
  
  return data
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}
