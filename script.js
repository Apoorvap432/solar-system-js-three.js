// set up canvas and renderer
const canvas = document.getElementById("solarCanvas");
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(window.innerWidth, window.innerHeight);

// Create the main 3D scene
const scene = new THREE.Scene();

// Camera Setup
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const initialCameraPosition = new THREE.Vector3(0, 2, 40);
camera.position.copy(initialCameraPosition);

//lighting setup
const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);
const point = new THREE.PointLight(0xffffff, 2);
scene.add(point);

//sun
const sunGeometry = new THREE.SphereGeometry(3, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// Planets
const planetData = [
  { name: "Mercury", radius: 6, size: 0.3, color: 0xaaaaaa },
  { name: "Venus", radius: 9, size: 0.5, color: 0xff9900 },
  { name: "Earth", radius: 12, size: 0.6, texture: "textures/earth.png" },
  { name: "Mars", radius: 15, size: 0.4, color: 0xff3300 },
  { name: "Jupiter", radius: 19, size: 1.2, texture: "textures/jupiter.png" },
  { name: "Saturn", radius: 23, size: 1.0, texture: "textures/saturn.png" },
  { name: "Uranus", radius: 27, size: 0.8, color: 0x66ccff },
  { name: "Neptune", radius: 31, size: 0.7, texture: "textures/neptune.png" },
];

const textureLoader = new THREE.TextureLoader();
const planets = [];
const orbits = [];
const speeds = {};
const angles = {};

planetData.forEach((planet) => {
  const geometry = new THREE.SphereGeometry(planet.size, 32, 32);
  let material;
  if (planet.texture) {
    const texture = textureLoader.load(planet.texture);
    material = new THREE.MeshStandardMaterial({ map: texture });
  } else {
    material = new THREE.MeshStandardMaterial({ color: planet.color });
  }

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
  planets.push({ ...planet, mesh });

  // Orbit ring
  const orbitGeom = new THREE.RingGeometry(planet.radius - 0.02, planet.radius + 0.02, 64);
  const orbitMat = new THREE.MeshBasicMaterial({ color: 0x444444, side: THREE.DoubleSide });
  const orbit = new THREE.Mesh(orbitGeom, orbitMat);
  orbit.rotation.x = Math.PI / 2;
  scene.add(orbit);
  orbits.push(orbit);

  // Default orbit speeds
  speeds[planet.name] = 0.01;
  angles[planet.name] = Math.random() * Math.PI * 2;

  // control panel sliders
  const sliderHTML = `
    <label>${planet.name}</label>
    <input type="range" min="0" max="0.05" step="0.001" value="${speeds[planet.name]}" 
      data-planet="${planet.name}" />
  `;
  document.getElementById("sliders").innerHTML += sliderHTML;
});

// pause button
let paused = false;
document.getElementById("pauseBtn").addEventListener("click", () => {
  paused = !paused;
  document.getElementById("pauseBtn").innerText = paused ? "Resume" : "Pause";
});

// speed adjustment
document.getElementById("sliders").addEventListener("input", (e) => {
  const name = e.target.getAttribute("data-planet");
  speeds[name] = parseFloat(e.target.value);
});

// stars
let stars = null;
function addStars(color = 0xffffff) {
  if (stars) scene.remove(stars);
  const starGeometry = new THREE.BufferGeometry();
  const positions = [];
  for (let i = 0; i < 1000; i++) {
    const x = (Math.random() - 0.5) * 1000;
    const y = (Math.random() - 0.5) * 1000;
    const z = (Math.random() - 0.5) * 1000;
    positions.push(x, y, z);
  }
  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const starMaterial = new THREE.PointsMaterial({ color, size: 1, sizeAttenuation: true });
  stars = new THREE.Points(starGeometry, starMaterial);
  scene.add(stars);
}

// main animation loop
function animate() {
  requestAnimationFrame(animate);
  if (!paused) {
    planets.forEach((p) => {
      angles[p.name] += speeds[p.name];
      const x = Math.cos(angles[p.name]) * p.radius;
      const z = Math.sin(angles[p.name]) * p.radius;
      p.mesh.position.set(x, 0, z);
    });
  }
  renderer.render(scene, camera);
}
animate();

// labels
const tooltip = document.createElement("div");
Object.assign(tooltip.style, {
  position: "absolute", padding: "4px 8px", background: "rgba(0,0,0,0.7)",
  color: "white", borderRadius: "5px", fontSize: "14px", pointerEvents: "none", display: "none"
});
document.body.appendChild(tooltip);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

canvas.addEventListener("mousemove", (event) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(planets.map(p => p.mesh));
  if (intersects.length > 0) {
    const planet = planets.find(p => p.mesh === intersects[0].object);
    tooltip.innerText = planet.name;
    tooltip.style.display = "block";
    tooltip.style.left = event.clientX + 10 + "px";
    tooltip.style.top = event.clientY + 10 + "px";
  } else {
    tooltip.style.display = "none";
  }
});

// camera zoom on click
window.addEventListener("click", (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(planets.map(p => p.mesh));
  if (intersects.length > 0) {
    const target = intersects[0].object.position;
    moveCameraTo(target);
  }
});

function moveCameraTo(targetPosition) {
  const offset = new THREE.Vector3(0, 2, 5);
  const newPos = targetPosition.clone().add(offset);
  const startPos = camera.position.clone();
  const duration = 1000;
  const startTime = performance.now();
  function animateCamera(time) {
    const elapsed = time - startTime;
    const t = Math.min(elapsed / duration, 1);
    camera.position.lerpVectors(startPos, newPos, t);
    camera.lookAt(targetPosition);
    if (t < 1) requestAnimationFrame(animateCamera);
  }
  requestAnimationFrame(animateCamera);
}

// double-click to reset camera
canvas.addEventListener("dblclick", () => {
  moveCameraTo(initialCameraPosition);
});

// theme toggle
const themeToggle = document.getElementById("themeToggle");

function applyTheme(theme) {
  document.body.classList.remove("light-theme", "dark-theme");
  document.body.classList.add(theme);
  localStorage.setItem("theme", theme);
  if (theme === "light-theme") {
    renderer.setClearColor(0xffffff);
    addStars(0x000000); // Black stars on white bg
    tooltip.style.color = "black";
  } else {
    renderer.setClearColor(0x000000);
    addStars(0xffffff); // White stars on dark bg
    tooltip.style.color = "white";
  }
}

const savedTheme = localStorage.getItem("theme") || "dark-theme";
applyTheme(savedTheme);

themeToggle.addEventListener("click", () => {
  const current = document.body.classList.contains("dark-theme") ? "dark-theme" : "light-theme";
  const nextTheme = current === "dark-theme" ? "light-theme" : "dark-theme";
  applyTheme(nextTheme);
});