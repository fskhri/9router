import { NextResponse } from "next/server";
import {
  getSystemPrompts,
  createSystemPrompt,
} from "@/lib/db/repos/systemPromptsRepo";

export async function GET() {
  try {
    const prompts = await getSystemPrompts();
    return NextResponse.json({ prompts });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    
    if (!data.name || !data.modelPattern || !data.prompt) {
      return NextResponse.json(
        { error: "name, modelPattern, and prompt are required" },
        { status: 400 }
      );
    }

    const prompt = await createSystemPrompt(data);
    return NextResponse.json({ prompt }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
