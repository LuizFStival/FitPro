import { Router } from "express";
import axios from "axios";
import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

export const apiRouter = Router();

// Lazy Gemini client initialization to prevent startup crashes if key is missing
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey });
  }
  return geminiClient;
}

// Rule-based fallback insight generator when Gemini is not configured or fails
function generateRuleBasedInsights(workouts: any[]): string {
  if (!workouts || workouts.length === 0) {
    return "• Inicie seus treinos para começar a gerar insights inteligentes e análises de desempenho.";
  }

  const recent = workouts.slice(0, 5);
  const totalVolume = recent.reduce((sum, w) => sum + (Number(w.totalVolume) || 0), 0);
  const avgVolume = Math.round(totalVolume / recent.length);

  // Analyze frequency
  let frequencyText = "Frequência sólida! Mantenha a cadência de 3 a 5 sessões semanais para ganhos contínuos de força e hipertrofia.";
  if (workouts.length >= 2) {
    const firstDate = new Date(workouts[workouts.length - 1].startTime).getTime();
    const lastDate = new Date(workouts[0].startTime).getTime();
    const diffDays = Math.max(1, Math.round((lastDate - firstDate) / (1000 * 60 * 60 * 24)));
    const perWeek = Math.round((workouts.length / (diffDays / 7)) * 10) / 10;
    if (perWeek > 0) {
      frequencyText = `Ritmo semanal de ~${perWeek} treinos por semana. Consistência exemplar para adaptações neuromusculares de longo prazo.`;
    }
  }

  // PR / Overload text
  let overloadText = `Volume médio recente de ${avgVolume.toLocaleString()} kg por treino. Foque em adicionar 1-2 repetições na série de abertura antes de subir a carga absoluta.`;
  if (avgVolume === 0) {
    overloadText = "Registre suas cargas e repetições em cada série para monitorar o volume tonelagem e calcular sobrecarga progressiva precisa.";
  }

  return [
    `• Volume & Sobrecarga: ${overloadText}`,
    `• Consistência & Ritmo: ${frequencyText}`,
    "• Quebra de Platôs: Em exercícios estagnados há mais de 3 sessões, experimente reduzir a carga em 10% por 1 semana (deload) ou variar a ordem do treino.",
  ].join("\n");
}

// Hevy API Proxy Handler
async function handleHevyProxy(req: any, res: any) {
  const { endpoint, method, data, apiKey } = req.body;
  const effectiveKey = (apiKey || process.env.HEVY_API_KEY || "").trim();
  
  if (!effectiveKey) {
    return res.status(400).json({ error: "Missing Hevy API Key. Provide it in the UI or set HEVY_API_KEY." });
  }

  // Ensure pageSize is strictly clamped to <= 10 (Hevy API restriction)
  let safeEndpoint = endpoint || "";
  if (typeof safeEndpoint === "string") {
    safeEndpoint = safeEndpoint.replace(/([?&]pageSize=)(\d+)/g, (_match: string, prefix: string, val: string) => {
      const num = parseInt(val, 10);
      return num > 10 ? `${prefix}10` : `${prefix}${num}`;
    });
  }

  try {
    const response = await axios({
      url: `https://api.hevyapp.com/v1${safeEndpoint}`,
      method: method || "GET",
      headers: {
        "api-key": effectiveKey,
        "Content-Type": "application/json",
      },
      data: data,
    });
    return res.json(response.data);
  } catch (error: any) {
    const errData = error.response?.data || { error: error.message || "Failed to proxy request" };
    console.error("Hevy Proxy Error:", errData);
    return res.status(error.response?.status || 500).json(errData);
  }
}

// AI Insights Handler
async function handleInsights(req: any, res: any) {
  const { workouts } = req.body;

  if (!Array.isArray(workouts) || workouts.length === 0) {
    return res.json({ insight: "Inicie seus treinos para gerar insights personalizados!" });
  }

  try {
    const client = getGeminiClient();
    if (client) {
      const workoutSummary = workouts.slice(0, 8).map((w: any) => ({
        title: w.title || "Treino",
        date: w.startTime ? new Date(w.startTime).toLocaleDateString("pt-BR") : "",
        volume: w.totalVolume || 0,
        sets: w.totalSets || 0,
        exercises: Array.isArray(w.exercises)
          ? w.exercises.map((e: any) => e.title || "Exercício").slice(0, 5)
          : []
      }));

      const prompt = `
Você é um treinador de força e fisiologista do exercício de alto nível. Analise o histórico recente de treinos abaixo e forneça 3 insights diretos, altamente práticos e motivadores em Português do Brasil.
Foque em tendências de volume (tonelagem), consistência semanal, sobrecarga progressiva e quebra de platôs.
Formate a resposta exatamente com 3 linhas, cada uma começando com "• ". Não inclua saudações, introduções ou conclusões.

Histórico de treinos recentes:
${JSON.stringify(workoutSummary, null, 2)}
      `.trim();

      const candidateModels = [
        "gemini-3.1-flash-lite",
        "gemini-flash-latest",
        "gemini-2.5-flash",
        "gemini-3.8-flash"
      ];

      let aiResultText = "";
      for (const modelName of candidateModels) {
        try {
          const response = await client.models.generateContent({
            model: modelName,
            contents: prompt,
          });
          if (response && response.text && response.text.trim()) {
            aiResultText = response.text.trim();
            break;
          }
        } catch {
          continue;
        }
      }

      if (aiResultText) {
        return res.json({ insight: aiResultText });
      }
    }
  } catch {
    // Fall through to algorithmic insights if API is unreachable
  }

  const fallbackInsight = generateRuleBasedInsights(workouts);
  return res.json({ insight: fallbackInsight });
}

// Register routes both with /api prefix and without to guarantee compatibility with any serverless rewrite
apiRouter.post("/hevy/proxy", handleHevyProxy);
apiRouter.post("/api/hevy/proxy", handleHevyProxy);

apiRouter.post("/insights", handleInsights);
apiRouter.post("/api/insights", handleInsights);

apiRouter.post("/hevy/webhook", (_req, res) => res.status(200).send("OK"));
apiRouter.post("/api/hevy/webhook", (_req, res) => res.status(200).send("OK"));

apiRouter.get("/health", (_req, res) => res.json({ status: "ok" }));
apiRouter.get("/api/health", (_req, res) => res.json({ status: "ok" }));
