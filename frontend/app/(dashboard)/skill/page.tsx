"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import s from "./skill.module.css";

const PRESET_SKILLS = [
  { id: "python",     label: "Python",             icon: "🐍", description: "Programming fundamentals to advanced patterns" },
  { id: "design",     label: "UI/UX Design",       icon: "🎨", description: "Figma, design systems, user research" },
  { id: "data",       label: "Data Analysis",      icon: "📊", description: "SQL, pandas, visualisation, statistics" },
  { id: "ml",         label: "Machine Learning",   icon: "🤖", description: "Supervised learning, neural networks, MLOps" },
  { id: "javascript", label: "JavaScript",         icon: "⚡", description: "ES6+, async patterns, browser APIs" },
  { id: "product",    label: "Product Management", icon: "🗺️", description: "Roadmapping, user stories, prioritisation" },
  { id: "writing",    label: "Technical Writing",  icon: "✍️", description: "Documentation, clarity, style guides" },
  { id: "devops",     label: "DevOps",             icon: "🔧", description: "CI/CD, containers, cloud infrastructure" },
];

const MAX_SKILLS = 5;

export default function SkillSelectionPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [selected, setSelected]         = useState<string[]>([]);
  const [customSkill, setCustomSkill]   = useState("");
  const [customAdded, setCustomAdded]   = useState<string[]>([]);
  const [maxError, setMaxError]         = useState(false);
  const [customError, setCustomError]   = useState("");
  const [isConfirming, setIsConfirming] = useState(false);

  const totalSelected = selected.length + customAdded.length;

  function togglePreset(id: string) {
    setMaxError(false);
    if (selected.includes(id)) {
      setSelected(selected.filter((x) => x !== id));
    } else {
      if (totalSelected >= MAX_SKILLS) { setMaxError(true); return; }
      setSelected([...selected, id]);
    }
  }

  function toggleCustom(label: string) {
    setMaxError(false);
    setCustomAdded(customAdded.filter((x) => x !== label));
  }

  function addCustomSkill() {
    const trimmed = customSkill.trim();
    if (!trimmed) return;
    if (trimmed.length < 2)  { setCustomError("Skill name must be at least 2 characters."); return; }
    if (trimmed.length > 60) { setCustomError("Keep it under 60 characters."); return; }
    const isDuplicate =
      customAdded.map((x) => x.toLowerCase()).includes(trimmed.toLowerCase()) ||
      PRESET_SKILLS.some((x) => x.label.toLowerCase() === trimmed.toLowerCase());
    if (isDuplicate) { setCustomError("That skill is already in your list."); return; }
    if (totalSelected >= MAX_SKILLS) { setMaxError(true); return; }
    setCustomError("");
    setCustomAdded([...customAdded, trimmed]);
    setCustomSkill("");
  }

  async function handleConfirm() {
  if (totalSelected === 0) return;
  setIsConfirming(true);

  const firstSkill =
    selected.length > 0
      ? PRESET_SKILLS.find((x) => x.id === selected[0])!.label
      : customAdded[0];

  try {
    const { data: { user } } = await supabase.auth.getUser();

    // Keep the Supabase insert for all selected skills
    const allSkills = [
      ...selected.map((id) => PRESET_SKILLS.find((x) => x.id === id)!.label),
      ...customAdded,
    ];
    const rows = allSkills.map((skill_name) => ({
      user_id: user?.id ?? "anon",
      skill_name,
      status: "active",
    }));
    const { error } = await supabase.from("skill_sessions").insert(rows);
    if (error) console.error("Supabase insert error:", error);

    // Call backend startSession for the PRIMARY skill and store the session_id
    const session = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/session/start`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skill_name: firstSkill }),
      }
    ).then((r) => r.json());

    localStorage.setItem("nexus_session_id", session.session_id);

  } catch (err) {
    console.error("Failed to save skill selection:", err);
  } finally {
    router.push(`/assessment?skill=${encodeURIComponent(firstSkill)}`);
    setIsConfirming(false);
  }
}

  return (
    <main className={s.page}>
      <header className={s.header}>
        <p className={s.eyebrow}>Step 2 of 4</p>
        <h1 className={s.title}>What do you want to learn?</h1>
        <p className={s.subtitle}>
          Pick up to {MAX_SKILLS} skills. Nexus builds a separate roadmap for each one.
        </p>
      </header>

      <section className={s.grid} aria-label="Suggested skills">
        {PRESET_SKILLS.map((skill) => {
          const isSelected = selected.includes(skill.id);
          return (
            <button
              key={skill.id}
              onClick={() => togglePreset(skill.id)}
              aria-pressed={isSelected}
              className={`${s.skillCard} ${isSelected ? s.skillCardSelected : ""}`}
            >
              <span className={s.skillIcon}>{skill.icon}</span>
              <span className={s.skillLabel}>{skill.label}</span>
              <span className={s.skillDesc}>{skill.description}</span>
              {isSelected && <span className={s.check} aria-hidden="true">✓</span>}
            </button>
          );
        })}
      </section>

      <section className={s.customSection} aria-label="Add a custom skill">
        <p className={s.customLabel}>Don&apos;t see your skill?</p>
        <div className={s.customRow}>
          <input
            type="text"
            placeholder="e.g. Blender, Copywriting, SQL…"
            value={customSkill}
            onChange={(e) => { setCustomSkill(e.target.value); setCustomError(""); }}
            onKeyDown={(e) => e.key === "Enter" && addCustomSkill()}
            className={s.input}
            aria-label="Custom skill name"
            maxLength={60}
          />
          <button onClick={addCustomSkill} disabled={!customSkill.trim()} className={s.btnGhost}>
            Add
          </button>
        </div>
        {customError && <p className={s.error}>{customError}</p>}
        {customAdded.length > 0 && (
          <div className={s.chips} role="list">
            {customAdded.map((label) => (
              <button key={label} role="listitem" onClick={() => toggleCustom(label)} className={s.chip}>
                {label} ×
              </button>
            ))}
          </div>
        )}
      </section>

      {maxError && (
        <p className={`${s.error} ${s.errorCenter}`} role="alert">
          You can select up to {MAX_SKILLS} skills. Remove one to add another.
        </p>
      )}

      <footer className={s.footer}>
        <p className={s.count}>
          {totalSelected === 0
            ? "No skills selected yet"
            : `${totalSelected} of ${MAX_SKILLS} skill${totalSelected !== 1 ? "s" : ""} selected`}
        </p>
        <button
          onClick={handleConfirm}
          disabled={totalSelected === 0 || isConfirming}
          className={s.btnPrimary}
        >
          {isConfirming ? "Saving…" : "Start with these skills →"}
        </button>
      </footer>
    </main>
  );
}
