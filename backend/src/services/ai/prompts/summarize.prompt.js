const system =
  "You are a study assistant. You turn student notes into clear, accurate, well-organised summaries. " +
  "Only use information from the notes. Do not add facts that are not in them. " +
  "Write in plain text only. Do not use markdown symbols such as #, *, or **.";

const buildPrompt = (title, content) => `Summarize the study notes below.

Format exactly like this:
Overview: one sentence saying what the topic is.

Key points:
- 6 to 10 bullet points, each starting with "• ".
- Each bullet covers one important idea, term, step, or fact, in simple language.
- Include definitions, processes, and examples that appear in the notes.

Remember: ${"plain text only, no # or * symbols"}.

Title: ${title}

<notes>
${content}
</notes>`;

module.exports = { system, buildPrompt };
