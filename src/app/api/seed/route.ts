import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    console.log('[Seed API] Starting seed check...');
    
    // Check if already seeded
    const existingCompanies = await db.company.count();
    console.log('[Seed API] Existing companies:', existingCompanies);
    
    if (existingCompanies > 0) {
      console.log('[Seed API] Database already seeded');
      return NextResponse.json({ message: 'Database already seeded', alreadySeeded: true });
    }

    console.log('[Seed API] Creating demo company...');
    
    // Create demo company
    const company = await db.company.create({
      data: {
        name: 'Solar Dynamics EPC',
        slug: 'solar-dynamics',
        subscription: 'professional',
      }
    });
    console.log('[Seed API] Company created:', company.id);

    // Demo user IDs
    const adminId = 'demo-admin-user';
    const pmId = 'demo-pm-user';
    const installerId = 'demo-installer-user';
    const inspectorId = 'demo-inspector-user';
    const execId = 'demo-exec-user';

    console.log('[Seed API] Creating users...');
    const users = await Promise.all([
      db.user.create({
        data: { id: adminId, email: 'admin@solardynamics.com', name: 'John Martinez', password: 'demo123', role: 'admin', companyId: company.id }
      }),
      db.user.create({
        data: { id: pmId, email: 'pm@solardynamics.com', name: 'Sarah Chen', password: 'demo123', role: 'pm', companyId: company.id }
      }),
      db.user.create({
        data: { id: installerId, email: 'foreman@solardynamics.com', name: 'Mike Rodriguez', password: 'demo123', role: 'installer', companyId: company.id }
      }),
      db.user.create({
        data: { id: inspectorId, email: 'inspector@solardynamics.com', name: 'Lisa Thompson', password: 'demo123', role: 'inspector', companyId: company.id }
      }),
      db.user.create({
        data: { id: execId, email: 'exec@solardynamics.com', name: 'David Kim', password: 'demo123', role: 'executive', companyId: company.id }
      }),
    ]);
    console.log('[Seed API] Users created:', users.length);

    console.log('[Seed API] Creating subcontractors...');
    const subcontractors = await Promise.all([
      db.subcontractor.create({ data: { name: 'Premier Piling Inc.', contactPerson: 'Robert Wilson', phone: '555-123-4567', email: 'rwilson@premierpiling.com', companyId: company.id } }),
      db.subcontractor.create({ data: { name: 'SunMount Racking Co.', contactPerson: 'Jennifer Lee', phone: '555-234-5678', email: 'jlee@sunmount.com', companyId: company.id } }),
      db.subcontractor.create({ data: { name: 'Solar Install Pro', contactPerson: 'Carlos Mendez', phone: '555-345-6789', email: 'cmendez@solarinstallpro.com', companyId: company.id } }),
    ]);

    console.log('[Seed API] Creating crews...');
    const crews = await Promise.all([
      db.crew.create({ data: { name: 'Alpha Crew', leadName: 'Tom Jackson', companyId: company.id } }),
      db.crew.create({ data: { name: 'Beta Crew', leadName: 'Anna Smith', companyId: company.id } }),
      db.crew.create({ data: { name: 'Gamma Crew', leadName: 'James Brown', companyId: company.id } }),
    ]);

    console.log('[Seed API] Creating projects...');
    const today = new Date();
    const projects = await Promise.all([
      db.project.create({
        data: { name: 'Desert Sun Solar Farm', location: 'Phoenix, AZ', type: 'utility', status: 'active', totalPiles: 15000, totalRackingTables: 5000, totalModules: 125000, plannedStartDate: new Date(today.getFullYear(), 0, 1), plannedEndDate: new Date(today.getFullYear(), 11, 31), plannedPilesPerDay: 50, plannedRackingPerDay: 20, plannedModulesPerDay: 500, companyId: company.id }
      }),
      db.project.create({
        data: { name: 'Riverside C&I Project', location: 'Riverside, CA', type: 'ci', status: 'active', totalPiles: 2500, totalRackingTables: 800, totalModules: 20000, plannedStartDate: new Date(today.getFullYear(), 2, 1), plannedEndDate: new Date(today.getFullYear(), 8, 30), plannedPilesPerDay: 30, plannedRackingPerDay: 12, plannedModulesPerDay: 250, companyId: company.id }
      }),
      db.project.create({
        data: { name: 'Mountain View Solar', location: 'Denver, CO', type: 'utility', status: 'active', totalPiles: 20000, totalRackingTables: 6500, totalModules: 160000, plannedStartDate: new Date(today.getFullYear(), 1, 15), plannedEndDate: new Date(today.getFullYear() + 1, 1, 15), plannedPilesPerDay: 60, plannedRackingPerDay: 22, plannedModulesPerDay: 550, companyId: company.id }
      }),
      db.project.create({
        data: { name: 'Bay Area Warehouse', location: 'Oakland, CA', type: 'ci', status: 'completed', totalPiles: 1000, totalRackingTables: 350, totalModules: 8500, plannedStartDate: new Date(today.getFullYear() - 1, 6, 1), plannedEndDate: new Date(today.getFullYear() - 1, 11, 30), plannedPilesPerDay: 20, plannedRackingPerDay: 8, plannedModulesPerDay: 180, companyId: company.id }
      }),
    ]);
    console.log('[Seed API] Projects created:', projects.length);

    // Assign users to projects
    console.log('[Seed API] Assigning users to projects...');
    for (const project of projects) {
      await db.userProjectAssignment.createMany({ data: [{ userId: users[0].id, projectId: project.id }, { userId: users[1].id, projectId: project.id }, { userId: users[2].id, projectId: project.id }, { userId: users[3].id, projectId: project.id }] });
    }

    // Create production entries
    console.log('[Seed API] Creating production entries...');
    const productionData: any[] = [];
    for (let i = 30; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      
      for (const project of projects.slice(0, 3)) {
        productionData.push({
          date,
          piles: Math.floor(project.plannedPilesPerDay * (0.8 + Math.random() * 0.4)),
          rackingTables: Math.floor(project.plannedRackingPerDay * (0.75 + Math.random() * 0.5)),
          modules: Math.floor(project.plannedModulesPerDay * (0.7 + Math.random() * 0.6)),
          projectId: project.id,
          userId: users[2].id,
          crewId: crews[Math.floor(Math.random() * crews.length)].id,
          subcontractorId: subcontractors[Math.floor(Math.random() * subcontractors.length)].id,
          syncStatus: 'synced',
        });
      }
    }
    await db.productionEntry.createMany({ data: productionData });
    console.log('[Seed API] Production entries created:', productionData.length);

    // Create QC templates
    console.log('[Seed API] Creating QC templates...');
    await db.qCToleranceTemplate.createMany({
      data: [
        { name: 'Standard Pile Tolerances', category: 'piles', description: 'Standard tolerances for pile installation', tolerances: JSON.stringify([{ name: 'Pile Height', min: -25, max: 25, unit: 'mm' }]), companyId: company.id },
        { name: 'Standard Racking Tolerances', category: 'racking', description: 'Standard tolerances for racking installation', tolerances: JSON.stringify([{ name: 'Table Alignment', min: -25, max: 25, unit: 'mm' }]), companyId: company.id },
        { name: 'Standard Module Tolerances', category: 'modules', description: 'Standard tolerances for module installation', tolerances: JSON.stringify([{ name: 'Module Spacing', min: 10, max: 25, unit: 'mm' }]), companyId: company.id },
      ]
    });

    // Create QC inspections
    console.log('[Seed API] Creating QC inspections...');
    const inspectionData: any[] = [];
    for (let i = 10; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i * 2);
      for (const project of projects.slice(0, 3)) {
        const categories = ['piles', 'racking', 'modules'];
        const category = categories[Math.floor(Math.random() * categories.length)];
        const passed = Math.random() > 0.15;
        inspectionData.push({ date, category, area: `Row ${Math.floor(Math.random() * 50) + 1}`, status: passed ? 'pass' : 'fail', projectId: project.id, userId: users[3].id, notes: passed ? 'All measurements within tolerance' : 'Measurements outside acceptable range', syncStatus: 'synced' });
      }
    }
    await db.qCInspection.createMany({ data: inspectionData });

    console.log('[Seed API] Seed complete!');
    return NextResponse.json({ 
      message: 'Database seeded successfully',
      companyId: company.id,
      adminId: adminId,
      company: company.name,
      users: users.length,
      projects: projects.length,
    });
  } catch (error: any) {
    console.error('[Seed API] Error:', error);
    return NextResponse.json({ error: 'Failed to seed database', details: error.message, stack: error.stack }, { status: 500 });
  }
}

// Also support GET for compatibility
export async function GET() {
  return POST();
}
