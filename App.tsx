import React, { useState, useEffect } from 'react';
import { UserData, Answers, ReportData, Question, Pillar, WEIGHTS } from './types';
import { generateHardSkillsQuestions, generateReportAnalysis } from './services/geminiService';
import { Button } from './components/Button';
import { 
  UserCircle, 
  Briefcase, 
  ChevronRight, 
  BrainCircuit, 
  Target, 
  Users, 
  Activity, 
  Award,
  RefreshCw
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// --- Static Questions Data (2 per pillar) ---
const STATIC_QUESTIONS_DEFINITIONS = [
  // AUTONOMY
  {
    id: 'autonomy_1',
    pillar: Pillar.AUTONOMY,
    title: 'Autonomia: Gestão da Tarefa',
    description: 'Como você lida quando recebe uma nova demanda?',
    options: [
      { level: 1, text: "Preciso de passo-a-passo detalhado. Paro ao encontrar obstáculos." },
      { level: 3, text: "Recebo o objetivo macro e defino o 'como'. Trago soluções." },
      { level: 5, text: "Antecipo demandas e defino a própria agenda estratégica." },
    ]
  },
  {
    id: 'autonomy_2',
    pillar: Pillar.AUTONOMY,
    title: 'Autonomia: Iniciativa',
    description: 'Qual sua postura diante de problemas não mapeados?',
    options: [
      { level: 1, text: "Aguardo instruções ou reporto o problema sem investigar." },
      { level: 3, text: "Investigo a causa raiz e proponho correções." },
      { level: 5, text: "Resolvo o problema e crio processos para que não se repita." },
    ]
  },
  // IMPACT
  {
    id: 'impact_1',
    pillar: Pillar.IMPACT,
    title: 'Impacto: Entregável',
    description: 'O que define a conclusão do seu trabalho?',
    options: [
      { level: 1, text: "A tarefa foi marcada como concluída (output)." },
      { level: 3, text: "O problema do usuário/cliente foi resolvido (outcome)." },
      { level: 5, text: "O indicador de negócio (receita/economia) melhorou." },
    ]
  },
  {
    id: 'impact_2',
    pillar: Pillar.IMPACT,
    title: 'Impacto: Alcance',
    description: 'Quem é beneficiado pelo seu trabalho?',
    options: [
      { level: 1, text: "Apenas minha própria fila de tarefas." },
      { level: 3, text: "Meu time direto e stakeholders próximos." },
      { level: 5, text: "Múltiplas áreas ou a organização como um todo." },
    ]
  },
  // SOFT SKILLS
  {
    id: 'soft_skills_1',
    pillar: Pillar.SOFT_SKILLS,
    title: 'Convivência: Pressão',
    description: 'Como você reage sob pressão ou críticas?',
    options: [
      { level: 1, text: "Fico na defensiva ou busco culpados externos." },
      { level: 3, text: "Absorvo a crítica, filtro o útil e ajusto a rota." },
      { level: 5, text: "Mantenho a calma e ajudo o time a focar na solução." },
    ]
  },
  {
    id: 'soft_skills_2',
    pillar: Pillar.SOFT_SKILLS,
    title: 'Convivência: Colaboração',
    description: 'Como é sua interação com pares?',
    options: [
      { level: 1, text: "Prefiro trabalhar isolado (silo)." },
      { level: 3, text: "Colaboro ativamente quando solicitado." },
      { level: 5, text: "Desbloqueio os outros e promovo união no time." },
    ]
  },
  // CONSISTENCY
  {
    id: 'consistency_1',
    pillar: Pillar.CONSISTENCY,
    title: 'Consistência: Frequência',
    description: 'Qual a estabilidade das suas entregas?',
    options: [
      { level: 1, text: "Oscila muito (montanha-russa)." },
      { level: 3, text: "Estável. Entrego o combinado nos prazos." },
      { level: 5, text: "Previsível e Excepcional há mais de 6 meses." },
    ]
  },
  {
    id: 'consistency_2',
    pillar: Pillar.CONSISTENCY,
    title: 'Consistência: Confiabilidade',
    description: 'Seu líder precisa microgerenciar você?',
    options: [
      { level: 1, text: "Sim, precisa cobrar prazos e qualidade frequentemente." },
      { level: 3, text: "Não, ele confia que avisarei se algo der errado." },
      { level: 5, text: "Sou eu quem gerencia as expectativas do líder." },
    ]
  }
];

const App: React.FC = () => {
  // State
  const [step, setStep] = useState<'welcome' | 'loading_questions' | 'survey' | 'calculating' | 'report'>('welcome');
  const [userData, setUserData] = useState<UserData>({ name: '', role: '', type: 'self' });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [report, setReport] = useState<ReportData | null>(null);

  // Initialize Questions
  const startSurvey = async () => {
    if (!userData.name || !userData.role) return;
    setStep('loading_questions');

    try {
      // Fetch dynamic hard skills (now returns 2 questions)
      const hardSkillsData = await generateHardSkillsQuestions(userData.role);
      
      const hsQ1: Question = {
        id: 'hard_skills_1',
        pillar: Pillar.HARD_SKILLS,
        title: `Técnica: ${hardSkillsData.q1.questionTitle}`,
        description: `Sobre a execução técnica no cargo de ${userData.role}:`,
        options: hardSkillsData.q1.options.map(opt => ({ ...opt, level: opt.level as 1|3|5 }))
      };

      const hsQ2: Question = {
        id: 'hard_skills_2',
        pillar: Pillar.HARD_SKILLS,
        title: `Técnica: ${hardSkillsData.q2.questionTitle}`,
        description: `Sobre resolução de problemas e profundidade técnica:`,
        options: hardSkillsData.q2.options.map(opt => ({ ...opt, level: opt.level as 1|3|5 }))
      };

      // Build full list (2 HS + 8 Static = 10 questions)
      const fullQuestions: Question[] = [
        hsQ1,
        hsQ2,
        ...STATIC_QUESTIONS_DEFINITIONS.map(q => ({
          id: q.id,
          pillar: q.pillar,
          title: q.title,
          description: q.description,
          options: q.options.map(opt => ({...opt, level: opt.level as 1|3|5}))
        }))
      ];

      setQuestions(fullQuestions);
      setStep('survey');
    } catch (e) {
      console.error("Failed to init survey", e);
      alert("Houve um erro ao iniciar. Tente novamente.");
      setStep('welcome');
    }
  };

  const handleAnswer = (level: number) => {
    const currentQ = questions[currentQuestionIndex];
    setAnswers(prev => ({ ...prev, [currentQ.id]: level })); // Store by unique ID now

    if (currentQuestionIndex < questions.length - 1) {
      setTimeout(() => setCurrentQuestionIndex(prev => prev + 1), 300);
    }
  };

  // Logic to calculate report
  const handleGenerateReport = async () => {
    setStep('calculating');

    try {
      // Helper to calculate score per pillar based on 2 answers per pillar
      const calculatePillarScore = (p: Pillar, key1: string, key2: string) => {
        const val1 = answers[key1] || 0;
        const val2 = answers[key2] || 0;
        // Average Level (1, 3, 5) then multiply by 20 to get 0-100 score
        // Example: Level 3 + Level 5 = 8 / 2 = 4. 4 * 20 = 80 points.
        const avgLevel = (val1 + val2) / 2;
        return avgLevel * 20;
      };

      const pillarScores = {
        [Pillar.HARD_SKILLS]: calculatePillarScore(Pillar.HARD_SKILLS, 'hard_skills_1', 'hard_skills_2'),
        [Pillar.AUTONOMY]: calculatePillarScore(Pillar.AUTONOMY, 'autonomy_1', 'autonomy_2'),
        [Pillar.IMPACT]: calculatePillarScore(Pillar.IMPACT, 'impact_1', 'impact_2'),
        [Pillar.SOFT_SKILLS]: calculatePillarScore(Pillar.SOFT_SKILLS, 'soft_skills_1', 'soft_skills_2'),
        [Pillar.CONSISTENCY]: calculatePillarScore(Pillar.CONSISTENCY, 'consistency_1', 'consistency_2'),
      };

      let totalWeightedScore = 0;
      const breakdownData = [];

      for (const [pillar, score] of Object.entries(pillarScores)) {
        const weight = WEIGHTS[pillar as Pillar] || 0;
        const weightedScore = score * weight;
        
        totalWeightedScore += weightedScore;
        
        // Approximate level for display (score / 20)
        const displayLevel = Math.round(score / 20); 

        breakdownData.push({
          pillar,
          level: displayLevel, // Shows average level (e.g., 4 if answered 3 and 5)
          weightedScore,
          maxWeightedScore: 100 * weight
        });
      }

      let label = 'Júnior';
      if (totalWeightedScore >= 40) label = 'Pleno';
      if (totalWeightedScore >= 70) label = 'Sênior';
      if (totalWeightedScore >= 90) label = 'Especialista';

      const reportBase: ReportData = {
        totalScore: totalWeightedScore,
        levelLabel: label,
        breakdown: breakdownData,
        geminiAnalysis: ''
      };

      // Get AI Analysis
      const analysis = await generateReportAnalysis(userData, answers, totalWeightedScore);
      reportBase.geminiAnalysis = analysis;
      
      if (analysis.includes("## Erro")) {
        alert("Ops, houve um problema na geração do texto. Verifique sua API Key.");
      }

      setReport(reportBase);
      setStep('report');
      
    } catch (error) {
      console.error("Erro fatal:", error);
      alert("Ocorreu um erro ao gerar o relatório.");
      setStep('welcome');
    }
  };

  // Effect to trigger report generation when all questions are answered
  useEffect(() => {
    if (questions.length > 0 && Object.keys(answers).length === questions.length && step === 'survey') {
      handleGenerateReport();
    }
  }, [answers, questions.length, step]);


  // Helper Icons
  const getIconForPillar = (p: Pillar) => {
    switch (p) {
      case Pillar.HARD_SKILLS: return <BrainCircuit className="w-6 h-6 text-pink-400" />;
      case Pillar.AUTONOMY: return <Target className="w-6 h-6 text-blue-400" />;
      case Pillar.IMPACT: return <Activity className="w-6 h-6 text-green-400" />;
      case Pillar.SOFT_SKILLS: return <Users className="w-6 h-6 text-yellow-400" />;
      case Pillar.CONSISTENCY: return <RefreshCw className="w-6 h-6 text-purple-400" />;
      default: return <Award className="w-6 h-6" />;
    }
  };

  // --- Renders ---

  if (step === 'welcome') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[url('https://picsum.photos/1920/1080?grayscale&blur=5')] bg-cover bg-center">
        {/* Changed from slate-900 to blue-950 */}
        <div className="absolute inset-0 bg-blue-950/90 backdrop-blur-sm" />
        {/* Changed from slate-800 to blue-900 */}
        <div className="relative max-w-lg w-full bg-blue-900 p-8 rounded-2xl shadow-2xl border border-blue-800">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30">
              <Activity className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">GPS de Carreira</h1>
            <p className="text-blue-200">Mapeamento de Maturidade Profissional</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-blue-200 mb-1">Seu Nome</label>
              <div className="relative">
                <UserCircle className="absolute left-3 top-3 text-blue-400 w-5 h-5" />
                <input 
                  type="text" 
                  value={userData.name}
                  onChange={e => setUserData({...userData, name: e.target.value})}
                  className="w-full bg-blue-950 border border-blue-800 rounded-xl py-3 pl-10 pr-4 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder-blue-400/50"
                  placeholder="Ex: João Silva"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-200 mb-1">Seu Cargo Atual</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-3 text-blue-400 w-5 h-5" />
                <input 
                  type="text" 
                  value={userData.role}
                  onChange={e => setUserData({...userData, role: e.target.value})}
                  className="w-full bg-blue-950 border border-blue-800 rounded-xl py-3 pl-10 pr-4 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder-blue-400/50"
                  placeholder="Ex: Desenvolvedor React Sênior"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-200 mb-2">Tipo de Avaliação</label>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setUserData({...userData, type: 'self'})}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${userData.type === 'self' ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'bg-blue-950 border-blue-800 text-blue-300 hover:border-blue-600'}`}
                >
                  Autoavaliação
                </button>
                <button 
                  onClick={() => setUserData({...userData, type: 'leader'})}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${userData.type === 'leader' ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'bg-blue-950 border-blue-800 text-blue-300 hover:border-blue-600'}`}
                >
                  Líder Avaliando
                </button>
              </div>
            </div>

            <Button 
              fullWidth 
              onClick={startSurvey}
              disabled={!userData.name || !userData.role}
              className="mt-6"
            >
              Iniciar Mapeamento <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'loading_questions' || step === 'calculating') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-blue-950 text-white p-4">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-6"></div>
        <h2 className="text-xl font-semibold animate-pulse">
          {step === 'loading_questions' ? 'Calibrando régua de avaliação...' : 'Processando diagnóstico completo...'}
        </h2>
        <p className="text-blue-300 mt-2 text-center max-w-md">
          {step === 'loading_questions' ? 'A inteligência artificial está gerando critérios específicos para o seu cargo.' : 'Calculando score ponderado e gerando plano de ação personalizado.'}
        </p>
      </div>
    );
  }

  if (step === 'survey') {
    const currentQ = questions[currentQuestionIndex];
    // Fix: Handle division by zero and ensure type safety
    const progress = questions.length > 0 ? ((currentQuestionIndex) / questions.length) * 100 : 0;

    return (
      <div className="min-h-screen bg-blue-950 text-white flex flex-col">
        {/* Header - bg-blue-900 */}
        <div className="w-full bg-blue-900 p-4 sticky top-0 z-10 border-b border-blue-800">
          <div className="max-w-3xl mx-auto">
            <div className="flex justify-between items-center mb-2 text-sm text-blue-300">
              <span>{userData.name}</span>
              <span>Passo {currentQuestionIndex + 1} de {questions.length}</span>
            </div>
            <div className="w-full h-2 bg-blue-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Question Content */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-3xl w-full animate-fade-in-up">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-900 rounded-lg border border-blue-800">
                {getIconForPillar(currentQ.pillar)}
              </div>
              <div>
                <h3 className="text-indigo-400 font-semibold tracking-wider text-sm uppercase">{currentQ.pillar}</h3>
                <h2 className="text-2xl font-bold">{currentQ.title}</h2>
              </div>
            </div>
            
            <p className="text-lg text-blue-200 mb-8 border-l-4 border-indigo-500 pl-4 py-1 italic">
              "{currentQ.description}"
            </p>

            <div className="space-y-4">
              {currentQ.options.map((opt) => (
                <button
                  key={opt.level}
                  onClick={() => handleAnswer(opt.level)}
                  className="w-full text-left p-6 rounded-xl bg-blue-900 border border-blue-800 hover:border-indigo-500 hover:bg-blue-800 transition-all group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/5 transition-colors" />
                  <div className="flex items-start gap-4">
                    <div className="mt-1 w-6 h-6 rounded-full border-2 border-blue-700 group-hover:border-indigo-500 flex items-center justify-center shrink-0">
                       <div className="w-3 h-3 rounded-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div>
                      <p className="text-lg text-blue-100 group-hover:text-white transition-colors">
                        {opt.text}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'report' && report) {
    return (
      <div className="min-h-screen bg-blue-950 text-white p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Hero Report Header */}
          <div className="bg-gradient-to-br from-blue-900 to-blue-950 rounded-3xl p-8 border border-blue-800 shadow-2xl relative overflow-hidden">
             {/* Decorative background blob */}
             <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
             
             <div className="relative z-10 text-center">
                <h1 className="text-3xl font-bold mb-2">🗺️ GPS de Carreira: {userData.name}</h1>
                <p className="text-blue-300 mb-8">{userData.role}</p>

                <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
                  <div className="bg-blue-950/50 p-6 rounded-2xl border border-blue-800 backdrop-blur-sm min-w-[200px]">
                    <div className="text-sm text-blue-400 uppercase tracking-wider mb-1">Nível Geral</div>
                    <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                      {report.levelLabel}
                    </div>
                  </div>
                  
                  <div className="bg-blue-950/50 p-6 rounded-2xl border border-blue-800 backdrop-blur-sm min-w-[200px]">
                    <div className="text-sm text-blue-400 uppercase tracking-wider mb-1">Score Maturidade</div>
                    <div className="text-4xl font-black text-white">
                      {report.totalScore.toFixed(0)}<span className="text-xl text-blue-500 font-normal">/100</span>
                    </div>
                  </div>
                </div>
             </div>
          </div>

          {/* Breakdown Table */}
          <div className="bg-blue-900 rounded-2xl p-6 border border-blue-800 shadow-lg">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Activity className="text-indigo-400" /> Detalhe por Pilar
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-blue-300 text-sm border-b border-blue-800">
                    <th className="py-3 px-4 font-medium">Pilar</th>
                    <th className="py-3 px-4 font-medium text-center">Nível Médio</th>
                    <th className="py-3 px-4 font-medium text-right">Contribuição (Pontos)</th>
                  </tr>
                </thead>
                <tbody className="text-blue-100">
                  {report.breakdown.map((item, idx) => (
                    <tr key={idx} className="border-b border-blue-800/50 last:border-0 hover:bg-blue-800/30 transition-colors">
                      <td className="py-4 px-4 flex items-center gap-3">
                         {getIconForPillar(item.pillar as Pillar)}
                         <span className="font-medium">{item.pillar}</span>
                         <span className="text-xs text-blue-300 bg-blue-950 px-2 py-0.5 rounded-full">
                           {/* Fix: Handle undefined WEIGHTS access */}
                           {((WEIGHTS[item.pillar as Pillar] || 0) * 100).toFixed(0)}%
                         </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                         {/* Display average level */}
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${
                          item.level >= 4 ? 'bg-green-500/20 text-green-400' : 
                          item.level >= 3 ? 'bg-yellow-500/20 text-yellow-400' : 
                          'bg-red-500/20 text-red-400'
                        }`}>
                          ~{item.level.toFixed(1)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right font-mono text-indigo-300">
                        {item.weightedScore.toFixed(1)} <span className="text-blue-500 text-xs">/ {item.maxWeightedScore}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* AI Analysis Section */}
          <div className="bg-blue-900 rounded-2xl p-8 border border-blue-800 shadow-lg">
            <div className="prose prose-invert max-w-none prose-headings:text-indigo-400 prose-strong:text-white prose-li:text-blue-200">
              <ReactMarkdown>
                {report.geminiAnalysis}
              </ReactMarkdown>
            </div>
          </div>

          <div className="flex justify-center pb-8">
            <Button variant="outline" onClick={() => window.location.reload()}>
               <RefreshCw className="w-4 h-4" /> Nova Avaliação
            </Button>
          </div>

        </div>
      </div>
    );
  }

  return null;
};

export default App;