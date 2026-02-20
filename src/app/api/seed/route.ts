import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    console.log('[Seed API] Starting seed...');
    
    const existingCompanies = await db.company.count();
    console.log('[Seed API] Existing companies:', existingCompanies);
    
    if (existingCompanies > 0) {
      return NextResponse.json({ message: 'Database already seeded', alreadySeeded: true });
    }

    const company = await db.company.create({
      data: { name: 'Solar Dynamics EPC', slug: 'solar-dynamics', subscription: 'professional' }
    });

    const adminId = 'demo-admin-user';
    const users = await Promise.all([
      db.user.create({ data: { id: adminId, email: 'admin@solardynamics.com', name: 'John Martinez', password: 'demo123', role: 'admin', companyId: company.id } }),
      db.user.create({ data: { id: 'demo-pm-user', email: 'pm@solardynamics.com', name: 'Sarah Chen', password: 'demo123', role: 'pm', companyId: company.id } }),
      db.user.create({ data: { id: 'demo-installer-user', email: 'foreman@solardynamics.com', name: 'Mike Rodriguez', password: 'demo123', role: 'installer', companyId: company.id } }),
      db.user.create({ data: { id: 'demo-inspector-user', email: 'inspector@solardynamics.com', name: 'Lisa Thompson', password: 'demo123', role: 'inspector', companyId: company.id } }),
    ]);

    const subcontractors = await Promise.all([
      db.subcontractor.create({ data: { name: 'Premier Piling Inc.', contactPerson: 'Robert Wilson', phone: '555-123-4567', email: 'rwilson@premierpiling.com', companyId: company.id } }),
      db.subcontractor.create({ data: { name: 'SunMount Racking Co.', contactPerson: 'Jennifer Lee', phone: '555-234-5678', email: 'jlee@sunmount.com', companyId: company.id } }),
    ]);

    const crews = await Promise.all([
      db.crew.create({ data: { name: 'Alpha Crew', leadName: 'Tom Jackson', companyId: company.id } }),
      db.crew.create({ data: { name: 'Beta Crew', leadName: 'Anna Smith', companyId: company.id } }),
    ]);

    const today = new Date();
    const projects = await Promise.all([
      db.project.create({
        data: {
          name: 'Desert Sun Solar Farm', location: 'Phoenix, AZ', type: 'utility', status: 'active',
          totalPiles: 15000, totalRackingTables: 5000, totalModules: 125000,
          plannedStartDate: new Date(today.getFullYear(), 0, 1), plannedEndDate: new Date(today.getFullYear(), 11, 31),
          plannedPilesPerDay: 50, plannedRackingPerDay: 20, plannedModulesPerDay: 500,
          companyId: company.id,
        }
      }),
      db.project.create({
        data: {
          name: 'Riverside C&I Project', location: 'Riverside, CA', type: 'ci', status: 'active',
          totalPiles: 2500, totalRackingTables: 800, totalModules: 20000,
          plannedStartDate: new Date(today.getFullYear(), 2, 1), plannedEndDate: new Date(today.getFullYear(), 8, 30),
          plannedPilesPerDay: 30, plannedRackingPerDay: 12, plannedModulesPerDay: 250,
          companyId: company.id,
        }
      }),
      db.project.create({
        data: {
          name: 'Mountain View Solar', location: 'Denver, CO', type: 'utility', status: 'active',
          totalPiles: 20000, totalRackingTables: 6500, totalModules: 160000,
          plannedStartDate: new Date(today.getFullYear(), 1, 15), plannedEndDate: new Date(today.getFullYear() + 1, 1, 15),
          plannedPilesPerDay: 60, plannedRackingPerDay: 22, plannedModulesPerDay: 550,
          companyId: company.id,
        }
      }),
    ]);

    for (const project of projects) {
      await db.userProjectAssignment.createMany({ data: users.map(u => ({ userId: u.id, projectId: project.id })) });
    }

    const productionData: any[] = [];
    for (let i = 30; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      for (const project of projects) {
        productionData.push({
          date,
          piles: Math.floor(project.plannedPilesPerDay * (0.8 + Math.random() * 0.4)),
          rackingTables: Math.floor(project.plannedRackingPerDay * (0.75 + Math.random() * 0.5)),
          modules: Math.floor(project.plannedModulesPerDay * (0.7 + Math.random() * 0.6)),
          projectId: project.id, userId: users[2].id,
          crewId: crews[Math.floor(Math.random() * crews.length)].id,
          subcontractorId: subcontractors[Math.floor(Math.random() * subcontractors.length)].id,
          syncStatus: 'synced',
        });
      }
    }
    await db.productionEntry.createMany({ data: productionData });

    const inspectionData: any[] = [];
    for (let i = 10; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i * 2);
      for (const project of projects) {
        const passed = Math.random() > 0.15;
        inspectionData.push({
          date,
          category: ['piles', 'racking', 'modules'][Math.floor(Math.random() * 3)],
          area: `Row ${Math.floor(Math.random() * 50) + 1}`,
          status: passed ? 'pass' : 'fail',
          projectId: project.id, userId: users[3].id,
          notes: passed ? 'OK' : 'Failed', syncStatus: 'synced',
        });
      }
    }
    await db.qCInspection.createMany({ data: inspectionData });

    return NextResponse.json({
      message: 'Database seeded successfully',
      companyId: company.id,
      adminId,
      users: users.length,
      projects: projects.length,
    });
  } catch (error: any) {
    console.error('[Seed API] Error:', error);
    return NextResponse.json({ error: 'Failed to seed database', details: error.message }, { status: 500 });
  }
}

export async function GET() { return POST(); }
