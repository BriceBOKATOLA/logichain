/**
 * env.js — Point UNIQUE de configuration réseau du mobile.
 * Tous les services (ApiClient, SocketService) importent ces valeurs :
 * un seul endroit à modifier pour brancher l'app sur le backend LogiChain.
 *
 * Rappel des adresses à utiliser selon l'environnement d'exécution :
 *  - Émulateur Android      -> http://10.0.2.2:4000
 *  - Simulateur iOS         -> http://localhost:4000
 *  - Téléphone physique     -> http://<IP_LAN_DE_TON_ORDINATEUR>:4000
 */
const HOST = 'http://10.0.2.2:4000'; // <-- à adapter selon l'environnement ci-dessus

export const API_BASE_URL = `${HOST}/api/v1`;
export const SOCKET_URL = HOST;
