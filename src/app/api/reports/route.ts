import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface ReportData {
  project: {
    id: string;
    name: string;
    location: string;
    type: string;
    totalPiles: number;
    totalRackingTables: number;
    totalModules: number;
    plannedStartDate: Date;
    plannedEndDate: Date;
  };
  production: {
    entries: any[];
    totals: { piles: number; racking: number; modules: number };
    dailyAverage: { piles: number; racking: number; modules: number };
  };
  qc: {
    total: number;
    passed: number;
    failed: number;
    passRate: number;
    openIssues: number;
  };
  forecast: {
    projectedDate: Date | null;
    daysVariance: number | null;
  };
  period: {
    startDate: Date;
    endDate: Date;
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const companyId = searchParams.get('companyId');
    const reportType = searchParams.get('type') || 'daily';
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const format = searchParams.get('format') || 'json';
    
    const today = new Date();
    let startDate: Date;
    let endDate: Date = today;
    
    // Determine date range based on report type
    switch (reportType) {
      case 'daily':
        startDate = today;
        break;
      case 'weekly':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'monthly':
        startDate = new Date(today);
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'custom':
        startDate = startDateParam ? new Date(startDateParam) : new Date(today);
        endDate = endDateParam ? new Date(endDateParam) : today;
        break;
      default:
        startDate = today;
    }

    if (projectId) {
      const reportData = await generateProjectReport(projectId, startDate, endDate);
      
      if (format === 'csv') {
        const csv = generateCSV(reportData);
        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${reportData.project.name}_report.csv"`
          }
        });
      }
      
      return NextResponse.json(reportData);
    }

    if (companyId) {
      const company = await db.company.findUnique({
        where: { id: companyId },
        include: {
          projects: {
            where: { status: 'active' },
            include: {
              productionEntries: {
                where: {
                  date: {
                    gte: startDate,
                    lte: endDate
                  }
                }
              },
              inspections: {
                where: {
                  date: {
                    gte: startDate,
                    lte: endDate
                  }
                }
              },
              qcIssues: { where: { status: 'open' } }
            }
          }
        }
      });

      const companyReport = {
        company: company?.name,
        period: { startDate, endDate },
        projects: company?.projects.map(p => {
          const totalPiles = p.productionEntries.reduce((sum, e) => sum + e.piles, 0);
          const totalRacking = p.productionEntries.reduce((sum, e) => sum + e.rackingTables, 0);
          const totalModules = p.productionEntries.reduce((sum, e) => sum + e.modules, 0);
          
          return {
            name: p.name,
            location: p.location,
            pilesInstalled: totalPiles,
            rackingInstalled: totalRacking,
            modulesInstalled: totalModules,
            pilesPercent: Math.round((totalPiles / p.totalPiles) * 100),
            rackingPercent: Math.round((totalRacking / p.totalRackingTables) * 100),
            modulesPercent: Math.round((totalModules / p.totalModules) * 100),
            openIssues: p.qcIssues.length,
          };
        })
      };

      return NextResponse.json(companyReport);
    }

    return NextResponse.json({ error: 'projectId or companyId required' }, { status: 400 });
  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}

async function generateProjectReport(projectId: string, startDate: Date, endDate: Date): Promise<ReportData> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      productionEntries: {
        where: {
          date: { gte: startDate, lte: endDate }
        },
        orderBy: { date: 'asc' },
        include: {
          user: { select: { name: true } },
          crew: { select: { name: true } },
        }
      },
      inspections: {
        where: {
          date: { gte: startDate, lte: endDate }
        },
        include: { items: true }
      },
      qcIssues: { where: { status: 'open' } }
    }
  });

  if (!project) throw new Error('Project not found');

  const totals = {
    piles: project.productionEntries.reduce((sum, e) => sum + e.piles, 0),
    racking: project.productionEntries.reduce((sum, e) => sum + e.rackingTables, 0),
    modules: project.productionEntries.reduce((sum, e) => sum + e.modules, 0),
  };

  const daysWorked = new Set(project.productionEntries.map(e => e.date.toDateString())).size || 1;
  
  const dailyAverage = {
    piles: Math.round(totals.piles / daysWorked),
    racking: Math.round(totals.racking / daysWorked),
    modules: Math.round(totals.modules / daysWorked),
  };

  const qcStats = {
    total: project.inspections.length,
    passed: project.inspections.filter(i => i.status === 'pass').length,
    failed: project.inspections.filter(i => i.status === 'fail').length,
    passRate: project.inspections.length > 0 
      ? Math.round((project.inspections.filter(i => i.status === 'pass').length / project.inspections.length) * 100)
      : 100,
    openIssues: project.qcIssues.length,
  };

  // Calculate forecast
  const forecast = calculateForecast(project, totals);

  return {
    project: {
      id: project.id,
      name: project.name,
      location: project.location,
      type: project.type,
      totalPiles: project.totalPiles,
      totalRackingTables: project.totalRackingTables,
      totalModules: project.totalModules,
      plannedStartDate: project.plannedStartDate,
      plannedEndDate: project.plannedEndDate,
    },
    production: {
      entries: project.productionEntries,
      totals,
      dailyAverage,
    },
    qc: qcStats,
    forecast,
    period: { startDate, endDate },
  };
}

