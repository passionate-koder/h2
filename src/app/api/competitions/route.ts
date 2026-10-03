import { z } from "zod";
import { NextResponse } from "next/server";
import { getIdentity, validOrigin } from "@/lib/accounts";
import { HttpError, readJson, safeRoute } from "@/lib/identity/http";
import { required } from "@/lib/events/store";
import { assignJudge, createCompetition, createTeam, eventWorkspace, inviteTeam, joinTeam, judgeWorkspace, listPublicCompetitions, myCompetitions, myEventData, publicCompetition, publishCompetition, publishResults, register, score, submitProject, updateCompetition } from "@/lib/events/competitions";
const id=z.uuid(); const text=z.string().trim().min(1).max(5000); const date=z.iso.datetime({offset:true});
const httpUrl=z.url().max(2000).refine(x=>/^https?:\/\//i.test(x));
const criterion=z.object({id:z.uuid(),name:text,max:z.number().int().positive().max(1000)});
const fields=z.object({title:text,description:text,format:z.enum(["online","in-person","hybrid"]),location:z.string().max(500).optional(),registrationOpensAt:date,registrationClosesAt:date,startsAt:date,endsAt:date,teamDeadline:date,submissionDeadline:date,capacity:z.number().int().min(1).max(100000),minTeamSize:z.number().int().min(1).max(20),maxTeamSize:z.number().int().min(1).max(20),eligibility:z.string().max(2000).optional(),eligibleRoles:z.array(z.enum(["student","professional"])).max(2).optional(),problemStatements:z.array(text).max(50),prizes:z.array(text).max(50),faqs:z.array(text).max(50),resources:z.array(httpUrl).max(50),rounds:z.array(z.object({id, name:text,type:z.enum(["registration","submission","assessment","shortlist","judging"]),opensAt:date,closesAt:date})).max(30),criteria:z.array(criterion).max(30)});
const schema=z.discriminatedUnion("action",[
  fields.extend({action:z.literal("create"),organizationId:id}),
  z.object({action:z.literal("update"),id,changes:fields.pick({title:true,description:true,location:true,capacity:true,eligibility:true,eligibleRoles:true,problemStatements:true,prizes:true,faqs:true,resources:true,rounds:true,criteria:true}).partial()}),
  z.object({action:z.literal("publish"),id}),
  z.object({action:z.literal("register"),id,attendance:z.enum(["online","in-person"]).optional()}),
  z.object({action:z.literal("team"),id,name:text}),
  z.object({action:z.literal("invite"),teamId:id,email:z.email()}),
  z.object({action:z.literal("join"),token:z.string().regex(/^[a-f0-9]{64}$/)}),
  z.object({action:z.literal("submit"),teamId:id,problemIndex:z.number().int().min(0),name:text,description:text,repositoryUrl:httpUrl.optional(),demoUrl:httpUrl.optional()}),
  z.object({action:z.literal("assign"),submissionId:id,judgeId:id}),
  z.object({action:z.literal("score"),submissionId:id,criterionId:id,value:z.number().min(0),feedback:z.string().max(5000),finalize:z.boolean()}),
  z.object({action:z.literal("results"),id}),
]);
export const GET=safeRoute("competitions.get",async(request:Request)=>{ const url=new URL(request.url),kind=url.searchParams.get("kind"),id=url.searchParams.get("id"),slug=url.searchParams.get("slug"); if(kind==="public") return NextResponse.json(slug?{competition:await publicCompetition(slug)}:{competitions:await listPublicCompetitions()}); const user=required(await getIdentity()); if(kind==="workspace" && id) return NextResponse.json(await eventWorkspace(user,id)); if(kind==="export" && id){const workspace=await eventWorkspace(user,id);const cell=(v:unknown)=>`"${String(v??"").replaceAll('"','""').replace(/^[=+\-@]/,"'$&")}"`;const rows=[["reference","project","team_id","submitted_at","score"],...workspace.submissions.map(x=>[x.reference,x.name,x.teamId,x.at,workspace.ranking.find(r=>r.submissionId===x.id)?.total??0])];return new Response(rows.map(row=>row.map(cell).join(",")).join("\r\n"),{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":`attachment; filename="competition-${id}.csv"`}})} if(kind==="mine" && id) return NextResponse.json(await myEventData(user,id)); if(kind==="judge") return NextResponse.json({assignments:await judgeWorkspace(user)}); return NextResponse.json({competitions:await myCompetitions(user)}); });
export const POST=safeRoute("competitions.post",async(request:Request)=>{ const user=required(await getIdentity()); if(!validOrigin(request)) throw new HttpError("Invalid request.",403); const p=schema.safeParse(await readJson(request)); if(!p.success) throw new HttpError("Invalid competition request.",400); const d=p.data; let result:unknown;
  switch(d.action){
    case "create": { const {action: _action,organizationId,...input}=d; void _action; result=await createCompetition(user,organizationId,input); break; }
    case "update": result=await updateCompetition(user,d.id,d.changes); break;
    case "publish": result=await publishCompetition(user,d.id); break;
    case "register": result=await register(user,d.id,d.attendance); break;
    case "team": result=await createTeam(user,d.id,d.name); break;
    case "invite": result=await inviteTeam(user,d.teamId,d.email); break;
    case "join": result=await joinTeam(user,d.token); break;
    case "submit": { const {action: _action,teamId,...input}=d; void _action; result=await submitProject(user,teamId,input); break; }
    case "assign": result=await assignJudge(user,d.submissionId,d.judgeId); break;
    case "score": result=await score(user,d.submissionId,d.criterionId,d.value,d.feedback,d.finalize); break;
    case "results": result=await publishResults(user,d.id); break;
  } return NextResponse.json({result}); });
