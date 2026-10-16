import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth-security';
import { invalidateCache } from '@/lib/cache';
import { logActivity } from '@/lib/activity-log';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const dataToUpdate: any = {};
    if (body.prefix !== undefined) {
      dataToUpdate.prefix = body.prefix ? String(body.prefix).trim() : null;
    }
    if (body.name !== undefined) dataToUpdate.name = body.name;
    if (body.email !== undefined) {
      const trimmedEmail = body.email ? String(body.email).trim().toLowerCase() : '';
      if (trimmedEmail) {
        const duplicateEmail = await prisma.user.findFirst({
          where: {
            email: { equals: trimmedEmail, mode: 'insensitive' },
            id: { not: id },
          },
        });
        if (duplicateEmail) {
          return NextResponse.json(
            { error: `อีเมล "${trimmedEmail}" นี้มีผู้ใช้งานอื่นในระบบใช้อยู่แล้ว` },
            { status: 400 }
          );
        }
      }
      dataToUpdate.email = trimmedEmail;
    }
    if (body.phone !== undefined) dataToUpdate.phone = body.phone;
    if (body.department !== undefined) dataToUpdate.department = body.department;
    if (body.studentId !== undefined) {
      const trimmedId = body.studentId ? String(body.studentId).trim() : null;
      if (trimmedId) {
        const duplicate = await prisma.user.findFirst({
          where: {
            studentId: { equals: trimmedId, mode: 'insensitive' },
            id: { not: id },
          },
        });
        if (duplicate) {
          return NextResponse.json(
            { error: `รหัสประจำตัว (ID) "${trimmedId}" นี้มีผู้ใช้งานอื่นใช้อยู่แล้ว` },
            { status: 400 }
          );
        }
      }
      dataToUpdate.studentId = trimmedId;
    }
    if (body.role !== undefined) dataToUpdate.role = body.role;
    if (body.password) {
      dataToUpdate.password = await hashPassword(body.password);
    }
    if (body.status !== undefined) dataToUpdate.status = body.status;
    
    // Check effective role to strictly forbid approvalScopes for USER (นิสิต)
    let effectiveRole = body.role;
    if (!effectiveRole) {
      const existingUser = await prisma.user.findUnique({
        where: { id },
        select: { role: true },
      });
      effectiveRole = existingUser?.role;
    }

    if (effectiveRole === 'USER') {
      dataToUpdate.approvalScopes = null;
    } else if (body.approvalScopes !== undefined) {
      dataToUpdate.approvalScopes = body.approvalScopes || null;
    }
    if (body.isExecutive !== undefined) {
      dataToUpdate.isExecutive = body.isExecutive === true;
      if (!body.isExecutive) {
        dataToUpdate.executiveRole = null;
      }
    }
    if (body.executiveRole !== undefined) {
      dataToUpdate.executiveRole = body.executiveRole ? String(body.executiveRole).trim() : null;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
    });

    invalidateCache('users:');

    // Audit log
    const actorId = body.actorId || body.userId;
    if (body.role !== undefined || body.approvalScopes !== undefined || body.status !== undefined || body.isExecutive !== undefined) {
      logActivity({
        userId: actorId,
        action: 'ROLE_UPDATE',
        entityType: 'USER',
        entityId: id,
        details: {
          targetName: updatedUser.name,
          targetEmail: updatedUser.email,
          newRole: updatedUser.role,
          newStatus: updatedUser.status,
          approvalScopes: updatedUser.approvalScopes,
          isExecutive: updatedUser.isExecutive,
        },
      });
    } else {
      logActivity({
        userId: actorId,
        action: 'UPDATE',
        entityType: 'USER',
        entityId: id,
        details: {
          targetName: updatedUser.name,
          targetEmail: updatedUser.email,
        },
      });
    }

    const sanitizedUser = {
      id: updatedUser.id,
      prefix: updatedUser.prefix,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      department: updatedUser.department,
      studentId: updatedUser.studentId,
      phone: updatedUser.phone,
      avatar: updatedUser.avatar,
      status: updatedUser.status,
      approvalScopes: updatedUser.role === 'USER' ? null : (updatedUser.approvalScopes || null),
      isExecutive: Boolean(updatedUser.isExecutive),
      executiveRole: updatedUser.executiveRole || null,
    };

    return NextResponse.json(sanitizedUser);
  } catch (error: any) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await prisma.user.findUnique({
      where: { id },
      select: { name: true, email: true },
    });
    await prisma.user.delete({ where: { id } });
    invalidateCache('users:');

    logActivity({
      action: 'DELETE',
      entityType: 'USER',
      entityId: id,
      details: { deletedUserName: existing?.name, deletedUserEmail: existing?.email },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete user' },
      { status: 500 }
    );
  }
}
