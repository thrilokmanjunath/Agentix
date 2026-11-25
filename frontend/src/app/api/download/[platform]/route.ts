import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;
  const { searchParams } = new URL(request.url);
  const arch = searchParams.get('arch');

  let filename = '';
  let contentType = 'application/octet-stream';

  if (platform === 'mac' || platform === 'macos') {
    filename = (arch === 'intel' || arch === 'x64')
      ? 'Agentix-1.0.0-x64.dmg'
      : 'Agentix-1.0.0-arm64.dmg';
    contentType = 'application/x-apple-diskimage';
  } else if (platform === 'windows' || platform === 'win') {
    filename = 'Agentix-1.0.0-x64.msi';
    contentType = 'application/x-msi';
  } else if (platform === 'connector' || platform === 'python') {
    filename = 'agentix_connector.py';
    contentType = 'text/x-python; charset=utf-8';
  } else {
    return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 });
  }

  let filePath = path.join(process.cwd(), 'public', 'downloads', filename);
  if (!fs.existsSync(filePath) && filename === 'agentix_connector.py') {
    filePath = path.join(process.cwd(), 'public', 'connector.py');
  }

  if (fs.existsSync(filePath)) {
    const fileBuffer = fs.readFileSync(filePath);
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  return NextResponse.redirect(
    `https://github.com/thrilokmanjunath/Agentix/releases/download/v1.0.0/${filename}`,
    307
  );
}
