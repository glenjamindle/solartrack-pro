import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

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
  qc?: {
    total: number;
    passed: number;
    failed: number;
    passRate: number;
    openIssues: number;
    refusals: number;
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
    const reportType = searchParams.get('type') || 'daily';
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const format = searchParams.get('format') || 'json';
    const includeQC = searchParams.get('includeQC') !== 'false';
    
    const today = new Date();
    let startDate: Date;
    let endDate: Date = today;
    
    switch (reportType) {
      case 'daily':
        startDate = startDateParam ? new Date(startDateParam) : today;
        endDate = startDate;
        break;
      case 'weekly':
        startDate = startDateParam ? new Date(startDateParam) : subDays(today, 7);
        endDate = endDateParam ? new Date(endDateParam) : today;
        break;
      case 'monthly':
        startDate = startDateParam ? new Date(startDateParam) : subDays(today, 30);
        endDate = endDateParam ? new Date(endDateParam) : today;
        break;
      case 'custom':
        startDate = startDateParam ? new Date(startDateParam) : today;
        endDate = endDateParam ? new Date(endDateParam) : today;
        break;
      default:
        startDate = today;
    }

    if (projectId) {
      const reportData = await generateProjectReport(projectId, startDate, endDate, includeQC);
      
      if (format === 'csv') {
        const csv = generateCSV(reportData, includeQC);
        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${reportData.project.name}_report.csv"`
          }
        });
      }
      
      return NextResponse.json(reportData);
    }

    return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}

function subDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

async function generateProjectReport(projectId: string, startDate: Date, endDate: Date, includeQC: boolean): Promise<ReportData> {
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
      inspections: includeQC ? {
        where: {
          date: { gte: startDate, lte: endDate }
        },
        include: { items: true }
      } : false,
      qcIssues: includeQC ? { where: { status: 'open' } } : false,
      refusals: includeQC ? { where: { status: 'open' } } : false
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

  // Calculate forecast
  const forecast = calculateForecast(project, totals);

  // QC data
  let qcData = undefined;
  if (includeQC) {
    const inspections = project.inspections as any[] || [];
    qcData = {
      total: inspections.length,
      passed: inspections.filter(i => i.status === 'pass').length,
      failed: inspections.filter(i => i.status === 'fail').length,
      passRate: inspections.length > 0 
        ? Math.round((inspections.filter(i => i.status === 'pass').length / inspections.length) * 100)
        : 100,
      openIssues: (project.qcIssues as any[] || []).length,
      refusals: (project.refusals as any[] || []).length,
    };
  }

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
    qc: qcData,
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
  
  const remainingModules = Math.max(0, project.totalModules - totals.modules);
  
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

function generateCSV(report: ReportData, includeQC: boolean): string {
  const lines: string[] = [];
  const formatDate = (d: Date) => new Date(d).toISOString().split('T')[0];
  
  // Header
  lines.push(`Solar Construction Report - ${report.project.name}`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Period: ${formatDate(report.period.startDate)} to ${formatDate(report.period.endDate)}`);
  lines.push('');
  
  // Project Summary
  lines.push('PROJECT SUMMARY');
  lines.push('Metric,Value');
  lines.push(`Project Name,${report.project.name}`);
  lines.push(`Location,${report.project.location}`);
  lines.push(`Type,${report.project.type}`);
  lines.push(`Total Piles Planned,${report.project.totalPiles}`);
  lines.push(`Total Piles Installed,${report.production.totals.piles}`);
  lines.push(`Piles Progress,${report.project.totalPiles > 0 ? Math.round((report.production.totals.piles / report.project.totalPiles) * 100) : 0}%`);
  lines.push(`Total Racking Planned,${report.project.totalRackingTables}`);
  lines.push(`Total Racking Installed,${report.production.totals.racking}`);
  lines.push(`Racking Progress,${report.project.totalRackingTables > 0 ? Math.round((report.production.totals.racking / report.project.totalRackingTables) * 100) : 0}%`);
  lines.push(`Total Modules Planned,${report.project.totalModules}`);
  lines.push(`Total Modules Installed,${report.production.totals.modules}`);
  lines.push(`Modules Progress,${report.project.totalModules > 0 ? Math.round((report.production.totals.modules / report.project.totalModules) * 100) : 0}%`);
  lines.push(`Daily Average (Modules),${report.production.dailyAverage.modules}`);
  lines.push(`Planned Completion,${formatDate(report.project.plannedEndDate)}`);
  if (report.forecast.projectedDate) {
    lines.push(`Projected Completion,${formatDate(report.forecast.projectedDate)}`);
    lines.push(`Schedule Variance,${report.forecast.daysVariance} days`);
  }
  lines.push('');
  
  // QC Summary
  if (includeQC && report.qc) {
    lines.push('QC SUMMARY');
    lines.push(`Total Inspections,${report.qc.total}`);
    lines.push(`Passed,${report.qc.passed}`);
    lines.push(`Failed,${report.qc.failed}`);
    lines.push(`Pass Rate,${report.qc.passRate}%`);
    lines.push(`Open Issues,${report.qc.openIssues}`);
    lines.push(`Open Refusals,${report.qc.refusals}`);
    lines.push('');
  }
  
  // Production Entries
  lines.push('DAILY PRODUCTION');
  lines.push('Date,Piles,Racking,Modules,Crew,Entered By');
  for (const entry of report.production.entries) {
    lines.push(`${formatDate(entry.date)},${entry.piles},${entry.rackingTables},${entry.modules},${entry.crew?.name || 'N/A'},${entry.user?.name || 'N/A'}`);
  }
  
  return lines.join('\n');
}
