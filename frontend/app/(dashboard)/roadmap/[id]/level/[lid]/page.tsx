"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import ProgressBar from "@/components/ui/ProgressBar";
import GateTest from "@/components/features/GateTest";
import SubLevelModal, { type SublevelSuggestion } from "@/components/features/SubLevelModal";

// ---------------------------------------------------------------------------
// Mock roadmap data — replace with api.getRoadmap(id) once backend is live
// ---------------------------------------------------------------------------
const MOCK_ROADMAP = {
  id: "roadmap-001",
  skill_name: "Python",
  skill_level: "beginner",
  levels: [
    {
      index: 0,
      title: "Python Foundations",
      description:
        "Get comfortable with Python syntax, data types, and control flow. By the end of this level you'll be able to read and write basic Python programs with confidence.",
      locked: false,
      lessons: [
        {
          id: "l0-0",
          title: "Variables & Data Types",
          duration: "8 min",
          content: `Python uses dynamic typing — you never declare a variable's type explicitly. The interpreter figures it out at runtime.

The four primitive types you'll use constantly are:
- **int** — whole numbers: \`age = 25\`
- **float** — decimals: \`price = 9.99\`
- **str** — text: \`name = "Alex"\`
- **bool** — True or False: \`is_active = True\`

You can always check a variable's type with \`type(x)\`. Try it in a Python REPL:

\`\`\`python
x = 42
print(type(x))    # <class 'int'>

y = "hello"
print(type(y))    # <class 'str'>
\`\`\`

Type conversion is explicit — Python won't silently coerce types for you, which prevents many bugs common in JavaScript:

\`\`\`python
age = "25"
age_int = int(age)    # explicit conversion
\`\`\``,
          resources: [
            { label: "Python Docs — Built-in Types", url: "#" },
            { label: "Real Python — Variables", url: "#" },
          ],
        },
        {
          id: "l0-1",
          title: "Lists & Dictionaries",
          duration: "10 min",
          content: `Lists and dictionaries are Python's two most-used data structures. You will use them in nearly every program you write.

**Lists** — ordered, mutable sequences:

\`\`\`python
fruits = ["apple", "banana", "cherry"]
fruits.append("date")       # add to end
fruits[0]                   # "apple" — zero-indexed
fruits[-1]                  # "date" — negative indexing from end
fruits[1:3]                 # ["banana", "cherry"] — slicing
\`\`\`

**Dictionaries** — key-value pairs:

\`\`\`python
person = {
    "name": "Alex",
    "age": 25,
    "skills": ["Python", "SQL"]
}

person["name"]              # "Alex"
person.get("email", "N/A")  # safe access — returns "N/A" if key missing
person["city"] = "London"   # add or update a key
\`\`\`

The key difference: lists use integer indices, dicts use any hashable key. When you need to look something up by name, use a dict. When order matters more than labels, use a list.`,
          resources: [
            { label: "Python Docs — Lists", url: "#" },
            { label: "Python Docs — Dictionaries", url: "#" },
          ],
        },
        {
          id: "l0-2",
          title: "Control Flow: if / for / while",
          duration: "12 min",
          content: `Control flow determines which lines of your program run and how many times. Python uses indentation (4 spaces) instead of curly braces to define blocks — this is a hard rule, not a style choice.

**if / elif / else:**

\`\`\`python
score = 72

if score >= 90:
    grade = "A"
elif score >= 70:
    grade = "B"
else:
    grade = "C"
\`\`\`

**for loops** iterate over any sequence:

\`\`\`python
for fruit in ["apple", "banana", "cherry"]:
    print(fruit.upper())

# range() generates numbers
for i in range(5):          # 0, 1, 2, 3, 4
    print(i)

# enumerate() gives index + value
for i, fruit in enumerate(["apple", "banana"]):
    print(f"{i}: {fruit}")  # 0: apple, 1: banana
\`\`\`

**while loops** run until a condition becomes False:

\`\`\`python
count = 0
while count < 3:
    print(count)
    count += 1
\`\`\`

Use \`break\` to exit early, \`continue\` to skip to the next iteration.`,
          resources: [
            { label: "Python Docs — Control Flow", url: "#" },
            { label: "Real Python — Conditionals", url: "#" },
          ],
        },
        {
          id: "l0-3",
          title: "Functions",
          duration: "10 min",
          content: `Functions let you name and reuse a block of code. Define once, call anywhere.

\`\`\`python
def greet(name, greeting="Hello"):
    """Return a personalised greeting string."""
    return f"{greeting}, {name}!"

greet("Alex")             # "Hello, Alex!"
greet("Sam", "Hey")       # "Hey, Sam!"
\`\`\`

Key rules:
- Parameters after \`def\` are positional by default
- Parameters with \`=\` have default values (optional when calling)
- \`return\` sends a value back to the caller — without it, the function returns \`None\`
- The docstring (triple-quoted string) documents what the function does

**Scope:** variables defined inside a function are local — they don't exist outside it:

\`\`\`python
def add(a, b):
    result = a + b    # local variable
    return result

print(result)         # NameError — result doesn't exist here
\`\`\`

Write small, single-purpose functions. A function that does one thing is easier to test, debug, and reuse.`,
          resources: [
            { label: "Python Docs — Defining Functions", url: "#" },
            { label: "Real Python — Functions", url: "#" },
          ],
        },
      ],
    },
    {
      index: 1,
      title: "OOP & Project Structure",
      description:
        "Classes, objects, modules, and how to organise a real Python project.",
      locked: true,
      lessons: [],
    },
    {
      index: 2,
      title: "Working with Data",
      description:
        "File I/O, JSON, CSV, and an introduction to pandas for data work.",
      locked: true,
      lessons: [],
    },
  ],
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Resource {
  label: string;
  url: string;
}

interface Lesson {
  id: string;
  title: string;
  duration: string;
  content: string;
  resources: Resource[];
}

interface Level {
  index: number;
  title: string;
  description: string;
  locked: boolean;
  lessons: Lesson[];
}

// ---------------------------------------------------------------------------
// LessonCard component
// ---------------------------------------------------------------------------
function LessonCard({
  lesson,
  index,
  isRead,
  onRef,
}: {
  lesson: Lesson;
  index: number;
  isRead: boolean;
  onRef: (el: HTMLDivElement | null) => void;
}) {
  return (
    <div
      ref={onRef}
      data-lesson-id={lesson.id}
      style={{
        background: isRead
          ? "rgba(99, 102, 241, 0.04)"
          : "var(--color-surface)",
        border: `1.5px solid ${isRead ? "rgba(99,102,241,0.25)" : "var(--color-border)"}`,
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-6)",
        transition: "border-color 0.3s ease, background 0.3s ease",
        position: "relative",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "var(--space-3)",
          marginBottom: "var(--space-4)",
        }}
      >
        {/* Step indicator */}
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: isRead
              ? "var(--color-primary)"
              : "var(--color-surface-raised)",
            border: `2px solid ${isRead ? "var(--color-primary)" : "var(--color-border)"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "all 0.3s ease",
          }}
        >
          {isRead ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M2.5 7L5.5 10L11.5 4"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "var(--color-text-secondary)",
                fontFamily: "var(--font-mono, monospace)",
              }}
            >
              {String(index + 1).padStart(2, "0")}
            </span>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <h3
            style={{
              margin: 0,
              fontSize: "var(--text-lg)",
              fontWeight: 600,
              color: "var(--color-text-primary)",
              lineHeight: 1.3,
            }}
          >
            {lesson.title}
          </h3>
          <span
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--color-text-secondary)",
              marginTop: 2,
              display: "block",
            }}
          >
            {lesson.duration} read
          </span>
        </div>

        {isRead && (
          <span
            style={{
              fontSize: "var(--text-xs)",
              fontWeight: 500,
              color: "var(--color-primary)",
              background: "rgba(99,102,241,0.1)",
              padding: "2px 10px",
              borderRadius: 999,
              whiteSpace: "nowrap",
            }}
          >
            Read
          </span>
        )}
      </div>

      {/* Content */}
      <div
        style={{
          fontSize: "var(--text-base)",
          lineHeight: 1.75,
          color: "var(--color-text-primary)",
          marginBottom: "var(--space-4)",
        }}
      >
        {lesson.content.split("\n\n").map((block, i) => {
          if (block.startsWith("```")) {
            const code = block.replace(/```python\n?/, "").replace(/```$/, "");
            return (
              <pre
                key={i}
                style={{
                  background: "var(--color-surface-raised)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-md)",
                  padding: "var(--space-4)",
                  fontSize: "13px",
                  overflowX: "auto",
                  fontFamily: "var(--font-mono, monospace)",
                  lineHeight: 1.6,
                  margin: "var(--space-3) 0",
                }}
              >
                <code>{code}</code>
              </pre>
            );
          }
          if (block.includes("\n-")) {
            const [intro, ...items] = block.split("\n-");
            return (
              <div key={i}>
                {intro && (
                  <p style={{ margin: "0 0 var(--space-2) 0" }}>{intro}</p>
                )}
                <ul
                  style={{
                    margin: "0 0 var(--space-2) 0",
                    paddingLeft: "var(--space-5)",
                  }}
                >
                  {items.map((item, j) => {
                    const parts = item.trim().split(/(\*\*[^*]+\*\*)/g);
                    return (
                      <li
                        key={j}
                        style={{
                          marginBottom: "var(--space-1)",
                          color: "var(--color-text-primary)",
                        }}
                      >
                        {parts.map((p, k) =>
                          p.startsWith("**") ? (
                            <strong key={k}>{p.replace(/\*\*/g, "")}</strong>
                          ) : (
                            p
                          )
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          }
          if (block.startsWith("**")) {
            const parts = block.split(/(\*\*[^*]+\*\*)/g);
            return (
              <p
                key={i}
                style={{ margin: "0 0 var(--space-2) 0", lineHeight: 1.75 }}
              >
                {parts.map((p, k) =>
                  p.startsWith("**") ? (
                    <strong
                      key={k}
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {p.replace(/\*\*/g, "")}
                    </strong>
                  ) : (
                    p
                  )
                )}
              </p>
            );
          }
          const inlineParts = block.split(/(`[^`]+`)/g);
          return (
            <p key={i} style={{ margin: "0 0 var(--space-2) 0" }}>
              {inlineParts.map((p, k) =>
                p.startsWith("`") ? (
                  <code
                    key={k}
                    style={{
                      background: "var(--color-surface-raised)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 4,
                      padding: "1px 5px",
                      fontSize: "0.875em",
                      fontFamily: "var(--font-mono, monospace)",
                    }}
                  >
                    {p.replace(/`/g, "")}
                  </code>
                ) : (
                  p
                )
              )}
            </p>
          );
        })}
      </div>

      {/* Resources */}
      {lesson.resources.length > 0 && (
        <div
          style={{
            borderTop: "1px solid var(--color-border)",
            paddingTop: "var(--space-3)",
            display: "flex",
            flexWrap: "wrap",
            gap: "var(--space-2)",
          }}
        >
          <span
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--color-text-secondary)",
              fontWeight: 500,
              alignSelf: "center",
            }}
          >
            Further reading:
          </span>
          {lesson.resources.map((r) => (
            <a
              key={r.label}
              href={r.url}
              target="_blank"
              rel="noreferrer"
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--color-primary)",
                textDecoration: "none",
                border: "1px solid rgba(99,102,241,0.3)",
                borderRadius: 999,
                padding: "2px 10px",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                transition: "background 0.2s",
              }}
            >
              {r.label} ↗
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function LevelContentPage() {
  const params = useParams();
  const router = useRouter();

  const roadmapId = params?.id as string;
  const levelIndex = parseInt((params?.lid as string) ?? "0", 10);

  const roadmap = MOCK_ROADMAP;
  const level: Level | undefined = roadmap.levels[levelIndex];

  const [readLessons, setReadLessons] = useState<Set<string>>(new Set());
  const [showGateTest, setShowGateTest] = useState(false);
  const [showSublevel, setShowSublevel] = useState(false);
  const [sublevelRejectCount, setSublevelRejectCount] = useState(0);

  const lessonRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const sublevelSuggestion: SublevelSuggestion = {
    title: `${level.title}: targeted review`,
    description:
      "A short focused lesson for the concepts that caused the gate test miss.",
    lessonCount: 3,
    conceptGaps: ["lists", "dictionaries", "control flow"],
  };

  function handleTestResult(score: number, passed: boolean) {
    if (!passed) {
      setSublevelRejectCount(0);
      setShowSublevel(true);
    } else {
      router.push(`/roadmap/${roadmapId}`);
    }
  }

  const setLessonRef = useCallback(
    (lessonId: string) => (el: HTMLDivElement | null) => {
      if (el) lessonRefs.current.set(lessonId, el);
    },
    []
  );

  useEffect(() => {
    if (!level) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const lessonId = (entry.target as HTMLElement).dataset.lessonId;
            if (lessonId) {
              setReadLessons((prev) => new Set([...prev, lessonId]));
            }
          }
        });
      },
      { threshold: 0.6 }
    );

    lessonRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [level]);

  const progressPercent =
    level?.lessons.length > 0
      ? Math.round((readLessons.size / level.lessons.length) * 100)
      : 0;

  const allRead =
    level?.lessons.length > 0 &&
    readLessons.size >= level.lessons.length;

  if (!level) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          gap: "var(--space-4)",
          color: "var(--color-text-secondary)",
        }}
      >
        <span style={{ fontSize: "var(--text-xl)" }}>Level not found</span>
        <Button variant="secondary" onClick={() => router.back()}>
          ← Back to roadmap
        </Button>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "var(--space-6) var(--space-4) var(--space-16)",
      }}
    >
      {/* Sticky progress header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "var(--color-bg)",
          paddingTop: "var(--space-4)",
          paddingBottom: "var(--space-4)",
          marginBottom: "var(--space-6)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        {/* Breadcrumb */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            marginBottom: "var(--space-3)",
          }}
        >
          <button
            onClick={() => router.push(`/roadmap/${roadmapId}`)}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              color: "var(--color-text-secondary)",
              fontSize: "var(--text-sm)",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            ← {roadmap.skill_name}
          </button>
          <span style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)" }}>
            /
          </span>
          <span
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--color-text-primary)",
              fontWeight: 500,
            }}
          >
            Level {levelIndex + 1}
          </span>
        </div>

        {/* Level title + lesson count */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: "var(--space-3)",
            marginBottom: "var(--space-3)",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "var(--text-xl)",
              fontWeight: 700,
              color: "var(--color-text-primary)",
            }}
          >
            {level.title}
          </h1>
          <span
            style={{
              fontSize: "var(--text-sm)",
              color: progressPercent === 100
                ? "var(--color-success, #10b981)"
                : "var(--color-text-secondary)",
              fontWeight: 500,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {readLessons.size}/{level.lessons.length} lessons
          </span>
        </div>

        <ProgressBar
          value={progressPercent}
          label={`${progressPercent}% complete`}
        />
      </div>

      {/* Level description */}
      <p
        style={{
          fontSize: "var(--text-base)",
          color: "var(--color-text-secondary)",
          lineHeight: 1.7,
          marginBottom: "var(--space-8)",
        }}
      >
        {level.description}
      </p>

      {/* Lesson cards */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
          marginBottom: "var(--space-10)",
        }}
      >
        {level.lessons.map((lesson, i) => (
          <LessonCard
            key={lesson.id}
            lesson={lesson}
            index={i}
            isRead={readLessons.has(lesson.id)}
            onRef={setLessonRef(lesson.id)}
          />
        ))}
      </div>

      {/* Gate test CTA or inline gate test */}
      {!showGateTest ? (
        <div
          style={{
            background: allRead
              ? "linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.08) 100%)"
              : "var(--color-surface)",
            border: `2px solid ${allRead ? "var(--color-primary)" : "var(--color-border)"}`,
            borderRadius: "var(--radius-xl)",
            padding: "var(--space-8)",
            textAlign: "center",
            transition: "all 0.4s ease",
          }}
        >
          <div
            style={{
              fontSize: 40,
              marginBottom: "var(--space-3)",
              filter: allRead ? "none" : "grayscale(1) opacity(0.4)",
              transition: "filter 0.4s ease",
            }}
          >
            🎯
          </div>
          <h2
            style={{
              margin: "0 0 var(--space-2) 0",
              fontSize: "var(--text-xl)",
              fontWeight: 700,
              color: allRead
                ? "var(--color-text-primary)"
                : "var(--color-text-secondary)",
            }}
          >
            {allRead ? "Ready for the gate test?" : "Finish all lessons first"}
          </h2>
          <p
            style={{
              margin: "0 0 var(--space-6) 0",
              fontSize: "var(--text-sm)",
              color: "var(--color-text-secondary)",
              lineHeight: 1.6,
            }}
          >
            {allRead
              ? "Score 70% or higher to unlock the next level. You've read all the lessons — you're prepared."
              : `Read ${level.lessons.length - readLessons.size} more lesson${level.lessons.length - readLessons.size === 1 ? "" : "s"} to unlock the gate test.`}
          </p>
          <Button
            variant={allRead ? "primary" : "secondary"}
            disabled={!allRead}
            onClick={() => setShowGateTest(true)}
          >
            Take gate test →
          </Button>
        </div>
      ) : (
        <GateTest
          levelId={levelIndex.toString()}
          questions={level.lessons.map((lesson, idx) => ({
            id: lesson.id,
            text: `What is the key concept from "${lesson.title}"?`,
            options: [
              `Concept from ${lesson.title}`,
              "Incorrect answer",
              "Another wrong answer",
              "Not related",
            ],
            concept_tag: lesson.id.split("-")[0],
          }))}
          onResult={handleTestResult}
          onSubLevel={() => setShowSublevel(true)}
        />
      )}

      <SubLevelModal
        isOpen={showSublevel}
        suggestion={sublevelSuggestion}
        rejectCount={sublevelRejectCount}
        onDecision={(decision) => {
          if (decision === "accept") {
            router.push(`/roadmap/${roadmapId}/level/${levelIndex}/sublevel`);
            return;
          }

          if (decision === "reject") {
            setSublevelRejectCount((count) => count + 1);
            setShowSublevel(false);
            return;
          }

          setShowSublevel(false);
        }}
      />
    </div>
  );
}


