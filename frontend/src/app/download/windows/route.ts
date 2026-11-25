import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const filename = 'Agentix-1.0.0-x64.msi';
  const filePath = path.join(process.cwd(), 'public', 'downloads', filename);

  if (fs.existsSync(filePath)) {
    const fileBuffer = fs.readFileSync(filePath);
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-msi',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  // Fallback to GitHub Releases asset
  return NextResponse.redirect(
    `https://github.com/thrilokmanjunath/Agentix/releases/download/v1.0.0/${filename}`,
    307
  );
}
