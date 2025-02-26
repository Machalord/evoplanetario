import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

let loadedModels = [];
let hitTestSource = null;
let hitTestSourceRequested = false;
let mixer;
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

function onSelect() {
    if (reticle.visible && loadedModels.length > 0) {
        let randomIndex = Math.floor(Math.random() * loadedModels.length);
        let model = loadedModels[randomIndex].clone();
        model.position.setFromMatrixPosition(reticle.matrix);
        model.scale.set(1.2, 1.2, 1.2); // Escalar al tamaño de una persona
        scene.add(model);

        // Solo agregar animaciones si existen
        if (gltfLoader.animations && gltfLoader.animations.length > 0) {
            let newMixer = new THREE.AnimationMixer(model);
            let action = newMixer.clipAction(gltfLoader.animations[0]);
            action.play();
        } else {
            console.warn("⚠️ No hay animaciones disponibles para el modelo instanciado.");
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

        // Solo actualizar el mixer si existe
        if (mixer) {
            mixer.update(clock.getDelta());
        }
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
