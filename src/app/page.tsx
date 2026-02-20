'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, isWithinInterval, parseISO } from 'date-fns'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from 'recharts'
import { toast, Toaster } from 'sonner'
import {
  Sun, Users, Building2, MapPin, Calendar, TrendingUp, TrendingDown,
  CheckCircle, XCircle, AlertTriangle, Clock, Camera, FileText,
  Plus, BarChart3, Settings, ChevronRight, Menu, X, Upload, Download,
  Zap, Target, Award, Activity, Database, RefreshCw, Moon, MoreVertical,
  Layers, Grid3X3, CircleDot, Play, Pause, Check, FileSpreadsheet, AlertCircle,
  Edit, Archive, PlayCircle, Ban, RotateCcw, Trash2, Copy, ChevronDown,
  Hammer, Wrench, Eye, FileWarning, Mic, MicOff, ChevronLeft, ChevronRight as ChevronRightIcon, List, Image as ImageIcon
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
  logo?: string
  primaryColor?: string
  projects: Project[]
  users: User[]
  subcontractors: Subcontractor[]
  crews: Crew[]
  rackingSystems: RackingSystem[]
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
  pileIdFormat?: string
  rackingSystemId?: string
  rackingSystem?: RackingSystem
  productionEntries: ProductionEntry[]
  inspections: QCInspection[]
  qcIssues: QCIssue[]
  refusals: PileRefusal[]
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
  scope?: string
  scopeCount?: number
  pileIds?: string
  pileType?: string
  area?: string
  status: 'pass' | 'fail' | 'pending'
  notes?: string
  user?: { id: string; name: string }
  items?: QCInspectionItem[]
}

interface QCInspectionItem {
  id: string
  pileId?: string
  measurementType: string
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
  pileId?: string
  openedAt: string
}

