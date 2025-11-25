// Variáveis do jogo
let scene, camera, renderer, player, ground, machine, coins = [], particles = [];
let keys = {}, gameRunning = true;
let playerVelocity = { x: 0, y: 0, z: 0 };

// Sistema de progressão
let playerLevel = 1;
let coinsCarried = 0;
let coinsStored = 0;
let experience = 0;
let maxCarryCapacity = 5;
let playerSpeed = 0.06;
let collectionRange = 1.2;

// Configurações de nível
const levelRequirements = [0, 10, 25, 50, 100, 175, 275, 400, 550, 750, 1000];

// Aumentando o tamanho do mundo em 4x (dobrando a largura e o comprimento)
const worldSize = 400;

let nearMachine = false;

// Variáveis do joystick mobile
let joystickInput = { x: 0, z: 0 };
let joystickActive = false;
const JOYSTICK_DEADZONE = 0.15;
const JOYSTICK_MAX_DISTANCE = 28;

// Variáveis do dash
let isDashing = false;
let dashCooldown = 0;
const DASH_COOLDOWN_TIME = 3000; // 3 segundos
const DASH_DURATION = 200; // 0.2 segundos
const DASH_SPEED_MULTIPLIER = 4; // 4x a velocidade normal

// Adicionando controles de órbita
let controls;

// Variáveis para a animação do personagem Roblox
let leftArmGroup, rightArmGroup, leftLegGroup, rightLegGroup;

// NOVO: Array para guardar os zumbis
let zombies = []; 

// MUDANÇA: Array para guardar as partículas de areia (antigas folhas)
let sandParticles = []; 

// NOVO: Posições pré-definidas para os zumbis
const ZOMBIE_SPAWN_POSITIONS = [ 
    { x: -70, y: 0, z: 70 },
    { x: 70, y: 0, z: 70 },
    { x: -70, y: 0, z: -70 },
    { x: 70, y: 0, z: -70 }
];

// NOVO: Constantes para o comportamento dos zumbis
const ZOMBIE_AGGRO_RANGE = 15; // Distância para começar a perseguir
const ZOMBIE_ATTACK_RANGE = 2.5; // Distância para atacar
const ZOMBIE_SPEED = 0.08; // Velocidade de perseguição (ajustada para ser mais lenta)

// --- Variáveis para Colisões ---
let trees = []; // Agora são Cactos

// --- NOVO: Variáveis para a Casa e Moinho ---
let houseGroup, windmillGroup; 
let windmillRotation = 0; // Para a animação do moinho
let houseDoor; // Referência à porta para interatividade
let windmillBlades; // Referência às hélices para animação

// Configuração inicial
function init() {
    // ***************************************************************
    // CORREÇÃO: Inicializa o Renderer antes de usá-lo
    // ***************************************************************
    const desertSkyColor = 0xFFE0B2; // Laranja claro/Pêssego

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(desertSkyColor, 1); // MUDANÇA: Cor de fundo do renderer
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    const gameContainer = document.getElementById('gameContainer');
    if (gameContainer) {
        gameContainer.appendChild(renderer.domElement);
    } else {
        // Fallback: adicionar ao body se gameContainer não for encontrado
        document.body.appendChild(renderer.domElement);
    }

    // Cena
    const desertFogColor = 0xFFA07A; // Salmão Claro para o nevoeiro do deserto
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(desertFogColor, worldSize * 0.4, worldSize * 1.5);

    // Câmera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(20, 30, 20); // Posição inicial da câmera ajustada para uma boa visualização

    // Iluminação
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(20, 50, 10); // Sol mais alto (Deserto)
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048; // Otimizado
    directionalLight.shadow.mapSize.height = 2048; // Otimizado
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 300;
    directionalLight.shadow.camera.left = -120;
    directionalLight.shadow.camera.right = 120;
    directionalLight.shadow.camera.top = 120;
    directionalLight.shadow.camera.bottom = -120;
    scene.add(directionalLight);

    // Criar mundo
    createGround();
    createRobloxCharacter(); // CHAMA A NOVA FUNÇÃO AQUI
    createMachine();
    spawnCoins();
    // CHAMA A FUNÇÃO PARA CRIAR OS CACTOS
    spawnDesertCacti(); 
    
    // NOVO: Criar zumbis
    spawnZombies(); 
    
    // NOVO: Criar Casa e Moinho no mapa
    createWildWestHouse(50, 0, 50); // Posição no mapa
    createWildWestWindmill(-50, 0, -50); // Outra posição no mapa

    // Controles de órbita para a câmera
    // Verifica se OrbitControls está carregado globalmente
    if (typeof THREE.OrbitControls !== 'undefined') {
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.target.set(0, 1.5, 0); // Foca a câmera no novo personagem
        controls.enableDamping = false; 
        controls.dampingFactor = 0; 
        controls.enablePan = true;
        controls.minDistance = 9;
        controls.maxDistance = 9;
        controls.maxPolarAngle = Math.PI / 2.2; 
        controls.update();
    } else {
        // Se não estiver carregado, a câmera ficará fixa
        console.warn("THREE.OrbitControls não está carregado! A câmera ficará estática. Certifique-se de incluir o script.");
    }

    // Event listeners
    setupControls();

    // Inicializar UI
    updateUI();

    // Iniciar loop do jogo
    animate();
}

