export type OpportunityType = "job" | "internship" | "hackathon" | "ngo_challenge" | "college_program";
export type OpportunityStatus = "draft" | "in_review" | "published" | "closed" | "archived";
export type WorkMode = "remote" | "hybrid" | "onsite";
export type QuestionType = "text" | "textarea" | "select" | "radio" | "url" | "number" | "boolean";
export type ApplicationStatus = "draft" | "submitted" | "reviewing" | "shortlisted" | "rejected" | "withdrawn" | "accepted";

export type EligibilityRules = {
  countries?: string[];
  learnerSegments?: string[];
  educationLevels?: string[];
  graduationYears?: string[];
  requiredSkills?: string[];
  minExperienceYears?: number;
};

export type Organization = { id: string; name: string; slug: string; verified: boolean };
export type ApplicationQuestion = { id: string; label: string; type: QuestionType; required: boolean; options: string[]; order: number; active: boolean };
export type Opportunity = {
  id: string; slug: string; title: string; type: OpportunityType; summary: string; description: string;
  organization: Organization; status: OpportunityStatus; category: string; skills: string[];
  country: string; city: string; location: string; workMode: WorkMode;
  compensationMinMinor?: number; compensationMaxMinor?: number; currency?: string;
  duration?: string; eligibility: EligibilityRules; deadline?: string; startAt?: string; endAt?: string;
  capacity?: number; benefits: string[]; faqs: { question: string; answer: string }[];
  schedule: { label: string; at?: string; description?: string }[]; questions: ApplicationQuestion[];
  allowWithdrawal: boolean; publishedAt?: string; createdAt: string; updatedAt: string; source?: string;
};

export type OpportunityQuery = {
  q?: string; types: OpportunityType[]; categories: string[]; skills: string[]; location?: string;
  modes: WorkMode[]; compensation: "any" | "paid" | "unpaid"; duration?: string;
  eligibility: "any" | "eligible"; deadline: "open" | "upcoming" | "all"; page: number; pageSize: number;
};

export type ProfileSnapshot = { fullName: string; email: string; city: string; skills: string[]; educationLevel?: string; experienceLevel?: string; learnerSegment?: string; graduationYear?: string; resumeName: string };
export type ApplicationHistory = { id: string; previousStatus: ApplicationStatus | null; newStatus: ApplicationStatus; actorId: string; reason?: string; createdAt: string };
export type EmployerNote = { id: string; authorId: string; body: string; createdAt: string };
export type Application = {
  id: string; reference: string; opportunityId: string; opportunitySlug: string; opportunityTitle: string;
  applicantId: string; status: ApplicationStatus; answers: Record<string, string>; profileSnapshot: ProfileSnapshot;
  submittedAt?: string; withdrawnAt?: string; createdAt: string; updatedAt: string;
  history: ApplicationHistory[]; ownerId?: string; notes?: EmployerNote[];
};

export type MarketplaceStore = { saved: { userId: string; opportunityId: string; createdAt: string }[]; applications: Application[] };
