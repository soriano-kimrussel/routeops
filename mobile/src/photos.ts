import { File, Paths } from 'expo-file-system';

/**
 * The camera saves into a cache folder the OS may empty at any time. Copy the
 * photo into the app's documents folder so it survives until it has synced.
 */
export function keepPhoto(cameraUri: string, stopId: string): string {
  try {
    const destination = new File(Paths.document, `stop-${stopId}-${Date.now()}.jpg`);
    new File(cameraUri).copy(destination);
    return destination.uri;
  } catch {
    return cameraUri;
  }
}

export function photoExists(uri: string): boolean {
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
}

export function deletePhoto(uri: string | null | undefined): void {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Best effort clean-up only.
  }
}
