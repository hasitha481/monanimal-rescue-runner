// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title MonanimalRescueRunner
 * @dev Smart contract for Monanimal Rescue Runner game leaderboard
 * Showcases Monad's high TPS with real-time score submissions
 */
contract MonanimalRescueRunner {
    
    // Events for transparency
    event ScoreSubmitted(address indexed player, uint256 score, uint256 timestamp, string username);
    event NewHighScore(address indexed player, uint256 score, string username);
    
    // Player data structure
    struct Player {
        uint256 highScore;
        uint256 totalPlays;
        uint256 lastPlayTime;
        string username;
        bool exists;
    }
    
    // Leaderboard entry structure
    struct LeaderboardEntry {
        address playerAddress;
        uint256 score;
        string username;
        uint256 timestamp;
    }
    
    // State variables
    mapping(address => Player) public players;
    address[] public playerAddresses;
    LeaderboardEntry[] public leaderboard;
    
    uint256 public constant MAX_LEADERBOARD_SIZE = 50;
    uint256 public totalGamesPlayed;
    uint256 public globalHighScore;
    address public globalHighScoreHolder;
    
    // Contract owner (for emergency functions)
    address public owner;
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev Submit a new score to the leaderboard
     * @param score The score achieved in the game
     * @param username The player's username from Monad Games ID
     */
    function submitScore(uint256 score, string memory username) external {
        require(score > 0, "Score must be greater than 0");
        require(bytes(username).length > 0, "Username cannot be empty");
        require(bytes(username).length <= 32, "Username too long");
        
        address playerAddr = msg.sender;
        
        // Initialize player if first time
        if (!players[playerAddr].exists) {
            players[playerAddr] = Player({
                highScore: score,
                totalPlays: 1,
                lastPlayTime: block.timestamp,
                username: username,
                exists: true
            });
            playerAddresses.push(playerAddr);
        } else {
            // Update existing player
            players[playerAddr].totalPlays++;
            players[playerAddr].lastPlayTime = block.timestamp;
            players[playerAddr].username = username; // Allow username updates
            
            // Update high score if better
            if (score > players[playerAddr].highScore) {
                players[playerAddr].highScore = score;
            }
        }
        
        // Update global stats
        totalGamesPlayed++;
        
        // Check for new global high score
        if (score > globalHighScore) {
            globalHighScore = score;
            globalHighScoreHolder = playerAddr;
            emit NewHighScore(playerAddr, score, username);
        }
        
        // Add to leaderboard and maintain sort order
        _addToLeaderboard(playerAddr, score, username);
        
        emit ScoreSubmitted(playerAddr, score, block.timestamp, username);
    }
    
    /**
     * @dev Internal function to maintain sorted leaderboard
     */
    function _addToLeaderboard(address playerAddr, uint256 score, string memory username) internal {
        LeaderboardEntry memory newEntry = LeaderboardEntry({
            playerAddress: playerAddr,
            score: score,
            username: username,
            timestamp: block.timestamp
        });
        
        // If leaderboard is empty or score is lower than all entries
        if (leaderboard.length == 0 || score <= leaderboard[leaderboard.length - 1].score) {
            if (leaderboard.length < MAX_LEADERBOARD_SIZE) {
                leaderboard.push(newEntry);
            }
            return;
        }
        
        // Find correct position and insert
        uint256 insertPos = leaderboard.length;
        for (uint256 i = 0; i < leaderboard.length; i++) {
            if (score > leaderboard[i].score) {
                insertPos = i;
                break;
            }
        }
        
        // Shift entries and insert new one
        if (leaderboard.length < MAX_LEADERBOARD_SIZE) {
            leaderboard.push(leaderboard[leaderboard.length - 1]);
        }
        
        for (uint256 i = (leaderboard.length > MAX_LEADERBOARD_SIZE ? MAX_LEADERBOARD_SIZE - 1 : leaderboard.length - 1); i > insertPos; i--) {
            leaderboard[i] = leaderboard[i - 1];
        }
        
        leaderboard[insertPos] = newEntry;
        
        // Ensure we don't exceed max size
        if (leaderboard.length > MAX_LEADERBOARD_SIZE) {
            leaderboard.pop();
        }
    }
    
    /**
     * @dev Get top N scores from leaderboard
     * @param limit Maximum number of entries to return
     */
    function getTopScores(uint256 limit) external view returns (LeaderboardEntry[] memory) {
        uint256 returnSize = limit > leaderboard.length ? leaderboard.length : limit;
        LeaderboardEntry[] memory topScores = new LeaderboardEntry[](returnSize);
        
        for (uint256 i = 0; i < returnSize; i++) {
            topScores[i] = leaderboard[i];
        }
        
        return topScores;
    }
    
    /**
     * @dev Get player's statistics
     */
    function getPlayerStats(address playerAddr) external view returns (
        uint256 highScore,
        uint256 totalPlays,
        uint256 lastPlayTime,
        string memory username
    ) {
        require(players[playerAddr].exists, "Player not found");
        Player memory player = players[playerAddr];
        return (player.highScore, player.totalPlays, player.lastPlayTime, player.username);
    }
    
    /**
     * @dev Get player's rank on leaderboard
     */
    function getPlayerRank(address playerAddr) external view returns (uint256 rank, bool onLeaderboard) {
        for (uint256 i = 0; i < leaderboard.length; i++) {
            if (leaderboard[i].playerAddress == playerAddr) {
                return (i + 1, true);
            }
        }
        return (0, false);
    }
    
    /**
     * @dev Get contract statistics
     */
    function getContractStats() external view returns (
        uint256 totalPlayers,
        uint256 totalGames,
        uint256 globalHigh,
        address globalHighHolder,
        uint256 leaderboardSize
    ) {
        return (
            playerAddresses.length,
            totalGamesPlayed,
            globalHighScore,
            globalHighScoreHolder,
            leaderboard.length
        );
    }
    
    /**
     * @dev Emergency function to update leaderboard (only owner)
     * Can be used to fix issues or migrate data
     */
    function emergencyUpdateLeaderboard(LeaderboardEntry[] memory newLeaderboard) external onlyOwner {
        delete leaderboard;
        for (uint256 i = 0; i < newLeaderboard.length && i < MAX_LEADERBOARD_SIZE; i++) {
            leaderboard.push(newLeaderboard[i]);
        }
    }
    
    /**
     * @dev Get all player addresses (for analytics)
     */
    function getAllPlayers() external view returns (address[] memory) {
        return playerAddresses;
    }
    
    /**
     * @dev Check if player exists
     */
    function playerExists(address playerAddr) external view returns (bool) {
        return players[playerAddr].exists;
    }
}