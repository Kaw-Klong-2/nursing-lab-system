# System Rules: Direct Execution (No Interactive Questions)

## User Interaction Policy
1. **Never use interactive popup questions (`ask_question` tool)**:
   - Do NOT prompt the user with interactive choice modals, multiple-choice questions, or clarifying popups.
   - Proceed directly with the best technical decision, plan, implement, build-test, and commit.
2. **Execute autonomously**:
   - When the user asks for changes, fixes, or additions, research the codebase, apply the changes, verify with `npm run build` / `npx tsc`, and commit directly.
   - If there are minor design options, choose the most sensible and standard approach, apply it, and summarize the choice in the final response.
3. **Safety exception only**:
   - Only pause and ask if the action would result in catastrophic data destruction (e.g. dropping the entire production database without backup). Otherwise, always proceed directly.
4. **Never touch or save files to the User's Desktop (`C:\Users\...\Desktop`)**:
   - Strictly keep ALL generated files, exports, documents, diagrams, and assets inside the project repository `d:\LAB-system\` (e.g., `d:\LAB-system\system_flow\`, `d:\LAB-system\manual\`).
   - Never place, copy, or move files to the Desktop or any user folders outside `d:\LAB-system`.
5. **Terminology Policy: Strictly use "นิสิต" (Never use "นักศึกษา")**:
   - Always and strictly refer to students as **"นิสิต"** across all UI labels, messages, placeholder texts, code comments, notifications, user manuals, documentation, responses, and generated content.
   - **Never** use the word **"นักศึกษา"** under any circumstances.
6. **Mandatory Project Librarian Protocol (`librarian` — Pre-Work & Post-Work)**:
   - **Pre-Work Consultation (ถามบรรณารักษ์ก่อนแก้ไขงานทุกครั้งแบบประหยัดโทเคน)**:
     - **Standard / Targeted Tasks**: Before editing files, run `node scripts/librarian-audit.mjs --search <keyword>` or inspect `d:\LAB-system\LIBRARY_CATALOG.md` and `d:\LAB-system\docs\WORK_LOG.md` to locate exact UI pages, API routes, Prisma models, and canonical manuals without blind file scanning.
     - **Complex / Cross-Module Tasks**: Invoke the `librarian` sub-agent (`invoke_subagent` with `TypeName: "librarian"`, `Model: "flash"`) to perform a multi-file impact briefing and return a concise (<15 lines) file/schema/manual map before making changes.
   - **Post-Work Audit & Archiving (ตรวจรับและจดบันทึกหลังแก้ไขเสร็จทุกครั้ง)**:
     - Run `npm run librarian:audit` after completing changes to verify 100% terminology compliance ("นิสิต") and UTF-8 integrity.
     - Record a concise entry at the top of `d:\LAB-system\docs\WORK_LOG.md` summarizing the date, module, changes made, and touched files. Update `d:\LAB-system\LIBRARY_CATALOG.md` whenever new pages, APIs, Prisma models, skills, or manuals are added.
