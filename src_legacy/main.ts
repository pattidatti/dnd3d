import './style.css';
import { App } from './App';

const canvas = document.getElementById('scene') as HTMLCanvasElement;
const app = new App(canvas);
app.start();
