# RallyTrack — Acceptance criteria (Given / When / Then)

Machine-checkable scenarios. Each scenario names the requirement it verifies
and the intended test level:

- **unit** — Vitest, pure functions in `src/lib/` (no browser APIs)
- **component** — Vitest + React testing, fake timers / mocked storage
- **manual** — device smoke test (offline, GPS, install); scripted here so a
  human can execute it verbatim

Domain conventions used below: distances in metres inside the domain layer,
formatted to km only at the UI edge; timestamps are epoch milliseconds.

## Distance & speed (FR-2.2, FR-2.3, FR-2.5)

**GWT-1 (unit)** — haversine distance
Given the points (47.4979 N, 19.0402 E) and (47.5000 N, 19.0500 E)
When the distance between them is computed
Then the result is 772 m ± 1 m.

**GWT-2 (unit)** — route distance is the sum of segments
Given a recorded sequence of 4 kept points forming segments of 100 m, 250 m and 400 m
When total distance is computed
Then the result is 750 m ± 1 m.

**GWT-3 (unit)** — inaccurate points are discarded
Given a point stream where one point has horizontal accuracy 80 m
When the stream is filtered
Then that point is not kept and contributes no distance.

**GWT-4 (unit)** — GPS jumps are discarded
Given two consecutive points 1 s apart whose separation implies 300 km/h
When the stream is filtered
Then the second point is discarded and total distance is unchanged.

**GWT-5 (unit)** — derived current speed
Given two kept points 10 s apart and 100 m from each other, and no
GPS-reported speed
When current speed is computed
Then the result is 36 km/h.

**GWT-6 (unit)** — stale speed shows zero
Given the last kept point is older than 5 s
When current speed is computed at "now"
Then the result is 0 km/h.

**GWT-7 (unit)** — average speed
Given a tour with total distance 45 000 m and elapsed time 1 h 30 min
When average speed is computed
Then the result is 30.0 km/h.

## Tour lifecycle (FR-1.1–FR-1.6)

**GWT-8 (component)** — starting a tour
Given no active tour exists
When the user starts a new tour without entering a name
Then an active tour is persisted with a default name of the pattern
`Túra YYYY-MM-DD HH:mm` and zeroed metrics.

**GWT-9 (component)** — single active tour
Given an active tour exists
When the app state is inspected
Then no second tour can be started (the start action is not available).

**GWT-10 (component)** — active tour survives restart
Given an active tour with recorded points is persisted
When the app is reloaded and storage is re-read
Then the same tour is restored as active with its distance and start time
intact, and elapsed time is computed from the original start timestamp.

**GWT-37 (component)** — state is flushed when the app is swiped away
Given an active tour with unflushed points in the write-behind batch
When a `pagehide` (or `visibilitychange` to hidden) event fires
Then the batch and the tour state are written to storage before the event
handler returns.

**GWT-38 (component)** — auto-resume without user action
Given a persisted active tour
When the app is (re)opened
Then tracking resumes automatically — the tour is active, the geolocation
watcher is started and no confirmation is asked (FR-1.2, FR-2.8).

**GWT-11 (component)** — closing a tour
Given an active tour with distance 12 340 m, a calibration factor 1.02 and an
attached itinerary
When the user closes the tour
Then a closed tour record is persisted containing end timestamp, GPS
distance 12 340 m, calibrated distance 12 587 m (± 1 m), duration, average
speed, route points, trip log, factor 1.02 and the itinerary reference —
and no tour is active anymore.

**GWT-12 (component)** — history ordering
Given three closed tours with different end dates
When the history list is rendered
Then they appear newest-first with name, date, distance and duration.

**GWT-13 (component)** — deleting a tour
Given a closed tour
When the user deletes it and confirms
Then the tour, its points and its itinerary blobs are removed from storage.

## Trip counter (FR-3.1–FR-3.4)

**GWT-14 (unit)** — trip reset
Given a tour distance of 25 000 m and a trip reset issued at tour distance
10 000 m
When trip distance is computed
Then it is 15 000 m, while tour total remains 25 000 m.

**GWT-15 (unit)** — corrections
Given a trip distance of 5 000 m
When the user applies +100 m, +10 m and −10 m
Then trip distance is 5 100 m and the tour total is unchanged.

**GWT-16 (unit)** — trip distance floor
Given a trip distance of 50 m
When the user applies −100 m
Then trip distance is 0 m (not negative).

**GWT-17 (unit)** — calibrated trip distance derives from corrected value
Given a corrected trip distance of 10 000 m and calibration factor 1.05
When the calibrated trip distance is computed
Then it is 10 500 m.

**GWT-18 (unit)** — trip events are logged
Given a trip reset followed by a +10 m correction
When the trip log is inspected
Then it contains both events with timestamps in order.

## Calibration & car profiles (FR-4.1–FR-4.5)

**GWT-19 (unit)** — factor computation
Given a calibration run where GPS measured 10.00 km and the odometer showed
10.05 km
When the factor is computed
Then it is 1.005.

