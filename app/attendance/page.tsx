"use client";
import { useState, useEffect, useCallback, useMemo } from "react";

type EmployeeAttendance = {
  id: number;
  employeeId: string;
  firstName: string;
  lastName: string;
  designation: string | null;
  department: string | null;
  photoUrl: string | null;
  status: "present" | "absent" | "leave" | null;
};

const STATUS_CONFIG = {
  present: { label: "Present", color: "var(--success)", bg: "var(--success-bg)" },
  absent:  { label: "Absent",  color: "var(--danger)",  bg: "var(--danger-bg)"  },
  leave:   { label: "Leave",   color: "var(--warning)", bg: "var(--warning-bg)" },
};

export default function AttendancePage() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [employees, setEmployees] = useState<EmployeeAttendance[]>([]);
  const [savedSnapshot, setSavedSnapshot] = useState<Record<number, EmployeeAttendance["status"]>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  const fetchAttendance = useCallback(async (d: string) => {
    setLoading(true);
    setError(null);
    setUploadMessage(null);
    try {
      const res = await fetch(`/api/attendance?date=${d}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setEmployees(data);
      const snap: Record<number, EmployeeAttendance["status"]> = {};
      data.forEach((e: EmployeeAttendance) => { snap[e.id] = e.status; });
      setSavedSnapshot(snap);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAttendance(date); }, [date, fetchAttendance]);

  const mark = (emp: EmployeeAttendance, status: "present" | "absent" | "leave") => {
    setUploadMessage(null);
    setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, status } : e));
  };

  const markAllPresent = () => {
    setUploadMessage(null);
    setEmployees(prev => prev.map(e => ({ ...e, status: "present" })));
  };

  const resetUnsaved = () => {
    setUploadMessage(null);
    setEmployees(prev => prev.map(e => ({ ...e, status: savedSnapshot[e.id] ?? null })));
  };

  const dirtyEmployees = useMemo(
    () => employees.filter(e => e.status !== (savedSnapshot[e.id] ?? null) && e.status !== null),
    [employees, savedSnapshot]
  );

  const uploadAll = async () => {
    if (dirtyEmployees.length === 0) return;
    setUploading(true);
    setError(null);
    setUploadMessage(null);
    try {
      for (const emp of dirtyEmployees) {
        const res = await fetch("/api/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ employeeId: emp.id, date, status: emp.status }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
      }
      const newSnap = { ...savedSnapshot };
      dirtyEmployees.forEach(e => { newSnap[e.id] = e.status; });
      setSavedSnapshot(newSnap);
      setUploadMessage(`✓ Saved ${dirtyEmployees.length} record${dirtyEmployees.length !== 1 ? "s" : ""} to attendance log.`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const summary = {
    present: employees.filter(e => e.status === "present").length,
    absent:  employees.filter(e => e.status === "absent").length,
    leave:   employees.filter(e => e.status === "leave").length,
    unmarked: employees.filter(e => e.status === null).length,
  };

  const downloadCSV = () => {
    const headers = ["Employee ID", "Name", "Designation", "Department", "Status"];
    const rows = employees.map(e => [
      e.employeeId,
      `${e.firstName} ${e.lastName}`,
      e.designation || "",
      e.department || "",
      e.status ? STATUS_CONFIG[e.status].label : "Unmarked",
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const niceDate = new Date(date + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Attendance Sheet</h1>
          <p style={{ color: "#888", marginTop: 4, fontSize: 13 }}>
            <strong style={{ color: "#444" }}>{niceDate}</strong> · {employees.length} employee{employees.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{ width: "auto", fontSize: 13, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border-strong)" }}
          />
          <a href="/attendance/print" className="btn btn-print" style={{ padding: "8px 14px", fontSize: 13 }}>🖨 Print Blank</a>
          <button
            onClick={downloadCSV}
            disabled={employees.length === 0}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: "#fff", color: "var(--fg)", border: "1px solid var(--border-strong)",
              cursor: employees.length === 0 ? "not-allowed" : "pointer",
              opacity: employees.length === 0 ? 0.5 : 1,
            }}
          >
            ⬇ CSV
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
        {[
          { label: "Present",  count: summary.present,  color: "var(--success)", bg: "var(--success-bg)" },
          { label: "Absent",   count: summary.absent,   color: "var(--danger)",  bg: "var(--danger-bg)"  },
          { label: "On Leave", count: summary.leave,    color: "var(--warning)", bg: "var(--warning-bg)" },
          { label: "Unmarked", count: summary.unmarked, color: "#888",           bg: "#f3f3f3"           },
        ].map(s => (
          <div key={s.label} className="card" style={{ background: s.bg, border: `1px solid ${s.color}22`, textAlign: "center", padding: "1rem" }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.count}</div>
            <div style={{ fontSize: 12, color: s.color, fontWeight: 600, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Action bar — Upload + helpers */}
      <div className="card" style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "12px 16px", marginBottom: 16,
        background: dirtyEmployees.length > 0 ? "#fffbe6" : "#f8fafc",
        border: `1px solid ${dirtyEmployees.length > 0 ? "#f1c40f55" : "var(--border)"}`,
      }}>
        <div style={{ fontSize: 13, color: "#555" }}>
          {dirtyEmployees.length > 0
            ? <><strong style={{ color: "#854F0B" }}>{dirtyEmployees.length} unsaved change{dirtyEmployees.length !== 1 ? "s" : ""}</strong> — click Upload to save.</>
            : uploadMessage
              ? <span style={{ color: "var(--success)", fontWeight: 600 }}>{uploadMessage}</span>
              : <>All changes saved.</>
          }
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={markAllPresent}
            disabled={employees.length === 0 || uploading}
            style={{
              padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500,
              background: "#fff", color: "var(--fg)", border: "1px solid var(--border-strong)",
              cursor: employees.length === 0 ? "not-allowed" : "pointer",
              opacity: employees.length === 0 ? 0.5 : 1,
            }}
          >
            ✓ All Present
          </button>
          <button
            onClick={resetUnsaved}
            disabled={dirtyEmployees.length === 0 || uploading}
            style={{
              padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500,
              background: "#fff", color: "var(--fg)", border: "1px solid var(--border-strong)",
              cursor: dirtyEmployees.length === 0 ? "not-allowed" : "pointer",
              opacity: dirtyEmployees.length === 0 ? 0.5 : 1,
            }}
          >
            ↺ Reset
          </button>
          <button
            onClick={uploadAll}
            disabled={dirtyEmployees.length === 0 || uploading}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 700,
              background: "var(--primary)", color: "#fff", border: "none",
              cursor: dirtyEmployees.length === 0 ? "not-allowed" : "pointer",
              opacity: dirtyEmployees.length === 0 ? 0.5 : 1,
              boxShadow: dirtyEmployees.length > 0 ? "0 2px 8px rgba(163,45,45,0.25)" : "none",
            }}
          >
            {uploading ? "Uploading..." : `⬆ Upload to Records${dirtyEmployees.length > 0 ? ` (${dirtyEmployees.length})` : ""}`}
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ borderColor: "var(--danger)", color: "var(--danger)", marginBottom: 16 }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Attendance table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div className="empty">Loading...</div>
        ) : employees.length === 0 ? (
          <div className="empty">No employees found. Add employees first.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: 50 }}>Photo</th>
                <th>Employee ID</th>
                <th>Name</th>
                <th>Designation</th>
                <th>Department</th>
                <th>Status</th>
                <th style={{ textAlign: "center" }}>Mark Attendance</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => {
                const isDirty = emp.status !== (savedSnapshot[emp.id] ?? null) && emp.status !== null;
                return (
                <tr key={emp.id} style={isDirty ? { background: "#fffbe6" } : undefined}>
                  <td>
                    {emp.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={emp.photoUrl} alt={emp.firstName} style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border)" }} />
                    ) : (
                      <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#eee", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: "#999" }}>
                        {emp.firstName[0]}{emp.lastName[0]}
                      </div>
                    )}
                  </td>
                  <td style={{ fontWeight: 600, color: "var(--primary)", fontSize: 12 }}>{emp.employeeId}</td>
                  <td style={{ fontWeight: 500 }}>
                    {emp.firstName} {emp.lastName}
                    {isDirty && <span style={{ marginLeft: 6, fontSize: 10, color: "#854F0B", fontWeight: 600 }}>● unsaved</span>}
                  </td>
                  <td style={{ color: "#666" }}>{emp.designation || "—"}</td>
                  <td style={{ color: "#666" }}>{emp.department || "—"}</td>
                  <td>
                    {emp.status ? (
                      <span style={{
                        display: "inline-block",
                        padding: "3px 10px",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 600,
                        background: STATUS_CONFIG[emp.status].bg,
                        color: STATUS_CONFIG[emp.status].color,
                      }}>
                        {STATUS_CONFIG[emp.status].label}
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: "#aaa" }}>— Unmarked</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                      {(["present", "absent", "leave"] as const).map(s => (
                        <button
                          key={s}
                          onClick={() => mark(emp, s)}
                          style={{
                            padding: "5px 12px",
                            borderRadius: 6,
                            border: `1px solid ${STATUS_CONFIG[s].color}44`,
                            background: emp.status === s ? STATUS_CONFIG[s].bg : "#fff",
                            color: STATUS_CONFIG[s].color,
                            fontWeight: emp.status === s ? 700 : 500,
                            fontSize: 11,
                            cursor: "pointer",
                            transition: "all 0.15s",
                          }}
                        >
                          {STATUS_CONFIG[s].label}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
