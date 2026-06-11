"use client";

type Employee = {
  id: number;
  employeeId: string;
  firstName: string;
  lastName: string;
  designation: string | null;
  department: string | null;
};

export default function PrintableAttendanceSheet({ employees }: { employees: Employee[] }) {
  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <>
      {/* Controls (hidden on print) */}
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 10 }}>
        <a href="/attendance/mark" style={{ fontSize: 12, color: "var(--primary)" }}>← Back to Attendance</a>
        <button className="btn btn-print" onClick={() => window.print()}>🖨 Print Sheet</button>
      </div>

      <div className="print-page" style={{ background: "#fff", border: "1px solid var(--border)", padding: "28px 32px", maxWidth: 850, margin: "0 auto", color: "#000", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2.5px solid #A32D2D", paddingBottom: 14, marginBottom: 18 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Supreme Art" style={{ height: 60, width: "auto", objectFit: "contain" }} />
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.2, color: "#A32D2D" }}>
              Daily Attendance Sheet
            </div>
            <div style={{ fontSize: 11, color: "#555", marginTop: 6 }}>
              Date: <strong style={{ color: "#000" }}>____________________</strong>
            </div>
            <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>Printed: {today}</div>
          </div>
        </div>

        {/* Info row */}
        <div style={{ display: "flex", gap: 24, fontSize: 11, marginBottom: 14, color: "#333" }}>
          <div>Total Employees: <strong>{employees.length}</strong></div>
          <div>Department: <strong>____________________</strong></div>
          <div>Marked By: <strong>____________________</strong></div>
        </div>

        {/* Attendance table */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th style={th}>#</th>
              <th style={{ ...th, width: 90 }}>Emp ID</th>
              <th style={{ ...th, textAlign: "left" }}>Name</th>
              <th style={{ ...th, textAlign: "left" }}>Designation</th>
              <th style={{ ...th, width: 50 }}>P</th>
              <th style={{ ...th, width: 50 }}>A</th>
              <th style={{ ...th, width: 50 }}>L</th>
              <th style={{ ...th, width: 120 }}>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp, i) => (
              <tr key={emp.id}>
                <td style={tdCenter}>{i + 1}</td>
                <td style={{ ...tdCenter, fontFamily: "monospace", fontSize: 10 }}>{emp.employeeId}</td>
                <td style={td}>{emp.firstName} {emp.lastName}</td>
                <td style={{ ...td, color: "#555" }}>{emp.designation || "—"}</td>
                <td style={checkbox}>☐</td>
                <td style={checkbox}>☐</td>
                <td style={checkbox}>☐</td>
                <td style={td}></td>
              </tr>
            ))}
            {employees.length === 0 && (
              <tr><td colSpan={8} style={{ ...tdCenter, padding: 20, color: "#888" }}>No employees yet.</td></tr>
            )}
          </tbody>
        </table>

        {/* Summary */}
        <div style={{ marginTop: 18, display: "flex", gap: 24, fontSize: 11 }}>
          <div>Total Present: <strong>______</strong></div>
          <div>Total Absent: <strong>______</strong></div>
          <div>Total On Leave: <strong>______</strong></div>
        </div>

        {/* Legend */}
        <div style={{ marginTop: 8, fontSize: 10, color: "#666" }}>
          <strong>Legend:</strong> P = Present &nbsp;·&nbsp; A = Absent &nbsp;·&nbsp; L = On Leave
        </div>

        {/* Signatures */}
        <div style={{ marginTop: 40, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, fontSize: 11 }}>
          <div>
            <div style={{ borderTop: "1px solid #333", paddingTop: 4 }}>Supervisor Signature</div>
          </div>
          <div>
            <div style={{ borderTop: "1px solid #333", paddingTop: 4 }}>HR Signature</div>
          </div>
        </div>
      </div>
    </>
  );
}

const th: React.CSSProperties = {
  border: "1px solid #333",
  padding: "6px 8px",
  fontSize: 11,
  fontWeight: 700,
  textAlign: "center",
  textTransform: "uppercase",
};
const td: React.CSSProperties = {
  border: "1px solid #999",
  padding: "8px 8px",
  fontSize: 11,
};
const tdCenter: React.CSSProperties = { ...td, textAlign: "center" };
const checkbox: React.CSSProperties = { ...tdCenter, fontSize: 16, color: "#333" };
