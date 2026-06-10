import { db } from "@/lib/db";
import { employees } from "@/lib/schema";
import { asc } from "drizzle-orm";
import PrintableAttendanceSheet from "@/components/PrintableAttendanceSheet";

export const dynamic = "force-dynamic";

export default async function PrintBlankAttendancePage() {
  const rows = await db.select().from(employees).orderBy(asc(employees.firstName));
  return <PrintableAttendanceSheet employees={rows} />;
}
