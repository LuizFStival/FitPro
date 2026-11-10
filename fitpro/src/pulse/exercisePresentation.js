// Presentation only. Never use translated names to join workouts or merge exercises.
const normalize = value => String(value || '').normalize('NFKC').trim().toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ')
const exact = {
  'Seated Calf Raise': 'Panturrilha Sentado (Máquina)',
  'Crunch (Machine)': 'Abdominal (Máquina)',
  'Chest Press (Machine)': 'Supino Sentado (Máquina)',
  'Leg Press (Machine)': 'Leg Press 45° (Máquina)',
  'Leg Press Horizontal (Machine)': 'Leg Press Horizontal (Máquina)',
  'Leg Extension (Machine)': 'Cadeira Extensora (Máquina)',
  'Lying Leg Curl (Machine)': 'Mesa Flexora (Máquina)',
  'Seated Leg Curl (Machine)': 'Cadeira Flexora (Máquina)',
  'Standing Leg Curl (Machine)': 'Flexora em Pé (Máquina)',
  'EZ Bar Biceps Curl': 'Rosca Direta (Barra W)',
  'EZ Bar Bicep Curl': 'Rosca Direta (Barra W)',
  'Triceps Rope Pushdown': 'Tríceps na Polia com Corda',
  'Seated Cable Row - V Grip (Cable)': 'Remada Sentada com Pegada em V (Cabo)',
  'Bench Press - Wide Grip (Barbell)': 'Supino com Pegada Aberta (Barra)',
  'Bench Press - Close Grip (Barbell)': 'Supino com Pegada Fechada (Barra)',
  'Back Extension (Hyperextension)': 'Extensão Lombar (Hiperextensão)',
  'Back Extension (Weighted Hyperextension)': 'Extensão Lombar (Hiperextensão com Peso)',
  'Shoulder Press (Plate Loaded)': 'Desenvolvimento de Ombros (Máquina de Placas)',
  'Squat (Smith Machine)': 'Agachamento no Smith (Máquina)',
  'Butterfly (Pec Deck)': 'Crucifixo (Máquina)',
  'Cable Crunch': 'Abdominal (Cabo)',
  'Cable Fly Crossovers': 'Crucifixo na Polia',
  'Hammer Curl': 'Rosca Martelo (Halter)',
  'Preacher Curl (EZ Bar)': 'Rosca Scott (Barra W)',
  'Standing Calf Raise (Machine)': 'Panturrilha em Pé (Máquina)',
}
const movements = {
  'Bench Press': 'Supino Reto', 'Incline Bench Press': 'Supino Inclinado', 'Decline Bench Press': 'Supino Declinado',
  'Chest Fly': 'Crucifixo', 'Chest Press': 'Supino', 'Lat Pulldown': 'Puxada Alta',
  'Seated Row': 'Remada Sentada', 'Seated Cable Row': 'Remada Sentada', 'Bent Over Row': 'Remada Curvada',
  'Pendlay Row': 'Remada Pendlay', 'T Bar Row': 'Remada Cavalinho', 'Single Arm Row': 'Remada Unilateral',
  'Shoulder Press': 'Desenvolvimento de Ombros', 'Overhead Press': 'Desenvolvimento Militar',
  'Lateral Raise': 'Elevação Lateral', 'Front Raise': 'Elevação Frontal', 'Rear Delt Reverse Fly': 'Crucifixo Inverso',
  'Reverse Fly': 'Crucifixo Inverso', 'Shrug': 'Encolhimento', 'Upright Row': 'Remada Alta',
  'Bicep Curl': 'Rosca Direta', 'Biceps Curl': 'Rosca Direta', 'Hammer Curl': 'Rosca Martelo',
  'Preacher Curl': 'Rosca Scott', 'Concentration Curl': 'Rosca Concentrada', 'Reverse Curl': 'Rosca Inversa',
  'Incline Curl': 'Rosca Inclinado', 'Triceps Extension': 'Extensão de Tríceps', 'Triceps Pushdown': 'Tríceps na Polia',
  'Triceps Kickback': 'Tríceps Coice', 'Skullcrusher': 'Tríceps Testa', 'Triceps Dip': 'Mergulho de Tríceps',
  'Squat': 'Agachamento', 'Hack Squat': 'Agachamento Hack', 'Front Squat': 'Agachamento Frontal',
  'Goblet Squat': 'Agachamento Goblet', 'Bulgarian Split Squat': 'Agachamento Búlgaro',
  'Lunge': 'Afundo', 'Walking Lunge': 'Passada', 'Reverse Lunge': 'Afundo Reverso',
  'Deadlift': 'Levantamento Terra', 'Romanian Deadlift': 'Levantamento Terra Romeno', 'Sumo Deadlift': 'Levantamento Terra Sumô',
  'Stiff Leg Deadlift': 'Stiff', 'Hip Thrust': 'Elevação Pélvica', 'Hip Abduction': 'Abdução de Quadril',
  'Hip Adduction': 'Adução de Quadril', 'Glute Kickback': 'Extensão de Quadril',
  'Calf Press': 'Panturrilha no Leg Press', 'Calf Extension': 'Extensão de Panturrilha',
  'Standing Calf Raise': 'Panturrilha em Pé', 'Seated Calf Raise': 'Panturrilha Sentado',
  'Back Extension': 'Extensão Lombar', 'Crunch': 'Abdominal', 'Reverse Crunch': 'Abdominal Inverso',
  'Bicycle Crunch': 'Abdominal Bicicleta', 'Sit Up': 'Abdominal Completo', 'Leg Raise': 'Elevação de Pernas',
  'Hanging Leg Raise': 'Elevação de Pernas Suspenso', 'Hanging Knee Raise': 'Elevação de Joelhos Suspenso',
  'Plank': 'Prancha', 'Side Plank': 'Prancha Lateral', 'Russian Twist': 'Rotação Russa',
  'Ab Wheel': 'Roda Abdominal', 'Push Up': 'Flexão de Braços', 'Pull Up': 'Barra Fixa Pronada',
  'Chin Up': 'Barra Fixa Supinada', 'Face Pull': 'Puxada para o Rosto', 'Pullover': 'Pullover',
  'Running': 'Corrida', 'Walking': 'Caminhada', 'Cycling': 'Ciclismo', 'Treadmill': 'Esteira',
  'Stair Machine': 'Escada', 'Elliptical Trainer': 'Elíptico', 'Rowing Machine': 'Remo Ergométrico',
}
const equipment = { Barbell: 'Barra', Dumbbell: 'Halter', Machine: 'Máquina', Cable: 'Cabo',
  'Smith Machine': 'Smith', 'EZ Bar': 'Barra W', Kettlebell: 'Kettlebell', Band: 'Elástico',
  Bodyweight: 'Peso Corporal', Weighted: 'com Peso', Assisted: 'Assistido', Suspension: 'Suspensão', 'Plate Loaded': 'Máquina de Placas' }
