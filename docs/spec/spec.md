# RallyTrack — Specification (WHAT)

RallyTrack is a mobile-first PWA for veteran-car rally crews: it tracks tours
(distance, time, GPS route), provides rally instruments (resettable trip
counter, odometer calibration, 1/100 s stopwatch), displays the itinerary
(PDF or photos) offline, and exports closed tours.

Source concept: `docs/RallyTrack_Concept.md`. Principles: `constitution.md`.

## Scope

### In scope (v1)

- Tour lifecycle: start, track, close, review (F1)
- Live metrics while tracking: distance, elapsed time, current & average speed (F2)
- GPS route recording with accuracy filtering (F2)
- Resettable trip counter with manual distance corrections (F3)
- Odometer calibration with per-car profiles (F4)
- Itinerary attached to a tour: PDF upload or photos, page-by-page viewing, offline (F5)
- Stopwatch with 1/100 s precision and optional laps (F6)
- Large high-contrast navigator view (F7)
- Installable PWA, fully offline operation, local persistence (F8)
- Export of closed tours: GPX, CSV, PDF (F9)

### Out of scope (v1)

- Server sync of tours (designed for, DB provisioned — implemented as a
  stretch feature F10 only after F1–F9 are done)
- Accounts, authentication, multi-user or team features
- Turn-by-turn navigation, routing, offline map tiles (route is drawn as a
  plain track line, not on a map)
- Live position sharing / spectator mode
- Non-metric units, localization beyond Hungarian UI

## F1 — Tour management

- **FR-1.1** The user can start a new tour with one action from the home
  screen. An optional name defaults to date + time (e.g. `Túra 2026-07-14 09:30`).
- **FR-1.2** At most one tour is active at a time. An active tour survives
  app restarts and phone reboots: on relaunch the app automatically resumes
  it — tracking restarts without any user action, elapsed time stays correct
  (derived from the original start timestamp).
- **FR-1.3** The user can close the active tour. Closing stores: name, start
  and end timestamps, total distance (GPS and calibrated), duration, average
  speed, the recorded route, the trip-counter log, the calibration used, and
  the attached itinerary reference.
- **FR-1.4** Closed tours appear in a history list (newest first) showing
  name, date, distance and duration.
- **FR-1.5** A closed tour's detail view shows its route drawn as a track
  line (no map tiles), the metric summary, and the attached itinerary.
- **FR-1.6** The user can delete a closed tour after confirmation.

## F2 — Tracking & live metrics

- **FR-2.1** While a tour is active the app records GPS positions
  (timestamp, lat, lon, altitude if available, accuracy) at the highest
  practical rate the device provides.
- **FR-2.2** Points with horizontal accuracy worse than 50 m are discarded.
  Points implying a speed over 250 km/h relative to the previous kept point
  are discarded as GPS jumps.
- **FR-2.3** Total distance is the sum of great-circle (haversine) distances
  between consecutive kept points, displayed in km with 2 decimals
  (3 decimals on the trip counter).
- **FR-2.4** The tracking screen shows, live: total distance, elapsed time
  (`hh:mm:ss`), current speed and tour average speed (total distance /
  elapsed time), in km/h.
- **FR-2.5** Current speed uses the GPS-reported speed when available,
  otherwise it is derived from the last two kept points; shown as 0 when
  stationary or stale (no fresh point for > 5 s).
- **FR-2.6** While tracking, the screen is kept awake (Wake Lock; reacquired
  on visibility change).
- **FR-2.7** Recording continues while the app is in the foreground; if the
  OS suspends tracking in the background, elapsed time stays correct and
  distance resumes from the next kept point (no fabricated segments).
- **FR-2.8** Swiping the app away (or any OS-initiated kill) during an
  active tour must not lose the measurement: all tour state is flushed to
  storage at the latest on `visibilitychange`/`pagehide`, so at most the
  points since the last flush (≤ 5 s) are lost; on reopening, the tour
  auto-resumes per FR-1.2.

## F3 — Trip counter

- **FR-3.1** Within an active tour a trip counter shows: trip distance
  (km, 3 decimals), trip time, trip average speed, and both distances —
  GPS-measured and calibrated (FR-4.x) — simultaneously.
- **FR-3.2** The trip counter can be reset to zero at any moment without
  affecting tour totals.
- **FR-3.3** Trip distance can be corrected in steps of +10 m, −10 m,
  +100 m, −100 m. Corrections apply to the trip's GPS-based distance; the
  calibrated value is derived from the corrected value. Trip distance never
  goes below 0.
- **FR-3.4** Resets and corrections are logged with timestamps and stored
  with the tour.

## F4 — Odometer calibration & car profiles

- **FR-4.1** The user enters two values for a calibration run: distance
  measured by the app (GPS) and distance shown by the car's odometer. The
  app computes the calibration factor = odometer / GPS.
- **FR-4.2** With an active calibration, every distance display shows both
  the GPS value and the calibrated value (GPS × factor), clearly labelled.
