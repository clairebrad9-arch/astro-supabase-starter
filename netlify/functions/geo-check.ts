import type { Context } from "@netlify/functions";

const RESTRICTED_COUNTRIES = [
  "US", "FR", "TR", "AU", "SG", "HK", "IL", "BE", "DK", "BG"
];

const LEGAL_DISCLAIMERS: Record<string, string> = {
  GB: "Gambling can be addictive. Please play responsibly. BeGambleAware.org",
  DE: "Glücksspiel kann süchtig machen. Spielen Sie verantwortungsvoll.",
  ES: "El juego puede crear adicción. Juega con responsabilidad.",
  IT: "Il gioco può causare dipendenza. Gioca responsabilmente.",
  default: "Gambling can be addictive. Please play responsibly. For assistance, visit your local responsible gambling resources."
};

export default async (_req: Request, context: Context) => {
  const country = context.geo?.country?.code || "UNKNOWN";
  const city = context.geo?.city || "Unknown";
  const timezone = context.geo?.timezone || "UTC";
  
  const isRestricted = RESTRICTED_COUNTRIES.includes(country);
  const disclaimer = LEGAL_DISCLAIMERS[country] || LEGAL_DISCLAIMERS.default;

  return new Response(
    JSON.stringify({
      country,
      city,
      timezone,
      isRestricted,
      disclaimer,
      canAccess: !isRestricted,
      message: isRestricted 
        ? "Access to betting services is restricted in your region due to legal regulations." 
        : "Welcome! Please gamble responsibly."
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600",
      },
    }
  );
};
