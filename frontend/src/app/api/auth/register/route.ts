import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawEmail = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    const rawName = typeof body?.name === 'string' ? body.name.trim() : '';

    if (!EMAIL_REGEX.test(rawEmail) || rawEmail.length > 254) {
      return NextResponse.json(
        { error: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    if (password.length < 8 || password.length > 128) {
      return NextResponse.json(
        { error: 'Password must be between 8 and 128 characters.' },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email: rawEmail } });
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 409 }
      );
    }

    const displayName = rawName ? rawName.slice(0, 100) : rawEmail.split('@')[0];
    const passwordHash = hashPassword(password);

    const createdUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: rawEmail,
          name: displayName,
          passwordHash,
          role: 'USER',
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
      });

      const workspace = await tx.workspace.create({
        data: {
          name: `${displayName}'s Workspace`,
          type: 'PERSONAL',
          ownerId: user.id,
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          role: 'ADMIN',
        },
      });

      return user;
    });

    // Mirror registration to FastAPI backend so DB credentials and tenant match immediately
    try {
      const backendBase = (
        process.env.BACKEND_URL ||
        process.env.NEXT_PUBLIC_API_URL ||
        (process.env.NODE_ENV !== 'production' ? 'http://127.0.0.1:8000' : 'https://agentix-api-lord.onrender.com')
      ).replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');

      if (backendBase) {
        await fetch(`${backendBase}/api/v1/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: rawEmail, password }),
          cache: 'no-store',
        });
      }
    } catch (e) {
      console.warn('[Register] Backend registration sync deferred to login:', e);
    }

    return NextResponse.json(
      { user: createdUser },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Register] Error creating user account:', error);
    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 }
    );
  }
}
