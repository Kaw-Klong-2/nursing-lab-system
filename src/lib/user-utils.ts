export const COMMON_USER_PREFIXES = [
  'นาย',
  'นาง',
  'นางสาว',
  'อ.',
  'อาจารย์',
  'ดร.',
  'ผศ.',
  'ผศ.ดร.',
  'รศ.',
  'รศ.ดร.',
  'ศ.',
  'ศ.ดร.',
  'รศ. พลตรีหญิง',
  'พลตรีหญิง',
  'ว่าที่ ร.ต.',
  'ว่าที่ ร.ต.หญิง',
  'นศ.พย.',
];

export const ACADEMIC_PREFIXES = [
  'รศ. พลตรีหญิง',
  'พลตรีหญิง',
  'ศ.ดร.',
  'ศ.',
  'รศ.ดร.',
  'รศ.',
  'ผศ.ดร.',
  'ผศ.',
  'ดร.',
  'อาจารย์',
  'อ.',
  'ว่าที่ ร.ต.หญิง',
  'ว่าที่ ร.ต.',
  'นพ.',
  'พญ.',
  'นายแพทย์',
  'แพทย์หญิง',
];

export const PERSONAL_PREFIXES = ['นางสาว', 'นาง', 'นาย'];

/**
 * Strips all personal and academic prefixes from a name string to extract the raw name
 */
export function stripAllPrefixes(name?: string | null): string {
  if (!name) return '';
  let str = name.trim();
  let changed = true;
  let iterations = 0;

  while (changed && iterations < 5) {
    iterations++;
    changed = false;

    // 1. Remove stacked prefixes like "อาจารย์ นางสาว", "อาจารย์ นาย", "อาจารย์ ผศ."
    const stacked = /^(อาจารย์|อ\.)\s*(นางสาว|นาง|นาย|ผศ\.ดร\.|ผศ\.|รศ\.ดร\.|รศ\.|ศ\.ดร\.|ศ\.|ดร\.)\s*/;
    if (stacked.test(str)) {
      str = str.replace(stacked, '$2 ');
      changed = true;
    }

    // 2. Remove personal pronouns
    for (const p of PERSONAL_PREFIXES) {
      if (str.startsWith(p)) {
        str = str.slice(p.length).trim();
        changed = true;
        break;
      }
    }

    // 3. Remove academic ranks
    for (const r of ACADEMIC_PREFIXES) {
      if (str.startsWith(r)) {
        str = str.slice(r.length).trim();
        changed = true;
        break;
      }
    }
  }

  return str.trim();
}

/**
 * Checks if a user is administrative staff or lab officer rather than academic faculty.
 */
export function isStaffUser(
  user?: { role?: string | null; name?: string | null; email?: string | null } | string | null
): boolean {
  if (!user) return false;
  if (typeof user === 'string') {
    const s = user.trim();
    return (
      s.includes('แอดมิน') ||
      s.includes('เจ้าหน้าที่') ||
      s.includes('ผู้ดูแลระบบ') ||
      s.includes('นักวิทยาศาสตร์') ||
      s.includes('ณัฐกุล') ||
      s.includes('ปรเมศวร์')
    );
  }
  const role = user.role || '';
  const name = user.name || '';
  const email = user.email || '';
  return (
    role === 'ADMIN' ||
    role === 'OFFICER' ||
    name.includes('แอดมิน') ||
    name.includes('เจ้าหน้าที่') ||
    name.includes('ผู้ดูแลระบบ') ||
    name.includes('นักวิทยาศาสตร์') ||
    name.includes('ณัฐกุล') ||
    name.includes('ปรเมศวร์') ||
    email.includes('admin') ||
    email.includes('officer')
  );
}

/**
 * Low-level pure formatter: formats prefix and name without any role checks or delegation.
 * Guaranteed never to recurse or cause call stack overflow.
 */
