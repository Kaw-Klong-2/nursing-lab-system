# Graph Report - LAB-system  (2026-11-28)

## Corpus Check
- 318 files · ~865,612 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 5, .example 1, .prisma 1)

## Summary
- 1709 nodes · 4945 edges · 87 communities (68 shown, 19 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `86821469`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- next
- escapeHtml
- formatUserName
- session.ts
- chatbot-engine.ts
- drawio_extract.py
- getCached
- lucide-react
- invalidateCache
- @prisma/client
- NotificationBell.tsx
- react
- academicTerm.ts
- ac-memo-docx.ts
- feedback/route.ts
- Diagram
- useAuth
- mermaid_extract.py
- generate_student_manual_docx_pdf.py
- notifications.ts
- librarian-audit.mjs
- date-time-utils.ts
- self_check.py
- capture_realistic_overview.js
- auth-context.tsx
- LoadingSpinner
- package.json
- dependencies
- scripts
- ref_fs
- broadcast/route.ts
- courses/page.tsx
- app/page.tsx
- getSessionFromRequest
- render_system_flow.js
- ebooks/page.tsx
- compilerOptions
- bcryptjs
- quick-action/route.ts
- BorrowCatalogBrowser.tsx
- xlsx
- capture_student_main_dashboard.js
- users/bulk/route.ts
- xlsx
- build_clean_system_flow.js
- build_student_manual_assets.js
- generate_consumables_excel.js
- import_consumables.js
- graphify.mjs
- capture_with_demo.js
- generate_sample_excel_reports.js
- simulate_full_system.js
- clsx@^2.1.1
- update_riester_omron.js
- seed.js
- execute_brand_model_fix.js
- sync_master_excel_images.js
- exceljs
- ref_path
- version-bump.mjs
- @opennextjs/cloudflare
- upload/route.ts
- restore-backup.mjs
- enrollments/route.ts
- items/bulk/route.ts
- borrow/[id]/route.ts
- _logical_statements
- tailwindcss
- update_sam_images.js
- react-dom
- resend
- feedback/page.tsx
- check_drive_meta.js
- google-auth-library
- @types/qrcode@^1.5.6
- pos/page.tsx
- build_student_ui_mockups.js
- render_vertical_flowchart.js
- room-schedules/route.ts
- engines
- postcss.config.mjs
- vercel.json
- audit_system.js
- cleanup_demo_data.js
- fix_fms_reorder.js
- prisma@^6.4.1

## God Nodes (most connected - your core abstractions)
1. `next` - 166 edges
2. `prisma` - 119 edges
3. `formatUserName()` - 105 edges
4. `useAuth()` - 103 edges
5. `invalidateCache()` - 98 edges
6. `react` - 96 edges
7. `lucide-react` - 91 edges
8. `LoadingSpinner()` - 76 edges
9. `formatTeacherName()` - 65 edges
10. `logActivity()` - 64 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `parseBangkokDateTime()`  [EXTRACTED]
  src/app/api/borrow/availability/route.ts → src/lib/date-time-utils.ts
- `POST()` --calls--> `invalidateCache()`  [EXTRACTED]
  src/app/api/storage/locations/[id]/assign/route.ts → src/lib/cache.ts
- `AuditLogsPage()` --calls--> `useAuth()`  [EXTRACTED]
  src/app/audit-logs/page.tsx → src/lib/auth-context.tsx
- `POST()` --calls--> `invalidateCache()`  [EXTRACTED]
  src/app/api/items/route.ts → src/lib/cache.ts
- `PUT()` --calls--> `invalidateCache()`  [EXTRACTED]
  src/app/api/practice/config/route.ts → src/lib/cache.ts

## Import Cycles
- 2-file cycle: `src/components/borrow/BorrowCatalogBrowser.tsx -> src/components/borrow/BorrowCheckoutDrawer.tsx -> src/components/borrow/BorrowCatalogBrowser.tsx`

## Communities (87 total, 19 thin omitted)

### Community 0 - "next"
Cohesion: 0.04
Nodes (16): next, GET(), GET(), dynamic, dynamic, dynamic, dynamic, dynamic (+8 more)

### Community 1 - "escapeHtml"
Cohesion: 0.07
Nodes (52): html5-qrcode, qrcode, GET(), InventoryPage(), PracticePage(), startCamera(), RepackPage(), ConsumableDetailModal() (+44 more)

### Community 2 - "formatUserName"
Cohesion: 0.11
Nodes (38): ApprovalsPage(), BorrowPage(), DispenseCenterPage(), QueueItem, RequisitionsPage(), SchedulePage(), BorrowSlipVerificationPage(), UniversalVerificationPage() (+30 more)

### Community 3 - "session.ts"
Cohesion: 0.07
Nodes (47): POST(), POST(), POST(), POST(), POST(), POST(), dynamic, GET() (+39 more)

### Community 4 - "chatbot-engine.ts"
Cohesion: 0.06
Nodes (72): ChatMessage, ChatMessage, assembleUserScopedContext(), UserScopedSystemContext, appendHistory(), checkIntentPermission(), detectIntent(), executeConfirmedAction() (+64 more)

### Community 5 - "drawio_extract.py"
Cohesion: 0.08
Nodes (32): _aligned(), analyze(), classify_shape(), clean_label(), _configure_stdout_utf8(), _decompress_limited(), digest(), Edge (+24 more)

### Community 6 - "getCached"
Cohesion: 0.20
Nodes (14): GET(), GET(), computeConsumableStock(), GET(), POST(), GET(), GET(), PUT() (+6 more)

### Community 7 - "lucide-react"
Cohesion: 0.19
Nodes (12): lucide-react, BorrowRequestContent(), BorrowRequestPage(), PracticeKitsPage(), PracticeBookingContent(), PracticeBookingPage(), StudentCourseNotice(), StudentCourseNoticeProps (+4 more)

### Community 8 - "invalidateCache"
Cohesion: 0.05
Nodes (53): calculateHours(), DELETE(), POST(), DELETE(), PUT(), POST(), POST(), PUT() (+45 more)

### Community 9 - "@prisma/client"
Cohesion: 0.04
Nodes (24): @prisma/client, prisma, prisma, { PrismaClient }, prisma, prisma, { PrismaClient }, prisma (+16 more)

### Community 10 - "NotificationBell.tsx"
Cohesion: 0.13
Nodes (34): POST(), getQuickApproveMeta(), NotificationBell(), NotificationItem, playNotificationChime(), resolveNotificationHref(), timeAgo(), PushNotificationManager() (+26 more)

### Community 11 - "react"
Cohesion: 0.14
Nodes (12): react, AdminChatbotSandboxPage(), AdminErrorProps, GlobalErrorProps, CabinetStoragePage(), ChatMarkdown(), ChatMarkdownProps, renderInlineTokens() (+4 more)

### Community 12 - "academicTerm.ts"
Cohesion: 0.14
Nodes (37): DELETE(), PUT(), GET(), POST(), GET(), AcademicTermItem, AcademicTermsSettingsPage(), CATEGORY_COLORS (+29 more)

### Community 13 - "ac-memo-docx.ts"
Cohesion: 0.10
Nodes (35): ALLOWED_URGENCY, cleanStr(), GET(), PUT(), sanitizeConfig(), AcMemoModal(), AcMemoModalProps, EditorTab (+27 more)

### Community 14 - "feedback/route.ts"
Cohesion: 0.31
Nodes (8): DEFAULT_CONFIG, PUT(), DELETE(), PUT(), GET(), POST(), clampStarRating(), verifyFeedbackAdmin()

### Community 15 - "Diagram"
Cohesion: 0.15
Nodes (23): classify_shape(), clean_label(), Diagram, _discard_nonsemantic(), _edge_operators(), _endpoint_group(), _fail(), _finalize_degrees() (+15 more)

### Community 16 - "useAuth"
Cohesion: 0.11
Nodes (34): LoginPage(), RoomStoragePage(), SessionActivityWatcher(), LabCopilotWidget(), ThemeToggle(), ThemeToggleProps, PostActionFeedbackModal(), AppLauncherModal() (+26 more)

### Community 17 - "mermaid_extract.py"
Cohesion: 0.13
Nodes (16): analyze(), _configure_stdout_utf8(), digest(), Edge, _escape_markdown(), _escape_table(), _frontmatter_end(), _has_cycle() (+8 more)

### Community 18 - "generate_student_manual_docx_pdf.py"
Cohesion: 0.10
Nodes (9): build_presentation(), apply_thai_font(), generate_docx_manual(), set_cell_background(), set_cell_margins(), create_vertical_flowchart_docx(), add_body_p(), add_heading_styled() (+1 more)

### Community 19 - "notifications.ts"
Cohesion: 0.17
Nodes (34): POST(), POST(), POST(), POST(), PUT(), POST(), POST(), POST() (+26 more)

### Community 20 - "librarian-audit.mjs"
Cohesion: 0.32
Nodes (15): __dirname, __filename, getAgentsAndSkills(), getComponentsAndLibs(), getDocumentationFiles(), getPagesAndApis(), getPrismaModels(), getVersionStatus() (+7 more)

### Community 21 - "date-time-utils.ts"
Cohesion: 0.09
Nodes (36): GET(), GET(), GET(), POST(), GET(), POST(), processReminders(), timingSafeMatch() (+28 more)

### Community 22 - "self_check.py"
Cohesion: 0.14
Nodes (11): canonical_controller(), check_motion(), check_scripts(), check_svgs(), DiagramParser, is_approved_google_fonts_stylesheet(), main(), normalized_controller() (+3 more)

### Community 23 - "capture_realistic_overview.js"
Cohesion: 0.08
Nodes (17): fs, IMAGES_DIR, path, puppeteer, studentUser, fs, IMAGES_DIR, mockBorrowData (+9 more)

### Community 24 - "auth-context.tsx"
Cohesion: 0.19
Nodes (12): SessionTimeoutModal(), SessionTimeoutModalProps, AuthContext, AuthContextType, AuthProvider(), initializeAuth(), checkSessionActive(), IDLE_TIMEOUT_MS (+4 more)

### Community 25 - "LoadingSpinner"
Cohesion: 0.09
Nodes (25): recharts, AdminConsolePage(), AdminCatalogSandboxPage(), AdminSandboxHubPage(), AirConditioningPage(), formatPurposeWithNote(), THAI_DAY_NAMES, THAI_MONTHS (+17 more)

### Community 26 - "package.json"
Cohesion: 0.12
Nodes (22): devDependencies, autoprefixer@^10.4.20, postcss@^8.5.2, @types/bcryptjs@^2.4.6, @types/node@^22.13.4, @types/pg@^8.23.1, @types/react@^19.0.10, @types/react-dom@^19.0.4 (+14 more)

### Community 27 - "dependencies"
Cohesion: 0.09
Nodes (23): dependencies, docx@^9.8.1, html5-qrcode@^2.3.8, jspdf@^4.2.1, lucide-react@^0.475.0, next@^15.2.0, pg@^8.23.1, @prisma/adapter-pg@^6.19.3 (+15 more)

### Community 28 - "scripts"
Cohesion: 0.09
Nodes (23): scripts, build, build:cf, dev, graphify, graphify:build, graphify:explain, graphify:god-nodes (+15 more)

### Community 29 - "ref_fs"
Cohesion: 0.10
Nodes (11): shadowBase64, diecutBase64, shadowBase64, diecutBase64, origBase64, shadowBase64, fs, path (+3 more)

### Community 30 - "broadcast/route.ts"
Cohesion: 0.36
Nodes (6): GET(), POST(), PUT(), GET(), dispatchBroadcastMessage(), processScheduledBroadcasts()

### Community 31 - "courses/page.tsx"
Cohesion: 0.27
Nodes (9): CoursesPage(), CourseEnrollmentModal(), CourseEnrollmentModalProps, CourseSummary, EnrolledItem, getCohortPrefix(), parseStudentIdsFromText(), SystemStudent (+1 more)

### Community 32 - "app/page.tsx"
Cohesion: 0.14
Nodes (19): DashboardPage(), DAYS_OF_WEEK, getCleanLocalDateStr(), getRoomCategory(), ROOM_CATEGORIES, RoomCategory, RoomsPage(), CalendarHoverCard() (+11 more)

### Community 33 - "getSessionFromRequest"
Cohesion: 0.16
Nodes (15): executeQuickAction(), GET(), POST(), POST(), GET(), PUT(), POST(), ReturnValidationError (+7 more)

### Community 34 - "render_system_flow.js"
Cohesion: 0.10
Nodes (13): fs, path, puppeteer, fs, path, puppeteer, fs, HTML_OUTPUT_PATH (+5 more)

### Community 35 - "ebooks/page.tsx"
Cohesion: 0.11
Nodes (22): AdminEBooksSandboxPage(), hydrateBooks(), COVER_CATEGORY_LABELS, DEFAULT_EBOOKS, EBookItem, EBookPage, extractGoogleDriveFileId(), idbLoadEBooks() (+14 more)

### Community 36 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 38 - "quick-action/route.ts"
Cohesion: 0.29
Nodes (10): GET(), POST(), previewQuickActionConfirmation(), renderConfirmationHtml(), renderResponseHtml(), generateSignedApprovalToken(), getApprovalSecret(), readEnvVar() (+2 more)

### Community 39 - "BorrowCatalogBrowser.tsx"
Cohesion: 0.19
Nodes (19): BorrowCatalogBrowser(), BorrowCatalogBrowserProps, BorrowRow, CATALOG_THEMES, CatalogAssetItem, CatalogColorThemeKey, CatalogItem, getCustomBadgeMeta() (+11 more)

### Community 40 - "xlsx"
Cohesion: 0.14
Nodes (11): fs, path, prisma, { PrismaClient }, XLSX, fs, importUpdatedImages(), path (+3 more)

### Community 41 - "capture_student_main_dashboard.js"
Cohesion: 0.25
Nodes (6): fs, IMAGES_DIR, mockBorrowData, path, puppeteer, studentUser

### Community 42 - "users/bulk/route.ts"
Cohesion: 0.83
Nodes (3): extractUserFromRow(), normalizeRole(), POST()

### Community 43 - "xlsx"
Cohesion: 0.12
Nodes (18): xlsx, classifyAcSession(), dynamic, GET(), getMonthDateRange(), revalidate, ActivityLogItem, AuditLogsPage() (+10 more)

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

### Community 58 - "ref_path"
Cohesion: 0.10
Nodes (14): allFiles, getFiles(), results, fs, path, wranglerPath, fs, masterFiles (+6 more)

### Community 59 - "version-bump.mjs"
Cohesion: 0.18
Nodes (9): arg, __dirname, __filename, parts, pkg, pkgPath, ROOT_DIR, today (+1 more)

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

### Community 65 - "borrow/[id]/route.ts"
Cohesion: 0.34
Nodes (7): BorrowActionError, PUT(), PUT(), allocateAndCheckoutEquipmentItem(), DispenseActionError, dispenseConsumableItemFifo(), generateUniqueRequestNumber()

### Community 67 - "tailwindcss"
Cohesion: 0.50
Nodes (3): tailwindcss@^3.4.17, tailwindcss, config

### Community 71 - "feedback/page.tsx"
Cohesion: 0.12
Nodes (21): AdminFeedbackPage(), FeedbackRecord, FeedbackSummary, ALLOWED_VIEWER_MUTATION_PATHS, resolveRequestMethod(), resolveRequestUrl(), ViewerModeGuard(), DEFAULT_CFG (+13 more)

### Community 75 - "pos/page.tsx"
Cohesion: 0.32
Nodes (4): CartItem, PosPage(), PosReceiptModal(), PosReceiptModalProps

### Community 77 - "build_student_ui_mockups.js"
Cohesion: 0.29
Nodes (5): fs, IMAGES_DIR, mockups, path, puppeteer

### Community 78 - "render_vertical_flowchart.js"
Cohesion: 0.29
Nodes (5): fs, MANUAL_IMG_DIR, path, puppeteer, TARGET_DIR

### Community 80 - "room-schedules/route.ts"
Cohesion: 0.38
Nodes (5): CORS_HEADERS, dynamic, GET(), getSyncApiKey(), timingSafeKeyMatch()

## Knowledge Gaps
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `escapeHtml`, `formatUserName`, `session.ts`, `getCached`, `lucide-react`, `invalidateCache`, `NotificationBell.tsx`, `react`, `academicTerm.ts`, `ac-memo-docx.ts`, `feedback/route.ts`, `useAuth`, `notifications.ts`, `date-time-utils.ts`, `auth-context.tsx`, `LoadingSpinner`, `package.json`, `dependencies`, `broadcast/route.ts`, `courses/page.tsx`, `app/page.tsx`, `getSessionFromRequest`, `ebooks/page.tsx`, `users/bulk/route.ts`, `xlsx`, `upload/route.ts`, `enrollments/route.ts`, `items/bulk/route.ts`, `borrow/[id]/route.ts`, `feedback/page.tsx`, `pos/page.tsx`, `room-schedules/route.ts`?**
  _High betweenness centrality (0.201) - this node is a cross-community bridge._
- **Should `next` be split into smaller, more focused modules?**
  _Cohesion score 0.0392156862745098 - nodes in this community are weakly interconnected._
- **Why does `@prisma/client` connect `@prisma/client` to `next`, `package.json`, `dependencies`, `ref_fs`, `xlsx`, `generate_consumables_excel.js`, `import_consumables.js`, `generate_sample_excel_reports.js`, `simulate_full_system.js`, `update_riester_omron.js`, `seed.js`, `execute_brand_model_fix.js`, `sync_master_excel_images.js`, `ref_path`, `restore-backup.mjs`, `borrow/[id]/route.ts`, `update_sam_images.js`, `audit_system.js`, `cleanup_demo_data.js`, `fix_fms_reorder.js`?**
  _High betweenness centrality (0.129) - this node is a cross-community bridge._
- **Should `escapeHtml` be split into smaller, more focused modules?**
  _Cohesion score 0.07074504442925496 - nodes in this community are weakly interconnected._
- **Why does `xlsx` connect `xlsx` to `escapeHtml`, `ref_path`, `feedback/page.tsx`, `xlsx`, `@prisma/client`, `lucide-react`, `academicTerm.ts`, `generate_consumables_excel.js`, `import_consumables.js`, `generate_sample_excel_reports.js`, `update_riester_omron.js`, `execute_brand_model_fix.js`, `sync_master_excel_images.js`, `LoadingSpinner`, `package.json`, `dependencies`, `ref_fs`, `courses/page.tsx`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Should `formatUserName` be split into smaller, more focused modules?**
  _Cohesion score 0.11233766233766233 - nodes in this community are weakly interconnected._
- **Should `session.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06875 - nodes in this community are weakly interconnected._