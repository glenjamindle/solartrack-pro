import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const refusalId = searchParams.get('id');
    
    if (refusalId) {
      const refusal = await db.pileRefusal.findUnique({
        where: { id: refusalId },
        include: { project: true, reportedByUser: { select: { id: true, name: true } } }
      });
      return NextResponse.json({ refusal });
    }

    if (projectId) {
      const refusals = await db.pileRefusal.findMany({
        where: { projectId },
        orderBy: { dateDiscovered: 'desc' }
      });
      return NextResponse.json({ refusals });
    }

    return NextResponse.json({ error: 'projectId or id required' }, { status: 400 });
  } catch (error) {
    console.error('Get refusals error:', error);
    return NextResponse.json({ error: 'Failed to fetch refusals' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    const refusal = await db.pileRefusal.create({
      data: {
        pileId: data.pileId,
        block: data.block,
        row: data.row,
        pileNumber: data.pileNumber,
        dateDiscovered: new Date(data.dateDiscovered),
        targetDepth: data.targetDepth,
        achievedDepth: data.achievedDepth,
        refusalReason: data.refusalReason,
        refusalNotes: data.refusalNotes,
        status: 'open',
        projectId: data.projectId,
        reportedBy: data.userId,
      }
    });

    return NextResponse.json({ refusal });
  } catch (error) {
    console.error('Create refusal error:', error);
    return NextResponse.json({ error: 'Failed to create refusal' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    
    const refusal = await db.pileRefusal.update({
      where: { id: data.id },
      data: {
        status: data.status,
        remediationMethod: data.remediationMethod,
        remediationDate: data.remediationDate ? new Date(data.remediationDate) : null,
        engineerApproval: data.engineerApproval,
      }
    });

    return NextResponse.json({ refusal });
  } catch (error) {
    console.error('Update refusal error:', error);
    return NextResponse.json({ error: 'Failed to update refusal' }, { status: 500 });
  }
}
