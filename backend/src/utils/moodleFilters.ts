/**
 * Normalizes text by removing HTML tags, decoding entities, and collapsing whitespace.
 */
export function normalizeMoodleText(text: string): string {
  if (!text) return "";
  return text
    .replace(/<[^>]*>?/gm, "") // Strip HTML tags
    .replace(/&nbsp;/g, " ") // Replace &nbsp; with space
    .replace(/&amp;/g, "&") // Replace &amp; with &
    .replace(/&quot;/g, '"') // Replace &quot; with "
    .replace(/&#039;/g, "'") // Replace &#039; with '
    .replace(/\s+/g, " ") // Collapse multiple whitespaces
    .trim();
}

/**
 * Checks if a string matches year and semester filters.
 * Works with separators like _, -, /, . and spaces.
 */
export function matchesYearAndSemester(
  text: string,
  year?: string,
  semester?: string
): boolean {
  const target = text.toLowerCase();

  if (year) {
    const fullYear = year; // "2023"
    const shortYear = year.slice(-2); // "23"
    // Ищем 2023 или 23, окруженные не-буквами
    const yearPattern = new RegExp(
      `(?:^|[\\s\\-_/.])${fullYear}|${shortYear}(?=[\\s\\-_/.]|$)`,
      "i"
    );
    if (!yearPattern.test(target)) return false;
  }

  if (semester) {
    // Ищем цифру семестра, окруженную разделителями или словами сем/sem
    const semesterPattern = new RegExp(
      `(?:^|[\\s\\-_/.]) ${semester} (?:\\s*(?:sem|сем|семестр|semester)|[\\s\\-_/.]|$)`.replace(
        / /g,
        ""
      ),
      "i"
    );
    if (!semesterPattern.test(target)) return false;
  }

  return true;
}

/**
 * Extracts year (helper)
 */
export function extractYear(name: string): number | null {
  const match = name.match(/20\d{2}/);
  return match ? parseInt(match[0], 10) : null;
}

/**
 * Extracts semester (helper)
 */
export function extractSemester(name: string): number | null {
  const match = name.match(
    /(?:^|[\s\-_/])([12])(?:\s*(?:sem|сем|семестр|semester)|[\s\-_/]|$)*/i
  );
  return match ? parseInt(match[1], 10) : null;
}

/**
pnpm de */
export function filterCourses(
  courses: any[],
  filters: { status?: string; year?: string; semester?: string }
): any[] {
  return courses.filter((course) => {
    const combinedName = `${course.fullname} ${course.shortname}`;

    if (!matchesYearAndSemester(combinedName, filters.year, filters.semester)) {
      return false;
    }

    if (filters.status) {
      let p = course.progress;
      const progress = p === null || p === undefined ? 0 : p > 1 ? p : p * 100;

      switch (filters.status) {
        case "completed":
          if (progress < 100) return false;
          break;
        case "not_completed":
          if (progress >= 100) return false;
          break;
        case "in_progress":
          if (progress <= 0 || progress >= 100) return false;
          break;
        case "not_started":
          if (progress > 0) return false;
          break;
      }
    }

    return true;
  });
}
