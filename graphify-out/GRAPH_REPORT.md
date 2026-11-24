# Graph Report - LAB-system  (2026-11-24)

## Corpus Check
- 310 files · ~848,982 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 5, .example 1, .prisma 1)

## Summary
- 1647 nodes · 4684 edges · 76 communities (63 shown, 13 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1f0a9744`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- next
- escapeHtml
- formatUserName
- session.ts
- chatbot-engine.ts
- drawio_extract.py
- invalidateCache
- ebooks/page.tsx
- logActivity
- @prisma/client
- NotificationBell.tsx
- useAuth
- academicTerm.ts
- ac-memo-docx.ts
- feedback/page.tsx
- Diagram
- feedback/route.ts
- mermaid_extract.py
- generate_student_manual_docx_pdf.py
- notifications.ts
- librarian-audit.mjs
- date-time-utils.ts
- self_check.py
- capture_real_system_steps.js
- lucide-react
- version-bump.mjs
- package.json
- dependencies
- scripts
- ref_fs
- broadcast/route.ts
- react
- app/page.tsx
- practice/page.tsx
- render_system_flow.js
- auth-context.tsx
- compilerOptions
- getSessionFromRequest
- room-schedules/route.ts
- ref_path
- xlsx
- quick-action/route.ts
- capture_realistic_overview.js
- token.ts
- build_clean_system_flow.js
- build_student_manual_assets.js
- generate_consumables_excel.js
- import_consumables.js
- graphify.mjs
- capture_with_demo.js
- generate_sample_excel_reports.js
- simulate_full_system.js
- build_student_ui_mockups.js
- update_riester_omron.js
- seed.js
- execute_brand_model_fix.js
- tailwind-merge@^3.0.1
- reorder_sim_and_fms.js
- sync_master_excel_from_db.js
- sync_master_excel_images.js
- @opennextjs/cloudflare
- upload/route.ts
- restore-backup.mjs
- wrangler@^4.151.1
- items/bulk/route.ts
- _logical_statements
- tailwindcss
- list_consumables.js
- check_drive_meta.js
- exceljs
- react-dom
- resend
- engines
- postcss.config.mjs
- vercel.json

## God Nodes (most connected - your core abstractions)
1. `next` - 162 edges
2. `prisma` - 116 edges
3. `useAuth()` - 103 edges
4. `formatUserName()` - 101 edges
5. `invalidateCache()` - 95 edges
6. `react` - 92 edges
7. `lucide-react` - 88 edges
8. `LoadingSpinner()` - 76 edges
9. `formatTeacherName()` - 65 edges
10. `logActivity()` - 61 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `parseBangkokDateTime()`  [EXTRACTED]
  src/app/api/borrow/availability/route.ts → src/lib/date-time-utils.ts
- `DELETE()` --calls--> `invalidateCache()`  [EXTRACTED]
  src/app/api/room-bookings/[id]/route.ts → src/lib/cache.ts
- `POST()` --calls--> `invalidateCache()`  [EXTRACTED]
  src/app/api/storage/locations/[id]/assign/route.ts → src/lib/cache.ts
- `AuditLogsPage()` --calls--> `useAuth()`  [EXTRACTED]
  src/app/audit-logs/page.tsx → src/lib/auth-context.tsx
- `ChatMessage` --references--> `ConfirmationSummaryCard`  [EXTRACTED]
  src/app/admin/chatbot/page.tsx → src/types/chatbot.ts

## Import Cycles
- 2-file cycle: `src/components/borrow/BorrowCatalogBrowser.tsx -> src/components/borrow/BorrowCheckoutDrawer.tsx -> src/components/borrow/BorrowCatalogBrowser.tsx`

## Communities (76 total, 13 thin omitted)

### Community 0 - "next"
Cohesion: 0.04
Nodes (15): next, POST(), GET(), dynamic, dynamic, dynamic, dynamic, dynamic (+7 more)

### Community 1 - "escapeHtml"
Cohesion: 0.05
Nodes (70): qrcode, AdminCatalogSandboxPage(), classifyAcSession(), dynamic, GET(), getMonthDateRange(), revalidate, InventoryPage() (+62 more)

### Community 2 - "formatUserName"
Cohesion: 0.10
Nodes (44): ApprovalsPage(), BorrowPage(), CoursesPage(), DispenseCenterPage(), QueueItem, PracticeKitsPage(), RequisitionsPage(), BorrowSlipVerificationPage() (+36 more)

### Community 3 - "session.ts"
Cohesion: 0.06
Nodes (54): bcryptjs@^3.0.3, bcryptjs, POST(), POST(), POST(), POST(), POST(), POST() (+46 more)

### Community 4 - "chatbot-engine.ts"
Cohesion: 0.07
Nodes (55): AdminChatbotSandboxPage(), ChatMessage, POST(), ChatMessage, LabCopilotWidget(), assembleUserScopedContext(), UserScopedSystemContext, checkIntentPermission() (+47 more)

### Community 5 - "drawio_extract.py"
Cohesion: 0.08
Nodes (32): _aligned(), analyze(), classify_shape(), clean_label(), _configure_stdout_utf8(), _decompress_limited(), digest(), Edge (+24 more)

### Community 6 - "invalidateCache"
Cohesion: 0.08
Nodes (39): POST(), PUT(), GET(), GET(), POST(), DELETE(), PATCH(), PUT() (+31 more)

### Community 7 - "ebooks/page.tsx"
Cohesion: 0.10
Nodes (24): AdminEBooksSandboxPage(), hydrateBooks(), COVER_CATEGORY_LABELS, DEFAULT_EBOOKS, EBookItem, EBookPage, extractGoogleDriveFileId(), idbLoadEBooks() (+16 more)

### Community 8 - "logActivity"
Cohesion: 0.07
Nodes (28): calculateHours(), DELETE(), POST(), DELETE(), PUT(), GET(), POST(), POST() (+20 more)

### Community 9 - "@prisma/client"
Cohesion: 0.04
Nodes (25): @prisma/client, prisma, prisma, { PrismaClient }, prisma, { PrismaClient }, prisma, { PrismaClient } (+17 more)

### Community 10 - "NotificationBell.tsx"
Cohesion: 0.14
Nodes (32): web-push@^3.6.7, web-push, POST(), getQuickApproveMeta(), NotificationBell(), NotificationItem, playNotificationChime(), resolveNotificationHref() (+24 more)

### Community 11 - "useAuth"
Cohesion: 0.16
Nodes (24): LoginPage(), SessionActivityWatcher(), PostActionFeedbackModal(), AppLauncherModal(), AppLauncherModalProps, AppLayoutContent(), Navbar(), NavbarProps (+16 more)

### Community 12 - "academicTerm.ts"
Cohesion: 0.14
Nodes (38): recharts@^3.10.1, recharts, DELETE(), PUT(), GET(), POST(), GET(), AcademicTermItem (+30 more)

### Community 13 - "ac-memo-docx.ts"
Cohesion: 0.09
Nodes (39): AirConditioningPage(), formatPurposeWithNote(), THAI_DAY_NAMES, THAI_MONTHS, ALLOWED_URGENCY, cleanStr(), GET(), PUT() (+31 more)

### Community 14 - "feedback/page.tsx"
Cohesion: 0.12
Nodes (21): AdminFeedbackPage(), FeedbackRecord, FeedbackSummary, ALLOWED_VIEWER_MUTATION_PATHS, resolveRequestMethod(), resolveRequestUrl(), ViewerModeGuard(), DEFAULT_CFG (+13 more)

### Community 15 - "Diagram"
Cohesion: 0.15
Nodes (23): classify_shape(), clean_label(), Diagram, _discard_nonsemantic(), _edge_operators(), _endpoint_group(), _fail(), _finalize_degrees() (+15 more)

### Community 16 - "feedback/route.ts"
Cohesion: 0.31
Nodes (8): DEFAULT_CONFIG, PUT(), DELETE(), PUT(), GET(), POST(), clampStarRating(), verifyFeedbackAdmin()

### Community 17 - "mermaid_extract.py"
Cohesion: 0.13
Nodes (16): analyze(), _configure_stdout_utf8(), digest(), Edge, _escape_markdown(), _escape_table(), _frontmatter_end(), _has_cycle() (+8 more)

### Community 18 - "generate_student_manual_docx_pdf.py"
Cohesion: 0.10
Nodes (9): build_presentation(), apply_thai_font(), generate_docx_manual(), set_cell_background(), set_cell_margins(), create_vertical_flowchart_docx(), add_body_p(), add_heading_styled() (+1 more)

### Community 19 - "notifications.ts"
Cohesion: 0.16
Nodes (32): POST(), POST(), POST(), POST(), PUT(), POST(), PUT(), POST() (+24 more)

### Community 20 - "librarian-audit.mjs"
Cohesion: 0.32
Nodes (15): __dirname, __filename, getAgentsAndSkills(), getComponentsAndLibs(), getDocumentationFiles(), getPagesAndApis(), getPrismaModels(), getVersionStatus() (+7 more)

### Community 21 - "date-time-utils.ts"
Cohesion: 0.12
Nodes (29): GET(), GET(), POST(), processReminders(), timingSafeMatch(), verifyAuth(), GET(), dynamic (+21 more)

### Community 22 - "self_check.py"
Cohesion: 0.14
Nodes (11): canonical_controller(), check_motion(), check_scripts(), check_svgs(), DiagramParser, is_approved_google_fonts_stylesheet(), main(), normalized_controller() (+3 more)

### Community 23 - "capture_real_system_steps.js"
Cohesion: 0.09
Nodes (16): fs, IMAGES_DIR, path, puppeteer, studentUser, fs, generateVisualSteps(), IMAGES_DIR (+8 more)

### Community 24 - "lucide-react"
Cohesion: 0.08
Nodes (30): lucide-react, AdminConsolePage(), AdminSandboxHubPage(), BorrowRequestContent(), BorrowRequestPage(), ExecutiveDashboardPage(), MaintenanceDashboardPage(), MaintenanceReportContent() (+22 more)

### Community 25 - "version-bump.mjs"
Cohesion: 0.18
Nodes (9): arg, __dirname, __filename, parts, pkg, pkgPath, ROOT_DIR, today (+1 more)

### Community 26 - "package.json"
Cohesion: 0.12
Nodes (22): devDependencies, autoprefixer@^10.4.20, postcss@^8.5.2, @types/bcryptjs@^2.4.6, @types/node@^22.13.4, @types/pg@^8.23.1, @types/react@^19.0.10, @types/react-dom@^19.0.4 (+14 more)

### Community 27 - "dependencies"
Cohesion: 0.08
Nodes (24): dependencies, clsx@^2.1.1, docx@^9.8.1, google-auth-library@^11.2.0, html5-qrcode@^2.3.8, jspdf@^4.2.1, lucide-react@^0.475.0, next@^15.2.0 (+16 more)

### Community 28 - "scripts"
Cohesion: 0.09
Nodes (23): scripts, build, build:cf, dev, graphify, graphify:build, graphify:explain, graphify:god-nodes (+15 more)

### Community 29 - "ref_fs"
Cohesion: 0.09
Nodes (12): shadowBase64, fs, IMAGES_DIR, mockBorrowData, path, puppeteer, studentUser, diecutBase64 (+4 more)

### Community 30 - "broadcast/route.ts"
Cohesion: 0.36
Nodes (6): GET(), POST(), PUT(), GET(), dispatchBroadcastMessage(), processScheduledBroadcasts()

### Community 31 - "react"
Cohesion: 0.09
Nodes (19): react, AdminErrorProps, PublicAssetPage(), PublicConsumablePage(), GlobalErrorProps, CabinetStoragePage(), RoomStoragePage(), SessionTimeoutModal() (+11 more)

### Community 32 - "app/page.tsx"
Cohesion: 0.13
Nodes (20): DashboardPage(), DAYS_OF_WEEK, getCleanLocalDateStr(), getRoomCategory(), ROOM_CATEGORIES, RoomCategory, RoomsPage(), SchedulePage() (+12 more)

### Community 33 - "practice/page.tsx"
Cohesion: 0.25
Nodes (14): html5-qrcode, GET(), PracticePage(), startCamera(), QrScannerModal(), startScanner(), QrScannerModalProps, createScanThrottle() (+6 more)

### Community 34 - "render_system_flow.js"
Cohesion: 0.10
Nodes (13): fs, path, puppeteer, fs, path, puppeteer, fs, HTML_OUTPUT_PATH (+5 more)

### Community 35 - "auth-context.tsx"
Cohesion: 0.27
Nodes (9): AuthContext, AuthContextType, AuthProvider(), initializeAuth(), checkSessionActive(), IDLE_TIMEOUT_MS, isDefaultAdminUser(), SESSION_LIFETIME_NORMAL_MS (+1 more)

### Community 36 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 37 - "getSessionFromRequest"
Cohesion: 0.13
Nodes (14): GET(), BorrowActionError, PUT(), GET(), POST(), ReturnValidationError, POST(), DELETE() (+6 more)

### Community 38 - "room-schedules/route.ts"
Cohesion: 0.38
Nodes (5): CORS_HEADERS, dynamic, GET(), getSyncApiKey(), timingSafeKeyMatch()

### Community 39 - "ref_path"
Cohesion: 0.13
Nodes (10): allFiles, getFiles(), results, fs, path, wranglerPath, path, prisma (+2 more)

### Community 40 - "xlsx"
Cohesion: 0.09
Nodes (18): xlsx, fs, path, prisma, { PrismaClient }, XLSX, fs, importUpdatedImages() (+10 more)

### Community 41 - "quick-action/route.ts"
Cohesion: 0.29
Nodes (10): executeQuickAction(), GET(), POST(), previewQuickActionConfirmation(), renderConfirmationHtml(), renderResponseHtml(), PUT(), combineSlotDateAndBangkokTime() (+2 more)

### Community 42 - "capture_realistic_overview.js"
Cohesion: 0.25
Nodes (6): fs, IMAGES_DIR, mockBorrowData, path, puppeteer, studentUser

### Community 43 - "token.ts"
Cohesion: 0.60
Nodes (5): generateSignedApprovalToken(), getApprovalSecret(), readEnvVar(), readStaticProcessEnv(), verifySignedApprovalToken()

### Community 44 - "build_clean_system_flow.js"
Cohesion: 0.22
Nodes (10): buildHTML(), buildSVG(), fs, HTML_PATH, path, PDF_PATH, PNG_PATH, puppeteer (+2 more)

### Community 45 - "build_student_manual_assets.js"
Cohesion: 0.22
Nodes (9): FLOWCHART_DIR, flowcharts, fs, generateHtmlPage(), IMAGES_DIR, MANUAL_DIR, path, puppeteer (+1 more)

### Community 46 - "generate_consumables_excel.js"
Cohesion: 0.27
Nodes (9): formatISODate(), formatThaiDate(), fs, generateExcel(), path, prisma, { PrismaClient }, setWorksheetColumnWidths() (+1 more)

### Community 47 - "import_consumables.js"
Cohesion: 0.27
Nodes (9): extractItemFromRow(), fs, main(), normalizeItemType(), parseSafeDate(), path, prisma, { PrismaClient } (+1 more)

### Community 48 - "graphify.mjs"
Cohesion: 0.22
Nodes (4): args, __dirname, result, rootDir

### Community 49 - "capture_with_demo.js"
Cohesion: 0.25
Nodes (8): fs, mockStudentUser, mockTeacherUser, OUTPUT_DIR, path, puppeteer, run(), setAuth()

### Community 50 - "generate_sample_excel_reports.js"
Cohesion: 0.25
Nodes (8): formatDateThai(), fs, generateReports(), OUTPUT_DIR, path, prisma, { PrismaClient }, XLSX

### Community 51 - "simulate_full_system.js"
Cohesion: 0.25
Nodes (8): cleanupRegistry, fs, path, prisma, { PrismaClient }, recordResult(), runSimulation(), testResults

### Community 52 - "build_student_ui_mockups.js"
Cohesion: 0.29
Nodes (5): fs, IMAGES_DIR, mockups, path, puppeteer

### Community 53 - "update_riester_omron.js"
Cohesion: 0.25
Nodes (6): fs, main(), path, prisma, { PrismaClient }, xlsx

### Community 54 - "seed.js"
Cohesion: 0.29
Nodes (5): cleanAndSeed(), fs, path, prisma, { PrismaClient }

### Community 55 - "execute_brand_model_fix.js"
Cohesion: 0.29
Nodes (5): fs, path, prisma, { PrismaClient }, xlsx

### Community 57 - "reorder_sim_and_fms.js"
Cohesion: 0.29
Nodes (5): fs, path, prisma, { PrismaClient }, XLSX

### Community 58 - "sync_master_excel_from_db.js"
Cohesion: 0.29
Nodes (5): fs, path, prisma, { PrismaClient }, XLSX

### Community 59 - "sync_master_excel_images.js"
Cohesion: 0.29
Nodes (5): fs, path, prisma, { PrismaClient }, XLSX

### Community 60 - "@opennextjs/cloudflare"
Cohesion: 0.33
Nodes (3): nextConfig, @opennextjs/cloudflare@^1.20.12, @opennextjs/cloudflare

### Community 62 - "restore-backup.mjs"
Cohesion: 0.40
Nodes (5): convertDates(), dateFieldNames, prisma, restore(), tableOrder

### Community 64 - "items/bulk/route.ts"
Cohesion: 0.70
Nodes (4): extractItemFromRow(), normalizeItemType(), parseSafeDate(), POST()

### Community 67 - "tailwindcss"
Cohesion: 0.50
Nodes (3): tailwindcss@^3.4.17, tailwindcss, config

## Knowledge Gaps
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `escapeHtml`, `formatUserName`, `session.ts`, `chatbot-engine.ts`, `invalidateCache`, `ebooks/page.tsx`, `logActivity`, `NotificationBell.tsx`, `useAuth`, `academicTerm.ts`, `ac-memo-docx.ts`, `feedback/page.tsx`, `feedback/route.ts`, `notifications.ts`, `date-time-utils.ts`, `lucide-react`, `package.json`, `dependencies`, `broadcast/route.ts`, `react`, `app/page.tsx`, `practice/page.tsx`, `auth-context.tsx`, `getSessionFromRequest`, `room-schedules/route.ts`, `xlsx`, `quick-action/route.ts`, `upload/route.ts`, `items/bulk/route.ts`?**
  _High betweenness centrality (0.234) - this node is a cross-community bridge._
- **Should `next` be split into smaller, more focused modules?**
  _Cohesion score 0.04219409282700422 - nodes in this community are weakly interconnected._
- **Why does `@prisma/client` connect `@prisma/client` to `next`, `sync_master_excel_from_db.js`, `list_consumables.js`, `ref_path`, `xlsx`, `sync_master_excel_images.js`, `generate_consumables_excel.js`, `import_consumables.js`, `generate_sample_excel_reports.js`, `simulate_full_system.js`, `update_riester_omron.js`, `seed.js`, `execute_brand_model_fix.js`, `reorder_sim_and_fms.js`, `package.json`, `dependencies`, `restore-backup.mjs`?**
  _High betweenness centrality (0.137) - this node is a cross-community bridge._
- **Should `escapeHtml` be split into smaller, more focused modules?**
  _Cohesion score 0.05112560488112771 - nodes in this community are weakly interconnected._
- **Why does `xlsx` connect `xlsx` to `escapeHtml`, `formatUserName`, `sync_master_excel_from_db.js`, `ref_path`, `sync_master_excel_images.js`, `academicTerm.ts`, `ac-memo-docx.ts`, `generate_consumables_excel.js`, `import_consumables.js`, `feedback/page.tsx`, `generate_sample_excel_reports.js`, `update_riester_omron.js`, `execute_brand_model_fix.js`, `lucide-react`, `reorder_sim_and_fms.js`, `package.json`, `dependencies`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Should `formatUserName` be split into smaller, more focused modules?**
  _Cohesion score 0.0951048951048951 - nodes in this community are weakly interconnected._
- **Should `session.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05502392344497608 - nodes in this community are weakly interconnected._