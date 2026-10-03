import { z } from "zod";
const text = z.string().max(10000);
const link = z.string().max(2000).refine(v => !v || /^https?:\/\/[^\s]+$/i.test(v), "Links must begin with https:// or http://.");
export const onboardingSchema = z.object({
  learnerSegment: z.enum(["student", "recent_graduate", "career_switcher"]),
  city: z.string().trim().min(1).max(500), educationLevel: z.string().trim().min(1).max(500),
  experienceLevel: z.string().trim().min(1).max(500), interests: z.array(z.string().trim().min(1).max(100)).max(50),
  skills: z.array(z.string().trim().min(1).max(100)).max(100), desiredRole: z.string().trim().min(1).max(500),
  desiredIndustry: z.string().trim().min(1).max(500), careerGoals: z.string().trim().min(1).max(5000), availability: z.string().trim().min(1).max(500),
});
export const profilePatchSchema = z.object({
  fullName: z.string().trim().min(1).max(120), gender: text, phone: text, city: text,
  profileType: z.enum(["student", "working_professional"]), professionalCategory: text,
  organization: text, website: link, pitch: text, jobTitle: text, college: text, collegeCity: text,
  degree: text, yearOfStudy: text, graduationYear: text, resumeName: text,
  resumeData: z.string().max(7000000).refine(v => !v || /^data:application\/pdf;base64,[A-Za-z0-9+/=]+$/.test(v), "Please upload a PDF resume."),
  skills: onboardingSchema.shape.skills, links: z.record(z.string().max(100), link),
  details: z.record(z.string().max(100), text), transactional: z.boolean(), promotional: z.boolean(),
  learnerSegment: onboardingSchema.shape.learnerSegment, educationLevel: text, experienceLevel: text,
  interests: onboardingSchema.shape.interests, desiredRole: text, desiredIndustry: text,
  careerGoals: z.string().max(5000), availability: text, visibility: z.enum(["private", "public"]),
}).partial().strip();
export const authSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("logout") }),
  z.object({ action: z.literal("signin"), email: z.string().email().max(254), password: z.string().min(1).max(256) }),
  z.object({ action: z.literal("signup"), email: z.string().email().max(254), password: z.string().min(8).max(256), name: z.string().trim().min(1).max(120) }),
  z.object({ action: z.literal("reset"), email: z.string().email().max(254) }),
  z.object({ action: z.literal("verify"), email: z.string().email().max(254) }),
  z.object({ action: z.literal("update-password"), password: z.string().min(8).max(256) }),
]);
