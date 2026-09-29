import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { userSettings } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/context';
import { toErrorResponse } from '@/lib/utils/error-handler';

/**
 * Per-user UI preferences. The engine stays agnostic about which keys live in
 * here — it stores and returns an opaque object, and each feature owns the
 * meaning of its own key (see DEFAULT_USER_SETTINGS in lib/settings.ts).
 */
export async function GET(request: Request) {
  try {
    const payload = requireAuth(request);
    const db = getDb();

    const [row] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, payload.userId))
      .limit(1);

    return NextResponse.json({ settings: row?.settings ?? {} });
  } catch (error) {
    const { message, status } = toErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(request: Request) {
  try {
    const payload = requireAuth(request);
    const body = await request.json();
    const { settings } = body;

    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      return NextResponse.json(
        { error: 'settings must be an object' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Merge rather than replace, so a client that knows about only some keys
    // can't clobber preferences written by a newer build.
    const [existing] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, payload.userId))
      .limit(1);

    const merged = { ...(existing?.settings ?? {}), ...settings };

    await db
      .insert(userSettings)
      .values({ userId: payload.userId, settings: merged })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: { settings: merged, updatedAt: new Date() },
      });

    return NextResponse.json({ success: true, settings: merged });
  } catch (error) {
    const { message, status } = toErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
