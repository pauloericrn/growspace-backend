// Atualiza templates de email para incluir garden_name no HTML e nas variáveis
// Uso: node scripts/update-email-templates-garden.js
import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';

loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_URL/SUPABASE_SERVICE_KEY ausentes no .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const TEMPLATE_KEYS = ['task_reminder', 'task_overdue'];

function ensureGardenInHtml(html) {
  if (!html) return html;
  if (html.includes('{{garden_name}}')) return html; // já possui

  const plantLineRegex = /(<p><strong>[^<]*Planta:<\/strong>\s*\{\{plant_name\}\}<\/p>)/i;
  const gardenBlock = `\n                {{#if garden_name}}\n                <p><strong>🏡 Jardim:</strong> {{garden_name}}</p>\n                {{\/if}}`;

  if (plantLineRegex.test(html)) {
    return html.replace(plantLineRegex, `$1${gardenBlock}`);
  }

  // fallback: tenta inserir dentro de {{#if plant_name}} ... {{/if}}
  const ifBlockRegex = /\{\{#if\s+plant_name\}\}([\s\S]*?)\{\{\/if\}\}/i;
  if (ifBlockRegex.test(html)) {
    return html.replace(ifBlockRegex, (_m, inner) => {
      return `{{#if plant_name}}${inner}${gardenBlock}{{/if}}`;
    });
  }

  // sem blocos reconhecidos: não altera
  return html;
}

function ensureGardenInAvailableVariables(av) {
  try {
    const arr = Array.isArray(av) ? av : JSON.parse(av);
    if (!arr.includes('garden_name')) arr.push('garden_name');
    return JSON.stringify(arr);
  } catch {
    // se não for JSON válido, define padrão com garden_name
    return JSON.stringify(['user_name','task_title','task_description','task_priority','due_date','plant_name','garden_name','app_url']);
  }
}

async function run() {
  console.log('🔧 Atualizando templates:', TEMPLATE_KEYS.join(', '));
  for (const key of TEMPLATE_KEYS) {
    const { data: tpl, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_key', key)
      .single();

    if (error || !tpl) {
      console.error(`❌ Falha ao buscar template ${key}:`, error?.message || 'não encontrado');
      continue;
    }

    const updated = {
      html_template: ensureGardenInHtml(tpl.html_template),
      available_variables: ensureGardenInAvailableVariables(tpl.available_variables),
      updated_at: new Date().toISOString(),
    };

    const { error: upErr } = await supabase
      .from('email_templates')
      .update(updated)
      .eq('id', tpl.id);

    if (upErr) {
      console.error(`❌ Erro ao atualizar ${key}:`, upErr.message);
    } else {
      console.log(`✅ Template ${key} atualizado com garden_name`);
    }
  }

  console.log('✅ Finalizado');
}

run().catch((e) => {
  console.error('💥 Erro inesperado:', e);
  process.exit(1);
});


