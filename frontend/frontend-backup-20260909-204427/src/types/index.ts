export interface User {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt?: string;
  hasProfile?: boolean;
  hasPreferences?: boolean;
}

export interface AuthResponse {
  message: string;
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface Education {
  degree: string;
  institution?: string;
  university?: string;
  fieldOfStudy?: string;
  year: number;
  percentage?: number;
}

export interface Profile {
  id: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  currentCompany?: string;
  currentTitle?: string;
  experience?: number;
  experienceYears?: number;
  currentCtc?: number;
  expectedCtc?: number;
  noticePeriod?: string;
  skills: string[];
  education?: Education;
  certifications: string[];
  location?: string;
  currentCity?: string;
  preferredCities: string[];
  willingToRelocate: boolean;
  resumeUrl?: string;
  resumeText?: string;
  naukriProfileUrl?: string;
}

export interface JobPreference {
  id: string;
  jobTitles: string[];
  keywords: string[];
  locations: string[];
  experienceMin?: number;
  experienceMax?: number;
  salaryMin?: number;
  salaryMax?: number;
  jobTypes: string[];
  industries: string[];
  companySizes: string[];
  excludedCompanies: string[];
  excludedKeywords: string[];
  blacklistJobIds?: string[];
  isActive: boolean;
  maxApplicationsPerDay: number;
  matchScoreThreshold: number;
  cronExpression?: string;
}

export interface ProfileCompletion {
  completion: number;
  filled: number;
  total: number;
  missing: string[];
}
