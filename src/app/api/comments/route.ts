import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/database/db";

export async function GET(req: NextRequest) {
  const db = await getDB();

  // Filter comments based on query param status
  const filterStatus = req.nextUrl.searchParams.get("status");
  let filteredComments = db.comments;
  
  if (filterStatus === "matched") {
    filteredComments = db.comments.filter((c) => c.status === "matched" || c.status === "replied");
  } else if (filterStatus === "review") {
    filteredComments = db.comments.filter((c) => c.status === "review");
  }

  return NextResponse.json(filteredComments);
}
