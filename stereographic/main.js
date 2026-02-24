// =====================
// IMPORTS
// =====================

// import the core Three.js engine for 3D rendering
import * as THREE from 'three';
// import OrbitControls that allows scene naviagtion (zoom in/out, rotation)
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// =====================
// SCENE SETUP
// =====================
// create the 3D container for all the objects 
const scene = new THREE.Scene()
// set the background to a near-black dark gray
scene.background = new THREE.Color(0x050505)

// camera settings : 60° field of view, aspect ratio, near plane 0.1, far plane 2000
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000)
// Position the camera in 3D space in the (x, y, z) coordinates 
camera.position.set(4, 4, 6)

// initialize the WebGL renderer
const renderer = new THREE.WebGLRenderer({ 
  antialias: true,            // smooth edges on geometry
  preserveDrawingBuffer: true // required to capture the canvas for screenshots
})
// make the renderer full screen
renderer.setSize(window.innerWidth, window.innerHeight)
// add the 3D canvas to the HTML document
document.body.appendChild(renderer.domElement)

// setup camera controls for the user
const controls = new OrbitControls(camera, renderer.domElement)
// camera movement damping
controls.enableDamping = true

// =====================
// GEOMETRY & GROUPS
// =====================

// add soft global white light so objects aren't pitch black, "luminosity" index 0.6 
scene.add(new THREE.AmbientLight(0xffffff, 0.6))
// add a strong point-like light source to create depth and highlights
const light = new THREE.PointLight(0xffffff, 50)
// position of the point-like light source
light.position.set(5, 5, 5)
scene.add(light)

// create a 200x200 unit grid and add it to the scene
const plane = new THREE.GridHelper(200, 200, 0x444444, 0x222222)
scene.add(plane)

// sents the simanesion of the rqdius
const radius = 1
// place the sphere so its base sits exactly on the grid (y=1)
const spherePos = new THREE.Vector3(0, radius, 0) 
// sets the north pole
const northPolePos = new THREE.Vector3(0, radius * 2, 0)

// create the sphere geometry 128 segments hight and for weight
const sphereGeometry = new THREE.SphereGeometry(radius, 128, 128) 
// sets the properties of the material
const sphereMaterial = new THREE.MeshStandardMaterial({ 
  color: 0xE0FFFF,  // light blue color
  transparent: true,  // make it transparent
  opacity: 0.5  // transparancy index
}) 
// combine geometry and material into a Mesh
const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial) 
// Move sphere to the defined position 
sphere.position.copy(spherePos) 
scene.add(sphere) 

// create a small white sphere to mark the North Pole (projection source)
const northPoleMarker = new THREE.Mesh(
  new THREE.SphereGeometry(0.02),  //size of the north point 
  new THREE.MeshBasicMaterial({ color: 0xffffff }) // white color
)
northPoleMarker.position.copy(northPolePos)
scene.add(northPoleMarker)

// creates a group for all the projections so it is easier 
const projectGroup = new THREE.Group()
scene.add(projectGroup)

// =====================
// DESIGN CONSTANTS
// =====================
const SPHERE_COLOR = 0xFF00FF; // hot fuchsia: used for selections on the sphere
const PLANE_COLOR = 0x32CD32;  // neon lime: used for the projection on the grid

// =====================
// UI ELEMENTS & STATE
// =====================
// reffers to the HTML checkboxes and buttons
const togglePoint = document.getElementById("toggle-point")
const toggleLongitude = document.getElementById("toggle-longitude")
const toggleLatitude = document.getElementById("toggle-latitude")

// button Selectors 
const resetBtn = document.getElementById("reset-btn")
const freezeBtn = document.getElementById("freeze-btn") 
const captureBtn = document.getElementById('capture-btn') 

const flash = document.getElementById('flash-overlay')
const warning = document.getElementById('warning')

// grab UI containers to hide them during screenshots
const uiPanel = document.querySelector('.ui-panel')
const infoPanel = document.querySelector('.info-panel')
const titleContainer = document.querySelector('.title-container')

