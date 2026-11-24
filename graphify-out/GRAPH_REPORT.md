# Graph Report - LAB-system  (2026-11-24)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1641 nodes · 4666 edges · 86 communities (65 shown, 21 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7b1c8b89`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84

## God Nodes (most connected - your core abstractions)
1. `next` - 159 edges
2. `prisma` - 113 edges
3. `useAuth()` - 103 edges
4. `formatUserName()` - 99 edges
5. `invalidateCache()` - 95 edges
6. `react` - 92 edges
7. `lucide-react` - 88 edges
8. `LoadingSpinner()` - 76 edges
9. `formatTeacherName()` - 65 edges
10. `logActivity()` - 61 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `invalidateCache()`  [EXTRACTED]
  src/app/api/storage/locations/[id]/assign/route.ts → src/lib/cache.ts
- `AuditLogsPage()` --calls--> `useAuth()`  [EXTRACTED]
  src/app/audit-logs/page.tsx → src/lib/auth-context.tsx
- `DELETE()` --calls--> `invalidateCache()`  [EXTRACTED]
  src/app/api/room-bookings/[id]/route.ts → src/lib/cache.ts
- `MaintenanceDashboardPage()` --calls--> `User`  [EXTRACTED]
  src/app/maintenance/page.tsx → src/lib/auth-context.tsx
- `PosPage()` --calls--> `User`  [EXTRACTED]
  src/app/pos/page.tsx → src/lib/auth-context.tsx

## Import Cycles
- 2-file cycle: `src/components/borrow/BorrowCatalogBrowser.tsx -> src/components/borrow/BorrowCheckoutDrawer.tsx -> src/components/borrow/BorrowCatalogBrowser.tsx`