// --- NOVO: FUNÇÃO PARA CRIAR A CASA DE FAROESTE ---
function createWildWestHouse(x, y, z) {
    houseGroup = new THREE.Group();
    // Configurações de cor para consistência no estilo de material Lambert
    const houseColor = 0x8B4513; // Marrom Madeira
    const roofColor = 0x8B4513;
    const doorColor = 0x654321;
    const windowColor = 0x4682B4;
    const foundationColor = 0x696969;
    const chimneyColor = 0x8B0000;
    const accentColor = 0x654321;
    const handleColor = 0xFFD700;

    // Função auxiliar para criar material com Lambert para consistência
    function createLambertMaterial(color, params = {}) {
        return new THREE.MeshLambertMaterial({ color: color, ...params });
    }

    // Fundação de pedra
    const foundationGeometry = new THREE.BoxGeometry(9, 1, 9);
    const foundation = new THREE.Mesh(foundationGeometry, createLambertMaterial(foundationColor));
    foundation.position.y = 0.5;
    foundation.castShadow = true;
    foundation.receiveShadow = true;
    houseGroup.add(foundation);

    // Paredes principais com textura de madeira
    const wallGeometry = new THREE.BoxGeometry(8, 6, 8);
    const walls = new THREE.Mesh(wallGeometry, createLambertMaterial(houseColor));
    walls.position.y = 4;
    walls.castShadow = true;
    walls.receiveShadow = true;
    houseGroup.add(walls);

    // Detalhes das tábuas de madeira
    for (let i = 0; i < 6; i++) {
        const plankGeometry = new THREE.BoxGeometry(8.1, 0.3, 0.1);
        const plank = new THREE.Mesh(plankGeometry, createLambertMaterial(houseColor));
        plank.position.set(0, 2 + i * 0.8, 4.05);
        plank.castShadow = true;
        houseGroup.add(plank);
    }

    // Telhado com vigas
    const roofGeometry = new THREE.ConeGeometry(6.5, 4.5, 4);
    const roof = new THREE.Mesh(roofGeometry, createLambertMaterial(roofColor));
    roof.position.y = 9;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    houseGroup.add(roof);

    // Vigas do telhado
    for (let i = 0; i < 4; i++) {
        const beamGeometry = new THREE.BoxGeometry(0.2, 0.2, 7);
        const beam = new THREE.Mesh(beamGeometry, createLambertMaterial(accentColor));
        beam.position.set(
            Math.cos(i * Math.PI / 2) * 3,
            8.5,
            Math.sin(i * Math.PI / 2) * 3
        );
        beam.rotation.y = i * Math.PI / 2;
        beam.castShadow = true;
        houseGroup.add(beam);
    }

    // Chaminé
    const chimneyGeometry = new THREE.BoxGeometry(1, 3, 1);
    const chimney = new THREE.Mesh(chimneyGeometry, createLambertMaterial(chimneyColor));
    chimney.position.set(-2, 10, -2);
    chimney.castShadow = true;
    houseGroup.add(chimney);

    // Porta com detalhes
    const doorFrameGeometry = new THREE.BoxGeometry(2, 3.5, 0.3);
    const doorFrame = new THREE.Mesh(doorFrameGeometry, createLambertMaterial(accentColor));
    doorFrame.position.set(0, 2.75, 4.15);
    doorFrame.castShadow = true;
    houseGroup.add(doorFrame);

    const doorGeometry = new THREE.BoxGeometry(1.6, 3, 0.2);
    houseDoor = new THREE.Mesh(doorGeometry, createLambertMaterial(doorColor)); // Salva a referência
    houseDoor.position.set(0, 2.5, 4.2);
    houseDoor.castShadow = true;
    houseGroup.add(houseDoor);

    // Maçaneta da porta
    const handleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const handle = new THREE.Mesh(handleGeometry, createLambertMaterial(handleColor));
    handle.position.set(0.6, 0, 0.1); // Posição relativa à porta
    houseDoor.add(handle);

    // Janelas
    const windowFrameGeometry = new THREE.BoxGeometry(1.5, 1.5, 0.2);
    const windowGlassGeometry = new THREE.BoxGeometry(1.2, 1.2, 0.05);
    const windowGlassMaterial = new THREE.MeshLambertMaterial({ 
        color: windowColor,
        transparent: true,
        opacity: 0.7
    });

    // Janela esquerda
    const windowFrame1 = new THREE.Mesh(windowFrameGeometry, createLambertMaterial(accentColor));
    windowFrame1.position.set(-2, 4, 4.1);
    houseGroup.add(windowFrame1);
    
    const windowGlass1 = new THREE.Mesh(windowGlassGeometry, windowGlassMaterial);
    windowGlass1.position.set(-2, 4, 4.12);
    houseGroup.add(windowGlass1);

    // Divisórias
    const dividerMaterial = createLambertMaterial(accentColor);
    const divider1 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.2, 0.1), dividerMaterial);
    divider1.position.set(-2, 4, 4.13);
    houseGroup.add(divider1);
    const divider2 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.1), dividerMaterial);
    divider2.position.set(-2, 4, 4.13);
    houseGroup.add(divider2);

    // Janela direita
    const windowFrame2 = new THREE.Mesh(windowFrameGeometry, createLambertMaterial(accentColor));
    windowFrame2.position.set(2, 4, 4.1);
    houseGroup.add(windowFrame2);
    
    const windowGlass2 = new THREE.Mesh(windowGlassGeometry, windowGlassMaterial);
    windowGlass2.position.set(2, 4, 4.12);
    houseGroup.add(windowGlass2);

    // Degraus da entrada
    for (let i = 0; i < 3; i++) {
        const stepGeometry = new THREE.BoxGeometry(3, 0.2, 0.8);
        const stepMaterial = createLambertMaterial(foundationColor);
        const step = new THREE.Mesh(stepGeometry, stepMaterial);
        step.position.set(0, 0.1 + i * 0.2, 4.2 - i * 0.4);
        step.castShadow = true;
        step.receiveShadow = true;
        houseGroup.add(step);
    }
    
    // Varanda (simplificada para não sobrecarregar)
    const porchGeometry = new THREE.BoxGeometry(10, 0.4, 3.5);
    const porchMaterial = createLambertMaterial(houseColor);
    const porch = new THREE.Mesh(porchGeometry, porchMaterial);
    porch.position.set(0, 1.2, 5.75);
    porch.castShadow = true;
    porch.receiveShadow = true;
    houseGroup.add(porch);
    
    // Colunas da varanda (duas)
    const columnGeometry = new THREE.CylinderGeometry(0.25, 0.3, 3.5);
    const columnMaterial = createLambertMaterial(accentColor);
    
    for (let i = -3.5; i <= 3.5; i += 7) {
        const column = new THREE.Mesh(columnGeometry, columnMaterial);
        column.position.set(i, 2.75, 7.5);
        houseGroup.add(column);
    }


    houseGroup.position.set(x, y, z);
    scene.add(houseGroup);
}
// --- FIM DA FUNÇÃO DA CASA ---


// --- NOVO: FUNÇÃO PARA CRIAR O MOINHO DE VENTO ---
function createWildWestWindmill(x, y, z) {
    windmillGroup = new THREE.Group();
    
    // Cores
    const baseColor = 0x696969;
    const towerColor = 0x8B4513;
    const accentColor = 0x654321;
    const axisColor = 0x2F4F4F;
    const clothColor = 0xF5F5DC;

    // Função auxiliar para criar material com Lambert para consistência
    function createLambertMaterial(color, params = {}) {
        return new THREE.MeshLambertMaterial({ color: color, ...params });
    }

    // Base de pedra do moinho
    const baseGeometry = new THREE.CylinderGeometry(1.2, 1.5, 1.5);
    const base = new THREE.Mesh(baseGeometry, createLambertMaterial(baseColor));
    base.position.y = 0.75;
    base.castShadow = true;
    base.receiveShadow = true;
    windmillGroup.add(base);

    // Torre do moinho com textura de madeira
    const towerGeometry = new THREE.CylinderGeometry(0.6, 0.9, 10);
    const tower = new THREE.Mesh(towerGeometry, createLambertMaterial(towerColor));
    tower.position.y = 6.5;
    tower.castShadow = true;
    tower.receiveShadow = true;
    windmillGroup.add(tower);

    // Anéis de reforço na torre
    for (let i = 0; i < 4; i++) {
        const ringGeometry = new THREE.TorusGeometry(0.95, 0.08, 8, 16);
        const ring = new THREE.Mesh(ringGeometry, createLambertMaterial(accentColor));
        ring.position.y = 3 + i * 2;
        ring.rotation.x = Math.PI / 2;
        ring.castShadow = true;
        windmillGroup.add(ring);
    }

    // Cabeça do moinho
    const headGeometry = new THREE.CylinderGeometry(0.8, 0.6, 1.5);
    const head = new THREE.Mesh(headGeometry, createLambertMaterial(accentColor));
    head.position.y = 12.25;
    head.castShadow = true;
    windmillGroup.add(head);

    // Eixo central das hélices
    const axisGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1.5);
    const axis = new THREE.Mesh(axisGeometry, createLambertMaterial(axisColor));
    axis.position.set(0, 12.25, 0.75);
    axis.rotation.x = Math.PI / 2;
    axis.castShadow = true;
    windmillGroup.add(axis);

    // Hélices detalhadas
    windmillBlades = new THREE.Group(); // Salva a referência para animação
    
    for (let i = 0; i < 4; i++) {
        const bladeGroup = new THREE.Group();
        
        // Estrutura principal da hélice (maior)
        const bladeFrameGeometry = new THREE.BoxGeometry(0.25, 7, 0.15);
        const bladeFrame = new THREE.Mesh(bladeFrameGeometry, createLambertMaterial(accentColor));
        bladeFrame.position.y = 3.5;
        bladeFrame.castShadow = true;
        bladeGroup.add(bladeFrame);

        // Lona da hélice
        const bladeClothGeometry = new THREE.PlaneGeometry(6, 2);
        const bladeClothMaterial = createLambertMaterial(clothColor, {
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9
        });
        const bladeCloth = new THREE.Mesh(bladeClothGeometry, bladeClothMaterial);
        bladeCloth.position.set(0, 3.5, 0.08);
        bladeCloth.castShadow = true;
        bladeCloth.receiveShadow = true;
        bladeGroup.add(bladeCloth);
        
        bladeGroup.rotation.z = (i * Math.PI) / 2; // Rotação da hélice
        windmillBlades.add(bladeGroup);
    }

    // Centro das hélices (hub)
    const hubGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.5);
    const hub = new THREE.Mesh(hubGeometry, createLambertMaterial(axisColor));
    hub.rotation.x = Math.PI / 2;
    hub.castShadow = true;
    windmillBlades.add(hub);

    windmillBlades.position.set(0, 12.25, 0.75);
    windmillGroup.add(windmillBlades);

    // Porta do moinho
    const doorGeometry = new THREE.BoxGeometry(1, 2, 0.1);
    const millDoor = new THREE.Mesh(doorGeometry, createLambertMaterial(accentColor));
    millDoor.position.set(0, 2.5, 0.95);
    millDoor.castShadow = true;
    windmillGroup.add(millDoor);

    windmillGroup.position.set(x, y, z);
    scene.add(windmillGroup);
}
// --- FIM DA FUNÇÃO DO MOINHO DE VENTO ---


