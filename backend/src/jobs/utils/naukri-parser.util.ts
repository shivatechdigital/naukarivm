export interface ParsedSalary {
  salaryMin?: number;
  salaryMax?: number;
  rawText: string;
}

export interface ParsedExperience {
  experienceMin?: number;
  experienceMax?: number;
  rawText: string;
}

// ══════════════════════════════════════════════════
// SALARY PARSER ("10-18 Lacs PA" ➔ 1000000, 1800000)
// ══════════════════════════════════════════════════
export function parseSalary(salaryStr: string | null | undefined): ParsedSalary {
  if (!salaryStr || salaryStr.toLowerCase().includes('not disclosed')) {
    return { rawText: salaryStr || 'Not Disclosed' };
  }

  const clean = salaryStr.trim();

  // Pattern: "10-18 Lacs PA" or "10 - 18 Lakhs" or "3.5-5.5 Lacs"
  const lacsMatch = clean.match(/([\d\.]+)\s*-\s*([\d\.]+)\s*(?:Lacs|Lakh|LPA|PA)/i);
  if (lacsMatch) {
    const min = Math.round(parseFloat(lacsMatch[1]) * 100000);
    const max = Math.round(parseFloat(lacsMatch[2]) * 100000);
    return { salaryMin: min, salaryMax: max, rawText: clean };
  }

  // Single value: "15 Lacs PA"
  const singleLacMatch = clean.match(/([\d\.]+)\s*(?:Lacs|Lakh|LPA|PA)/i);
  if (singleLacMatch) {
    const val = Math.round(parseFloat(singleLacMatch[1]) * 100000);
    return { salaryMin: val, salaryMax: val, rawText: clean };
  }

  return { rawText: clean };
}

// ══════════════════════════════════════════════════
// EXPERIENCE PARSER ("2-5 Yrs" ➔ 2.0, 5.0)
// ══════════════════════════════════════════════════
export function parseExperience(expStr: string | null | undefined): ParsedExperience {
  if (!expStr) {
    return { rawText: 'Not specified' };
  }

  const clean = expStr.trim();

  // Pattern: "2-5 Yrs" or "0-1 Yrs" or "3-5 years"
  const rangeMatch = clean.match(/([\d\.]+)\s*-\s*([\d\.]+)/);
  if (rangeMatch) {
    return {
      experienceMin: parseFloat(rangeMatch[1]),
      experienceMax: parseFloat(rangeMatch[2]),
      rawText: clean,
    };
  }

  // Pattern: "5+ Yrs"
  const plusMatch = clean.match(/([\d\.]+)\+/);
  if (plusMatch) {
    return {
      experienceMin: parseFloat(plusMatch[1]),
      rawText: clean,
    };
  }

  return { rawText: clean };
}

// ══════════════════════════════════════════════════
// NAUKRI SEARCH URL BUILDER
// ══════════════════════════════════════════════════
export function buildNaukriSearchUrl(params: {
  keyword: string;
  location?: string;
  experience?: number;
  page?: number;
}): string {
  // Format: https://www.naukri.com/react-developer-jobs-in-bangalore?k=react%20developer&l=bangalore&experience=3&pageNo=1
  const searchKeyword = encodeURIComponent(params.keyword.trim());
  const baseUrl = `https://www.naukri.com/${params.keyword.toLowerCase().replace(/\s+/g, '-')}-jobs`;

  const queryParams = new URLSearchParams();
  queryParams.append('k', params.keyword);

  if (params.location && params.location.toLowerCase() !== 'remote') {
    queryParams.append('l', params.location);
  }

  if (params.experience !== undefined && params.experience !== null) {
    queryParams.append('experience', Math.floor(params.experience).toString());
  }

  if (params.page && params.page > 1) {
    queryParams.append('pageNo', params.page.toString());
  }

  return `${baseUrl}?${queryParams.toString()}`;
}

export function parsePostedDate(value: unknown): Date | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  if (value instanceof Date) {
    return isNaN(value.getTime()) ? undefined : value;
  }

  if (typeof value === 'number') {
    const timestamp = value < 100000000000 ? value * 1000 : value;
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? undefined : date;
  }

  const text = String(value).trim();

  if (!text) {
    return undefined;
  }

  if (/^\d{10,13}$/.test(text)) {
    const numericValue = Number(text);
    const timestamp = text.length === 10 ? numericValue * 1000 : numericValue;
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? undefined : date;
  }

  const now = new Date();
  const lower = text.toLowerCase();

  if (
    lower === 'today' ||
    lower === 'just now' ||
    lower.includes('few hours ago') ||
    lower.includes('hour ago') ||
    lower.includes('hours ago')
  ) {
    return now;
  }

  const minutes = lower.match(/(\d+)\s*(?:minute|min)s?\s*ago/i);
  if (minutes) {
    return new Date(now.getTime() - Number(minutes[1]) * 60 * 1000);
  }

  const hours = lower.match(/(\d+)\s*hours?\s*ago/i);
  if (hours) {
    return new Date(now.getTime() - Number(hours[1]) * 60 * 60 * 1000);
  }

  const days = lower.match(/(\d+)\s*days?\s*ago/i);
  if (days) {
    return new Date(now.getTime() - Number(days[1]) * 24 * 60 * 60 * 1000);
  }

  const weeks = lower.match(/(\d+)\s*weeks?\s*ago/i);
  if (weeks) {
    return new Date(now.getTime() - Number(weeks[1]) * 7 * 24 * 60 * 60 * 1000);
  }

  const parsed = new Date(text);

  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return undefined;
}
