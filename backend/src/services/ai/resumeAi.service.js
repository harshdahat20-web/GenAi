const crypto = require("crypto");
const { z } = require("zod");
const ApiError = require("../../utils/ApiError");
const parseJson = require("../../utils/parseJson");
const {
  resumeToText,
  hasTerm,
  stripMarker,
} = require("../../utils/resumeText");
const JobKeywords = require("../../models/JobKeywords");
const resumes = require("../resume.service");
const { logUsage } = require("../usage.service");
const { generateText } = require("./llm.client");
const prompt = require("./prompts/resume.prompt");

const invalid = () => new ApiError(502, "AI returned an invalid response");

// Makes the student's own bullet points stronger (works before the resume is even saved)
const improveBullets = async (userId, { bullets, role, company }) => {
  const { text, usage } = await generateText({
    system: prompt.improve.system,
    prompt: prompt.improve.build({ bullets, role, company }),
    maxTokens: 800,
  });
  await logUsage(userId, "resume", usage);

  const parsed = z
    .object({
      bullets: z
        .array(z.string().trim().min(1).max(300))
        .length(bullets.length),
    })
    .safeParse(parseJson(text));
  if (!parsed.success) throw invalid();

  return { bullets: parsed.data.bullets.map(stripMarker) };
};

// Writes a summary from the saved resume. It is only returned, never saved: the student decides.
const writeSummary = async (userId, id, targetRole) => {
  const resume = await resumes.get(userId, id); // 404 if it is not yours
  const resumeText = resumeToText(resume, { includeSummary: false });
  if (resumeText.length < 20) {
    throw new ApiError(
      400,
      "Add some experience, projects or skills first so the summary has facts to use.",
    );
  }

  const { text, usage } = await generateText({
    system: prompt.summary.system,
    prompt: prompt.summary.build({ text: resumeText, targetRole }),
    maxTokens: 500,
  });
  await logUsage(userId, "resume", usage);

  const parsed = z
    .object({ summary: z.string().trim().min(10).max(600) })
    .safeParse(parseJson(text));
  if (!parsed.success) throw invalid();

  return { summary: parsed.data.summary };
};

// Same job text (ignoring spaces and capitals) -> same fingerprint
const fingerprint = (jobDescription) =>
  crypto
    .createHash("sha256")
    .update(jobDescription.replace(/\s+/g, " ").trim().toLowerCase())
    .digest("hex");

// Asks the AI for the keywords of a job, unless we already did for this exact job
const getKeywords = async (userId, jobDescription) => {
  const hash = fingerprint(jobDescription);
  const saved = await JobKeywords.findOne({ user: userId, hash });
  if (saved)
    return { keywords: saved.keywords, suggestions: saved.suggestions };

  const { text, usage } = await generateText({
    system: prompt.keywords.system,
    prompt: prompt.keywords.build({ jobDescription }),
    maxTokens: 1000,
  });
  await logUsage(userId, "resume", usage);

  const parsed = z
    .object({
      keywords: z.array(z.string()).min(1),
      suggestions: z.array(z.string()).default([]),
    })
    .safeParse(parseJson(text));
  if (!parsed.success) throw invalid();

  // Be forgiving: skip blank, over-long or repeated keywords instead of failing the whole request
  const seen = new Set();
  const keywords = [];
  for (const raw of parsed.data.keywords) {
    const k = raw.trim();
    const key = k.toLowerCase();
    if (!k || k.length > 40 || seen.has(key)) continue;
    seen.add(key);
    keywords.push(k);
    if (keywords.length === 25) break;
  }
  if (keywords.length === 0) throw invalid();

  const suggestions = parsed.data.suggestions
    .map((t) => t.trim())
    .filter((t) => t && t.length <= 300)
    .slice(0, 5);

  try {
    await JobKeywords.updateOne(
      { user: userId, hash },
      { $setOnInsert: { keywords, suggestions } },
      { upsert: true },
    );
  } catch {
    /* remembering the keywords is a bonus: never fail the request because of it */
  }
  return { keywords, suggestions };
};

// The AI only picks the keywords from the job description. We do the matching ourselves.
const matchJob = async (userId, id, jobDescription) => {
  const resume = await resumes.get(userId, id); // 404 if it is not yours
  const resumeText = resumeToText(resume);
  const { keywords, suggestions } = await getKeywords(userId, jobDescription);

  const matched = keywords.filter((k) => hasTerm(resumeText, k));
  const missing = keywords.filter((k) => !matched.includes(k));

  return {
    score: Math.round((matched.length / keywords.length) * 100),
    matched,
    missing,
    suggestions,
    resumeChars: resumeText.length, // lets the screen say "your resume has very little text yet"
  };
};

module.exports = { improveBullets, writeSummary, matchJob };
