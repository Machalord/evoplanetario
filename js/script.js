import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';

let scene, camera, renderer, controller;
let reticle, ape;

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

    // Cargar modelo del mono
    const loader = new GLTFLoader();
    loader.load('./public/assets/ape.glb', (gltf) => {
        ape = gltf.scene;
        ape.animations=gltf.animations;

        mixer = new THREE.AnimationMixer( ape ); 
                const clips = ape.animations;
                var idle= mixer.clipAction(ape.animations[0]).play();   
        
                renderer.setAnimationLoop( animate );
        //monkeyModel.scale.set(0.5, 0.5, 0.5);
    });

    // Configurar WebXR
    document.body.appendChild(THREE.XRButton.createButton(renderer));
    renderer.setAnimationLoop(render);
}

function onSelect() {
    if (reticle.visible && ape) {
        const newMonkey = ape.clone();
        newMonkey.position.set(reticle.position.x, reticle.position.y, reticle.position.z);
        scene.add(newMonkey);
    }
}

function render() {
    renderer.render(scene, camera);
}
