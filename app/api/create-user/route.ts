import { NextRequest, NextResponse } from "next/server";
import * as admin from "firebase-admin";

// Initialize Firebase Admin (singleton)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "נדרש אימייל וסיסמה" }, { status: 400 });
    }

    let uid: string;

    // Try to get existing user first (idempotent)
    try {
      const existing = await admin.auth().getUserByEmail(email);
      uid = existing.uid;
      // Update password if user already exists
      await admin.auth().updateUser(uid, { password });
    } catch {
      // User doesn't exist — create it
      const newUser = await admin.auth().createUser({ email, password });
      uid = newUser.uid;
    }

    return NextResponse.json({ uid });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "שגיאה בלתי צפויה";
    console.error("create-user error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