export function formatBaseUserName(prefix?: string | null, name?: string | null): string {
  const p = (prefix || '').trim();
  let n = (name || '').trim();

  if (!p) return n;
  if (!n) return p;

  if (n.startsWith(p)) {
    return n;
  }

  for (const personal of PERSONAL_PREFIXES) {
    if (n.startsWith(personal)) {
      n = n.slice(personal.length).trim();
      break;
    }
  }

  if (PERSONAL_PREFIXES.includes(p)) {
    return `${p}${n}`;
  }

  return `${p} ${n}`.trim();
}

/**
 * Format a user's full display name cleanly with prefix without accidental duplication.
 * Works for both User objects { prefix, name } and plain name strings.
 */
export function formatUserName(
  user?: { prefix?: string | null; name?: string | null; role?: string | null; email?: string | null; department?: string | null } | string | null
): string {
  if (!user) return '';

  if (typeof user === 'string') {
    let str = user.trim();
    // Clean stacked prefixes like 'อาจารย์ นางสาว' or 'อาจารย์ นาย'
    str = str.replace(/^(อาจารย์|อ\.)\s*(นางสาว|นาง|นาย)\s*/, 'อาจารย์');
    return str;
  }

  if (typeof user === 'object' && user !== null) {
    // If staff/admin, return base format directly
    if (isStaffUser(user)) {
      return formatBaseUserName(user.prefix, user.name);
    }

    const role = user.role;
    const isTeacherUser =
      role === 'TEACHER' ||
      Boolean(user.department?.includes('อาจารย์')) ||
      Boolean(user.email?.includes('teacher')) ||
      ACADEMIC_PREFIXES.some(
        (r) =>
          r !== 'อาจารย์' &&
          r !== 'อ.' &&
          ((user.prefix || '').startsWith(r) || (user.name || '').startsWith(r))
      );

    if (isTeacherUser) {
      // Safe to delegate to formatTeacherName because formatTeacherName never calls formatUserName
      return formatTeacherName(user);
    }

    return formatBaseUserName(user.prefix, user.name);
  }

  return '';
}

/**
 * Format an instructor / teacher / advisor display name cleanly according to Thai academic protocol:
 * - If teacher has an academic rank (ผศ., ผศ.ดร., รศ., ศ., ดร.), use that rank alone (NEVER prepend "อาจารย์").
 * - If teacher has a personal pronoun (นาย, นาง, นางสาว) or no rank, address them as "อาจารย์" (NEVER "อาจารย์ นางสาว").
 * - Automatically cleans any stacked "อาจารย์ นางสาว" or "อาจารย์ ผศ.".
 * - Guaranteed zero recursion: NEVER calls formatUserName.
 */
export function formatTeacherName(
  teacher?: { prefix?: string | null; name?: string | null; role?: string | null; email?: string | null } | string | null
): string {
  if (!teacher) return '';

  let rawPrefix = '';
  let rawName = '';

  if (typeof teacher === 'object' && teacher !== null) {
    rawPrefix = (teacher.prefix || '').trim();
    rawName = (teacher.name || '').trim();
  } else if (typeof teacher === 'string') {
    rawName = teacher.trim();
  }

  if (!rawPrefix && !rawName) return '';

  // 1. If explicit staff/admin and has no academic title, return base user name (NEVER force อาจารย์ and NEVER recurse)
  if (isStaffUser(teacher)) {
    return formatBaseUserName(rawPrefix, rawName);
  }

  // 2. Clean stacked "อาจารย์ นางสาว", "อาจารย์ นาย", "อาจารย์ ผศ."
  rawName = rawName.replace(/^(อาจารย์|อ\.)\s*(นางสาว|นาง|นาย)\s*/, '');
  rawName = rawName.replace(/^(อาจารย์|อ\.)\s*(ผศ\.ดร\.|ผศ\.|รศ\.ดร\.|รศ\.|ศ\.ดร\.|ศ\.|ดร\.)\s*/, '$2 ');

  // 3. Check academic ranks in prefix
  const isAcademicPrefix = ACADEMIC_PREFIXES.some(
    (r) => r !== 'อาจารย์' && r !== 'อ.' && (rawPrefix.startsWith(r) || rawPrefix === r)
  );

  if (isAcademicPrefix) {
    const cleanName = stripAllPrefixes(rawName);
    // Special case for military/honorific + doctoral degree (e.g. 'รศ. พลตรีหญิง' + 'ดร.สายสมร')
    if (rawName.startsWith('ดร.') && !rawPrefix.includes('ดร.')) {
      return `${rawPrefix} ${rawName}`.trim();
    }
    return `${rawPrefix} ${cleanName}`.trim();
  }

  // 4. Check if rawName itself starts with an academic rank (e.g. ผศ.ดร. ชญาภรณ์ or ดร.สายสมร)
  for (const rank of ACADEMIC_PREFIXES) {
    if (rank !== 'อาจารย์' && rank !== 'อ.' && rawName.startsWith(rank)) {
      return rawName;
    }
  }

  // 5. If prefix is already อาจารย์ or อ.
  if (rawPrefix === 'อาจารย์' || rawPrefix === 'อ.') {
    const cleanName = stripAllPrefixes(rawName);
    return `อาจารย์${cleanName}`;
  }

  // 6. Otherwise (personal pronoun or no prefix): address as อาจารย์ + name
  const cleanName = stripAllPrefixes(rawName);
  return `อาจารย์${cleanName}`;
}