function createGround() {
// ... código createGround existente ...
    // Chão principal
    const desertGroundColor = 0xF4A460; // Areia
    const groundGeometry = new THREE.PlaneGeometry(worldSize * 2, worldSize * 2);
    const groundMaterial = new THREE.MeshLambertMaterial({
        color: desertGroundColor, // MUDANÇA: Cor do chão para areia
        transparent: true,
        opacity: 0.9
    });
    ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Adicionar detalhes ao chão
    createGroundDetails();

    // Bordas do mundo
    createWorldBorders();
}

function createGroundDetails() {
// ... código createGroundDetails existente ...
    // OTIMIZAÇÃO: Usando InstancedMesh para grama, flores e pedras
    const bushCount = 800; // MUDANÇA: Arbustos secos no lugar da grama
    const flowerCount = 100; // MUDANÇA: Menos flores (Deserto)
    const rockCount = 300; // MUDANÇA: Mais rochas
    const groundArea = worldSize * 1.8;

    // Arbustos Secos (no lugar da Grama)
    const bushGeometry = new THREE.ConeGeometry(0.2, 0.4, 4);
    const bushMaterial = new THREE.MeshLambertMaterial({ flatShading: true });
    const bushInstancedMesh = new THREE.InstancedMesh(bushGeometry, bushMaterial, bushCount);
    const bushMatrix = new THREE.Matrix4();
    const bushColor = new THREE.Color();
    for (let i = 0; i < bushCount; i++) {
        bushMatrix.makeRotationY(Math.random() * Math.PI * 2);
        bushMatrix.setPosition(
            (Math.random() - 0.5) * groundArea,
            0.2, // Posição mais baixa
            (Math.random() - 0.5) * groundArea
        );
        bushInstancedMesh.setMatrixAt(i, bushMatrix);
        bushInstancedMesh.setColorAt(i, bushColor.setHSL(0.1 + Math.random() * 0.1, 0.6, 0.4 + Math.random() * 0.2)); // MUDANÇA: Cores secas/marrons
    }
    bushInstancedMesh.castShadow = true;
    scene.add(bushInstancedMesh);

    // Flores do Deserto
    const flowerGeometry = new THREE.SphereGeometry(0.08, 6, 6);
    const flowerMaterial = new THREE.MeshLambertMaterial({ flatShading: true });
    const flowerInstancedMesh = new THREE.InstancedMesh(flowerGeometry, flowerMaterial, flowerCount);
    const flowerMatrix = new THREE.Matrix4();
    const flowerColor = new THREE.Color();
    for (let i = 0; i < flowerCount; i++) {
        flowerMatrix.makeTranslation(
            (Math.random() - 0.5) * groundArea,
            0.08,
            (Math.random() - 0.5) * groundArea
        );
        flowerInstancedMesh.setMatrixAt(i, flowerMatrix);
        flowerInstancedMesh.setColorAt(i, flowerColor.setHSL(0.9 + Math.random() * 0.05, 0.9, 0.8)); // MUDANÇA: Cores quentes (rosa/vermelho)
    }
    scene.add(flowerInstancedMesh);

    // Pedras
    const rockGeometry = new THREE.DodecahedronGeometry(0.2 + Math.random() * 0.3);
    const rockMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513, flatShading: true }); // MUDANÇA: Cor da pedra para marrom escuro
    const rockInstancedMesh = new THREE.InstancedMesh(rockGeometry, rockMaterial, rockCount);
    const rockMatrix = new THREE.Matrix4();
    for (let i = 0; i < rockCount; i++) {
        rockMatrix.makeRotationFromEuler(new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI));
        rockMatrix.setPosition(
            (Math.random() - 0.5) * groundArea,
            0.2,
            (Math.random() - 0.5) * groundArea
        );
        rockInstancedMesh.setMatrixAt(i, rockMatrix);
    }
    rockInstancedMesh.castShadow = true;
    scene.add(rockInstancedMesh);
}

function createWorldBorders() {
// ... código createWorldBorders existente ...
    const borderHeight = 3;
    const borderWidth = 0.5;
    const borderMaterial = new THREE.MeshLambertMaterial({ color: 0xA0522D }); // MUDANÇA: Cor mais desértica para a borda

    // Bordas
    const borders = [
        { x: 0, z: worldSize, w: worldSize * 2, h: borderWidth },
        { x: 0, z: -worldSize, w: worldSize * 2, h: borderWidth },
        { x: worldSize, z: 0, w: borderWidth, h: worldSize * 2 },
        { x: -worldSize, z: 0, w: borderWidth, h: worldSize * 2 }
    ];

    borders.forEach(border => {
        const geometry = new THREE.BoxGeometry(border.w, borderHeight, border.h);
        const mesh = new THREE.Mesh(geometry, borderMaterial);
        mesh.position.set(border.x, borderHeight / 2, border.z);
        mesh.receiveShadow = true;
        mesh.castShadow = true;
        scene.add(mesh);
    });
}

// NOVO PERSONAGEM
function createRobloxCharacter() {
// ... código createRobloxCharacter existente ...
    player = new THREE.Group();
    player.position.set(0, 1.5, 0);
    scene.add(player);

    const skinMaterial = new THREE.MeshLambertMaterial({ color: 0xF1C27D });
    const shirtMaterial = new THREE.MeshLambertMaterial({ color: 0x4444aa });
    const pantsMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const hairMaterial = new THREE.MeshLambertMaterial({ color: 0x2B1B0E });
    const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
    const mouthMaterial = new THREE.MeshLambertMaterial({ color: 0xAA0000 });

    // Cabeça mais robusta e arredondada
    const headGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const head = new THREE.Mesh(headGeometry, skinMaterial);
    head.position.set(0, 1.8, 0);
    head.castShadow = true;
    player.add(head);

    // Cabelo mais volumoso e detalhado
    const hairGeometry = new THREE.BoxGeometry(0.85, 0.4, 0.85);
    const hair = new THREE.Mesh(hairGeometry, hairMaterial);
    hair.position.set(0, 2.15, 0);
    hair.castShadow = true;

    // Adicionar mechas de cabelo laterais
    const sideHair1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.2), hairMaterial);
    sideHair1.position.set(-0.45, 2.0, 0.2);
    player.add(sideHair1);

    const sideHair2 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.2), hairMaterial);
    sideHair2.position.set(0.45, 2.0, 0.2);
    player.add(sideHair2);

    player.add(hair);

    // Olhos maiores e mais expressivos
    const eyeGeometry = new THREE.BoxGeometry(0.12, 0.12, 0.04);
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.18, 1.82, 0.41);
    player.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.18, 1.82, 0.41);
    player.add(rightEye);

    // Boca mais detalhada
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.08, 0.03), mouthMaterial);
    mouth.position.set(0, 1.58, 0.41);
    player.add(mouth);

    // Corpo mais robusto e musculoso
    const bodyGeometry = new THREE.BoxGeometry(1.1, 1.3, 0.5);
    const body = new THREE.Mesh(bodyGeometry, shirtMaterial);
    body.position.set(0, 0.9, 0);
    body.castShadow = true;

    // Adicionar detalhes do peito
    const chestDetail = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.52), new THREE.MeshLambertMaterial({ color: 0x3333aa }));
    chestDetail.position.set(0, 1.1, 0);
    player.add(chestDetail);

    player.add(body);

    // Braços mais musculosos e detalhados
    const armGeometry = new THREE.BoxGeometry(0.35, 1.1, 0.35);
    const armMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });

    leftArmGroup = new THREE.Group();
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.y = -0.55;
    leftArm.castShadow = true;

    // Ombro mais robusto
    const leftShoulder = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.4), armMaterial);
    leftShoulder.position.set(0, 0.1, 0);
    leftArmGroup.add(leftShoulder);

    // Antebraço definido
    const leftForearm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 0.3), skinMaterial);
    leftForearm.position.set(0, -0.8, 0);
    leftArmGroup.add(leftForearm);

    leftArmGroup.add(leftArm);
    leftArmGroup.position.set(-0.75, 1.6, 0);
    player.add(leftArmGroup);

    rightArmGroup = new THREE.Group();
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.y = -0.55;
    rightArm.castShadow = true;

    const rightShoulder = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.4), armMaterial);
    rightShoulder.position.set(0, 0.1, 0);
    rightArmGroup.add(rightShoulder);

    const rightForearm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 0.3), skinMaterial);
    rightForearm.position.set(0, -0.8, 0);
    rightArmGroup.add(rightForearm);

    rightArmGroup.add(rightArm);
    rightArmGroup.position.set(0.75, 1.6, 0);
    player.add(rightArmGroup);

    // Pernas mais robustas e musculosas
    const legGeometry = new THREE.BoxGeometry(0.45, 1.4, 0.45);

    leftLegGroup = new THREE.Group();
    const leftLeg = new THREE.Mesh(legGeometry, pantsMaterial);
    leftLeg.position.y = -0.7;

    // Coxa mais definida
    const leftThigh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.5), pantsMaterial);
    leftThigh.position.set(0, -0.1, 0);
    leftLegGroup.add(leftThigh);

    // Panturrilha
    const leftCalf = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.4), pantsMaterial);
    leftCalf.position.set(0, -1.0, 0);
    leftLegGroup.add(leftCalf);

    // Pé mais robusto
    const leftFoot = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.6), new THREE.MeshLambertMaterial({ color: 0x222222 }));
    leftFoot.position.set(0, -1.5, 0.1);
    leftLegGroup.add(leftFoot);

    leftLegGroup.add(leftLeg);
    leftLegGroup.position.set(-0.3, 0.25, 0);
    player.add(leftLegGroup);

    rightLegGroup = new THREE.Group();
    const rightLeg = new THREE.Mesh(legGeometry, pantsMaterial);
    rightLeg.position.y = -0.7;

    const rightThigh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.5), pantsMaterial);
    rightThigh.position.set(0, -0.1, 0);
    rightLegGroup.add(rightThigh);

    const rightCalf = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.4), pantsMaterial);
    rightCalf.position.set(0, -1.0, 0);
    rightLegGroup.add(rightCalf);

    const rightFoot = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.6), new THREE.MeshLambertMaterial({ color: 0x222222 }));
    rightFoot.position.set(0, -1.5, 0.1);
    rightLegGroup.add(rightFoot);

    rightLegGroup.add(rightLeg);
    rightLegGroup.position.set(0.3, 0.25, 0);
    player.add(rightLegGroup);
}