const index = obj => new Map(Object.entries(obj).map(([key, value]) => [normalize(key), value]))
const exactNames = index(exact), baseNames = index(movements), equipmentNames = index(equipment)

export function portugueseExerciseName(value) {
  const original = String(value || '').trim()
  const key = normalize(original)
  if (exactNames.has(key)) return exactNames.get(key)
  if (baseNames.has(key)) return baseNames.get(key)
  const parts = original.match(/^(.+?)\s*\(([^()]+)\)$/)
  const movement = parts && baseNames.get(normalize(parts[1]))
  const tool = parts && equipmentNames.get(normalize(parts[2]))
  // Only translate complete known variants, never discard an unknown qualifier.
  return movement && tool ? `${movement} (${tool})` : original || 'Exercício sem nome'
}

const twin = 'https://www.leandrotwin.com.br/assessoria/arquivos/lista-de-videos-de-exercicios.pdf'
const pg = 'https://www.puregym.com/lets-get-started/workout-builder/equipment-how-tos/'
// Explicit variant matches only; sources link to the publisher, videos stay on YouTube.
// Equipment-specific videos are distinct from lessons that cover several variations.
export const EXECUTION_GUIDES = [
  { names: ['Chest Press (Machine)', 'Supino Sentado (Máquina)'], video: 'sqNwDkUU_Ps', author: 'PureGym', source: pg, language: 'Inglês', label: 'Supino sentado na máquina' },
  { names: ['Incline Bench Press (Dumbbell)', 'Supino Inclinado (Halter)'], video: 'WP1VLAt8hbM', label: 'Supino inclinado · aula com variações', author: 'Leandro Twin', source: twin },
  { names: ['Bench Press (Barbell)', 'Bench Press (Dumbbell)', 'Bench Press (Smith Machine)'], video: 'EZMYCLKuGow', label: 'Supino reto · aula com variações', author: 'Leandro Twin', source: twin },
  { names: ['Bench Press - Wide Grip (Barbell)', 'Supino com Pegada Aberta (Barra)', 'Supino - Pegada Aberta (Barra)'], video: 'EZMYCLKuGow', label: 'Supino reto · orientação geral', note: 'Este treino usa pegada aberta. A aula é geral sobre supino reto; confira a pegada indicada na sua rotina.', author: 'Leandro Twin', source: twin },
  { names: ['Chest Fly (Machine)', 'Butterfly (Pec Deck)', 'Crucifixo (Máquina)', 'Crucifixo no Voador (Máquina)'], video: 'FzCnfD0gOXo', label: 'Crucifixo na máquina', author: 'Leandro Twin', source: twin },
  { names: ['Leg Press (Machine)', 'Leg Press 45° (Máquina)'], video: 'nY8UsiAqwds', label: 'Leg press', author: 'Leandro Twin', source: twin },
  { names: ['Leg Extension (Machine)', 'Cadeira Extensora (Máquina)'], video: 'el3oHblB5DM', label: 'Cadeira extensora', author: 'Leandro Twin', source: twin },
  { names: ['Lying Leg Curl (Machine)', 'Mesa Flexora (Máquina)'], video: '2-ULaRrQa7c', label: 'Mesa flexora', author: 'Leandro Twin', source: twin },
  { names: ['Seated Leg Curl (Machine)', 'Cadeira Flexora (Máquina)'], video: 'Zss6E3VU6X0', label: 'Cadeira flexora', author: 'Leandro Twin', source: twin },
  { names: ['Seated Calf Raise', 'Panturrilha Sentado (Máquina)', 'Elevação de Panturrilha Sentado (Máquina)'], video: 'jMWs_p-W9gY', label: 'Panturrilha sentado', author: 'Leandro Twin', source: twin },
  { names: ['Standing Calf Raise (Machine)', 'Panturrilha em Pé (Máquina)', 'Elevação de Panturrilha em Pé (Máquina)'], video: '824pMjvGXgc', label: 'Panturrilha em pé · aula com variações', author: 'Leandro Twin', source: twin },
  { names: ['Calf Press (Machine)'], video: 'wCXvfH_-BLg', label: 'Panturrilha no leg press', author: 'Leandro Twin', source: twin },
  { names: ['Crunch (Machine)', 'Abdominal (Máquina)', 'Abdominal Na Máquina'], video: '5uTPwcdt4gQ', label: 'Abdominal na máquina', author: 'Via Brasil Club', source: 'https://www.youtube.com/watch?v=5uTPwcdt4gQ' },
  { names: ['Squat (Smith Machine)', 'Agachamento no Smith (Máquina)'], video: 'N2H9VE7LZX8', label: 'Agachamento no Smith', author: 'Vanessa Santiago', source: 'https://www.youtube.com/watch?v=N2H9VE7LZX8' },
  { names: ['Lateral Raise (Machine)', 'Elevação Lateral (Máquina)'], video: 'jTtN4KpiRLE', label: 'Elevação lateral na máquina', author: 'Dan Champions', source: 'https://www.youtube.com/watch?v=jTtN4KpiRLE' },
  { names: ['Lat Pulldown (Cable)', 'Puxada Alta (Cabo)'], video: 'pJM_rHhluK8', label: 'Puxada na polia · aula com pegadas', author: 'Leandro Twin', source: twin },
  { names: ['Lat Pulldown (Machine)', 'Puxada Alta (Máquina)'], video: 'RuAXe8Ih8dQ', label: 'Puxada alta na máquina', author: 'Wilhian Mello', source: 'https://www.youtube.com/watch?v=RuAXe8Ih8dQ' },
  { names: ['Seated Cable Row - V Grip (Cable)', 'Remada Sentada com Pegada em V (Cabo)'], video: 'HpWWreyaBN0', label: 'Remada no cabo · aula com pegadas', author: 'Leandro Twin', source: twin },
  { names: ['EZ Bar Biceps Curl', 'EZ Bar Bicep Curl', 'Rosca Direta (Barra W)', 'Bicep Curl (Barbell)'], video: 'Q8TqfD8E7BU', label: 'Rosca direta · aula com variações', author: 'Leandro Twin', source: twin },
  { names: ['Preacher Curl (Machine)', 'Rosca Scott (Máquina)'], video: 'zpTK6eihdSA', label: 'Rosca Scott · aula com variações', author: 'Leandro Twin', source: twin },
  { names: ['Triceps Rope Pushdown', 'Tríceps na Polia com Corda'], video: 'dTqDKC0D6P4', label: 'Tríceps na polia · aula com pegadas', author: 'Leandro Twin', source: twin },
  { names: ['Triceps Extension (Dumbbell)', 'Extensão de Tríceps (Halter)'], video: 'YJ4kGE3eemY', label: 'Extensão de tríceps acima da cabeça · aula com variações', author: 'Leandro Twin', source: twin },
  { names: ['Back Extension (Weighted Hyperextension)', 'Back Extension (Hyperextension)', 'Extensão Lombar (Hiperextensão com Peso)', 'Extensão Lombar (Hiperextensão)'], video: 'z0rx9swRDR0', label: 'Extensão lombar', author: 'Leandro Twin', source: twin },
  { names: ['Shoulder Press (Machine)', 'Shoulder Press (Plate Loaded)', 'Desenvolvimento de Ombros (Máquina de Placas)'], video: 'EuQAfhXBEvs', label: 'Desenvolvimento de ombros · aula com variações', author: 'Leandro Twin', source: twin },
]
const guideByName = new Map(EXECUTION_GUIDES.flatMap(guide => guide.names.map(name => [normalize(name), guide])))
export function executionGuide(apiTitle, templateTitle, custom = false) {
  if (custom) return null
  return guideByName.get(normalize(apiTitle)) || (!apiTitle ? guideByName.get(normalize(templateTitle)) : null) || null
}
