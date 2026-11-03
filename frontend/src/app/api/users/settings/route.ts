import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function maskApiKey(key?: string): string {
  if (!key || key.length < 8) return "";
  return `${key.slice(0, 7)}...${key.slice(-4)}`;
}

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id as string | undefined;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });

    const prefs = (user?.preferences as Record<string, any>) || {};
    const settings = prefs.settings || {
      llmProvider: "OpenAI (GPT-4o)",
      apiKey: "",
      engineUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
      webhookEndpoint: "",
      theme: "Dark Mode",
    };

    return NextResponse.json({
      ...settings,
      apiKey: maskApiKey(settings.apiKey),
      hasKey: Boolean(settings.apiKey),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to read settings" }, { status: 500 });
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
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const existingPrefs = (user?.preferences as Record<string, any>) || {};
    const currentSettings = existingPrefs.settings || {};

    // Do not overwrite an existing API key if masked string is passed back
    let apiKeyToSave = body.apiKey;
    if (body.apiKey && body.apiKey.includes("...") && currentSettings.apiKey) {
      apiKeyToSave = currentSettings.apiKey;
    }

    const updatedSettings = {
      llmProvider: body.llmProvider || currentSettings.llmProvider || "OpenAI (GPT-4o)",
      apiKey: apiKeyToSave !== undefined ? apiKeyToSave : currentSettings.apiKey || "",
      engineUrl: body.engineUrl || currentSettings.engineUrl || "http://localhost:8000",
      webhookEndpoint: body.webhookEndpoint ?? currentSettings.webhookEndpoint ?? "",
      theme: body.theme || currentSettings.theme || "Dark Mode",
    };

    await prisma.user.update({
      where: { id: userId },
      data: {
        preferences: {
          ...existingPrefs,
          settings: updatedSettings,
        },
      },
    });

    return NextResponse.json({
      success: true,
      settings: {
        ...updatedSettings,
        apiKey: maskApiKey(updatedSettings.apiKey),
        hasKey: Boolean(updatedSettings.apiKey),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to save settings" }, { status: 500 });
  }
}