// global state to track if interaction is locked (Frozen)
let isFrozen = false 

// function to wipe all drawn lines and markers from the scene
function resetExhibition() {
  // Clear the 3D objects from the group
  while(projectGroup.children.length > 0){ 
    const object = projectGroup.children[0];
    if(object.geometry) object.geometry.dispose();
    if(object.material) object.material.dispose();
    projectGroup.remove(object); 
  }

  // hide the North Pole warning if it's currently visible
  if (warning) warning.style.display = 'none'

  // uncheck active toggles to show a clean state
  if(togglePoint) togglePoint.checked = false;
  if(toggleLongitude) toggleLongitude.checked = false;
  if(toggleLatitude) toggleLatitude.checked = false;
}

// attach clear function to the Reset button
if(resetBtn) {
    resetBtn.addEventListener("click", () => {
        resetExhibition();
        // Visual feedback for the button click
        resetBtn.style.opacity = "1";
        setTimeout(() => resetBtn.style.opacity = "0.6", 200);
    });
}

// toggle the 'Freeze' state to lock the current visualization
if (freezeBtn) {
  freezeBtn.addEventListener("click", () => {
    isFrozen = !isFrozen

    freezeBtn.textContent = isFrozen ? "Frozen" : "Freeze"

    // White when frozen, dimmed when active
    freezeBtn.style.opacity = isFrozen ? "1" : "0.6"
    freezeBtn.style.color = isFrozen ? "#FFFFFF" : "#AAAAAA"
  })
}

// capture mechanism 
if(captureBtn) {
  captureBtn.addEventListener('click', () => {
    // hide UI so the image only contains rendered scene
    if(uiPanel) uiPanel.style.visibility = 'hidden'
    if(infoPanel) infoPanel.style.visibility = 'hidden'
    if(titleContainer) titleContainer.style.visibility = 'hidden'
    
    // force the renderer to draw a frame before capture
    renderer.render(scene, camera)
    const dataURL = renderer.domElement.toDataURL('image/png')
    
    // trigger the white flash  effect (intensity 0.3, can be changed)
    if(flash) flash.style.opacity = '0.3'

    // create a virtual link to trigger the browser download
    const link = document.createElement('a')
    link.download = `capture-${Date.now()}.png`
    link.href = dataURL
    link.click()

    // restore UI and hide flash after a short delay
    setTimeout(() => {
      if(flash) flash.style.opacity = '0'
      if(uiPanel) uiPanel.style.visibility = 'visible'
      if(infoPanel) infoPanel.style.visibility = 'visible'
      if(titleContainer) titleContainer.style.visibility = 'visible'
    }, 150)
  })
}

// ensure only one mode checkbox is checked at a time
const toggles = [togglePoint, toggleLongitude, toggleLatitude]
toggles.forEach(t => {
  if(!t) return;
  t.addEventListener("change", () => {
    if (t.checked) {
      // uncheck all other options
      toggles.forEach(other => { if (other !== t) other.checked = false })
      // just clear the group, don't uncheck the toggle we just clicked
      projectGroup.clear();
      if (warning) warning.style.display = 'none';
    }
  })
})

// =====================
// MATH & INTERACTION
// =====================

/**
 * funciton that calcualtes the stereographic projection of a point p on the sphere 
 * onto the flat plane at y=0 using the North Pole as the source.
 */
function projectPoint(p) {
  // vector pointing from North Pole through the sphere surface point
  const direction = new THREE.Vector3().subVectors(p, northPolePos)
  // calculate the 'time' factor where the ray hits y=0
  const t = -northPolePos.y / direction.y
  // return the resulting coordinate on the ground
  return new THREE.Vector3(
    northPolePos.x + direction.x * t,
    0,
    northPolePos.z + direction.z * t
  )
}

// Helper to draw a line between a set of Vector3 points
function drawLine(points, color) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color }))
  projectGroup.add(line)
}

