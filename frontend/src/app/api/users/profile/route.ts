import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id as string | undefined;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        preferences: true,
      },
    });

    if (!user) {
      if (session?.user) {
        const nameParts = (session.user.name || "Enterprise Admin").split(" ");
        return NextResponse.json({
          firstName: nameParts[0] || "Enterprise",
          lastName: nameParts.slice(1).join(" ") || "Admin",
          email: session.user.email || "admin@agentix.com",
          aiPersona: "Executive Analyst (Recommended)",
          role: (session.user as any).role || "ADMIN",
        });
      }
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const nameParts = (user.name || "").split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";
    const prefs = (user.preferences as Record<string, any>) || {};

    return NextResponse.json({
      firstName: prefs.firstName || firstName,
      lastName: prefs.lastName || lastName,
      email: user.email,
      aiPersona: prefs.aiPersona || "Executive Analyst (Recommended)",
      role: user.role,
    });
  } catch (error: any) {
    if (session?.user) {
      const nameParts = (session.user.name || "Enterprise Admin").split(" ");
      return NextResponse.json({
        firstName: nameParts[0] || "Enterprise",
        lastName: nameParts.slice(1).join(" ") || "Admin",
        email: session.user.email || "admin@agentix.com",
        aiPersona: "Executive Analyst (Recommended)",
        role: (session.user as any).role || "ADMIN",
      });
    }
    return NextResponse.json({ error: error.message || "Failed to read profile" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id as string | undefined;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { firstName, lastName, aiPersona } = body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const existingPrefs = (user?.preferences as Record<string, any>) || {};

    const fullName = `${firstName || ""} ${lastName || ""}`.trim();
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(fullName ? { name: fullName } : {}),
        preferences: {
          ...existingPrefs,
          firstName,
          lastName,
          aiPersona,
        },
      },
    });

    return NextResponse.json({
      success: true,
      profile: {
        firstName,
        lastName,
        email: updated.email,
        aiPersona,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to save profile" }, { status: 500 });
  }
}
