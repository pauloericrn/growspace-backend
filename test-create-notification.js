// ESM (type: module em package.json)
import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';

loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  try {
    // Buscar a última tarefa de cultivo (user_tasks)
    const { data: task, error: taskError } = await supabase
      .from('user_tasks')
      .select('id, user_id, name, due_date, priority, category, plant_id, description')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (taskError || !task) {
      console.error('Could not fetch a user_tasks row:', taskError?.message || 'not found');
      process.exit(1);
    }

    // Criar notificação pendente vinculada
    const nowIso = new Date().toISOString();
    const notification = {
      user_id: task.user_id,
      type: 'task_reminder',
      title: task.name || 'Tarefa de cultivo',
      message: task.description || `Você tem uma tarefa pendente: ${task.name}`,
      status: 'pending',
      scheduled_at: nowIso, // elegível imediatamente
      template_key: 'task_reminder',
      template_variables: {
        user_name: 'Usuário',
        task_title: task.name,
        task_category: task.category || null,
      },
      payload: {
        priority: task.priority || 'médio',
        task_id: task.id,
        task_table: 'user_tasks',
        plant_id: task.plant_id || null,
      },
      linked_task_id: task.id,
      linked_task_table: 'user_tasks',
    };

    const { data: inserted, error: insertError } = await supabase
      .from('notifications')
      .insert(notification)
      .select()
      .single();

    if (insertError) {
      console.error('Insert notification failed:', insertError.message, insertError);
      process.exit(1);
    }

    console.log('✅ Notification created:', {
      id: inserted.id,
      linked_task_id: inserted.linked_task_id,
      linked_task_table: inserted.linked_task_table,
      scheduled_at: inserted.scheduled_at,
      template_key: inserted.template_key,
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

await main();


