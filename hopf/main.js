import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

document.addEventListener('DOMContentLoaded', () => {

    // -----------------------------
    // Scene Setup
    // -----------------------------
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x050505)

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 2000)
    camera.position.set(0, 2, 5)

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    document.body.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.minDistance = 0.2
    controls.maxDistance = 150

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)
    const pointLight = new THREE.PointLight(0xffffff, 120)
    pointLight.position.set(5,5,5)
    scene.add(pointLight)

    const sphereGeometry = new THREE.SphereGeometry(1, 128, 128)
    const sphereMaterial = new THREE.MeshStandardMaterial({ color: 0xE0FFFF, transparent:true, opacity:0.5 })
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial)
    scene.add(sphere)

    // -----------------------------
    // State & Groups
    // -----------------------------
    let selectionMode = false, longitudeMode = false, latitudeMode = false, holdScene = false
    let fiberIndex = 0
    const fiberColors = [0xff0000,0xff7f00,0xffff00,0x00ff00,0x00ffff,0x0000ff,0x7f00ff,0xff00ff,0xffcc00,0x00ccff,0xff5555,0x55ff55]

    const markersGroup = new THREE.Group()
    const fibersGroup = new THREE.Group()
    const torusGroup = new THREE.Group()
    const sphereLinesGroup = new THREE.Group()
    scene.add(markersGroup, fibersGroup, torusGroup, sphereLinesGroup)

    // -----------------------------
    // UI Elements
    // -----------------------------

const pointToggle = document.getElementById('toggle-point');
const longitudeToggle = document.getElementById('toggle-longitude');
const latitudeToggle = document.getElementById('toggle-latitude');
const resetBtn = document.getElementById('reset-btn');
const freezeBtn = document.getElementById('freeze-btn');
const captureBtn = document.getElementById('capture-btn');
const flash = document.getElementById('flash-overlay');
const uiPanel = document.querySelector('.ui-panel');
const infoPanel = document.querySelector('.info-panel');
const titleContainer = document.querySelector('.title-container');

const toggleList = [pointToggle, longitudeToggle, latitudeToggle];

// Helper to clear 3D objects
function clearPreviousSelections() {
    markersGroup.clear();
    fibersGroup.clear();
    torusGroup.clear();
    sphereLinesGroup.clear();
}

// Updated Reset Button: Clears scene, UI toggles, and internal flags
resetBtn.addEventListener('click', () => {
    // 1. Clear the 3D scene
    clearPreviousSelections();

    // 2. Uncheck all UI toggles
    toggleList.forEach(t => { if (t) t.checked = false; });

    // 3. Reset internal logic flags
    selectionMode = false;
    longitudeMode = false;
    latitudeMode = false;
    fiberIndex = 0;

    // 4. Reset Freeze/Lock state
    holdScene = false;
    if (freezeBtn) {
        freezeBtn.textContent = "Freeze";
        freezeBtn.style.opacity = "0.6";
    }
});

freezeBtn.addEventListener('click', () => {
    holdScene = !holdScene;
    freezeBtn.textContent = holdScene ? "Locked" : "Freeze";
    freezeBtn.style.opacity = holdScene ? "1" : "0.6";
});

captureBtn.addEventListener('click', () => {
    uiPanel.style.visibility = 'hidden';
    infoPanel.style.visibility = 'hidden';
    titleContainer.style.visibility = 'hidden';

    renderer.render(scene, camera);
    const dataURL = renderer.domElement.toDataURL('image/png');

    flash.style.opacity = '0.3';

    const link = document.createElement('a');
    link.download = `hopf-fibration-${Date.now()}.png`;
    link.href = dataURL;
    link.click();

    setTimeout(() => {
        flash.style.opacity = '0';
        uiPanel.style.visibility = 'visible';
        infoPanel.style.visibility = 'visible';
        titleContainer.style.visibility = 'visible';
    }, 100);
});