function createMachine() {
// ... código createMachine existente ...
    machine = new THREE.Group();
    machine.position.set(0, 0, 0);
    scene.add(machine);

    // Base da máquina
    const baseGeometry = new THREE.CylinderGeometry(2, 2.5, 1, 8);
    const baseMaterial = new THREE.MeshLambertMaterial({ color: 0x4169E1 });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.5;
    base.castShadow = true;
    base.receiveShadow = true;
    machine.add(base);

    // Corpo principal
    const bodyGeometry = new THREE.CylinderGeometry(1.5, 1.8, 3, 8);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x1E90FF });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 2.5;
    body.castShadow = true;
    machine.add(body);

    // Topo da máquina
    const topGeometry = new THREE.CylinderGeometry(1, 1.5, 0.5, 8);
    const topMaterial = new THREE.MeshLambertMaterial({ color: 0x00BFFF });
    const top = new THREE.Mesh(topGeometry, topMaterial);
    top.position.y = 4.25;
    top.castShadow = true;
    machine.add(top);

    // Slot para moedas
    const slotGeometry = new THREE.BoxGeometry(0.8, 0.1, 0.3);
    const slotMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
    const slot = new THREE.Mesh(slotGeometry, slotMaterial);
    slot.position.set(0, 3, 1.6);
    machine.add(slot);

    // Tela da máquina
    const screenGeometry = new THREE.PlaneGeometry(1.2, 0.8);
    const screenMaterial = new THREE.MeshLambertMaterial({
        color: 0x00FF00,
        emissive: 0x002200
    });
    const screen = new THREE.Mesh(screenGeometry, screenMaterial);
    screen.position.set(0, 2.5, 1.85);
    machine.add(screen);

    // Luzes da máquina
    for (let i = 0; i < 4; i++) {
        const lightGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const lightMaterial = new THREE.MeshLambertMaterial({
            color: i % 2 === 0 ? 0xFF0000 : 0x00FF00,
            emissive: i % 2 === 0 ? 0x330000 : 0x003300
        });
        const light = new THREE.Mesh(lightGeometry, lightMaterial);

        const angle = (i / 4) * Math.PI * 2;
        light.position.set(
            Math.cos(angle) * 1.2,
            4.5,
            Math.sin(angle) * 1.2
        );
        machine.add(light);
        light.userData = { isLight: true, originalEmissive: light.material.emissive.clone() };
    }

    // Área de detecção da máquina
    machine.userData = { interactionRadius: 3 };
}

function spawnCoins() {
// ... código spawnCoins existente ...
    // OTIMIZAÇÃO: Limita o número de moedas ativas a 150 para melhor performance
    const coinsToSpawn = Math.min(150, 150 + playerLevel * 20);

    for (let i = coins.length; i < coinsToSpawn; i++) {
        spawnCoin();
    }
}

function spawnCoin() {
// ... código spawnCoin existente ...
    const coinGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.15, 12);
    const coinMaterial = new THREE.MeshLambertMaterial({
        color: 0xFFD700,
        emissive: 0x332200
    });
    const coin = new THREE.Mesh(coinGeometry, coinMaterial);

    // Posição aleatória longe da máquina
    let x, z;
    do {
        x = (Math.random() - 0.5) * worldSize * 1.8;
        z = (Math.random() - 0.5) * worldSize * 1.8;
    } while (Math.sqrt(x * x + z * z) < 8); // Manter distância da máquina

    coin.position.set(x, 0.8, z);
    coin.castShadow = true;
    coin.userData = {
        collected: false,
        rotationSpeed: 0.08,
        floatOffset: Math.random() * Math.PI * 2
    };

    scene.add(coin);
    coins.push(coin);

    // Efeito de brilho
    const glowGeometry = new THREE.RingGeometry(0.5, 0.7, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFD700,
        transparent: true,
        opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.copy(coin.position);
    glow.position.y = 0.1;
    glow.rotation.x = -Math.PI / 2;
    scene.add(glow);
    coin.userData.glow = glow;
}

// --- MUDANÇA: CÓDIGO DO CACTO SAGUARO (DETALHADO) ---

// Função auxiliar para adicionar espinhos (dependência do novo Cacto)
function addSpines(mesh, count, radius) {
// ... código addSpines existente ...
    // Usamos um novo material e geometria a cada chamada para evitar problemas de partilha
    const spineGeometry = new THREE.ConeGeometry(0.015, 0.4, 4);
    const spineMaterial = new THREE.MeshLambertMaterial({ color: 0xD2B48C });
    
    for (let i = 0; i < count; i++) {
        const spine = new THREE.Mesh(spineGeometry, spineMaterial);
        
        const angle = (i % 8) * (Math.PI * 2 / 8);
        // Tenta pegar a altura da geometria; se não tiver, usa um valor padrão
        const heightParam = mesh.geometry.parameters.height || mesh.geometry.parameters.args?.[1] || 8; 
        const height = (Math.floor(i / 8) / (Math.floor(count / 8) || 1)) * heightParam - heightParam / 2;
        
        spine.position.set(
            Math.cos(angle) * radius,
            height,
            Math.sin(angle) * radius
        );
        // Gira o espinho para longe do centro
        spine.lookAt(
            spine.position.x * 2,
            spine.position.y,
            spine.position.z * 2
        );
        mesh.add(spine);
    }
}

// Função para criar um único Cacto Saguaro (baseado no código fornecido pelo usuário)
function createDesertCactus() {
// ... código createDesertCactus existente ...
    const cactusGroup = new THREE.Group();

    // Material do cacto
    const cactusMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x4F7942, // Verde Oliva Escuro
        flatShading: false 
    });

    // Corpo principal do cacto - alto e fino (8 unidades de altura, base em Y=0)
    const mainBodyGeometry = new THREE.CylinderGeometry(0.4, 0.5, 8, 16);
    const mainBody = new THREE.Mesh(mainBodyGeometry, cactusMaterial);
    mainBody.position.y = 4; // Coloca a base em Y=0
    mainBody.castShadow = true;
    cactusGroup.add(mainBody);

    // Braço esquerdo - curvado para cima
    const leftArmGroup = new THREE.Group();
    
    // Parte horizontal do braço esquerdo
    const leftArmHorizontal = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.3, 2, 12), 
        cactusMaterial
    );
    leftArmHorizontal.rotation.z = Math.PI / 2;
    leftArmHorizontal.position.set(-1.2, 5, 0);
    leftArmHorizontal.castShadow = true;
    leftArmGroup.add(leftArmHorizontal);

    // Parte vertical do braço esquerdo
    const leftArmVertical = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.25, 3, 12), 
        cactusMaterial
    );
    leftArmVertical.position.set(-2.2, 6.5, 0);
    leftArmVertical.castShadow = true;
    leftArmGroup.add(leftArmVertical);

    cactusGroup.add(leftArmGroup);

    // Braço direito - curvado para cima
    const rightArmGroup = new THREE.Group();
    
    // Parte horizontal do braço direito
    const rightArmHorizontal = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.3, 1.8, 12), 
        cactusMaterial
    );
    rightArmHorizontal.rotation.z = -Math.PI / 2;
    rightArmHorizontal.position.set(1.1, 4.5, 0);
    rightArmHorizontal.castShadow = true;
    rightArmGroup.add(rightArmHorizontal);

    // Parte vertical do braço direito
    const rightArmVertical = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.25, 2.5, 12), 
        cactusMaterial
    );
    rightArmVertical.position.set(2, 5.75, 0);
    rightArmVertical.castShadow = true;
    rightArmGroup.add(rightArmVertical);

    cactusGroup.add(rightArmGroup);

    // Adicionar espinhos
    addSpines(mainBody, 64, 0.45);
    addSpines(leftArmHorizontal, 24, 0.28);
    addSpines(leftArmVertical, 32, 0.23);
    addSpines(rightArmHorizontal, 24, 0.28);
    addSpines(rightArmVertical, 28, 0.23);
    
    cactusGroup.userData.isCactus = true;
    
    return cactusGroup;
}

