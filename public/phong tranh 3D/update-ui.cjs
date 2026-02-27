const fs = require('fs');
const file = 'd:\\CÁC WEB APP\\GIAOVIENCN\\public\\phong tranh 3D\\gallery-studio.html';
let c = fs.readFileSync(file, 'utf8');

// 1. Replace welcome CSS section (from "/* === WELCOME" to "/* === EDITOR")
const cssStart = c.indexOf('/* === WELCOME');
const cssEnd = c.indexOf('/* === EDITOR');
if (cssStart === -1 || cssEnd === -1) { console.error('CSS markers not found'); process.exit(1); }

const newCSS = `/* === DASHBOARD LAYOUT === */
        #welcome {
            flex-direction: row;
            background: radial-gradient(ellipse at 20% 50%, rgba(180, 120, 40, .06) 0%, transparent 50%),
                        linear-gradient(160deg, #0c0c14 0%, #14100a 50%, #0c0c14 100%);
            position: relative
        }

        .sidebar {
            width: 240px;
            height: 100vh;
            background: rgba(20, 18, 14, .95);
            border-right: 1px solid rgba(245, 200, 66, .08);
            display: flex;
            flex-direction: column;
            padding: 1.5rem 1rem;
            flex-shrink: 0
        }

        .sidebar-logo {
            display: flex;
            align-items: center;
            gap: .6rem;
            padding: 0 .5rem;
            margin-bottom: 2rem
        }

        .sidebar-logo .logo-icon {
            width: 36px;
            height: 36px;
            background: linear-gradient(135deg, #f5c842, #e8913a);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.2rem
        }

        .sidebar-logo h2 {
            font-size: .95rem;
            font-weight: 600;
            color: #f0e8d8;
            line-height: 1.2
        }

        .sidebar-logo h2 small {
            display: block;
            font-size: .7rem;
            font-weight: 400;
            color: rgba(245, 232, 210, .4);
            margin-top: 2px
        }

        .sidebar-nav {
            display: flex;
            flex-direction: column;
            gap: .3rem;
            flex: 1
        }

        .nav-item {
            display: flex;
            align-items: center;
            gap: .7rem;
            padding: .7rem .8rem;
            border-radius: 10px;
            cursor: pointer;
            transition: all .2s;
            font-size: .85rem;
            color: rgba(245, 232, 210, .5);
            border: none;
            background: none;
            font-family: inherit;
            width: 100%;
            text-align: left
        }

        .nav-item:hover {
            background: rgba(245, 200, 66, .06);
            color: rgba(245, 232, 210, .8)
        }

        .nav-item.active {
            background: rgba(245, 200, 66, .1);
            color: #f5c842;
            font-weight: 600
        }

        .nav-item .nav-icon { font-size: 1.1rem; width: 24px; text-align: center }

        .nav-divider { height: 1px; background: rgba(245, 200, 66, .06); margin: .8rem 0 }

        .sidebar-footer { padding: .5rem; font-size: .7rem; color: rgba(245, 232, 210, .2); text-align: center }

        .main-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow-y: auto;
            padding: 2rem 3rem
        }

        .main-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            margin-bottom: 2rem
        }

        .main-header h1 { font-size: 1.5rem; font-weight: 600; color: #f0e8d8 }
        .main-header p { font-size: .85rem; color: rgba(245, 232, 210, .4); margin-top: .25rem }

        .empty-dashboard {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center
        }

        .empty-dashboard .empty-icon {
            width: 100px;
            height: 100px;
            background: rgba(245, 200, 66, .06);
            border: 2px dashed rgba(245, 200, 66, .15);
            border-radius: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2.5rem;
            margin-bottom: 1.5rem
        }

        .empty-dashboard h3 { font-size: 1.2rem; margin-bottom: .5rem; color: rgba(245, 232, 210, .7) }
        .empty-dashboard p { font-size: .85rem; color: rgba(245, 232, 210, .3); margin-bottom: 1.5rem; max-width: 300px }

        .btn-create {
            padding: .7rem 1.8rem;
            background: linear-gradient(135deg, #e8913a, #d4603a);
            color: #fff;
            border: none;
            border-radius: 12px;
            cursor: pointer;
            font-family: inherit;
            font-size: .9rem;
            font-weight: 600;
            transition: all .2s;
            display: flex;
            align-items: center;
            gap: .5rem
        }

        .btn-create:hover {
            box-shadow: 0 6px 24px rgba(232, 145, 58, .3);
            transform: translateY(-2px)
        }

        `;

c = c.substring(0, cssStart) + newCSS + c.substring(cssEnd);

// 2. Replace welcome HTML (from "<!-- === WELCOME" to "<!-- === EDITOR")
const htmlStart = c.indexOf('<!-- === WELCOME');
const htmlEnd = c.indexOf('<!-- === EDITOR');
if (htmlStart === -1 || htmlEnd === -1) { console.error('HTML markers not found'); process.exit(1); }

const newHTML = `<!-- === DASHBOARD SCREEN === -->
    <div id="welcome" class="screen active">
        <div class="sidebar">
            <div class="sidebar-logo">
                <div class="logo-icon">\u{1F3DB}</div>
                <h2>Tri\u1ec3n l\u00e3m \u1ea3o<small>Ph\u00f2ng tr\u01b0ng b\u00e0y 3D</small></h2>
            </div>
            <div class="sidebar-nav">
                <button class="nav-item" onclick="startNew()">
                    <span class="nav-icon">\u2795</span> T\u1ea1o ph\u00f2ng m\u1edbi
                </button>
                <div class="nav-divider"></div>
                <button class="nav-item active">
                    <span class="nav-icon">\u{1F5BC}</span> Ph\u00f2ng c\u1ee7a t\u00f4i
                </button>
                <button class="nav-item" onclick="loadFile()">
                    <span class="nav-icon">\u{1F4C2}</span> M\u1edf d\u1ef1 \u00e1n
                </button>
            </div>
            <div class="sidebar-footer">\u00a9 2025 Ph\u00f2ng Tr\u01b0ng B\u00e0y 3D</div>
        </div>
        <div class="main-content">
            <div class="main-header">
                <div>
                    <h1>\u{1F5BC} Ph\u00f2ng c\u1ee7a t\u00f4i</h1>
                    <p>Qu\u1ea3n l\u00fd c\u00e1c tri\u1ec3n l\u00e3m 3D c\u1ee7a b\u1ea1n</p>
                </div>
            </div>
            <div class="empty-dashboard">
                <div class="empty-icon">\u{1F3A8}</div>
                <h3>Ch\u01b0a c\u00f3 tri\u1ec3n l\u00e3m n\u00e0o</h3>
                <p>B\u1eaft \u0111\u1ea7u b\u1eb1ng c\u00e1ch t\u1ea1o ph\u00f2ng tr\u01b0ng b\u00e0y 3D \u0111\u1ea7u ti\u00ean c\u1ee7a b\u1ea1n</p>
                <button class="btn-create" onclick="startNew()">\u2728 T\u1ea1o Tri\u1ec3n L\u00e3m \u0110\u1ea7u Ti\u00ean</button>
            </div>
        </div>
    </div>

    `;

c = c.substring(0, htmlStart) + newHTML + c.substring(htmlEnd);

fs.writeFileSync(file, c);
console.log('UI updated successfully!');
