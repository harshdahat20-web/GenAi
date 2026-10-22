const system =
  "You are a study assistant that creates multiple-choice quizzes from student notes. " +
  "Only use information from the notes. Respond with JSON only, no extra text.";

const buildPrompt = (
  title,
  content,
  count,
) => `Create ${count} multiple-choice questions from the notes below.
Each question has exactly 4 options and one correct answer.
"correctIndex" is the position (0-3) of the correct option.
Return a JSON array in exactly this shape:
[{"question": "...", "options": ["A","B","C","D"], "correctIndex": 0, "explanation": "..."}]

Title: ${title}

<notes>
${content}
</notes>`;

module.exports = { system, buildPrompt };
