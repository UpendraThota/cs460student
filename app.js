import * as THREE from './build/three.module.js';


const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdddddd);


const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 10, 10);
camera.lookAt(scene.position);


const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);


const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
directionalLight.position.set(0, 10, 5);
directionalLight.castShadow = true;
scene.add(directionalLight);

function getMazeSizeFromDifficulty() {
    const params = new URLSearchParams(window.location.search);
    const difficulty = params.get('difficulty');
    let width, height;

    if (difficulty === 'easy') {
        width = randomIntBetween(7, 13);
        height = randomIntBetween(7, 13);
    } else if (difficulty === 'medium') {
        width = randomIntBetween(13, 23);
        height = randomIntBetween(13, 23);
    } else if (difficulty === 'hard') {
        width = randomIntBetween(20, 35);
        height = randomIntBetween(20, 35);
    } else {
        
        width = 7;
        height = 7;
    }

    return { width, height };
}

function randomIntBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}


const mazeSize = getMazeSizeFromDifficulty();
const mazeWidth = mazeSize.width;
const mazeHeight = mazeSize.height;
const wallSize = 1;
const wallHeight = 2;
let maze = generateMaze(mazeWidth, mazeHeight);


const textureLoader = new THREE.TextureLoader();


const texturePaths = [
    'textures/walltextures/texture1.jpg',
    'textures/walltextures/texture2.jpg',
    'textures/walltextures/texture3.jpg',
    'textures/walltextures/texture4.jpg',
    'textures/walltextures/texture5.jpg',
    'textures/walltextures/texture6.jpg',
];


function getRandomTexture() {
    const randomIndex = Math.floor(Math.random() * texturePaths.length);
    return texturePaths[randomIndex];
}


const wallTexture = textureLoader.load(getRandomTexture());
wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;
wallTexture.repeat.set(1, 1);


const wallMaterial = new THREE.MeshStandardMaterial({ map: wallTexture });


createMazeWalls();


const playerVelocity = 0.1;
const playerSize = 0.5;
const playerGeometry = new THREE.BoxGeometry(playerSize, playerSize, playerSize);
const playerMaterial = new THREE.MeshBasicMaterial({ map: textureLoader.load('textures/player_texture.png') });
const player = new THREE.Mesh(playerGeometry, playerMaterial);
player.position.set(-mazeWidth * wallSize / 2 + wallSize, playerSize / 2, -mazeHeight * wallSize / 2 + wallSize);
scene.add(player);


const goalSize = 0.5;
const goalGeometry = new THREE.BoxGeometry(goalSize, goalSize, goalSize);
const goalMaterial = new THREE.MeshBasicMaterial({ map: textureLoader.load('textures/goal-texture.png') });
const goal = new THREE.Mesh(goalGeometry, goalMaterial);


goal.position.set(
    (mazeWidth - 2) * wallSize - mazeWidth * wallSize / 2 + wallSize / 2, 
    goalSize / 2, 
    (mazeHeight - 2) * wallSize - mazeHeight * wallSize / 2 + wallSize / 2
);
scene.add(goal);


const playerMovement = {
  forward: false,
  backward: false,
  left: false,
  right: false
};


document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);


window.addEventListener('resize', onWindowResize);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

const rotationSpeed = 0.05;

function onKeyDown(event) {
    switch (event.keyCode) {
        case 87: 
            playerMovement.forward = true;
            break;
        case 83: 
            playerMovement.backward = true;
            break;
        case 65: 
            playerMovement.left = true;
            break;
        case 68: 
            playerMovement.right = true;
            break;
    }
    if (currentCameraMode === cameraModes.FIRST_PERSON) {
        switch (event.keyCode) {
            case 37: 
                player.rotation.y += rotationSpeed;
                break;
            case 39: 
                player.rotation.y -= rotationSpeed;
                break;
            
        }
    }
}

function onKeyUp(event) {
    switch (event.keyCode) {
        case 87: 
            playerMovement.forward = false;
            break;
        case 83: 
            playerMovement.backward = false;
            break;
        case 65: 
            playerMovement.left = false;
            break;
        case 68: 
            playerMovement.right = false;
            break;
    }
}

function generateMaze(width, height) {
    let maze = Array.from({ length: height }, () => Array(width).fill(1));

    function carve(x, y) {
        const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        directions.sort(() => Math.random() - 0.5);

        maze[y][x] = 0;

        for (let [dx, dy] of directions) {
            const nx = x + dx * 2, ny = y + dy * 2;
            if (nx > 0 && nx < width - 1 && ny > 0 && ny < height - 1 && maze[ny][nx] === 1) {
                maze[ny - dy][nx - dx] = 0;
                carve(nx, ny);
            }
        }
    }

    carve(1, 1);
    return maze;
}

function createMazeWalls() {
    for (let y = 0; y < mazeHeight; y++) {
        for (let x = 0; x < mazeWidth; x++) {
            if (maze[y][x] === 1) {
                const wall = new THREE.Mesh(new THREE.BoxGeometry(wallSize, wallHeight, wallSize), wallMaterial);
                wall.position.set(x * wallSize - mazeWidth * wallSize / 2 + wallSize / 2, wallHeight / 2, y * wallSize - mazeHeight * wallSize / 2 + wallSize / 2);
                wall.castShadow = true;
                scene.add(wall);
            }
        }
    }
}


placeGoalRandomly();

function animate() {
    requestAnimationFrame(animate);

    updatePlayerMovement();
    updateCameraPosition(); 
    checkWinCondition();

    renderer.render(scene, camera);
}