// Função para espalhar os Cactos no mapa
function spawnDesertCacti() {
// ... código spawnDesertCacti existente ...
    const numCacti = 10; // Menos "árvores" no deserto
    const worldRadius = worldSize * 0.85;

    // Garante que o array está limpo antes de popular novamente
    trees.forEach(tree => scene.remove(tree));
    trees = [];

    for (let i = 0; i < numCacti; i++) {
        const cactus = createDesertCactus();

        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * worldRadius;

        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        cactus.position.set(x, 0, z);

        // Variação de escala e rotação
        const scale = 0.5 + Math.random() * 0.8;
        cactus.scale.set(scale, scale, scale);
        cactus.rotation.y = Math.random() * Math.PI * 2;

        scene.add(cactus);
        trees.push(cactus); // Adiciona à lista para verificação de colisão
    }
}
// --- FIM DO CÓDIGO DO CACTO ---

// --- MUDANÇA: LÓGICA DE PARTÍCULAS DE AREIA CAINDO (NO LUGAR DAS FOLHAS) ---

// Função para criar uma partícula de Areia/Poeira
function createSandParticle() {
// ... código createSandParticle existente ...
    const particleColor = new THREE.Color(0xD2B48C); // Cor cáqui/areia
    const particleGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1); // Mini-cubos para poeira
    const particleMaterial = new THREE.MeshBasicMaterial({
        color: particleColor,
        transparent: true,
        opacity: 0.5
    });
    const particle = new THREE.Mesh(particleGeometry, particleMaterial);

    // Posição inicial no topo do mundo (e espalhado)
    const worldArea = worldSize * 1.8;
    particle.position.set(
        (Math.random() - 0.5) * worldArea,
        worldSize / 2, // Começa no topo
        (Math.random() - 0.5) * worldArea
    );
    
    // Configuração de animação
    particle.userData = {
        speedY: (Math.random() * 0.05) + 0.05, // Velocidade de queda mais rápida (como poeira)
        windX: (Math.random() - 0.5) * 0.05, // Efeito de vento horizontal forte
        windZ: (Math.random() - 0.5) * 0.05,
        life: 50,
        originalOpacity: particle.material.opacity
    };

    scene.add(particle);
    sandParticles.push(particle);
}

// Função para atualizar as partículas de areia
function updateSandParticles() {
// ... código updateSandParticles existente ...
    // Manter um número constante de partículas ativas
    const MAX_PARTICLES = 150;
    if (sandParticles.length < MAX_PARTICLES) {
        createSandParticle();
    }
    
    // Atualiza a posição e rotação das partículas
    sandParticles.forEach((particle, index) => {
        // Animação de queda
        particle.position.y -= particle.userData.speedY;
        
        // Simulação de vento (movimento mais rápido no deserto)
        particle.position.x += particle.userData.windX;
        particle.position.z += particle.userData.windZ;
        
        // Diminui a opacidade e a vida
        particle.userData.life--;
        particle.material.opacity = particle.userData.originalOpacity * (particle.userData.life / 50);

        // Verifica se a partícula chegou ao chão ou a vida acabou
        if (particle.position.y <= 0 || particle.userData.life <= 0) {
            scene.remove(particle);
            sandParticles.splice(index, 1);
        }
    });
}
// --- FIM DA LÓGICA DE PARTÍCULAS DE AREIA ---


function setupControls() {
// ... código setupControls existente ...
    document.addEventListener('keydown', (event) => {
        keys[event.code] = true;

        // Interação com a máquina: AGORA USA 'KeyE' (E)
        if (event.code === 'KeyE' && nearMachine && coinsCarried > 0) {
            depositCoins();
        }

        // Iniciar o dash
        if (event.code === 'ShiftLeft' && !isDashing && dashCooldown <= 0) {
            startDash();
        }
    });

    document.addEventListener('keyup', (event) => {
        keys[event.code] = false;
    });

    // Controles mobile
    setupMobileControls();

    window.addEventListener('resize', onWindowResize);
}

function setupMobileControls() {
// ... código setupMobileControls existente ...
    const joystick = document.getElementById('joystick');
    const joystickKnob = document.getElementById('joystickKnob');
    const jumpButton = document.getElementById('jumpButton');
    const dashButton = document.getElementById('dashButton');
    const storeButton = document.getElementById('storeButton'); // NOVO: Referência ao botão de guardar
    
    // SÓ ADICIONA LISTENERS SE OS ELEMENTOS EXISTIREM
    if (!joystick || !joystickKnob || !jumpButton || !dashButton) return;

    function getTouchPos(e) {
        const rect = joystick.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const touch = e.touches[0] || e.changedTouches[0];

        return {
            x: touch.clientX - centerX,
            y: touch.clientY - centerY,
            screenX: touch.clientX // NOVO: Posição X na tela
        };
    }

    // ***************************************************************
    // NOVO: LÓGICA DE GESTÃO DE TOQUE NO LADO ESQUERDO DA TELA
    // ***************************************************************
    function handleJoystickTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0] || e.changedTouches[0];
        
        // Verifica se o toque está na metade esquerda da tela
        if (touch.clientX < window.innerWidth / 2) {
            joystickActive = true;
        } else {
            // Se o toque estiver no lado direito, não ativa o joystick
            joystickActive = false;
        }
    }

    function handleJoystickTouchMove(e) {
        e.preventDefault();
        
        // Verifica se o joystick foi ativado no touchstart (ou seja, se o toque começou no lado esquerdo)
        if (!joystickActive) return;

        const pos = getTouchPos(e);
        const distance = Math.sqrt(pos.x * pos.x + pos.y * pos.y);

        let finalX = pos.x;
        let finalY = pos.y;

        if (distance > JOYSTICK_MAX_DISTANCE) {
            const angle = Math.atan2(pos.y, pos.x);
            finalX = Math.cos(angle) * JOYSTICK_MAX_DISTANCE;
            finalY = Math.sin(angle) * JOYSTICK_MAX_DISTANCE;
        }

        joystickKnob.style.transform = `translate(calc(-50% + ${finalX}px), calc(-50% + ${finalY}px))`;

        const normalizedDistance = Math.min(distance, JOYSTICK_MAX_DISTANCE) / JOYSTICK_MAX_DISTANCE;

        if (normalizedDistance > JOYSTICK_DEADZONE) {
            const adjustedDistance = (normalizedDistance - JOYSTICK_DEADZONE) / (1 - JOYSTICK_DEADZONE);
            const angle = Math.atan2(finalY, finalX);
            joystickInput.x = Math.cos(angle) * adjustedDistance;
            joystickInput.z = Math.sin(angle) * adjustedDistance;
        } else {
            joystickInput.x = 0;
            joystickInput.z = 0;
        }
    }

    function handleJoystickTouchEnd(e) {
        // A desativação deve ocorrer independentemente de onde o toque terminou
        e.preventDefault();
        if (joystickActive) {
            joystickActive = false;
            joystickKnob.style.transform = 'translate(-50%, -50%)';
            joystickInput = { x: 0, z: 0 };
        }
    }

    joystick.addEventListener('touchstart', handleJoystickTouchStart);
    joystick.addEventListener('touchmove', handleJoystickTouchMove);
    joystick.addEventListener('touchend', handleJoystickTouchEnd);
    joystick.addEventListener('touchcancel', handleJoystickTouchEnd);
    // ***************************************************************
    
    // CORREÇÃO: Pular não deve depositar moedas!
    jumpButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        keys['Space'] = true; // Apenas ativa a tecla Space para pular
    });

    jumpButton.addEventListener('touchend', (e) => {
        e.preventDefault();
        keys['Space'] = false;
    });

    // NOVO: Listener dedicado para o botão de guardar moedas
    if (storeButton) {
        storeButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (nearMachine && coinsCarried > 0) {
                depositCoins();
            }
        });
    }

    dashButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (!isDashing && dashCooldown <= 0) {
            startDash();
        }
    });
}

