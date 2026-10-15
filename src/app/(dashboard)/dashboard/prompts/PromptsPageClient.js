"use client";

import { useEffect, useState } from "react";
import { ModelSelectModal } from "@/shared/components";

export default function PromptsPageClient() {
  const [activeTab, setActiveTab] = useState("library"); // "library" | "playground"
  const [prompts, setPrompts] = useState([]);
  const [models, setModels] = useState([]);
  const [activeProviders, setActiveProviders] = useState([]);
  const [modelAliases, setModelAliases] = useState({});
  const [loading, setLoading] = useState(true);

  // Model selector modal state (Combo-style search)
  const [showModelSelect, setShowModelSelect] = useState(false);
  const [selectTarget, setSelectTarget] = useState("form"); // "form" | "playground"

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

  // Fetch prompts, models, and providers
  useEffect(() => {
    fetchPrompts();
    fetchModels();
    fetchProviders();
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
      if (res.ok) {
        const data = await res.json();
        const modelList = data.data?.map((m) => m.id) || [];
        setModels(modelList);
        setSelectedModel((prev) => prev || (modelList.length > 0 ? modelList[0] : ""));
      }
    } catch (e) {
      console.error("Failed to fetch models", e);
    }
  }

  async function fetchProviders() {
    try {
      const [provRes, aliasRes] = await Promise.all([
        fetch("/api/providers"),
        fetch("/api/models/alias"),
      ]);
      if (provRes.ok) {
        const data = await provRes.json();
        setActiveProviders(data.connections || []);
      }
      if (aliasRes.ok) {
        const aliasData = await aliasRes.json();
        setModelAliases(aliasData.aliases || {});
      }
    } catch (e) {
      console.error("Failed to fetch providers/aliases", e);
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
      
      if (!res.ok || data.error) {
        const errorText =
          typeof data.error === "object"
            ? (data.error?.message || JSON.stringify(data.error))
            : (data.error || data.message || `Request failed (${res.status})`);
        setPlaygroundOutput(`Error: ${errorText}`);
      } else {
        const text =
          data.choices?.[0]?.message?.content ||
          data.choices?.[0]?.text ||
          (typeof data === "string" ? data : JSON.stringify(data, null, 2));
        setPlaygroundOutput(text);
        setInjectedInfo(data._injectedSystemPrompt);
      }
    } catch (e) {
      setPlaygroundOutput(`Failed: ${e.message}`);
    } finally {
      setPlaygroundLoading(false);
    }
  }

  const handleModelSelectFromModal = (model) => {
    const val = model?.value || model?.name || (typeof model === "string" ? model : "");
    if (val) {
      if (selectTarget === "form") {
        setFormData((prev) => ({ ...prev, modelPattern: val }));
      } else {
        setSelectedModel(val);
      }
    }
    setShowModelSelect(false);
  };

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

              {/* Model Pattern: Search / Dropdown / Combo Picker */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-400">Model Pattern (Regex / Keyword)</label>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectTarget("form");
                      setShowModelSelect(true);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] text-amber-500 hover:text-amber-400 transition-colors font-medium"
                    title="Open searchable model catalog like in Combo"
                  >
                    <span className="material-symbols-outlined text-[14px]">search</span>
                    <span>Search Catalog</span>
                  </button>
                </div>

                <div className="relative flex gap-1.5">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      list="available-models-datalist"
                      required
                      placeholder="e.g. mimo or .*mimo.*"
                      value={formData.modelPattern}
                      onChange={(e) => setFormData({ ...formData, modelPattern: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-2.5 pr-7 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                    <datalist id="available-models-datalist">
                      {models.map((m) => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>

                    {formData.modelPattern && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, modelPattern: "" })}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                        title="Clear"
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectTarget("form");
                      setShowModelSelect(true);
                    }}
                    className="flex items-center gap-1 px-2.5 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-amber-500/50 rounded-lg text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors shrink-0"
                    title="Search and select model from catalog"
                  >
                    <span className="material-symbols-outlined text-[16px]">manage_search</span>
                    <span>Browse</span>
                  </button>
                </div>

                {/* Dropdown Select & Quick Suggestions */}
                <div className="flex flex-col gap-1.5 pt-0.5">
                  <select
                    value={models.includes(formData.modelPattern) ? formData.modelPattern : ""}
                    onChange={(e) => {
                      if (e.target.value) {
                        setFormData({ ...formData, modelPattern: e.target.value });
                      }
                    }}
                    className="w-full bg-gray-800/80 border border-gray-700/80 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- Quick select from dropdown ({models.length} models) --</option>
                    {models.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>

                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[10px] text-gray-500">Presets:</span>
                    {["mimo", "gpt-4o", "claude-3-5", "deepseek", "gemini"].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setFormData({ ...formData, modelPattern: preset })}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-amber-400 border border-gray-700/60 transition-colors"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
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
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-gray-400">Target Model</label>
                <button
                  type="button"
                  onClick={() => {
                    setSelectTarget("playground");
                    setShowModelSelect(true);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] text-amber-500 hover:text-amber-400 transition-colors font-medium"
                >
                  <span className="material-symbols-outlined text-[14px]">search</span>
                  <span>Search Catalog</span>
                </button>
              </div>

              <div className="flex gap-1.5 items-center">
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                >
                  {!models.includes(selectedModel) && selectedModel ? (
                    <option value={selectedModel}>{selectedModel}</option>
                  ) : null}
                  {models.length === 0 ? (
                    <option value="" disabled>Loading models...</option>
                  ) : (
                    <>
                      {!selectedModel && <option value="">-- Choose a model ({models.length} available) --</option>}
                      {models.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setSelectTarget("playground");
                    setShowModelSelect(true);
                  }}
                  className="flex items-center gap-1 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-amber-500/50 rounded-lg text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors shrink-0"
                  title="Search and select model from catalog"
                >
                  <span className="material-symbols-outlined text-[16px]">manage_search</span>
                  <span>Browse</span>
                </button>
              </div>
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

      {/* Shared ModelSelectModal (Same as Combo) */}
      {showModelSelect && (
        <ModelSelectModal
          isOpen={showModelSelect}
          onClose={() => setShowModelSelect(false)}
          onSelect={handleModelSelectFromModal}
          selectedModel={selectTarget === "form" ? formData.modelPattern : selectedModel}
          activeProviders={activeProviders}
          modelAliases={modelAliases}
          title={selectTarget === "form" ? "Select Model for Persona" : "Select Target Model"}
          addedModelValues={
            selectTarget === "form" && formData.modelPattern
              ? [formData.modelPattern]
              : selectTarget === "playground" && selectedModel
              ? [selectedModel]
              : []
          }
          closeOnSelect={true}
        />
      )}
    </div>
  );
}
