import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id as string | undefined;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let members = await prisma.workspaceMember.findMany({
    where: { userId },
    include: {
      workspace: {
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                  role: true,
                }
              }
            }
          }
        }
      }
    }
  });

  let workspaces = members.map(m => ({
    id: m.workspace.id,
    name: m.workspace.name,
    type: m.workspace.type,
    ownerId: m.workspace.ownerId,
    userRole: m.role,
    members: m.workspace.members.map(member => ({
      id: member.id,
      userId: member.user.id,
      name: member.user.name || "Team Member",
      email: member.user.email,
      image: member.user.image,
      role: member.role,
    })),
  }));

  if (workspaces.length === 0) {
    // First-time setup: every user needs at least one real workspace to own
    // their own datasets. This is a real, empty workspace — no fabricated
    // team, members, or activity are seeded alongside it.
    const personal = await prisma.workspace.create({
      data: {
        name: "Personal Workspace",
        type: "PERSONAL",
        ownerId: userId,
      }
    });

    await prisma.workspaceMember.create({
      data: {
        workspaceId: personal.id,
        userId,
        role: "ADMIN"
      }
    });

    members = await prisma.workspaceMember.findMany({
      where: { userId },
      include: {
        workspace: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                    role: true,
                  }
                }
              }
            }
          }
        }
      }
    });

    workspaces = members.map(m => ({
      id: m.workspace.id,
      name: m.workspace.name,
      type: m.workspace.type,
      ownerId: m.workspace.ownerId,
      userRole: m.role,
      members: m.workspace.members.map(member => ({
        id: member.id,
        userId: member.user.id,
        name: member.user.name || "Team Member",
        email: member.user.email,
        image: member.user.image,
        role: member.role,
      })),
    }));
  }

  return NextResponse.json({ status: "success", workspaces });
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id as string | undefined;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, name, type, workspaceId, email, role, memberId } = body;

    if (action === "create") {
      const workspace = await prisma.workspace.create({
        data: {
          name,
          type: type || "TEAM",
          ownerId: userId,
        }
      });
      await prisma.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId,
          role: "ADMIN"
        }
      });
      return NextResponse.json({ status: "success", workspace });
    }

    if (action === "add_member") {
      if (!workspaceId || !email) {
        return NextResponse.json({ error: "Missing workspaceId or email" }, { status: 400 });
      }

      // Check caller authorization
      const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
      if (!workspace) {
        return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
      }

      const callerMembership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId,
          }
        }
      });

      if (callerMembership?.role !== "ADMIN" && workspace.ownerId !== userId) {
        return NextResponse.json({ error: "Forbidden: Admin access to workspace required" }, { status: 403 });
      }

      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            name: email.split("@")[0],
            role: "USER"
          }
        });
      }

      const existing = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: user.id
          }
        }
      });

      if (existing) {
        return NextResponse.json({ error: "User is already a member" }, { status: 400 });
      }

      const member = await prisma.workspaceMember.create({
        data: {
          workspaceId,
          userId: user.id,
          role: role || "VIEWER"
        }
      });

      return NextResponse.json({ status: "success", member });
    }

    if (action === "update_role") {
      if (!memberId || !role) {
        return NextResponse.json({ error: "Missing memberId or role" }, { status: 400 });
      }
      if (!["ADMIN", "EDITOR", "VIEWER"].includes(role)) {
        return NextResponse.json({ error: "Invalid role specified" }, { status: 400 });
      }

      const targetMember = await prisma.workspaceMember.findUnique({
        where: { id: memberId },
        include: { workspace: true },
      });
      if (!targetMember) {
        return NextResponse.json({ error: "Member not found" }, { status: 404 });
      }

      const callerMembership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: targetMember.workspaceId,
            userId,
          }
        }
      });

      if (callerMembership?.role !== "ADMIN" && targetMember.workspace.ownerId !== userId) {
        return NextResponse.json({ error: "Forbidden: Admin access to workspace required" }, { status: 403 });
      }

      const updated = await prisma.workspaceMember.update({
        where: { id: memberId },
        data: { role }
      });
      return NextResponse.json({ status: "success", member: updated });
    }

    if (action === "remove_member") {
      if (!memberId) {
        return NextResponse.json({ error: "Missing memberId" }, { status: 400 });
      }

      const targetMember = await prisma.workspaceMember.findUnique({
        where: { id: memberId },
        include: { workspace: true },
      });
      if (!targetMember) {
        return NextResponse.json({ error: "Member not found" }, { status: 404 });
      }

      const isSelf = targetMember.userId === userId;
      const callerMembership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: targetMember.workspaceId,
            userId,
          }
        }
      });
      const isAdmin = callerMembership?.role === "ADMIN" || targetMember.workspace.ownerId === userId;

      if (!isSelf && !isAdmin) {
        return NextResponse.json({ error: "Forbidden: Admin access required to remove members" }, { status: 403 });
      }

      if (targetMember.userId === targetMember.workspace.ownerId) {
        return NextResponse.json({ error: "Cannot remove workspace owner" }, { status: 400 });
      }

      await prisma.workspaceMember.delete({
        where: { id: memberId }
      });
      return NextResponse.json({ status: "success" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
