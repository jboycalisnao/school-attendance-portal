# School Attendance Portal

A simple React + Vite web application for online school attendance with GPS validation. Students can submit attendance only when their browser location is inside an administrator-approved attendance area.

## Features

- Student attendance form with student ID, full name, and section.
- Browser GPS capture using the Geolocation API.
- Admin geofence setup for one or more allowed school areas.
- Radius-based location validation using latitude, longitude, and meters.
- Attendance attempts are marked as `accepted` or `blocked`.
- Recent attendance log with GPS accuracy, nearest area, and distance.
- CSV export for attendance records.
- Data is stored in the browser with `localStorage`.

## How GPS Validation Works

The admin creates approved attendance areas by setting:

- Area name
- Latitude
- Longitude
- Allowed radius in meters

When a student captures their GPS location and submits attendance, the app calculates the distance between the student and each approved area. If the student is inside any area radius, attendance is accepted. If the student is outside all approved areas, attendance is blocked.

The distance calculation is handled in `src/App.jsx` using the Haversine formula.

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local app:

```text
http://127.0.0.1:5173
```

Build for production:

```bash
npm run build
```

## Browser Notes

GPS attendance requires browser location permission. The app must be opened in a browser that supports the Geolocation API.

For best results, students should use a phone or device with GPS enabled. Desktop location can be less accurate depending on the browser, network, and device.

## Implementation Notes

- The app is built with React, Vite, and `lucide-react` icons.
- Vite is pinned to a Node 18-compatible version.
- `src/App.jsx` explicitly imports `React` to avoid `React is not defined` runtime errors in this setup.
- `index.html` includes an inline SVG favicon to avoid `/favicon.ico` 404 console noise.
- This is a frontend-only prototype. For production use, connect it to a backend database and authentication system so students cannot edit stored records in the browser.

## Main Files

- `src/App.jsx` - Attendance logic, GPS validation, forms, logs, and geofence management.
- `src/styles.css` - Responsive dashboard UI styling.
- `src/main.jsx` - React app entry point.
- `index.html` - Vite HTML shell and favicon.
- `package.json` - Project scripts and dependencies.