- **FR-4.3** A calibration can be saved as a named car profile (car name,
  factor, note e.g. tyre size). Profiles can be created, edited, selected
  and deleted.
- **FR-4.4** Exactly one profile (or "no calibration", factor = 1) is active
  at a time; the active profile is remembered across sessions and recorded
  on closed tours.
- **FR-4.5** Valid factor range is 0.5–2.0; values outside are rejected with
  an error message.

## F5 — Itinerary

- **FR-5.1** The user can attach an itinerary to a tour: either a PDF file
  or one or more photos taken with the camera / picked from the gallery.
- **FR-5.2** Itinerary content is stored on-device and viewable fully
  offline, including after app restart.
- **FR-5.3** The viewer supports page-by-page navigation (next/previous,
  current page indicator) for both PDF pages and photo sequences, with
  controls sized for in-car use.
- **FR-5.4** The itinerary remains attached to the closed tour and is
  viewable from tour history.
- **FR-5.5** Oversized files are rejected with a clear message (limit:
  50 MB per itinerary).

## F6 — Stopwatch

- **FR-6.1** A stopwatch with start, stop and reset, displaying elapsed time
  with 1/100 s precision (`mm:ss.cc`, hours shown when reached).
- **FR-6.2** Measured time is computed from monotonic timestamps, not from
  tick counting: pausing/resuming and UI jank must not skew the result by
  more than one displayed hundredth.
- **FR-6.3** Optional lap times: while running, a lap action records the
  current split; laps are listed with lap number, lap time and total time.
- **FR-6.4** The stopwatch works independently of tours (usable with or
  without an active tour) and keeps running while the user navigates within
  the app.
- **FR-6.5** While the stopwatch is running, the screen is kept awake, the
  same way as during tracking (FR-2.6): a running measurement — tour or
  stopwatch — means an active wake lock.

## F7 — Navigator view

- **FR-7.1** During an active tour the user can switch to a simplified,
  high-contrast, large-type view showing: trip distance, calibrated odometer
  distance, elapsed time, average speed, current speed.
- **FR-7.2** The navigator view includes the trip reset and ±10/±100 m
  correction controls as oversized buttons; everything else is display-only.
- **FR-7.3** The view meets the glanceability rules of `constitution.md` C5
  and `DESIGN-GUIDELINE.md` (primary numerals readable at arm's length,
  WCAG AA contrast at minimum).

## F8 — PWA & offline operation

- **FR-8.1** The app is installable (valid web manifest: name, icons,
  standalone display, theme color) and runs fullscreen/standalone from the
  home screen.
- **FR-8.2** After first load, the full app shell loads and works with no
  network connection (service worker precaches the shell; app start offline
  shows the normal home screen, not a browser error).
- **FR-8.3** All user data (tours, points, trips, profiles, settings,
  itineraries) persists locally in IndexedDB and survives restarts; the app
  requests persistent storage to reduce eviction risk.
- **FR-8.4** Storage usage is shown in settings; when the itinerary store
  grows beyond quota, the user is warned and can delete old tours/itineraries.
- **FR-8.5** The web version offers a link-based path to the phone: an
  `/install` page shows the app's URL as a QR code and copyable link, plus
  platform-specific install steps (Android Chrome install prompt via
  `beforeinstallprompt`, iOS Safari "Add to Home Screen" instructions).
  Opening the link on a phone lands on the same page with the right
  platform's flow highlighted.

## F9 — Export

- **FR-9.1** A closed tour can be exported as GPX 1.1: a single track with
  timestamped trackpoints (lat, lon, ele when available), tour name and
  metadata.
- **FR-9.2** A closed tour can be exported as CSV: one summary block (name,
  start, end, duration, GPS distance, calibrated distance, avg speed,
  calibration factor) and one row per trackpoint.
- **FR-9.3** A closed tour can be exported as PDF: a print-optimized summary
  page (tour data, times, distances, average speeds, calibration data, route
  outline) produced via the browser's print-to-PDF flow.
- **FR-9.4** Export works fully offline and hands the file to the OS share /
  download mechanism.

## F10 — Sync (stretch, after F1–F9)

- **FR-10.1** When online, the user can trigger sync of closed tours to the
  provisioned Neon Postgres backend via Next.js API routes; local data
  remains authoritative (C2).
- **FR-10.2** Sync is idempotent (re-syncing an already-synced tour creates
  no duplicates) and partial failure leaves local data untouched.

## Non-functional requirements

- **NFR-1** Tracking must survive a 6-hour tour: point storage is batched;
  a tour of ~50k GPS points must not degrade UI responsiveness.
- **NFR-2** Live metric updates render at least once per second while
  tracking; stopwatch display updates at least 30×/s while running.
- **NFR-3** The app works on current mobile Chrome (Android) and Safari
  (iOS ≥ 17) — where a capability is missing (e.g. Wake Lock on older iOS),
  the feature degrades with a visible notice, never a crash.
- **NFR-4** Lighthouse PWA installability checks pass on the production
  build.
