const fs = require('fs');

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

// 3. Add ToolCard after treasureHunt (since nhayBaoBo is tricky)
const treasureMarker = `{!hiddenApps.includes('treasureHunt') && <ToolCard title="Truy Tìm Kho Báu" description="Game phiêu lưu khám phá, tự soạn câu hỏi" icon={<span className="text-2xl">🏴‍☠️</span>} accentColor="bg-gradient-to-br from-orange-500 to-amber-500" onClick={onTreasureHunt} badge="Mới" />}`;
const newCard = `\n                                        {!hiddenApps.includes('keoCoTriTue') && <ToolCard title="Kéo Co Trí Tuệ" description="Hai đội kéo co bằng trí tuệ, trả lời câu hỏi" icon={<span className="text-2xl">⚔️</span>} accentColor="bg-gradient-to-br from-orange-500 via-purple-500 to-blue-500" onClick={onKeoCoTriTue} badge="Mới" />}`;

dash = dash.replace(treasureMarker, treasureMarker + newCard);

fs.writeFileSync('components/Dashboard.tsx', dash);
console.log('✅ Dashboard patched successfully');
