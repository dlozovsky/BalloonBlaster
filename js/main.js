import { initGame } from './gameController.js';
import { downloadScoreCard, shareScore } from './ui.js';

window.addEventListener('load', initGame);
document.getElementById('share-button').addEventListener('click', shareScore);
document.getElementById('download-card-button').addEventListener('click', downloadScoreCard);
