import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function maskApiKey(key?: string): string {
  if (!key || key.length < 8) return "";
  return `${key.slice(0, 7)}...${key.slice(-4)}`;
}

import { getServerBackendBase } from "@/lib/backendServer";

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
    const defaultEngineUrl = getServerBackendBase();
    const settings = prefs.settings || {
      llmProvider: "ollama",
      apiKey: "",
      engineUrl: defaultEngineUrl,
      webhookEndpoint: "",
      theme: "light",
    };

    return NextResponse.json({
      ...settings,
      apiKey: maskApiKey(settings.apiKey),
      hasKey: Boolean(settings.apiKey),
    });
  } catch (error: any) {
    if (error?.name === "PrismaClientInitializationError") {
      return NextResponse.json({
        llmProvider: "ollama",
        apiKey: "",
        hasKey: false,
        engineUrl: getServerBackendBase(),
        webhookEndpoint: "",
        theme: "light",
        dbUnavailable: true,
      });
    }
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
      llmProvider: body.llmProvider || currentSettings.llmProvider || "ollama",
      apiKey: apiKeyToSave !== undefined ? apiKeyToSave : currentSettings.apiKey || "",
      engineUrl: body.engineUrl || currentSettings.engineUrl || getServerBackendBase(),
      webhookEndpoint: body.webhookEndpoint ?? currentSettings.webhookEndpoint ?? "",
      theme: body.theme || currentSettings.theme || "light",
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
