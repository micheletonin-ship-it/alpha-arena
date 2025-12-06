const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Colori
const BACKGROUND = '#121212';
const NEON_GREEN = '#10B981';

// Funzione per disegnare la freccia a gradini (TrendingUp style)
function drawTrendArrow(ctx, size, isMaskable = false) {
    // Per le icone maskable, riduciamo la dimensione per rispettare la safe zone (40%)
    const scale = isMaskable ? 0.5 : 0.65;
    const padding = size * (1 - scale) / 2;

    // Sfondo nero
    ctx.fillStyle = BACKGROUND;
    ctx.fillRect(0, 0, size, size);

    // Setup per la freccia
    ctx.strokeStyle = NEON_GREEN;
    ctx.fillStyle = NEON_GREEN;
    ctx.lineWidth = size * 0.06;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Calcola le dimensioni per i gradini
    const width = size * scale;
    const height = size * scale;
    const numSteps = isMaskable ? 3 : 4; // Meno gradini per maskable
    const stepWidth = width / numSteps;
    const stepHeight = height / numSteps;

    // Disegna i gradini (linea a zig-zag che sale)
    ctx.beginPath();
    let currentX = padding;
    let currentY = size - padding;
    ctx.moveTo(currentX, currentY);

    for (let i = 0; i < numSteps; i++) {
        // Linea orizzontale verso destra
        currentX += stepWidth;
        ctx.lineTo(currentX, currentY);
        
        // Linea verticale verso l'alto
        currentY -= stepHeight;
        ctx.lineTo(currentX, currentY);
    }
    ctx.stroke();

    // Disegna la punta della freccia all'estremità finale
    const arrowSize = size * scale * 0.18;
    ctx.beginPath();
    // Punta rivolta verso l'alto e leggermente a destra
    ctx.moveTo(currentX, currentY);
    ctx.lineTo(currentX - arrowSize * 0.4, currentY + arrowSize * 0.5);
    ctx.lineTo(currentX - arrowSize * 0.15, currentY + arrowSize * 0.3);
    ctx.lineTo(currentX - arrowSize * 0.3, currentY + arrowSize * 0.15);
    ctx.lineTo(currentX - arrowSize * 0.5, currentY + arrowSize * 0.4);
    ctx.lineTo(currentX, currentY);
    ctx.lineTo(currentX + arrowSize * 0.5, currentY + arrowSize * 0.4);
    ctx.lineTo(currentX + arrowSize * 0.3, currentY + arrowSize * 0.15);
    ctx.lineTo(currentX + arrowSize * 0.15, currentY + arrowSize * 0.3);
    ctx.lineTo(currentX + arrowSize * 0.4, currentY + arrowSize * 0.5);
    ctx.closePath();
    ctx.fill();
}

// Funzione per generare un'icona
function generateIcon(size, isMaskable, filename) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    drawTrendArrow(ctx, size, isMaskable);
    
    const buffer = canvas.toBuffer('image/png');
    const outputPath = path.join(__dirname, 'public', 'icons', filename);
    
    // Assicurati che la directory esista
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, buffer);
    console.log(`✅ Generato: ${filename} (${size}x${size}px)`);
}

// Genera tutte le icone
console.log('🚀 Generazione icone AlphaArena...\n');

try {
    generateIcon(192, false, 'icon-192.png');
    generateIcon(512, false, 'icon-512.png');
    generateIcon(192, true, 'icon-maskable-192.png');
    generateIcon(512, true, 'icon-maskable-512.png');
    
    console.log('\n✨ Tutte le icone sono state generate con successo nella cartella public/icons/!');
} catch (error) {
    console.error('❌ Errore durante la generazione delle icone:', error.message);
    process.exit(1);
}
