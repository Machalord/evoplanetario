import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { XRButton } from 'three/examples/jsm/webxr/XRButton.js';

let scene, camera, renderer, controller;
let reticle, apeModel, mixer;

init();

function init() {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
    scene.add(camera);

    // Luz ambiental
    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    scene.add(light);

    // Controlador para detección de input
    controller = renderer.xr.getController(0);
    controller.addEventListener('select', onSelect);
    scene.add(controller);

    // Cargar retícula para detección de superficie
    const geometry = new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
    reticle = new THREE.Mesh(geometry, material);
    reticle.visible = false;
    scene.add(reticle);
    const loader=new GLTFLoader();

     // Cargar modelo del ape
    loader.load('./assets/ape.glb',(gltf) => {
            apeModel = gltf.scene;
            apeModel.scale.set(0.5, 0.5, 0.5);
    
            // Configurar animación
            if (gltf.animations.length > 0) {
                mixer = new THREE.AnimationMixer(apeModel);
                const action = mixer.clipAction(gltf.animations[0]);
                action.play();
            }
    
            console.log("Modelo cargado correctamente:", apeModel);
        },
        undefined,
        (error) => {
            console.error("Error cargando el modelo:", error);
        }
    ); 
    

    // Configurar WebXR
    document.body.appendChild(XRButton.createButton(renderer));
    renderer.setAnimationLoop(render);
}

function onSelect() {
    if (reticle.visible && apeModel) {
        const newApe = apeModel.clone();
        newApe.position.set(reticle.position.x, reticle.position.y, reticle.position.z);
        scene.add(newApe);

        // Reproducir animación en el nuevo modelo
        if (mixer) {
            const newMixer = new THREE.AnimationMixer(newApe);
            const action = newMixer.clipAction(mixer._actions[0]._clip);
            action.play();
        }
    }
}

function render() {
    if (mixer) mixer.update(0.016); // Actualizar animación
    renderer.render(scene, camera);
}
