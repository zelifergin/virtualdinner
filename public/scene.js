import * as THREE from "three";
import { FirstPersonControls } from "./libraries/firstPersonControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

let chair = {};

export class MyScene {
  constructor() {
    this.avatars = {};

    // create a scene in which all other objects will exist
    this.scene = new THREE.Scene();


    // create a camera and position it in space
    let aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    this.camera.position.z = 8; // place the camera in space
    this.camera.position.y = 5;
    this.camera.lookAt(0, 0, -3);

    // the renderer will actually show the camera view within our <canvas>
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    // add shadows
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap

    // add orbit controls
    this.controls = new FirstPersonControls(
      this.scene,
      this.camera,
      this.renderer,
    );

    this.setupEnvironment();

    this.frameCount = 0;
    
    this.loop();

    //this.try();
  
    this.loadChairModel(-0.8,0,-2);
    this.loadChairModel(0.6,0,-2);
    this.loadChairModel(2,0,-2);

    this.loadChairModel2(1,0,2);
    this.loadChairModel2(-0.4,0,2);
    this.loadChairModel2(-1.8,0,2);
    this.loadTableModel();

    //background sphere and image 
    this.backgroundSceneGroup= new THREE.Group();
    this.backgroundSceneTexture = new THREE.TextureLoader().load( "./sky.jpg" );
    this.backgroundSceneMaterial = new THREE.MeshStandardMaterial( {
      map: this.backgroundSceneTexture,         
      side: THREE.DoubleSide, 
    } );

    this.backgroundSceneGeo=new THREE.SphereGeometry(20,30,30);
    this.backgroundSceneMesh= new THREE.Mesh(this.backgroundSceneGeo,this.backgroundSceneMaterial);
    this.backgroundSceneMesh.position.set(0,4.5,0);
    this.backgroundSceneGroup.add(this.backgroundSceneMesh);
    this.backgroundSceneGroup.rotation.y=0.45*Math.PI;
    this.scene.add(this.backgroundSceneGroup);
    console.log(this.backgroundSceneGroup);

  }

  // Lighting 💡

  setupEnvironment() {
    this.scene.background = new THREE.Color('lightblue');

    //this.scene.add(new THREE.GridHelper(100, 100));
  
    //add a light
    let myColor = new THREE.Color(0xffaabb);
    let ambientLight = new THREE.AmbientLight(myColor, 1);
    this.scene.add(ambientLight);

    // add a directional light
    let myDirectionalLight = new THREE.DirectionalLight(myColor, 0.85);
    myDirectionalLight.position.set(-5, 3, -5);
    myDirectionalLight.lookAt(0, 0, 0);
    myDirectionalLight.castShadow = true;
    this.scene.add(myDirectionalLight);

    // add a ground
    //let groundGeo = new THREE.BoxGeometry(100, 0.1, 100);
    //let groundMat = new THREE.MeshPhongMaterial({ color: "blue" });
    //let ground = new THREE.Mesh(groundGeo, groundMat);
   // ground.receiveShadow = true;
    //this.scene.add(ground);

    //add fog
    this.scene.fog = new THREE.Fog( 'white', -3, 50); 

  }

  // Peers 👫

