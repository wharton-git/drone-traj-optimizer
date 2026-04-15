import { useMutation } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';
import type { OptimizationPayload, OptimizationResponse } from '../types';

// Fonction asynchrone utilisant Axios
const optimizeTrajectory = async (payload: OptimizationPayload): Promise<OptimizationResponse> => {
    // Axios s'occupe automatiquement du JSON.stringify, des headers Content-Type,
    // et lève automatiquement une exception si le statut HTTP est >= 400.
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
            // Gestion avancée des erreurs avec Axios pour extraire les logs de FastAPI
            if (axios.isAxiosError(error)) {
                console.error(`Erreur HTTP ${error.response?.status}`);
                
                // C'est ici que tu vas voir la cause exacte du rejet par FastAPI (ex: validation Pydantic)
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