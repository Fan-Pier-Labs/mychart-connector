import { NextResponse } from 'next/server';
import { checkForUpdate } from '../../../../../shared/updateCheck';
import pkg from '../../../../../package.json';

export async function GET() {
  const result = await checkForUpdate({
    currentVersion: pkg.version,
    packageName: 'web',
  });

  if (result) {
    return NextResponse.json({
      currentVersion: pkg.version,
      latestVersion: result.latestVersion,
      updateAvailable: result.updateAvailable,
    });
  }

  return NextResponse.json({
    currentVersion: pkg.version,
    updateAvailable: false,
  });
}
