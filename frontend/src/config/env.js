import { Platform } from 'react-native';

/**
 * env.js — Point UNIQUE de configuration réseau de l'application.
 * Tous les services (ApiClient, SocketService) importent ces valeurs :
 * un seul endroit à modifier pour brancher l'app sur le backend LogiChain.
 *
 * Sur le WEB, l'application est servie par Nginx sur le MÊME domaine que
 * l'API (https://logichain.online) : des URLs relatives à l'origine
 * courante fonctionnent donc aussi bien en développement local
 * (`expo start --web` sur localhost) qu'en production, sans configuration
 * supplémentaire ni risque de pointer vers le mauvais environnement.
 *
 * Sur MOBILE natif, l'application tourne sur un appareil ou un émulateur
 * distinct du serveur : l'adresse doit être renseignée explicitement.
 *   - Émulateur Android      -> http://10.0.2.2:4000
 *   - Simulateur iOS         -> http://localhost:4000
 *   - Téléphone physique     -> http://<IP_LAN_DE_TON_ORDINATEUR>:4000
 *   - Build de production    -> https://logichain.online
 */
const NATIVE_HOST = 'http://10.0.2.2:4000'; // <-- à adapter selon l'environnement ci-dessus

const HOST = Platform.OS === 'web' ? window.location.origin : NATIVE_HOST;

export const API_BASE_URL = `${HOST}/api/v1`;
export const SOCKET_URL = HOST;
