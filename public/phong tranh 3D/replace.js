const fs = require('fs');
const file = 'gallery-studio.html';
let c = fs.readFileSync(file, 'utf8');
const startStr = '// === COMPLEX ROOM GENERATION (L-SHAPED CORRIDORS) ===';
const endStr = 'function animate() {';
const startIndex = c.indexOf(startStr);
const endIndex = c.indexOf(endStr);

if (startIndex === -1 || endIndex === -1) {
    console.error("Could not find start or end index");
    process.exit(1);
}

const newBlock = `// === COMPLEX ROOM GENERATION (CROSS LAYOUT) ===
            const imgs = state.images, count = imgs.length;
            const wallH = 6;

            // Materials
            const floorMat = new THREE.MeshStandardMaterial({ color: state.colors.floor, roughness: 0.6, metalness: 0.05 });
            const wallMat = new THREE.MeshStandardMaterial({ color: state.colors.wall, roughness: 0.85 });
            const cMat = new THREE.MeshStandardMaterial({ color: state.colors.ceil, roughness: 1 });
            const bbMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(state.colors.wall).multiplyScalar(0.7) });
            const pillarMat = new THREE.MeshStandardMaterial({ color: state.colors.wall, roughness: 0.4, metalness: 0.1 });

            camera.position.set(0, 2.5, 18);
            if (fpsCtrl) {
              const e = new THREE.Euler(0, 0, 0, 'YXZ');
              camera.quaternion.setFromEuler(e);
            }

            // 1. Floors & Ceilings
            const addFloor = (w, d, x, z) => {
                const f = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorMat);
                f.rotation.x = -Math.PI / 2; f.position.set(x, 0, z); f.receiveShadow = true; scene.add(f);
                const c = new THREE.Mesh(new THREE.PlaneGeometry(w, d), cMat);
                c.rotation.x = Math.PI / 2; c.position.set(x, wallH, z); scene.add(c);
            };
            addFloor(20, 20, 0, 10); // Main
            addFloor(20, 20, 0, -10); // Back
            addFloor(20, 20, -20, 10); // Left
            addFloor(20, 20, 20, 10); // Right

            // 2. Walls
            const createWall = (cx, cz, w, rDir) => {
                let ry = 0;
                if (rDir === 'N') ry = Math.PI;
                else if (rDir === 'S') ry = 0;
                else if (rDir === 'E') ry = Math.PI/2;
                else if (rDir === 'W') ry = -Math.PI/2;

                const wall = new THREE.Mesh(new THREE.PlaneGeometry(w, wallH), wallMat);
                wall.position.set(cx, wallH / 2, cz);
                wall.rotation.y = ry;
                scene.add(wall);

                const bb = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.2), bbMat);
                bb.position.set(cx, 0.1, cz);
                bb.rotation.y = ry;
                const normal = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry);
                bb.position.add(normal.multiplyScalar(0.01));
                scene.add(bb);

                return { len: w, cx, cz, nx: normal.x, nz: normal.z, ry, y: wallH * 0.5, vx: -normal.z, vz: normal.x };
            };

            const walls = [];
            const wallsDef = [
                // Main Room
                [0, 20, 20, 'N'], [-6.5, 0, 7, 'S'], [6.5, 0, 7, 'S'], [-10, 16.5, 7, 'E'], [-10, 3.5, 7, 'E'], [10, 16.5, 7, 'W'], [10, 3.5, 7, 'W'],
                // Back Room 
                [-6.5, 0, 7, 'N'], [6.5, 0, 7, 'N'], [0, -20, 20, 'S'], [-10, -10, 20, 'E'], [10, -10, 20, 'W'],
                // Left Room 
                [-20, 20, 20, 'N'], [-20, 0, 20, 'S'], [-30, 10, 20, 'E'], [-10, 16.5, 7, 'W'], [-10, 3.5, 7, 'W'],
                // Right Room 
                [20, 20, 20, 'N'], [20, 0, 20, 'S'], [30, 10, 20, 'W'], [10, 16.5, 7, 'E'], [10, 3.5, 7, 'E']
            ];
            wallsDef.forEach(wd => walls.push(createWall(wd[0], wd[1], wd[2], wd[3])));

            // 3. Pillars
            const pGeo = new THREE.CylinderGeometry(0.2, 0.25, wallH, 12);
            [
                [-10, 0], [10, 0], [-10, 20], [10, 20], [-10, -20], [10, -20], 
                [-30, 0], [-30, 20], [30, 0], [30, 20],
                [-3, 0], [3, 0], [-10, 7], [-10, 13], [10, 7], [10, 13]
            ].forEach(([px, pz]) => {
                const pil = new THREE.Mesh(pGeo, pillarMat); pil.position.set(px, wallH / 2, pz); scene.add(pil);
            });

            // 4. Ceiling Lights
            const addLights = (w, d, cx, cz) => {
                const pX = Math.ceil(w / 8), pZ = Math.ceil(d / 10);
                for (let ix = 0; ix < pX; ix++) for (let iz = 0; iz < pZ; iz++) {
                    const lx = cx - w / 2 + 4 + ix * 8, lz = cz - d / 2 + 5 + iz * 10;
                    const pl = new THREE.PointLight(0xfff5e6, 0.5, 18); pl.position.set(lx, wallH - 0.3, lz); scene.add(pl);
                    const panel = new THREE.Mesh(new THREE.PlaneGeometry(2, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff8e1, emissiveIntensity: 0.8 }));
                    panel.rotation.x = Math.PI / 2; panel.position.set(lx, wallH - 0.02, lz); scene.add(panel);
                }
            };
            addLights(20, 20, 0, 10); addLights(20, 20, 0, -10); addLights(20, 20, -20, 10); addLights(20, 20, 20, 10);

            // === PAINTINGS DISTRIBUTION ===
            const paintMap = new Map();
            const places = [];
            const availableWalls = [...walls].sort((a, b) => b.len - a.len);
            const imgsPerWall = Array(availableWalls.length).fill(0);
            let wIdx = 0;
            for (let i = 0; i < count; i++) {
                if (imgsPerWall[wIdx] * 4 > availableWalls[wIdx].len - 2) wIdx = (wIdx + 1) % availableWalls.length;
                imgsPerWall[wIdx]++;
                wIdx = (wIdx + 1) % availableWalls.length;
            }

            let imgCursor = 0;
            availableWalls.forEach((w, idx) => {
                const countOnWall = imgsPerWall[idx];
                if (countOnWall === 0) return;
                const spacing = w.len / (countOnWall + 1);
                const startX = w.cx - w.vx * w.len / 2;
                const startZ = w.cz - w.vz * w.len / 2;
                for (let i = 0; i < countOnWall; i++) {
                    const img = imgs[imgCursor++];
                    const px = startX + w.vx * spacing * (i + 1);
                    const pz = startZ + w.vz * spacing * (i + 1);
                    const finalX = px + w.nx * 0.05, finalZ = pz + w.nz * 0.05;

                    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.8, 0.08), new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.3, metalness: 0.5 }));
                    frame.position.set(finalX, w.y, finalZ); frame.rotation.y = w.ry; scene.add(frame);

                    const loader = new THREE.TextureLoader();
                    loader.load(img.url, (tex) => {
                        tex.colorSpace = THREE.SRGBColorSpace;
                        const iMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.5), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 }));
                        iMesh.position.set(finalX + w.nx * 0.045, w.y, finalZ + w.nz * 0.045);
                        iMesh.rotation.y = w.ry; scene.add(iMesh);
                        paintMap.set(iMesh, img);
                    }, undefined, () => { });

                    const sl = new THREE.SpotLight(0xfff5e6, 1.5, 8, Math.PI / 6, 0.5);
                    sl.position.set(finalX + w.nx * 2.5, wallH - 0.5, finalZ + w.nz * 2.5);
                    sl.target.position.set(finalX, w.y, finalZ); scene.add(sl); scene.add(sl.target);

                    const lCanvas = document.createElement('canvas'); lCanvas.width = 512; lCanvas.height = 64;
                    const lCtx = lCanvas.getContext('2d'); lCtx.fillStyle = 'rgba(0,0,0,0)'; lCtx.fillRect(0, 0, 512, 64);
                    lCtx.font = '24px Outfit,sans-serif'; lCtx.fillStyle = '#ccc'; lCtx.textAlign = 'center';
                    lCtx.fillText(img.title || \`Tác phẩm \${imgCursor}\`, 256, 40);
                    const lMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.22), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(lCanvas), transparent: true }));
                    lMesh.position.set(finalX + w.nx * 0.05, w.y - 1.15, finalZ + w.nz * 0.05);
                    lMesh.rotation.y = w.ry; scene.add(lMesh);

                    places.push({ x: finalX, y: w.y, z: finalZ, img, nx: w.nx, nz: w.nz });
                }
            });

            // Interaction
            const raycaster = new THREE.Raycaster(), mouse = new THREE.Vector2();
            const onClick = (e) => {
                if (isLocked) return;
                mouse.x = (e.clientX / W) * 2 - 1; mouse.y = -(e.clientY / H) * 2 + 1;
                raycaster.setFromCamera(mouse, camera);
                const hits = raycaster.intersectObjects(scene.children);
                for (const h of hits) { const d = paintMap.get(h.object); if (d) { showPopup(d); return; } }
                hidePopup();
            };
            renderer.domElement.addEventListener('click', onClick);

            function showPopup(d) {
                document.getElementById('popupTitle').textContent = d.title || 'Không có tiêu đề';
                document.getElementById('popupDesc').textContent = d.desc || '';
                document.getElementById('paintingPopup').classList.add('show');
                setTimeout(() => document.getElementById('paintingPopup').classList.remove('show'), 4000);
            }
            function hidePopup() { document.getElementById('paintingPopup').classList.remove('show'); }

            // Minimap
            const mapC = document.getElementById('minimapCanvas'), mapCtx = mapC.getContext('2d');
            function drawMiniMap() {
                const mw = mapC.width, mh = mapC.height;
                mapCtx.fillStyle = 'rgba(0,0,0,.8)'; mapCtx.fillRect(0, 0, mw, mh);
                
                const sx = mw / 66, sz = mh / 46;
                const ox = mw / 2, oz = mh / 2; // Central (0,0) point

                mapCtx.strokeStyle = 'rgba(255,255,255,.3)'; mapCtx.lineWidth = 1;
                mapCtx.strokeRect(ox - 10 * sx, oz, 20 * sx, 20 * sz); // Main
                mapCtx.strokeRect(ox - 10 * sx, oz - 20 * sz, 20 * sx, 20 * sz); // Back
                mapCtx.strokeRect(ox - 30 * sx, oz, 20 * sx, 20 * sz); // Left
                mapCtx.strokeRect(ox + 10 * sx, oz, 20 * sx, 20 * sz); // Right

                places.forEach(p => { mapCtx.fillStyle = '#facc15'; mapCtx.fillRect(ox + p.x * sx - 2, oz + p.z * sz - 2, 4, 4); });
                
                const cx = ox + camera.position.x * sx, cz = oz + camera.position.z * sz;
                mapCtx.fillStyle = '#ef4444'; mapCtx.beginPath(); mapCtx.arc(cx, cz, 4, 0, Math.PI * 2); mapCtx.fill();
                const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
                mapCtx.strokeStyle = '#ef4444'; mapCtx.lineWidth = 2; mapCtx.beginPath();
                mapCtx.moveTo(cx, cz); mapCtx.lineTo(cx + dir.x * 15, cz + dir.z * 15); mapCtx.stroke();
            }

            // Mode & FPS
            let mode = 'fps';
            const clickStartEl = document.getElementById('clickStart');
            const hudCtrl = document.getElementById('hudControls');
            let euler = new THREE.Euler(0, 0, 0, 'YXZ');
            const PI_2 = Math.PI / 2;
            let isLocked = false;

            window.setOrbitMode = () => { mode = 'orbit'; orbitCtrl.enabled = true; if (isLocked) document.exitPointerLock(); document.getElementById('btnOrbit').classList.add('active'); document.getElementById('btnFPS').classList.remove('active'); clickStartEl.style.display = 'none'; hudCtrl.style.display = 'none'; };
            window.setFPSMode = () => { mode = 'fps'; orbitCtrl.enabled = false; document.getElementById('btnOrbit').classList.remove('active'); document.getElementById('btnFPS').classList.add('active'); clickStartEl.style.display = 'block'; hudCtrl.style.display = 'block'; };
            document.addEventListener('pointerlockchange', () => { isLocked = document.pointerLockElement === document.body; if (mode === 'fps') clickStartEl.style.display = isLocked ? 'none' : 'block'; });
            window.lockPointer = () => { if (mode === 'fps') document.body.requestPointerLock(); };

            document.addEventListener('mousemove', (event) => {
                if (isLocked && mode === 'fps') {
                    const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
                    const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
                    euler.setFromQuaternion(camera.quaternion);
                    euler.y -= movementX * 0.002;
                    euler.x -= movementY * 0.002;
                    euler.x = Math.max(-PI_2, Math.min(PI_2, euler.x));
                    camera.quaternion.setFromEuler(euler);
                }
            });

            // Tour
            let tourTarget = null, tourLookAt = null, tourIdx = 0, tourTimer = 0, touring = false;
            const tourWaypoints = [];
            const getRC = (p) => {
                if (p.z < 0) return new THREE.Vector3(0, 2.5, -10);
                if (p.x < -10) return new THREE.Vector3(-20, 2.5, 10);
                if (p.x > 10) return new THREE.Vector3(20, 2.5, 10);
                return new THREE.Vector3(0, 2.5, 10);
            };

            places.forEach((p, index) => {
                const standPos = new THREE.Vector3(p.x + p.nx * 2.5, 2.5, p.z + p.nz * 2.5);
                const lookPos = new THREE.Vector3(p.x, p.y, p.z);
                if (index > 0) {
                    const prevP = places[index - 1], rc1 = getRC(prevP), rc2 = getRC(p);
                    if (!rc1.equals(rc2)) {
                        tourWaypoints.push({ target: rc1, lookAt: rc1 });
                        if (rc1.x !== 0 && rc2.x !== 0) tourWaypoints.push({ target: new THREE.Vector3(0, 2.5, 10), lookAt: new THREE.Vector3(0, 2.5, 10) });
                        tourWaypoints.push({ target: rc2, lookAt: rc2 });
                    }
                }
                tourWaypoints.push({ target: standPos, lookAt: lookPos });
            });

            window.startTour = () => { if (!tourWaypoints.length) return; touring = true; tourIdx = 0; orbitCtrl.enabled = false; if (isLocked) document.exitPointerLock(); tourTarget = tourWaypoints[0].target; tourLookAt = tourWaypoints[0].lookAt; tourTimer = 0; clickStartEl.style.display = 'none'; document.getElementById('btnTour').classList.add('active'); };
            window.toggleFullscreen = () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); };
            const onResize = () => { const w2 = container.clientWidth, h2 = container.clientHeight; camera.aspect = w2 / h2; camera.updateProjectionMatrix(); renderer.setSize(w2, h2); };
            window.addEventListener('resize', onResize);

            const clock = new THREE.Clock();
            const direction = new THREE.Vector3();
            let animId = 0;

            const walkRects = [ [-9, 9, 1, 19], [-9, 9, -19, -1], [-29, -9, 1, 19], [9, 29, 1, 19], [-3, 3, -1, 1], [-11, -9, 7, 13], [9, 11, 7, 13] ];
            const inBounds = (x, z) => walkRects.some(r => x > r[0] && x < r[1] && z > r[2] && z < r[3]);

            `;

c = c.substring(0, startIndex) + newBlock + c.substring(endIndex);
fs.writeFileSync(file, c);
console.log("Updated HTML successfully!");
