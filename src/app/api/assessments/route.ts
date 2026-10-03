import { z } from "zod";
import { NextResponse } from "next/server";
import { getIdentity, validOrigin } from "@/lib/accounts";
import { HttpError, readJson, safeRoute } from "@/lib/identity/http";
import { required } from "@/lib/events/store";
import { assessmentInfo, createAssessment, getAttempt, integrityEvent, listAssessments, publishAssessment, reviewAttempt, saveAnswers, startAttempt, submitAttempt } from "@/lib/events/assessments";
const id=z.uuid(),date=z.iso.datetime({offset:true}),text=z.string().trim().min(1).max(5000);
const question=z.object({id,prompt:text,type:z.enum(["single","multi"]),options:z.array(z.object({id,text})).min(2).max(10),correct:z.array(id).min(1),points:z.number().int().min(1).max(100)});
const schema=z.discriminatedUnion("action",[
  z.object({action:z.literal("create"),competitionId:id,title:text,instructions:text,disclosure:text,durationSeconds:z.number().int().min(30).max(14400),maxAttempts:z.number().int().min(1).max(10),opensAt:date,closesAt:date,questions:z.array(question).min(1).max(100)}),
  z.object({action:z.literal("publish"),id}),z.object({action:z.literal("start"),id,consent:z.literal(true)}),z.object({action:z.literal("save"),id,answers:z.record(id,z.array(id).max(10))}),z.object({action:z.literal("submit"),id}),z.object({action:z.literal("integrity"),id,type:z.enum(["blur","focus","connection_change"])})
]);
export const GET=safeRoute("assessments.get",async(request:Request)=>{ const user=required(await getIdentity()),url=new URL(request.url),id=url.searchParams.get("id"); if(!id) throw new HttpError("Assessment ID required.",400); const kind=url.searchParams.get("kind"); return NextResponse.json(kind==="attempt"?{attempt:await getAttempt(user,id)}:kind==="review"?{review:await reviewAttempt(user,id)}:kind==="list"?{assessments:await listAssessments(user,id)}:{assessment:await assessmentInfo(user,id)}); });
export const POST=safeRoute("assessments.post",async(request:Request)=>{ const user=required(await getIdentity()); if(!validOrigin(request)) throw new HttpError("Invalid request.",403); const p=schema.safeParse(await readJson(request)); if(!p.success) throw new HttpError("Invalid assessment request.",400); const d=p.data; let result:unknown;
  switch(d.action){case "create": {const {action:_action,competitionId,...input}=d; void _action; result=await createAssessment(user,competitionId,input); break;} case "publish": result=await publishAssessment(user,d.id);break;case "start":result=await startAttempt(user,d.id,d.consent);break;case "save":result=await saveAnswers(user,d.id,d.answers);break;case "submit":result=await submitAttempt(user,d.id);break;case "integrity":result=await integrityEvent(user,d.id,d.type);break;}
  return NextResponse.json({result}); });
