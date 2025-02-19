import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { XRButton } from 'three/examples/jsm/webxr/XRButton.js';

let scene, camera, renderer, controller;
let reticle, apeModel, mixer;
let textMesh;

init();

function init() {
    // Inicializar el renderizador y la escena
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    scene.add(camera);

    // Luz ambiental
    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    scene.add(light);

    // Controlador para detección de input
    controller = renderer.xr.getController(0);
    document.body.appendChild(XRButton.createButton(renderer));
    renderer.setAnimationLoop(render);

    // Cargar retícula para detección de superficie
    const geometry = new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
    reticle = new THREE.Mesh(geometry, material);

    // Posicionar y escalar la retícula
    reticle.position.set(0, -1.5, -2);
    reticle.rotation.y = Math.PI / 4;
    scene.add(reticle);

    const loader = new GLTFLoader();

    // Cargar modelo del ape
    loader.load('./assets/ape.glb', (gltf) => {
        apeModel = gltf.scene;

        // Escalar el modelo
        apeModel.scale.set(0.5, 0.5, 0.5);
        apeModel.position.y += 1; // Asegurar que esté bien posicionado

        scene.add(apeModel);

        // Crear un texto para mostrar si se cargó el modelo
        const loaderText = document.createElement('div');
        loaderText.textContent = 'Modelo cargado correctamente!';
        loaderText.style.position = 'absolute';
        loaderText.style.top = '10px';
        loaderText.style.left = '50%';
        loaderText.style.transform = 'translateX(-50%)';
        loaderText.style.color = '#fff';
        loaderText.style.fontSize = '24px';

        document.body.appendChild(loaderText);

        // Crear un cubo simple
        const geometryCube = new THREE.BoxGeometry(1, 1, 1);
        const materialCube = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const cubeMesh = new THREE.Mesh(geometryCube, materialCube);
        scene.add(cubeMesh);

        // Configurar animación
        if (gltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(apeModel);
            const action = mixer.clipAction(gltf.animations[0]);
            action.play();
        }

        console.log("Modelo cargado correctamente:", apeModel);

        // Ocultar el texto después de unos segundos
        setTimeout(() => {
            loaderText.remove();
        }, 2000); // Oculta el texto después de 2 segundos

    }, undefined, (error) => {
        console.error("Error cargando el modelo:", error);
    });

    // Configurar WebXR para mostrar la cámara real en la escena
    renderer.xr.enabled = true;

    const xrSessionPromise = new Promise((resolve, reject) => {
        function onSessionStarted(session) {
            resolve(session);
        }

        function onSessionEnded() {
            reject();
        }

        if (navigator.xr) {
            navigator.xr.requestSession('immersive-vr', { eye: 'none' })
                .then(onSessionStarted)
                .catch(onSessionEnded);
        } else {
            reject(new Error("WebXR no está disponible en este navegador."));
        }
    });

    xrSessionPromise.then((session) => {
        console.log("Se ha iniciado la sesión de WebXR");

        // Configurar la cámara real del dispositivo
        const xrcameraStream = new THREE.XRCameraStream();
        scene.add(xrcameraStream);

        // Asegurarse de que la cámara real esté visible en la escena
        const cameraHelper = new THREE.CameraHelper(xrcameraStream.getCamera());
        scene.add(cameraHelper);

        // Actualizar la escena cada frame
        function render() {
            if (session) {
                session.update();
            }
            requestAnimationFrame(render);
            renderer.render(scene, xrcameraStream.getCamera());
        }

        render();

    }).catch((error) => {
        console.error("Error iniciando WebXR:", error);
    });
}

function onSelect(event) {
    if (event.interactionSource === 'hand') {
        console.log('Se ha seleccionado el modelo');
        // Aquí puedes agregar la lógica para interactuar con el modelo
    }
}

// Asegurarse de que la función render se ejecute continuamente
function render() {
    if (mixer) mixer.update(1 / 60); // Actualizar animación
    requestAnimationFrame(render);
    renderer.render(scene, camera);
}
