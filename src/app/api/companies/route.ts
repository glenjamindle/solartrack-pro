import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    console.log('[Companies API] GET request, userId:', userId);
    
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        company: {
          include: {
            projects: {
              include: {
                productionEntries: { orderBy: { date: 'desc' }, take: 60 },
                inspections: { 
                  orderBy: { date: 'desc' }, 
                  take: 100,
                  include: { user: { select: { id: true, name: true } } }
                },
                qcIssues: { where: { status: 'open' } },
                refusals: true, // Fetch ALL refusals for analytics
                rackingSystem: true,
              }
            },
            users: true,
            subcontractors: true,
            crews: true,
            rackingSystems: true,
          }
        }
      }
    });

    if (!user) {
      console.log('[Companies API] User not found:', userId);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('[Companies API] User found, company:', user.company?.name);
    return NextResponse.json({ user, company: user.company });
  } catch (error: any) {
    console.error('[Companies API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch company data', message: error.message, stack: error.stack?.split('\n').slice(0, 5) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    const company = await db.company.create({
      data: {
        name: data.name,
        slug: data.slug || data.name.toLowerCase().replace(/\s+/g, '-'),
        subscription: data.subscription || 'trial',
        primaryColor: data.primaryColor || '#f97316',
      }
    });

    return NextResponse.json({ company });
  } catch (error) {
    console.error('Create company error:', error);
    return NextResponse.json({ error: 'Failed to create company' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    
    const company = await db.company.update({
      where: { id: data.id },
      data: {
        name: data.name,
        logo: data.logo,
        primaryColor: data.primaryColor,
      }
    });

    return NextResponse.json({ company });
  } catch (error) {
    console.error('Update company error:', error);
    return NextResponse.json({ error: 'Failed to update company' }, { status: 500 });
  }
}
