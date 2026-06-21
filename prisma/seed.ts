import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const personas = [
  {
    key: "impatient",
    name: "Impatient User",
    description: "Max 5 steps, no retries, clicks the first plausible control, gives up quickly.",
    behaviorPrompt:
      "Policy: maxSteps=5; maxRetries=0. Click the first plausible button or field. Do not inspect alternatives deeply. Give up quickly when a flow is unclear.",
    riskWeight: 0.86
  },
  {
    key: "esl",
    name: "ESL User",
    description: "Prefers simple labels and may confuse billing email with account email.",
    behaviorPrompt:
      "Policy: prefer simple obvious labels. Dense helper text is easy to miss. You may confuse Billing email and Account email when both appear.",
    riskWeight: 0.72
  },
  {
    key: "mobile-first",
    name: "Mobile-First User",
    description: "Uses a 390x844 viewport and only obvious visible touch targets.",
    behaviorPrompt:
      "Policy: viewport=390x844. Use only obvious visible touch targets. Do not hunt below the fold unless there is a visible cue.",
    riskWeight: 0.82
  },
  {
    key: "privacy-sensitive",
    name: "Privacy-Sensitive User",
    description: "Refuses newsletter, tracking, permissions, and unnecessary personal data.",
    behaviorPrompt:
      "Policy: refuse newsletters, tracking, optional permissions, and unnecessary personal data. Only provide the required account email.",
    riskWeight: 0.74
  },
  {
    key: "power-user",
    name: "Power User",
    description: "Uses search, shortcuts, and completes efficiently.",
    behaviorPrompt:
      "Policy: use search, keyboard shortcuts, and direct field targeting. Complete efficiently with the fewest useful actions.",
    riskWeight: 0.62
  },
  {
    key: "adversarial",
    name: "Adversarial User",
    description: "Enters weird inputs, tries invalid values, navigates back, changes choices mid-flow.",
    behaviorPrompt:
      "Policy: try one invalid input first, use back navigation once, and change choices midway before attempting completion.",
    riskWeight: 0.95
  }
];

async function main() {
  await prisma.persona.deleteMany({
    where: {
      key: {
        notIn: personas.map((persona) => persona.key)
      }
    }
  });

  for (const persona of personas) {
    await prisma.persona.upsert({
      where: { key: persona.key },
      update: persona,
      create: persona
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
