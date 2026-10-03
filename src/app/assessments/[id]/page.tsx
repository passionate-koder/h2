import { AssessmentRunner } from "@/components/assessment-runner";
export default async function AssessmentPage({params}:{params:Promise<{id:string}>}){const {id}=await params;return <main id="page-content" className="mx-auto max-w-3xl p-8"><AssessmentRunner id={id}/></main>}
