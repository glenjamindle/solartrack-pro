import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const projectId = searchParams.get('projectId');
    
    if (projectId) {
      const project = await db.project.findUnique({
        where: { id: projectId },
        include: {
          productionEntries: {
            orderBy: { date: 'desc' },
            include: {
              user: { select: { id: true, name: true } },
              crew: { select: { id: true, name: true } },
              subcontractor: { select: { id: true, name: true } },
            }
          },
          inspections: {
            orderBy: { date: 'desc' },
            include: {
              user: { select: { id: true, name: true } },
              items: true,
            }
          },
          qcIssues: {
            orderBy: { openedAt: 'desc' },
          },
          userAssignments: {
            include: { user: true }
          }
        }
      });
      
      return NextResponse.json({ project });
    }
    
    if (companyId) {
      const projects = await db.project.findMany({
        where: { companyId },
        include: {
          productionEntries: {
            orderBy: { date: 'desc' },
            take: 30,
          },
          inspections: true,
          qcIssues: {
            where: { status: 'open' }
          },
        },
        orderBy: { createdAt: 'desc' }
      });
      
      return NextResponse.json({ projects });
    }

    return NextResponse.json({ error: 'companyId or projectId required' }, { status: 400 });
  } catch (error) {
    console.error('Get projects error:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    const project = await db.project.create({
      data: {
        name: data.name,
        location: data.location,
        type: data.type || 'utility',
        status: data.status || 'active',
        totalPiles: data.totalPiles || 0,
        totalRackingTables: data.totalRackingTables || 0,
        totalModules: data.totalModules || 0,
        plannedStartDate: new Date(data.plannedStartDate),
        plannedEndDate: new Date(data.plannedEndDate),
        plannedPilesPerDay: data.plannedPilesPerDay || 0,
        plannedRackingPerDay: data.plannedRackingPerDay || 0,
        plannedModulesPerDay: data.plannedModulesPerDay || 0,
        companyId: data.companyId,
      }
    });

    return NextResponse.json({ project });
  } catch (error) {
    console.error('Create project error:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    
    const project = await db.project.update({
      where: { id: data.id },
      data: {
        name: data.name,
        location: data.location,
        type: data.type,
        status: data.status,
        totalPiles: data.totalPiles,
        totalRackingTables: data.totalRackingTables,
        totalModules: data.totalModules,
        plannedStartDate: data.plannedStartDate ? new Date(data.plannedStartDate) : undefined,
        plannedEndDate: data.plannedEndDate ? new Date(data.plannedEndDate) : undefined,
        plannedPilesPerDay: data.plannedPilesPerDay,
        plannedRackingPerDay: data.plannedRackingPerDay,
        plannedModulesPerDay: data.plannedModulesPerDay,
        actualStartDate: data.actualStartDate ? new Date(data.actualStartDate) : undefined,
        actualEndDate: data.actualEndDate ? new Date(data.actualEndDate) : undefined,
      }
    });

    return NextResponse.json({ project });
  } catch (error) {
    console.error('Update project error:', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}
