import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { SelectiveBloomEffect, EffectComposer, EffectPass, RenderPass, BlendFunction, KernelSize } from "postprocessing";

const size = 512.0;
const size_width = size;
const size_height = size;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, size_width / size_height, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer({
    powerPreference: "high-performance",
    antialias: false,
    stencil: false,
    depth: false
});
renderer.setSize( size_width, size_height );
renderer.useLegacyLights = false;
//renderer.setClearColor(new THREE.Color(0xf1f1f1))
renderer.setClearAlpha(0.0);
document.body.appendChild( renderer.domElement );

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new SelectiveBloomEffect(scene, camera, {
    blendFunction: BlendFunction.ADD,
    mipmapBlur: true,
    luminanceThreshold: 0.4,
    luminanceSmoothing: .3,
    intensity: 2.0,
    kernelSize: KernelSize.SMALL,
  });
bloom.luminancePass.enabled = false;
bloom.inverted = true;
composer.addPass(new EffectPass(camera, bloom));


const uniforms = {
  u_time: { value: 0.0 },
}
const vShader = `
  varying vec2 v_uv;
  varying vec3 v_pos;
  varying vec3 v_normal;

  uniform float u_time;

  #include <normal_pars_vertex>


  void main() {
     v_uv = uv;
     vec3 moved_pos = position;
     moved_pos.x += sin(u_time*5.0 + position.y*2.0)*0.05;
     moved_pos.y += cos(u_time*5.0 + position.y*3.0)*0.03;
     v_pos = moved_pos;
     v_normal = normal;
     gl_Position = projectionMatrix * modelViewMatrix * vec4(moved_pos, 1.0);
  }
`;

const fShader = `
  varying vec2 v_uv;
  varying vec3 v_pos;
  varying vec3 v_normal;
  uniform float u_time;

void main() {
  vec3 normal = normalize(cross(dFdx(v_pos.xyz), dFdy(v_pos.xyz)));
  float brightness = pow(length(v_pos), 5.0)/2.0;
  //gl_FragColor = vec4(vec3(0.4,0.4,1)*brightness, brightness).rgba;
  float fresnel = clamp(pow(length(v_uv - vec2(0.5, 0.5)), 2.0)*5.0, 0.0, 1.0);
  //fresnel = 1.0 - fresnel;
  gl_FragColor = vec4(vec3(0.3,0.3,1.0)*brightness*fresnel,(fresnel/2.0));
  /*
  if(length(v_uv - center) < 0.3) {
    gl_FragColor = vec4(1.0);
  } else {
    gl_FragColor = vec4(0,0,0,1.0);
  }
  */
}
`;
const material = new THREE.ShaderMaterial({
  vertexShader: vShader,
  fragmentShader: fShader,
  uniforms
});

const loader = new GLTFLoader();

loader.load('sphere.glb', function ( gltf ) {
  gltf.scene.traverse((o) => {
    if (o.isMesh) o.material = material;
  });

	scene.add( gltf.scene );
}, undefined, function ( error ) {
	console.error( error );
});

camera.position.z = 5;

const clock = new THREE.Clock();

function animate() {
	requestAnimationFrame( animate );

  uniforms.u_time.value = clock.getElapsedTime();
  composer.render();
	//renderer.render( scene, camera );
}
animate();
