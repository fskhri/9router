import { NextResponse } from "next/server";
import { getSystemPromptForModel } from "@/lib/db/repos/systemPromptsRepo";

export async function POST(request) {
  try {
    const { model, messages, ...rest } = await request.json();

    if (!model || !messages) {
      return NextResponse.json(
        { error: "model and messages are required" },
        { status: 400 }
      );
    }

    // Find matching system prompt for model
    const systemPromptConfig = await getSystemPromptForModel(model);
    
    // Inject system prompt if found
    let finalMessages = [...messages];
    if (systemPromptConfig) {
      // Check if first message is already a system message
      if (finalMessages[0]?.role === "system") {
        // Prepend to existing system message
        finalMessages[0] = {
          ...finalMessages[0],
          content: systemPromptConfig.prompt + "\n\n" + finalMessages[0].content,
        };
      } else {
        // Add new system message at the beginning
        finalMessages.unshift({
          role: "system",
          content: systemPromptConfig.prompt,
        });
      }
    }

    // Call the actual chat endpoint
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 20127}`;
    const response = await fetch(`${baseUrl}/api/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: finalMessages,
        stream: false,
        ...rest,
      }),
    });

    const data = await response.json();
    
    return NextResponse.json({
      ...data,
      _injectedSystemPrompt: systemPromptConfig ? {
        id: systemPromptConfig.id,
        name: systemPromptConfig.name,
        modelPattern: systemPromptConfig.modelPattern,
      } : null,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