## Communities (86 total, 21 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.04
Nodes (15): next, dynamic, dynamic, dynamic, dynamic, dynamic, dynamic, POST() (+7 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (50): qrcode, classifyAcSession(), dynamic, GET(), getMonthDateRange(), revalidate, InventoryPage(), ConsumableDetailModal() (+42 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (46): ApprovalsPage(), BorrowPage(), CoursesPage(), DispenseCenterPage(), QueueItem, ExecutiveDashboardPage(), LoginPage(), DashboardPage() (+38 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (43): POST(), POST(), POST(), POST(), dynamic, GET(), POST(), POST() (+35 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (48): POST(), assembleUserScopedContext(), UserScopedSystemContext, checkIntentPermission(), detectIntent(), executeConfirmedAction(), getRoleQuickReplies(), handleAcLogFlow() (+40 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (32): _aligned(), analyze(), classify_shape(), clean_label(), _configure_stdout_utf8(), _decompress_limited(), digest(), Edge (+24 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (35): POST(), PUT(), GET(), GET(), POST(), DELETE(), PATCH(), PUT() (+27 more)

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (40): AdminEBooksSandboxPage(), hydrateBooks(), COVER_CATEGORY_LABELS, DEFAULT_EBOOKS, EBookItem, EBookPage, extractGoogleDriveFileId(), idbLoadEBooks() (+32 more)

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (27): calculateHours(), DELETE(), POST(), DELETE(), PUT(), DEFAULT_CONFIG, PUT(), DELETE() (+19 more)

### Community 9 - "Community 9"
Cohesion: 0.04
Nodes (23): @prisma/client, prisma, prisma, { PrismaClient }, prisma, { PrismaClient }, prisma, prisma (+15 more)

### Community 10 - "Community 10"
Cohesion: 0.14
Nodes (33): POST(), Navbar(), NavbarProps, getQuickApproveMeta(), NotificationBell(), NotificationItem, playNotificationChime(), resolveNotificationHref() (+25 more)

### Community 11 - "Community 11"
Cohesion: 0.10
Nodes (22): lucide-react, react, recharts, xlsx, AdminErrorProps, AirConditioningPage(), formatPurposeWithNote(), THAI_DAY_NAMES (+14 more)

### Community 12 - "Community 12"
Cohesion: 0.17
Nodes (33): DELETE(), PUT(), GET(), POST(), GET(), AcademicTermItem, AcademicTermsSettingsPage(), normalizeInstructorKey() (+25 more)

### Community 13 - "Community 13"
Cohesion: 0.10
Nodes (35): ALLOWED_URGENCY, cleanStr(), GET(), PUT(), sanitizeConfig(), AcMemoModal(), AcMemoModalProps, EditorTab (+27 more)

### Community 14 - "Community 14"
Cohesion: 0.11
Nodes (28): AdminFeedbackPage(), FeedbackRecord, FeedbackSummary, SessionActivityWatcher(), SessionTimeoutModal(), SessionTimeoutModalProps, ALLOWED_VIEWER_MUTATION_PATHS, resolveRequestMethod() (+20 more)

### Community 15 - "Community 15"
Cohesion: 0.15
Nodes (23): classify_shape(), clean_label(), Diagram, _discard_nonsemantic(), _edge_operators(), _endpoint_group(), _fail(), _finalize_degrees() (+15 more)

### Community 16 - "Community 16"
Cohesion: 0.16
Nodes (20): POST(), POST(), getAttemptTracker(), POST(), timingSafeCompareOtp(), GET(), extractUserFromRow(), normalizeRole() (+12 more)

### Community 17 - "Community 17"
Cohesion: 0.13
Nodes (16): analyze(), _configure_stdout_utf8(), digest(), Edge, _escape_markdown(), _escape_table(), _frontmatter_end(), _has_cycle() (+8 more)

### Community 18 - "Community 18"
Cohesion: 0.10
Nodes (9): build_presentation(), apply_thai_font(), generate_docx_manual(), set_cell_background(), set_cell_margins(), create_vertical_flowchart_docx(), add_body_p(), add_heading_styled() (+1 more)

### Community 19 - "Community 19"
Cohesion: 0.26
Nodes (20): GET(), POST(), PUT(), POST(), POST(), POST(), PUT(), POST() (+12 more)

### Community 20 - "Community 20"
Cohesion: 0.14
Nodes (24): __dirname, __filename, getAgentsAndSkills(), getComponentsAndLibs(), getDocumentationFiles(), getPagesAndApis(), getPrismaModels(), getVersionStatus() (+16 more)

### Community 21 - "Community 21"
Cohesion: 0.16
Nodes (20): GET(), GET(), POST(), GET(), parseDateAsUtcMidnight(), POST(), GET(), GET() (+12 more)

### Community 22 - "Community 22"
Cohesion: 0.14
Nodes (11): canonical_controller(), check_motion(), check_scripts(), check_svgs(), DiagramParser, is_approved_google_fonts_stylesheet(), main(), normalized_controller() (+3 more)

### Community 23 - "Community 23"
Cohesion: 0.08
Nodes (17): fs, IMAGES_DIR, mockups, path, puppeteer, fs, IMAGES_DIR, mockBorrowData (+9 more)

### Community 24 - "Community 24"
Cohesion: 0.12
Nodes (15): AdminConsolePage(), AdminSandboxHubPage(), BorrowRequestContent(), BorrowRequestPage(), PracticeKitsPage(), MaintenanceReportContent(), MaintenanceReportPage(), PracticeBookingContent() (+7 more)

### Community 25 - "Community 25"
Cohesion: 0.17
Nodes (20): AdminCatalogSandboxPage(), BorrowCatalogBrowser(), BorrowCatalogBrowserProps, BorrowRow, CATALOG_THEMES, CatalogAssetItem, CatalogColorThemeKey, CatalogItem (+12 more)

### Community 26 - "Community 26"
Cohesion: 0.12
Nodes (22): devDependencies, autoprefixer@^10.4.20, postcss@^8.5.2, @types/bcryptjs@^2.4.6, @types/node@^22.13.4, @types/pg@^8.23.1, @types/react@^19.0.10, @types/react-dom@^19.0.4 (+14 more)

### Community 27 - "Community 27"
Cohesion: 0.09
Nodes (23): dependencies, docx@^9.8.1, html5-qrcode@^2.3.8, jspdf@^4.2.1, lucide-react@^0.475.0, next@^15.2.0, pg@^8.23.1, @prisma/adapter-pg@^6.19.3 (+15 more)

### Community 28 - "Community 28"
Cohesion: 0.09
Nodes (23): scripts, build, build:cf, dev, graphify, graphify:build, graphify:explain, graphify:god-nodes (+15 more)

### Community 29 - "Community 29"
Cohesion: 0.10
Nodes (11): shadowBase64, fs, path, prisma, { PrismaClient }, xlsx, diecutBase64, shadowBase64 (+3 more)

### Community 30 - "Community 30"
Cohesion: 0.17
Nodes (18): GET(), POST(), PUT(), POST(), GET(), ApprovalScopeType, getRenderedNotification(), createMultipleNotifications() (+10 more)

### Community 31 - "Community 31"
Cohesion: 0.13
Nodes (14): PublicAssetPage(), PublicConsumablePage(), CabinetStoragePage(), RoomStoragePage(), ThemeToggle(), ThemeToggleProps, MobileCabinetAuditModal(), MobileCabinetAuditModalProps (+6 more)

### Community 32 - "Community 32"
Cohesion: 0.16
Nodes (17): DAYS_OF_WEEK, getCleanLocalDateStr(), getRoomCategory(), ROOM_CATEGORIES, RoomCategory, RoomsPage(), SchedulePage(), CalendarHoverCard() (+9 more)

### Community 33 - "Community 33"
Cohesion: 0.25
Nodes (14): html5-qrcode, GET(), PracticePage(), startCamera(), QrScannerModal(), startScanner(), QrScannerModalProps, createScanThrottle() (+6 more)

### Community 34 - "Community 34"
Cohesion: 0.10
Nodes (13): fs, path, puppeteer, fs, path, puppeteer, fs, HTML_OUTPUT_PATH (+5 more)

### Community 35 - "Community 35"
Cohesion: 0.15
Nodes (16): AdminChatbotSandboxPage(), ChatMessage, ChatMessage, AuthContext, AuthContextType, AuthProvider(), initializeAuth(), checkSessionActive() (+8 more)

### Community 36 - "Community 36"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 37 - "Community 37"
Cohesion: 0.20
Nodes (7): PUT(), POST(), DELETE(), PUT(), ALL_APPROVAL_SCOPES, canUserApprove(), SCOPE_LABELS

### Community 38 - "Community 38"
Cohesion: 0.22
Nodes (10): GET(), POST(), processReminders(), timingSafeMatch(), verifyAuth(), CORS_HEADERS, dynamic, GET() (+2 more)

### Community 39 - "Community 39"
Cohesion: 0.14
Nodes (10): allFiles, getFiles(), results, fs, path, wranglerPath, fs, masterFiles (+2 more)

### Community 40 - "Community 40"
Cohesion: 0.14
Nodes (11): fs, path, prisma, { PrismaClient }, XLSX, fs, importUpdatedImages(), path (+3 more)

### Community 41 - "Community 41"
Cohesion: 0.26
Nodes (9): POST(), POST(), PUT(), generateOtp(), combineSlotDateAndBangkokTime(), generateQrCodeDataUrl(), sendApprovalNotificationWithQrEmail(), sendEmailChangeOtpEmail() (+1 more)

### Community 42 - "Community 42"
Cohesion: 0.25
Nodes (9): BatchRoomBookingError, BatchSlotItem, ConflictedSlotItem, POST(), POST(), RoomBookingError, DATE_YYYY_MM_DD_REGEX, isTimeRangeOverlapping() (+1 more)

### Community 43 - "Community 43"
Cohesion: 0.33
Nodes (11): executeQuickAction(), GET(), POST(), previewQuickActionConfirmation(), renderConfirmationHtml(), renderResponseHtml(), generateSignedApprovalToken(), getApprovalSecret() (+3 more)

### Community 44 - "Community 44"
Cohesion: 0.22
Nodes (10): buildHTML(), buildSVG(), fs, HTML_PATH, path, PDF_PATH, PNG_PATH, puppeteer (+2 more)

### Community 45 - "Community 45"
Cohesion: 0.22
Nodes (9): FLOWCHART_DIR, flowcharts, fs, generateHtmlPage(), IMAGES_DIR, MANUAL_DIR, path, puppeteer (+1 more)

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (9): formatISODate(), formatThaiDate(), fs, generateExcel(), path, prisma, { PrismaClient }, setWorksheetColumnWidths() (+1 more)

### Community 47 - "Community 47"
Cohesion: 0.27
Nodes (9): extractItemFromRow(), fs, main(), normalizeItemType(), parseSafeDate(), path, prisma, { PrismaClient } (+1 more)

### Community 48 - "Community 48"
Cohesion: 0.22
Nodes (4): args, __dirname, result, rootDir

### Community 49 - "Community 49"
Cohesion: 0.25
Nodes (8): fs, mockStudentUser, mockTeacherUser, OUTPUT_DIR, path, puppeteer, run(), setAuth()

### Community 50 - "Community 50"
Cohesion: 0.25
Nodes (8): formatDateThai(), fs, generateReports(), OUTPUT_DIR, path, prisma, { PrismaClient }, XLSX

### Community 51 - "Community 51"
Cohesion: 0.25
Nodes (8): cleanupRegistry, fs, path, prisma, { PrismaClient }, recordResult(), runSimulation(), testResults

### Community 52 - "Community 52"
Cohesion: 0.25
Nodes (6): fs, IMAGES_DIR, mockBorrowData, path, puppeteer, studentUser

### Community 53 - "Community 53"
Cohesion: 0.25
Nodes (6): fs, main(), path, prisma, { PrismaClient }, xlsx

### Community 54 - "Community 54"
Cohesion: 0.29
Nodes (5): cleanAndSeed(), fs, path, prisma, { PrismaClient }

### Community 55 - "Community 55"
Cohesion: 0.29
Nodes (5): fs, IMAGES_DIR, path, puppeteer, studentUser

### Community 56 - "Community 56"
Cohesion: 0.29
Nodes (5): fs, MANUAL_IMG_DIR, path, puppeteer, TARGET_DIR

### Community 57 - "Community 57"
Cohesion: 0.29
Nodes (5): fs, path, prisma, { PrismaClient }, XLSX

### Community 58 - "Community 58"
Cohesion: 0.29
Nodes (5): fs, path, prisma, { PrismaClient }, XLSX

### Community 59 - "Community 59"
Cohesion: 0.29
Nodes (5): fs, path, prisma, { PrismaClient }, XLSX

### Community 60 - "Community 60"
Cohesion: 0.33
Nodes (3): nextConfig, @opennextjs/cloudflare@^1.20.12, @opennextjs/cloudflare

### Community 62 - "Community 62"
Cohesion: 0.40
Nodes (5): convertDates(), dateFieldNames, prisma, restore(), tableOrder

### Community 63 - "Community 63"
Cohesion: 0.40
Nodes (3): CartItem, PosPage(), PosReceiptModal()

### Community 64 - "Community 64"
Cohesion: 0.70
Nodes (4): extractItemFromRow(), normalizeItemType(), parseSafeDate(), POST()

### Community 67 - "Community 67"
Cohesion: 0.50
Nodes (3): tailwindcss@^3.4.17, tailwindcss, config

## Knowledge Gaps
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 6`, `Community 7`, `Community 8`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 16`, `Community 19`, `Community 21`, `Community 24`, `Community 25`, `Community 26`, `Community 27`, `Community 30`, `Community 31`, `Community 32`, `Community 33`, `Community 35`, `Community 37`, `Community 38`, `Community 41`, `Community 42`, `Community 43`, `Community 61`, `Community 63`, `Community 64`, `Community 65`?**
  _High betweenness centrality (0.241) - this node is a cross-community bridge._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.041455696202531644 - nodes in this community are weakly interconnected._
- **Why does `@prisma/client` connect `Community 9` to `Community 0`, `Community 26`, `Community 27`, `Community 29`, `Community 40`, `Community 46`, `Community 47`, `Community 50`, `Community 51`, `Community 53`, `Community 54`, `Community 57`, `Community 58`, `Community 59`, `Community 62`, `Community 68`, `Community 69`, `Community 70`, `Community 71`?**
  _High betweenness centrality (0.134) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.0700152207001522 - nodes in this community are weakly interconnected._
- **Why does `xlsx` connect `Community 11` to `Community 1`, `Community 2`, `Community 58`, `Community 39`, `Community 40`, `Community 59`, `Community 9`, `Community 12`, `Community 46`, `Community 47`, `Community 14`, `Community 50`, `Community 53`, `Community 57`, `Community 26`, `Community 27`, `Community 29`?**
  _High betweenness centrality (0.086) - this node is a cross-community bridge._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.09036658141517477 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.07305669199298656 - nodes in this community are weakly interconnected._