interface PileRefusal {
  id: string
  pileId: string
  block?: string
  row?: string
  pileNumber?: string
  dateDiscovered: string
  targetDepth: number
  achievedDepth: number
  refusalReason: string
  refusalNotes?: string
  status: string
  remediationMethod?: string
  remediationDate?: string
  engineerApproval?: string
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

interface RackingSystem {
  id: string
  name: string
  manufacturer: string
  version?: string
  interiorTolerances?: string
  exteriorTolerances?: string
  motorTolerances?: string
}

type View = 'company' | 'project' | 'production' | 'inspection' | 'refusal' | 'reports' | 'analytics' | 'settings' | 'newProject'

// Photo interface for documentation
interface Photo {
  id: string
  dataUrl: string
  timestamp: string
  context?: string // e.g., pile ID
  latitude?: number
  longitude?: number
}

// Photo Capture Component - Reusable across all input modules
function PhotoCapture({ photos, onAddPhoto, onRemovePhoto, context, darkMode }: {
  photos: Photo[]
  onAddPhoto: (photo: Photo) => void
  onRemovePhoto: (photoId: string) => void
  context?: string
  darkMode: boolean
}) {
  const [showCamera, setShowCamera] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Start camera
  const startCamera = async () => {
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setShowCamera(true)
    } catch (err: any) {
      setCameraError(err.message || 'Camera access denied')
      toast.error('Could not access camera')
    }
  }

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setShowCamera(false)
  }

  // Create photo object with location
  const createPhoto = async (dataUrl: string): Promise<Photo> => {
    // Get location if available
    let latitude: number | undefined
    let longitude: number | undefined
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 2000 })
      })
      latitude = position.coords.latitude
      longitude = position.coords.longitude
    } catch {
      // Location not available, continue without it
    }
    
    return {
      id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      dataUrl,
      timestamp: new Date().toISOString(),
      context,
      latitude,
      longitude
    }
  }

  // Capture photo from camera
  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return
    
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    ctx.drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
    
    const photo = await createPhoto(dataUrl)
    onAddPhoto(photo)
    stopCamera()
    
    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(50)
    toast.success('Photo captured!')
  }

  // Handle gallery/file selection
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return
    
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      
      try {
        const reader = new FileReader()
        reader.onload = async (e) => {
          const dataUrl = e.target?.result as string
          if (dataUrl) {
            // Resize image if too large
            const resizedDataUrl = await resizeImage(dataUrl, 1280, 720)
            const photo = await createPhoto(resizedDataUrl)
            onAddPhoto(photo)
            if (navigator.vibrate) navigator.vibrate(50)
            toast.success('Photo added!')
          }
        }
        reader.readAsDataURL(file)
      } catch (err) {
        toast.error('Failed to load image')
      }
    }
    
    // Reset file input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Resize image to reasonable size
  const resizeImage = (dataUrl: string, maxWidth: number, maxHeight: number): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img
        
        // Scale down if needed
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width *= ratio
          height *= ratio
        }
        
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)
        
        resolve(canvas.toDataURL('image/jpeg', 0.8))
      }
      img.src = dataUrl
    })
  }

  // Open gallery selector
  const openGallery = () => {
    fileInputRef.current?.click()
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  return (
    <div className="space-y-3">
      {/* Hidden file input for gallery */}
      <input 
        ref={fileInputRef}
        type="file" 
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
      
      {/* Photo gallery */}
      {photos.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {photos.map(photo => (
            <div key={photo.id} className="relative flex-shrink-0">
              <img 
                src={photo.dataUrl} 
                alt="Captured" 
                className="w-20 h-20 rounded-lg object-cover border-2 border-slate-200 dark:border-slate-600"
              />
              <button
                onClick={() => onRemovePhoto(photo.id)}
                className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold hover:bg-red-600"
              >
                ×
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 rounded-b-lg text-center truncate">
                {format(new Date(photo.timestamp), 'HH:mm:ss')}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Camera view */}
      {showCamera ? (
        <div className="relative rounded-xl overflow-hidden bg-black">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full aspect-video object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />
          
          {/* Camera controls */}
          <div className="absolute bottom-0 left-0 right-0 p-4 flex justify-center gap-4 bg-gradient-to-t from-black/80 to-transparent">
            <button
              onClick={stopCamera}
              className="px-4 py-2 bg-slate-600 text-white rounded-full font-medium"
            >
              Cancel
            </button>
            <button
              onClick={capturePhoto}
              className="px-6 py-3 bg-white text-slate-800 rounded-full font-bold flex items-center gap-2"
            >
              <Camera className="w-5 h-5" />
              Capture
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={startCamera}
            className={`py-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
              darkMode 
                ? 'bg-slate-700 text-slate-300 hover:bg-slate-600 border-2 border-dashed border-slate-500' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-2 border-dashed border-slate-300'
            }`}
          >
            <Camera className="w-5 h-5" />
            Take Photo
          </button>
          <button
            onClick={openGallery}
            className={`py-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
              darkMode 
                ? 'bg-slate-700 text-slate-300 hover:bg-slate-600 border-2 border-dashed border-slate-500' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-2 border-dashed border-slate-300'
            }`}
          >
            <ImageIcon className="w-5 h-5" />
            Gallery
          </button>
        </div>
      )}

      {/* Camera error */}
      {cameraError && (
        <p className="text-sm text-red-500 text-center">{cameraError}</p>
      )}

      {/* Photo count */}
      {photos.length > 0 && (
        <p className={`text-xs text-center ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          {photos.length} photo{photos.length !== 1 ? 's' : ''} attached
          {context && ` • ${context}`}
        </p>
      )}
    </div>
  )
}

const DEMO_ADMIN_ID = 'demo-admin-user'

export default function SolarConstructionApp() {
  // Theme state
  const [darkMode, setDarkMode] = useState(false)
  
  // Data state
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  
  // View state
  const [currentView, setCurrentView] = useState<View>('company')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  
  // Modal state
  const [editProjectModal, setEditProjectModal] = useState(false)
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  
  // Report date state
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [reportDate, setReportDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [reportWeekStart, setReportWeekStart] = useState(format(startOfWeek(new Date()), 'yyyy-MM-dd'))
  const [reportMonth, setReportMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [includeQC, setIncludeQC] = useState(true)

  // Dark mode effect
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setDarkMode(true)
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
    if (darkMode) {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    } else {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    }
  }

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(`/api/companies?userId=${DEMO_ADMIN_ID}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })
      if (response.ok) {
        const data = await response.json()
        setCompany(data.company)
        setUser(data.user)
      } else {
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
      const response = await fetch('/api/seed', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })
      const data = await response.json()
      if (data.alreadySeeded) {
        toast.info('Database already seeded')
      } else {
        toast.success('Database seeded successfully!')
      }
      await fetchData()
    } catch (error) {
      console.error('Seed error:', error)
      toast.error('Failed to seed database')
    } finally {
      setSeeding(false)
    }
  }

  // Project actions
  const updateProjectStatus = async (projectId: string, status: string) => {
    try {
      await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: projectId, status })
      })
      toast.success(`Project ${status === 'active' ? 'reopened' : status}`)
      fetchData()
    } catch (error) {
      toast.error('Failed to update project')
    }
    setActiveDropdown(null)
  }

  // Initial load
  useEffect(() => {
    fetchData()
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [fetchData])

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = () => setActiveDropdown(null)
    if (activeDropdown) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [activeDropdown])

  // Loading state
  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-slate-900' : 'bg-gradient-to-br from-slate-50 to-slate-100'}`}>
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Sun className="w-10 h-10 text-white" />
          </div>
          <p className={`text-lg ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Loading SolarTrack Pro...</p>
        </div>
      </div>
    )
  }

  // No company - need to seed
  if (!company) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${darkMode ? 'bg-slate-900' : 'bg-gradient-to-br from-slate-50 to-slate-100'}`}>
        <div className={`rounded-3xl shadow-xl p-8 max-w-md w-full text-center ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
          <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Sun className="w-12 h-12 text-white" />
          </div>
          <h1 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>Welcome to SolarTrack Pro</h1>
          <p className={`mb-6 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Construction Production & QC Platform</p>
          <button
            onClick={seedDatabase}
            disabled={seeding}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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

  const companyStats = calculateCompanyStats(company)
  const todayProduction = getTodayProduction(company.projects)
  const weekProduction = getWeekProduction(company.projects)
  const monthProduction = getMonthProduction(company.projects)

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <Toaster position="top-center" />
      
      {/* Header */}
      <header className={`sticky top-0 z-50 border-b ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
              <Menu className={`w-6 h-6 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`} />
            </button>
            <div className="flex items-center gap-2">
              {company.logo ? (
                <img src={company.logo} alt={company.name} className="w-10 h-10 rounded-xl object-cover" />
              ) : (
                <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center">
                  <Sun className="w-6 h-6 text-white" />
                </div>
              )}
              <div>
                <h1 className={`font-bold leading-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>SolarTrack Pro</h1>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{company.name}</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
              isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
              {isOnline ? 'Online' : 'Offline'}
            </div>
            
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            
            <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
              <Users className={`w-4 h-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
              <span className={`text-sm ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{user?.name}</span>
              <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full capitalize">{user?.role}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar Navigation */}
      <aside className={`fixed top-0 left-0 h-full w-64 z-50 transform transition-transform lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-r`}>
        <div className={`p-4 border-b flex items-center justify-between lg:hidden ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <span className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Navigation</span>
          <button onClick={() => setSidebarOpen(false)}>
            <X className={`w-5 h-5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
          </button>
        </div>
        
        <nav className="p-4 space-y-1">
          <NavItem icon={Building2} label="Company Dashboard" active={currentView === 'company'} darkMode={darkMode}
            onClick={() => { setCurrentView('company'); setSidebarOpen(false) }} />
          <NavItem icon={Target} label="Project Dashboard" active={currentView === 'project'} darkMode={darkMode}
            onClick={() => { if (selectedProject) setCurrentView('project'); setSidebarOpen(false) }} disabled={!selectedProject} />
          <NavItem icon={Plus} label="Input Production" active={currentView === 'production'} darkMode={darkMode}
            onClick={() => { if (selectedProject) setCurrentView('production'); setSidebarOpen(false) }} disabled={!selectedProject} />
          <NavItem icon={CheckCircle} label="QC Inspection" active={currentView === 'inspection'} darkMode={darkMode}
            onClick={() => { if (selectedProject) setCurrentView('inspection'); setSidebarOpen(false) }} disabled={!selectedProject} />
          <NavItem icon={AlertCircle} label="Refusals" active={currentView === 'refusal'} darkMode={darkMode}
            onClick={() => { if (selectedProject) setCurrentView('refusal'); setSidebarOpen(false) }} disabled={!selectedProject} />
          <NavItem icon={BarChart3} label="Analytics" active={currentView === 'analytics'} darkMode={darkMode}
            onClick={() => { if (selectedProject) setCurrentView('analytics'); setSidebarOpen(false) }} disabled={!selectedProject} />
          <NavItem icon={FileText} label="Reports" active={currentView === 'reports'} darkMode={darkMode}
            onClick={() => { if (selectedProject) setCurrentView('reports'); setSidebarOpen(false) }} disabled={!selectedProject} />
          <NavItem icon={Settings} label="Settings" active={currentView === 'settings'} darkMode={darkMode}
            onClick={() => { setCurrentView('settings'); setSidebarOpen(false) }} />
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
            darkMode={darkMode}
            activeDropdown={activeDropdown}
            setActiveDropdown={setActiveDropdown}
            onSelectProject={(project) => { setSelectedProject(project); setCurrentView('project') }}
            onEditProject={(project) => { setProjectToEdit(project); setEditProjectModal(true) }}
            onUpdateStatus={updateProjectStatus}
            onNewProject={() => setCurrentView('newProject')}
          />
        )}
        
        {currentView === 'project' && selectedProject && (
          <ProjectDashboard
            project={selectedProject}
            darkMode={darkMode}
            onInputProduction={() => setCurrentView('production')}
            onCreateInspection={() => setCurrentView('inspection')}
            onViewRefusals={() => setCurrentView('refusal')}
            onViewReports={() => setCurrentView('reports')}
          />
        )}
        
        {currentView === 'production' && selectedProject && (
          <ProductionInput
            project={selectedProject}
            crews={company.crews}
            subcontractors={company.subcontractors}
            userId={user?.id || DEMO_ADMIN_ID}
            darkMode={darkMode}
            onSuccess={() => { toast.success('Production entry saved!'); fetchData() }}
          />
        )}
        
        {currentView === 'inspection' && selectedProject && (
          <QCInspectionForm
            project={selectedProject}
            rackingSystems={company.rackingSystems}
            userId={user?.id || DEMO_ADMIN_ID}
            darkMode={darkMode}
            onSuccess={() => { toast.success('Inspection saved!'); fetchData() }}
          />
        )}

        {currentView === 'refusal' && selectedProject && (
          <RefusalModule
            project={selectedProject}
            userId={user?.id || DEMO_ADMIN_ID}
            darkMode={darkMode}
            onSuccess={() => { toast.success('Refusal logged!'); fetchData() }}
          />
        )}
        
        {currentView === 'reports' && selectedProject && (
          <ReportsView
            project={selectedProject}
            darkMode={darkMode}
            reportType={reportType}
            setReportType={setReportType}
            reportDate={reportDate}
            setReportDate={setReportDate}
            reportWeekStart={reportWeekStart}
            setReportWeekStart={setReportWeekStart}
            reportMonth={reportMonth}
            setReportMonth={setReportMonth}
            includeQC={includeQC}
            setIncludeQC={setIncludeQC}
          />
        )}

        {currentView === 'analytics' && selectedProject && (
          <AnalyticsDashboard
            project={selectedProject}
            darkMode={darkMode}
          />
        )}

        {currentView === 'newProject' && (
          <NewProjectForm
            company={company}
            darkMode={darkMode}
            onSuccess={() => { toast.success('Project created!'); fetchData(); setCurrentView('company') }}
            onCancel={() => setCurrentView('company')}
          />
        )}
        
        {currentView === 'settings' && (
          <SettingsView
            company={company}
            user={user}
            darkMode={darkMode}
            onUpdate={fetchData}
          />
        )}
      </main>

      {/* Floating Action Button for New Project */}
      {currentView === 'company' && (
        <button
          onClick={() => setCurrentView('newProject')}
          className="fixed bottom-24 lg:bottom-8 right-4 w-14 h-14 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full shadow-lg flex items-center justify-center hover:from-orange-600 hover:to-orange-700 transition-all z-30"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className={`fixed bottom-0 left-0 right-0 border-t lg:hidden z-30 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="flex justify-around py-2">
          <BottomNavItem icon={Building2} label="Company" active={currentView === 'company'} darkMode={darkMode}
            onClick={() => setCurrentView('company')} />
          <BottomNavItem icon={Target} label="Project" active={currentView === 'project'} darkMode={darkMode}
            onClick={() => selectedProject && setCurrentView('project')} disabled={!selectedProject} />
          <BottomNavItem icon={Plus} label="Add" active={currentView === 'production'} darkMode={darkMode}
            onClick={() => selectedProject && setCurrentView('production')} disabled={!selectedProject} highlight />
          <BottomNavItem icon={CheckCircle} label="QC" active={currentView === 'inspection'} darkMode={darkMode}
            onClick={() => selectedProject && setCurrentView('inspection')} disabled={!selectedProject} />
          <BottomNavItem icon={FileText} label="Reports" active={currentView === 'reports'} darkMode={darkMode}
            onClick={() => selectedProject && setCurrentView('reports')} disabled={!selectedProject} />
        </div>
      </nav>

      {/* Edit Project Modal */}
      {editProjectModal && projectToEdit && (
        <EditProjectModal
          project={projectToEdit}
          rackingSystems={company.rackingSystems}
          darkMode={darkMode}
          onClose={() => { setEditProjectModal(false); setProjectToEdit(null) }}
          onSave={async (data) => {
            try {
              await fetch('/api/projects', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
              })
              toast.success('Project updated!')
              setEditProjectModal(false)
              setProjectToEdit(null)
              fetchData()
            } catch (error) {
              toast.error('Failed to update project')
            }
          }}
        />
      )}
    </div>
  )
}

// Navigation Item Component
function NavItem({ icon: Icon, label, active, onClick, disabled, darkMode }: {
  icon: any; label: string; active: boolean; onClick: () => void; disabled?: boolean; darkMode: boolean
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
        active ? 'bg-orange-50 text-orange-600 font-medium' :
        disabled ? 'text-slate-300 cursor-not-allowed' :
        darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-50'
      }`}>
      <Icon className="w-5 h-5" />
      {label}
    </button>
  )
}

// Bottom Navigation Item
function BottomNavItem({ icon: Icon, label, active, onClick, disabled, highlight, darkMode }: {
  icon: any; label: string; active: boolean; onClick: () => void; disabled?: boolean; highlight?: boolean; darkMode: boolean
}) {
  return (
    <button onClick={onClick} disabled={disabled} className={`flex flex-col items-center gap-1 px-3 py-1 ${disabled ? 'opacity-30' : ''}`}>
      <div className={`p-2 rounded-xl ${
        highlight ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white -mt-4 shadow-lg' :
        active ? 'text-orange-600' : darkMode ? 'text-slate-400' : 'text-slate-500'
      }`}>
        <Icon className="w-5 h-5" />
      </div>
      <span className={`text-xs ${active ? 'text-orange-600 font-medium' : darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{label}</span>
    </button>
  )
}

// Company Dashboard Component
function CompanyDashboard({
  company, stats, todayProduction, weekProduction, monthProduction, darkMode,
  activeDropdown, setActiveDropdown, onSelectProject, onEditProject, onUpdateStatus, onNewProject
}: {
  company: Company; stats: any; todayProduction: any; weekProduction: any; monthProduction: any; darkMode: boolean;
  activeDropdown: string | null; setActiveDropdown: (id: string | null) => void;
  onSelectProject: (project: Project) => void; onEditProject: (project: Project) => void;
  onUpdateStatus: (projectId: string, status: string) => void; onNewProject: () => void;
}) {
  const allProjects = company.projects || []
  
  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Company Dashboard</h2>
        <p className={darkMode ? 'text-slate-400' : 'text-slate-600'}>Executive overview across all projects</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Projects" value={stats.activeProjects} icon={Building2} color="blue" darkMode={darkMode} />
        <StatCard title="Modules Installed" value={formatNumber(stats.totalModules)} icon={Sun} color="orange" darkMode={darkMode} />
        <StatCard title="Company Progress" value={`${stats.overallProgress}%`} icon={TrendingUp} color="green" darkMode={darkMode} />
        <StatCard title="Open Issues" value={stats.openIssues} icon={AlertTriangle} color={stats.openIssues > 5 ? 'red' : 'yellow'} darkMode={darkMode} />
      </div>

      <div className={`rounded-2xl border p-4 lg:p-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <h3 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-slate-800'}`}>Production Summary</h3>
        <div className="grid grid-cols-3 gap-4">
          {[{ label: 'Today', data: todayProduction }, { label: 'This Week', data: weekProduction }, { label: 'This Month', data: monthProduction }].map(({ label, data }) => (
            <div key={label} className={`text-center p-4 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
              <p className={`text-xs mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{label}</p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{formatNumber(data.modules)}</p>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>modules</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-800'}`}>All Projects</h3>
          <button
            onClick={onNewProject}
            className="flex items-center gap-1 text-sm text-orange-600 hover:text-orange-700"
          >
            <Plus className="w-4 h-4" /> New Project
          </button>
        </div>
        <div className="space-y-3">
          {allProjects.map(project => {
            const progress = calculateProjectProgress(project)
            const health = getScheduleHealth(project)
            
            return (
              <div key={project.id} className={`relative rounded-2xl border p-4 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className="flex items-start justify-between mb-3">
                  <button onClick={() => onSelectProject(project)} className="text-left flex-1">
                    <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{project.name}</h4>
                    <p className={`text-sm flex items-center gap-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      <MapPin className="w-3 h-3" />{project.location}
                    </p>
                  </button>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      project.status === 'active' ? 'bg-green-100 text-green-700' :
                      project.status === 'on-hold' ? 'bg-yellow-100 text-yellow-700' :
                      project.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {project.status === 'on-hold' ? 'On Hold' : project.status}
                    </span>
                    <div className="relative">
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === project.id ? null : project.id) }}
                        className={`p-1.5 rounded-lg ${darkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {activeDropdown === project.id && (
                        <div onClick={(e) => e.stopPropagation()} className={`absolute right-0 top-8 w-48 rounded-xl shadow-lg border z-50 ${
                          darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'
                        }`}>
                          <button onClick={() => { onEditProject(project); setActiveDropdown(null) }}
                            className={`w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm ${darkMode ? 'text-slate-200 hover:bg-slate-600' : 'text-slate-700 hover:bg-slate-50'}`}>
                            <Edit className="w-4 h-4" /> Edit Project
                          </button>
                          {project.status === 'active' && (
                            <button onClick={() => onUpdateStatus(project.id, 'on-hold')}
                              className={`w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm ${darkMode ? 'text-slate-200 hover:bg-slate-600' : 'text-slate-700 hover:bg-slate-50'}`}>
                              <Ban className="w-4 h-4" /> Put On Hold
                            </button>
                          )}
                          {project.status === 'active' && (
                            <button onClick={() => onUpdateStatus(project.id, 'completed')}
                              className={`w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm ${darkMode ? 'text-slate-200 hover:bg-slate-600' : 'text-slate-700 hover:bg-slate-50'}`}>
                              <CheckCircle className="w-4 h-4" /> Mark Complete
                            </button>
                          )}
                          {(project.status === 'completed' || project.status === 'archived') && (
                            <button onClick={() => onUpdateStatus(project.id, 'active')}
                              className={`w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm ${darkMode ? 'text-slate-200 hover:bg-slate-600' : 'text-slate-700 hover:bg-slate-50'}`}>
                              <RotateCcw className="w-4 h-4" /> Reopen Project
                            </button>
                          )}
                          {project.status !== 'archived' && project.status !== 'completed' && (
                            <button onClick={() => onUpdateStatus(project.id, 'archived')}
                              className={`w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm ${darkMode ? 'text-slate-200 hover:bg-slate-600' : 'text-slate-700 hover:bg-slate-50'}`}>
                              <Archive className="w-4 h-4" /> Archive Project
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <button onClick={() => onSelectProject(project)} className="w-full text-left">
                  <div className="mb-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Overall Progress</span>
                      <span className={`font-medium ${darkMode ? 'text-white' : 'text-slate-800'}`}>{progress.overall}%</span>
                    </div>
                    <div className={`h-2 rounded-full overflow-hidden ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                      <div className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full transition-all" style={{ width: `${progress.overall}%` }} />
                    </div>
                  </div>
                  
                  <div className={`flex gap-4 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    <span>Piles: {progress.piles}%</span>
                    <span>Racking: {progress.racking}%</span>
                    <span>Modules: {progress.modules}%</span>
                  </div>
                  
                  <div className={`flex items-center justify-between pt-2 mt-2 border-t ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                    <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Open Issues: <span className={project.qcIssues?.length > 3 ? 'text-red-600 font-medium' : ''}>{project.qcIssues?.length || 0}</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      health === 'green' ? 'bg-green-100 text-green-700' :
                      health === 'yellow' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {health === 'green' ? 'On Track' : health === 'yellow' ? 'Minor Delay' : 'At Risk'}
                    </span>
                  </div>
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Project Dashboard Component
function ProjectDashboard({ project, darkMode, onInputProduction, onCreateInspection, onViewRefusals, onViewReports }: {
  project: Project; darkMode: boolean;
  onInputProduction: () => void; onCreateInspection: () => void; onViewRefusals: () => void; onViewReports: () => void;
}) {
  const progress = calculateProjectProgress(project)
  const health = getScheduleHealth(project)
  const forecast = calculateForecast(project)
  const recovery = calculateRecovery(project)
  const chartData = useMemo(() => getProgressChartData(project), [project])
  const openRefusals = project.refusals?.filter(r => r.status === 'open').length || 0

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <div className="flex items-start justify-between">
          <div>
            <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{project.name}</h2>
            <p className={`flex items-center gap-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              <MapPin className="w-4 h-4" />{project.location}
            </p>
            {project.rackingSystem && (
              <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Racking: {project.rackingSystem.name}
              </p>
            )}
          </div>
          <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
            health === 'green' ? 'bg-green-100 text-green-700' :
            health === 'yellow' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
          }`}>
            {health === 'green' ? 'On Track' : health === 'yellow' ? 'Minor Delay' : 'At Risk'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <ProgressCard title="Piles" installed={Math.round(progress.pilesInstalled)} total={project.totalPiles}
          percent={progress.piles} color="blue" darkMode={darkMode} />
        <ProgressCard title="Racking" installed={Math.round(progress.rackingInstalled)} total={project.totalRackingTables}
          percent={progress.racking} color="purple" darkMode={darkMode} />
        <ProgressCard title="Modules" installed={Math.round(progress.modulesInstalled)} total={project.totalModules}
          percent={progress.modules} color="orange" darkMode={darkMode} />
      </div>

      {/* Progress Chart */}
      <div className={`rounded-2xl border p-4 lg:p-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <h3 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-slate-800'}`}>Cumulative Progress</h3>
        {chartData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="plannedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e2e8f0'} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke={darkMode ? '#64748b' : '#94a3b8'} />
                <YAxis tick={{ fontSize: 11 }} stroke={darkMode ? '#64748b' : '#94a3b8'} unit="%" />
                <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1e293b' : 'white', border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`, borderRadius: '8px' }} />
                <Legend />
                <Area type="monotone" dataKey="planned" stroke="#94a3b8" strokeWidth={2} fill="url(#plannedGradient)" name="Planned %" />
                <Area type="monotone" dataKey="actual" stroke="#f97316" strokeWidth={2} fill="url(#actualGradient)" name="Actual %" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className={`h-64 flex items-center justify-center ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            <div className="text-center">
              <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No production data yet</p>
              <p className="text-sm">Start entering production to see progress</p>
            </div>
          </div>
        )}
      </div>

      {/* Forecast & Recovery */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={`rounded-2xl border p-4 lg:p-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <h3 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-slate-800'}`}>Schedule Forecast</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>Planned Completion</span>
              <span className={`font-medium ${darkMode ? 'text-white' : 'text-slate-800'}`}>{format(new Date(project.plannedEndDate), 'MMM d, yyyy')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>Projected Completion</span>
              <span className={`font-medium ${forecast.daysVariance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {forecast.projectedDate ? format(forecast.projectedDate, 'MMM d, yyyy') : 'Calculating...'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>Schedule Variance</span>
              <span className={`font-medium ${
                forecast.daysVariance > 0 ? 'text-red-600' : forecast.daysVariance < 0 ? 'text-green-600' : darkMode ? 'text-white' : 'text-slate-800'
              }`}>
                {forecast.daysVariance > 0 ? `${forecast.daysVariance} days behind` :
                 forecast.daysVariance < 0 ? `${Math.abs(forecast.daysVariance)} days ahead` : 'On schedule'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>Avg Daily Production</span>
              <span className={`font-medium ${darkMode ? 'text-white' : 'text-slate-800'}`}>{formatNumber(Math.round(forecast.avgDaily))} modules/day</span>
            </div>
          </div>
          
          {/* Recovery quantities */}
          {forecast.daysVariance > 0 && recovery.neededDaily > 0 && (
            <div className={`mt-4 p-3 rounded-xl ${darkMode ? 'bg-red-900/30 border border-red-800' : 'bg-red-50 border border-red-200'}`}>
              <p className={`text-sm font-medium ${darkMode ? 'text-red-400' : 'text-red-700'}`}>
                To catch up by deadline:
              </p>
              <p className={`text-lg font-bold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                Need {recovery.neededDaily} modules/day
              </p>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Current: {recovery.currentDaily} modules/day
              </p>
            </div>
          )}
        </div>

        <div className={`rounded-2xl border p-4 lg:p-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <h3 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-slate-800'}`}>QC Summary</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className={`text-center p-3 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{project.inspections?.length || 0}</p>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total Inspections</p>
            </div>
            <div className={`text-center p-3 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                {project.inspections?.length > 0 ? Math.round((project.inspections.filter(i => i.status === 'pass').length / project.inspections.length) * 100) : 100}%
              </p>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Pass Rate</p>
            </div>
          </div>
          <div className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
            <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>Open Issues</span>
            <span className={`font-bold ${project.qcIssues?.length > 3 ? 'text-red-600' : darkMode ? 'text-white' : 'text-slate-800'}`}>
              {project.qcIssues?.length || 0}
            </span>
          </div>
          {openRefusals > 0 && (
            <div className={`mt-2 flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-orange-900/30' : 'bg-orange-50'}`}>
              <span className={darkMode ? 'text-orange-400' : 'text-orange-700'}>Open Refusals</span>
              <span className={`font-bold ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>{openRefusals}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ActionButton icon={Plus} label="Input Production" onClick={onInputProduction} primary />
        <ActionButton icon={CheckCircle} label="QC Inspection" onClick={onCreateInspection} darkMode={darkMode} />
        <ActionButton icon={AlertCircle} label={`Refusals${openRefusals > 0 ? ` (${openRefusals})` : ''}`} onClick={onViewRefusals} darkMode={darkMode} />
        <ActionButton icon={FileText} label="Reports" onClick={onViewReports} darkMode={darkMode} />
      </div>

      {/* Recent Production */}
      <div className={`rounded-2xl border p-4 lg:p-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <h3 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-slate-800'}`}>Recent Production</h3>
        <div className="space-y-2">
          {project.productionEntries?.slice(0, 5).map(entry => (
            <div key={entry.id} className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
              <div>
                <p className={`font-medium ${darkMode ? 'text-white' : 'text-slate-800'}`}>{format(new Date(entry.date), 'MMM d, yyyy')}</p>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{entry.user?.name || 'Unknown'}</p>
              </div>
              <div className={`text-right text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                <p>{entry.piles} piles • {entry.rackingTables} racking • {entry.modules} modules</p>
              </div>
            </div>
          ))}
          {(!project.productionEntries || project.productionEntries.length === 0) && (
            <p className={`text-center py-8 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>No production entries yet</p>
          )}
        </div>
      </div>
    </div>
  )
}

// Action Button Component
function ActionButton({ icon: Icon, label, onClick, primary, darkMode }: {
  icon: any; label: string; onClick: () => void; primary?: boolean; darkMode?: boolean
}) {
  return (
    <button onClick={onClick}
      className={primary
        ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 px-4 rounded-xl font-semibold flex flex-col items-center gap-2 shadow-lg hover:shadow-xl transition-shadow'
        : `${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-slate-200 text-slate-800'} border-2 py-4 px-4 rounded-xl font-semibold flex flex-col items-center gap-2 hover:border-orange-300 hover:bg-orange-50 transition-all`
      }>
      <Icon className="w-6 h-6" />
      <span className="text-sm text-center">{label}</span>
    </button>
  )
}

// Production Input Component
function ProductionInput({ project, crews, subcontractors, userId, darkMode, onSuccess }: {
  project: Project; crews: Crew[]; subcontractors: Subcontractor[]; userId: string; darkMode: boolean; onSuccess: () => void;
}) {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [piles, setPiles] = useState('')
  const [racking, setRacking] = useState('')
  const [modules, setModules] = useState('')
  const [crewId, setCrewId] = useState('')
  const [subcontractorId, setSubcontractorId] = useState('')
  const [notes, setNotes] = useState('')
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!piles && !racking && !modules) { toast.error('Please enter at least one value'); return }
    setLoading(true)
    try {
      const response = await fetch('/api/production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date, piles: parseInt(piles) || 0, rackingTables: parseInt(racking) || 0, modules: parseInt(modules) || 0,
          projectId: project.id, userId, crewId: crewId || null, subcontractorId: subcontractorId || null, 
          notes: notes || null,
          photos: photos.length > 0 ? JSON.stringify(photos) : null,
        })
      })
      if (response.ok) { setPiles(''); setRacking(''); setModules(''); setNotes(''); setPhotos([]); onSuccess() }
      else { toast.error('Failed to save entry') }
    } catch { toast.error('Failed to save entry') }
    finally { setLoading(false) }
  }

  const addPhoto = (photo: Photo) => setPhotos(prev => [...prev, photo])
  const removePhoto = (photoId: string) => setPhotos(prev => prev.filter(p => p.id !== photoId))

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Input Production</h2>
        <p className={darkMode ? 'text-slate-400' : 'text-slate-600'}>{project.name}</p>
      </div>

      <div className={`rounded-2xl border p-4 lg:p-6 space-y-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-lg ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200'}`} />
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Piles', value: piles, setter: setPiles, icon: CircleDot },
            { label: 'Racking', value: racking, setter: setRacking, icon: Grid3X3 },
            { label: 'Modules', value: modules, setter: setModules, icon: Sun },
          ].map(({ label, value, setter, icon: Icon }) => (
            <div key={label}>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                <Icon className="w-4 h-4 inline mr-1" />{label}
              </label>
              <input type="number" value={value} onChange={(e) => setter(e.target.value)} placeholder="0"
                className={`w-full px-4 py-4 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-2xl text-center font-bold ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200'}`} />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Crew (Optional)</label>
            <select value={crewId} onChange={(e) => setCrewId(e.target.value)}
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200'}`}>
              <option value="">Select crew...</option>
              {crews.map(crew => <option key={crew.id} value={crew.id}>{crew.name}</option>)}
            </select>
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Subcontractor (Optional)</label>
            <select value={subcontractorId} onChange={(e) => setSubcontractorId(e.target.value)}
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200'}`}>
              <option value="">Select subcontractor...</option>
              {subcontractors.map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Notes (Optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add any notes..." rows={3}
            className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200'}`} />
        </div>

        {/* Photo Documentation */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            <Camera className="w-4 h-4 inline mr-1" />Photo Documentation (Optional)
          </label>
          <PhotoCapture 
            photos={photos} 
            onAddPhoto={addPhoto} 
            onRemovePhoto={removePhoto} 
            context={format(new Date(date), 'yyyy-MM-dd')}
            darkMode={darkMode} 
          />
        </div>

        <button onClick={handleSubmit} disabled={loading}
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
          {loading ? <><RefreshCw className="w-5 h-5 animate-spin" />Saving...</> : <><Check className="w-5 h-5" />Submit Production</>}
        </button>
      </div>
    </div>
  )
}

// QC Inspection Form Component - Redesigned for field use
function QCInspectionForm({ project, rackingSystems, userId, darkMode, onSuccess }: {
  project: Project; rackingSystems: RackingSystem[]; userId: string; darkMode: boolean; onSuccess: () => void;
}) {
  // Mode state
  const [mode, setMode] = useState<'quick' | 'detailed' | 'batch'>('quick')
  
  // Quick mode state - minimal input
  const [currentRow, setCurrentRow] = useState(1)
  const [currentPile, setCurrentPile] = useState(1)
  const [pileType, setPileType] = useState<'interior' | 'exterior' | 'motor'>('interior')
  const [category, setCategory] = useState<'piles' | 'racking' | 'modules'>('piles')
  
  // Batch mode state
  const [batchStartRow, setBatchStartRow] = useState(1)
  const [batchEndRow, setBatchEndRow] = useState(10)
  const [batchStatus, setBatchStatus] = useState<'pass' | 'fail'>('pass')
  
  // Detailed mode state
  const [pileIds, setPileIds] = useState('')
  const [area, setArea] = useState('')
  const [notes, setNotes] = useState('')
  
  // Voice input state
  const [isListening, setIsListening] = useState(false)
  const [voiceTarget, setVoiceTarget] = useState<'pile' | 'notes' | null>(null)
  const recognitionRef = useRef<any>(null)
  
  // Stats
  const [inspectedCount, setInspectedCount] = useState(0)
  const [passCount, setPassCount] = useState(0)
  const [failCount, setFailCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [lastAction, setLastAction] = useState<{pileId: string, status: string} | null>(null)
  
  // Photos for current inspection
  const [photos, setPhotos] = useState<Photo[]>([])
  
  // Get pile ID format from project
  const pileIdFormat = project.pileIdFormat || '{Row}-{Pile}'
  
  // Generate current pile ID based on format
  const generatePileId = (row: number, pile: number) => {
    return pileIdFormat
      .replace('{Row}', String(row))
      .replace('{Pile}', String(pile))
      .replace('{Block}', 'A') // Default block
  }
  
  const currentPileId = generatePileId(currentRow, currentPile)
  
  // Quick inspection save
  const quickInspect = async (status: 'pass' | 'fail') => {
    setLoading(true)
    try {
      const response = await fetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date().toISOString(),
          category,
          scope: 'individual',
          pileType,
          pileIds: JSON.stringify([currentPileId]),
          area: `Row ${currentRow}`,
          status,
          notes: null,
          projectId: project.id,
          userId,
          items: [],
          photos: photos.length > 0 ? JSON.stringify(photos) : null,
        })
      })
      
      if (response.ok) {
        setInspectedCount(c => c + 1)
        if (status === 'pass') setPassCount(c => c + 1)
        else setFailCount(c => c + 1)
        setLastAction({ pileId: currentPileId, status })
        
        // Auto-advance to next pile
        setCurrentPile(p => p + 1)
        setPhotos([]) // Clear photos after submission
        
        // Haptic feedback if available
        if (navigator.vibrate) navigator.vibrate(status === 'pass' ? 50 : [50, 50, 50])
        
        onSuccess()
      } else {
        toast.error('Failed to save')
      }
    } catch {
      toast.error('Failed to save')
    } finally {
      setLoading(false)
    }
  }
  
  // Batch inspection
  const batchInspect = async () => {
    setLoading(true)
    const pileIdsList = []
    for (let r = batchStartRow; r <= batchEndRow; r++) {
      for (let p = 1; p <= 10; p++) { // Assume 10 piles per row
        pileIdsList.push(generatePileId(r, p))
      }
    }
    
    try {
      const response = await fetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date().toISOString(),
          category,
          scope: 'batch',
          scopeCount: pileIdsList.length,
          pileType,
          pileIds: JSON.stringify(pileIdsList),
          area: `Rows ${batchStartRow}-${batchEndRow}`,
          status: batchStatus,
          notes: null,
          projectId: project.id,
          userId,
          items: []
        })
      })
      
      if (response.ok) {
        const count = pileIdsList.length
        setInspectedCount(c => c + count)
        if (batchStatus === 'pass') setPassCount(c => c + count)
        else setFailCount(c => c + count)
        toast.success(`Marked ${count} piles as ${batchStatus}`)
        onSuccess()
      } else {
        toast.error('Failed to save batch')
      }
    } catch {
      toast.error('Failed to save batch')
    } finally {
      setLoading(false)
    }
  }
  
  // Voice input setup
  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        if (voiceTarget === 'pile') {
          // Parse spoken pile ID
          const match = transcript.match(/(\d+)\s*(?:dash|minus|hyphen)?\s*(\d+)/i)
          if (match) {
            setCurrentRow(parseInt(match[1]))
            setCurrentPile(parseInt(match[2]))
          }
        } else if (voiceTarget === 'notes') {
          setNotes(transcript)
        }
        setIsListening(false)
        setVoiceTarget(null)
      }
      
      recognitionRef.current.onerror = () => {
        setIsListening(false)
        setVoiceTarget(null)
        toast.error('Voice recognition failed')
      }
    }
  }, [voiceTarget])
  
  const startVoiceInput = (target: 'pile' | 'notes') => {
    if (recognitionRef.current) {
      setVoiceTarget(target)
      setIsListening(true)
      recognitionRef.current.start()
    } else {
      toast.error('Voice input not supported')
    }
  }
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (mode === 'quick') {
        if (e.key === 'p' || e.key === 'P' || e.key === ' ') {
          e.preventDefault()
          quickInspect('pass')
        } else if (e.key === 'f' || e.key === 'F') {
          e.preventDefault()
          quickInspect('fail')
        } else if (e.key === 'ArrowRight') {
          setCurrentPile(p => p + 1)
        } else if (e.key === 'ArrowLeft') {
          setCurrentPile(p => Math.max(1, p - 1))
        } else if (e.key === 'ArrowUp') {
          setCurrentRow(r => r + 1)
        } else if (e.key === 'ArrowDown') {
          setCurrentRow(r => Math.max(1, r - 1))
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mode, currentRow, currentPile, category, pileType])
  
  // Undo last action
  const undoLast = () => {
    if (lastAction) {
      // In a real app, we'd call an API to delete/reverse
      setInspectedCount(c => Math.max(0, c - 1))
      if (lastAction.status === 'pass') setPassCount(c => Math.max(0, c - 1))
      else setFailCount(c => Math.max(0, c - 1))
      setLastAction(null)
      toast.success('Undone')
    }
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>QC Inspection</h2>
          <p className={darkMode ? 'text-slate-400' : 'text-slate-600'}>{project.name}</p>
        </div>
        <div className="flex gap-2 text-sm">
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-medium">{passCount} Pass</span>
          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full font-medium">{failCount} Fail</span>
        </div>
      </div>
      
      {/* Mode selector */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { id: 'quick', label: 'Quick', icon: Zap },
          { id: 'batch', label: 'Batch', icon: List },
          { id: 'detailed', label: 'Detailed', icon: FileText }
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setMode(id as any)}
            className={`py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
              mode === id ? 'bg-orange-500 text-white' : darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>
      
      {/* QUICK MODE - Giant buttons for field use */}
      {mode === 'quick' && (
        <div className={`rounded-2xl border p-4 lg:p-6 space-y-4 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          {/* Current pile display */}
          <div className="text-center">
            <p className={`text-sm mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Inspecting</p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setCurrentPile(p => Math.max(1, p - 1))}
                className={`p-2 rounded-lg ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                <ChevronLeft className="w-6 h-6" />
              </button>
              <div className={`text-4xl font-bold px-6 py-3 rounded-xl ${darkMode ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-800'}`}>
                {currentPileId}
              </div>
              <button onClick={() => setCurrentPile(p => p + 1)}
                className={`p-2 rounded-lg ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                <ChevronRightIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="flex items-center justify-center gap-2 mt-2">
              <button onClick={() => setCurrentRow(r => Math.max(1, r - 1))}
                className={`p-1.5 rounded ${darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Row #{currentRow}</span>
              <button onClick={() => setCurrentRow(r => r + 1)}
                className={`p-1.5 rounded ${darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Voice input for pile */}
          <button onClick={() => startVoiceInput('pile')}
            className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
              isListening && voiceTarget === 'pile' 
                ? 'bg-red-500 text-white animate-pulse' 
                : darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}>
            {isListening && voiceTarget === 'pile' ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            {isListening && voiceTarget === 'pile' ? 'Listening...' : 'Speak Pile ID (e.g., "35-22")'}
          </button>
          
          {/* Category and pile type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value as any)}
                className={`w-full px-3 py-2 border rounded-lg text-sm ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200'}`}>
                <option value="piles">Piles</option>
                <option value="racking">Racking</option>
                <option value="modules">Modules</option>
              </select>
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Pile Type</label>
              <select value={pileType} onChange={(e) => setPileType(e.target.value as any)}
                className={`w-full px-3 py-2 border rounded-lg text-sm ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200'}`}>
                <option value="interior">Interior</option>
                <option value="exterior">Exterior</option>
                <option value="motor">Motor</option>
              </select>
            </div>
          </div>
          
          {/* Photo Documentation */}
          <div>
            <PhotoCapture 
              photos={photos} 
              onAddPhoto={(photo) => setPhotos(prev => [...prev, photo])} 
              onRemovePhoto={(photoId) => setPhotos(prev => prev.filter(p => p.id !== photoId))} 
              context={currentPileId}
              darkMode={darkMode} 
            />
          </div>
          
          {/* GIANT PASS/FAIL buttons */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <button onClick={() => quickInspect('pass')} disabled={loading}
              className="py-8 px-6 rounded-2xl font-bold text-xl bg-gradient-to-b from-green-400 to-green-600 text-white shadow-lg hover:from-green-500 hover:to-green-700 active:scale-95 transition-all disabled:opacity-50 flex flex-col items-center gap-2">
              <CheckCircle className="w-12 h-12" />
              PASS
              <span className="text-sm font-normal opacity-75">or press P / Space</span>
            </button>
            <button onClick={() => quickInspect('fail')} disabled={loading}
              className="py-8 px-6 rounded-2xl font-bold text-xl bg-gradient-to-b from-red-400 to-red-600 text-white shadow-lg hover:from-red-500 hover:to-red-700 active:scale-95 transition-all disabled:opacity-50 flex flex-col items-center gap-2">
              <XCircle className="w-12 h-12" />
              FAIL
              <span className="text-sm font-normal opacity-75">or press F</span>
            </button>
          </div>
          
          {/* Last action undo */}
          {lastAction && (
            <button onClick={undoLast}
              className={`w-full py-2 text-sm ${darkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-600'}`}>
              Undo last: {lastAction.pileId} ({lastAction.status})
            </button>
          )}
          
          {/* Keyboard hint */}
          <p className={`text-center text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            ⌨️ Arrow keys to navigate • P/Space = Pass • F = Fail
          </p>
        </div>
      )}
      
      {/* BATCH MODE */}
      {mode === 'batch' && (
        <div className={`rounded-2xl border p-4 lg:p-6 space-y-4 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Batch Inspection</h3>
          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Mark multiple piles at once - useful when inspecting rows</p>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>From Row</label>
              <input type="number" value={batchStartRow} onChange={(e) => setBatchStartRow(parseInt(e.target.value) || 1)}
                className={`w-full px-4 py-3 border rounded-xl text-lg ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200'}`} />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>To Row</label>
              <input type="number" value={batchEndRow} onChange={(e) => setBatchEndRow(parseInt(e.target.value) || 1)}
                className={`w-full px-4 py-3 border rounded-xl text-lg ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200'}`} />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value as any)}
                className={`w-full px-3 py-2 border rounded-lg ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200'}`}>
                <option value="piles">Piles</option>
                <option value="racking">Racking</option>
                <option value="modules">Modules</option>
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Status</label>
              <select value={batchStatus} onChange={(e) => setBatchStatus(e.target.value as any)}
                className={`w-full px-3 py-2 border rounded-lg ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200'}`}>
                <option value="pass">Pass</option>
                <option value="fail">Fail</option>
              </select>
            </div>
          </div>
          
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
            <p className={darkMode ? 'text-slate-300' : 'text-slate-700'}>
              This will mark <strong>{(batchEndRow - batchStartRow + 1) * 10} piles</strong> as <strong>{batchStatus}</strong>
            </p>
          </div>
          
          <button onClick={batchInspect} disabled={loading}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all disabled:opacity-50 ${
              batchStatus === 'pass' 
                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'
                : 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700'
            }`}>
            {loading ? 'Saving...' : `Mark All as ${batchStatus.toUpperCase()}`}
          </button>
        </div>
      )}
      
      {/* DETAILED MODE */}
      {mode === 'detailed' && (
        <div className={`rounded-2xl border p-4 lg:p-6 space-y-4 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Detailed Inspection</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value as any)}
                className={`w-full px-3 py-2 border rounded-lg ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200'}`}>
                <option value="piles">Piles</option>
                <option value="racking">Racking</option>
                <option value="modules">Modules</option>
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Pile Type</label>
              <select value={pileType} onChange={(e) => setPileType(e.target.value as any)}
                className={`w-full px-3 py-2 border rounded-lg ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200'}`}>
                <option value="interior">Interior</option>
                <option value="exterior">Exterior</option>
                <option value="motor">Motor</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Pile IDs (comma-separated)</label>
            <div className="flex gap-2">
              <input type="text" value={pileIds} onChange={(e) => setPileIds(e.target.value)} placeholder="e.g., 35-22, 35-23, 35-24"
                className={`flex-1 px-4 py-3 border rounded-xl ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200'}`} />
              <button onClick={() => startVoiceInput('pile')}
                className={`p-3 rounded-xl ${isListening && voiceTarget === 'pile' ? 'bg-red-500 text-white' : darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                {isListening && voiceTarget === 'pile' ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
            </div>
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Area / Row</label>
            <input type="text" value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g., Row 15, Block A"
              className={`w-full px-4 py-3 border rounded-xl ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200'}`} />
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Notes</label>
            <div className="flex gap-2">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add inspection notes..." rows={3}
                className={`flex-1 px-4 py-3 border rounded-xl resize-none ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200'}`} />
              <button onClick={() => startVoiceInput('notes')}
                className={`p-3 rounded-xl self-stretch ${isListening && voiceTarget === 'notes' ? 'bg-red-500 text-white' : darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                {isListening && voiceTarget === 'notes' ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 pt-2">
            <button onClick={async () => {
              setLoading(true)
              try {
                await fetch('/api/inspections', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    date: new Date().toISOString(),
                    category, pileType,
                    pileIds: pileIds ? JSON.stringify(pileIds.split(',').map(s => s.trim())) : null,
                    area, status: 'pass', notes: notes || null,
                    projectId: project.id, userId, items: []
                  })
                })
                toast.success('Inspection saved!')
                setPileIds(''); setNotes(''); setArea('')
                onSuccess()
              } catch { toast.error('Failed to save') }
              finally { setLoading(false) }
            }} disabled={loading}
              className="py-4 rounded-xl font-bold bg-green-500 text-white hover:bg-green-600 disabled:opacity-50">
              Pass
            </button>
            <button onClick={async () => {
              setLoading(true)
              try {
                await fetch('/api/inspections', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    date: new Date().toISOString(),
                    category, pileType,
                    pileIds: pileIds ? JSON.stringify(pileIds.split(',').map(s => s.trim())) : null,
                    area, status: 'fail', notes: notes || null,
                    projectId: project.id, userId, items: []
                  })
                })
                toast.success('Inspection saved!')
                setPileIds(''); setNotes(''); setArea('')
                onSuccess()
              } catch { toast.error('Failed to save') }
              finally { setLoading(false) }
            }} disabled={loading}
              className="py-4 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 disabled:opacity-50">
              Fail
            </button>
          </div>
        </div>
      )}
      
      {/* Session stats */}
      <div className={`rounded-xl p-4 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
        <div className="flex justify-between items-center">
          <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Session Total</span>
          <span className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{inspectedCount} inspected</span>
        </div>
        <div className="flex gap-2 mt-2">
          <div className="flex-1 h-2 bg-green-500 rounded-full" style={{ width: `${inspectedCount > 0 ? (passCount / inspectedCount) * 100 : 0}%` }} />
          <div className="flex-1 h-2 bg-red-500 rounded-full" style={{ width: `${inspectedCount > 0 ? (failCount / inspectedCount) * 100 : 0}%` }} />
        </div>
      </div>
    </div>
  )
}

// Refusal Module Component - Redesigned for field use
function RefusalModule({ project, userId, darkMode, onSuccess }: {
  project: Project; userId: string; darkMode: boolean; onSuccess: () => void;
}) {
  // Mode state
  const [mode, setMode] = useState<'quick' | 'detailed'>('quick')
  
  // Quick mode state
  const [currentRow, setCurrentRow] = useState(1)
  const [currentPile, setCurrentPile] = useState(1)
  const [targetDepth, setTargetDepth] = useState('1800') // Remember from last entry
  const [achievedDepth, setAchievedDepth] = useState('')
  const [refusalReason, setRefusalReason] = useState('bedrock')
  
  // Detailed mode state
  const [pileId, setPileId] = useState('')
  const [refusalNotes, setRefusalNotes] = useState('')
  
  // Voice input
  const [isListening, setIsListening] = useState(false)
  const [voiceTarget, setVoiceTarget] = useState<'pile' | 'depth' | 'notes' | null>(null)
  const recognitionRef = useRef<any>(null)
  
  // UI state
  const [loading, setLoading] = useState(false)
  const [showList, setShowList] = useState(true)
  const [selectedRefusal, setSelectedRefusal] = useState<PileRefusal | null>(null)
  
  // Photos for documentation
  const [photos, setPhotos] = useState<Photo[]>([])
  
  // Get pile ID format from project
  const pileIdFormat = project.pileIdFormat || '{Row}-{Pile}'
  
  // Generate current pile ID
  const generatePileId = (row: number, pile: number) => {
    return pileIdFormat
      .replace('{Row}', String(row))
      .replace('{Pile}', String(pile))
      .replace('{Block}', 'A')
  }
  
  const currentPileId = generatePileId(currentRow, currentPile)
  
  // Calculate shortfall
  const shortfall = targetDepth && achievedDepth 
    ? parseFloat(targetDepth) - parseFloat(achievedDepth) 
    : 0
  
  // Refusal reasons with icons/emoji for quick recognition
  const refusalReasons = [
    { value: 'bedrock', label: 'Bedrock', emoji: '🪨', description: 'Hit solid rock' },
    { value: 'cobble', label: 'Cobble', emoji: '🪨', description: 'Large rocks/boulders' },
    { value: 'soft_soil', label: 'Soft Soil', emoji: '💧', description: 'Soil too soft/loose' },
    { value: 'obstruction', label: 'Obstruction', emoji: '⚠️', description: 'Debris/underground object' },
    { value: 'groundwater', label: 'Groundwater', emoji: '🌊', description: 'Water table reached' },
    { value: 'other', label: 'Other', emoji: '❓', description: 'Other reason' }
  ]
  
  // Quick submit
  const quickSubmit = async () => {
    if (!achievedDepth) {
      toast.error('Enter achieved depth')
      return
    }
    setLoading(true)
    try {
      const response = await fetch('/api/refusals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pileId: currentPileId,
          block: 'A',
          row: String(currentRow),
          pileNumber: String(currentPile),
          dateDiscovered: new Date().toISOString(),
          targetDepth: parseFloat(targetDepth),
          achievedDepth: parseFloat(achievedDepth),
          refusalReason,
          refusalNotes: null,
          projectId: project.id,
          userId,
          photos: photos.length > 0 ? JSON.stringify(photos) : null,
        })
      })
      
      if (response.ok) {
        toast.success(`Logged refusal: ${currentPileId}`)
        setAchievedDepth('') // Clear for next entry
        setPhotos([]) // Clear photos after submission
        setCurrentPile(p => p + 1) // Auto-advance
        if (navigator.vibrate) navigator.vibrate([100, 50, 100])
        onSuccess()
      } else {
        toast.error('Failed to log refusal')
      }
    } catch {
      toast.error('Failed to log refusal')
    } finally {
      setLoading(false)
    }
  }
  
  // Detailed submit
  const detailedSubmit = async () => {
    if (!pileId || !targetDepth || !achievedDepth) {
      toast.error('Fill required fields')
      return
    }
    setLoading(true)
    try {
      const response = await fetch('/api/refusals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pileId,
          dateDiscovered: new Date().toISOString(),
          targetDepth: parseFloat(targetDepth),
          achievedDepth: parseFloat(achievedDepth),
          refusalReason,
          refusalNotes: refusalNotes || null,
          projectId: project.id,
          userId
        })
      })
      
      if (response.ok) {
        toast.success('Refusal logged')
        setPileId('')
        setAchievedDepth('')
        setRefusalNotes('')
        onSuccess()
      } else {
        toast.error('Failed to log')
      }
    } catch {
      toast.error('Failed to log')
    } finally {
      setLoading(false)
    }
  }
  
  // Update refusal status
  const updateRefusalStatus = async (refusalId: string, newStatus: string) => {
    try {
      await fetch('/api/refusals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: refusalId, status: newStatus })
      })
      toast.success('Status updated')
      setSelectedRefusal(null)
      onSuccess()
    } catch {
      toast.error('Failed to update')
    }
  }
  
  // Voice input setup
  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.toLowerCase()
        
        if (voiceTarget === 'pile') {
          const match = transcript.match(/(\d+)\s*(?:dash|minus|hyphen)?\s*(\d+)/)
          if (match) {
            setCurrentRow(parseInt(match[1]))
            setCurrentPile(parseInt(match[2]))
          }
        } else if (voiceTarget === 'depth') {
          const num = transcript.match(/\d+/)
          if (num) setAchievedDepth(num[0])
        } else if (voiceTarget === 'notes') {
          setRefusalNotes(transcript)
        }
        
        setIsListening(false)
        setVoiceTarget(null)
      }
      
      recognitionRef.current.onerror = () => {
        setIsListening(false)
        setVoiceTarget(null)
        toast.error('Voice recognition failed')
      }
    }
  }, [voiceTarget])
  
  const startVoiceInput = (target: 'pile' | 'depth' | 'notes') => {
    if (recognitionRef.current) {
      setVoiceTarget(target)
      setIsListening(true)
      recognitionRef.current.start()
    } else {
      toast.error('Voice input not supported')
    }
  }
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (mode === 'quick' && !selectedRefusal) {
        if (e.key === 'Enter' && achievedDepth) {
          e.preventDefault()
          quickSubmit()
        } else if (e.key === 'ArrowRight') {
          setCurrentPile(p => p + 1)
        } else if (e.key === 'ArrowLeft') {
          setCurrentPile(p => Math.max(1, p - 1))
        } else if (e.key === 'ArrowUp') {
          setCurrentRow(r => r + 1)
        } else if (e.key === 'ArrowDown') {
          setCurrentRow(r => Math.max(1, r - 1))
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mode, currentRow, currentPile, achievedDepth, targetDepth, refusalReason, selectedRefusal])
  
  // Stats
  const openRefusals = project.refusals?.filter(r => r.status === 'open').length || 0
  const resolvedRefusals = project.refusals?.filter(r => r.status !== 'open').length || 0

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Pile Refusals</h2>
          <p className={darkMode ? 'text-slate-400' : 'text-slate-600'}>{project.name}</p>
        </div>
        <div className="flex gap-2 text-sm">
          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full font-medium">{openRefusals} Open</span>
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-medium">{resolvedRefusals} Resolved</span>
        </div>
      </div>
      
      {/* Mode selector */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { id: 'quick', label: 'Quick Log', icon: Zap },
          { id: 'detailed', label: 'Detailed', icon: FileText }
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setMode(id as any)}
            className={`py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
              mode === id ? 'bg-orange-500 text-white' : darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>
      
      {/* QUICK MODE */}
      {mode === 'quick' && !selectedRefusal && (
        <div className={`rounded-2xl border p-4 lg:p-6 space-y-4 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          {/* Current pile */}
          <div className="text-center">
            <p className={`text-sm mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Refusal at</p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setCurrentPile(p => Math.max(1, p - 1))}
                className={`p-2 rounded-lg ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                <ChevronLeft className="w-6 h-6" />
              </button>
              <div className={`text-4xl font-bold px-6 py-3 rounded-xl ${darkMode ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-800'}`}>
                {currentPileId}
              </div>
              <button onClick={() => setCurrentPile(p => p + 1)}
                className={`p-2 rounded-lg ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                <ChevronRightIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="flex items-center justify-center gap-2 mt-2">
              <button onClick={() => setCurrentRow(r => Math.max(1, r - 1))}
                className={`p-1.5 rounded ${darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Row #{currentRow}</span>
              <button onClick={() => setCurrentRow(r => r + 1)}
                className={`p-1.5 rounded ${darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Voice input for pile */}
          <button onClick={() => startVoiceInput('pile')}
            className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
              isListening && voiceTarget === 'pile' 
                ? 'bg-red-500 text-white animate-pulse' 
                : darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}>
            {isListening && voiceTarget === 'pile' ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            {isListening && voiceTarget === 'pile' ? 'Listening...' : 'Speak Pile ID'}
          </button>
          
          {/* Depths */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Target (mm)</label>
              <input type="number" value={targetDepth} onChange={(e) => setTargetDepth(e.target.value)}
                className={`w-full px-4 py-4 text-xl font-bold border rounded-xl text-center ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200'}`} />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Achieved (mm) *</label>
              <div className="flex gap-2">
                <input type="number" value={achievedDepth} onChange={(e) => setAchievedDepth(e.target.value)}
                  placeholder="850"
                  className={`flex-1 px-4 py-4 text-xl font-bold border rounded-xl text-center ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200'}`} />
                <button onClick={() => startVoiceInput('depth')}
                  className={`px-3 rounded-xl ${isListening && voiceTarget === 'depth' ? 'bg-red-500 text-white' : darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                  {isListening && voiceTarget === 'depth' ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
          
          {/* Shortfall display */}
          {achievedDepth && (
            <div className={`p-4 rounded-xl text-center ${shortfall > 500 ? 'bg-red-100 dark:bg-red-900/30' : shortfall > 200 ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-orange-100 dark:bg-orange-900/30'}`}>
              <p className={`text-sm ${shortfall > 500 ? 'text-red-600' : shortfall > 200 ? 'text-yellow-600' : 'text-orange-600'}`}>
                Shortfall: <span className="text-2xl font-bold">{shortfall.toLocaleString()}mm</span>
              </p>
            </div>
          )}
          
          {/* Reason buttons - BIG tap targets */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Reason (tap to select)</label>
            <div className="grid grid-cols-3 gap-2">
              {refusalReasons.slice(0, 6).map(reason => (
                <button key={reason.value} onClick={() => setRefusalReason(reason.value)}
                  className={`py-4 px-2 rounded-xl font-medium flex flex-col items-center gap-1 transition-all ${
                    refusalReason === reason.value 
                      ? 'bg-orange-500 text-white ring-2 ring-orange-300' 
                      : darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}>
                  <span className="text-2xl">{reason.emoji}</span>
                  <span className="text-xs">{reason.label}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Photo Documentation */}
          <div>
            <PhotoCapture 
              photos={photos} 
              onAddPhoto={(photo) => setPhotos(prev => [...prev, photo])} 
              onRemovePhoto={(photoId) => setPhotos(prev => prev.filter(p => p.id !== photoId))} 
              context={currentPileId}
              darkMode={darkMode} 
            />
          </div>
          
          {/* Submit button */}
          <button onClick={quickSubmit} disabled={loading || !achievedDepth}
            className="w-full py-5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl font-bold text-xl shadow-lg hover:from-red-600 hover:to-red-700 active:scale-98 transition-all disabled:opacity-50 flex items-center justify-center gap-3">
            <AlertTriangle className="w-6 h-6" />
            {loading ? 'Logging...' : 'LOG REFUSAL'}
          </button>
          
          <p className={`text-center text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            ⌨️ Arrow keys to navigate • Enter to submit
          </p>
        </div>
      )}
      
      {/* DETAILED MODE */}
      {mode === 'detailed' && !selectedRefusal && (
        <div className={`rounded-2xl border p-4 lg:p-6 space-y-4 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Detailed Refusal Log</h3>
          
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Pile ID *</label>
            <div className="flex gap-2">
              <input type="text" value={pileId} onChange={(e) => setPileId(e.target.value)} placeholder="e.g., 35-22"
                className={`flex-1 px-4 py-3 border rounded-xl ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200'}`} />
              <button onClick={() => startVoiceInput('pile')}
                className={`p-3 rounded-xl ${isListening && voiceTarget === 'pile' ? 'bg-red-500 text-white' : darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                <Mic className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Target Depth (mm)</label>
              <input type="number" value={targetDepth} onChange={(e) => setTargetDepth(e.target.value)}
                className={`w-full px-4 py-3 border rounded-xl ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200'}`} />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Achieved Depth (mm)</label>
              <input type="number" value={achievedDepth} onChange={(e) => setAchievedDepth(e.target.value)}
                className={`w-full px-4 py-3 border rounded-xl ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200'}`} />
            </div>
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Reason</label>
            <select value={refusalReason} onChange={(e) => setRefusalReason(e.target.value)}
              className={`w-full px-4 py-3 border rounded-xl ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200'}`}>
              {refusalReasons.map(r => <option key={r.value} value={r.value}>{r.emoji} {r.label}</option>)}
            </select>
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Notes</label>
            <div className="flex gap-2">
              <textarea value={refusalNotes} onChange={(e) => setRefusalNotes(e.target.value)} placeholder="Additional details..." rows={2}
                className={`flex-1 px-4 py-3 border rounded-xl resize-none ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200'}`} />
              <button onClick={() => startVoiceInput('notes')}
                className={`px-3 rounded-xl self-stretch ${isListening && voiceTarget === 'notes' ? 'bg-red-500 text-white' : darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                <Mic className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <button onClick={detailedSubmit} disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-bold disabled:opacity-50">
            {loading ? 'Saving...' : 'Log Refusal'}
          </button>
        </div>
      )}
      
      {/* SELECTED REFUSAL DETAIL */}
      {selectedRefusal && (
        <div className={`rounded-2xl border p-4 lg:p-6 space-y-4 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Refusal Details</h3>
            <button onClick={() => setSelectedRefusal(null)} className={darkMode ? 'text-slate-400' : 'text-slate-500'}>
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
            <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{selectedRefusal.pileId}</p>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Achieved</p>
                <p className={`font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{selectedRefusal.achievedDepth}mm</p>
              </div>
              <div>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Target</p>
                <p className={`font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{selectedRefusal.targetDepth}mm</p>
              </div>
              <div>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Shortfall</p>
                <p className="font-bold text-red-600">{selectedRefusal.targetDepth - selectedRefusal.achievedDepth}mm</p>
              </div>
              <div>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Reason</p>
                <p className={`font-bold capitalize ${darkMode ? 'text-white' : 'text-slate-800'}`}>{selectedRefusal.refusalReason}</p>
              </div>
            </div>
          </div>
          
          {/* Status update buttons */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Update Status</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { status: 'remediation_planned', label: 'Plan Set', color: 'yellow' },
                { status: 'extracted', label: 'Extracted', color: 'blue' },
                { status: 'reinstalled', label: 'Reinstalled', color: 'purple' },
                { status: 'verified', label: 'Verified OK', color: 'green' }
              ].map(({ status, label, color }) => (
                <button key={status} onClick={() => updateRefusalStatus(selectedRefusal.id, status)}
                  className={`py-3 px-4 rounded-xl font-medium transition-all ${
                    color === 'yellow' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' :
                    color === 'blue' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' :
                    color === 'purple' ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' :
                    'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Refusal List */}
      {showList && !selectedRefusal && (
        <div className={`rounded-2xl border p-4 lg:p-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Recent Refusals</h3>
            <button onClick={() => setShowList(!showList)}
              className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {showList ? 'Hide' : 'Show'}
            </button>
          </div>
          
          <div className="space-y-2">
            {project.refusals?.slice(0, 10).map(refusal => {
              const shortfallVal = refusal.targetDepth - refusal.achievedDepth
              return (
                <button key={refusal.id} onClick={() => setSelectedRefusal(refusal)}
                  className={`w-full p-3 rounded-xl text-left ${darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-50 hover:bg-slate-100'} transition-all`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={`font-medium ${darkMode ? 'text-white' : 'text-slate-800'}`}>{refusal.pileId}</p>
                      <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {refusal.achievedDepth}mm achieved • <span className="text-red-500 font-medium">{shortfallVal}mm short</span>
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      refusal.status === 'open' ? 'bg-red-100 text-red-700' :
                      refusal.status === 'remediation_planned' ? 'bg-yellow-100 text-yellow-700' :
                      refusal.status === 'reinstalled' ? 'bg-purple-100 text-purple-700' :
                      refusal.status === 'verified' ? 'bg-green-100 text-green-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {refusal.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className={`text-xs mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    {format(new Date(refusal.dateDiscovered), 'MMM d, yyyy')} • {refusal.refusalReason}
                  </p>
                </button>
              )
            })}
            {(!project.refusals || project.refusals.length === 0) && (
              <p className={`text-center py-8 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>No refusals logged</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Analytics Dashboard Component with Heat Maps
function AnalyticsDashboard({ project, darkMode }: {
  project: Project
  darkMode: boolean
}) {
  const [activeView, setActiveView] = useState<'overview' | 'piles' | 'modules' | 'trends'>('overview')
  const [selectedCell, setSelectedCell] = useState<{row: number, pile: number, status: string} | null>(null)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [visibleRowStart, setVisibleRowStart] = useState(1)

  // Calculate analytics from project data
  const productionEntries = project.productionEntries || []
  const inspections = project.inspections || []
  const refusals = project.refusals || []

  // Total installed
  const totalPilesInstalled = productionEntries.reduce((sum, e) => sum + e.piles, 0)
  const totalModulesInstalled = productionEntries.reduce((sum, e) => sum + e.modules, 0)
  const totalRackingInstalled = productionEntries.reduce((sum, e) => sum + e.rackingTables, 0)

  // QC stats
  const passedInspections = inspections.filter(i => i.status === 'pass').length
  const failedInspections = inspections.filter(i => i.status === 'fail').length
  const pendingInspections = inspections.filter(i => i.status === 'pending').length
  const totalInspections = inspections.length
  const passRate = totalInspections > 0 ? (passedInspections / totalInspections) * 100 : 0

  // Refusal stats
  const openRefusals = refusals.filter(r => r.status === 'open').length
  const resolvedRefusals = refusals.filter(r => r.status !== 'open').length
  const totalRefusals = refusals.length
  const refusalReasons = refusals.reduce((acc, r) => {
    acc[r.refusalReason] = (acc[r.refusalReason] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Build pile status map from inspections
  const pileStatusMap = useMemo(() => {
    const map = new Map<string, { status: string, date?: string, inspector?: string, count: number }>()
    
    // Process all inspections to find latest status per pile
    const sortedInspections = [...inspections].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    
    sortedInspections.forEach(insp => {
      if (insp.pileIds) {
        try {
          const pileIdList = JSON.parse(insp.pileIds)
          pileIdList.forEach((pileId: string) => {
            if (!map.has(pileId)) {
              map.set(pileId, {
                status: insp.status,
                date: insp.date,
                inspector: insp.user?.name,
                count: 1
              })
            }
          })
        } catch {}
      }
    })

    // Add refusals
    refusals.forEach(ref => {
      if (!map.has(ref.pileId)) {
        map.set(ref.pileId, { status: 'refusal', date: ref.dateDiscovered, count: 1 })
      }
    })

    return map
  }, [inspections, refusals])

  // Extract row/pile numbers from pile IDs (format: Row-Pile)
  const pileGrid = useMemo(() => {
    const rows = new Map<number, Set<number>>()
    
    // From inspections
    pileStatusMap.forEach((_, pileId) => {
      const match = pileId.match(/(\d+)-(\d+)/)
      if (match) {
        const row = parseInt(match[1])
        const pile = parseInt(match[2])
        if (!rows.has(row)) rows.set(row, new Set())
        rows.get(row)!.add(pile)
      }
    })

    // From refusals
    refusals.forEach(ref => {
      const match = ref.pileId.match(/(\d+)-(\d+)/)
      if (match) {
        const row = parseInt(match[1])
        const pile = parseInt(match[2])
        if (!rows.has(row)) rows.set(row, new Set())
        rows.get(row)!.add(pile)
      }
    })

    // Also include from production if we track by pile
    
    return { maxRow: Math.max(...Array.from(rows.keys()), 10), rows }
  }, [pileStatusMap, refusals])

  // Production trend data (last 14 days)
  const productionTrend = useMemo(() => {
    const last14Days = []
    for (let i = 13; i >= 0; i--) {
      const date = subDays(new Date(), i)
      const dateStr = format(date, 'yyyy-MM-dd')
      const dayEntries = productionEntries.filter(e => e.date.startsWith(dateStr))
      const piles = dayEntries.reduce((sum, e) => sum + e.piles, 0)
      const modules = dayEntries.reduce((sum, e) => sum + e.modules, 0)
      last14Days.push({
        date: format(date, 'MMM d'),
        piles,
        modules,
        inspections: inspections.filter(i => i.date.startsWith(dateStr)).length
      })
    }
    return last14Days
  }, [productionEntries, inspections])

  // Calculate daily averages
  const avgDailyPiles = productionTrend.reduce((sum, d) => sum + d.piles, 0) / 14 || 0
  const avgDailyModules = productionTrend.reduce((sum, d) => sum + d.modules, 0) / 14 || 0

  // Project completion forecast
  const remainingPiles = project.totalPiles - totalPilesInstalled
  const remainingModules = project.totalModules - totalModulesInstalled
  const daysToCompletePiles = avgDailyPiles > 0 ? Math.ceil(remainingPiles / avgDailyPiles) : 0
  const daysToCompleteModules = avgDailyModules > 0 ? Math.ceil(remainingModules / avgDailyModules) : 0

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'bg-green-500'
      case 'fail': return 'bg-red-500'
      case 'refusal': return 'bg-orange-500'
      case 'pending': return 'bg-yellow-400'
      case 'installed': return 'bg-blue-500'
      default: return 'bg-slate-300 dark:bg-slate-600'
    }
  }

  // Generate pile cells for heat map
  const generatePileCells = (rowNum: number, maxPiles: number) => {
    const cells = []
    for (let p = 1; p <= maxPiles; p++) {
      const pileId = `${rowNum}-${p}`
      const data = pileStatusMap.get(pileId)
      const status = data?.status || 'not_started'
      cells.push({
        pileId,
        row: rowNum,
        pile: p,
        status,
        date: data?.date,
        inspector: data?.inspector
      })
    }
    return cells
  }

  // Visible rows for virtualization
  const rowsPerPage = Math.ceil(20 / zoomLevel)
  const visibleRows = []
  for (let r = visibleRowStart; r < visibleRowStart + rowsPerPage && r <= pileGrid.maxRow; r++) {
    visibleRows.push(r)
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Analytics Dashboard</h2>
          <p className={darkMode ? 'text-slate-400' : 'text-slate-600'}>{project.name}</p>
        </div>
        <div className="flex gap-2">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'piles', label: 'Pile Map', icon: Grid3X3 },
            { id: 'modules', label: 'Module Map', icon: Sun },
            { id: 'trends', label: 'Trends', icon: TrendingUp }
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveView(id as any)}
              className={`px-3 py-2 rounded-lg font-medium flex items-center gap-1.5 transition-all text-sm ${
                activeView === id 
                  ? 'bg-orange-500 text-white' 
                  : darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}>
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* OVERVIEW TAB */}
      {activeView === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              title="Production Rate" 
              value={`${avgDailyPiles.toFixed(1)}`} 
              subtitle="piles/day avg"
              icon={TrendingUp} 
              color="blue" 
              darkMode={darkMode} 
            />
            <StatCard 
              title="QC Pass Rate" 
              value={`${passRate.toFixed(0)}%`} 
              subtitle={`${passedInspections}/${totalInspections} passed`}
              icon={CheckCircle} 
              color={passRate >= 90 ? 'green' : passRate >= 70 ? 'yellow' : 'red'} 
              darkMode={darkMode} 
            />
            <StatCard 
              title="Open Refusals" 
              value={openRefusals.toString()} 
              subtitle={totalRefusals > 0 ? `${resolvedRefusals} resolved` : 'none reported'}
              icon={AlertCircle} 
              color={openRefusals > 5 ? 'red' : openRefusals > 0 ? 'yellow' : 'green'} 
              darkMode={darkMode} 
            />
            <StatCard 
              title="Est. Completion" 
              value={`${daysToCompletePiles}d`} 
              subtitle="remaining for piles"
              icon={Calendar} 
              color="purple" 
              darkMode={darkMode} 
            />
          </div>

          {/* Progress Bars */}
          <div className={`rounded-2xl border p-4 lg:p-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <h3 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-slate-800'}`}>Progress Overview</h3>
            <div className="space-y-4">
              {[
                { label: 'Piles', installed: totalPilesInstalled, total: project.totalPiles, color: 'bg-blue-500' },
                { label: 'Racking Tables', installed: totalRackingInstalled, total: project.totalRackingTables, color: 'bg-purple-500' },
                { label: 'Modules', installed: totalModulesInstalled, total: project.totalModules, color: 'bg-orange-500' }
              ].map(({ label, installed, total, color }) => {
                const percent = total > 0 ? (installed / total) * 100 : 0
                return (
                  <div key={label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className={darkMode ? 'text-slate-300' : 'text-slate-600'}>{label}</span>
                      <span className={darkMode ? 'text-white font-medium' : 'text-slate-800 font-medium'}>
                        {formatNumber(installed)} / {formatNumber(total)} ({percent.toFixed(1)}%)
                      </span>
                    </div>
                    <div className={`h-3 rounded-full overflow-hidden ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min(100, percent)}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Production Trend Chart */}
          <div className={`rounded-2xl border p-4 lg:p-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <h3 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-slate-800'}`}>14-Day Production Trend</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={productionTrend}>
                  <defs>
                    <linearGradient id="pilesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="modulesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e2e8f0'} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke={darkMode ? '#64748b' : '#94a3b8'} />
                  <YAxis tick={{ fontSize: 11 }} stroke={darkMode ? '#64748b' : '#94a3b8'} />
                  <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1e293b' : 'white', border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`, borderRadius: '8px' }} />
                  <Legend />
                  <Area type="monotone" dataKey="piles" stroke="#3b82f6" strokeWidth={2} fill="url(#pilesGradient)" name="Piles" />
                  <Area type="monotone" dataKey="modules" stroke="#f97316" strokeWidth={2} fill="url(#modulesGradient)" name="Modules" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* QC & Refusal Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* QC Breakdown */}
            <div className={`rounded-2xl border p-4 lg:p-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <h3 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-slate-800'}`}>QC Inspection Breakdown</h3>
              <div className="flex items-center justify-center gap-8">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-2">
                    <span className="text-2xl font-bold text-green-600">{passedInspections}</span>
                  </div>
                  <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Passed</span>
                </div>
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-2">
                    <span className="text-2xl font-bold text-red-600">{failedInspections}</span>
                  </div>
                  <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Failed</span>
                </div>
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mx-auto mb-2">
                    <span className="text-2xl font-bold text-yellow-600">{pendingInspections}</span>
                  </div>
                  <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Pending</span>
                </div>
              </div>
            </div>

            {/* Refusal Reasons */}
            <div className={`rounded-2xl border p-4 lg:p-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <h3 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-slate-800'}`}>Refusal Reasons</h3>
              {totalRefusals > 0 ? (
                <div className="space-y-2">
                  {Object.entries(refusalReasons).map(([reason, count]) => (
                    <div key={reason} className="flex items-center justify-between">
                      <span className={`capitalize ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{reason.replace('_', ' ')}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-orange-500 rounded-full" style={{ width: `${(count / totalRefusals) * 100}%` }} />
                        </div>
                        <span className={`text-sm font-medium w-8 ${darkMode ? 'text-white' : 'text-slate-800'}`}>{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={`text-center py-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>No refusals recorded</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PILE HEAT MAP */}
      {activeView === 'piles' && (
        <div className="space-y-4">
          {/* Legend & Controls */}
          <div className={`rounded-xl p-4 ${darkMode ? 'bg-slate-800' : 'bg-white border border-slate-200'}`}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-800'}`}>Legend:</span>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded bg-slate-300 dark:bg-slate-600" />
                    <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Not Started</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded bg-green-500" />
                    <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Passed</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded bg-red-500" />
                    <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Failed</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded bg-orange-500" />
                    <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Refusal</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded bg-yellow-400" />
                    <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Pending</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Zoom:</span>
                <button onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.25))} 
                  className={`w-8 h-8 rounded ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>−</button>
                <span className={`text-sm w-12 text-center ${darkMode ? 'text-white' : 'text-slate-800'}`}>{zoomLevel.toFixed(2)}x</span>
                <button onClick={() => setZoomLevel(z => Math.min(2, z + 0.25))}
                  className={`w-8 h-8 rounded ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>+</button>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className={`rounded-xl p-3 flex flex-wrap gap-4 justify-center ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
            <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              <strong className={darkMode ? 'text-white' : 'text-slate-800'}>{totalInspections}</strong> inspected
            </span>
            <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              <strong className="text-green-500">{passedInspections}</strong> passed
            </span>
            <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              <strong className="text-red-500">{failedInspections}</strong> failed
            </span>
            <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              <strong className="text-orange-500">{totalRefusals}</strong> refusals
            </span>
          </div>

          {/* Heat Map Grid */}
          <div className={`rounded-2xl border p-4 overflow-x-auto ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className="min-w-max">
              {/* Pile numbers header */}
              <div className="flex mb-1 ml-12">
                {Array.from({ length: 15 }, (_, i) => (
                  <div key={i} className="w-6 text-center text-xs text-slate-400">{i + 1}</div>
                ))}
              </div>
              
              {/* Rows */}
              {visibleRows.map(rowNum => {
                const cells = generatePileCells(rowNum, 15)
                return (
                  <div key={rowNum} className="flex items-center mb-1">
                    <div className={`w-10 text-right pr-2 text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      R{rowNum}
                    </div>
                    <div className="flex gap-0.5">
                      {cells.map(cell => (
                        <button
                          key={cell.pileId}
                          onClick={() => setSelectedCell(cell)}
                          className={`${
                            cell.status === 'pass' ? 'bg-green-500' :
                            cell.status === 'fail' ? 'bg-red-500' :
                            cell.status === 'refusal' ? 'bg-orange-500' :
                            cell.status === 'pending' ? 'bg-yellow-400' :
                            'bg-slate-300 dark:bg-slate-600'
                          } rounded-sm transition-all hover:ring-2 hover:ring-blue-400 hover:ring-offset-1`}
                          style={{ 
                            width: `${24 * zoomLevel}px`, 
                            height: `${24 * zoomLevel}px`
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Navigation */}
            <div className="flex justify-center gap-2 mt-4">
              <button 
                onClick={() => setVisibleRowStart(r => Math.max(1, r - rowsPerPage))}
                disabled={visibleRowStart === 1}
                className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-slate-700 text-slate-300 disabled:opacity-50' : 'bg-slate-100 text-slate-600 disabled:opacity-50'}`}
              >
                ← Previous
              </button>
              <span className={`px-4 py-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Rows {visibleRowStart}-{Math.min(visibleRowStart + rowsPerPage - 1, pileGrid.maxRow)} of {pileGrid.maxRow}
              </span>
              <button 
                onClick={() => setVisibleRowStart(r => Math.min(pileGrid.maxRow - rowsPerPage + 1, r + rowsPerPage))}
                disabled={visibleRowStart + rowsPerPage > pileGrid.maxRow}
                className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-slate-700 text-slate-300 disabled:opacity-50' : 'bg-slate-100 text-slate-600 disabled:opacity-50'}`}
              >
                Next →
              </button>
            </div>
          </div>

          {/* Selected Cell Details */}
          {selectedCell && (
            <div className={`rounded-xl p-4 ${darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}`}>
              <div className="flex items-center justify-between mb-3">
                <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                  Pile {selectedCell.pileId}
                </h4>
                <button onClick={() => setSelectedCell(null)} className={darkMode ? 'text-slate-400' : 'text-slate-500'}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Status</span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`w-3 h-3 rounded ${getStatusColor(selectedCell.status)}`} />
                    <span className={`font-medium capitalize ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                      {selectedCell.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                {selectedCell.date && (
                  <div>
                    <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Date</span>
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                      {format(new Date(selectedCell.date), 'MMM d, yyyy')}
                    </p>
                  </div>
                )}
                {selectedCell.inspector && (
                  <div>
                    <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Inspector</span>
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-slate-800'}`}>{selectedCell.inspector}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODULE HEAT MAP */}
      {activeView === 'modules' && (
        <div className="space-y-4">
          {/* Legend */}
          <div className={`rounded-xl p-4 ${darkMode ? 'bg-slate-800' : 'bg-white border border-slate-200'}`}>
            <div className="flex flex-wrap items-center gap-4">
              <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-800'}`}>Legend:</span>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded bg-slate-300 dark:bg-slate-600" />
                  <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>0%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded bg-green-200" />
                  <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>1-25%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded bg-green-400" />
                  <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>26-50%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded bg-green-500" />
                  <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>51-75%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded bg-green-600" />
                  <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>76-100%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Module Progress */}
          <div className={`rounded-2xl border p-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className="text-center mb-6">
              <h3 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>Module Installation Progress</h3>
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <p className={`text-4xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{formatNumber(totalModulesInstalled)}</p>
                  <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>installed</p>
                </div>
                <div className={`text-2xl ${darkMode ? 'text-slate-500' : 'text-slate-300'}`}>/</div>
                <div className="text-center">
                  <p className={`text-4xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{formatNumber(project.totalModules)}</p>
                  <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>total</p>
                </div>
                <div className="text-center ml-4">
                  <p className={`text-4xl font-bold text-green-500`}>{project.totalModules > 0 ? ((totalModulesInstalled / project.totalModules) * 100).toFixed(1) : 0}%</p>
                  <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>complete</p>
                </div>
              </div>
            </div>

            {/* Visual grid representation */}
            <div className="flex justify-center">
              <div className="inline-grid grid-cols-10 gap-1">
                {Array.from({ length: 100 }, (_, i) => {
                  const percent = project.totalModules > 0 ? (totalModulesInstalled / project.totalModules) * 100 : 0
                  const cellPercent = (i / 100) * 100
                  const isComplete = cellPercent < percent
                  const partialPercent = percent - cellPercent
                  
                  let bgColor = 'bg-slate-300 dark:bg-slate-600'
                  if (isComplete) {
                    bgColor = 'bg-green-600'
                  } else if (partialPercent > 0 && partialPercent < 1) {
                    bgColor = 'bg-green-400'
                  }
                  
                  return (
                    <div 
                      key={i} 
                      className={`w-6 h-6 rounded-sm ${bgColor} transition-all`}
                    />
                  )
                })}
              </div>
            </div>

            <p className={`text-center text-sm mt-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Each cell represents 1% of total modules
            </p>
          </div>

          {/* Racking Progress */}
          <div className={`rounded-2xl border p-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <h3 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-slate-800'}`}>Racking Tables Progress</h3>
            <div className="flex items-center justify-center gap-4 mb-4">
              <span className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{totalRackingInstalled}</span>
              <span className={`text-xl ${darkMode ? 'text-slate-500' : 'text-slate-300'}`}>/</span>
              <span className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{project.totalRackingTables}</span>
              <span className={`text-xl text-purple-500 font-bold`}>
                ({project.totalRackingTables > 0 ? ((totalRackingInstalled / project.totalRackingTables) * 100).toFixed(1) : 0}%)
              </span>
            </div>
            <div className={`h-4 rounded-full overflow-hidden ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
              <div 
                className="h-full bg-purple-500 rounded-full transition-all" 
                style={{ width: `${project.totalRackingTables > 0 ? (totalRackingInstalled / project.totalRackingTables) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* TRENDS TAB */}
      {activeView === 'trends' && (
        <div className="space-y-6">
          {/* Weekly Production */}
          <div className={`rounded-2xl border p-4 lg:p-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <h3 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-slate-800'}`}>Production vs Target</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={productionTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e2e8f0'} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke={darkMode ? '#64748b' : '#94a3b8'} />
                  <YAxis tick={{ fontSize: 11 }} stroke={darkMode ? '#64748b' : '#94a3b8'} />
                  <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1e293b' : 'white', border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`, borderRadius: '8px' }} />
                  <Legend />
                  <Line type="monotone" dataKey="piles" stroke="#3b82f6" strokeWidth={2} name="Piles" dot={false} />
                  <Line type="monotone" dataKey="modules" stroke="#f97316" strokeWidth={2} name="Modules" dot={false} />
                  <Line type="monotone" dataKey="inspections" stroke="#10b981" strokeWidth={2} name="Inspections" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Daily Averages */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className={`rounded-xl p-4 ${darkMode ? 'bg-slate-800' : 'bg-white border border-slate-200'}`}>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Avg Daily Piles</p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{avgDailyPiles.toFixed(1)}</p>
              <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>last 14 days</p>
            </div>
            <div className={`rounded-xl p-4 ${darkMode ? 'bg-slate-800' : 'bg-white border border-slate-200'}`}>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Avg Daily Modules</p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{avgDailyModules.toFixed(1)}</p>
              <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>last 14 days</p>
            </div>
            <div className={`rounded-xl p-4 ${darkMode ? 'bg-slate-800' : 'bg-white border border-slate-200'}`}>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Est. Days Remaining</p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{Math.max(daysToCompletePiles, daysToCompleteModules)}</p>
              <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>at current rate</p>
            </div>
          </div>

          {/* Forecast */}
          <div className={`rounded-2xl border p-4 lg:p-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <h3 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-slate-800'}`}>Completion Forecast</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Planned End Date</p>
                <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                  {format(new Date(project.plannedEndDate), 'MMMM d, yyyy')}
                </p>
              </div>
              <div>
                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Projected End (at current rate)</p>
                <p className={`text-xl font-bold ${
                  daysToCompleteModules > Math.ceil((new Date(project.plannedEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                    ? 'text-red-500'
                    : 'text-green-500'
                }`}>
                  {format(addDays(new Date(), Math.max(daysToCompletePiles, daysToCompleteModules)), 'MMMM d, yyyy')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Reports View Component
function ReportsView({ project, darkMode, reportType, setReportType, reportDate, setReportDate,
  reportWeekStart, setReportWeekStart, reportMonth, setReportMonth, includeQC, setIncludeQC }: {
  project: Project; darkMode: boolean; reportType: 'daily' | 'weekly' | 'monthly';
  setReportType: (t: 'daily' | 'weekly' | 'monthly') => void;
  reportDate: string; setReportDate: (d: string) => void;
  reportWeekStart: string; setReportWeekStart: (d: string) => void;
  reportMonth: string; setReportMonth: (m: string) => void;
  includeQC: boolean; setIncludeQC: (b: boolean) => void;
}) {
  const [loading, setLoading] = useState(false)

  const downloadCSV = async () => {
    setLoading(true)
    try {
      let startDate: string, endDate: string
      const today = new Date()
      
      switch (reportType) {
        case 'daily':
          startDate = reportDate
          endDate = reportDate
          break
        case 'weekly':
          startDate = reportWeekStart
          const weekEnd = addDays(new Date(reportWeekStart), 6)
          endDate = format(weekEnd, 'yyyy-MM-dd')
          break
        case 'monthly':
          const [year, month] = reportMonth.split('-')
          startDate = `${year}-${month}-01`
          const monthEnd = new Date(parseInt(year), parseInt(month), 0)
          endDate = format(monthEnd, 'yyyy-MM-dd')
          break
      }

      const response = await fetch(`/api/reports?projectId=${project.id}&type=custom&startDate=${startDate}&endDate=${endDate}&format=csv&includeQC=${includeQC}`)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${project.name}_${reportType}_report.csv`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('Report downloaded!')
    } catch { toast.error('Failed to download report') }
    finally { setLoading(false) }
  }

  const progress = calculateProjectProgress(project)

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Reports</h2>
        <p className={darkMode ? 'text-slate-400' : 'text-slate-600'}>{project.name}</p>
      </div>

      <div className={`rounded-2xl border p-4 lg:p-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <h3 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-slate-800'}`}>Generate Report</h3>
        
        {/* Report Type Selection */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {(['daily', 'weekly', 'monthly'] as const).map(type => (
            <button key={type} onClick={() => setReportType(type)}
              className={`py-3 px-4 rounded-xl font-medium capitalize transition-all ${
                reportType === type ? 'bg-orange-500 text-white' : darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}>
              {type}
            </button>
          ))}
        </div>

        {/* Date Pickers */}
        <div className="space-y-4 mb-4">
          {reportType === 'daily' && (
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Select Date</label>
              <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)}
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200'}`} />
            </div>
          )}
          
          {reportType === 'weekly' && (
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Week Starting</label>
              <input type="date" value={reportWeekStart} onChange={(e) => setReportWeekStart(e.target.value)}
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200'}`} />
              <p className={`text-xs mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                Report will cover: {format(new Date(reportWeekStart), 'MMM d')} - {format(addDays(new Date(reportWeekStart), 6), 'MMM d, yyyy')}
              </p>
            </div>
          )}
          
          {reportType === 'monthly' && (
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Select Month</label>
              <input type="month" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)}
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200'}`} />
            </div>
          )}
        </div>

        {/* Include QC Toggle */}
        <div className={`flex items-center justify-between p-3 rounded-xl mb-4 ${darkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
          <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Include QC Data</span>
          <button onClick={() => setIncludeQC(!includeQC)}
            className={`w-12 h-6 rounded-full transition-all ${includeQC ? 'bg-orange-500' : darkMode ? 'bg-slate-600' : 'bg-slate-300'}`}>
            <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${includeQC ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>
        
        <button onClick={downloadCSV} disabled={loading}
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
          {loading ? <><RefreshCw className="w-5 h-5 animate-spin" />Generating...</> : <><Download className="w-5 h-5" />Download CSV Report</>}
        </button>
      </div>

      {/* Quick Stats */}
      <div className={`rounded-2xl border p-4 lg:p-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <h3 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-slate-800'}`}>Project Summary</h3>
        <div className="space-y-3">
          {[
            { label: 'Piles Progress', value: `${progress.piles}%` },
            { label: 'Racking Progress', value: `${progress.racking}%` },
            { label: 'Modules Progress', value: `${progress.modules}%` },
            { label: 'Overall Progress', value: `${progress.overall}%`, highlight: true },
          ].map(({ label, value, highlight }) => (
            <div key={label} className={`flex justify-between items-center p-3 rounded-xl ${highlight ? 'bg-orange-50 dark:bg-orange-900/20' : darkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
              <span className={highlight ? 'text-orange-700 dark:text-orange-400' : darkMode ? 'text-slate-400' : 'text-slate-600'}>{label}</span>
              <span className={`font-bold ${highlight ? 'text-orange-600' : darkMode ? 'text-white' : 'text-slate-800'}`}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// New Project Form Component
function NewProjectForm({ company, darkMode, onSuccess, onCancel }: {
  company: Company; darkMode: boolean; onSuccess: () => void; onCancel: () => void;
}) {
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [type, setType] = useState<'utility' | 'ci'>('utility')
  const [totalPiles, setTotalPiles] = useState('')
  const [totalRackingTables, setTotalRackingTables] = useState('')
  const [totalModules, setTotalModules] = useState('')
  const [plannedStartDate, setPlannedStartDate] = useState('')
  const [plannedEndDate, setPlannedEndDate] = useState('')
  const [plannedPilesPerDay, setPlannedPilesPerDay] = useState('')
  const [plannedRackingPerDay, setPlannedRackingPerDay] = useState('')
  const [plannedModulesPerDay, setPlannedModulesPerDay] = useState('')
  const [pileIdFormat, setPileIdFormat] = useState('{Row}-{Pile}')
  const [rackingSystemId, setRackingSystemId] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!name || !location || !plannedStartDate || !plannedEndDate) {
      toast.error('Please fill in required fields')
      return
    }
    setLoading(true)
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, location, type,
          totalPiles: parseInt(totalPiles) || 0,
          totalRackingTables: parseInt(totalRackingTables) || 0,
          totalModules: parseInt(totalModules) || 0,
          plannedStartDate, plannedEndDate,
          plannedPilesPerDay: parseFloat(plannedPilesPerDay) || 0,
          plannedRackingPerDay: parseFloat(plannedRackingPerDay) || 0,
          plannedModulesPerDay: parseFloat(plannedModulesPerDay) || 0,
          pileIdFormat,
          rackingSystemId: rackingSystemId || null,
          companyId: company.id,
        })
      })
      if (response.ok) { onSuccess() }
      else { toast.error('Failed to create project') }
    } catch { toast.error('Failed to create project') }
    finally { setLoading(false) }
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Create New Project</h2>
        <p className={darkMode ? 'text-slate-400' : 'text-slate-600'}>Set up a new solar construction project</p>
      </div>

      <div className={`rounded-2xl border p-4 lg:p-6 space-y-4 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Project Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Desert Sun Solar Farm"
              className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200'}`} />
          </div>
          <div className="col-span-2 lg:col-span-1">
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Location *</label>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., Phoenix, AZ"
              className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200'}`} />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Project Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as any)}
              className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200'}`}>
              <option value="utility">Utility Scale</option>
              <option value="ci">Commercial & Industrial</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Total Piles</label>
            <input type="number" value={totalPiles} onChange={(e) => setTotalPiles(e.target.value)} placeholder="0"
              className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200'}`} />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Total Racking</label>
            <input type="number" value={totalRackingTables} onChange={(e) => setTotalRackingTables(e.target.value)} placeholder="0"
              className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200'}`} />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Total Modules</label>
            <input type="number" value={totalModules} onChange={(e) => setTotalModules(e.target.value)} placeholder="0"
              className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200'}`} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Planned Start Date *</label>
            <input type="date" value={plannedStartDate} onChange={(e) => setPlannedStartDate(e.target.value)}
              className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200'}`} />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Planned End Date *</label>
            <input type="date" value={plannedEndDate} onChange={(e) => setPlannedEndDate(e.target.value)}
              className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200'}`} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Piles/Day Target</label>
            <input type="number" value={plannedPilesPerDay} onChange={(e) => setPlannedPilesPerDay(e.target.value)} placeholder="0"
              className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200'}`} />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Racking/Day Target</label>
            <input type="number" value={plannedRackingPerDay} onChange={(e) => setPlannedRackingPerDay(e.target.value)} placeholder="0"
              className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200'}`} />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Modules/Day Target</label>
            <input type="number" value={plannedModulesPerDay} onChange={(e) => setPlannedModulesPerDay(e.target.value)} placeholder="0"
              className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200'}`} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Pile ID Format</label>
            <select value={pileIdFormat} onChange={(e) => setPileIdFormat(e.target.value)}
              className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200'}`}>
              <option value="{Row}-{Pile}">Row-Pile (e.g., 35-22)</option>
              <option value="{Block}-{Row}-{Pile}">Block-Row-Pile (e.g., N1-35-22)</option>
              <option value="{Pile}">Sequential (e.g., P-001)</option>
            </select>
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Racking System</label>
            <select value={rackingSystemId} onChange={(e) => setRackingSystemId(e.target.value)}
              className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200'}`}>
              <option value="">Select system...</option>
              {company.rackingSystems?.map(rs => <option key={rs.id} value={rs.id}>{rs.name}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button onClick={onCancel} className={`flex-1 py-3 rounded-xl font-medium ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-medium disabled:opacity-50">
            {loading ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Settings View Component
function SettingsView({ company, user, darkMode, onUpdate }: {
  company: Company; user: User | null; darkMode: boolean; onUpdate: () => void;
}) {
  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Settings</h2>
        <p className={darkMode ? 'text-slate-400' : 'text-slate-600'}>Manage your account and projects</p>
      </div>

      {/* Company Info */}
      <div className={`rounded-2xl border p-4 lg:p-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <h3 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-slate-800'}`}>Company</h3>
        <div className="space-y-3">
          <div className={`flex justify-between items-center p-3 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
            <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>Name</span>
            <span className={`font-medium ${darkMode ? 'text-white' : 'text-slate-800'}`}>{company.name}</span>
          </div>
          <div className={`flex justify-between items-center p-3 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
            <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>Subscription</span>
            <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium capitalize">{company.subscription}</span>
          </div>
          <div className={`flex justify-between items-center p-3 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
            <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>Projects</span>
            <span className={`font-medium ${darkMode ? 'text-white' : 'text-slate-800'}`}>{company.projects?.length || 0}</span>
          </div>
        </div>
      </div>

      {/* Racking Systems */}
      <div className={`rounded-2xl border p-4 lg:p-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Racking Systems</h3>
          <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{company.rackingSystems?.length || 0} profiles</span>
        </div>
        <div className="space-y-2">
          {company.rackingSystems?.map(rs => (
            <div key={rs.id} className={`p-3 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
              <p className={`font-medium ${darkMode ? 'text-white' : 'text-slate-800'}`}>{rs.name}</p>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{rs.manufacturer}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Team */}
      <div className={`rounded-2xl border p-4 lg:p-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <h3 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-slate-800'}`}>Team Members</h3>
        <div className="space-y-2">
          {company.users?.map(u => (
            <div key={u.id} className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <span className="text-orange-600 font-medium">{u.name.charAt(0)}</span>
                </div>
                <div>
                  <p className={`font-medium ${darkMode ? 'text-white' : 'text-slate-800'}`}>{u.name}</p>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{u.email}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                u.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                u.role === 'pm' ? 'bg-green-100 text-green-700' :
                u.role === 'inspector' ? 'bg-purple-100 text-purple-700' :
                'bg-slate-100 text-slate-600'
              }`}>
                {u.role}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Edit Project Modal Component
function EditProjectModal({ project, rackingSystems, darkMode, onClose, onSave }: {
  project: Project; rackingSystems: RackingSystem[]; darkMode: boolean;
  onClose: () => void; onSave: (data: any) => void;
}) {
  const [name, setName] = useState(project.name)
  const [location, setLocation] = useState(project.location)
  const [totalPiles, setTotalPiles] = useState(String(project.totalPiles))
  const [totalRackingTables, setTotalRackingTables] = useState(String(project.totalRackingTables))
  const [totalModules, setTotalModules] = useState(String(project.totalModules))
  const [plannedStartDate, setPlannedStartDate] = useState(format(new Date(project.plannedStartDate), 'yyyy-MM-dd'))
  const [plannedEndDate, setPlannedEndDate] = useState(format(new Date(project.plannedEndDate), 'yyyy-MM-dd'))
  const [plannedPilesPerDay, setPlannedPilesPerDay] = useState(String(project.plannedPilesPerDay))
  const [plannedRackingPerDay, setPlannedRackingPerDay] = useState(String(project.plannedRackingPerDay))
  const [plannedModulesPerDay, setPlannedModulesPerDay] = useState(String(project.plannedModulesPerDay))
  const [pileIdFormat, setPileIdFormat] = useState(project.pileIdFormat || '{Row}-{Pile}')
  const [rackingSystemId, setRackingSystemId] = useState(project.rackingSystemId || '')

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className={`w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6 ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Edit Project</h3>
          <button onClick={onClose} className={darkMode ? 'text-slate-400' : 'text-slate-500'}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Project Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200'}`} />
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Location</label>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
              className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200'}`} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Total Piles</label>
              <input type="number" value={totalPiles} onChange={(e) => setTotalPiles(e.target.value)}
                className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200'}`} />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Total Racking</label>
              <input type="number" value={totalRackingTables} onChange={(e) => setTotalRackingTables(e.target.value)}
                className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200'}`} />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Total Modules</label>
              <input type="number" value={totalModules} onChange={(e) => setTotalModules(e.target.value)}
                className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200'}`} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Start Date</label>
              <input type="date" value={plannedStartDate} onChange={(e) => setPlannedStartDate(e.target.value)}
                className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200'}`} />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>End Date</label>
              <input type="date" value={plannedEndDate} onChange={(e) => setPlannedEndDate(e.target.value)}
                className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200'}`} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Piles/Day</label>
              <input type="number" value={plannedPilesPerDay} onChange={(e) => setPlannedPilesPerDay(e.target.value)}
                className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200'}`} />
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Racking/Day</label>
              <input type="number" value={plannedRackingPerDay} onChange={(e) => setPlannedRackingPerDay(e.target.value)}
                className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200'}`} />
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Modules/Day</label>
              <input type="number" value={plannedModulesPerDay} onChange={(e) => setPlannedModulesPerDay(e.target.value)}
                className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200'}`} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Pile ID Format</label>
              <select value={pileIdFormat} onChange={(e) => setPileIdFormat(e.target.value)}
                className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200'}`}>
                <option value="{Row}-{Pile}">Row-Pile</option>
                <option value="{Block}-{Row}-{Pile}">Block-Row-Pile</option>
                <option value="{Pile}">Sequential</option>
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Racking System</label>
              <select value={rackingSystemId} onChange={(e) => setRackingSystemId(e.target.value)}
                className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200'}`}>
                <option value="">None</option>
                {rackingSystems.map(rs => <option key={rs.id} value={rs.id}>{rs.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className={`flex-1 py-2.5 rounded-xl font-medium ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
            Cancel
          </button>
          <button onClick={() => onSave({
            id: project.id, name, location,
            totalPiles: parseInt(totalPiles) || 0,
            totalRackingTables: parseInt(totalRackingTables) || 0,
            totalModules: parseInt(totalModules) || 0,
            plannedStartDate, plannedEndDate,
            plannedPilesPerDay: parseFloat(plannedPilesPerDay) || 0,
            plannedRackingPerDay: parseFloat(plannedRackingPerDay) || 0,
            plannedModulesPerDay: parseFloat(plannedModulesPerDay) || 0,
            pileIdFormat, rackingSystemId: rackingSystemId || null
          })} className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-medium">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

// Stat Card Component
function StatCard({ title, value, icon: Icon, color, darkMode }: {
  title: string; value: string | number; icon: any; color: string; darkMode: boolean;
}) {
  const colors: Record<string, string> = {
    blue: darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600',
    orange: darkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-50 text-orange-600',
    green: darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600',
    red: darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600',
    yellow: darkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-50 text-yellow-600'
  }

  return (
    <div className={`rounded-2xl border p-4 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
      <div className={`p-2 rounded-xl w-fit mb-2 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{value}</p>
      <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{title}</p>
    </div>
  )
}

// Progress Card Component
function ProgressCard({ title, installed, total, percent, color, darkMode }: {
  title: string; installed: number; total: number; percent: number; color: string; darkMode: boolean;
}) {
  const gradients: Record<string, string> = {
    blue: 'from-blue-400 to-blue-600',
    purple: 'from-purple-400 to-purple-600',
    orange: 'from-orange-400 to-orange-600'
  }

  return (
    <div className={`rounded-2xl border p-4 text-center ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
      <p className={`text-sm mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{title}</p>
      <p className={`text-2xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-slate-800'}`}>{percent}%</p>
      <div className={`h-1.5 rounded-full overflow-hidden mb-2 ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
        <div className={`h-full bg-gradient-to-r ${gradients[color]} rounded-full transition-all`} style={{ width: `${Math.min(100, percent)}%` }} />
      </div>
      <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>{formatNumber(installed)} / {formatNumber(total)}</p>
    </div>
  )
}

// Helper Functions
function calculateCompanyStats(company: Company) {
  const activeProjects = company.projects?.filter(p => p.status === 'active').length || 0
  const totalPiles = company.projects?.reduce((sum, p) => sum + p.productionEntries?.reduce((s, e) => s + e.piles, 0), 0) || 0
  const totalRacking = company.projects?.reduce((sum, p) => sum + p.productionEntries?.reduce((s, e) => s + e.rackingTables, 0), 0) || 0
  const totalModules = company.projects?.reduce((sum, p) => sum + p.productionEntries?.reduce((s, e) => s + e.modules, 0), 0) || 0
  const totalTargetModules = company.projects?.reduce((sum, p) => sum + p.totalModules, 0) || 1
  const openIssues = company.projects?.reduce((sum, p) => sum + (p.qcIssues?.length || 0), 0) || 0
  const overallProgress = totalTargetModules > 0 ? Math.round((totalModules / totalTargetModules) * 100) : 0

  return { activeProjects, totalPiles, totalRacking, totalModules, overallProgress, openIssues }
}

function getTodayProduction(projects: Project[]) {
  const today = format(new Date(), 'yyyy-MM-dd')
  return projects.reduce((sum, p) => {
    const todayEntries = p.productionEntries?.filter(e => format(new Date(e.date), 'yyyy-MM-dd') === today) || []
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
    const weekEntries = p.productionEntries?.filter(e => {
      const date = new Date(e.date)
      return date >= weekStart && date <= today
    }) || []
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
    const monthEntries = p.productionEntries?.filter(e => {
      const date = new Date(e.date)
      return date >= monthStart && date <= today
    }) || []
    return {
      piles: sum.piles + monthEntries.reduce((s, e) => s + e.piles, 0),
      racking: sum.racking + monthEntries.reduce((s, e) => s + e.rackingTables, 0),
      modules: sum.modules + monthEntries.reduce((s, e) => s + e.modules, 0)
    }
  }, { piles: 0, racking: 0, modules: 0 })
}

function calculateProjectProgress(project: Project) {
  const installedPiles = project.productionEntries?.reduce((sum, e) => sum + e.piles, 0) || 0
  const installedRacking = project.productionEntries?.reduce((sum, e) => sum + e.rackingTables, 0) || 0
  const installedModules = project.productionEntries?.reduce((sum, e) => sum + e.modules, 0) || 0

  const piles = project.totalPiles > 0 ? Math.round((installedPiles / project.totalPiles) * 100) : 0
  const racking = project.totalRackingTables > 0 ? Math.round((installedRacking / project.totalRackingTables) * 100) : 0
  const modules = project.totalModules > 0 ? Math.round((installedModules / project.totalModules) * 100) : 0

  return {
    piles, racking, modules,
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
  
  const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
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

function calculateRecovery(project: Project) {
  const forecast = calculateForecast(project)
  const today = new Date()
  const end = new Date(project.plannedEndDate)
  
  const progress = calculateProjectProgress(project)
  const remaining = project.totalModules - progress.modulesInstalled
  const remainingDays = Math.max(1, Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
  
  const neededDaily = Math.ceil(remaining / remainingDays)
  const currentDaily = Math.round(forecast.avgDaily)

  return { neededDaily, currentDaily }
}

function getProgressChartData(project: Project) {
  const start = new Date(project.plannedStartDate)
  const end = new Date(project.plannedEndDate)
  const today = new Date()
  
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  const daysElapsed = Math.min(totalDays, Math.max(0, Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))))
  
  const data: { date: string; planned: number; actual: number }[] = []
  let cumulativeModules = 0
  
  const sortedEntries = [...(project.productionEntries || [])].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )
  
  // Generate data points every few days for better chart
  const step = Math.max(1, Math.floor(daysElapsed / 15))
  
  for (let i = 0; i <= daysElapsed; i += step) {
    const date = new Date(start)
    date.setDate(date.getDate() + i)
    
    // Find all entries up to this date
    const entriesUpToDate = sortedEntries.filter(e => new Date(e.date) <= date)
    cumulativeModules = entriesUpToDate.reduce((sum, e) => sum + e.modules, 0)
    
    const plannedProgress = (i / totalDays) * 100
    const actualProgress = project.totalModules > 0 ? (cumulativeModules / project.totalModules) * 100 : 0
    
    data.push({
      date: format(date, 'MMM d'),
      planned: Math.round(plannedProgress * 10) / 10,
      actual: Math.round(actualProgress * 10) / 10
    })
  }
  
  // Add today's point if not already included
  if (data.length === 0 || data[data.length - 1].date !== format(today, 'MMM d')) {
    const plannedProgress = (daysElapsed / totalDays) * 100
    const actualProgress = project.totalModules > 0 ? (cumulativeModules / project.totalModules) * 100 : 0
    data.push({
      date: format(today, 'MMM d'),
      planned: Math.round(plannedProgress * 10) / 10,
      actual: Math.round(actualProgress * 10) / 10
    })
  }
  
  return data
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}
