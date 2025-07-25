import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Script de build para produção
 * Resolve path aliases e prepara o código para deploy
 */

console.log('🔧 Iniciando build para produção...');

// 1. Compilar TypeScript
console.log('📦 Compilando TypeScript...');
execSync('npx tsc', { stdio: 'inherit' });

// 2. Resolver path aliases nos arquivos compilados
console.log('🔗 Resolvendo path aliases...');
resolvePathAliases('./dist');

console.log('✅ Build concluído com sucesso!');

/**
 * Resolve path aliases nos arquivos compilados
 */
function resolvePathAliases(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      resolvePathAliases(filePath);
    } else if (file.endsWith('.js')) {
      resolvePathAliasesInFile(filePath);
    }
  }
}

/**
 * Resolve path aliases em um arquivo específico
 */
function resolvePathAliasesInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Substituir imports problemáticos do logger
  content = content.replace(
    /from ['"]\.\.\\\.\.\\\.\.\\shared\/config\/environment\.js['"]/g,
    "from '../config/environment.js'"
  );
  
  // Substituir outros imports problemáticos
  content = content.replace(
    /from ['"]\.\.\\\.\.\\\.\.\\shared\/([^'"]+)['"]/g,
    (match, importPath) => {
      return `from '../${importPath}'`;
    }
  );
  
  fs.writeFileSync(filePath, content);
} 