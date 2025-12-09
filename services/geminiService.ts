import { GoogleGenAI, Type, Schema } from "@google/genai";
import { UserData, Answers, ReportData, Pillar } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Using 2.5-flash as per coding guidelines (best performance/cost balance)
const MODEL_NAME = "gemini-2.5-flash"; 

const SYSTEM_INSTRUCTION = `
VOCÊ É O: Sistema Vivo de Mapeamento de Maturidade (GPS de Carreira).
SUA MISSÃO: Atuar como um avaliador sênior.
PADRÃO: Foque em COMPORTAMENTOS OBSERVÁVEIS.
`;

export interface HardSkillsQuestion {
  questionTitle: string;
  options: { level: number; text: string }[];
}

// ---------------------------------------------------------
// 1. GERADOR DE PERGUNTAS TÉCNICAS (Gera 2 cenários)
// ---------------------------------------------------------
export const generateHardSkillsQuestions = async (role: string): Promise<{ q1: HardSkillsQuestion, q2: HardSkillsQuestion }> => {
  if (!apiKey) {
    // Fallback para dev
    return {
      q1: {
        questionTitle: "Execução Técnica",
        options: [
          { level: 1, text: "Preciso de ajuda frequente para executar as tarefas básicas." },
          { level: 3, text: "Executo com autonomia e sem erros as demandas do dia a dia." },
          { level: 5, text: "Sou referência técnica e crio novos padrões para o time." }
        ]
      },
      q2: {
        questionTitle: "Resolução de Problemas Técnicos",
        options: [
          { level: 1, text: "Escalo problemas técnicos imediatamente ao encontrar erros." },
          { level: 3, text: "Investigo e resolvo a maioria dos bugs/problemas sozinho." },
          { level: 5, text: "Antecipo falhas sistêmicas e previno erros antes que ocorram." }
        ]
      }
    };
  }

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      q1: {
        type: Type.OBJECT,
        description: "Pergunta 1: Focada na Execução do dia a dia",
        properties: {
          questionTitle: { type: Type.STRING },
          options: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                level: { type: Type.INTEGER, description: "Score level: 1, 3, or 5" },
                text: { type: Type.STRING }
              },
              required: ["level", "text"]
            }
          }
        },
        required: ["questionTitle", "options"]
      },
      q2: {
        type: Type.OBJECT,
        description: "Pergunta 2: Focada em Profundidade/Inovação Técnica",
        properties: {
          questionTitle: { type: Type.STRING },
          options: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                level: { type: Type.INTEGER, description: "Score level: 1, 3, or 5" },
                text: { type: Type.STRING }
              },
              required: ["level", "text"]
            }
          }
        },
        required: ["questionTitle", "options"]
      }
    },
    required: ["q1", "q2"]
  };

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Contexto: Avaliação de Hard Skills para o cargo: "${role}".
      
      Gere 2 perguntas distintas com 3 opções de resposta cada (Nível 1, 3, 5).
      
      - PERGUNTA 1: Deve avaliar a capacidade de EXECUÇÃO (fazer a tarefa).
      - PERGUNTA 2: Deve avaliar a capacidade de INOVAÇÃO/ENSINO (melhorar a técnica ou ensinar outros).
      
      As opções devem ser na primeira pessoa ("Eu...").`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.3,
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response");
    return JSON.parse(text);
  } catch (error) {
    console.error("Error generating hard skills:", error);
    // Fallback error safe return
    return {
      q1: {
        questionTitle: "Execução Técnica (Fallback)",
        options: [
          { level: 1, text: "Nível Aprendiz" },
          { level: 3, text: "Nível Pleno" },
          { level: 5, text: "Nível Sênior" }
        ]
      },
      q2: {
        questionTitle: "Inovação Técnica (Fallback)",
        options: [
          { level: 1, text: "Pouca inovação" },
          { level: 3, text: "Alguma inovação" },
          { level: 5, text: "Muita inovação" }
        ]
      }
    };
  }
};

// ---------------------------------------------------------
// 2. GERADOR DE RELATÓRIO (Calcula média de 10 perguntas)
// ---------------------------------------------------------
export const generateReportAnalysis = async (userData: UserData, rawAnswers: Record<string, number>, totalScore: number): Promise<string> => {
  if (!apiKey) return "## Erro\nNão foi possível gerar a análise qualitativa (Sem API Key).";

  const calcAvg = (v1: number | undefined, v2: number | undefined) => {
      const val1 = v1 || 0;
      const val2 = v2 || 0;
      // Convert specific level (1,3,5) to score (20,60,100)
      return ((val1 * 20) + (val2 * 20)) / 2;
  };

  const scores = {
    hardSkills: calcAvg(rawAnswers['hard_skills_1'], rawAnswers['hard_skills_2']),
    autonomy: calcAvg(rawAnswers['autonomy_1'], rawAnswers['autonomy_2']),
    impact: calcAvg(rawAnswers['impact_1'], rawAnswers['impact_2']), 
    softSkills: calcAvg(rawAnswers['soft_skills_1'], rawAnswers['soft_skills_2']),
    consistency: calcAvg(rawAnswers['consistency_1'], rawAnswers['consistency_2'])
  };

  const prompt = `
  Analise este perfil profissional com base em 10 pontos de dados (médias calculadas).
  
  **DADOS:**
  - Profissional: ${userData.name} (${userData.role})
  - Avaliação: ${userData.type === 'self' ? 'Autoavaliação' : 'Liderança'}
  
  **PERFORMANCE POR PILAR (0-100%):**
  1. Hard Skills: ${scores.hardSkills}% (Peso 30%)
  2. Autonomia: ${scores.autonomy}% (Peso 25%)
  3. Impacto: ${scores.impact}% (Peso 20%)
  4. Soft Skills: ${scores.softSkills}% (Peso 15%)
  5. Consistência: ${scores.consistency}% (Peso 10%)
  
  **SCORE FINAL:** ${totalScore.toFixed(1)} / 100
  
  **INSTRUÇÃO:**
  Gere um feedback curto e poderoso.
  Identifique discrepâncias (ex: Alta técnica mas baixa soft skill).
  
  FORMATO MARKDOWN OBRIGATÓRIO:
  ## 🎯 Diagnóstico Estratégico
  **Fortaleza:** [Pilar mais forte] - [Comentário breve]
  **Ponto de Atenção:** [Pilar mais fraco] - [Comentário breve]
  
  ## 🗺️ Rota de Evolução
  Seu próximo nível depende de melhorar em **[Pilar Fraco]**.
  * **Desafio Prático:** [Uma sugestão de tarefa real para o cargo de ${userData.role}].
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      }
    });
    return response.text || "Erro ao gerar feedback.";
  } catch (error) {
    console.error(error);
    return "## Erro\nErro de conexão ao gerar análise.";
  }
};