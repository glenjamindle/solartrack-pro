import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const deviceId = searchParams.get('deviceId');
    
    // Get pending sync items
    const pendingItems = await db.syncQueue.findMany({
      where: {
        companyId: companyId || undefined,
        status: 'pending'
      }
    });
    
    return NextResponse.json({ pending: pendingItems });
  } catch (error) {
    console.error('Sync status error:', error);
    return NextResponse.json({ error: 'Failed to get sync status' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const results = [];
    
    for (const item of data.items) {
      try {
        let result;
        
        switch (item.entity) {
          case 'production':
            result = await syncProductionEntry(item);
            break;
          case 'inspection':
            result = await syncInspection(item);
            break;
          default:
            result = { success: false, error: 'Unknown entity type' };
        }
        
        results.push({ localId: item.localId, ...result });
      } catch (error: any) {
        results.push({ localId: item.localId, success: false, error: error.message });
      }
    }
    
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: 'Failed to sync data' }, { status: 500 });
  }
}

async function syncProductionEntry(item: any) {
  // Check for duplicate by localId and deviceId
  const existing = await db.productionEntry.findFirst({
    where: {
      localId: item.payload.localId,
      deviceId: item.payload.deviceId
    }
  });
  
  if (existing) {
    return { success: true, duplicate: true, id: existing.id };
  }
  
  const entry = await db.productionEntry.create({
    data: {
      date: new Date(item.payload.date),
      piles: item.payload.piles || 0,
      rackingTables: item.payload.rackingTables || 0,
      modules: item.payload.modules || 0,
      notes: item.payload.notes,
      projectId: item.payload.projectId,
      userId: item.payload.userId,
      crewId: item.payload.crewId,
      subcontractorId: item.payload.subcontractorId,
      syncStatus: 'synced',
      localId: item.payload.localId,
      deviceId: item.payload.deviceId,
    }
  });
  
  return { success: true, id: entry.id };
}

async function syncInspection(item: any) {
  // Check for duplicate
  const existing = await db.qCInspection.findFirst({
    where: {
      localId: item.payload.localId,
      deviceId: item.payload.deviceId
    }
  });
  
  if (existing) {
    return { success: true, duplicate: true, id: existing.id };
  }
  
  const inspection = await db.qCInspection.create({
    data: {
      date: new Date(item.payload.date),
      category: item.payload.category,
      area: item.payload.area,
      status: item.payload.status || 'pass',
      notes: item.payload.notes,
      projectId: item.payload.projectId,
      userId: item.payload.userId,
      syncStatus: 'synced',
      localId: item.payload.localId,
      deviceId: item.payload.deviceId,
      items: {
        create: item.payload.items?.map((i: any) => ({
          name: i.name,
          measuredValue: i.measuredValue,
          minValue: i.minValue,
          maxValue: i.maxValue,
          unit: i.unit,
          passed: i.passed,
          notes: i.notes,
        })) || []
      }
    }
  });
  
  return { success: true, id: inspection.id };
}
