import React, { useMemo, useState } from "react";
import {
  CheckCircle2,
  CircleOff,
  Clock3,
  Crosshair,
  Download,
  LocateFixed,
  MapPin,
  Plus,
  Radar,
  ShieldCheck,
  Trash2,
  UserRoundCheck,
} from "lucide-react";

const DEFAULT_AREAS = [
  {
    id: "main-campus",
    name: "Main Campus Gate",
    latitude: 10.7202,
    longitude: 122.5621,
    radius: 180,
  },
  {
    id: "senior-high-building",
    name: "Senior High Building",
    latitude: 10.7211,
    longitude: 122.5637,
    radius: 120,
  },
];

const STORAGE_KEYS = {
  areas: "school-attendance-areas",
  logs: "school-attendance-logs",
};

const initialAreaForm = {
  name: "",
  latitude: "",
  longitude: "",
  radius: 120,
};

const initialStudentForm = {
  studentId: "",
  studentName: "",
  section: "",
};

function loadStoredValue(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function persistValue(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function toRad(value) {
  return (value * Math.PI) / 180;
}

function getDistanceMeters(from, to) {
  const earthRadius = 6371000;
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);

  const haversine =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  return earthRadius * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function formatDistance(value) {
  if (!Number.isFinite(value)) return "Unknown";
  return value >= 1000 ? `${(value / 1000).toFixed(2)} km` : `${Math.round(value)} m`;
}

function formatTime(value) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getValidation(location, areas) {
  if (!location || areas.length === 0) return null;

  const rankedAreas = areas
    .map((area) => {
      const distance = getDistanceMeters(location, area);
      return {
        ...area,
        distance,
        inside: distance <= Number(area.radius),
      };
    })
    .sort((a, b) => a.distance - b.distance);

  return {
    allowed: rankedAreas.some((area) => area.inside),
    nearest: rankedAreas[0],
    matchedArea: rankedAreas.find((area) => area.inside) || null,
  };
}

function StatCard({ label, value, detail, icon: Icon }) {
  return (
    <section className="stat-card" aria-label={label}>
      <div className="stat-icon">
        <Icon size={20} />
      </div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <span>{detail}</span>
      </div>
    </section>
  );
}

function App() {
  const [areas, setAreas] = useState(() => loadStoredValue(STORAGE_KEYS.areas, DEFAULT_AREAS));
  const [logs, setLogs] = useState(() => loadStoredValue(STORAGE_KEYS.logs, []));
  const [activeView, setActiveView] = useState("student");
  const [areaForm, setAreaForm] = useState(initialAreaForm);
  const [studentForm, setStudentForm] = useState(initialStudentForm);
  const [location, setLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const todayLogs = useMemo(() => {
    const today = new Date().toDateString();
    return logs.filter((log) => new Date(log.createdAt).toDateString() === today);
  }, [logs]);

  const validation = useMemo(() => getValidation(location, areas), [location, areas]);
  const acceptedToday = todayLogs.filter((log) => log.status === "accepted").length;
  const blockedToday = todayLogs.filter((log) => log.status === "blocked").length;

  function saveAreas(nextAreas) {
    setAreas(nextAreas);
    persistValue(STORAGE_KEYS.areas, nextAreas);
  }

  function saveLogs(nextLogs) {
    setLogs(nextLogs);
    persistValue(STORAGE_KEYS.logs, nextLogs);
  }

  function addArea(event) {
    event.preventDefault();
    const latitude = Number(areaForm.latitude);
    const longitude = Number(areaForm.longitude);
    const radius = Number(areaForm.radius);

    if (!areaForm.name.trim() || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setMessage("Enter a valid area name, latitude, and longitude.");
      return;
    }

    if (radius < 20 || radius > 1000) {
      setMessage("Radius must be between 20 and 1000 meters.");
      return;
    }

    const nextArea = {
      id: crypto.randomUUID(),
      name: areaForm.name.trim(),
      latitude,
      longitude,
      radius,
    };

    saveAreas([nextArea, ...areas]);
    setAreaForm(initialAreaForm);
    setMessage(`${nextArea.name} is now an approved attendance area.`);
  }

  function removeArea(areaId) {
    saveAreas(areas.filter((area) => area.id !== areaId));
  }

  function useCurrentLocationForArea() {
    if (!navigator.geolocation) {
      setMessage("Geolocation is not supported by this browser.");
      return;
    }

    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
          accuracy: Math.round(position.coords.accuracy),
        };
        setLocation(nextLocation);
        setAreaForm((current) => ({
          ...current,
          latitude: nextLocation.latitude,
          longitude: nextLocation.longitude,
        }));
        setLocationStatus("ready");
        setMessage("Current GPS position copied to the area form.");
      },
      () => {
        setLocationStatus("error");
        setMessage("Allow location access to use your current coordinates.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }

  function getStudentLocation() {
    if (!navigator.geolocation) {
      setMessage("Geolocation is not supported by this browser.");
      return;
    }

    setLocationStatus("loading");
    setMessage("Requesting GPS location...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy),
        });
        setLocationStatus("ready");
        setMessage("GPS location captured. You can submit attendance now.");
      },
      () => {
        setLocationStatus("error");
        setMessage("Location permission is required before attendance can be submitted.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }

  function submitAttendance(event) {
    event.preventDefault();

    if (!studentForm.studentId.trim() || !studentForm.studentName.trim()) {
      setMessage("Enter the student ID and student name first.");
      return;
    }

    if (!location || !validation) {
      setMessage("Capture the student's GPS location before submitting attendance.");
      return;
    }

    const accepted = validation.allowed;
    const log = {
      id: crypto.randomUUID(),
      studentId: studentForm.studentId.trim(),
      studentName: studentForm.studentName.trim(),
      section: studentForm.section.trim() || "Not specified",
      createdAt: new Date().toISOString(),
      status: accepted ? "accepted" : "blocked",
      areaName: accepted ? validation.matchedArea.name : validation.nearest?.name || "No area",
      distance: validation.nearest?.distance,
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
    };

    saveLogs([log, ...logs]);
    setMessage(
      accepted
        ? `Attendance recorded inside ${log.areaName}.`
        : `Attendance blocked. Nearest allowed area is ${formatDistance(log.distance)} away.`
    );
  }

  function exportLogs() {
    const headers = [
      "Date",
      "Student ID",
      "Name",
      "Section",
      "Status",
      "Area",
      "Distance",
      "Latitude",
      "Longitude",
      "Accuracy",
    ];
    const rows = logs.map((log) => [
      new Date(log.createdAt).toLocaleString(),
      log.studentId,
      log.studentName,
      log.section,
      log.status,
      log.areaName,
      Math.round(log.distance || 0),
      log.latitude,
      log.longitude,
      log.accuracy,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "attendance-logs.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="app-shell">
      <section className="hero-band">
        <div className="hero-copy">
          <span className="eyebrow">
            <Radar size={16} />
            GPS validated attendance
          </span>
          <h1>School Attendance Portal</h1>
          <p>
            Students can submit attendance only when their device location is inside an
            administrator-approved school area.
          </p>
        </div>
        <div className="hero-status" aria-live="polite">
          <ShieldCheck size={24} />
          <strong>{areas.length} active geofence{areas.length === 1 ? "" : "s"}</strong>
          <span>{acceptedToday} accepted today</span>
        </div>
      </section>

      <section className="stats-grid" aria-label="Attendance summary">
        <StatCard label="Accepted today" value={acceptedToday} detail="Validated by GPS" icon={CheckCircle2} />
        <StatCard label="Blocked today" value={blockedToday} detail="Outside approved area" icon={CircleOff} />
        <StatCard label="Allowed areas" value={areas.length} detail="Managed by admin" icon={MapPin} />
        <StatCard label="Total attempts" value={logs.length} detail="Stored in this browser" icon={Clock3} />
      </section>

      <div className="view-tabs" role="tablist" aria-label="Portal views">
        <button
          className={activeView === "student" ? "active" : ""}
          type="button"
          onClick={() => setActiveView("student")}
          role="tab"
          aria-selected={activeView === "student"}
        >
          <UserRoundCheck size={18} />
          Student check-in
        </button>
        <button
          className={activeView === "admin" ? "active" : ""}
          type="button"
          onClick={() => setActiveView("admin")}
          role="tab"
          aria-selected={activeView === "admin"}
        >
          <ShieldCheck size={18} />
          Admin geofences
        </button>
      </div>

      {message && <div className="notice" aria-live="polite">{message}</div>}

      <section className="workspace">
        {activeView === "student" ? (
          <div className="student-layout">
            <form className="panel form-panel" onSubmit={submitAttendance}>
              <div className="panel-heading">
                <div>
                  <span>Student mode</span>
                  <h2>Submit attendance</h2>
                </div>
                <button className="icon-button" type="button" onClick={getStudentLocation} title="Capture GPS">
                  <LocateFixed size={20} />
                </button>
              </div>

              <label>
                Student ID
                <input
                  value={studentForm.studentId}
                  onChange={(event) =>
                    setStudentForm({ ...studentForm, studentId: event.target.value })
                  }
                  placeholder="Example: LNHS-2026-001"
                />
              </label>
              <label>
                Full name
                <input
                  value={studentForm.studentName}
                  onChange={(event) =>
                    setStudentForm({ ...studentForm, studentName: event.target.value })
                  }
                  placeholder="Student name"
                />
              </label>
              <label>
                Section
                <input
                  value={studentForm.section}
                  onChange={(event) => setStudentForm({ ...studentForm, section: event.target.value })}
                  placeholder="Grade and section"
                />
              </label>

              <div className={`gps-card ${validation?.allowed ? "ok" : validation ? "blocked" : ""}`}>
                <Crosshair size={22} />
                <div>
                  <strong>
                    {locationStatus === "loading"
                      ? "Capturing GPS..."
                      : validation?.allowed
                      ? "Inside allowed area"
                      : validation
                      ? "Outside allowed area"
                      : "No GPS location yet"}
                  </strong>
                  <span>
                    {validation
                      ? `${validation.nearest.name} is ${formatDistance(validation.nearest.distance)} away`
                      : "Use the location button before submitting attendance."}
                  </span>
                </div>
              </div>

              <button className="primary-button" type="submit">
                <CheckCircle2 size={18} />
                Submit attendance
              </button>
            </form>

            <MapPreview areas={areas} location={location} validation={validation} />
          </div>
        ) : (
          <div className="admin-layout">
            <form className="panel form-panel" onSubmit={addArea}>
              <div className="panel-heading">
                <div>
                  <span>Admin mode</span>
                  <h2>Set allowed GPS area</h2>
                </div>
                <button
                  className="icon-button"
                  type="button"
                  onClick={useCurrentLocationForArea}
                  title="Use current GPS"
                >
                  <LocateFixed size={20} />
                </button>
              </div>

              <label>
                Area name
                <input
                  value={areaForm.name}
                  onChange={(event) => setAreaForm({ ...areaForm, name: event.target.value })}
                  placeholder="Example: Covered gym"
                />
              </label>

              <div className="field-pair">
                <label>
                  Latitude
                  <input
                    type="number"
                    step="any"
                    value={areaForm.latitude}
                    onChange={(event) => setAreaForm({ ...areaForm, latitude: event.target.value })}
                    placeholder="10.7202"
                  />
                </label>
                <label>
                  Longitude
                  <input
                    type="number"
                    step="any"
                    value={areaForm.longitude}
                    onChange={(event) => setAreaForm({ ...areaForm, longitude: event.target.value })}
                    placeholder="122.5621"
                  />
                </label>
              </div>

              <label>
                Radius: {areaForm.radius} meters
                <input
                  className="range"
                  type="range"
                  min="20"
                  max="1000"
                  step="10"
                  value={areaForm.radius}
                  onChange={(event) => setAreaForm({ ...areaForm, radius: event.target.value })}
                />
              </label>

              <button className="primary-button" type="submit">
                <Plus size={18} />
                Add allowed area
              </button>
            </form>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <span>Approved attendance zones</span>
                  <h2>GPS geofences</h2>
                </div>
              </div>

              <div className="area-list">
                {areas.map((area) => (
                  <article className="area-row" key={area.id}>
                    <MapPin size={19} />
                    <div>
                      <strong>{area.name}</strong>
                      <span>
                        {area.latitude}, {area.longitude} · {area.radius} m radius
                      </span>
                    </div>
                    <button type="button" onClick={() => removeArea(area.id)} title={`Delete ${area.name}`}>
                      <Trash2 size={18} />
                    </button>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}
      </section>

      <section className="panel logs-panel">
        <div className="panel-heading">
          <div>
            <span>Attendance history</span>
            <h2>Recent attempts</h2>
          </div>
          <button className="secondary-button" type="button" onClick={exportLogs} disabled={logs.length === 0}>
            <Download size={18} />
            Export CSV
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Student</th>
                <th>Status</th>
                <th>Area</th>
                <th>Distance</th>
                <th>Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-cell">
                    No attendance attempts yet.
                  </td>
                </tr>
              ) : (
                logs.slice(0, 8).map((log) => (
                  <tr key={log.id}>
                    <td>{formatTime(log.createdAt)}</td>
                    <td>
                      <strong>{log.studentName}</strong>
                      <span>{log.studentId} · {log.section}</span>
                    </td>
                    <td>
                      <span className={`status-pill ${log.status}`}>{log.status}</span>
                    </td>
                    <td>{log.areaName}</td>
                    <td>{formatDistance(log.distance)}</td>
                    <td>{log.accuracy} m</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function MapPreview({ areas, location, validation }) {
  return (
    <section className="map-panel" aria-label="GPS validation map preview">
      <div className="map-grid">
        {areas.map((area, index) => (
          <div
            className="zone-marker"
            key={area.id}
            style={{
              "--x": `${24 + ((index * 31) % 55)}%`,
              "--y": `${22 + ((index * 23) % 52)}%`,
              "--size": `${Math.max(90, Math.min(230, area.radius / 2))}px`,
            }}
          >
            <span>{area.name}</span>
          </div>
        ))}
        <div className={`student-pin ${validation?.allowed ? "ok" : validation ? "blocked" : ""}`}>
          <LocateFixed size={22} />
          <span>{location ? "Student GPS" : "Awaiting GPS"}</span>
        </div>
      </div>
      <div className="map-footer">
        <strong>{validation?.allowed ? "Attendance allowed" : validation ? "Attendance blocked" : "Ready to validate"}</strong>
        <span>
          {location
            ? `${Number(location.latitude).toFixed(5)}, ${Number(location.longitude).toFixed(5)} · accuracy ${location.accuracy} m`
            : "Browser GPS will be checked against every active area."}
        </span>
      </div>
    </section>
  );
}

export default App;
