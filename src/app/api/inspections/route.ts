import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const inspectionId = searchParams.get('inspectionId');
    
    if (inspectionId) {
      const inspection = await db.qCInspection.findUnique({
        where: { id: inspectionId },
        include: {
          items: true,
          issues: true,
          photos: true,
          user: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } }
        }
      });
      return NextResponse.json({ inspection });
    }

    if (projectId) {
      const inspections = await db.qCInspection.findMany({
        where: { projectId },
        orderBy: { date: 'desc' },
        include: {
          items: true,
          user: { select: { id: true, name: true } },
          _count: { select: { issues: true } }
        }
      });
      return NextResponse.json({ inspections });
    }

    return NextResponse.json({ error: 'projectId or inspectionId required' }, { status: 400 });
  } catch (error) {
    console.error('Get inspections error:', error);
    return NextResponse.json({ error: 'Failed to fetch inspections' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    const inspection = await db.qCInspection.create({
      data: {
        date: new Date(data.date),
        category: data.category,
        scope: data.scope || 'individual',
        scopeCount: data.scopeCount,
        area: data.area,
        pileIds: data.pileIds,
        pileType: data.pileType || 'interior',
        status: data.status || 'pass',
        notes: data.notes,
        projectId: data.projectId,
        userId: data.userId,
        syncStatus: 'synced',
        items: {
          create: data.items?.map((item: any) => ({
            name: item.name,
            pileId: item.pileId,
            measurementType: item.measurementType,
            measuredValue: item.measuredValue,
            minValue: item.minValue,
            maxValue: item.maxValue,
            unit: item.unit,
            passed: item.passed,
            notes: item.notes,
          })) || []
        }
      },
      include: {
        items: true
      }
    });

    // Create issue if failed
    if (data.status === 'fail') {
      await db.qCIssue.create({
        data: {
          status: 'open',
          description: data.issueDescription || `${data.category} inspection failed in ${data.area}`,
          category: data.category,
          projectId: data.projectId,
          inspectionId: inspection.id,
          assignedToType: data.assignedToType,
          assignedToId: data.assignedToId,
        }
      });
    }

    return NextResponse.json({ inspection });
  } catch (error) {
    console.error('Create inspection error:', error);
    return NextResponse.json({ error: 'Failed to create inspection' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    
    const inspection = await db.qCInspection.update({
      where: { id: data.id },
      data: {
        status: data.status,
        notes: data.notes,
      }
    });

    return NextResponse.json({ inspection });
  } catch (error) {
    console.error('Update inspection error:', error);
    return NextResponse.json({ error: 'Failed to update inspection' }, { status: 500 });
  }
}