**GWT-20 (unit)** — factor validation
Given odometer/GPS pairs implying factors 0.4 and 2.5
When the factor is validated
Then both are rejected; 0.51 and 1.99 are accepted.

**GWT-21 (component)** — profile lifecycle
Given a saved profile "Wartburg 353 (165R13)" with factor 1.031
When the user selects it, reloads the app, and reads the active profile
Then the active profile is still "Wartburg 353 (165R13)" and displayed
calibrated distances use factor 1.031.

**GWT-22 (unit)** — dual display values
Given GPS distance 12 345 m and active factor 1.02
When display values are computed
Then GPS shows 12.345 km and calibrated shows 12.592 km (rounded from
12 591.9 m).

## Stopwatch (FR-6.1–FR-6.4)

**GWT-23 (unit, fake timers)** — timestamp-based measurement
Given a stopwatch started at monotonic time t=0
When it is stopped at t=83 456 ms
Then the displayed value is `01:23.45` (truncated to the hundredth).

**GWT-24 (unit, fake timers)** — laps
Given a running stopwatch with laps recorded at 30 000 ms and 75 000 ms
When the lap list is read
Then lap 1 = `00:30.00` / total `00:30.00`, lap 2 = `00:45.00` / total
`01:15.00`.

**GWT-25 (unit, fake timers)** — reset
Given a stopped stopwatch showing a nonzero value with laps
When reset is pressed
Then the display is `00:00.00` and the lap list is empty.

**GWT-39 (component)** — wake lock follows running measurements
Given a mocked Wake Lock API
When a tour starts, then a stopwatch starts, then the tour is closed, then
the stopwatch is stopped
Then the wake lock is acquired at tour start and only released after the
stopwatch stops (held while ANY measurement runs — FR-2.6, FR-6.5).

## Formatting (C7)

**GWT-26 (unit)** — formats
Given the values 12 345.678 m, 5 025 s elapsed, and 83 456 ms stopwatch
When each is formatted for display
Then the results are `12.346 km` (trip, 3 decimals), `12.35 km` (tour, 2
decimals), `01:23:45`, and `01:23.45` respectively.

## Export (FR-9.1–FR-9.4)

**GWT-27 (unit)** — GPX structure
Given a closed tour with 3 trackpoints
When GPX is generated
Then the output is valid XML with one `<trk>`, one `<trkseg>`, 3 `<trkpt>`
elements carrying `lat`, `lon` and ISO-8601 `<time>`, and the tour name in
`<name>`.

**GWT-28 (unit)** — CSV structure
Given a closed tour with 3 trackpoints, factor 1.02
When CSV is generated
Then the summary block contains name, start, end, duration, GPS distance,
calibrated distance, average speed and factor, followed by a header row and
3 point rows (timestamp, lat, lon, ele, accuracy).

**GWT-29 (manual)** — offline export
Given a device in airplane mode with a closed tour
When the user exports GPX and CSV
Then both files are produced and offered via the OS share/download sheet.

## Itinerary (FR-5.1–FR-5.5)

**GWT-30 (component)** — attach and page through photos
Given an active tour and two attached photos
When the user opens the itinerary viewer and taps "next"
Then page 2 of 2 is shown, and "next" is disabled on the last page.

**GWT-31 (component)** — size limit
Given a file of 51 MB
When the user tries to attach it
Then it is rejected with an error message and nothing is stored.

**GWT-32 (manual)** — offline itinerary after restart
Given a tour with an attached PDF itinerary
When the app is killed, the device set to airplane mode, and the app
reopened
Then the itinerary opens and every page renders.

## PWA & offline (FR-8.1–FR-8.4)

**GWT-33 (manual)** — installability
Given the production build served over HTTPS
When Lighthouse's installability audit runs
Then it passes (valid manifest, service worker, icons), and the app can be
added to the home screen and launches standalone.

**GWT-34 (manual)** — offline cold start
Given the app was loaded once and then the device is in airplane mode
When the installed app is launched
Then the home screen renders (no browser offline error) and history is
readable.

**GWT-40 (manual)** — install by link from the web version
Given the deployed app open on a desktop browser
When the user opens the `/install` page
Then a QR code and a copyable link are shown; scanning the QR on a phone
opens the same page with that platform's install flow (Android: install
prompt button; iOS: "Add to Home Screen" steps), and completing it puts the
app on the home screen.

**GWT-41 (manual)** — swiped-away measurement survives on a device
Given a running tour on a phone
When the user swipes the app away and reopens it
Then the tour is running again by itself, elapsed time is correct, and at
most ~5 s of distance is missing.

**GWT-35 (manual)** — tracking without network
Given airplane mode with GPS enabled
When the user records a 10-minute tour and closes it
Then distance/time/speed behaved live and the closed tour is in history.

## Navigator view (FR-7.1–FR-7.3)

**GWT-36 (component)** — content and controls
Given an active tour in navigator view
When the view is rendered
Then it shows exactly: trip distance, calibrated distance, elapsed time,
average speed, current speed, plus trip reset and ±10/±100 m buttons — and
nothing else interactive.
