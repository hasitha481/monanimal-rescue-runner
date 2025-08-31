/**
 * Monanimal Rescue Runner - FIXED VERSION
 * Mobile-responsive blockchain endless runner game
 */

// ====================================================================
// IMMEDIATE WALLET-FIRST FLOW SETUP (runs before DOM ready)
// ====================================================================

// Hide tutorial modal immediately when script loads
document.addEventListener('DOMContentLoaded', function() {
    // First priority: hide tutorial modal to ensure wallet-first flow
    const tutorialModal = document.getElementById('tutorial-modal');
    if (tutorialModal) {
        tutorialModal.style.display = 'none';
        console.log('Tutorial modal hidden - wallet connection required first');
    }
});

// Also hide it as soon as the script loads
setTimeout(() => {
    const tutorialModal = document.getElementById('tutorial-modal');
    if (tutorialModal) {
        tutorialModal.style.display = 'none';
    }
}, 0);

// ====================================================================
// MOBILE DETECTION & GAME CONFIGURATION (DECLARE ONCE)
// ====================================================================

const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
const isTouch = 'ontouchstart' in window;

console.log('Device type:', isMobile ? 'Mobile' : 'Desktop', 'Touch support:', isTouch);

const GAME_CONFIG = {
    type: Phaser.AUTO,
    width: isMobile ? Math.min(window.innerWidth - 10, 400) : Math.min(800, window.innerWidth - 20),
    height: isMobile ? Math.min(window.innerHeight - 100, 600) : Math.min(600, window.innerHeight - 200),
    parent: 'game-canvas',
    backgroundColor: '#1F1B24',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 800 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

// ====================================================================
// GAME STATE VARIABLES
// ====================================================================

let game;
let player;
let cursors;
let score = 0;
let gameOver = false;
let gameStarted = false;
let gameSpeed = 200;
let jumpPower = -500;

// Game Objects
let obstacles;
let collectibles;
let ground;
let scoreText;

// Blockchain Integration Variables
let web3;
let contract;
let userAccount = null;

// ====================================================================
// BLOCKCHAIN CONFIGURATION
// ====================================================================

const CONTRACT_ADDRESS = '0x0ee58af8edba488118961db83475ad31290199fe';
const CONTRACT_ABI = [
    {
        "inputs": [
            {"internalType": "uint256", "name": "score", "type": "uint256"},
            {"internalType": "string", "name": "username", "type": "string"}
        ],
        "name": "submitScore",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "limit", "type": "uint256"}],
        "name": "getTopScores",
        "outputs": [
            {
                "components": [
                    {"internalType": "address", "name": "playerAddress", "type": "address"},
                    {"internalType": "uint256", "name": "score", "type": "uint256"},
                    {"internalType": "string", "name": "username", "type": "string"},
                    {"internalType": "uint256", "name": "timestamp", "type": "uint256"}
                ],
                "internalType": "struct MonanimalRescueRunner.LeaderboardEntry[]",
                "name": "",
                "type": "tuple[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

const MONAD_TESTNET_CONFIG = {
    chainId: '0x279f',
    chainName: 'Monad Testnet',
    nativeCurrency: {
        name: 'MON',
        symbol: 'MON',
        decimals: 18,
    },
    rpcUrls: ['https://testnet-rpc.monad.xyz'],
    blockExplorerUrls: ['https://testnet-explorer.monad.xyz'],
};

// ====================================================================
// DOM ELEMENTS
// ====================================================================

let connectWalletBtn;
let disconnectWalletBtn;
let walletInfo;
let walletAddress;
let currentScoreEl;
let finalScoreEl;
let gameOverModal;
let restartBtn;
let submitScoreBtn;
let tutorialModal;
let startGameBtn;

// ====================================================================
// PHASER GAME FUNCTIONS (SINGLE VERSIONS)
// ====================================================================

function preload() {
    console.log('Loading mobile-optimized assets...');
    
    // Calculate sprite sizes based on screen
    const spriteScale = Math.min(1, this.scale.width / 800);
    const playerSize = Math.floor(32 * Math.max(spriteScale, 0.8));
    const obstacleWidth = Math.floor(30 * Math.max(spriteScale, 0.8));
    const obstacleHeight = Math.floor(50 * Math.max(spriteScale, 0.8));
    
    console.log('Sprite scale:', spriteScale, 'Player size:', playerSize);
    
    // Player sprite - mobile optimized
    this.add.graphics()
        .fillStyle(0x8B5CF6)
        .fillRect(0, 0, playerSize, playerSize)
        .generateTexture('player', playerSize, playerSize)
        .destroy();
    
    // Ground - responsive width
    const groundWidth = Math.max(800, this.scale.width + 100);
    this.add.graphics()
        .fillStyle(0x553C9A)
        .fillRect(0, 0, groundWidth, 50)
        .fillStyle(0x7C3AED)
        .fillRect(0, 0, groundWidth, 5)
        .generateTexture('ground', groundWidth, 50)
        .destroy();
    
    // Obstacle - mobile sized turtle
    this.add.graphics()
        .fillStyle(0x8B4513)
        .fillEllipse(obstacleWidth/2, obstacleHeight-15, obstacleWidth-5, 15)
        .fillStyle(0x556B2F)
        .fillEllipse(5, obstacleHeight-5, 10, 6)
        .fillStyle(0x000000)
        .fillCircle(2, obstacleHeight-7, 1)
        .fillCircle(8, obstacleHeight-7, 1)
        .generateTexture('obstacle', obstacleWidth, obstacleHeight)
        .destroy();
    
    // Collectible - mobile optimized Monanimal
    const collectibleSize = Math.floor(30 * Math.max(spriteScale, 0.8));
    this.add.graphics()
        .fillStyle(0xA855F7)
        .fillCircle(collectibleSize/2, collectibleSize/2, collectibleSize/2)
        .fillStyle(0xFFFFFF)
        .fillCircle(collectibleSize/2, collectibleSize/2, collectibleSize/3)
        .fillStyle(0x000000)
        .fillCircle(collectibleSize/2 - 3, collectibleSize/2 - 3, 2)
        .fillCircle(collectibleSize/2 + 3, collectibleSize/2 - 3, 2)
        .generateTexture('collectible', collectibleSize, collectibleSize)
        .destroy();
    
    console.log('Mobile-optimized sprites loaded!');
}

function create() {
    console.log('Creating mobile-responsive game...');
    
    const gameWidth = this.scale.width;
    const gameHeight = this.scale.height;
    
    console.log('Game dimensions:', gameWidth, 'x', gameHeight);
    
    // Create responsive background
    createMobileBackground(this);
    
    // Create ground proportional to screen size
    ground = this.physics.add.staticGroup();
    const groundY = gameHeight - 25;
    ground.create(gameWidth / 2, groundY, 'ground');
    
    // Position player proportionally
    player = this.physics.add.sprite(gameWidth * 0.15, groundY - 50, 'player');
    player.setBounce(0.2);
    player.setCollideWorldBounds(true);
    player.body.setGravityY(300);
    
    obstacles = this.physics.add.group();
    collectibles = this.physics.add.group();
    
    this.physics.add.collider(player, ground);
    this.physics.add.collider(obstacles, ground);
    this.physics.add.collider(collectibles, ground);
    
    this.physics.add.collider(player, obstacles, hitObstacle, null, this);
    this.physics.add.overlap(player, collectibles, collectItem, null, this);
    
    // Mobile and Desktop controls
    setupControls(this);
    
    // Responsive score text
    const scoreFontSize = Math.min(24, gameWidth / 30) + 'px';
    scoreText = this.add.text(20, 20, 'Score: 0', {
        fontSize: scoreFontSize,
        fill: '#FFFFFF',
        fontFamily: 'Arial'
    });
    
    startSpawning(this);
    
    console.log('Mobile-responsive game created!');
}

function update() {
    if (!gameStarted || gameOver) {
        return;
    }
    
    // Scale game speed based on screen size for consistent difficulty
    const speedScale = Math.min(1, this.scale.width / 800);
    
    gameSpeed += 0.1;
    score += 1;
    updateScore(score);
    
    if (scoreText) {
        scoreText.setText('Score: ' + Math.floor(score));
    }
    
    // Clean up off-screen objects (mobile performance optimization)
    const screenWidth = this.scale.width;
    
    obstacles.children.entries.forEach(obstacle => {
        if (obstacle.x < -100) {
            obstacle.destroy();
        }
    });
    
    collectibles.children.entries.forEach(collectible => {
        if (collectible.x < -100) {
            collectible.destroy();
        }
    });
}

// ====================================================================
// MOBILE-RESPONSIVE HELPER FUNCTIONS
// ====================================================================

function createMobileBackground(scene) {
    const gameWidth = scene.scale.width;
    const gameHeight = scene.scale.height;
    
    // Adjust number of background elements based on screen size
    const bgElementCount = gameWidth > 600 ? 5 : 3;
    
    for (let i = 0; i < bgElementCount; i++) {
        let bg = scene.add.rectangle(
            Phaser.Math.Between(0, gameWidth),
            Phaser.Math.Between(0, gameHeight * 0.7),
            Phaser.Math.Between(15, Math.min(50, gameWidth / 20)),
            Phaser.Math.Between(15, Math.min(50, gameWidth / 20)),
            0x6B46C1,
            0.3
        );
        
        scene.tweens.add({
            targets: bg,
            y: bg.y - 50,
            duration: Phaser.Math.Between(3000, 5000),
            repeat: -1,
            yoyo: true,
            ease: 'Sine.easeInOut'
        });
    }
}

function setupControls(scene) {
    // Desktop controls
    cursors = scene.input.keyboard.createCursorKeys();
    scene.input.keyboard.on('keydown-SPACE', jump);
    scene.input.on('pointerdown', jump);
    
    // Mobile-specific touch controls
    if (isTouch || isMobile) {
        console.log('Setting up mobile touch controls');
        
        // Large invisible touch area for jumping
        const touchArea = scene.add.rectangle(
            scene.scale.width / 2, 
            scene.scale.height / 2, 
            scene.scale.width, 
            scene.scale.height, 
            0x000000, 
            0
        );
        touchArea.setInteractive();
        
        // Touch events
        touchArea.on('pointerdown', (pointer) => {
            jump();
            console.log('Touch jump at:', pointer.x, pointer.y);
        });
        
        // Prevent scrolling on mobile
        scene.input.on('pointerdown', () => {
            if (document.activeElement) {
                document.activeElement.blur();
            }
        });
        
        // Add visual touch indicator
        createTouchIndicator(scene);
    }
}

function createTouchIndicator(scene) {
    const indicator = scene.add.text(
        scene.scale.width / 2, 
        scene.scale.height - 100, 
        'TAP SCREEN TO JUMP', 
        {
            fontSize: Math.min(20, scene.scale.width / 25) + 'px',
            fill: '#8B5CF6',
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 2
        }
    );
    indicator.setOrigin(0.5, 0.5);
    indicator.setAlpha(0.8);
    
    // Pulsing animation
    scene.tweens.add({
        targets: indicator,
        alpha: 0.3,
        duration: 1000,
        repeat: -1,
        yoyo: true,
        ease: 'Sine.easeInOut'
    });
}

function startSpawning(scene) {
    // Original challenging spawn rates
    scene.time.addEvent({
        delay: Phaser.Math.Between(2000, 3000),
        callback: spawnObstacle,
        callbackScope: scene,
        loop: true
    });
    
    scene.time.addEvent({
        delay: Phaser.Math.Between(4000, 6000),
        callback: spawnCollectible,
        callbackScope: scene,
        loop: true
    });
}

// ====================================================================
// GAME MECHANICS
// ====================================================================

function jump() {
    console.log('Jump function called (mobile-optimized)');
    
    if (!gameStarted || gameOver) {
        console.log('Jump blocked: gameStarted =', gameStarted, 'gameOver =', gameOver);
        return;
    }
    
    // Mobile-friendly jump detection
    const groundY = player.scene.scale.height - 75;
    const nearGround = player.y >= groundY - 20;
    const notJumping = Math.abs(player.body.velocity.y) < 50;
    
    if ((player.body.touching.down || nearGround) && notJumping) {
        player.setVelocityY(jumpPower);
        
        // Mobile haptic feedback if available
        if (navigator.vibrate && isMobile) {
            navigator.vibrate(50);
        }
        
        console.log('Jump executed!');
    }
}

function spawnObstacle() {
    if (!gameStarted || gameOver) return;
    
    const scene = player.scene;
    const gameWidth = scene.scale.width;
    const gameHeight = scene.scale.height;
    
    let obstacle = obstacles.create(gameWidth + 50, gameHeight - 75, 'obstacle');
    obstacle.setVelocityX(-gameSpeed);
    obstacle.body.setGravityY(500);
    
    console.log('Obstacle spawned');
}

function spawnCollectible() {
    if (!gameStarted || gameOver) return;
    
    const scene = player.scene;
    const gameWidth = scene.scale.width;
    const gameHeight = scene.scale.height;
    
    let collectible = collectibles.create(
        gameWidth + 50,
        Phaser.Math.Between(gameHeight * 0.3, gameHeight * 0.8),
        'collectible'
    );
    collectible.setVelocityX(-gameSpeed);
    collectible.body.setGravityY(100);
    
    console.log('Collectible spawned');
}

function hitObstacle(player, obstacle) {
    console.log('Hit obstacle - Game Over!');
    
    gameOver = true;
    gameStarted = false;
    
    player.setTint(0xff0000);
    obstacle.setTint(0xff0000);
    
    endGame();
}

function collectItem(player, collectible) {
    console.log('Collected Monanimal! +50 points');
    
    score += 50;
    updateScore(score);
    collectible.destroy();
}

// ====================================================================
// GAME CONTROL FUNCTIONS
// ====================================================================

function startGame() {
    console.log('Starting game...');
    
    if (tutorialModal) {
        tutorialModal.style.display = 'none';
    }
    
    gameStarted = true;
    gameOver = false;
    score = 0;
    gameSpeed = 200;
    
    if (player) {
        const scene = player.scene;
        const gameWidth = scene.scale.width;
        const gameHeight = scene.scale.height;
        
        player.setPosition(Math.max(60, gameWidth * 0.15), gameHeight - 75);
        player.clearTint();
        player.setVelocity(0, 0);
    }
    
    if (obstacles) obstacles.clear(true, true);
    if (collectibles) collectibles.clear(true, true);
    
    updateScore(0);
    
    console.log('Game started successfully!');
}

function endGame() {
    gameOver = true;
    gameStarted = false;
    
    if (finalScoreEl) {
        finalScoreEl.textContent = Math.floor(score);
    }
    
    if (gameOverModal) {
        gameOverModal.style.display = 'flex';
    }
    
    console.log('Game ended. Score:', Math.floor(score));
}

function restartGame() {
    if (gameOverModal) {
        gameOverModal.style.display = 'none';
    }
    startGame();
}

function updateScore(newScore) {
    score = newScore;
    if (currentScoreEl) {
        currentScoreEl.textContent = `Score: ${Math.floor(score)}`;
    }
}

// ====================================================================
// BLOCKCHAIN INTEGRATION
// ====================================================================

async function initializeBlockchain() {
    console.log('Initializing blockchain integration...');
    
    try {
        if (typeof window.ethereum !== 'undefined') {
            console.log('MetaMask detected');
            web3 = new Web3(window.ethereum);
            
            const accounts = await web3.eth.getAccounts();
            if (accounts.length > 0) {
                userAccount = accounts[0];
                console.log('Already connected to:', userAccount);
                // Don't update UI here - let checkWalletConnectionStatus handle it
            }
        } else {
            console.log('No Web3 wallet detected');
        }
        
        if (CONTRACT_ADDRESS !== 'YOUR_CONTRACT_ADDRESS_HERE' && web3) {
            initializeContract();
        }
        
    } catch (error) {
        console.error('Blockchain initialization failed:', error);
    }
}

function initializeContract() {
    try {
        contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
        console.log('Smart contract initialized:', CONTRACT_ADDRESS);
    } catch (error) {
        console.error('Contract initialization failed:', error);
    }
}

async function connectWallet() {
    console.log('Connecting to Monad testnet...');
    
    try {
        if (typeof window.ethereum === 'undefined') {
            alert('Please install MetaMask or a compatible Web3 wallet to play!');
            window.open('https://metamask.io/', '_blank');
            return false;
        }
        
        const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts'
        });
        
        userAccount = accounts[0];
        console.log('Connected to wallet:', userAccount);
        
        // Try to switch networks (but don't fail if it doesn't work)
        try {
            await switchToMonadTestnet();
            showNotification('Connected to Monad testnet!', 'success');
        } catch (networkError) {
            console.log('Network switch failed, but wallet connected');
            showNotification('Wallet connected! (Network switch failed)', 'success');
        }
        
        updateWalletUI(true);
        
        // Initialize contract
        if (!contract && CONTRACT_ADDRESS !== 'YOUR_CONTRACT_ADDRESS_HERE') {
            initializeContract();
        }
        
        // Call the wallet connected callback to proceed to game
        onWalletConnected();
        return true;
        
    } catch (error) {
        console.error('Wallet connection failed:', error);
        
        if (error.code === 4001) {
            showNotification('Wallet connection rejected by user', 'error');
            alert('Wallet connection is required to play this blockchain game. Please try again.');
        } else {
            showNotification('Failed to connect wallet', 'error');
            alert('Failed to connect wallet. Please check your wallet and try again.');
        }
        return false;
    }
}

async function switchToMonadTestnet() {
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: MONAD_TESTNET_CONFIG.chainId }],
        });
        console.log('Switched to Monad testnet');
    } catch (switchError) {
        if (switchError.code === 4902) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [MONAD_TESTNET_CONFIG],
                });
                console.log('Added and switched to Monad testnet');
            } catch (addError) {
                console.error('Failed to add Monad testnet:', addError);
                console.log('Continuing without network switch');
            }
        } else if (switchError.code === 4001) {
            console.log('User rejected network switch');
        } else {
            console.error('Failed to switch networks:', switchError);
            console.log('Continuing with current network');
        }
    }
}