// *******************************************************************
// FUNÇÃO updatePlayer() CORRIGIDA E ATUALIZADA COM ANIMAÇÃO DE PULO
// *******************************************************************
function updatePlayer() {
// ... código updatePlayer existente ...
    if (!gameRunning) return;

    const jumpPower = 0.35;
    const gravity = -0.025; 
    let friction = isDashing ? 0.92 : 0.85; 

    // CORREÇÃO: Altura de repouso do personagem (o centro do grupo 'player' deve estar aqui)
    const RESTING_HEIGHT = 1.5; 
    // Condição para estar no chão: a posição Y é menor ou igual à altura de repouso.
    const onGround = player.position.y <= RESTING_HEIGHT; 

    // Criar um vetor de movimento
    let moveDirection = new THREE.Vector3(0, 0, 0);

    // Movimento horizontal - Teclado
    if (keys['KeyW'] || keys['ArrowUp']) {
        moveDirection.z = -1;
    }
    if (keys['KeyS'] || keys['ArrowDown']) {
        moveDirection.z = 1;
    }
    if (keys['KeyA'] || keys['ArrowLeft']) {
        moveDirection.x = -1;
    }
    if (keys['KeyD'] || keys['ArrowRight']) {
        moveDirection.x = 1;
    }

    // Movimento horizontal - Joystick mobile
    if (Math.abs(joystickInput.x) > 0 || Math.abs(joystickInput.z) > 0) {
        moveDirection.x = joystickInput.x;
        moveDirection.z = joystickInput.z;
    }

    // Velocidade atual do jogador
    let currentSpeed = playerSpeed;

    // Dar boost lateral
    if (isDashing) {
        currentSpeed *= DASH_SPEED_MULTIPLIER;
        if (Math.abs(moveDirection.x) > 0.1) {
            currentSpeed *= 1.3; // 30% mais rápido só para os lados
        }
    }

    // Normalizar o vetor de direção para movimento consistente
    if (moveDirection.length() > 0) {
        moveDirection.normalize();

        // Aplicar a rotação da câmera ao movimento do jogador
        // Verifica se 'controls' foi inicializado
        const angle = controls ? controls.getAzimuthalAngle() : 0;
        const tempVector = new THREE.Vector3(moveDirection.x, 0, moveDirection.z).applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);

        // Aplica a velocidade atual (incluindo o dash)
        playerVelocity.x += tempVector.x * currentSpeed;
        playerVelocity.z += tempVector.z * currentSpeed;

        // Rotacionar o personagem para a direção do movimento
        const targetRotation = Math.atan2(tempVector.x, tempVector.z);
        // Interpolar a rotação mais devagar
        let rotationSmoothness = isDashing ? 0.20 : 0.30;
        player.rotation.y += (targetRotation - player.rotation.y) * rotationSmoothness;
    }

    // Pulo
    if (keys['Space'] && onGround) {
        playerVelocity.y = jumpPower;
        // Impedir que o pulo seja acionado em loop mantendo a tecla pressionada
        keys['Space'] = false; 
    }

    // Aplicar gravidade
    if (!onGround || playerVelocity.y > 0) { // Se não estiver no chão OU estiver subindo
        playerVelocity.y += gravity;
    } 
    
    // Atualizar posição vertical
    player.position.y += playerVelocity.y;

    // Colisão com o chão (CORREÇÃO APLICADA AQUI)
    if (player.position.y < RESTING_HEIGHT) {
        playerVelocity.y = 0; // Zera a velocidade vertical
        player.position.y = RESTING_HEIGHT; // Fixa na altura de repouso
    }


    // Aplicar fricção (após o cálculo da velocidade de movimento)
    playerVelocity.x *= friction;
    playerVelocity.z *= friction;

    // Atualizar posição horizontal
    player.position.x += playerVelocity.x;
    player.position.z += playerVelocity.z;

    // Garantir que o player não saia do mapa
    const halfSize = worldSize - 1.5;
    player.position.x = Math.max(-halfSize, Math.min(halfSize, player.position.x));
    player.position.z = Math.max(-halfSize, Math.min(halfSize, player.position.z));
    
    // ===================================================================
    // NOVO: Lógica de Animação de Pulo/Corrida/Parado
    // ===================================================================
    const isMoving = moveDirection.length() > 0;
    const isAirborne = !onGround;
    
    // Prioridade de Animação: 1. Aéreo > 2. Corrida > 3. Parado
    
    if (isAirborne) {
        // ANIMAÇÃO DE PULO: Braços e Pernas em posição de ação
        const jumpRotation = 0.6; // Rotação para os braços (para cima/trás)
        const legTuck = 0.3;      // Rotação para as pernas (levemente dobradas)

        // Braços (para cima/trás para a pose de pulo)
        leftArmGroup.rotation.x = -jumpRotation;
        rightArmGroup.rotation.x = -jumpRotation;
        
        // Pernas (levemente dobradas ou para trás)
        leftLegGroup.rotation.x = legTuck;
        rightLegGroup.rotation.x = legTuck;
        
    } else if (isMoving) {
        // ANIMAÇÃO DE CORRIDA: Movimento de balanço
        const swing = Math.sin(Date.now() * 0.015 * (isDashing ? 2 : 1)) * 0.6;
        
        leftArmGroup.rotation.x = swing;
        rightArmGroup.rotation.x = -swing;
        leftLegGroup.rotation.x = -swing;
        rightLegGroup.rotation.x = swing;

    } else {
        // Posição de descanso (Idle)
        leftArmGroup.rotation.x = 0;
        rightArmGroup.rotation.x = 0;
        leftLegGroup.rotation.x = 0;
        rightLegGroup.rotation.x = 0;
    }
    // ===================================================================

    // Animação sutil de respiração (mantida)
    if (player) {
        player.scale.y = 1 + Math.sin(Date.now() * 0.001) * 0.02;
    }
}
// *******************************************************************
// FIM DA FUNÇÃO updatePlayer() CORRIGIDA E ATUALIZADA
// *******************************************************************

function updateCoins() {
// ... código updateCoins existente ...
    // Coleta de moedas
    coins.forEach((coin, index) => {
        if (coin.userData.collected) return;

        // Animação de flutuação e rotação
        coin.rotation.y += coin.userData.rotationSpeed;
        coin.position.y = 0.8 + Math.sin(Date.now() * 0.003 + coin.userData.floatOffset) * 0.2;
        
        // Atualiza a posição do brilho
        coin.userData.glow.position.copy(coin.position);
        coin.userData.glow.position.y = 0.1;

        // Distância entre a moeda e o player (só no plano XZ)
        const distance = player.position.clone().setY(coin.position.y).distanceTo(coin.position);

        if (distance < collectionRange && coinsCarried < maxCarryCapacity) {
            // Inicia o efeito de atração
            const attractSpeed = 0.05;
            coin.position.lerp(player.position, attractSpeed);

            // Se estiver muito perto, coleta
            if (distance < 0.5) {
                collectCoin(coin, index);
            }
        }
    });
}

function collectCoin(coin, index) {
// ... código collectCoin existente ...
    if (coin.userData.collected) return;

    coin.userData.collected = true;
    coinsCarried++;
    
    // Efeito de partícula (opcional, mas bom)
    createCollectParticle(coin.position);

    // Remove do mundo
    scene.remove(coin.userData.glow);
    scene.remove(coin);
    coins.splice(index, 1);
    
    updateUI();
    
    // Recriar moeda após um pequeno atraso para manter o limite de moedas
    setTimeout(spawnCoin, 1000); // 1 segundo para respawn
}

