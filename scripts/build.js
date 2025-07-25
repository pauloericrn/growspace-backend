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
  
  // Substituir @/shared/* por imports relativos
  content = content.replace(
    /from ['"]@\/shared\/([^'"]+)['"]/g,
    (match, importPath) => {
      const relativePath = getRelativePath(filePath, `./shared/${importPath}`);
      return `from '${relativePath}'`;
    }
  );
  
  // Substituir @/modules/* por imports relativos
  content = content.replace(
    /from ['"]@\/modules\/([^'"]+)['"]/g,
    (match, importPath) => {
      const relativePath = getRelativePath(filePath, `./modules/${importPath}`);
      return `from '${relativePath}'`;
    }
  );
  
  // Substituir @/* por imports relativos
  content = content.replace(
    /from ['"]@\/([^'"]+)['"]/g,
    (match, importPath) => {
      const relativePath = getRelativePath(filePath, `./${importPath}`);
      return `from '${relativePath}'`;
    }
  );
  
  fs.writeFileSync(filePath, content);
}

/**
 * Calcula o caminho relativo entre dois arquivos
 */
function getRelativePath(fromFile, toPath) {
  const fromDir = path.dirname(fromFile);
  const relativePath = path.relative(fromDir, toPath);
  
  // Garantir que o caminho comece com ./
  return relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
} 