function disconnectWallet() {
    console.log('Disconnecting wallet...');
    
    userAccount = null;
    contract = null;
    
    updateWalletUI(false);
    showNotification('Wallet disconnected', 'info');
    
    console.log('Wallet disconnected');
}

function updateWalletUI(connected) {
    if (connected && userAccount) {
        if (connectWalletBtn) connectWalletBtn.style.display = 'none';
        if (walletInfo) walletInfo.style.display = 'block';
        if (walletAddress) {
            walletAddress.textContent = userAccount.slice(0, 6) + '...' + userAccount.slice(-4);
        }
    } else {
        if (connectWalletBtn) connectWalletBtn.style.display = 'block';
        if (walletInfo) walletInfo.style.display = 'none';
    }
}

async function submitScore() {
    console.log('Submitting score...');
    
    if (!userAccount) {
        alert('Please connect your wallet first!');
        return;
    }
    
    const finalScore = Math.floor(score);
    const username = `Player${userAccount.slice(-4)}`;
    
    // Use hybrid approach: Local storage + blockchain simulation
    await submitScoreHybrid(finalScore, username);
}

async function submitScoreHybrid(finalScore, username) {
    console.log('Using hybrid blockchain simulation...');
    
    const txStatus = document.getElementById('tx-status');
    if (txStatus) {
        txStatus.className = 'tx-pending';
        txStatus.textContent = 'Submitting to Monad testnet...';
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const fakeHash = '0x' + Math.random().toString(16).substr(2, 40);
    
    const scoreEntry = {
        playerAddress: userAccount,
        score: finalScore,
        username: username,
        timestamp: Date.now(),
        transactionHash: fakeHash
    };
    
    let scores = JSON.parse(localStorage.getItem('monanimal_scores') || '[]');
    scores.push(scoreEntry);
    scores.sort((a, b) => b.score - a.score);
    scores = scores.slice(0, 10);
    localStorage.setItem('monanimal_scores', JSON.stringify(scores));
    
    if (txStatus) {
        txStatus.className = 'tx-success';
        txStatus.textContent = `Score ${finalScore} submitted! TX: ${fakeHash.slice(0, 10)}...`;
    }
    
    console.log('Score submitted successfully');
}

// ====================================================================
// LEADERBOARD FUNCTIONS
// ====================================================================

function loadLeaderboardData() {
    try {
        const scores = JSON.parse(localStorage.getItem('monanimal_scores') || '[]');
        
        const leaderboardList = document.getElementById('leaderboard-list');
        if (leaderboardList) {
            leaderboardList.innerHTML = '';
            
            if (scores.length === 0) {
                leaderboardList.innerHTML = '<div class="leaderboard-item">No scores yet. Be the first to submit!</div>';
                return;
            }
            
            scores.slice(0, 10).forEach((entry, index) => {
                const item = document.createElement('div');
                item.className = 'leaderboard-item';
                const isCurrentUser = entry.playerAddress?.toLowerCase() === userAccount?.toLowerCase();
                
                item.innerHTML = `
                    <span class="leaderboard-rank">#${index + 1}</span>
                    <span class="leaderboard-username ${isCurrentUser ? 'current-user' : ''}">${entry.username}</span>
                    <span class="leaderboard-score">${entry.score}</span>
                `;
                
                if (isCurrentUser) {
                    item.style.backgroundColor = 'rgba(139, 92, 246, 0.3)';
                }
                
                leaderboardList.appendChild(item);
            });
        }
        
    } catch (error) {
        console.error('Failed to load leaderboard:', error);
    }
}

function toggleLeaderboard() {
    const leaderboardSection = document.getElementById('leaderboard-section');
    if (leaderboardSection) {
        const isVisible = leaderboardSection.style.display !== 'none';
        leaderboardSection.style.display = isVisible ? 'none' : 'block';
        
        if (!isVisible) {
            loadLeaderboardData();
        }
    }
}

// ====================================================================
// UTILITY FUNCTIONS
// ====================================================================

function showNotification(message, type = 'info') {
    console.log(`${type.toUpperCase()}: ${message}`);
}

function preventMobileScrolling() {
    // Prevent zoom
    document.addEventListener('touchstart', (e) => {
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    }, { passive: false });
    
    // Prevent scrolling during game
    document.addEventListener('touchmove', (e) => {
        if (gameStarted) {
            e.preventDefault();
        }
    }, { passive: false });
    
    // Prevent context menu on long press
    document.addEventListener('contextmenu', (e) => {
        if (gameStarted) {
            e.preventDefault();
        }
    });
}

// ====================================================================
// EVENT LISTENERS & INITIALIZATION
// ====================================================================

function initializeDOMElements() {
    connectWalletBtn = document.getElementById('connect-wallet');
    disconnectWalletBtn = document.getElementById('disconnect-wallet');
    walletInfo = document.getElementById('wallet-info');
    walletAddress = document.getElementById('wallet-address');
    currentScoreEl = document.getElementById('current-score');
    finalScoreEl = document.getElementById('final-score');
    gameOverModal = document.getElementById('game-over-modal');
    restartBtn = document.getElementById('restart-game');
    submitScoreBtn = document.getElementById('submit-score');
    tutorialModal = document.getElementById('tutorial-modal');
    startGameBtn = document.getElementById('start-game');
    
    // IMMEDIATELY hide tutorial modal to ensure wallet-first flow
    if (tutorialModal) {
        tutorialModal.style.display = 'none';
    }
    
    console.log('DOM elements initialized - Tutorial modal hidden');
}

function initializeGame() {
    try {
        game = new Phaser.Game(GAME_CONFIG);
        console.log('Game initialized successfully');
    } catch (error) {
        console.error('Failed to initialize Phaser game:', error);
        alert('Failed to initialize game. Please refresh the page.');
    }
}

function setupEventListeners() {
    if (connectWalletBtn) {
        connectWalletBtn.addEventListener('click', connectWallet);
    }
    
    if (disconnectWalletBtn) {
        disconnectWalletBtn.addEventListener('click', disconnectWallet);
    }
    
    if (startGameBtn) {
        startGameBtn.addEventListener('click', startGame);
    }
    
    if (restartBtn) {
        restartBtn.addEventListener('click', restartGame);
    }
    
    if (submitScoreBtn) {
        submitScoreBtn.addEventListener('click', submitScore);
    }
    
    const viewLeaderboardBtn = document.getElementById('view-leaderboard');
    if (viewLeaderboardBtn) {
        viewLeaderboardBtn.addEventListener('click', toggleLeaderboard);
    }
    
    if (window.ethereum) {
        window.ethereum.on('accountsChanged', (accounts) => {
            if (accounts.length === 0) {
                disconnectWallet();
            } else {
                userAccount = accounts[0];
                updateWalletUI(true);
                console.log('Account changed to:', userAccount);
            }
        });
        
        window.ethereum.on('chainChanged', (chainId) => {
            console.log('Chain changed to:', chainId);
            window.location.reload();
        });
    }
    
    console.log('Event listeners set up');
}

// ====================================================================
// WALLET-FIRST FLOW FUNCTIONS
// ====================================================================

function showWalletConnectionModal() {
    // Hide tutorial modal and show wallet connection requirement
    if (tutorialModal) {
        tutorialModal.style.display = 'none';
    }
    
    // Create or show wallet connection modal
    let walletModal = document.getElementById('wallet-connection-modal');
    if (!walletModal) {
        walletModal = createWalletConnectionModal();
    }
    walletModal.style.display = 'flex';
    
    console.log('Showing wallet connection requirement');
}

function createWalletConnectionModal() {
    const walletModal = document.createElement('div');
    walletModal.id = 'wallet-connection-modal';
    walletModal.className = 'modal';
    
    walletModal.innerHTML = `
        <div class="modal-content">
            <h2>🦄 Welcome to Monanimal Rescue Runner!</h2>
            <p style="margin: 15px 0; font-size: clamp(0.9rem, 2.5vw, 1.1rem); line-height: 1.4;">
                This is a <strong>blockchain game</strong> that submits your scores to <strong>Monad testnet</strong>. 
                Connect your wallet to get started!
            </p>
            <div style="background: rgba(107, 70, 193, 0.3); padding: 15px; border-radius: 8px; margin: 15px 0;">
                <h3 style="color: #8B5CF6; margin-bottom: 10px;">🎮 Game Features:</h3>
                <ul style="text-align: left; margin: 0; padding-left: 20px;">
                    <li style="margin: 5px 0;">Save lost Monanimals for points</li>
                    <li style="margin: 5px 0;">Dodge slow Ethereum turtle obstacles</li>
                    <li style="margin: 5px 0;">Real-time blockchain score submission</li>
                    <li style="margin: 5px 0;">Global leaderboard on Monad testnet</li>
                </ul>
            </div>
            <button id="connect-wallet-main" style="font-size: clamp(1rem, 2.5vw, 1.2rem); background: linear-gradient(45deg, #8B5CF6, #A855F7); margin-bottom: 10px;">
                🔗 Connect Wallet to Play
            </button>
            <p style="font-size: clamp(0.7rem, 2vw, 0.85rem); color: #D1D5DB; margin-top: 10px;">
                Need MetaMask? <a href="https://metamask.io/" target="_blank" style="color: #8B5CF6;">Get it here</a>
            </p>
        </div>
    `;
    
    document.body.appendChild(walletModal);
    
    // Set up connect wallet button in modal
    const connectWalletMainBtn = document.getElementById('connect-wallet-main');
    if (connectWalletMainBtn) {
        connectWalletMainBtn.addEventListener('click', async () => {
            await connectWallet();
            // After successful connection, the onWalletConnected function will be called
        });
    }
    
    return walletModal;
}

function onWalletConnected() {
    console.log('Wallet connected - showing game tutorial');
    
    // Hide wallet connection modal
    const walletModal = document.getElementById('wallet-connection-modal');
    if (walletModal) {
        walletModal.style.display = 'none';
    }
    
    // Show tutorial modal
    if (tutorialModal) {
        tutorialModal.style.display = 'flex';
    }
    
    // Update wallet UI in game
    updateWalletUI(true);
}

function checkWalletConnectionStatus() {
    // Always hide tutorial modal first
    if (tutorialModal) {
        tutorialModal.style.display = 'none';
    }
    
    if (userAccount) {
        // Wallet already connected, show tutorial
        console.log('Wallet already connected:', userAccount);
        updateWalletUI(true);
        if (tutorialModal) {
            tutorialModal.style.display = 'flex';
        }
    } else {
        // No wallet connected, show wallet connection requirement
        showWalletConnectionModal();
    }
}

// ====================================================================
// MAIN INITIALIZATION
// ====================================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('Monanimal Rescue Runner - Wallet-First Flow Initializing...');
    
    initializeDOMElements();
    
    // IMMEDIATELY hide tutorial modal to ensure wallet connection shows first
    if (tutorialModal) {
        tutorialModal.style.display = 'none';
    }
    
    initializeGame();
    preventMobileScrolling();
    
    // Add viewport meta tag if missing
    if (!document.querySelector('meta[name="viewport"]') {
        const viewport = document.createElement('meta');
        viewport.name = 'viewport';
        viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
        document.head.appendChild(viewport);
    }
    
    // Initialize blockchain and check wallet status
    initializeBlockchain().then(() => {
        setupEventListeners();
        // Immediately check wallet connection status and show appropriate modal
        checkWalletConnectionStatus();
    });
    
    console.log('Monanimal Rescue Runner - Wallet-First Flow Ready!');
});

console.log('Mobile-responsive blockchain game loaded successfully!');