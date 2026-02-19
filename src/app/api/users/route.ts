import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Fetch users
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const companyId = searchParams.get('companyId');
    
    if (id) {
      const user = await db.user.findUnique({
        where: { id },
        include: {
          company: true
        }
      });
      
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      
      return NextResponse.json(user);
    }
    
    // Build filter
    const where: Record<string, unknown> = {};
    if (companyId) where.companyId = companyId;
    
    const users = await db.user.findMany({
      where,
      include: {
        company: true
      }
    });
    
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// POST - Create a user
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    const user = await db.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: data.password,
        role: data.role || 'installer',
        phone: data.phone,
        avatar: data.avatar,
        companyId: data.companyId,
        active: data.active ?? true,
      }
    });
    
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

// PUT - Update a user
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    
    const user = await db.user.update({
      where: { id: data.id },
      data: {
        email: data.email,
        name: data.name,
        phone: data.phone,
        avatar: data.avatar,
        role: data.role,
        active: data.active,
      }
    });
    
    return NextResponse.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// DELETE - Delete a user
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    await db.user.delete({
      where: { id }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
