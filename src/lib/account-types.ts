export type AccountRole = "student" | "professional";
export type AccountProfile = {
  learnerSegment?: "student" | "recent_graduate" | "career_switcher";
  educationLevel?: string;
  experienceLevel?: string;
  interests?: string[];
  desiredRole?: string;
  desiredIndustry?: string;
  careerGoals?: string;
  availability?: string;
  visibility?: "private" | "public";
  role: AccountRole;
  uid: string;
  email: string;
  fullName: string;
  gender: string;
  phone: string;
  city: string;
  profileType: "student" | "working_professional";
  professionalCategory: string;
  organization: string;
  website: string;
  pitch: string;
  jobTitle: string;
  college: string;
  collegeCity: string;
  degree: string;
  yearOfStudy: string;
  graduationYear: string;
  skills: string[];
  links: Record<string, string>;
  transactional: boolean;
  promotional: boolean;
  createdAt: string;
  updatedAt: string;
  resumeName: string;
  resumeData?: string;
  details: Record<string, string>;
};
export type Registration = {
  id?: string;
  slug: string;
  name: string;
  registeredAt: string;
  answers: Record<string, string>;
  status: "registered";
};
export type AccountStore = {
  profile: AccountProfile;
  history?: LearnerHistory;
  registrations: Registration[];
  auditEvents?: { id: string; userId: string; action: string; createdAt: string }[];
  activeRoleAssignmentId?: string;
  hostInquiries?: {
    id: string;
    createdAt: string;
    details: Record<string, string>;
  }[];
};
export type RegistrationQuestion = {
  id: string;
  type: string;
  label: string;
  description: string | null;
  required: boolean;
  options: string[];
  order: number;
  get_from_profile_key: string | null;
};
export type RegistrationProgram = {
  slug: string;
  name: string;
  tagline: string;
  color: string;
  participants: number;
  open: boolean;
  questions: RegistrationQuestion[];
};

export type Education = { id: string; institution: string; qualification: string; startDate?: string; endDate?: string };
export type Experience = { id: string; organization: string; title: string; startDate?: string; endDate?: string };
export type Project = { id: string; title: string; description: string; url?: string };
export type AuditEvent = { id: string; userId: string; action: string; createdAt: string };

export type LearnerHistory = { educations: Education[]; experiences: Experience[]; projects: Project[] };
export type ProfileVisibility = { visibility: "private" | "public" };
export type NotificationPreferences = { transactional: boolean; promotional: boolean };
