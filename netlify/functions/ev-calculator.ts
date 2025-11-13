import type { Context } from "@netlify/functions";
import model, { identifyValueBets } from "../../src/utils/predictiveModel";

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { features, marketOdds } = body;

    if (!features || !marketOdds) {
      return new Response(
        JSON.stringify({ error: "Missing features or marketOdds in request body" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const predictions = model.predict(features);
    const valueBets = identifyValueBets(predictions, marketOdds);

    return new Response(
      JSON.stringify({
        predictions,
        valueBets,
        recommendation: valueBets.length > 0 ? valueBets[0] : null,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("EV+ calculation error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