toggleList.forEach(t => {
    if (!t) return;
    t.addEventListener('change', () => {
        // Mutual exclusivity: if one is checked, uncheck others
        if (t.checked) {
            toggleList.forEach(other => { if (other !== t) other.checked = false; });
        }
        
        clearPreviousSelections();
        
        // Synchronize internal flags with checkbox states
        selectionMode = pointToggle.checked;
        longitudeMode = longitudeToggle.checked;
        latitudeMode = latitudeToggle.checked;
    });
});
    // -----------------------------
    // Hopf functions (create fibers/markers)
    // -----------------------------
    function getHopfFiberPoints(n, segments=1000){
        const points=[]
        const theta = Math.acos(n.z)
        const phi = Math.atan2(n.y, n.x)
        for(let t=0;t<=Math.PI*2;t+=(2*Math.PI)/segments){
            const x4=Math.cos(theta/2)*Math.cos(t)
            const y4=Math.cos(theta/2)*Math.sin(t)
            const z4=Math.sin(theta/2)*Math.cos(t+phi)
            const w4=Math.sin(theta/2)*Math.sin(t+phi)
            const d = Math.max(1-w4,0.0001)
            points.push(new THREE.Vector3(x4/d, y4/d, z4/d))
        }
        return points
    }

    function createHopfFiber(n,color,group){
        const points = getHopfFiberPoints(n)
        const geometry = new THREE.BufferGeometry().setFromPoints(points)
        const material = new THREE.LineBasicMaterial({ color, transparent:true, opacity:0.6 })
        const line = new THREE.Line(geometry, material)
        group.add(line)
    }

    function createMarker(pos){
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.015,32,32), new THREE.MeshBasicMaterial({color:0x000000}))
        dot.position.copy(pos)
        markersGroup.add(dot)
    }

    function drawSelectionCircle(points){
        sphereLinesGroup.clear()
        const geometry = new THREE.BufferGeometry().setFromPoints(points)
        const material = new THREE.LineBasicMaterial({ color:0x000000 })
        const line = new THREE.Line(geometry, material)
        line.scale.set(1.005,1.005,1.005)
        sphereLinesGroup.add(line)
    }

    // -----------------------------
    // Interaction
    // -----------------------------
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    window.addEventListener('click', (event) => {
        if(holdScene) return
        if(event.target !== renderer.domElement) return
        mouse.x = (event.clientX / window.innerWidth)*2-1
        mouse.y = -(event.clientY / window.innerHeight)*2+1
        raycaster.setFromCamera(mouse,camera)
        const intersects = raycaster.intersectObject(sphere)
        if(intersects.length===0) return
        const point = intersects[0].point.clone().normalize()

        if(selectionMode){
            const currentColor=fiberColors[fiberIndex%fiberColors.length]; fiberIndex++
            createMarker(point)
            createHopfFiber(point,currentColor,fibersGroup)
        }

        if(longitudeMode){
            torusGroup.clear()
            const phi=Math.atan2(point.y,point.x)
            const pathPoints=[]
            for(let i=0;i<=200;i++){
                const theta=(i/200)*Math.PI*2
                const p = new THREE.Vector3(Math.sin(theta)*Math.cos(phi), Math.sin(theta)*Math.sin(phi), Math.cos(theta))
                pathPoints.push(p)
                if(i<=100){ createHopfFiber(p, fiberColors[fiberIndex%fiberColors.length], torusGroup); fiberIndex++ }
            }
            drawSelectionCircle(pathPoints)
        }

        if(latitudeMode){
            torusGroup.clear()
            const r = Math.sqrt(1-point.z*point.z)
            const pathPoints=[]
            for(let i=0;i<=200;i++){
                const t = (i/200)*2*Math.PI
                const p = new THREE.Vector3(r*Math.cos(t), r*Math.sin(t), point.z)
                pathPoints.push(p)
                createHopfFiber(p, fiberColors[fiberIndex%fiberColors.length], torusGroup)
                fiberIndex++
            }
            drawSelectionCircle(pathPoints)
        }
    })

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth/window.innerHeight
        camera.updateProjectionMatrix()
        renderer.setSize(window.innerWidth, window.innerHeight)
    })

    function animate(){
        requestAnimationFrame(animate)
        controls.update()
        renderer.render(scene,camera)
    }
    animate()
})