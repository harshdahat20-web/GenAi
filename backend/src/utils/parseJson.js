const ApiError = require("./ApiError");

const parseJson = (text) => {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.search(/[\[{]/);
  const end = Math.max(cleaned.lastIndexOf("]"), cleaned.lastIndexOf("}"));
  if (start === -1 || end === -1)
    throw new ApiError(502, "AI returned an invalid response");

  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    throw new ApiError(502, "AI returned an invalid response");
  }
};

module.exports = parseJson;
