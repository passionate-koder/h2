import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { identityConfig } from "./config";
import { HttpError } from "./http";
export async function saveAnonymousInquiry(inquiry: { id: string; createdAt: string; details: Record<string,string> }) {
  if (identityConfig().mode !== "local") throw new HttpError("Please sign in to submit a hosting inquiry.", 401);
  const root = path.join(process.cwd(), ".local-data", "inquiries");
  await fs.mkdir(root, { recursive: true });
  await fs.writeFile(path.join(root, inquiry.id + ".json"), JSON.stringify(inquiry));
}
