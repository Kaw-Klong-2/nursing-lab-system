# Graph Report - LAB-system  (2026-11-24)

## Corpus Check
- 314 files · ~855,231 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 5, .example 1, .prisma 1)

## Summary
- 1671 nodes · 4802 edges · 84 communities (67 shown, 17 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `03eb6a3a`
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
- AppLayout.tsx
- invalidateCache
- academicTerm.ts
- ac-memo-docx.ts
- feedback/page.tsx
- Diagram
- user-utils.ts
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
- auth-security.ts
- compilerOptions
- notifications.ts
- room-schedules/route.ts
- BorrowCatalogBrowser.tsx
- xlsx
- quick-action/route.ts
- capture_realistic_overview.js
- lucide-react
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
- room-bookings/route.ts
- reorder_sim_and_fms.js
- xlsx
- test/route.ts
- @opennextjs/cloudflare
- upload/route.ts
- restore-backup.mjs
- enrollments/route.ts
- items/bulk/route.ts
- render_vertical_flowchart.js
- _logical_statements
- tailwindcss
- reminders/route.ts
- list_consumables.js
- repack/route.ts
- dispense/route.ts
- check_drive_meta.js
- google-auth-library
- jspdf
- exceljs
- @prisma/adapter-pg
- @types/qrcode@^1.5.6
- react-dom
- web-push
- engines
- postcss.config.mjs
- vercel.json

## God Nodes (most connected - your core abstractions)
1. `next` - 164 edges
2. `prisma` - 118 edges
3. `useAuth()` - 103 edges
4. `formatUserName()` - 103 edges
5. `invalidateCache()` - 98 edges
6. `react` - 94 edges
7. `lucide-react` - 90 edges
8. `LoadingSpinner()` - 76 edges
9. `formatTeacherName()` - 65 edges
10. `logActivity()` - 64 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `invalidateCache()`  [EXTRACTED]
  src/app/api/categories/route.ts → src/lib/cache.ts
- `POST()` --calls--> `invalidateCache()`  [EXTRACTED]
  src/app/api/items/route.ts → src/lib/cache.ts
- `POST()` --calls--> `invalidateCache()`  [EXTRACTED]
  src/app/api/kits/route.ts → src/lib/cache.ts
- `PUT()` --calls--> `invalidateCache()`  [EXTRACTED]
  src/app/api/practice/config/route.ts → src/lib/cache.ts
- `POST()` --calls--> `invalidateCache()`  [EXTRACTED]
  src/app/api/practice/rooms/route.ts → src/lib/cache.ts

## Import Cycles
- 2-file cycle: `src/components/borrow/BorrowCatalogBrowser.tsx -> src/components/borrow/BorrowCheckoutDrawer.tsx -> src/components/borrow/BorrowCatalogBrowser.tsx`

## Communities (84 total, 17 thin omitted)

### Community 0 - "next"
Cohesion: 0.04
Nodes (12): next, dynamic, dynamic, dynamic, dynamic, dynamic, DEFAULT_NOTIFICATION_TEMPLATES, DefaultTemplateConfig (+4 more)

### Community 1 - "escapeHtml"
Cohesion: 0.06
Nodes (57): qrcode, classifyAcSession(), dynamic, GET(), getMonthDateRange(), revalidate, PublicAssetPage(), PublicConsumablePage() (+49 more)

### Community 2 - "formatUserName"
Cohesion: 0.12
Nodes (33): POST(), ApprovalsPage(), BorrowPage(), QueueItem, RequisitionsPage(), BorrowSlipVerificationPage(), UniversalVerificationPage(), BulkAllocationReturnModal() (+25 more)

### Community 3 - "session.ts"
Cohesion: 0.08
Nodes (41): GET(), POST(), POST(), POST(), POST(), dynamic, GET(), POST() (+33 more)

### Community 4 - "chatbot-engine.ts"
Cohesion: 0.07
Nodes (53): ChatMessage, POST(), ChatMessage, assembleUserScopedContext(), UserScopedSystemContext, checkIntentPermission(), detectIntent(), executeConfirmedAction() (+45 more)

### Community 5 - "drawio_extract.py"
Cohesion: 0.08
Nodes (32): _aligned(), analyze(), classify_shape(), clean_label(), _configure_stdout_utf8(), _decompress_limited(), digest(), Edge (+24 more)

### Community 6 - "invalidateCache"
Cohesion: 0.11
Nodes (26): POST(), GET(), GET(), POST(), GET(), POST(), GET(), computeConsumableStock() (+18 more)

### Community 7 - "ebooks/page.tsx"
Cohesion: 0.11
Nodes (22): AdminEBooksSandboxPage(), hydrateBooks(), COVER_CATEGORY_LABELS, DEFAULT_EBOOKS, EBookItem, EBookPage, extractGoogleDriveFileId(), idbLoadEBooks() (+14 more)

### Community 8 - "logActivity"
Cohesion: 0.08
Nodes (29): calculateHours(), DELETE(), POST(), DELETE(), PUT(), GET(), POST(), DEFAULT_CONFIG (+21 more)

### Community 9 - "@prisma/client"
Cohesion: 0.04
Nodes (25): @prisma/client, prisma, prisma, { PrismaClient }, prisma, { PrismaClient }, prisma, { PrismaClient } (+17 more)

### Community 10 - "AppLayout.tsx"
Cohesion: 0.07
Nodes (65): ALLOWED_VIEWER_MUTATION_PATHS, resolveRequestMethod(), resolveRequestUrl(), ViewerModeGuard(), LabCopilotWidget(), PostActionFeedbackModal(), AppLauncherModal(), AppLauncherModalProps (+57 more)

### Community 11 - "invalidateCache"
Cohesion: 0.11
Nodes (17): POST(), PUT(), DELETE(), PATCH(), PUT(), DELETE(), PUT(), POST() (+9 more)

### Community 12 - "academicTerm.ts"
Cohesion: 0.15
Nodes (36): DELETE(), PUT(), GET(), POST(), AcademicTermItem, AcademicTermsSettingsPage(), CATEGORY_COLORS, DashboardCharts() (+28 more)

### Community 13 - "ac-memo-docx.ts"
Cohesion: 0.10
Nodes (35): ALLOWED_URGENCY, cleanStr(), GET(), PUT(), sanitizeConfig(), AcMemoModal(), AcMemoModalProps, EditorTab (+27 more)

### Community 14 - "feedback/page.tsx"
Cohesion: 0.22
Nodes (11): AdminFeedbackPage(), FeedbackRecord, FeedbackSummary, DEFAULT_CFG, detectCompletedAction(), FeedbackConfigState, PendingPromptContext, FEEDBACK_CATEGORY_LABELS (+3 more)

### Community 15 - "Diagram"
Cohesion: 0.15
Nodes (23): classify_shape(), clean_label(), Diagram, _discard_nonsemantic(), _edge_operators(), _endpoint_group(), _fail(), _finalize_degrees() (+15 more)

### Community 16 - "user-utils.ts"
Cohesion: 0.13
Nodes (21): recharts, CoursesPage(), UsersPage(), CourseEnrollmentModal(), CourseEnrollmentModalProps, CourseSummary, EnrolledItem, getCohortPrefix() (+13 more)

### Community 17 - "mermaid_extract.py"
Cohesion: 0.13
Nodes (16): analyze(), _configure_stdout_utf8(), digest(), Edge, _escape_markdown(), _escape_table(), _frontmatter_end(), _has_cycle() (+8 more)

### Community 18 - "generate_student_manual_docx_pdf.py"
Cohesion: 0.10
Nodes (9): build_presentation(), apply_thai_font(), generate_docx_manual(), set_cell_background(), set_cell_margins(), create_vertical_flowchart_docx(), add_body_p(), add_heading_styled() (+1 more)

### Community 19 - "notifications.ts"
Cohesion: 0.26
Nodes (22): GET(), POST(), POST(), POST(), PUT(), POST(), POST(), COURSE_ENROLLMENT_FORBIDDEN_MESSAGE (+14 more)

### Community 20 - "librarian-audit.mjs"
Cohesion: 0.32
Nodes (15): __dirname, __filename, getAgentsAndSkills(), getComponentsAndLibs(), getDocumentationFiles(), getPagesAndApis(), getPrismaModels(), getVersionStatus() (+7 more)

### Community 21 - "date-time-utils.ts"
Cohesion: 0.16
Nodes (20): GET(), GET(), dynamic, POST(), GET(), parseDateAsUtcMidnight(), POST(), GET() (+12 more)

### Community 22 - "self_check.py"
Cohesion: 0.14
Nodes (11): canonical_controller(), check_motion(), check_scripts(), check_svgs(), DiagramParser, is_approved_google_fonts_stylesheet(), main(), normalized_controller() (+3 more)

### Community 23 - "capture_real_system_steps.js"
Cohesion: 0.08
Nodes (17): fs, IMAGES_DIR, path, puppeteer, studentUser, fs, IMAGES_DIR, mockBorrowData (+9 more)

### Community 24 - "lucide-react"
Cohesion: 0.08
Nodes (35): AdminChatbotSandboxPage(), AdminConsolePage(), AdminSandboxHubPage(), AirConditioningPage(), formatPurposeWithNote(), THAI_DAY_NAMES, THAI_MONTHS, ActivityLogItem (+27 more)

### Community 25 - "version-bump.mjs"
Cohesion: 0.18
Nodes (9): arg, __dirname, __filename, parts, pkg, pkgPath, ROOT_DIR, today (+1 more)

### Community 26 - "package.json"
Cohesion: 0.12
Nodes (22): devDependencies, autoprefixer@^10.4.20, postcss@^8.5.2, @types/bcryptjs@^2.4.6, @types/node@^22.13.4, @types/pg@^8.23.1, @types/react@^19.0.10, @types/react-dom@^19.0.4 (+14 more)

### Community 27 - "dependencies"
Cohesion: 0.08
Nodes (24): dependencies, bcryptjs@^3.0.3, clsx@^2.1.1, docx@^9.8.1, html5-qrcode@^2.3.8, lucide-react@^0.475.0, next@^15.2.0, pg@^8.23.1 (+16 more)

### Community 28 - "scripts"
Cohesion: 0.09
Nodes (23): scripts, build, build:cf, dev, graphify, graphify:build, graphify:explain, graphify:god-nodes (+15 more)

### Community 29 - "ref_fs"
Cohesion: 0.12
Nodes (9): shadowBase64, diecutBase64, shadowBase64, diecutBase64, origBase64, shadowBase64, fs, path (+1 more)

### Community 30 - "broadcast/route.ts"
Cohesion: 0.29
Nodes (7): GET(), POST(), PUT(), POST(), GET(), dispatchBroadcastMessage(), processScheduledBroadcasts()

### Community 31 - "react"
Cohesion: 0.14
Nodes (10): react, AdminErrorProps, GlobalErrorProps, SessionActivityWatcher(), SessionTimeoutModal(), SessionTimeoutModalProps, CabinetQrPrintModalProps, PrintItem (+2 more)

### Community 32 - "app/page.tsx"
Cohesion: 0.13
Nodes (20): DashboardPage(), DAYS_OF_WEEK, getCleanLocalDateStr(), getRoomCategory(), ROOM_CATEGORIES, RoomCategory, RoomsPage(), SchedulePage() (+12 more)

### Community 33 - "practice/page.tsx"
Cohesion: 0.25
Nodes (14): html5-qrcode, GET(), PracticePage(), startCamera(), QrScannerModal(), startScanner(), QrScannerModalProps, createScanThrottle() (+6 more)

### Community 34 - "render_system_flow.js"
Cohesion: 0.09
Nodes (16): allFiles, getFiles(), results, fs, path, puppeteer, fs, path (+8 more)

### Community 35 - "auth-security.ts"
Cohesion: 0.16
Nodes (18): POST(), POST(), POST(), POST(), getAttemptTracker(), POST(), timingSafeCompareOtp(), extractUserFromRow() (+10 more)

### Community 36 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 37 - "notifications.ts"
Cohesion: 0.14
Nodes (18): BorrowActionError, PUT(), PUT(), ALL_APPROVAL_SCOPES, ApprovalScopeType, canUserApprove(), SCOPE_LABELS, getRenderedNotification() (+10 more)

### Community 38 - "room-schedules/route.ts"
Cohesion: 0.38
Nodes (5): CORS_HEADERS, dynamic, GET(), getSyncApiKey(), timingSafeKeyMatch()

### Community 39 - "BorrowCatalogBrowser.tsx"
Cohesion: 0.17
Nodes (20): AdminCatalogSandboxPage(), BorrowCatalogBrowser(), BorrowCatalogBrowserProps, BorrowRow, CATALOG_THEMES, CatalogAssetItem, CatalogColorThemeKey, CatalogItem (+12 more)

### Community 40 - "xlsx"
Cohesion: 0.14
Nodes (11): fs, path, prisma, { PrismaClient }, XLSX, fs, importUpdatedImages(), path (+3 more)

### Community 41 - "quick-action/route.ts"
Cohesion: 0.22
Nodes (15): executeQuickAction(), GET(), POST(), previewQuickActionConfirmation(), renderConfirmationHtml(), renderResponseHtml(), PUT(), combineSlotDateAndBangkokTime() (+7 more)

### Community 42 - "capture_realistic_overview.js"
Cohesion: 0.25
Nodes (6): fs, IMAGES_DIR, mockBorrowData, path, puppeteer, studentUser

### Community 43 - "lucide-react"
Cohesion: 0.26
Nodes (8): lucide-react, BorrowRequestContent(), BorrowRequestPage(), PracticeKitsPage(), PracticeBookingContent(), PracticeBookingPage(), StudentCourseNotice(), StudentCourseNoticeProps

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

### Community 56 - "room-bookings/route.ts"
Cohesion: 0.25
Nodes (9): BatchRoomBookingError, BatchSlotItem, ConflictedSlotItem, POST(), POST(), RoomBookingError, DATE_YYYY_MM_DD_REGEX, isTimeRangeOverlapping() (+1 more)

### Community 57 - "reorder_sim_and_fms.js"
Cohesion: 0.29
Nodes (5): fs, path, prisma, { PrismaClient }, XLSX

### Community 58 - "xlsx"
Cohesion: 0.07
Nodes (20): xlsx@^0.18.5, xlsx, fs, masterFiles, path, XLSX, fs, path (+12 more)

### Community 59 - "test/route.ts"
Cohesion: 0.33
Nodes (6): POST(), SYSTEM_INFO, PushNotificationAction, PushPayload, sendPushToMultipleUsers(), sendPushToUser()

### Community 60 - "@opennextjs/cloudflare"
Cohesion: 0.33
Nodes (3): nextConfig, @opennextjs/cloudflare@^1.20.12, @opennextjs/cloudflare

### Community 62 - "restore-backup.mjs"
Cohesion: 0.40
Nodes (5): convertDates(), dateFieldNames, prisma, restore(), tableOrder

### Community 63 - "enrollments/route.ts"
Cohesion: 0.54
Nodes (7): DELETE(), GET(), loadAuthenticatedActor(), normalizeStudentCodeKey(), POST(), extractCohortPrefix(), isStudentUser()

### Community 64 - "items/bulk/route.ts"
Cohesion: 0.70
Nodes (4): extractItemFromRow(), normalizeItemType(), parseSafeDate(), POST()

### Community 65 - "render_vertical_flowchart.js"
Cohesion: 0.29
Nodes (5): fs, MANUAL_IMG_DIR, path, puppeteer, TARGET_DIR

### Community 67 - "tailwindcss"
Cohesion: 0.50
Nodes (3): tailwindcss@^3.4.17, tailwindcss, config

### Community 68 - "reminders/route.ts"
Cohesion: 0.67
Nodes (5): GET(), POST(), processReminders(), timingSafeMatch(), verifyAuth()

## Knowledge Gaps
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `escapeHtml`, `formatUserName`, `session.ts`, `chatbot-engine.ts`, `invalidateCache`, `ebooks/page.tsx`, `logActivity`, `AppLayout.tsx`, `invalidateCache`, `academicTerm.ts`, `ac-memo-docx.ts`, `feedback/page.tsx`, `user-utils.ts`, `notifications.ts`, `date-time-utils.ts`, `lucide-react`, `package.json`, `dependencies`, `broadcast/route.ts`, `react`, `app/page.tsx`, `practice/page.tsx`, `auth-security.ts`, `notifications.ts`, `room-schedules/route.ts`, `BorrowCatalogBrowser.tsx`, `quick-action/route.ts`, `lucide-react`, `room-bookings/route.ts`, `test/route.ts`, `upload/route.ts`, `enrollments/route.ts`, `items/bulk/route.ts`, `reminders/route.ts`, `repack/route.ts`, `dispense/route.ts`?**
  _High betweenness centrality (0.248) - this node is a cross-community bridge._
- **Should `next` be split into smaller, more focused modules?**
  _Cohesion score 0.04251866277182733 - nodes in this community are weakly interconnected._
- **Why does `@prisma/client` connect `@prisma/client` to `next`, `xlsx`, `list_consumables.js`, `xlsx`, `generate_consumables_excel.js`, `import_consumables.js`, `generate_sample_excel_reports.js`, `simulate_full_system.js`, `update_riester_omron.js`, `seed.js`, `execute_brand_model_fix.js`, `reorder_sim_and_fms.js`, `package.json`, `dependencies`, `restore-backup.mjs`?**
  _High betweenness centrality (0.131) - this node is a cross-community bridge._
- **Should `escapeHtml` be split into smaller, more focused modules?**
  _Cohesion score 0.057738572574178026 - nodes in this community are weakly interconnected._
- **Why does `xlsx` connect `xlsx` to `escapeHtml`, `formatUserName`, `xlsx`, `academicTerm.ts`, `generate_consumables_excel.js`, `import_consumables.js`, `feedback/page.tsx`, `user-utils.ts`, `generate_sample_excel_reports.js`, `update_riester_omron.js`, `execute_brand_model_fix.js`, `lucide-react`, `reorder_sim_and_fms.js`, `package.json`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Should `formatUserName` be split into smaller, more focused modules?**
  _Cohesion score 0.11613876319758673 - nodes in this community are weakly interconnected._
- **Should `session.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07727272727272727 - nodes in this community are weakly interconnected._