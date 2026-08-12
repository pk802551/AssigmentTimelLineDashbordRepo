# Project Explanation Guide (Timeline Dashboard)

Yeh document aapko aapke **Timeline Dashboard** React project ke saare technical aspects, architecture, token management, protected routes, high-performance canvas chart, aur timezone handling ko **interviewer ke samne explain karne** ke liye detail mein banaya gaya hai.

---

## 1. Project Ka Overview (Kya & Kyun Banya Hai?)

Yeh project ek **Industrial Timeline Dashboard** hai jo manufacturing machines ki production tracking, downtimes, stoppages, product quality (PASS/FAIL), aur cycle times ko show karta hai.

### Core Features:
1. **Authentication**: Real backend se login, JWT Token handling, persistent session, aur global 401 handling.
2. **Dynamic Filter Bar**: Real Backend Tree API se Assets/Machines fetch karke aur Shifts API se IST timings padh kar dynamic selection.
3. **High-Performance Canvas Chart**: 10,000–20,000 produce points ko 60 FPS par smooth drag-to-zoom aur hover ke saath render karta hai bina browser frame drop kiye.
4. **Hourly Production & Downtime Summary Table**: Shift timings ko clock-hour boundaries par divide karta hai aur har hour ke runtime/downtime/stoppage minutes & PASS/FAIL counts calculate karta hai.

---

## 2. Tech Stack used

- **React 18 + TypeScript**: Strict type safety aur component modularity ke liye.
- **Vite**: Ultra-fast build process aur dev environment.
- **Material-UI (MUI v6)**: Clean, professional industrial dashboard components aur controls ke liye.
- **HTML5 Canvas**: SVG ki jagah high-performance 2D canvas chart drawing engine.
- **React Router DOM v6**: Protected routes handling (`/login` ↔ `/`).

---

## 3. Token & Session Management (`src/api/client.ts` & `src/state/AuthContext.tsx`)

### Token Kahan Store Kiya Aur Kyun?
- Token ko **`localStorage`** mein store kiya gaya hai (`TOKEN_STORAGE_KEY`).
- **Reason & Trade-off (Interview mein bolne ke liye)**:
  > *"Backend login API direct JSON response body mein token bhejti hai (`access_token`). User session ko page reload ke baad bhi persistent rakhne ke liye `localStorage` best choice thi. Trade-off yeh hai ki `localStorage` XSS attacks ke liye vulnerable hota hai, but ideal production mein backend `HttpOnly` cookies use karta hai. Is current architecture mein `localStorage` exact required UX deta hai."*

### Central API Client & Auto Token Injection:
- All API requests `src/api/client.ts` se pass hoti hain.
- Headers mein `Authorization: Bearer <token>` automatic attach hota hai.
- Response envelope (`{ trace_id, status_code, message, data }`) automatically unwrap hoke `data` return karta hai.
- **HTTP 500 Retry**: Server error aane par 2 baar exponential backoff (`400ms * 2^retry`) ke saath auto-retry hota hai.
- **Global 401 Expiry**: Agar koi call HTTP 401 return karegi, toh storage clear karke user ko automatically `/login` page par redirect kar diya jata hai.

---

## 4. Protected Routes Architecture (`src/App.tsx`)

- Application startup par `AuthProvider` `localStorage` se token check karta hai aur `GET /auth/me` call karke session restore karta hai.
- Restoration ke dauran `initializing = true` rehne par screen par full loader dikhta hai.
- `<ProtectedRoute>` wrapper component check karta hai:
  - Agar user null hai toh `<Navigate to="/login" replace />` se login screen bhej deta hai.
  - User logged in hai toh Dashboard content render hota hai.

---

## 5. High-Performance Canvas Chart (`src/components/TimelineChart.tsx`)

### Canvas Kyun Use Kiya (SVG Kyun Nahi)?
- SVG mein 10,000–20,000 DOM elements (like `<circle>`) banane se browser ki DOM tree bohot heavy ho jaati hai, jisse zoom aur hover par multi-second freeze aata hai.
- HTML5 Canvas direct GPU hardware accelerated drawing karta hai, jo 20,000 points ko 5 milliseconds se kam mein render kar deta hai.

### Fail Marker Preservation Algorithm:
- Screen ke horizontal pixel X-coordinate compute hone ke baad:
  - Har **FAIL marker** ko Hamesha draw kiya jata hai (Big dark blue dot `r = 3.6px`).
  - **PASS markers** ko per pixel column (`Math.round(x)`) thin (downsample) kiya jata hai.
- **Result**: Visual clutter nahi hota, chart super fast rehta hai, aur **ek bhi Defect/FAIL missing nahi hota**.

### Interactive Controls:
- **Brush Zoom**: Pointer drag karke timeline span select karne par canvas recalculate ho jata hai (minimum 60s window guard).
- **Double Click Reset**: Double click karne par full shift window reset ho jati hai.
- **Hover Tooltip**: Mouse coordinates ke nearest marker distance compute karke custom tooltip draw karta hai.

---

## 6. Timezone Handling & Hourly Table Bucketing (`src/utils/time.ts` & `src/utils/data.ts`)

### UTC ↔ IST Conversions:
- Backend **UTC ISO Strings** expect karta hai aur UTC timestamps return karta hai.
- UI **IST (+05:30)** display karti hai.
- Input IST dates ko UTC ISO timestamp mein convert karke payload bhejte hain, aur backend response UTC dates ko parse karke `+5.5 hours` add karke IST time format karte hain.

### Hourly Table Bucketing:
- Shift time ko exact clock hours (jaise 08:00-09:00, 09:00-10:00) mein divide kiya jata hai.
- Agar koi segment (e.g. 08:33 → 10:12 Runtime) multi-hour span karta hai, toh use boundaries par cut karke respective hour columns mein duration allocate kiya jata hai (27 mins in 08-09, 60 mins in 09-10, 12 mins in 10-11).
- **Cycle Time Rows**: Second API (`POST /analytics-query`, `distribution: "hourly"`) se `ideal_cycle_time_seconds` aur `actual_cycle_time_seconds` fetch karke `bucket_start` se match karke fill kiye jaate hain.
- **In-Progress Shift**: Jo hours abhi future mein hain unke liye cells empty (`null`) chhod diye jaate hain taaki galat 0-minute stats na dikhein.

---

## 7. Interview Cheatsheet — Quick Answers

### Q: Project kaisa structured hai?
*"Project Modular Clean Architecture follow karta hai: `src/api` for API layer, `src/state` for Auth Context, `src/pages` for Page containers, `src/components` for Reusable UI components (Chart & Table), and `src/utils` for Time & Data processing logic."*

### Q: Token kahan store hua hai aur session loss refresh par rokne ke liye kya kiya?
*"Token `localStorage` mein store hai. App boot hone par `AuthContext` token read karta hai aur `/auth/me` trigger karta hai. Valid rehne par user restore ho jata hai, session drop nahi hota."*

### Q: Performance issue solving strategy kya rahi?
*"Huge data points (10k-20k) ke liye Canvas engine implement kiya. Hardware accelerated immediate-mode rendering aur pixel-column based PASS marker thinning algorithm use kiya jisse FAIL markers 100% preserve hue aur UI 60 FPS smooth raha."*