/**
 * Formats an approver's display badge/name with proper role transparency:
 * e.g., "แอดมิน: คุณณัฐกุล บำรุงราษฎร์" or "เจ้าหน้าที่: คุณสมบัติ" or "ผศ.ดร. นันทิกา"
 */
export function formatApproverDisplay(approver?: any): string {
  if (!approver) return 'ผู้มีอำนาจอนุมัติ';
  const role = approver.role || '';
  const uName = formatUserName(approver);

  if (role === 'ADMIN') {
    return `แอดมิน: ${uName}`;
  }
  if (role === 'OFFICER') {
    return `เจ้าหน้าที่: ${uName}`;
  }
  if (role === 'APPROVER') {
    return `ผู้อนุมัติ: ${uName}`;
  }
  if (role === 'TEACHER') {
    return formatTeacherName(approver);
  }
  return uName;
}

/**
 * Formats who acknowledged a request, distinguishing between genuine Academic Teacher
 * and Administrative/Staff acknowledgment.
 */
export function formatAcknowledgeDisplay(advisorName?: string | null): {
  label: string;
  name: string;
  isStaff: boolean;
  colorClass: string;
  borderClass: string;
  bgClass: string;
} {
  if (!advisorName || !advisorName.trim()) {
    return {
      label: 'อาจารย์รับทราบแล้ว',
      name: 'อาจารย์ประจำวิชา',
      isStaff: false,
      colorClass: 'text-emerald-700 dark:text-emerald-300',
      borderClass: 'border-emerald-200 dark:border-emerald-800',
      bgClass: 'bg-emerald-50 dark:bg-emerald-950/60',
    };
  }

  const str = advisorName.trim();
  const isStaff =
    str.includes('แอดมิน') ||
    str.includes('เจ้าหน้าที่') ||
    str.includes('ผู้ดูแลระบบ');

  if (isStaff) {
    const clean = str.replace(/^อาจารย์\s*/, '');
    const formattedName = clean.includes('แอดมิน') ? clean : `${clean} (แอดมิน)`;
    return {
      label: 'แอดมินรับทราบแล้ว',
      name: formattedName,
      isStaff: true,
      colorClass: 'text-blue-700 dark:text-blue-300',
      borderClass: 'border-blue-200 dark:border-blue-800',
      bgClass: 'bg-blue-50 dark:bg-blue-950/60',
    };
  }

  return {
    label: 'อาจารย์รับทราบแล้ว',
    name: formatTeacherName(str),
    isStaff: false,
    colorClass: 'text-emerald-700 dark:text-emerald-300',
    borderClass: 'border-emerald-200 dark:border-emerald-800',
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/60',
  };
}

