import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        company: {
          include: {
            projects: {
              where: { status: 'active' },
              include: {
                productionEntries: {
                  orderBy: { date: 'desc' },
                  take: 30,
                },
                inspections: true,
                qcIssues: {
                  where: { status: 'open' }
                },
                userAssignments: {
                  include: { user: true }
                }
              }
            },
            users: true,
            subcontractors: true,
            crews: true,
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user, company: user.company });
  } catch (error) {
    console.error('Get company error:', error);
    return NextResponse.json({ error: 'Failed to fetch company data' }, { status: 500 });
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
      }
    });

    return NextResponse.json({ company });
  } catch (error) {
    console.error('Create company error:', error);
    return NextResponse.json({ error: 'Failed to create company' }, { status: 500 });
  }
}
