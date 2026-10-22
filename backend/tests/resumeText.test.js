const {
  resumeToText,
  hasTerm,
  stripMarker,
} = require("../src/utils/resumeText");

describe("hasTerm", () => {
  test("ignores upper and lower case", () => {
    expect(hasTerm("Built apps with REACT", "react")).toBe(true);
  });

  test("matches words with symbols, such as C++ and Node.js", () => {
    expect(hasTerm("Skills: C++, Node.js", "C++")).toBe(true);
    expect(hasTerm("Skills: C++, Node.js", "Node.js")).toBe(true);
  });

  test("does not match inside a longer word ('Java' is not 'JavaScript')", () => {
    expect(hasTerm("I know JavaScript", "Java")).toBe(false);
  });

  test("treats a simple plural as the same term ('API' and 'APIs')", () => {
    expect(hasTerm("Built APIs for mobile", "API")).toBe(true);
    expect(hasTerm("Built an API for mobile", "APIs")).toBe(true);
  });

  test("matches a phrase of several words", () => {
    expect(hasTerm("Designed REST APIs", "REST APIs")).toBe(true);
  });

  test("an empty keyword never matches", () => {
    expect(hasTerm("anything", "   ")).toBe(false);
  });

  test("treats Front-End, front end and frontend as the same word, in either direction", () => {
    expect(hasTerm("Built the frontend", "Front-End")).toBe(true);
    expect(hasTerm("Built the front end", "Frontend")).toBe(true);
    expect(hasTerm("full stack developer", "Full-Stack Developer")).toBe(true);
    expect(hasTerm("Built the back-end", "Backend")).toBe(true);
  });

  test("understands different word endings (deploy, deployed, deployment)", () => {
    expect(hasTerm("Deployed it to the cloud", "Deployment")).toBe(true);
    expect(hasTerm("Debugged a crash", "Debugging")).toBe(true);
    expect(hasTerm("Worked on databases", "Database")).toBe(true);
    expect(hasTerm("Tested the APIs", "Testing")).toBe(true);
  });

  test("does not match words that only look similar", () => {
    expect(hasTerm("Built a reaction game", "React")).toBe(false);
    expect(hasTerm("Serve static files", "Server")).toBe(false);
    expect(hasTerm("Made a backup plan", "Backend")).toBe(false);
    expect(hasTerm("Did data entry", "Database")).toBe(false);
  });

  test("terms with symbols must match exactly", () => {
    expect(hasTerm("Used C++ daily", "C#")).toBe(false);
    expect(hasTerm("Used C++ daily", "C++")).toBe(true);
  });
});

describe("stripMarker", () => {
  test("removes a dash, a bullet or a number the AI added", () => {
    expect(stripMarker("- Built an API")).toBe("Built an API");
    expect(stripMarker("• Built an API")).toBe("Built an API");
    expect(stripMarker("2. Built an API")).toBe("Built an API");
    expect(stripMarker("3) Built an API")).toBe("Built an API");
  });

  test("keeps text that only starts with a number", () => {
    expect(stripMarker("500 users served")).toBe("500 users served");
    expect(stripMarker("10% faster")).toBe("10% faster");
    expect(stripMarker("3.5x speed-up")).toBe("3.5x speed-up");
  });
});

describe("resumeToText", () => {
  const resume = {
    personal: { summary: "Keen developer." },
    skills: ["React", "SQL"],
    experience: [
      { company: "Acme", role: "Developer", bullets: ["Built an API"] },
    ],
    projects: [
      {
        name: "Notes app",
        description: "Study tool",
        bullets: ["Added search"],
      },
    ],
    education: [
      { school: "State University", degree: "B.Tech", details: "CS" },
    ],
  };

  test("includes every section", () => {
    const text = resumeToText(resume);
    [
      "Keen developer.",
      "React, SQL",
      "Developer",
      "Acme",
      "Built an API",
      "Notes app",
      "Added search",
      "B.Tech",
      "State University",
    ].forEach((part) => expect(text).toContain(part));
  });

  test("can leave out the existing summary", () => {
    expect(resumeToText(resume, { includeSummary: false })).not.toContain(
      "Keen developer.",
    );
  });

  test("an empty resume gives an empty string", () => {
    expect(
      resumeToText({
        personal: {},
        skills: [],
        experience: [],
        projects: [],
        education: [],
      }),
    ).toBe("");
  });
});
