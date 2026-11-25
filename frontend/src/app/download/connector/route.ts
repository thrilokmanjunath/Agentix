import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const filename = 'agentix_connector.py';
  // Check downloads folder or root public folder
  let filePath = path.join(process.cwd(), 'public', 'downloads', filename);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(process.cwd(), 'public', 'connector.py');
  }

  if (fs.existsSync(filePath)) {
    const fileBuffer = fs.readFileSync(filePath);
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'text/x-python; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  return NextResponse.redirect(
    'https://raw.githubusercontent.com/thrilokmanjunath/Agentix/main/connector/agentix_connector.py',
    307
  );
}
