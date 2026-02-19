import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const companyId = searchParams.get('companyId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    if (projectId) {
      const where: any = { projectId };
      if (startDate || endDate) {
        where.date = {};
        if (startDate) where.date.gte = new Date(startDate);
        if (endDate) where.date.lte = new Date(endDate);
      }
      
      const entries = await db.productionEntry.findMany({
        where,
        orderBy: { date: 'desc' },
        include: {
          user: { select: { id: true, name: true, role: true } },
          crew: { select: { id: true, name: true } },
          subcontractor: { select: { id: true, name: true } },
          photos: true,
        }
      });
      
      return NextResponse.json({ entries });
    }

    if (companyId) {
      // Get all production for company
      const company = await db.company.findUnique({
        where: { id: companyId },
        include: {
          projects: {
            include: {
              productionEntries: {
                orderBy: { date: 'desc' },
                include: {
                  user: { select: { id: true, name: true } },
                }
              }
            }
          }
        }
      });
      
      const allEntries = company?.projects.flatMap(p => p.productionEntries) || [];
      return NextResponse.json({ entries: allEntries });
    }

    return NextResponse.json({ error: 'projectId or companyId required' }, { status: 400 });
  } catch (error) {
    console.error('Get production error:', error);
    return NextResponse.json({ error: 'Failed to fetch production data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    const entry = await db.productionEntry.create({
      data: {
        date: new Date(data.date),
        piles: data.piles || 0,
        rackingTables: data.rackingTables || 0,
        modules: data.modules || 0,
        notes: data.notes,
        projectId: data.projectId,
        userId: data.userId,
        crewId: data.crewId,
        subcontractorId: data.subcontractorId,
        syncStatus: 'synced',
        localId: data.localId,
        deviceId: data.deviceId,
      },
      include: {
        user: { select: { id: true, name: true } },
      }
    });

    return NextResponse.json({ entry });
  } catch (error) {
    console.error('Create production entry error:', error);
    return NextResponse.json({ error: 'Failed to create production entry' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    
    const entry = await db.productionEntry.update({
      where: { id: data.id },
      data: {
        date: new Date(data.date),
        piles: data.piles,
        rackingTables: data.rackingTables,
        modules: data.modules,
        notes: data.notes,
        crewId: data.crewId,
        subcontractorId: data.subcontractorId,
      }
    });

    return NextResponse.json({ entry });
  } catch (error) {
    console.error('Update production entry error:', error);
    return NextResponse.json({ error: 'Failed to update production entry' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    await db.productionEntry.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete production entry error:', error);
    return NextResponse.json({ error: 'Failed to delete production entry' }, { status: 500 });
  }
}