/**
 * Returns the Thai display name for a given user role.
 * Strictly adheres to terminology policy: "นิสิต" (never "นักศึกษา").
 */
export function getRoleLabel(role?: string | null): string {
  switch (role) {
    case 'ADMIN':
      return 'แอดมิน';
    case 'OFFICER':
      return 'เจ้าหน้าที่แล็บ';
    case 'APPROVER':
      return 'ผู้อนุมัติ';
    case 'TEACHER':
      return 'อาจารย์ผู้สอน';
    case 'EXECUTIVE':
      return 'ผู้บริหาร';
    case 'USER':
      return 'นิสิต';
    default:
      return role || 'ผู้ใช้งาน';
  }
}

export interface UserBadgeInfo {
  type: 'PRIMARY' | 'EXECUTIVE' | 'APPROVER';
  label: string;
  detail?: string;
  badgeClass: string;
}

/**
 * Returns composite badges for a user: Primary Role + Executive (if any) + Approver Scopes (if any).
 */
export function getUserBadges(user?: {
  role?: string | null;
  isExecutive?: boolean | null;
  executiveRole?: string | null;
  approvalScopes?: string | null;
} | null): UserBadgeInfo[] {
  if (!user) return [];
  const badges: UserBadgeInfo[] = [];

  // 1. Primary role
  const role = user.role || 'USER';
  let primaryLabel = getRoleLabel(role);
  let primaryClass = 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800';

  if (role === 'ADMIN') {
    primaryLabel = 'ผู้ดูแลระบบ';
    primaryClass = 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800';
  } else if (role === 'OFFICER') {
    primaryLabel = 'เจ้าหน้าที่ห้องแล็บ';
    primaryClass = 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
  } else if (role === 'TEACHER') {
    primaryLabel = 'อาจารย์';
    primaryClass = 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800';
  } else if (role === 'APPROVER') {
    primaryLabel = 'ผู้อนุมัติ';
    primaryClass = 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
  } else if (role === 'USER') {
    primaryLabel = 'นิสิต';
    primaryClass = 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800';
  }

  badges.push({
    type: 'PRIMARY',
    label: primaryLabel,
    badgeClass: primaryClass,
  });

  // 2. Executive dimension
  if (user.isExecutive || role === 'EXECUTIVE') {
    const execTitle = user.executiveRole?.trim() || 'ผู้บริหาร';
    badges.push({
      type: 'EXECUTIVE',
      label: `🏛️ ${execTitle}`,
      detail: execTitle,
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
    });
  }

  // 3. Approver dimension (Never applies to USER / นิสิต)
  const hasScopes = Boolean(user.approvalScopes && user.approvalScopes !== 'NONE' && user.approvalScopes !== '');
  if (role !== 'ADMIN' && role !== 'USER' && (hasScopes || role === 'APPROVER')) {
    let scopeText = 'ทั้งหมด';
    if (user.approvalScopes && user.approvalScopes !== 'ALL') {
      const raw = user.approvalScopes.split(',').map((s) => s.trim().toUpperCase());
      const hasBorrow = raw.includes('BORROW');
      const hasReq = raw.includes('REQUISITION');
      const hasPractice = raw.includes('PRACTICE');
      const hasRoom = raw.includes('ROOM');

      if (hasBorrow && hasReq && !hasPractice && !hasRoom) {
        scopeText = 'พัสดุและครุภัณฑ์';
      } else if (!hasBorrow && !hasReq && (hasPractice || hasRoom)) {
        scopeText = 'ห้องปฏิบัติการ';
      } else {
        const labels: string[] = [];
        if (hasBorrow) labels.push('ยืม');
        if (hasReq) labels.push('เบิก');
        if (hasPractice) labels.push('ฝึกทักษะ');
        if (hasRoom) labels.push('จองห้อง');
        scopeText = labels.join(', ');
      }
    }
    badges.push({
      type: 'APPROVER',
      label: `📋 สิทธิ์อนุมัติ: ${scopeText}`,
      detail: scopeText,
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    });
  }

  return badges;
}

