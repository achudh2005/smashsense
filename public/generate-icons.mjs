// Minimal script to create simple valid PNG icons for PWA
import fs from 'fs';
import path from 'path';

// Minimal 1x1 base64 png expanded or canvas
const minimalPngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAMAAACuSJvPAAAAA1BMVEUQtJ4aOq4/AAAASElEQVR4nO3BMQEAAADCoPVPbQ0PoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIALA8unAAG75nvdAAAAAElFTkSuQmCC";
const buffer = Buffer.from(minimalPngBase64, 'base64');

fs.writeFileSync(path.resolve('public', 'pwa-192x192.png'), buffer);
fs.writeFileSync(path.resolve('public', 'pwa-512x512.png'), buffer);
fs.writeFileSync(path.resolve('public', 'favicon.ico'), buffer);
console.log('Icons generated successfully.');
