"use client";

import { useEffect, useState } from "react";

export default function PromptsPageClient() {
  const [activeTab, setActiveTab] = useState("library"); // "library" | "playground"
  const [prompts, setPrompts] = useState([]);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    modelPattern: "",
    prompt: "",
    isActive: true,
    priority: 0,
  });

  // Playground state
  const [selectedModel, setSelectedModel] = useState("");
  const [testPrompt, setTestPrompt] = useState("");
  const [playgroundOutput, setPlaygroundOutput] = useState("");
  const [playgroundLoading, setPlaygroundLoading] = useState(false);
  const [injectedInfo, setInjectedInfo] = useState(null);

  // Fetch prompts and models
  useEffect(() => {
    fetchPrompts();
    fetchModels();
  }, []);

  async function fetchPrompts() {
    try {
      const res = await fetch("/api/system-prompts");
      const data = await res.json();
      setPrompts(data.prompts || []);
    } catch (e) {
      console.error("Failed to fetch prompts", e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchModels() {
    try {
      const res = await fetch("/api/v1/models");
      const data = await res.json();
      const modelList = data.data?.map((m) => m.id) || [];
      setModels(modelList);
      if (modelList.length > 0 && !selectedModel) {
        setSelectedModel(modelList[0]);
      }
    } catch (e) {
      console.error("Failed to fetch models", e);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editingId) {
        await fetch(`/api/system-prompts/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
      } else {
        await fetch("/api/system-prompts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
      }
      setEditingId(null);
      setFormData({ name: "", modelPattern: "", prompt: "", isActive: true, priority: 0 });
      fetchPrompts();
    } catch (e) {
      console.error("Failed to save prompt", e);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Are you sure?")) return;
    try {
      await fetch(`/api/system-prompts/${id}`, { method: "DELETE" });
      fetchPrompts();
    } catch (e) {
      console.error("Failed to delete", e);
    }
  }

  function handleEdit(p) {
    setEditingId(p.id);
    setFormData({
      name: p.name,
      modelPattern: p.modelPattern,
      prompt: p.prompt,
      isActive: p.isActive,
      priority: p.priority,
    });
  }

  async function handleTestPlayground() {
    if (!selectedModel || !testPrompt) return;
    setPlaygroundLoading(true);
    setPlaygroundOutput("");
    setInjectedInfo(null);

    try {
      const res = await fetch("/api/playground", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedModel,
          messages: [{ role: "user", content: testPrompt }],
        }),
      });
      const data = await res.json();
      
      if (data.error) {
        setPlaygroundOutput(`Error: ${data.error}`);
      } else {
        const text = data.choices?.[0]?.message?.content || JSON.stringify(data);
        setPlaygroundOutput(text);
        setInjectedInfo(data._injectedSystemPrompt);
      }
    } catch (e) {
      setPlaygroundOutput(`Failed: ${e.message}`);
    } finally {
      setPlaygroundLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">System Prompt & Playground</h1>
        <p className="text-sm text-gray-400">
          Satu jailbreak / persona per model. Test 1 model 1 per 1 di playground.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-800 pb-2">
        <button
          onClick={() => setActiveTab("library")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "library"
              ? "bg-amber-600 text-white"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Library
        </button>
        <button
          onClick={() => setActiveTab("playground")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "playground"
              ? "bg-amber-600 text-white"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Playground
        </button>
      </div>

      {/* Library View */}
      {activeTab === "library" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Form */}
          <div className="md:col-span-1 bg-gray-900 border border-gray-800 rounded-xl p-5 h-fit space-y-4">
            <h2 className="text-lg font-semibold text-white">
              {editingId ? "Edit Persona" : "New Persona"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400">Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mimo Uncensored"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400">Model Pattern (Regex / Keyword)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. mimo or .*mimo.*"
                  value={formData.modelPattern}
                  onChange={(e) => setFormData({ ...formData, modelPattern: e.target.value })}
                  className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400">Priority (Higher = matches first)</label>
                <input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                  className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400">System Prompt (Jailbreak)</label>
                <textarea
                  required
                  rows={6}
                  placeholder="Paste jailbreak / system prompt here..."
                  value={formData.prompt}
                  onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                  className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded bg-gray-800 border-gray-700 text-amber-600 focus:ring-0"
                />
                <label htmlFor="isActive" className="text-xs text-gray-300">
                  Active (Auto-injected)
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg py-2 text-sm font-medium transition-colors"
                >
                  {editingId ? "Update" : "Save"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setFormData({ name: "", modelPattern: "", prompt: "", isActive: true, priority: 0 });
                    }}
                    className="px-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* List */}
          <div className="md:col-span-2 space-y-4">
            <h2 className="text-lg font-semibold text-white">Configured Personas</h2>
            {loading ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : prompts.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500 text-sm">
                No system prompts configured. Add one on the left.
              </div>
            ) : (
              prompts.map((p) => (
                <div
                  key={p.id}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{p.name}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full ${
                            p.isActive
                              ? "bg-green-500/10 text-green-400 border border-green-500/20"
                              : "bg-gray-800 text-gray-500"
                          }`}
                        >
                          {p.isActive ? "ACTIVE" : "DISABLED"}
                        </span>
                      </div>
                      <p className="text-xs text-amber-500 mt-1 font-mono">
                        Pattern: {p.modelPattern}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(p)}
                        className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-2 py-1 rounded"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="text-xs bg-red-950/40 hover:bg-red-900 text-red-400 px-2 py-1 rounded border border-red-800/40"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="bg-gray-950 p-3 rounded-lg border border-gray-800/60 font-mono text-xs text-gray-400 max-h-24 overflow-y-auto whitespace-pre-wrap">
                    {p.prompt}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Playground View */}
      {activeTab === "playground" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Controls */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <h2 className="text-lg font-semibold text-white">Test Single Model</h2>
            
            <div>
              <label className="text-xs text-gray-400">Target Model</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-amber-500"
              >
                {models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400">User Message / Prompt</label>
              <textarea
                rows={6}
                placeholder="Ask something to test if the model adheres to your persona / jailbreak..."
                value={testPrompt}
                onChange={(e) => setTestPrompt(e.target.value)}
                className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              onClick={handleTestPlayground}
              disabled={playgroundLoading || !selectedModel || !testPrompt}
              className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
            >
              {playgroundLoading ? "Running Inference..." : "Send Request"}
            </button>
          </div>

          {/* Results */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4 flex flex-col">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Output</h2>
              {injectedInfo && (
                <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  Injected: {injectedInfo.name}
                </span>
              )}
            </div>

            <div className="flex-1 bg-gray-950 p-4 rounded-lg border border-gray-800 font-mono text-sm text-gray-300 min-h-[250px] overflow-y-auto whitespace-pre-wrap">
              {playgroundOutput || (
                <span className="text-gray-600 italic">
                  Run a request from the left panel to inspect raw model output...
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