  addPeerAvatar(id) {
    console.log("Adding peer avatar to 3D scene.");
    this.avatars[id] = {};

    let videoElement = document.getElementById(id + "_video");
    let videoTexture = new THREE.VideoTexture(videoElement);

    let videoMaterial = new THREE.MeshBasicMaterial({
      map: videoTexture,
      overdraw: true,
      side: THREE.DoubleSide,
    });
    let otherMat = new THREE.MeshNormalMaterial();

    let head = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1, 0.5), [
      otherMat,
      otherMat,
      otherMat,
      otherMat,
      otherMat,
      videoMaterial,
    ]);

    // set position of head before adding to parent object
    head.position.set(0, 0, 0);

    // https://threejs.org/docs/index.html#api/en/objects/Group
    var group = new THREE.Group();
    group.add(head);

    // add group to scene
    this.scene.add(group);

    this.avatars[id].group = group;
  }

  removePeerAvatar(id) {
    console.log("Removing peer avatar from 3D scene.");
    this.scene.remove(this.avatars[id].group);
    delete this.avatars[id];
  }

  updatePeerAvatars(peerInfoFromServer) {
    for (let id in peerInfoFromServer) {
      if (this.avatars[id]) {
        let pos = peerInfoFromServer[id].position;
        let rot = peerInfoFromServer[id].rotation;

        this.avatars[id].group.position.set(pos[0], pos[1], pos[2]);
        this.avatars[id].group.quaternion.set(rot[0], rot[1], rot[2], rot[3]);
      }
    }
  }

  updateClientVolumes() {
    for (let id in this.avatars) {
      let audioEl = document.getElementById(id + "_audio");
      if (audioEl && this.avatars[id].group) {
        let distSquared = this.camera.position.distanceToSquared(
          this.avatars[id].group.position
        );

        if (distSquared > 500) {
          audioEl.volume = 0;
        } else {
          // https://discourse.threejs.org/t/positionalaudio-setmediastreamsource-with-webrtc-question-not-hearing-any-sound/14301/29
          let volume = Math.min(1, 10 / distSquared);
          audioEl.volume = volume;
        }
      }
    }
  }

  // Interaction 🤾‍♀️

  getPlayerPosition() {
    return [
      [this.camera.position.x, this.camera.position.y, this.camera.position.z],
      [
        this.camera.quaternion._x,
        this.camera.quaternion._y,
        this.camera.quaternion._z,
        this.camera.quaternion._w,
      ],
    ];
  }

  // Rendering 🎥

  loop() {
    this.frameCount++;

    this.controls.update();

    // update client volumes every 25 frames
    if (this.frameCount % 25 === 0) {
      this.updateClientVolumes();
    }

    this.renderer.render(this.scene, this.camera);

    requestAnimationFrame(() => this.loop());
    console.log("loop çalışıyor");
  }

  loadChairModel(x,y,z) {
    // first create a loader
    const loader = new GLTFLoader();
    // then load the file and add it to your scene
    loader.load("./chair.glb", (gltf) => {
      this.chair = gltf.scene;
      //this.chair.scene.position.set(-10,-1,-1);
      //this.chair.scene.scale.set(10,10,10);
      this.loadChairModel.receiveShadow = true;
      this.loadChairModel.castShadow = true;
      this.scene.add(gltf.scene);
      this.chair.position.set(x,y,z);
      this.chair.scale.set(0.6,0.7,0.6);
      console.log("model yüklendi");
    });
  }

  loadChairModel2(x,y,z) {
    // first create a loader
    const loader = new GLTFLoader();
    // then load the file and add it to your scene
    loader.load("./chair.glb", (gltf) => {
      this.chair = gltf.scene;
      //this.chair.scene.position.set(-10,-1,-1);
      //this.chair.scene.scale.set(10,10,10);
      this.loadChairModel2.receiveShadow = true;
      this.loadChairModel2.castShadow = true;
      this.scene.add(gltf.scene);
      this.chair.position.set(x,y,z);
      this.chair.scale.set(0.6,0.7,0.6);
      this.chair.rotation.set(0,3.2,0)
      console.log("model yüklendi");
    });
  }

  loadTableModel() {
    // first create a loader
    const loader = new GLTFLoader();
    // then load the file and add it to your scene
    loader.load("./table.glb", (gltf) => {
      this.chair = gltf.scene;
      //this.chair.scene.position.set(-10,-1,-1);
      //this.chair.scene.scale.set(10,10,10);
      this.loadTableModel.receiveShadow = true;
      this.loadTableModel.castShadow = true;
      this.scene.add(gltf.scene);
      this.chair.position.set(0,-1.5,0);
      this.chair.scale.set(0.03,0.03,0.03);
      console.log("model yüklendi");
    });
  }

  try() {
    let backWallGeo = new THREE.BoxGeometry(1, 0.1, 1);
    let backMat = new THREE.MeshPhongMaterial({ color: "green" });
    let backWallMesh = new THREE.Mesh(backWallGeo, backMat);
    backWallMesh.position.set(0,0,0);
    backWallMesh.receiveShadow = true;
    this.scene.add(backWallMesh);
    console.log("try is working");
      }
 
  
}

