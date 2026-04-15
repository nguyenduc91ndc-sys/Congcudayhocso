const fs = require('fs');

// === PATCH App.tsx ===
let app = fs.readFileSync('App.tsx', 'utf8');

// 1. Add onKeoCoTriTue prop to Dashboard
const marker1 = "onSolarSystem={() => requireLogin(() => setView('SOLAR_SYSTEM'))}";
const insert1 = marker1 + "\n                   onKeoCoTriTue={() => requireLogin(() => setView('KEO_CO_TRI_TUE'))}";
app = app.replace(marker1, insert1);

fs.writeFileSync('App.tsx', app);
console.log('✅ App.tsx patched');

// === PATCH Dashboard.tsx ===
let dash = fs.readFileSync('components/Dashboard.tsx', 'utf8');

// 1. Add prop type
dash = dash.replace(
  'onSolarSystem: () => void;',
  'onSolarSystem: () => void;\n    onKeoCoTriTue: () => void;'
);

// 2. Add to destructuring
dash = dash.replace(
  'onSolarSystem, isAdmin',
  'onSolarSystem, onKeoCoTriTue, isAdmin'
);

// 3. Add ToolCard after nhayBaoBo
dash = dash.replace(
  `{!hiddenApps.includes('nhayBaoBo')`,
  `{!hiddenApps.includes('keoCoTriTue') && <ToolCard title="Kéo Co Trí Tuệ" description="2 đội kéo co bằng trí tuệ, trả lời câu hỏi" icon={<span className="text-2xl">⚔️</span>} accentColor="bg-gradient-to-br from-orange-500 via-purple-500 to-blue-500" onClick={onKeoCoTriTue} badge="Mới" />}\n                                        {!hiddenApps.includes('nhayBaoBo')`
);

fs.writeFileSync('components/Dashboard.tsx', dash);
console.log('✅ Dashboard.tsx patched');
