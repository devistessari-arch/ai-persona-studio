import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const body=await request.json();
  if(!["APPROVED","REJECTED"].includes(body.review)) return NextResponse.json({error:"Invalid review"},{status:400});
  const reference=await db.referenceImage.update({where:{id},data:{review:body.review}});
  return NextResponse.json(reference);
}
