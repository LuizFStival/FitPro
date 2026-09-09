import axios from 'axios';

export const generateWorkoutInsights = async (workouts: any[]): Promise<string> => {
  if (!workouts || workouts.length === 0) {
    return '• Inicie seus treinos para começar a gerar insights inteligentes e análises de desempenho.';
  }

  try {
    const response = await axios.post('/api/insights', {
      workouts: workouts.slice(0, 10),
    });
    return response.data?.insight || '• Mantenha a consistência semanal para garantir progresso contínuo.';
  } catch (error: any) {
    console.warn('Falha ao obter insights do servidor:', error?.message || error);
    return [
      '• Volume & Sobrecarga: Mantenha a sobrecarga progressiva com adição de repetições ou microcargas.',
      '• Frequência & Consistência: Mantenha uma cadência semanal estável para consolidação neuromuscular.',
      '• Quebra de Platôs: Varie pegadas ou tempos sob tensão em exercícios com estagnação há mais de 3 treinos.',
    ].join('\n');
  }
};
