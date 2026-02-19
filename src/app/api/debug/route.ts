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
    
    return NextResponse.json({
      counts: { companies: companyCount, users: userCount, projects: projectCount },
      firstUser,
      firstCompany,
      dbPath: process.env.DATABASE_URL
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
