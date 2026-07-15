import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Debug endpoint is disabled in production for security reasons.
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Only accessible in development mode
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    return NextResponse.json({
      status: "error",
      message: "MONGODB_URI is not configured. Using local file storage."
    });
  }

  // Never expose the URI or any part of it - even redacted versions leak infrastructure details
  if (uri.includes("<db_password>")) {
    return NextResponse.json({
      status: "error",
      message: "Database password placeholder has not been replaced."
    });
  }

  try {
    // Use the shared MongoDB connection from db.ts instead of creating a separate client
    const { getDB } = await import("@/database/db");
    // Attempt to connect - getDB() returns the database instance if successful
    await getDB();
    return NextResponse.json({
      status: "success",
      message: "Successfully connected to your MongoDB cluster."
    });
  } catch {
    // Sanitize error message - never expose internal details like connection strings,
    // hostnames, database versions, or credential patterns
    return NextResponse.json({
      status: "error",
      message: "Failed to connect to MongoDB. Please check your database configuration."
    });
  }
}