function depositCoins() {
// ... código depositCoins existente ...
    if (coinsCarried > 0) {
        const deposited = coinsCarried;
        coinsStored += deposited;
        experience += deposited;
        coinsCarried = 0;
        
        // Efeito de partículas de depósito
        createDepositParticles(machine.position);

        // Nivelamento
        checkLevelUp();
        
        updateUI();
    }
}

function createCollectParticle(position) {
// ... código createCollectParticle existente ...
    const particleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const particleMaterial = new THREE.MeshBasicMaterial({ color: 0xFFD700, transparent: true, opacity: 1 });
    
    for (let i = 0; i < 5; i++) {
        const particle = new THREE.Mesh(particleGeometry, particleMaterial.clone());
        particle.position.copy(position);
        
        particle.userData = {
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.1,
                Math.random() * 0.1 + 0.05,
                (Math.random() - 0.5) * 0.1
            ),
            life: 30, // 30 frames
            originalOpacity: particle.material.opacity
        };
        
        scene.add(particle);
        particles.push(particle);
    }
}

function createDepositParticles(position) {
// ... código createDepositParticles existente ...
    const particleGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const particleMaterial = new THREE.MeshBasicMaterial({ color: 0x00FF00, transparent: true, opacity: 1 });
    
    for (let i = 0; i < 15; i++) {
        const particle = new THREE.Mesh(particleGeometry, particleMaterial.clone());
        particle.position.copy(position);
        particle.position.y = 3.5; // Altura da tela da máquina
        
        particle.userData = {
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.05,
                Math.random() * 0.05 + 0.01,
                (Math.random() - 0.5) * 0.05
            ),
            life: 60,
            originalOpacity: particle.material.opacity
        };
        
        scene.add(particle);
        particles.push(particle);
    }
    
    // Efeito de luz na máquina
    machine.children.forEach(child => {
        if (child.userData.isLight) {
            child.material.emissive.setHex(0xFFFFFF);
            setTimeout(() => {
                child.material.emissive.copy(child.userData.originalEmissive);
            }, 300);
        }
    });
}

function updateParticles() {
// ... código updateParticles existente ...
    particles.forEach((particle, index) => {
        particle.position.add(particle.userData.velocity);
        particle.userData.velocity.y -= 0.005; // Gravidade nas partículas

        particle.userData.life--;
        particle.material.opacity = particle.userData.originalOpacity * (particle.userData.life / 30); // Diminui opacidade

        if (particle.userData.life <= 0) {
            scene.remove(particle);
            particles.splice(index, 1);
        }
    });
}

function checkLevelUp() {
// ... código checkLevelUp existente ...
    if (playerLevel < levelRequirements.length && experience >= levelRequirements[playerLevel]) {
        playerLevel++;
        maxCarryCapacity += 3; // Aumenta a capacidade de carga
        playerSpeed += 0.005; // Aumenta a velocidade
        collectionRange += 0.05; // Aumenta o raio de coleta

        // Efeito visual de level up (máquina explode em partículas?)
        createDepositParticles(machine.position); // Reutiliza partículas
        
        // Alerta na UI
        const alert = document.getElementById('levelAlert');
        if (alert) {
            alert.textContent = `LEVEL UP! Você é agora Level ${playerLevel}!`;
            alert.classList.add('show');
            setTimeout(() => { alert.classList.remove('show'); }, 3000);
        }
    }
}

// --- NOVO: LÓGICA DE ZUMBIS (SIMPLES) ---

function createZombie() {
// ... código createZombie existente ...
    const zombieGroup = new THREE.Group();
    
    const skinMaterial = new THREE.MeshLambertMaterial({ color: 0x38761D }); // Pele verde
    const shirtMaterial = new THREE.MeshLambertMaterial({ color: 0xAA0000 }); // Camisa rasgada
    const pantsMaterial = new THREE.MeshLambertMaterial({ color: 0x1C4587 }); // Calça azul
    const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
    
    // Cabeça
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), skinMaterial);
    head.position.set(0, 1.7, 0);
    head.castShadow = true;
    zombieGroup.add(head);

    // Olhos
    const eyeGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.02);
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.15, 1.71, 0.36);
    zombieGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.15, 1.71, 0.36);
    zombieGroup.add(rightEye);
    
    // Corpo
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.3, 0.4), shirtMaterial);
    body.position.set(0, 0.8, 0);
    body.castShadow = true;
    zombieGroup.add(body);

    // Braços (simples)
    const armGeometry = new THREE.BoxGeometry(0.2, 1.0, 0.2);
    const leftArm = new THREE.Mesh(armGeometry, skinMaterial);
    leftArm.position.set(-0.55, 1.5, 0);
    leftArm.castShadow = true;
    zombieGroup.add(leftArm);

    const rightArm = new THREE.Mesh(armGeometry, skinMaterial);
    rightArm.position.set(0.55, 1.5, 0);
    rightArm.castShadow = true;
    zombieGroup.add(rightArm);

    // Pernas (simples)
    const legGeometry = new THREE.BoxGeometry(0.3, 1.2, 0.3);
    const leftLeg = new THREE.Mesh(legGeometry, pantsMaterial);
    leftLeg.position.set(-0.25, 0.2, 0);
    zombieGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeometry, pantsMaterial);
    rightLeg.position.set(0.25, 0.2, 0);
    zombieGroup.add(rightLeg);
    
    zombieGroup.position.y = 0.55; // Ajuste para ficar no chão
    zombieGroup.userData.health = 100; // Vida do zumbi
    zombieGroup.userData.isZombie = true;
    zombieGroup.userData.armTimer = Math.random() * Math.PI * 2; // Para oscilação dos braços
    
    return zombieGroup;
}

function spawnZombies() {
// ... código spawnZombies existente ...
    // Garante que haja um zumbi em cada posição pré-definida
    ZOMBIE_SPAWN_POSITIONS.forEach((pos, index) => {
        if (!zombies[index]) {
            const zombie = createZombie();
            zombie.position.set(pos.x, 0, pos.z);
            scene.add(zombie);
            zombies[index] = zombie;
        }
    });
}

function updateZombies() {
// ... código updateZombies existente ...
    zombies.forEach((zombie, index) => {
        if (!zombie.userData.isZombie) return;
        
        // Distância do player
        const distanceToPlayer = player.position.distanceTo(zombie.position);
        
        // Comportamento AGGRO (Perseguição)
        if (distanceToPlayer < ZOMBIE_AGGRO_RANGE) {
            // Calcular direção para o player (apenas no plano XZ)
            const targetPosition = player.position.clone();
            targetPosition.y = zombie.position.y; // Manter no mesmo plano
            
            const direction = targetPosition.sub(zombie.position).normalize();
            
            // Movimento
            zombie.position.x += direction.x * ZOMBIE_SPEED;
            zombie.position.z += direction.z * ZOMBIE_SPEED;
            
            // Rotação (virar para o player)
            const targetRotation = Math.atan2(direction.x, direction.z);
            zombie.rotation.y += (targetRotation - zombie.rotation.y) * 0.1;
            
            // Animação de braço (zumbi)
            zombie.userData.armTimer += 0.1;
            const swing = Math.sin(zombie.userData.armTimer) * 0.2;
            
            const leftArm = zombie.children.find(c => c.position.x < 0 && c.geometry.type === 'BoxGeometry' && c.geometry.parameters.height === 1.0);
            const rightArm = zombie.children.find(c => c.position.x > 0 && c.geometry.type === 'BoxGeometry' && c.geometry.parameters.height === 1.0);
            
            if (leftArm && rightArm) {
                leftArm.rotation.x = swing;
                rightArm.rotation.x = -swing;
            }
            
            // Comportamento ATTACK (Próximo o suficiente)
            if (distanceToPlayer < ZOMBIE_ATTACK_RANGE) {
                // Lógica de ataque: causar dano, etc. (Apenas placeholder)
                // console.log("Zumbi atacando!");
            }
        }
    });
}

// --- FIM DA LÓGICA DE ZUMBIS ---

function onWindowResize() {
// ... código onWindowResize existente ...
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Atualiza a posição da UI mobile
    updateUILayout();
}

