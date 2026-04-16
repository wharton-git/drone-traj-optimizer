import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import type { OptimizationPayload, OptimizationResponse } from '../types';


const optimizeTrajectory = async (payload: OptimizationPayload): Promise<OptimizationResponse> => {
    const baseURL = import.meta.env.VITE_API_BASE_URL;

    console.log(payload);

    const response = await axios.post<OptimizationResponse>(
        `${baseURL}/api/v1/optimize`,
        payload
    );

    return response.data;
};

export const useOptimization = () => {
    return useMutation({
        mutationFn: optimizeTrajectory,
        onSuccess: (data) => {
            if (!data.success) {
                console.warn("Le solveur ADMC n'a pas convergé avec ces paramètres.");
            } else {
                console.log("Optimisation ADMC réussie :", data);
            }
        },
        onError: (error) => {
            if (axios.isAxiosError(error)) {
                console.error(`Erreur HTTP ${error.response?.status}`);
                console.error("Détails FastAPI :", error.response?.data);

                if (error.code === 'ERR_NETWORK') {
                    console.error("Erreur réseau : backend indisponible ou CORS mal configuré.");
                }
            } else {
                console.error("Erreur inattendue :", error);
            }
        }
    });
};