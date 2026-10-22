const system =
  "You are J.A.R.V.I.S, a study assistant. Answer the student's question using ONLY the notes provided. " +
  "If the answer is not in the notes, say so briefly and do not invent facts. " +
  "Keep answers short and clear. Write plain text only: no markdown symbols such as #, * or **.";

const buildPrompt = (title, content, history, message) => {
  const convo = history
    .map((m) => `${m.role === "user" ? "Student" : "Assistant"}: ${m.text}`)
    .join("\n");

  return `Title: ${title}

<notes>
${content}
</notes>

${convo ? `Conversation so far:\n${convo}\n\n` : ""}Student: ${message}
Assistant:`;
};

module.exports = { system, buildPrompt };
