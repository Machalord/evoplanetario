import * as THREE from "three"; 
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const w = window.innerWidth;
const h = window.innerHeight;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
camera.position.z = 5;
const renderer = new THREE.WebGLRenderer();
renderer.setSize(w, h);
document.body.appendChild(renderer.domElement);

const ctrls = new OrbitControls(camera, renderer.domElement);
ctrls.enableDamping = true;

const gltfloader = new GLTFLoader();
 let mixer,clock;

init()

function init()
{
    
    clock = new THREE.Clock();

    /* './public/assets/ape.glb' */
     /*'./public/assets/Australophitecus3_anim.glb'*/
    gltfloader.load('./public/assets/ape.glb',function (gltf){
        
        const ape=gltf.scene;
        ape.animations=gltf.animations;

        ape.traverse((child)=>{

        }, undefined, function ( error ) {

            console.error( error );

        });


        mixer = new THREE.AnimationMixer( ape ); 
        const clips = ape.animations;

        var idle= mixer.clipAction(ape.animations[0]).play();   
        /* const clips = ape.animations;

        clips.forEach( function ( clip ) {
            mixer.clipAction( clip ).play();
        } );    */

        renderer.setAnimationLoop( animate );
        
        scene.add(ape); 

    
    });
 

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444);
    scene.add(hemiLight); 
}


function animate() {
    
  requestAnimationFrame(animate); 
  let mixerUpdateDelta = clock.getDelta();
  mixer.update( mixerUpdateDelta);
  renderer.render(scene, camera);
  ctrls.update();
} 


function handleWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', handleWindowResize, false);