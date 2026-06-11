"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import * as XLSX from "xlsx";

type Record = {
  id: number;
  date: string;
  status: "present" | "absent" | "leave";
  employeeId: number;
  empCode: string;
  firstName: string;
  lastName: string;
  designation: string | null;
  department: string | null;
};

const STATUS_CONFIG = {
  present: { label: "Present", color: "var(--success)", bg: "var(--success-bg)" },
  absent:  { label: "Absent",  color: "var(--danger)",  bg: "var(--danger-bg)"  },
  leave:   { label: "Leave",   color: "var(--warning)", bg: "var(--warning-bg)" },
};

function firstOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function AttendanceRecordsPage() {
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(todayStr());
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"daily" | "employee">("daily");
  const [search, setSearch] = useState("");

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/attendance/records?from=${from}&to=${to}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRecords(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const filtered = useMemo(() => {
    if (!search.trim()) return records;
    const q = search.toLowerCase();
    return records.filter(r =>
      `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) ||
      r.empCode.toLowerCase().includes(q) ||
      (r.department || "").toLowerCase().includes(q)
    );
  }, [records, search]);

  // Daily summary
  const dailySummary = useMemo(() => {
    const map: Map<string, { present: number; absent: number; leave: number }> = new Map();
    filtered.forEach(r => {
      if (!map.has(r.date)) map.set(r.date, { present: 0, absent: 0, leave: 0 });
      map.get(r.date)![r.status]++;
    });
    return Array.from(map.entries())
      .map(([date, counts]) => ({ date, ...counts, total: counts.present + counts.absent + counts.leave }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [filtered]);

  // Per-employee summary
  const employeeSummary = useMemo(() => {
    const map: Map<number, { empCode: string; name: string; department: string; present: number; absent: number; leave: number }> = new Map();
    filtered.forEach(r => {
      if (!map.has(r.employeeId)) {
        map.set(r.employeeId, {
          empCode: r.empCode,
          name: `${r.firstName} ${r.lastName}`,
          department: r.department || "—",
          present: 0, absent: 0, leave: 0,
        });
      }
      map.get(r.employeeId)![r.status]++;
    });
    return Array.from(map.values())
      .map(e => {
        const total = e.present + e.absent + e.leave;
        const pct = total > 0 ? Math.round((e.present / total) * 100) : 0;
        return { ...e, total, pct };
      })
      .sort((a, b) => b.pct - a.pct);
  }, [filtered]);

  const totals = useMemo(() => ({
    present: filtered.filter(r => r.status === "present").length,
    absent:  filtered.filter(r => r.status === "absent").length,
    leave:   filtered.filter(r => r.status === "leave").length,
    days:    new Set(filtered.map(r => r.date)).size,
  }), [filtered]);

  const overallPct = (totals.present + totals.absent + totals.leave) > 0
    ? Math.round((totals.present / (totals.present + totals.absent + totals.leave)) * 100)
    : 0;

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: All records
    const allRecords = filtered.map(r => ({
      Date: r.date,
      "Employee ID": r.empCode,
      Name: `${r.firstName} ${r.lastName}`,
      Designation: r.designation || "",
      Department: r.department || "",
      Status: STATUS_CONFIG[r.status].label,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allRecords), "All Records");

    // Sheet 2: Daily summary
    const dailyData = dailySummary.map(d => ({
      Date: d.date,
      Present: d.present,
      Absent: d.absent,
      "On Leave": d.leave,
      Total: d.total,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dailyData), "Daily Summary");

    // Sheet 3: Employee summary
    const empData = employeeSummary.map(e => ({
      "Employee ID": e.empCode,
      Name: e.name,
      Department: e.department,
      Present: e.present,
      Absent: e.absent,
      "On Leave": e.leave,
      "Total Days": e.total,
      "Attendance %": `${e.pct}%`,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(empData), "By Employee");

    XLSX.writeFile(wb, `attendance-records-${from}-to-${to}.xlsx`);
  };

  const setQuickRange = (range: "today" | "week" | "month" | "all") => {
    const today = todayStr();
    if (range === "today") { setFrom(today); setTo(today); }
    else if (range === "week") {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      setFrom(d.toISOString().slice(0, 10));
      setTo(today);
    }
    else if (range === "month") { setFrom(firstOfMonth()); setTo(today); }
    else if (range === "all") { setFrom("2020-01-01"); setTo(today); }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Attendance Records</h1>
          <p style={{ color: "#888", marginTop: 4, fontSize: 13 }}>
            {totals.days} day{totals.days !== 1 ? "s" : ""} · {filtered.length} record{filtered.length !== 1 ? "s" : ""} · Overall: <strong style={{ color: "var(--success)" }}>{overallPct}% present</strong>
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a href="/attendance/mark" className="btn btn-primary" style={{ padding: "8px 16px", fontSize: 13 }}>
            ＋ Mark Attendance
          </a>
          <button
            onClick={exportToExcel}
            disabled={filtered.length === 0}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: "#1d6f42", color: "#fff", border: "none",
              cursor: filtered.length === 0 ? "not-allowed" : "pointer",
              opacity: filtered.length === 0 ? 0.5 : 1,
            }}
          >
            📊 Export to Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16, padding: "14px 16px" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <label style={{ fontSize: 11, color: "#777", fontWeight: 600, textTransform: "uppercase" }}>From</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ width: "auto", fontSize: 13, padding: "6px 10px" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <label style={{ fontSize: 11, color: "#777", fontWeight: 600, textTransform: "uppercase" }}>To</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ width: "auto", fontSize: 13, padding: "6px 10px" }} />
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {(["today", "week", "month", "all"] as const).map(r => (
              <button key={r} onClick={() => setQuickRange(r)} style={{
                padding: "6px 10px", fontSize: 11, fontWeight: 500,
                background: "#fff", color: "#555",
                border: "1px solid var(--border-strong)", borderRadius: 6,
                cursor: "pointer", textTransform: "capitalize",
              }}>{r}</button>
            ))}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <input
              type="search"
              placeholder="🔍 Search employee or department..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ fontSize: 13, padding: "6px 12px" }}
            />
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Present",  count: totals.present,  color: "var(--success)", bg: "var(--success-bg)" },
          { label: "Total Absent",   count: totals.absent,   color: "var(--danger)",  bg: "var(--danger-bg)"  },
          { label: "Total On Leave", count: totals.leave,    color: "var(--warning)", bg: "var(--warning-bg)" },
          { label: "Days Recorded",  count: totals.days,     color: "#555",           bg: "#f3f3f3"           },
        ].map(s => (
          <div key={s.label} className="card" style={{ background: s.bg, border: `1px solid ${s.color}22`, textAlign: "center", padding: "1rem" }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.count}</div>
            <div style={{ fontSize: 12, color: s.color, fontWeight: 600, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {error && (
        <div className="card" style={{ borderColor: "var(--danger)", color: "var(--danger)", marginBottom: 16 }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* View toggle */}
      <div style={{ display: "flex", gap: 0, marginBottom: 12, borderRadius: 8, overflow: "hidden", width: "fit-content", border: "1px solid var(--border-strong)" }}>
        {(["daily", "employee"] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              padding: "8px 18px", fontSize: 13, fontWeight: 600,
              background: view === v ? "var(--primary)" : "#fff",
              color: view === v ? "#fff" : "#555",
              border: "none", cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {v === "daily" ? "📅 By Day" : "👥 By Employee"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div className="empty">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="empty">No attendance records in this range. Click <strong>＋ Mark Attendance</strong> to add some.</div>
        ) : view === "daily" ? (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th style={{ textAlign: "center" }}>Present</th>
                <th style={{ textAlign: "center" }}>Absent</th>
                <th style={{ textAlign: "center" }}>On Leave</th>
                <th style={{ textAlign: "center" }}>Total</th>
                <th style={{ textAlign: "center" }}>Attendance Rate</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {dailySummary.map(d => {
                const pct = d.total > 0 ? Math.round((d.present / d.total) * 100) : 0;
                const nice = new Date(d.date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
                return (
                  <tr key={d.date}>
                    <td style={{ fontWeight: 600 }}>{nice}</td>
                    <td style={{ textAlign: "center", color: "var(--success)", fontWeight: 600 }}>{d.present}</td>
                    <td style={{ textAlign: "center", color: "var(--danger)", fontWeight: 600 }}>{d.absent}</td>
                    <td style={{ textAlign: "center", color: "var(--warning)", fontWeight: 600 }}>{d.leave}</td>
                    <td style={{ textAlign: "center" }}>{d.total}</td>
                    <td style={{ textAlign: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                        <div style={{ width: 80, height: 6, background: "#eee", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: pct >= 80 ? "var(--success)" : pct >= 50 ? "var(--warning)" : "var(--danger)" }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#555", width: 36 }}>{pct}%</span>
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <a href={`/attendance/mark?date=${d.date}`} className="btn" style={{ padding: "4px 10px", fontSize: 11 }}>Edit</a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Name</th>
                <th>Department</th>
                <th style={{ textAlign: "center" }}>Present</th>
                <th style={{ textAlign: "center" }}>Absent</th>
                <th style={{ textAlign: "center" }}>Leave</th>
                <th style={{ textAlign: "center" }}>Total Days</th>
                <th style={{ textAlign: "center" }}>Attendance %</th>
              </tr>
            </thead>
            <tbody>
              {employeeSummary.map(e => (
                <tr key={e.empCode}>
                  <td style={{ fontWeight: 600, color: "var(--primary)", fontSize: 12 }}>{e.empCode}</td>
                  <td style={{ fontWeight: 500 }}>{e.name}</td>
                  <td style={{ color: "#666" }}>{e.department}</td>
                  <td style={{ textAlign: "center", color: "var(--success)", fontWeight: 600 }}>{e.present}</td>
                  <td style={{ textAlign: "center", color: "var(--danger)", fontWeight: 600 }}>{e.absent}</td>
                  <td style={{ textAlign: "center", color: "var(--warning)", fontWeight: 600 }}>{e.leave}</td>
                  <td style={{ textAlign: "center" }}>{e.total}</td>
                  <td style={{ textAlign: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                      <div style={{ width: 80, height: 6, background: "#eee", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${e.pct}%`, height: "100%", background: e.pct >= 80 ? "var(--success)" : e.pct >= 50 ? "var(--warning)" : "var(--danger)" }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#555", width: 36 }}>{e.pct}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