function calculateForecast(project: any, totals: { piles: number; racking: number; modules: number }) {
  const today = new Date();
  const start = new Date(project.plannedStartDate);
  const end = new Date(project.plannedEndDate);
  
  const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const daysElapsed = Math.max(1, Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const daysRemaining = Math.max(0, Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  
  // Calculate remaining work
  const remainingPiles = Math.max(0, project.totalPiles - totals.piles);
  const remainingRacking = Math.max(0, project.totalRackingTables - totals.racking);
  const remainingModules = Math.max(0, project.totalModules - totals.modules);
  
  // Use weighted average of modules as primary (most time-consuming)
  const avgDailyModules = totals.modules / Math.max(1, daysElapsed);
  const daysNeeded = avgDailyModules > 0 ? Math.ceil(remainingModules / avgDailyModules) : daysRemaining;
  
  const projectedDate = new Date(today);
  projectedDate.setDate(projectedDate.getDate() + daysNeeded);
  
  const daysVariance = Math.ceil((projectedDate.getTime() - end.getTime()) / (1000 * 60 * 60 * 24));

  return {
    projectedDate: daysVariance > -totalDays ? projectedDate : null,
    daysVariance: daysVariance > -totalDays ? daysVariance : null,
  };
}

function generateCSV(report: ReportData): string {
  const lines: string[] = [];
  
  // Header
  lines.push(`Solar Construction Report - ${report.project.name}`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Period: ${report.period.startDate.toISOString()} to ${report.period.endDate.toISOString()}`);
  lines.push('');
  
  // Summary
  lines.push('PROJECT SUMMARY');
  lines.push('Metric,Value');
  lines.push(`Total Piles Planned,${report.project.totalPiles}`);
  lines.push(`Total Piles Installed,${report.production.totals.piles}`);
  lines.push(`Piles Progress,${Math.round((report.production.totals.piles / report.project.totalPiles) * 100)}%`);
  lines.push(`Total Racking Planned,${report.project.totalRackingTables}`);
  lines.push(`Total Racking Installed,${report.production.totals.racking}`);
  lines.push(`Racking Progress,${Math.round((report.production.totals.racking / report.project.totalRackingTables) * 100)}%`);
  lines.push(`Total Modules Planned,${report.project.totalModules}`);
  lines.push(`Total Modules Installed,${report.production.totals.modules}`);
  lines.push(`Modules Progress,${Math.round((report.production.totals.modules / report.project.totalModules) * 100)}%`);
  lines.push('');
  
  // QC Summary
  lines.push('QC SUMMARY');
  lines.push(`Total Inspections,${report.qc.total}`);
  lines.push(`Passed,${report.qc.passed}`);
  lines.push(`Failed,${report.qc.failed}`);
  lines.push(`Pass Rate,${report.qc.passRate}%`);
  lines.push(`Open Issues,${report.qc.openIssues}`);
  lines.push('');
  
  // Production Entries
  lines.push('DAILY PRODUCTION');
  lines.push('Date,Piles,Racking,Modules,Crew,Entered By');
  for (const entry of report.production.entries) {
    lines.push(`${entry.date.toISOString().split('T')[0]},${entry.piles},${entry.rackingTables},${entry.modules},${entry.crew?.name || 'N/A'},${entry.user?.name || 'N/A'}`);
  }
  
  return lines.join('\n');
}
