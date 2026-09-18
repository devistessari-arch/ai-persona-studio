import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(_:Request,{params}:{params:Promise<{id:string}>}) {
 const {id}=await params;
 const selected=await db.referenceImage.findUnique({where:{id}});
 if(!selected||selected.type!=="BODY_CANDIDATE")return NextResponse.json({error:"Body candidate not found"},{status:404});
 await db.$transaction([
  db.referenceImage.updateMany({where:{personaId:selected.personaId,type:{in:["BODY_CANDIDATE","BODY_MASTER"]}},data:{review:"REJECTED"}}),
  db.referenceImage.update({where:{id},data:{type:"BODY_MASTER",review:"APPROVED"}})
 ]);
 return NextResponse.json({ok:true,bodyMasterId:id});
}
