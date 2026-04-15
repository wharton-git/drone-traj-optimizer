import { useMutation } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';
import type { OptimizationPayload, OptimizationResponse } from '../types';

// Fonction asynchrone utilisant Axios
const optimizeTrajectory = async (payload: OptimizationPayload): Promise<OptimizationResponse> => {
    console.log(payload);


    const response = await axios.post<OptimizationResponse>(
        'http://localhost:8000/api/v1/optimize',
        payload
    );

    return response.data;
};

export const useOptimization = () => {
    return useMutation({
        mutationFn: optimizeTrajectory,
        onSuccess: (data) => {
            if (!data.success) {
                console.warn("Le solveur SLSQP n'a pas convergé avec ces paramètres.");
            } else {
                console.log("Optimisation réussie :", data);
            }
        },
        onError: (error) => {
            if (axios.isAxiosError(error)) {
                console.error(`Erreur HTTP ${error.response?.status}`);

                console.error("Détails de l'erreur FastAPI :", error.response?.data);

                if (error.code === 'ERR_NETWORK') {
                    console.error("Erreur réseau : Le backend est-il lancé ? Les CORS sont-ils configurés ?");
                }
            } else {
                console.error("Erreur inattendue :", error);
            }
        }
    });
};