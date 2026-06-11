import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { attendance, employees } from "@/lib/schema";
import { eq, gte, lte, and } from "drizzle-orm";

// GET /api/attendance/records?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");

  try {
    const conditions = [] as any[];
    if (from) conditions.push(gte(attendance.date, from));
    if (to) conditions.push(lte(attendance.date, to));

    const rows = await db
      .select({
        id: attendance.id,
        date: attendance.date,
        status: attendance.status,
        employeeId: employees.id,
        empCode: employees.employeeId,
        firstName: employees.firstName,
        lastName: employees.lastName,
        designation: employees.designation,
        department: employees.department,
      })
      .from(attendance)
      .innerJoin(employees, eq(attendance.employeeId, employees.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
