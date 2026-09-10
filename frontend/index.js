/**
 * @format
 */
import { registerRootComponent } from 'expo';
import App from './App';

// `registerRootComponent` (et non `AppRegistry.registerComponent` seul) est
// indispensable pour le web : c'est lui qui monte réellement l'application
// dans le DOM (`AppRegistry.runApplication` sur l'élément racine), en plus
// d'enregistrer le composant pour Android/iOS.
registerRootComponent(App);
