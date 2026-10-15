import { NextResponse } from "next/server";
import { getSystemPromptForModel } from "@/lib/db/repos/systemPromptsRepo";
import { getApiKeys } from "@/lib/localDb";
import { UPDATER_CONFIG } from "@/shared/constants/config";
import { getConsistentMachineId } from "@/shared/utils/machineId";

const CLI_TOKEN_SALT = "9r-cli-auth";

async function getInternalHeaders() {
  let apiKey = null;
  try {
    const keys = await getApiKeys();
    const activeKeys = keys.filter((k) => k.isActive !== false);
    apiKey = (activeKeys.find((k) => !k.access?.restricted) || activeKeys[0])?.key || null;
  } catch {}

  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
  try {
    headers["x-9r-cli-token"] = await getConsistentMachineId(CLI_TOKEN_SALT);
  } catch {}
  return headers;
}

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
    if (systemPromptConfig && systemPromptConfig.prompt) {
      if (finalMessages[0]?.role === "system") {
        finalMessages[0] = {
          ...finalMessages[0],
          content: systemPromptConfig.prompt + "\n\n" + finalMessages[0].content,
        };
      } else {
        finalMessages.unshift({
          role: "system",
          content: systemPromptConfig.prompt,
        });
      }
    }

    // Call internal chat completions endpoint
    const port = process.env.PORT || UPDATER_CONFIG?.appPort || 20128;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://127.0.0.1:${port}`;
    const headers = await getInternalHeaders();

    const response = await fetch(`${baseUrl}/api/v1/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: finalMessages,
        stream: false,
        ...rest,
      }),
    });

    const rawText = await response.text();
    let data = null;
    try {
      data = JSON.parse(rawText);
    } catch {
      data = { error: rawText };
    }

    if (!response.ok) {
      const errMsg =
        data?.error?.message ||
        (typeof data?.error === "string" ? data.error : null) ||
        data?.message ||
        `HTTP ${response.status}: ${rawText.slice(0, 300)}`;
      return NextResponse.json({ error: errMsg }, { status: response.status });
    }

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