function updateUI() {
// ... código updateUI existente ...
    // Atualiza o display de moedas
    const coinsCarriedEl = document.getElementById('coinsCarried');
    const coinsStoredEl = document.getElementById('coinsStored');
    if (coinsCarriedEl) coinsCarriedEl.textContent = `Moedas: ${coinsCarried}/${maxCarryCapacity}`;
    if (coinsStoredEl) coinsStoredEl.textContent = `Guardadas: ${coinsStored}`;
    
    // Atualiza o nível
    const playerLevelEl = document.getElementById('level');
    if (playerLevelEl) playerLevelEl.textContent = `Nível ${playerLevel}`;
    
    // Atualiza a barra de experiência
    const expBar = document.getElementById('experienceFill'); // Corrigido de expBar para experienceFill (baseado no HTML)
    const nextLevelInfoEl = document.getElementById('nextLevelInfo');
    
    if (expBar && nextLevelInfoEl) {
        const currentLevelExp = levelRequirements[playerLevel - 1];
        const nextLevelExp = levelRequirements[playerLevel] || currentLevelExp + 100;
        const expNeeded = nextLevelExp - currentLevelExp;
        const expProgress = experience - currentLevelExp;
        const progressPercent = (expProgress / expNeeded) * 100;

        expBar.style.width = `${progressPercent}%`;
        nextLevelInfoEl.textContent = `Próximo nível: ${expNeeded - expProgress} moedas`;
    }

    // Atualiza a dica da máquina
    const machineDistance = machine.position.distanceTo(player.position);
    nearMachine = machineDistance < machine.userData.interactionRadius;
    const hint = document.getElementById('machinePrompt');
    
    if (hint) {
        if (nearMachine && coinsCarried > 0) {
            // MUDANÇA NA DICA AQUI: Agora usa a tecla 'E' para depositar.
            hint.textContent = 'Pressione [E] ou botão [guarde] para Depositar Moedas';
            hint.style.display = 'block';
        } else if (nearMachine && coinsCarried === 0) {
            hint.textContent = 'Deposite Moedas para Evoluir';
            hint.style.display = 'block';
        } else {
            hint.style.display = 'none';
        }
    }

    // Atualiza o cooldown do Dash
    const dashStatusEl = document.getElementById('dashStatus');
    const dashButton = document.getElementById('dashButton');
    
    if (dashStatusEl && dashButton) {
        if (dashCooldown > 0) {
            const remainingTime = Math.ceil(dashCooldown / 1000);
            dashStatusEl.textContent = `Dash: ${remainingTime}s`;
            dashButton.textContent = `${remainingTime}s`;
            dashButton.classList.add('cooldown');
        } else {
            dashStatusEl.textContent = 'Dash: Pronto';
            dashButton.textContent = 'Dash';
            dashButton.classList.remove('cooldown');
        }
    }
}

function updateUILayout() {
// ... código updateUILayout existente ...
    // Lógica para posicionamento da UI mobile
    // Por exemplo, garante que o joystick está sempre no canto
}


function startDash() {
// ... código startDash existente ...
    if (isDashing || dashCooldown > 0) return;

    isDashing = true;
    
    // Aplica um impulso instantâneo no vetor de velocidade
    const dashMultiplier = 2; // Impulso inicial
    playerVelocity.x *= dashMultiplier;
    playerVelocity.z *= dashMultiplier;
    
    // Animação de dash visual (opcional)
    
    // Define o fim do dash
    setTimeout(() => {
        isDashing = false;
        dashCooldown = DASH_COOLDOWN_TIME;
    }, DASH_DURATION);
}


function animate() {
    requestAnimationFrame(animate);

    if (gameRunning) {
        // Lógica de atualização do jogo principal
        updatePlayer();
        updateCoins();
        updateZombies();
        updateSandParticles(); // MUDANÇA: Atualiza partículas de areia
        updateParticles(); 

        // NOVO: Animação do Moinho de Vento
        if (windmillBlades) {
            windmillRotation += 0.04; // Velocidade de rotação
            windmillBlades.rotation.z = windmillRotation;
        }

        // Câmera segue o jogador
        if (controls) { // Verifica se controls foi inicializado
            controls.target.copy(player.position);
            controls.update();
        }

        // Diminuir cooldown do dash
        if (dashCooldown > 0) {
            dashCooldown -= (1000 / 60); // Assumindo 60 FPS (16.66ms)
        }
    }

    if (renderer && scene && camera) { // Verificação de segurança
        renderer.render(scene, camera);
    }
    updateUI();
}

    // --- NOVO: LÓGICA DO MENU E MODAIS ---
    
    // Obter referências para todos os elementos do menu e modais
    const menuButton = document.getElementById('menuButton');
    const mainMenuModal = document.getElementById('mainMenuModal');
    const btnFecharMenu = document.getElementById('btnFecharMenu');

    const btnAbrirConfig = document.getElementById('btnAbrirConfig');
    const configuracoesModal = document.getElementById('configuracoesModal');
    const btnFecharConfig = document.getElementById('btnFecharConfig');

    const btnAbrirSair = document.getElementById('btnAbrirSair');
    const confirmarSaidaModal = document.getElementById('confirmarSaidaModal');
    const btnConfirmarSaida = document.getElementById('btnConfirmarSaida');
    const btnCancelarSaida = document.getElementById('btnCancelarSaida');
    
    // ----------------------------------------------------------------------
    // Função para Pausar/Despausar o Jogo
    // ----------------------------------------------------------------------
    // Assumindo que 'gameRunning' é uma variável global que controla o loop do jogo
    function toggleGamePause(isPaused) {
        // Se a variável 'gameRunning' existir, use-a para pausar/despausar
        if (typeof gameRunning !== 'undefined') {
            gameRunning = !isPaused;
            console.log(isPaused ? "Jogo Pausado." : "Jogo Despausado.");
        }
        // Se você usa o requestAnimationFrame, o próprio motor do jogo deve checar 'gameRunning'
    }

    // ----------------------------------------------------------------------
    // 1. Abrir/Fechar o Menu Principal
    // ----------------------------------------------------------------------
    // É necessário verificar se os elementos foram encontrados antes de adicionar o listener
    if (menuButton && mainMenuModal) {
        menuButton.addEventListener('click', () => {
            mainMenuModal.style.display = 'block';
            toggleGamePause(true); // Pausa o jogo
        });
    }

    if (btnFecharMenu && mainMenuModal) {
        btnFecharMenu.addEventListener('click', () => {
            mainMenuModal.style.display = 'none';
            toggleGamePause(false); // Despausa o jogo
        });
    }

    // ----------------------------------------------------------------------
    // 2. Abrir/Fechar Configurações
    // ----------------------------------------------------------------------
    if (btnAbrirConfig && mainMenuModal && configuracoesModal) {
        btnAbrirConfig.addEventListener('click', () => {
            mainMenuModal.style.display = 'none'; // Esconde o menu principal
            configuracoesModal.style.display = 'block';
        });
    }

    if (btnFecharConfig && configuracoesModal && mainMenuModal) {
        btnFecharConfig.addEventListener('click', () => {
            configuracoesModal.style.display = 'none';
            mainMenuModal.style.display = 'block'; // Volta para o menu principal
        });
    }

    // ----------------------------------------------------------------------
    // 3. Lógica de Sair
    // ----------------------------------------------------------------------
    if (btnAbrirSair && mainMenuModal && confirmarSaidaModal) {
        btnAbrirSair.addEventListener('click', () => {
            mainMenuModal.style.display = 'none'; // Esconde o menu principal
            confirmarSaidaModal.style.display = 'block';
        });
    }
    
    if (btnCancelarSaida && confirmarSaidaModal && mainMenuModal) {
        btnCancelarSaida.addEventListener('click', () => {
            confirmarSaidaModal.style.display = 'none';
            mainMenuModal.style.display = 'block'; // Volta para o menu principal
        });
    }
    
    if (btnConfirmarSaida) {
        btnConfirmarSaida.addEventListener('click', () => {
            // AÇÃO REAL DE SAÍDA:
            console.log("Saindo do jogo! Redirecionando...");
            // Implemente sua lógica final (salvar, fechar recursos, etc.)
            
            // Exemplo: Redirecionar para a tela inicial
            // window.location.href = 'index.html'; 
        });
    }
    
    // ----------------------------------------------------------------------
    // 4. Fechar Modais com a tecla ESC
    // ----------------------------------------------------------------------
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            if (confirmarSaidaModal && confirmarSaidaModal.style.display === 'block') {
                btnCancelarSaida.click(); // Cancela a saída
            } else if (configuracoesModal && configuracoesModal.style.display === 'block') {
                btnFecharConfig.click(); // Fecha configurações
            } else if (mainMenuModal && mainMenuModal.style.display === 'block') {
                btnFecharMenu.click(); // Fecha o menu principal
            }
        }
    });

// Inicialize o jogo diretamente para pular o prompt de tela cheia.
init();
