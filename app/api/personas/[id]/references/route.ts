import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const references=await db.referenceImage.findMany({where:{personaId:id},orderBy:{createdAt:"asc"}});
  const generations=await db.generation.findMany({where:{personaId:id,status:{in:["QUEUED","PROCESSING"]}},select:{id:true,status:true}});
  return NextResponse.json({references,pendingGenerations:generations.length});
}
