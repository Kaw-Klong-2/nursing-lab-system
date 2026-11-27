# Graph Report - LAB-system  (2026-11-27)

## Corpus Check
- 314 files · ~855,703 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 5, .example 1, .prisma 1)

## Summary
- 1672 nodes · 4804 edges · 81 communities (65 shown, 16 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8ed920f6`
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
- react
- academicTerm.ts
- ac-memo-docx.ts
- feedback/page.tsx
- Diagram
- Sidebar.tsx
- mermaid_extract.py
- generate_student_manual_docx_pdf.py
- notifications.ts
- librarian-audit.mjs
- date-time-utils.ts
- self_check.py
- build_student_ui_mockups.js
- lucide-react
- executive/stats/route.ts
- package.json
- dependencies
- scripts
- ref_fs
- broadcast/route.ts
- AppLayout.tsx
- app/page.tsx
- practice/page.tsx
- render_system_flow.js
- ebooks/page.tsx
- compilerOptions
- borrow/[id]/route.ts
- feedback/route.ts
- BorrowCatalogBrowser.tsx
- xlsx
- capture_student_main_dashboard.js
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
- capture_real_system_steps.js
- update_riester_omron.js
- seed.js
- execute_brand_model_fix.js
- sync_master_excel_images.js
- reorder_sim_and_fms.js
- xlsx
- test/route.ts
- @opennextjs/cloudflare
- upload/route.ts
- restore-backup.mjs
- enrollments/route.ts
- items/bulk/route.ts
- audit_all_missing_images.js
- _logical_statements
- tailwindcss
- update_sam_images.js
- clsx@^2.1.1
- resend
- check_drive_meta.js
- google-auth-library
- jspdf
- @prisma/adapter-pg
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
- `GET()` --calls--> `parseBangkokDateTime()`  [EXTRACTED]
  src/app/api/borrow/availability/route.ts → src/lib/date-time-utils.ts
- `DELETE()` --calls--> `invalidateCache()`  [EXTRACTED]
  src/app/api/room-bookings/[id]/route.ts → src/lib/cache.ts
- `POST()` --calls--> `invalidateCache()`  [EXTRACTED]
  src/app/api/storage/locations/[id]/assign/route.ts → src/lib/cache.ts
- `ChatMessage` --references--> `ConfirmationSummaryCard`  [EXTRACTED]
  src/app/admin/chatbot/page.tsx → src/types/chatbot.ts
- `AdminFeedbackPage()` --calls--> `formatUserName()`  [EXTRACTED]
  src/app/admin/feedback/page.tsx → src/lib/user-utils.ts

## Import Cycles
- 2-file cycle: `src/components/borrow/BorrowCatalogBrowser.tsx -> src/components/borrow/BorrowCheckoutDrawer.tsx -> src/components/borrow/BorrowCatalogBrowser.tsx`

## Communities (81 total, 16 thin omitted)

### Community 0 - "next"
Cohesion: 0.04
Nodes (14): next, GET(), POST(), dynamic, dynamic, dynamic, dynamic, dynamic (+6 more)

### Community 1 - "escapeHtml"
Cohesion: 0.12
Nodes (31): qrcode, InventoryPage(), RepackPage(), PosReceiptModalProps, AssetQrModal(), AssetQrModalProps, BatchAssetStickerModal(), BatchAssetStickerModalProps (+23 more)

### Community 2 - "formatUserName"
Cohesion: 0.11
Nodes (38): ApprovalsPage(), BorrowPage(), DispenseCenterPage(), QueueItem, RequisitionsPage(), SchedulePage(), BorrowSlipVerificationPage(), UniversalVerificationPage() (+30 more)

### Community 3 - "session.ts"
Cohesion: 0.05
Nodes (68): executeQuickAction(), GET(), POST(), previewQuickActionConfirmation(), renderConfirmationHtml(), renderResponseHtml(), GET(), POST() (+60 more)

### Community 4 - "chatbot-engine.ts"
Cohesion: 0.07
Nodes (52): ChatMessage, POST(), ChatMessage, assembleUserScopedContext(), UserScopedSystemContext, checkIntentPermission(), detectIntent(), getRoleQuickReplies() (+44 more)

### Community 5 - "drawio_extract.py"
Cohesion: 0.08
Nodes (32): _aligned(), analyze(), classify_shape(), clean_label(), _configure_stdout_utf8(), _decompress_limited(), digest(), Edge (+24 more)

### Community 6 - "invalidateCache"
Cohesion: 0.07
Nodes (41): POST(), POST(), PUT(), GET(), GET(), POST(), DELETE(), PATCH() (+33 more)

### Community 7 - "ebooks/page.tsx"
Cohesion: 0.19
Nodes (9): dynamic, metadata, RootLayout(), viewport, PwaInstallPrompt(), PwaRegister(), APP_BUILD_DATE, APP_SUITE_NAME (+1 more)

### Community 8 - "logActivity"
Cohesion: 0.07
Nodes (29): calculateHours(), DELETE(), POST(), DELETE(), PUT(), GET(), POST(), DELETE() (+21 more)

### Community 9 - "@prisma/client"
Cohesion: 0.04
Nodes (24): @prisma/client@^6.4.1, @prisma/client, prisma, prisma, { PrismaClient }, prisma, { PrismaClient }, prisma (+16 more)

### Community 10 - "NotificationBell.tsx"
Cohesion: 0.23
Nodes (24): getQuickApproveMeta(), NotificationBell(), NotificationItem, playNotificationChime(), resolveNotificationHref(), timeAgo(), PushNotificationManager(), safeGetItem() (+16 more)

### Community 11 - "react"
Cohesion: 0.14
Nodes (19): react, PublicAssetPage(), PublicConsumablePage(), CabinetStoragePage(), RoomStoragePage(), ThemeToggle(), ThemeToggleProps, ConsumableDetailModal() (+11 more)

### Community 12 - "academicTerm.ts"
Cohesion: 0.11
Nodes (44): DELETE(), PUT(), GET(), POST(), GET(), AcademicTermItem, AcademicTermsSettingsPage(), CourseEnrollmentModal() (+36 more)

### Community 13 - "ac-memo-docx.ts"
Cohesion: 0.10
Nodes (35): ALLOWED_URGENCY, cleanStr(), GET(), PUT(), sanitizeConfig(), AcMemoModal(), AcMemoModalProps, EditorTab (+27 more)

### Community 14 - "feedback/page.tsx"
Cohesion: 0.12
Nodes (21): FeedbackRecord, FeedbackSummary, ALLOWED_VIEWER_MUTATION_PATHS, resolveRequestMethod(), resolveRequestUrl(), ViewerModeGuard(), DEFAULT_CFG, detectCompletedAction() (+13 more)

### Community 15 - "Diagram"
Cohesion: 0.15
Nodes (23): classify_shape(), clean_label(), Diagram, _discard_nonsemantic(), _edge_operators(), _endpoint_group(), _fail(), _finalize_degrees() (+15 more)

### Community 16 - "Sidebar.tsx"
Cohesion: 0.20
Nodes (17): AppLauncherModal(), AppLauncherModalProps, Sidebar(), SidebarProps, SubAppBreadcrumbBar(), UserRole, getModuleTheme(), MODULE_THEMES (+9 more)

### Community 17 - "mermaid_extract.py"
Cohesion: 0.13
Nodes (16): analyze(), _configure_stdout_utf8(), digest(), Edge, _escape_markdown(), _escape_table(), _frontmatter_end(), _has_cycle() (+8 more)

### Community 18 - "generate_student_manual_docx_pdf.py"
Cohesion: 0.10
Nodes (9): build_presentation(), apply_thai_font(), generate_docx_manual(), set_cell_background(), set_cell_margins(), create_vertical_flowchart_docx(), add_body_p(), add_heading_styled() (+1 more)

### Community 19 - "notifications.ts"
Cohesion: 0.18
Nodes (31): POST(), POST(), POST(), POST(), PUT(), POST(), PUT(), POST() (+23 more)

### Community 20 - "librarian-audit.mjs"
Cohesion: 0.14
Nodes (24): __dirname, __filename, getAgentsAndSkills(), getComponentsAndLibs(), getDocumentationFiles(), getPagesAndApis(), getPrismaModels(), getVersionStatus() (+16 more)

### Community 21 - "date-time-utils.ts"
Cohesion: 0.08
Nodes (38): GET(), GET(), POST(), processReminders(), timingSafeMatch(), verifyAuth(), GET(), CORS_HEADERS (+30 more)

### Community 22 - "self_check.py"
Cohesion: 0.14
Nodes (11): canonical_controller(), check_motion(), check_scripts(), check_svgs(), DiagramParser, is_approved_google_fonts_stylesheet(), main(), normalized_controller() (+3 more)

### Community 23 - "build_student_ui_mockups.js"
Cohesion: 0.09
Nodes (16): fs, IMAGES_DIR, mockups, path, puppeteer, fs, generateVisualSteps(), IMAGES_DIR (+8 more)

### Community 24 - "lucide-react"
Cohesion: 0.07
Nodes (42): recharts, AdminChatbotSandboxPage(), AdminFeedbackPage(), AdminConsolePage(), AdminSandboxHubPage(), AirConditioningPage(), formatPurposeWithNote(), THAI_DAY_NAMES (+34 more)

### Community 25 - "executive/stats/route.ts"
Cohesion: 0.14
Nodes (15): classifyAcSession(), dynamic, GET(), getMonthDateRange(), revalidate, AssignItemsModal(), AssignItemsModalProps, CabinetFormModal() (+7 more)

### Community 26 - "package.json"
Cohesion: 0.12
Nodes (22): devDependencies, autoprefixer@^10.4.20, postcss@^8.5.2, @types/bcryptjs@^2.4.6, @types/node@^22.13.4, @types/pg@^8.23.1, @types/react@^19.0.10, @types/react-dom@^19.0.4 (+14 more)

### Community 27 - "dependencies"
Cohesion: 0.08
Nodes (24): dependencies, bcryptjs@^3.0.3, docx@^9.8.1, exceljs@^4.4.0, html5-qrcode@^2.3.8, lucide-react@^0.475.0, next@^15.2.0, pg@^8.23.1 (+16 more)

### Community 28 - "scripts"
Cohesion: 0.09
Nodes (23): scripts, build, build:cf, dev, graphify, graphify:build, graphify:explain, graphify:god-nodes (+15 more)

### Community 29 - "ref_fs"
Cohesion: 0.12
Nodes (9): shadowBase64, diecutBase64, shadowBase64, diecutBase64, origBase64, shadowBase64, fs, path (+1 more)

### Community 30 - "broadcast/route.ts"
Cohesion: 0.36
Nodes (6): GET(), POST(), PUT(), GET(), dispatchBroadcastMessage(), processScheduledBroadcasts()

### Community 31 - "AppLayout.tsx"
Cohesion: 0.17
Nodes (15): SessionActivityWatcher(), SessionTimeoutModal(), SessionTimeoutModalProps, LabCopilotWidget(), AppLayout(), AppLayoutContent(), Navbar(), NavbarProps (+7 more)

### Community 32 - "app/page.tsx"
Cohesion: 0.14
Nodes (19): DashboardPage(), DAYS_OF_WEEK, getCleanLocalDateStr(), getRoomCategory(), ROOM_CATEGORIES, RoomCategory, RoomsPage(), CalendarHoverCard() (+11 more)

### Community 33 - "practice/page.tsx"
Cohesion: 0.25
Nodes (14): html5-qrcode, GET(), PracticePage(), startCamera(), QrScannerModal(), startScanner(), QrScannerModalProps, createScanThrottle() (+6 more)

### Community 34 - "render_system_flow.js"
Cohesion: 0.09
Nodes (16): allFiles, getFiles(), results, fs, path, puppeteer, fs, path (+8 more)

### Community 35 - "ebooks/page.tsx"
Cohesion: 0.23
Nodes (13): AdminEBooksSandboxPage(), hydrateBooks(), COVER_CATEGORY_LABELS, DEFAULT_EBOOKS, EBookItem, EBookPage, extractGoogleDriveFileId(), idbLoadEBooks() (+5 more)

### Community 36 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 37 - "borrow/[id]/route.ts"
Cohesion: 0.15
Nodes (11): BorrowActionError, PUT(), PUT(), POST(), DELETE(), PUT(), ALL_APPROVAL_SCOPES, ApprovalScopeType (+3 more)

### Community 38 - "feedback/route.ts"
Cohesion: 0.31
Nodes (8): DEFAULT_CONFIG, PUT(), DELETE(), PUT(), GET(), POST(), clampStarRating(), verifyFeedbackAdmin()

### Community 39 - "BorrowCatalogBrowser.tsx"
Cohesion: 0.17
Nodes (20): AdminCatalogSandboxPage(), BorrowCatalogBrowser(), BorrowCatalogBrowserProps, BorrowRow, CATALOG_THEMES, CatalogAssetItem, CatalogColorThemeKey, CatalogItem (+12 more)

### Community 40 - "xlsx"
Cohesion: 0.14
Nodes (11): fs, path, prisma, { PrismaClient }, XLSX, fs, importUpdatedImages(), path (+3 more)

### Community 41 - "capture_student_main_dashboard.js"
Cohesion: 0.25
Nodes (6): fs, IMAGES_DIR, mockBorrowData, path, puppeteer, studentUser

### Community 42 - "capture_realistic_overview.js"
Cohesion: 0.25
Nodes (6): fs, IMAGES_DIR, mockBorrowData, path, puppeteer, studentUser

### Community 43 - "lucide-react"
Cohesion: 0.15
Nodes (11): lucide-react, AdminErrorProps, BorrowRequestContent(), BorrowRequestPage(), GlobalErrorProps, PracticeKitsPage(), PracticeBookingContent(), PracticeBookingPage() (+3 more)

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

### Community 52 - "capture_real_system_steps.js"
Cohesion: 0.29
Nodes (5): fs, IMAGES_DIR, path, puppeteer, studentUser

### Community 53 - "update_riester_omron.js"
Cohesion: 0.25
Nodes (6): fs, main(), path, prisma, { PrismaClient }, xlsx

### Community 54 - "seed.js"
Cohesion: 0.29
Nodes (5): cleanAndSeed(), fs, path, prisma, { PrismaClient }

### Community 55 - "execute_brand_model_fix.js"
Cohesion: 0.29
Nodes (5): fs, path, prisma, { PrismaClient }, xlsx

### Community 56 - "sync_master_excel_images.js"
Cohesion: 0.29
Nodes (5): fs, path, prisma, { PrismaClient }, XLSX

### Community 57 - "reorder_sim_and_fms.js"
Cohesion: 0.29
Nodes (5): fs, path, prisma, { PrismaClient }, XLSX

### Community 58 - "xlsx"
Cohesion: 0.09
Nodes (15): xlsx, fs, masterFiles, path, XLSX, fs, path, prisma (+7 more)

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
Cohesion: 0.32
Nodes (10): DELETE(), GET(), loadAuthenticatedActor(), normalizeStudentCodeKey(), POST(), COURSE_ENROLLMENT_FORBIDDEN_MESSAGE, extractCohortPrefix(), isStudentUser() (+2 more)

### Community 64 - "items/bulk/route.ts"
Cohesion: 0.70
Nodes (4): extractItemFromRow(), normalizeItemType(), parseSafeDate(), POST()

### Community 67 - "tailwindcss"
Cohesion: 0.50
Nodes (3): tailwindcss@^3.4.17, tailwindcss, config

## Knowledge Gaps
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `escapeHtml`, `formatUserName`, `session.ts`, `chatbot-engine.ts`, `invalidateCache`, `ebooks/page.tsx`, `logActivity`, `NotificationBell.tsx`, `react`, `academicTerm.ts`, `ac-memo-docx.ts`, `feedback/page.tsx`, `Sidebar.tsx`, `notifications.ts`, `date-time-utils.ts`, `lucide-react`, `executive/stats/route.ts`, `package.json`, `dependencies`, `broadcast/route.ts`, `AppLayout.tsx`, `app/page.tsx`, `practice/page.tsx`, `ebooks/page.tsx`, `borrow/[id]/route.ts`, `feedback/route.ts`, `BorrowCatalogBrowser.tsx`, `lucide-react`, `xlsx`, `test/route.ts`, `upload/route.ts`, `enrollments/route.ts`, `items/bulk/route.ts`?**
  _High betweenness centrality (0.238) - this node is a cross-community bridge._
- **Should `next` be split into smaller, more focused modules?**
  _Cohesion score 0.04004817825956037 - nodes in this community are weakly interconnected._
- **Why does `@prisma/client` connect `@prisma/client` to `next`, `audit_all_missing_images.js`, `xlsx`, `update_sam_images.js`, `xlsx`, `generate_consumables_excel.js`, `import_consumables.js`, `generate_sample_excel_reports.js`, `simulate_full_system.js`, `update_riester_omron.js`, `seed.js`, `execute_brand_model_fix.js`, `sync_master_excel_images.js`, `reorder_sim_and_fms.js`, `package.json`, `restore-backup.mjs`?**
  _High betweenness centrality (0.130) - this node is a cross-community bridge._
- **Should `escapeHtml` be split into smaller, more focused modules?**
  _Cohesion score 0.12145390070921985 - nodes in this community are weakly interconnected._
- **Why does `xlsx` connect `xlsx` to `escapeHtml`, `formatUserName`, `xlsx`, `academicTerm.ts`, `generate_consumables_excel.js`, `import_consumables.js`, `feedback/page.tsx`, `generate_sample_excel_reports.js`, `executive/stats/route.ts`, `update_riester_omron.js`, `execute_brand_model_fix.js`, `sync_master_excel_images.js`, `reorder_sim_and_fms.js`, `package.json`, `dependencies`, `lucide-react`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Should `formatUserName` be split into smaller, more focused modules?**
  _Cohesion score 0.11466165413533834 - nodes in this community are weakly interconnected._
- **Should `session.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.050724637681159424 - nodes in this community are weakly interconnected._