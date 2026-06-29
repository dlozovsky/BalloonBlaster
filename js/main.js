import { initGame } from './gameController.js';
import { shareScore } from './ui.js';

window.addEventListener('load', initGame);
document.getElementById('share-button').addEventListener('click', shareScore);
