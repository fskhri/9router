import { NextResponse } from "next/server";
import {
  getSystemPromptById,
  updateSystemPrompt,
  deleteSystemPrompt,
} from "@/lib/db/repos/systemPromptsRepo";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const prompt = await getSystemPromptById(id);
    if (!prompt) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ prompt });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const data = await request.json();
    const prompt = await updateSystemPrompt(id, data);
    if (!prompt) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ prompt });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const deleted = await deleteSystemPrompt(id);
    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
