import { z } from "zod";
import { NextResponse } from "next/server";
import { getIdentity, validOrigin } from "@/lib/accounts";
import { HttpError, readJson, safeRoute } from "@/lib/identity/http";
import { createOrganization, updateOrganization, myOrganizations, privateOrganization, invite, acceptInvitation, changeRole, removeMember, addEvidence, submitVerification, reviewQueue, reviewVerification } from "@/lib/events/organizations";
import { required } from "@/lib/events/store";

const id=z.string().uuid(); const text=z.string().trim().min(1).max(200);
const httpUrl=z.url().max(2000).refine(x=>/^https?:\/\//i.test(x));
const role=z.enum(["owner","billing_admin","hiring_manager","event_manager","evaluator","content_editor","analyst","viewer"]);
const schema=z.discriminatedUnion("action",[
  z.object({action:z.literal("create"),legalName:text,name:text,type:z.enum(["employer","organizer","college","NGO","partner"]),country:text,jurisdiction:text,registrationId:z.string().max(200).optional(),address:z.string().max(500).optional(),website:httpUrl.optional(),description:z.string().max(5000).optional()}),
  z.object({action:z.literal("invite"),organizationId:id,email:z.email().max(254),role}),
  z.object({action:z.literal("update"),organizationId:id,changes:z.object({legalName:text.optional(),name:text.optional(),country:text.optional(),jurisdiction:text.optional(),registrationId:text.optional(),address:z.string().max(500).optional(),website:httpUrl.optional(),description:z.string().max(5000).optional()}).partial()}),
  z.object({action:z.literal("accept"),token:z.string().regex(/^[a-f0-9]{64}$/)}),
  z.object({action:z.literal("role"),organizationId:id,memberId:id,role}),
  z.object({action:z.literal("remove"),organizationId:id,memberId:id}),
  z.object({action:z.literal("evidence"),organizationId:id,category:text,filename:text,mimeType:text,contentBase64:z.string().max(13_400_000)}),
  z.object({action:z.literal("submit"),organizationId:id}),
  z.object({action:z.literal("review"),caseId:id,decision:z.enum(["in_review","approved","rejected","needs_changes"]),reason:z.string().max(2000).optional()}),
]);
export const GET=safeRoute("organizations.get",async(request:Request)=>{ const identity=required(await getIdentity()); const url=new URL(request.url); const kind=url.searchParams.get("kind"); if(kind==="review") return NextResponse.json({cases:await reviewQueue(identity)}); const organizationId=url.searchParams.get("id"); return NextResponse.json(organizationId?await privateOrganization(identity,organizationId):{organizations:await myOrganizations(identity)}); });
export const POST=safeRoute("organizations.post",async(request:Request)=>{ const identity=required(await getIdentity()); if(!validOrigin(request)) throw new HttpError("Invalid request.",403); const parsed=schema.safeParse(await readJson(request,13_500_000)); if(!parsed.success) throw new HttpError("Invalid organization request.",400); const data=parsed.data; let result:unknown;
  switch(data.action){
    case "create": { const {action: _action,...input}=data; void _action; result=await createOrganization(identity,input); break; }
    case "invite": result=await invite(identity,data.organizationId,data.email,data.role); break;
    case "update": result=await updateOrganization(identity,data.organizationId,data.changes); break;
    case "accept": result={organizationId:await acceptInvitation(identity,data.token)}; break;
    case "role": result=await changeRole(identity,data.organizationId,data.memberId,data.role); break;
    case "remove": result=await removeMember(identity,data.organizationId,data.memberId); break;
    case "evidence": result=await addEvidence(identity,data.organizationId,data); break;
    case "submit": result=await submitVerification(identity,data.organizationId); break;
    case "review": result=await reviewVerification(identity,data.caseId,data.decision,data.reason); break;
  } return NextResponse.json({result}); });
