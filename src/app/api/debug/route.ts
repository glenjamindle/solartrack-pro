import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const companyCount = await db.company.count();
    const userCount = await db.user.count();
    const projectCount = await db.project.count();

    const firstUser = await db.user.findFirst();
    const firstCompany = await db.company.findFirst();

    // Test the full query that companies route uses
    const fullUserQuery = await db.user.findUnique({
      where: { id: 'demo-admin-user' },
      include: {
        company: {
          include: {
            projects: true,
          }
        }
      }
    });

    return NextResponse.json({
      counts: { companies: companyCount, users: userCount, projects: projectCount },
      firstUser,
      firstCompany,
      fullUserQuery: fullUserQuery ? {
        id: fullUserQuery.id,
        name: fullUserQuery.name,
        company: fullUserQuery.company ? {
          name: fullUserQuery.company.name,
          projectCount: fullUserQuery.company.projects?.length
        } : null
      } : null,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, stack: error.stack?.split('\n').slice(0, 5) }, { status: 500 });
  }
}
