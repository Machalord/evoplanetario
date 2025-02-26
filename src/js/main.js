import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

let loadedModels = [];
let hitTestSource = null;
let hitTestSourceRequested = false;
const mixers = []; // Use const instead of let for mixers

const clock = new THREE.Clock();

const gltfLoader = new GLTFLoader();
gltfLoader.load('./assets/tute_ape1.glb', (gltf) => {
    const ape = gltf.scene;

    // Escalamos el modelo desde la carga
    ape.scale.set(0.1, 0.1, 0.1);

    loadedModels.push(ape);

    // Inicializar mezclador de animaciones
    if (gltf.animations.length > 0) {
        const mixer = new THREE.AnimationMixer(ape);
        const idleAction = mixer.clipAction(gltf.animations[0]);
        idleAction.play();

        console.log("Animaciones disponibles:", gltf.animations.length);

        mixers.push(mixer); // Guardamos el mixer para actualizarlo en el loop
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
document.body.appendChild(ARButton.createButton(renderer));

// Retícula
let reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xffffff })
);
reticle.visible = false;
reticle.matrixAutoUpdate = false;

// Controlador XR
const controller = renderer.xr.getController(0);

controller.addEventListener('select', onSelect);
scene.add(controller);

function onSelect(event) {
    if (reticle.visible && loadedModels.length > 0) {
        const modelIndex = 0; // Assuming you want to use the first loaded model
        let originalModel = loadedModels[modelIndex];
        
        const model = originalModel.clone();
        model.position.setFromMatrixPosition(reticle.matrix);

        scene.add(model);
        console.log("modelo clonado:", model);

        // Asegurarnos de que el modelo clonado también tenga las animaciones
        if (loadedModels[0].animations && loadedModels[0].animations.length > 0) {
            const newMixer = new THREE.AnimationMixer(model);
            const firstAnimation = loadedModels[0].animations[0]; // Tomamos la primera animación disponible
            const action = newMixer.clipAction(firstAnimation); 
            action.play();

            mixers.push(newMixer); // Guardamos el mixer para actualizarlo en el loop
        } else {
            console.warn("⚠️ No hay animaciones disponibles para el modelo clonado.");
        }
    }
}

function onSessionEnded() {
    hitTestSourceRequested = false;
    hitTestSource = null;
}

renderer.setAnimationLoop((timestamp, frame) => {
    if (frame) {
        const referenceSpace = renderer.xr.getReferenceSpace();
        const session = renderer.xr.getSession();

        if (!hitTestSourceRequested) {
            session.requestReferenceSpace('viewer').then(refSpace => {
                session.requestHitTestSource({ space: refSpace }).then(source => {
                    hitTestSource = source;
                    console.log("hit test source:", hitTestSource);

                    session.addEventListener("end", onSessionEnded);
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

        // Ahora actualizamos TODOS los mixers de los modelos en escena
        const delta = clock.getDelta();
        mixers.forEach(mixer => mixer.update(delta));
    }

    renderer.render(scene, camera);

    // Ajustar tamaño en caso de redimensionar la ventana
    window.addEventListener('resize', () => {
        sizes.width = window.innerWidth;
        sizes.height = window.innerHeight;
        camera.aspect = sizes.width / sizes.height;
        camera.updateProjectionMatrix();
        renderer.setSize(sizes.width, sizes.height);
        renderer.setPixelRatio(window.devicePixelRatio);
    });
});
