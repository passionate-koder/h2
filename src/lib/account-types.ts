export type AccountRole = "student" | "professional";
export type AccountProfile = {
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
  registrations: Registration[];
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
