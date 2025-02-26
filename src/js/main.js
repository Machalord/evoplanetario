import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

let loadedModels = [];
let hitTestSource = null;
let hitTestSourceRequested = false;
let mixer;
let mixers = [];
const clock = new THREE.Clock();

const gltfLoader = new GLTFLoader();
gltfLoader.load('./assets/tute_ape1.glb', (gltf) => {
    const ape = gltf.scene;
    //ape.scale.set(0.1, 0.1, 0.1); // Escalamos el modelo desde la carga
    loadedModels.push(ape);

    // Inicializar mezclador de animaciones
    if (gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(ape);
        const idleAction = mixer.clipAction(gltf.animations[0]);
        idleAction.play();
        
        console.log("Animaciones disponibles:", gltf.animations.length);

    }
});

// Escena y cámara
const scene = new THREE.Scene();
const sizes = { width: window.innerWidth, height: window.innerHeight };

const light = new THREE.AmbientLight(0xffffff, 1.0);
scene.add(light);

const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 1000);
scene.add(camera);

// Renderizador
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.xr.enabled = true;

document.body.appendChild(renderer.domElement);
document.body.appendChild(ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] }));

// Retícula
let reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xffffff })
);
reticle.visible = false;
reticle.matrixAutoUpdate = false;
scene.add(reticle);

// Controlador XR
let controller = renderer.xr.getController(0);
controller.addEventListener('select', onSelect);
scene.add(controller);

/* function onSelect() {
    if (reticle.visible && loadedModels.length > 0) {
        let randomIndex = Math.floor(Math.random() * loadedModels.length);
        let model = loadedModels[randomIndex].clone();
        model.position.setFromMatrixPosition(reticle.matrix);
        model.scale.set(1.2, 1.2, 1.2); // Escalar al tamaño de una persona
        scene.add(model);

        // Asegurarnos de que el modelo tiene animaciones
        if (loadedModels[randomIndex].animations && loadedModels[randomIndex].animations.length > 0) {
            let newMixer = new THREE.AnimationMixer(model);
            let action = newMixer.clipAction(loadedModels[randomIndex].animations[0]); 
            action.play();
            
            // 🔹 Agregamos el mixer a la lista para actualizarlo en el loop
            mixers.push(newMixer);
        } else {
            console.warn("⚠️ No hay animaciones disponibles para el modelo instanciado.");
        }
    }
} */

    function onSelect() {
        if (reticle.visible && loadedModels.length > 0) {
            let modelIndex = 0;
            let originalModel = loadedModels[modelIndex]; 
            let model = originalModel.clone();
            loadedModels[0]
            model.position.setFromMatrixPosition(reticle.matrix);
            //model.scale.set(1.2, 1.2, 1.2); // Escalar al tamaño de una persona
            scene.add(model);
    
            // 🔹 Asegurarnos de que el modelo clonado también tenga las animaciones
            model.animations = loadedModels[0].animations;  
    
            // Verificar si el modelo tiene animaciones
            if (loadedModels[0].animations.length > 0) {
                let newMixer = new THREE.AnimationMixer(model);
    
                let firstAnimation = loadedModels[0].animations[0]; // Tomamos la primera animación disponible
                let action = newMixer.clipAction(firstAnimation);
                action.play();
    
                mixers.push(newMixer); // Guardamos el mixer para actualizarlo en el loop
            } else {
                console.warn("⚠️ El modelo cargado no tiene animaciones.");
            }
        }
    }
    
    


renderer.setAnimationLoop((timestamp, frame) => {
    if (frame) {
        const referenceSpace = renderer.xr.getReferenceSpace();
        const session = renderer.xr.getSession();

        if (!hitTestSourceRequested) {
            session.requestReferenceSpace('viewer').then(refSpace => {
                session.requestHitTestSource({ space: refSpace }).then(source => {
                    hitTestSource = source;
                });
            });

            hitTestSourceRequested = true;

            session.addEventListener("end", () => {
                hitTestSourceRequested = false;
                hitTestSource = null;
            });
        }

        if (hitTestSource) {
            const hitTestResults = frame.getHitTestResults(hitTestSource);
            if (hitTestResults.length > 0) {
                const hit = hitTestResults[0];
                reticle.visible = true;
                reticle.matrix.fromArray(hit.getPose(referenceSpace).transform.matrix);
            } else {
                reticle.visible = false;
            }
        }

        // 🔹 Ahora actualizamos TODOS los mixers de los modelos en escena
        let delta = clock.getDelta();
        mixers.forEach(mixer => mixer.update(delta));
    }

    renderer.render(scene, camera);
});

// Ajustar tamaño en caso de redimensionar la ventana
window.addEventListener('resize', () => {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(window.devicePixelRatio);
});
