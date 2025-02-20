import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { XRButton } from 'three/examples/jsm/webxr/XRButton.js';

let scene, camera, renderer, controller;
let reticle, apeModel, mixers = [];
let hitTestSource = null, hitTestSourceRequested = false;

init();

function init() {
    // Inicializar renderizador
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    scene.add(camera);

    // Luz ambiental
    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    scene.add(light);

    // Agregar controlador XR
    controller = renderer.xr.getController(0);
    controller.addEventListener('select', onSelect);
    scene.add(controller);

    // Crear retícula
    const geometry = new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
    reticle = new THREE.Mesh(geometry, material);
    reticle.visible = false;
    scene.add(reticle);

    // Cargar modelo
    const loader = new GLTFLoader();
    loader.load('./assets/ape.glb', (gltf) => {
        apeModel = gltf.scene;
        apeModel.scale.set(0.5, 0.5, 0.5);
        apeModel.visible = false;
        scene.add(apeModel);

        // Configurar animación
        if (gltf.animations.length > 0) {
            const mixer = new THREE.AnimationMixer(apeModel);
            const action = mixer.clipAction(gltf.animations[0]);
            action.play();
            mixers.push(mixer);
        }
    });

    // Configurar WebXR
    document.body.appendChild(XRButton.createButton(renderer));
    renderer.setAnimationLoop(render);
}

function onSelect() {
    if (reticle.visible && apeModel) {
        const newApe = apeModel.clone();
        newApe.position.copy(reticle.position);
        scene.add(newApe);

        // Crear nuevo mixer para el clon
        if (mixers.length > 0) {
            const newMixer = new THREE.AnimationMixer(newApe);
            const action = newMixer.clipAction(mixers[0]._actions[0]._clip);
            action.play();
            mixers.push(newMixer);
        }
    }
}

function render(timestamp, frame) {
    if (mixers.length > 0) {
        mixers.forEach(mixer => mixer.update(1 / 60));
    }
    
    if (frame) {
        const session = renderer.xr.getSession();
        if (session && !hitTestSourceRequested) {
            session.requestReferenceSpace('viewer').then((referenceSpace) => {
                session.requestHitTestSource({ space: referenceSpace }).then((source) => {
                    hitTestSource = source;
                });
            });
            hitTestSourceRequested = true;
        }

        if (hitTestSource) {
            const hitTestResults = frame.getHitTestResults(hitTestSource);
            if (hitTestResults.length > 0) {
                const hit = hitTestResults[0];
                const pose = hit.getPose(renderer.xr.getReferenceSpace());
                reticle.visible = true;
                reticle.position.set(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z);
            } else {
                reticle.visible = false;
            }
        }
    }

    renderer.render(scene, camera);
}
