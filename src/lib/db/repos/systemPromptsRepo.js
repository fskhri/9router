import { v4 as uuidv4 } from "uuid";
import { getAdapter } from "../driver.js";

function rowToPrompt(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    modelPattern: row.modelPattern,
    prompt: row.prompt,
    isActive: row.isActive === 1,
    priority: row.priority || 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getSystemPrompts() {
  const db = await getAdapter();
  const rows = db.all(`SELECT * FROM systemPrompts ORDER BY priority DESC, createdAt ASC`);
  return rows.map(rowToPrompt);
}

export async function getActiveSystemPrompts() {
  const db = await getAdapter();
  const rows = db.all(`SELECT * FROM systemPrompts WHERE isActive = 1 ORDER BY priority DESC`);
  return rows.map(rowToPrompt);
}

export async function getSystemPromptById(id) {
  const db = await getAdapter();
  const row = db.get(`SELECT * FROM systemPrompts WHERE id = ?`, [id]);
  return rowToPrompt(row);
}

export async function getSystemPromptForModel(modelName) {
  const db = await getAdapter();
  const rows = db.all(`SELECT * FROM systemPrompts WHERE isActive = 1 ORDER BY priority DESC`);
  
  for (const row of rows) {
    try {
      const pattern = new RegExp(row.modelPattern, "i");
      if (pattern.test(modelName)) {
        return rowToPrompt(row);
      }
    } catch {
      // If regex invalid, try exact match
      if (row.modelPattern.toLowerCase() === modelName.toLowerCase()) {
        return rowToPrompt(row);
      }
    }
  }
  return null;
}

export async function createSystemPrompt(data) {
  const db = await getAdapter();
  const now = new Date().toISOString();
  const prompt = {
    id: uuidv4(),
    name: data.name,
    modelPattern: data.modelPattern,
    prompt: data.prompt,
    isActive: data.isActive !== false ? 1 : 0,
    priority: data.priority || 0,
    createdAt: now,
    updatedAt: now,
  };
  db.run(
    `INSERT INTO systemPrompts(id, name, modelPattern, prompt, isActive, priority, createdAt, updatedAt) VALUES(?, ?, ?, ?, ?, ?, ?, ?)`,
    [prompt.id, prompt.name, prompt.modelPattern, prompt.prompt, prompt.isActive, prompt.priority, prompt.createdAt, prompt.updatedAt]
  );
  return { ...prompt, isActive: prompt.isActive === 1 };
}

export async function updateSystemPrompt(id, data) {
  const db = await getAdapter();
  let result = null;
  db.transaction(() => {
    const row = db.get(`SELECT * FROM systemPrompts WHERE id = ?`, [id]);
    if (!row) return;
    const current = rowToPrompt(row);
    const merged = {
      ...current,
      ...data,
      isActive: data.isActive !== undefined ? (data.isActive ? 1 : 0) : (current.isActive ? 1 : 0),
      updatedAt: new Date().toISOString(),
    };
    db.run(
      `UPDATE systemPrompts SET name = ?, modelPattern = ?, prompt = ?, isActive = ?, priority = ?, updatedAt = ? WHERE id = ?`,
      [merged.name, merged.modelPattern, merged.prompt, merged.isActive, merged.priority, merged.updatedAt, id]
    );
    result = { ...merged, isActive: merged.isActive === 1 };
  });
  return result;
}

export async function deleteSystemPrompt(id) {
  const db = await getAdapter();
  const res = db.run(`DELETE FROM systemPrompts WHERE id = ?`, [id]);
  return (res?.changes ?? 0) > 0;
}

export async function toggleSystemPrompt(id, isActive) {
  const db = await getAdapter();
  const now = new Date().toISOString();
  const res = db.run(
    `UPDATE systemPrompts SET isActive = ?, updatedAt = ? WHERE id = ?`,
    [isActive ? 1 : 0, now, id]
  );
  return (res?.changes ?? 0) > 0;
}