function updatePlayerMovement() {
    let delta = new THREE.Vector3();
    if (playerMovement.forward) delta.z -= playerVelocity;
    if (playerMovement.backward) delta.z += playerVelocity;
    if (playerMovement.left) delta.x -= playerVelocity;
    if (playerMovement.right) delta.x += playerVelocity;

    
    let newPos = player.position.clone().add(delta);
    if (!isWall(newPos.x, newPos.z)) {
        player.position.add(delta);
    }
}

function isWall(x, z) {
    const mazeX = Math.floor((x + mazeWidth * wallSize / 2) / wallSize);
    const mazeZ = Math.floor((z + mazeHeight * wallSize / 2) / wallSize);
    return maze[mazeZ] && maze[mazeZ][mazeX] === 1;
}


function checkWinCondition() {
    const playerBox = new THREE.Box3().setFromObject(player);
    const goalBox = new THREE.Box3().setFromObject(goal);
    
    if (playerBox.intersectsBox(goalBox)) {
        
        const overlay = document.getElementById('overlay');
        overlay.style.display = 'flex';

        
        const playAgainButton = document.getElementById('play-again-button');
        playAgainButton.addEventListener('click', () => {
            
            overlay.style.display = 'none';
            window.location.reload();
             
        });
    }
}

const cameraModes = {
    TOP_DOWN: 'top_down',
    DYNAMIC: 'dynamic',
    FIRST_PERSON: 'first_person'
};

let currentCameraMode = cameraModes.TOP_DOWN;

function switchCameraMode() {
    if (currentCameraMode === cameraModes.TOP_DOWN) {
        currentCameraMode = cameraModes.DYNAMIC;
    } else if (currentCameraMode === cameraModes.DYNAMIC) {
        currentCameraMode = cameraModes.FIRST_PERSON;
    } else {
        currentCameraMode = cameraModes.TOP_DOWN;
    }
}

document.addEventListener('keydown', function(event) {
    if (event.keyCode === 67) { 
        switchCameraMode();
    }
});

        
document.getElementById('camerabutton').addEventListener('click', function() {
    switchCameraMode();
});

function updateCameraPosition() {
    if (currentCameraMode === cameraModes.DYNAMIC) {
        camera.position.x = player.position.x;
        camera.position.y = player.position.y + 5; 
        camera.position.z = player.position.z + 5; 
        camera.lookAt(player.position);
    } else if (currentCameraMode === cameraModes.TOP_DOWN) {
        camera.position.x = player.position.x;
        camera.position.y = maze.length; 
        camera.position.z = player.position.z;
        camera.lookAt(player.position);
    }
     else if (currentCameraMode === cameraModes.FIRST_PERSON) {
        camera.position.set(player.position.x, player.position.y+1, player.position.z);
        
        
        camera.rotation.copy(player.rotation);
    }
}

function placeGoalRandomly() {
    let x, z, gridX, gridZ, minDistance;
    do {
        x = THREE.MathUtils.randInt(0, mazeWidth - 1);
        z = THREE.MathUtils.randInt(0, mazeHeight - 1);
        gridX = x * wallSize - mazeWidth * wallSize / 2 + wallSize / 2;
        gridZ = z * wallSize - mazeHeight * wallSize / 2 + wallSize / 2;
        minDistance = Math.abs(x - 1) + Math.abs(z - 1); 
    } while (maze[z][x] === 1 || minDistance < (mazeWidth + mazeHeight) / 4); 

    goal.position.set(gridX, goalSize / 2, gridZ);
}

function findFurthestPoint(maze, start) {
    let visited = new Array(maze.length).fill(false).map(() => new Array(maze[0].length).fill(false));
    let queue = [];
    let furthestPoint = { ...start, distance: 0 };
    
    visited[start.z][start.x] = true;
    queue.push({ x: start.x, z: start.z, distance: 0 });

    while (queue.length > 0) {
        let current = queue.shift();
        
        
        let directions = [[0, -1], [0, 1], [-1, 0], [1, 0]];

        for (let [dx, dz] of directions) {
            let nextX = current.x + dx;
            let nextZ = current.z + dz;

            if (nextX >= 0 && nextX < maze[0].length && nextZ >= 0 && nextZ < maze.length && !visited[nextZ][nextX] && maze[nextZ][nextX] === 0) {
                visited[nextZ][nextX] = true;
                let nextDistance = current.distance + 1;
                queue.push({ x: nextX, z: nextZ, distance: nextDistance });

                if (nextDistance > furthestPoint.distance) {
                    furthestPoint = { x: nextX, z: nextZ, distance: nextDistance };
                }
            }
        }
    }

    return furthestPoint;
}


let start = { x: 1, z: 1 }; 
let furthest = findFurthestPoint(maze, start);

function placeGoal(furthest) {
    
    let goalX = (furthest.x - maze[0].length / 2) * wallSize + wallSize / 2;
    let goalZ = (furthest.z - maze.length / 2) * wallSize + wallSize / 2;

    
    goal.position.set(goalX, goalSize / 2, goalZ);
    scene.add(goal);
}

function findOpenTopLeftSpawnPoint() {
    let x = 1; 
    let z = 1; 

    while (maze[z][x] === 1) {
        x++;
        if (x >= mazeWidth) {
            x = 1;
            z++;
        }
        if (z >= mazeHeight) {
            
            throw new Error('No open space found in the maze for player spawn.');
        }
    }

    const spawnX = x * wallSize - mazeWidth * wallSize / 2 + wallSize / 2;
    const spawnZ = z * wallSize - mazeHeight * wallSize / 2 + wallSize / 2;

    return { x: spawnX, z: spawnZ };
}


const playerSpawnPoint = findOpenTopLeftSpawnPoint();
player.position.set(playerSpawnPoint.x, playerSize / 2, playerSpawnPoint.z);


placeGoal(furthest);

animate();
