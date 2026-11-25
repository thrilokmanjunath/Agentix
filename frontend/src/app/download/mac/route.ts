import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const arch = searchParams.get('arch');
  const filename = (arch === 'intel' || arch === 'x64')
    ? 'Agentix-1.0.0-x64.dmg'
    : 'Agentix-1.0.0-arm64.dmg';

  const filePath = path.join(process.cwd(), 'public', 'downloads', filename);

  // If a genuine installer binary (> 10MB) exists locally on the server
  if (fs.existsSync(filePath)) {
    try {
      const stat = fs.statSync(filePath);
      if (stat.size > 10 * 1024 * 1024) {
        const fileBuffer = fs.readFileSync(filePath);
        return new NextResponse(fileBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/x-apple-diskimage',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': fileBuffer.length.toString(),
            'Cache-Control': 'public, max-age=3600',
          },
        });
      }
    } catch {}
  }

  // Redirect to official GitHub Releases asset
  return NextResponse.redirect(
    `https://github.com/thrilokmanjunath/Agentix/releases/download/v1.0.0/${filename}`,
    307
  );
}
