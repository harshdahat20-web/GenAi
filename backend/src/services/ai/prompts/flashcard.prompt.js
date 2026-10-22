const system =
  "You are a study assistant that creates flashcards from student notes. " +
  "Only use information from the notes. Respond with JSON only, no extra text.";

const buildPrompt = (
  title,
  content,
  count,
) => `Create ${count} flashcards from the notes below.
Return a JSON array in exactly this shape:
[{"question": "...", "answer": "..."}]

Title: ${title}

<notes>
${content}
</notes>`;

module.exports = { system, buildPrompt };