// Setup for mouse interaction (Raycasting)
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()

window.addEventListener("click", event => {
  // Ignore clicks if 'Freeze' state is active or if clicking on UI buttons
  if (isFrozen) return 
  if (event.target !== renderer.domElement) return
  
  // Convert mouse pixels to Three.js coordinates (-1 to +1 range)
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
  raycaster.setFromCamera(mouse, camera)

  // Find if the mouse clicked the sphere
  const intersects = raycaster.intersectObject(sphere)
  if (intersects.length === 0) return

  // Get the specific 3D point on the sphere surface
  const p = intersects[0].point
  
  // Stereographic projection breaks at the North Pole (projects to infinity)
  if (p.distanceTo(northPolePos) < 0.08) {
    if (warning) warning.style.display = 'block'
    return
  } else {
    if (warning) warning.style.display = 'none'
  }

  // clear previous lines to make room for the new projection
  projectGroup.clear()

  // --- MODE 1: SINGLE POINT ---
  if (togglePoint && togglePoint.checked) {
    const proj = projectPoint(p)
    // draw a gray guide line from the pole to the ground
    drawLine([northPolePos, proj], 0x444444) 
    
    // place fuchsia marker on sphere
    const m1 = new THREE.Mesh(new THREE.SphereGeometry(0.025), new THREE.MeshBasicMaterial({color: SPHERE_COLOR}))
    m1.position.copy(p); projectGroup.add(m1)
    
    // place lime marker on ground
    const m2 = new THREE.Mesh(new THREE.SphereGeometry(0.025), new THREE.MeshBasicMaterial({color: PLANE_COLOR}))
    m2.position.copy(proj); projectGroup.add(m2)
  }

  // --- MODE 2: LATITUDE (Horizontal Circle) ---
  if (toggleLatitude && toggleLatitude.checked) {
    const localY = p.y - spherePos.y
    //cCalculate radius of the circle at this latitude
    const r = Math.sqrt(Math.max(0, radius * radius - localY * localY))
    const pointsSphere = []; const pointsPlane = []
    
    // generate 128 points to form the circles
    for (let i = 0; i <= 128; i++) {
      const angle = (i / 128) * Math.PI * 2
      const sp = new THREE.Vector3(r * Math.cos(angle), p.y, r * Math.sin(angle))
      pointsSphere.push(sp)
      pointsPlane.push(projectPoint(sp))
    }
    drawLine(pointsSphere, SPHERE_COLOR); // Fuchsia circle on sphere
    drawLine(pointsPlane, PLANE_COLOR);   // Lime circle on plane
  }

  // --- MODE 3: LONGITUDE (Vertical Loop) ---
  if (toggleLongitude && toggleLongitude.checked) {
    const angle = Math.atan2(p.z, p.x)
    const pointsSphere = []; const pointsPlane = []
    
    for (let i = 0; i <= 128; i++) {
      const phi = (i / 128) * Math.PI * 2
      // votate points into a vertical circle passing through the poles
      const sp = new THREE.Vector3(
        radius * Math.cos(phi) * Math.cos(angle), 
        radius * Math.sin(phi) + spherePos.y, 
        radius * Math.cos(phi) * Math.sin(angle)
      )
      pointsSphere.push(sp)
      // project the point only if it isn't the North Pole itself
      if (sp.distanceTo(northPolePos) > 0.05) {
        pointsPlane.push(projectPoint(sp))
      }
    }
    drawLine(pointsSphere, SPHERE_COLOR)
    // longitude circles project into straight lines on the plane
    if (pointsPlane.length > 1) drawLine(pointsPlane, PLANE_COLOR)
  }
})

// =====================
// EXECUTION LOOP
// =====================
function animate() {
  // request the browser to draw the next frame
  requestAnimationFrame(animate)
  // required for the smooth camera damping effect
  controls.update()
  // render the scene from the camera's perspective
  renderer.render(scene, camera)
}
// start the animation loop
animate()

//pdate camera and renderer when window is resized
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})