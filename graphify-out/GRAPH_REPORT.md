# Graph Report - LAB-system  (2026-11-28)

## Corpus Check
- 325 files · ~877,550 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 5, .example 1, .prisma 1)

## Summary
- 1755 nodes · 5127 edges · 89 communities (72 shown, 17 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9f42bfec`
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
- invalidateCache
- logActivity
- @prisma/client
- AppLayout.tsx
- room-bookings/route.ts
- academicTerm.ts
- ac-memo-docx.ts
- chatbot/route.ts
- Diagram
- test/route.ts
- mermaid_extract.py
- generate_student_manual_docx_pdf.py
- createNotification
- librarian-audit.mjs
- date-time-utils.ts
- self_check.py
- build_student_ui_mockups.js
- auth-context.tsx
- LoadingSpinner
- package.json
- dependencies
- scripts
- ref_fs
- notifications.ts
- chatbot.ts
- app/page.tsx
- quick-action/route.ts
- render_system_flow.js
- ebooks/page.tsx
- compilerOptions
- chatbot-gemini.ts
- borrow/page.tsx
- BorrowCatalogBrowser.tsx
- xlsx
- build_student_ui_mockups.js
- requireActiveActor
- react
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
- request-email-change/route.ts
- ref_path
- version-bump.mjs
- @opennextjs/cloudflare
- upload/route.ts
- restore-backup.mjs
- enrollments/route.ts
- items/bulk/route.ts
- getSessionFromRequest
- _logical_statements
- tailwindcss
- reminders/route.ts
- chatbot-admin-actions.ts
- repack/route.ts
- feedback/page.tsx
- check_drive_meta.js
- list_consumables.js
- capture_realistic_overview.js
- bcryptjs
- reorder_sim_and_fms.js
- sync_master_excel_from_db.js
- ChatMarkdown.tsx
- exceljs
- google-auth-library
- react-dom
- postcss.config.mjs
- resend
- vercel.json
- @types/qrcode@^1.5.6
- engines
- prisma@^6.4.1

## God Nodes (most connected - your core abstractions)
1. `next` - 167 edges
2. `prisma` - 123 edges
3. `formatUserName()` - 105 edges
4. `useAuth()` - 103 edges
5. `invalidateCache()` - 100 edges
6. `react` - 98 edges
7. `lucide-react` - 94 edges
8. `LoadingSpinner()` - 75 edges
9. `logActivity()` - 68 edges
10. `formatTeacherName()` - 65 edges

## Surprising Connections (you probably didn't know these)
- `AuditLogsPage()` --calls--> `useAuth()`  [EXTRACTED]
  src/app/audit-logs/page.tsx → src/lib/auth-context.tsx
- `POST()` --calls--> `invalidateCache()`  [EXTRACTED]
  src/app/api/items/route.ts → src/lib/cache.ts
- `POST()` --calls--> `invalidateCache()`  [EXTRACTED]
  src/app/api/rooms/route.ts → src/lib/cache.ts
- `AdminChatbotCommandCenterPage()` --calls--> `ChatMarkdown()`  [EXTRACTED]
  src/app/admin/chatbot/page.tsx → src/components/chatbot/ChatMarkdown.tsx
- `AdminChatbotCommandCenterPage()` --calls--> `LoadingSpinner()`  [EXTRACTED]
  src/app/admin/chatbot/page.tsx → src/components/common/LoadingSpinner.tsx

## Import Cycles
- 2-file cycle: `src/components/borrow/BorrowCatalogBrowser.tsx -> src/components/borrow/BorrowCheckoutDrawer.tsx -> src/components/borrow/BorrowCatalogBrowser.tsx`

## Communities (89 total, 17 thin omitted)

### Community 0 - "next"
Cohesion: 0.04
Nodes (15): next, GET(), dynamic, dynamic, dynamic, dynamic, dynamic, POST() (+7 more)

### Community 1 - "escapeHtml"
Cohesion: 0.07
Nodes (46): qrcode, classifyAcSession(), dynamic, GET(), getMonthDateRange(), revalidate, InventoryPage(), RepackPage() (+38 more)

### Community 2 - "formatUserName"
Cohesion: 0.15
Nodes (29): ApprovalsPage(), CoursesPage(), PracticeKitsPage(), RequisitionsPage(), UniversalVerificationPage(), StudentCourseNotice(), StudentCourseNoticeProps, StudentDashboard() (+21 more)

### Community 3 - "session.ts"
Cohesion: 0.08
Nodes (39): POST(), POST(), POST(), POST(), dynamic, GET(), decodePortalTokenPayload(), POST() (+31 more)

### Community 4 - "chatbot-engine.ts"
Cohesion: 0.13
Nodes (34): assembleUserScopedContext(), appendHistory(), checkIntentPermission(), detectIntent(), executeConfirmedAction(), getRoleQuickReplies(), handleAcLogFlow(), handleApprovalFlow() (+26 more)

### Community 5 - "drawio_extract.py"
Cohesion: 0.08
Nodes (32): _aligned(), analyze(), classify_shape(), clean_label(), _configure_stdout_utf8(), _decompress_limited(), digest(), Edge (+24 more)

### Community 6 - "getCached"
Cohesion: 0.15
Nodes (19): POST(), GET(), GET(), GET(), GET(), computeConsumableStock(), GET(), POST() (+11 more)

### Community 7 - "invalidateCache"
Cohesion: 0.09
Nodes (21): POST(), PUT(), POST(), DELETE(), PATCH(), PUT(), POST(), KitDispenseError (+13 more)

### Community 8 - "logActivity"
Cohesion: 0.08
Nodes (30): calculateHours(), DELETE(), POST(), DELETE(), PUT(), POST(), DEFAULT_CONFIG, PUT() (+22 more)

### Community 9 - "@prisma/client"
Cohesion: 0.04
Nodes (25): @prisma/client, prisma, prisma, { PrismaClient }, prisma, { PrismaClient }, prisma, { PrismaClient } (+17 more)

### Community 10 - "AppLayout.tsx"
Cohesion: 0.05
Nodes (76): html5-qrcode, GET(), dynamic, metadata, RootLayout(), viewport, PracticePage(), startCamera() (+68 more)

### Community 11 - "room-bookings/route.ts"
Cohesion: 0.25
Nodes (9): BatchRoomBookingError, BatchSlotItem, ConflictedSlotItem, POST(), POST(), RoomBookingError, DATE_YYYY_MM_DD_REGEX, isTimeRangeOverlapping() (+1 more)

### Community 12 - "academicTerm.ts"
Cohesion: 0.13
Nodes (39): DELETE(), PUT(), GET(), POST(), AcademicTermItem, AcademicTermsSettingsPage(), CourseEnrollmentModal(), CourseEnrollmentModalProps (+31 more)

### Community 13 - "ac-memo-docx.ts"
Cohesion: 0.10
Nodes (35): ALLOWED_URGENCY, cleanStr(), GET(), PUT(), sanitizeConfig(), AcMemoModal(), AcMemoModalProps, EditorTab (+27 more)

### Community 14 - "chatbot/route.ts"
Cohesion: 0.26
Nodes (9): GET(), POST(), dynamic, POST(), buildDailyBriefing(), DEFAULT_AI_CONFIG, getAiCopilotConfigForActor(), getGeminiApiKey() (+1 more)

### Community 15 - "Diagram"
Cohesion: 0.15
Nodes (23): classify_shape(), clean_label(), Diagram, _discard_nonsemantic(), _edge_operators(), _endpoint_group(), _fail(), _finalize_degrees() (+15 more)

### Community 16 - "test/route.ts"
Cohesion: 0.33
Nodes (6): POST(), SYSTEM_INFO, PushNotificationAction, PushPayload, sendPushToMultipleUsers(), sendPushToUser()

### Community 17 - "mermaid_extract.py"
Cohesion: 0.13
Nodes (16): analyze(), _configure_stdout_utf8(), digest(), Edge, _escape_markdown(), _escape_table(), _frontmatter_end(), _has_cycle() (+8 more)

### Community 18 - "generate_student_manual_docx_pdf.py"
Cohesion: 0.10
Nodes (9): build_presentation(), apply_thai_font(), generate_docx_manual(), set_cell_background(), set_cell_margins(), create_vertical_flowchart_docx(), add_body_p(), add_heading_styled() (+1 more)

### Community 19 - "createNotification"
Cohesion: 0.25
Nodes (20): GET(), POST(), POST(), POST(), POST(), POST(), COURSE_ENROLLMENT_FORBIDDEN_MESSAGE, MinimalUserRoleInfo (+12 more)

### Community 20 - "librarian-audit.mjs"
Cohesion: 0.32
Nodes (15): __dirname, __filename, getAgentsAndSkills(), getComponentsAndLibs(), getDocumentationFiles(), getPagesAndApis(), getPrismaModels(), getVersionStatus() (+7 more)

### Community 21 - "date-time-utils.ts"
Cohesion: 0.13
Nodes (22): GET(), GET(), CORS_HEADERS, dynamic, GET(), getSyncApiKey(), timingSafeKeyMatch(), dynamic (+14 more)

### Community 22 - "self_check.py"
Cohesion: 0.14
Nodes (11): canonical_controller(), check_motion(), check_scripts(), check_svgs(), DiagramParser, is_approved_google_fonts_stylesheet(), main(), normalized_controller() (+3 more)

### Community 23 - "build_student_ui_mockups.js"
Cohesion: 0.09
Nodes (16): fs, IMAGES_DIR, path, puppeteer, studentUser, fs, generateVisualSteps(), IMAGES_DIR (+8 more)

### Community 24 - "auth-context.tsx"
Cohesion: 0.12
Nodes (15): LoginPage(), CartItem, PosPage(), SessionActivityWatcher(), SessionTimeoutModal(), SessionTimeoutModalProps, PosReceiptModal(), PosReceiptModalProps (+7 more)

### Community 25 - "LoadingSpinner"
Cohesion: 0.10
Nodes (30): AdminFeedbackPage(), AdminConsolePage(), AdminSandboxHubPage(), AirConditioningPage(), formatPurposeWithNote(), THAI_DAY_NAMES, THAI_MONTHS, BorrowRequestContent() (+22 more)

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
Cohesion: 0.09
Nodes (12): shadowBase64, fs, IMAGES_DIR, mockBorrowData, path, puppeteer, studentUser, diecutBase64 (+4 more)

### Community 30 - "notifications.ts"
Cohesion: 0.15
Nodes (20): GET(), POST(), PUT(), POST(), GET(), ALL_APPROVAL_SCOPES, ApprovalScopeType, SCOPE_LABELS (+12 more)

### Community 31 - "chatbot.ts"
Cohesion: 0.13
Nodes (31): AdminChatbotCommandCenterPage(), ChatMessage, DailyBriefingCard(), DailyBriefingCardProps, ChatMessage, LabCopilotWidget(), PendingActionCard(), PendingActionCardProps (+23 more)

### Community 32 - "app/page.tsx"
Cohesion: 0.10
Nodes (25): recharts, DashboardPage(), DAYS_OF_WEEK, getCleanLocalDateStr(), getRoomCategory(), ROOM_CATEGORIES, RoomCategory, RoomsPage() (+17 more)

### Community 33 - "quick-action/route.ts"
Cohesion: 0.22
Nodes (15): executeQuickAction(), GET(), POST(), previewQuickActionConfirmation(), renderConfirmationHtml(), renderResponseHtml(), PUT(), combineSlotDateAndBangkokTime() (+7 more)

### Community 34 - "render_system_flow.js"
Cohesion: 0.10
Nodes (13): fs, path, puppeteer, fs, path, puppeteer, fs, HTML_OUTPUT_PATH (+5 more)

### Community 35 - "ebooks/page.tsx"
Cohesion: 0.23
Nodes (13): AdminEBooksSandboxPage(), hydrateBooks(), COVER_CATEGORY_LABELS, DEFAULT_EBOOKS, EBookItem, EBookPage, extractGoogleDriveFileId(), idbLoadEBooks() (+5 more)

### Community 36 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 37 - "chatbot-gemini.ts"
Cohesion: 0.12
Nodes (25): isAdminWriteTool(), UserScopedSystemContext, askGeminiLabBrain(), buildInitialContents(), buildSystemPrompt(), DEEP_MODELS, FAST_MODELS, ModelAttemptConfig (+17 more)

### Community 38 - "borrow/page.tsx"
Cohesion: 0.15
Nodes (17): BorrowPage(), DispenseCenterPage(), QueueItem, BorrowSlipVerificationPage(), BulkAllocationReturnModal(), BulkAllocationReturnModalProps, NewAllocationModal(), NewAllocationModalProps (+9 more)

### Community 39 - "BorrowCatalogBrowser.tsx"
Cohesion: 0.17
Nodes (20): AdminCatalogSandboxPage(), BorrowCatalogBrowser(), BorrowCatalogBrowserProps, BorrowRow, CATALOG_THEMES, CatalogAssetItem, CatalogColorThemeKey, CatalogItem (+12 more)

### Community 40 - "xlsx"
Cohesion: 0.09
Nodes (18): xlsx, fs, path, prisma, { PrismaClient }, XLSX, fs, importUpdatedImages() (+10 more)

### Community 41 - "build_student_ui_mockups.js"
Cohesion: 0.29
Nodes (5): fs, IMAGES_DIR, mockups, path, puppeteer

### Community 42 - "requireActiveActor"
Cohesion: 0.14
Nodes (21): POST(), POST(), getAttemptTracker(), POST(), timingSafeCompareOtp(), GET(), GET(), PUT() (+13 more)

### Community 43 - "react"
Cohesion: 0.13
Nodes (20): lucide-react, react, AdminErrorProps, PublicAssetPage(), PublicConsumablePage(), GlobalErrorProps, ExecutiveDashboardPage(), CabinetStoragePage() (+12 more)

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

### Community 57 - "request-email-change/route.ts"
Cohesion: 0.48
Nodes (5): POST(), POST(), generateOtp(), sendEmailChangeOtpEmail(), sendPasswordResetEmail()

### Community 58 - "ref_path"
Cohesion: 0.13
Nodes (10): allFiles, getFiles(), results, fs, path, wranglerPath, path, prisma (+2 more)

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

### Community 65 - "getSessionFromRequest"
Cohesion: 0.25
Nodes (13): BorrowActionError, PUT(), GET(), PUT(), PUT(), PUT(), canUserApprove(), allocateAndCheckoutEquipmentItem() (+5 more)

### Community 67 - "tailwindcss"
Cohesion: 0.50
Nodes (3): tailwindcss@^3.4.17, tailwindcss, config

### Community 68 - "reminders/route.ts"
Cohesion: 0.67
Nodes (5): GET(), POST(), processReminders(), timingSafeMatch(), verifyAuth()

### Community 69 - "chatbot-admin-actions.ts"
Cohesion: 0.29
Nodes (11): ADMIN_ACTION_TOOL_DECLARATIONS, assertStaffActor(), executeConfirmedAdminAction(), getActionSuggestedLinks(), makeActionId(), normalizeRoomToken(), proposeAdminAction(), resolveRoomsByAliases() (+3 more)

### Community 71 - "feedback/page.tsx"
Cohesion: 0.12
Nodes (21): FeedbackRecord, FeedbackSummary, ALLOWED_VIEWER_MUTATION_PATHS, resolveRequestMethod(), resolveRequestUrl(), ViewerModeGuard(), DEFAULT_CFG, detectCompletedAction() (+13 more)

### Community 74 - "capture_realistic_overview.js"
Cohesion: 0.25
Nodes (6): fs, IMAGES_DIR, mockBorrowData, path, puppeteer, studentUser

### Community 76 - "reorder_sim_and_fms.js"
Cohesion: 0.29
Nodes (5): fs, path, prisma, { PrismaClient }, XLSX

### Community 77 - "sync_master_excel_from_db.js"
Cohesion: 0.29
Nodes (5): fs, path, prisma, { PrismaClient }, XLSX

### Community 78 - "ChatMarkdown.tsx"
Cohesion: 0.48
Nodes (6): ChatMarkdown(), ChatMarkdownProps, CopyableCodeBlock(), isTableSeparator(), parseTableRow(), renderInlineTokens()

## Knowledge Gaps
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `escapeHtml`, `formatUserName`, `session.ts`, `getCached`, `invalidateCache`, `logActivity`, `AppLayout.tsx`, `room-bookings/route.ts`, `academicTerm.ts`, `ac-memo-docx.ts`, `chatbot/route.ts`, `test/route.ts`, `createNotification`, `date-time-utils.ts`, `auth-context.tsx`, `LoadingSpinner`, `package.json`, `dependencies`, `notifications.ts`, `chatbot.ts`, `app/page.tsx`, `quick-action/route.ts`, `ebooks/page.tsx`, `borrow/page.tsx`, `BorrowCatalogBrowser.tsx`, `xlsx`, `requireActiveActor`, `react`, `request-email-change/route.ts`, `upload/route.ts`, `enrollments/route.ts`, `items/bulk/route.ts`, `getSessionFromRequest`, `reminders/route.ts`, `repack/route.ts`, `feedback/page.tsx`, `ChatMarkdown.tsx`?**
  _High betweenness centrality (0.226) - this node is a cross-community bridge._
- **Should `next` be split into smaller, more focused modules?**
  _Cohesion score 0.04025859535703791 - nodes in this community are weakly interconnected._
- **Why does `@prisma/client` connect `@prisma/client` to `next`, `getSessionFromRequest`, `ref_path`, `xlsx`, `list_consumables.js`, `reorder_sim_and_fms.js`, `sync_master_excel_from_db.js`, `generate_consumables_excel.js`, `import_consumables.js`, `generate_sample_excel_reports.js`, `simulate_full_system.js`, `update_riester_omron.js`, `seed.js`, `execute_brand_model_fix.js`, `sync_master_excel_images.js`, `package.json`, `dependencies`, `restore-backup.mjs`?**
  _High betweenness centrality (0.117) - this node is a cross-community bridge._
- **Should `escapeHtml` be split into smaller, more focused modules?**
  _Cohesion score 0.07418788410886742 - nodes in this community are weakly interconnected._
- **Why does `xlsx` connect `xlsx` to `escapeHtml`, `formatUserName`, `ref_path`, `feedback/page.tsx`, `react`, `reorder_sim_and_fms.js`, `sync_master_excel_from_db.js`, `generate_consumables_excel.js`, `import_consumables.js`, `academicTerm.ts`, `generate_sample_excel_reports.js`, `update_riester_omron.js`, `execute_brand_model_fix.js`, `sync_master_excel_images.js`, `LoadingSpinner`, `package.json`, `dependencies`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Should `formatUserName` be split into smaller, more focused modules?**
  _Cohesion score 0.14839424141749724 - nodes in this community are weakly interconnected._
- **Should `session.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0784313725490196 - nodes in this community are weakly interconnected._