import axios from 'axios';
import { HevyWorkout } from '../types/plateau';

export interface HevySyncResult {
  workouts: HevyWorkout[];
  syncedAt: string;
  totalPages: number;
}

/**
 * Fetches all workouts from Hevy API by paginating through all available pages
 * using GET https://api.hevyapp.com/v1/workouts?page=X&pageSize=10
 * Authenticated via api-key header.
 */
export const fetchAllHevyWorkouts = async (
  apiKey: string,
  onProgress?: (currentPage: number, totalPages: number, loadedCount: number) => void
): Promise<HevySyncResult> => {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Chave de API da Hevy não informada. Conecte sua API Key.');
  }

  let page = 1;
  const pageSize = 10;
  let allWorkouts: HevyWorkout[] = [];
  let totalPages = 1;

  while (page <= totalPages) {
    let response;
    try {
      response = await axios.post('/api/hevy/proxy', {
        endpoint: `/workouts?page=${page}&pageSize=${pageSize}`,
        method: 'GET',
        apiKey: apiKey.trim(),
      });
    } catch (error: any) {
      console.error(`Erro na página ${page} do Hevy:`, error);
      const apiErrorMsg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Erro desconhecido ao conectar com o Hevy';
      throw new Error(`Falha ao sincronizar com a API do Hevy: ${apiErrorMsg}`);
    }

    const data = response.data;
    if (!data || !Array.isArray(data.workouts)) {
      throw new Error(
        'Falha ao sincronizar com a API do Hevy: formato de resposta inesperado (workouts não é uma lista).'
      );
    }

    const pageWorkouts: HevyWorkout[] = data.workouts;
    if (pageWorkouts.length === 0 && page === 1) {
      // Empty workouts history
      break;
    }

    if (pageWorkouts.length === 0) {
      break;
    }

    allWorkouts = allWorkouts.concat(pageWorkouts);

    if (typeof data.page_count === 'number' && data.page_count > 0) {
      totalPages = data.page_count;
    } else if (pageWorkouts.length < pageSize) {
      // Last page reached if fewer than pageSize items returned
      break;
    } else {
      totalPages = page + 1;
    }

    if (onProgress) {
      onProgress(page, totalPages, allWorkouts.length);
    }

    page++;
    if (page > 300) {
      // Extreme safety guard for over 3000 workouts
      break;
    }
  }

  const syncedAt = new Date().toISOString();
  return {
    workouts: allWorkouts,
    syncedAt,
    totalPages,
  };
};

export const syncWorkouts = async (apiKey: string) => {
  const result = await fetchAllHevyWorkouts(apiKey);
  return result.workouts;
};

export const fetchExercises = async (apiKey: string) => {
  try {
    const response = await axios.post('/api/hevy/proxy', {
      endpoint: '/exercises?page=1&pageSize=10',
      method: 'GET',
      apiKey: apiKey.trim(),
    });
    return response.data?.exercises || [];
  } catch (error: any) {
    const apiErrorMsg =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'Erro desconhecido';
    throw new Error(`Falha ao buscar exercícios da API do Hevy: ${apiErrorMsg}`);
  }
};

export const fetchHevyRoutines = async (apiKey: string): Promise<any[]> => {
  if (!apiKey || !apiKey.trim()) return [];
  try {
    let allRoutines: any[] = [];
    let page = 1;
    const pageSize = 10;
    let totalPages = 1;

    while (page <= totalPages) {
      const response = await axios.post('/api/hevy/proxy', {
        endpoint: `/routines?page=${page}&pageSize=${pageSize}`,
        method: 'GET',
        apiKey: apiKey.trim(),
      });

      const data = response.data;
      const routines = data?.routines || [];
      if (!Array.isArray(routines) || routines.length === 0) break;

      allRoutines = allRoutines.concat(routines);

      if (typeof data.page_count === 'number' && data.page_count > 0) {
        totalPages = data.page_count;
      } else if (routines.length < pageSize) {
        break;
      } else {
        totalPages = page + 1;
      }

      page++;
      if (page > 10) break; // Maximum 100 routines guard
    }

    return allRoutines;
  } catch (error: any) {
    console.warn('Could not fetch routines from Hevy:', error?.message);
    return [];
  }
};

/**
 * Creates and logs a completed workout directly in the user's Hevy account via POST /v1/workouts
 */
export const postHevyWorkout = async (
  apiKey: string,
  workoutPayload: {
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
    is_private?: boolean;
    exercises: {
      exercise_template_id: string;
      notes?: string;
      sets: {
        type?: string;
        weight_kg?: number | null;
        reps?: number | null;
        rpe?: number | null;
        distance_meters?: number | null;
        duration_seconds?: number | null;
      }[];
    }[];
  }
): Promise<any> => {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Chave de API do Hevy não informada. Conecte sua API Key nas configurações.');
  }

  try {
    const response = await axios.post('/api/hevy/proxy', {
      endpoint: '/workouts',
      method: 'POST',
      apiKey: apiKey.trim(),
      data: {
        workout: workoutPayload,
      },
    });

    return response.data?.workout || response.data;
  } catch (error: any) {
    console.error('Erro ao enviar treino para a API do Hevy:', error);
    const apiErrorMsg =
      error.response?.data?.error ||
      error.response?.data?.message ||
      (typeof error.response?.data === 'string' ? error.response?.data : null) ||
      error.message ||
      'Erro desconhecido ao conectar com a API do Hevy';
    throw new Error(`Falha ao registrar treino no Hevy: ${apiErrorMsg}`);
  }
};

/**
 * Fetches available exercise templates from Hevy API using pagination with pageSize=10
 */
export const fetchExerciseTemplates = async (apiKey: string): Promise<any[]> => {
  if (!apiKey || !apiKey.trim()) return [];
  try {
    let allTemplates: any[] = [];
    let page = 1;
    const pageSize = 10;
    let totalPages = 1;

    while (page <= totalPages) {
      const response = await axios.post('/api/hevy/proxy', {
        endpoint: `/exercise_templates?page=${page}&pageSize=${pageSize}`,
        method: 'GET',
        apiKey: apiKey.trim(),
      });

      const data = response.data;
      const templates = data?.exercise_templates || data?.exercises || [];
      if (!Array.isArray(templates) || templates.length === 0) break;

      allTemplates = allTemplates.concat(templates);

      if (typeof data.page_count === 'number' && data.page_count > 0) {
        totalPages = data.page_count;
      } else if (templates.length < pageSize) {
        break;
      } else {
        totalPages = page + 1;
      }

      page++;
      if (page > 15) break; // Maximum 150 templates guard
    }

    return allTemplates;
  } catch (error: any) {
    console.warn('Could not fetch exercise templates from Hevy:', error?.message);
    return [];
  }
};


