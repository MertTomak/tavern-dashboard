import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { clearDemoData } from "@/lib/db/queries/demo";

export function DELETE() {
  try {
    const removed = clearDemoData();
    revalidatePath("/", "layout");
    return NextResponse.json(removed);
  } catch {
    return NextResponse.json({ error: "Demo verisi silinemedi." }, { status: 500 });
  }
}
