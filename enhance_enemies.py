import re

with open('game.js', 'r') as f:
    content = f.read()

# Función mejorada para drawEnemies con identificación visual clara
new_draw_enemies = '''function drawEnemies() {
  for (const e of enemies) {
    ctx.save();
    
    if (e.type === 'drone') {
      // DRONE - Cuadrado metálico con ojo
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#00ff00';
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(e.x, e.y, e.width, e.height);
      
      // Border distintivo para drone
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 3;
      ctx.strokeRect(e.x - 2, e.y - 2, e.width + 4, e.height + 4);
      
      // Ojo blanco
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(e.x + e.width - 8, e.y + e.height/2, 4, 0, Math.PI * 2);
      ctx.fill();
      
      // Estudiante del ojo
      ctx.fillStyle = '#00ff00';
      ctx.beginPath();
      ctx.arc(e.x + e.width - 8, e.y + e.height/2, 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Etiqueta "DRONE"
      ctx.fillStyle = '#00ff00';
      ctx.font = 'bold 10px Orbitron';
      ctx.textAlign = 'center';
      ctx.fillText('DRONE', e.x + e.width/2, e.y - 8);
      
    } else if (e.type === 'phantom') {
      // PHANTOM - Círculo fantasmal con alpha variable y más distintivo
      ctx.globalAlpha = Math.max(e.alpha, 0.4);
      ctx.shadowBlur = 30;
      ctx.shadowColor = '#aa00ff';
      ctx.fillStyle = '#aa00ff';
      ctx.beginPath();
      ctx.arc(e.x + e.width/2, e.y + e.height/2, e.width/2, 0, Math.PI * 2);
      ctx.fill();
      
      // Borde pulsante del phantom
      ctx.globalAlpha = Math.max(e.alpha * 0.8, 0.3);
      ctx.strokeStyle = '#ff00ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x + e.width/2, e.y + e.height/2, e.width/2 + 3, 0, Math.PI * 2);
      ctx.stroke();
      
      // Etiqueta "PHANTOM"
      ctx.globalAlpha = Math.max(e.alpha, 0.4);
      ctx.fillStyle = '#ff00ff';
      ctx.font = 'bold 10px Orbitron';
      ctx.textAlign = 'center';
      ctx.fillText('PHANTOM', e.x + e.width/2, e.y - 8);
      
    } else if (e.type === 'golem') {
      // GOLEM - Bloque grande con advertencia visual clara
      if (e.warningTimer > 0) {
        // Pulsing warning línea
        const pulseAlpha = Math.sin(e.warningTimer / 10) * 0.5 + 0.5;
        ctx.strokeStyle = `rgba(255, 34, 0, ${pulseAlpha})`;
        ctx.lineWidth = 6;
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(e.shadowLine, groundY);
        ctx.lineTo(e.shadowLine, groundY - 100);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Advertencia de texto
        ctx.fillStyle = 'rgba(255, 34, 0, ' + pulseAlpha + ')';
        ctx.font = 'bold 14px Orbitron';
        ctx.textAlign = 'center';
        ctx.fillText('⚠', e.shadowLine, groundY - 110);
      } else {
        ctx.shadowBlur = 30;
        ctx.shadowColor = '#ff6600';
        ctx.fillStyle = '#ff6600';
        ctx.fillRect(e.x, e.y, e.width, e.height);
        
        // Ojos del Golem
        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(e.x + 8, e.y + 10, 20, 20);
        ctx.fillRect(e.x + 38, e.y + 10, 20, 20);
        
        // Pupilas
        ctx.fillStyle = '#000';
        ctx.fillRect(e.x + 12, e.y + 14, 10, 10);
        ctx.fillRect(e.x + 42, e.y + 14, 10, 10);
        
        // Etiqueta "GOLEM"
        ctx.fillStyle = '#ffaa00';
        ctx.font = 'bold 10px Orbitron';
        ctx.textAlign = 'center';
        ctx.fillText('GOLEM', e.x + e.width/2, e.y - 8);
      }
      
    } else if (e.type === 'mirror') {
      // MIRROR - Rectángulo con reflejos
      ctx.shadowBlur = 25;
      ctx.shadowColor = '#00ffff';
      ctx.fillStyle = '#00ffff';
      ctx.fillRect(e.x, e.y, e.width, e.height);
      
      // Reflejos dentro del espejo
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(e.x + 5, e.y + 5, e.width - 10, 8);
      ctx.fillRect(e.x + 5, e.y + e.height - 13, e.width - 10, 8);
      
      // Border distintivo
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 3;
      ctx.strokeRect(e.x - 2, e.y - 2, e.width + 4, e.height + 4);
      
      // Etiqueta "MIRROR"
      ctx.fillStyle = '#00ffff';
      ctx.font = 'bold 10px Orbitron';
      ctx.textAlign = 'center';
      ctx.fillText('MIRROR', e.x + e.width/2, e.y - 8);
    }
    
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}'''

# Reemplazar la función anterior
pattern = r'function drawEnemies\(\) \{[^}]+\}(?:\s+\})?'
content = re.sub(pattern, new_draw_enemies, content, flags=re.DOTALL)

with open('game.js', 'w') as f:
    f.write(content)

print("✅ Enemigos mejorados exitosamente!")
print("\nMejoras aplicadas:")
print("- DRONE: Ahora es un cuadrado verde con borde y ojo distintivo + etiqueta")
print("- PHANTOM: Círculo púrpura con borde pulsante y etiqueta")
print("- GOLEM: Bloque naranja con ojos, advertencia mejorada + etiqueta")
print("- MIRROR: Rectángulo cian con reflejos y borde distintivo + etiqueta")
print("\nTodos los enemigos ahora tienen:")
print("  • Identificación visual clara (colores únicos)")
print("  • Etiquetas de nombre en el canvas")
print("  • Efectos de sombra mejorados")
print("  • Detalles únicos para cada tipo")
