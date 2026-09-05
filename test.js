const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://rsbflshmxakeasrykhif.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzYmZsc2hteGFrZWFzcnlraGlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0NzMzOTMsImV4cCI6MjEwMzA0OTM5M30.g_dCCBfqTMXZzBy6otkG8_ViejuDlSy1B09kbManaT4');
async function run() {
  const { data: rooms } = await supabase.from('rooms').select('*').limit(1);
  console.log('rooms:', rooms ? Object.keys(rooms[0] || {}) : 'no data');
  const { data: parts } = await supabase.from('participants').select('*').limit(1);
  console.log('participants:', parts ? Object.keys(parts[0] || {}) : 'no data');
  const { data: swipes } = await supabase.from('swipes').select('*').limit(1);
  console.log('swipes:', swipes ? Object.keys(swipes[0] || {}) : 'no data');
}
run();
