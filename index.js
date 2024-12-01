const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const fs = require("fs");

const UPDATE_FPS = 30;

const TEAM = {
    BLUE: "BLUE",
    RED: "RED"
}

const keyMap = {
	"a": "left",
	"w": "up",
	"s": "down",
	"d": "right"
}
const BULLET_SPEED = 0.3;
const SHOOT_COOLDOWN = 400;
const BULLET_INITIAL_DAMAGE = 10;

let playersList = [];
let bullets = [];
let map = {};//have to load json file
let teamJoined = TEAM.BLUE;

let virtualGame = {
    width: 100, // units = tank width
    height: 100
}

const playerSpeed = 0.2;

class ServerPlayer {
    #id;
    #health;
    constructor(id, team = "red", dir = "up", nickname = ""){
        this.#id = id;
        let randomPosition = getRandomPosition(map);
        if(randomPosition){
            this.x = randomPosition.xPos;
            this.y = randomPosition.yPos;
        }
        this.team = team;
        this.moveDir = dir;
        this.dirFacing = dir;
        this.nickname = id;
        this.kills = 0;
        this.deaths = 0;
        this.canShoot = true;
        this.moving = false;
        this.#health = 100;
        this.keysPressed = [];
    }
    die(){
        this.deaths++;
        this.#health = 100;
    }
    get id(){
        return this.#id;
    }
    /**
     * @param {number} newHealth
     */
    get health(){
        return this.#health;
    }
    set health(newHealth){
        if(newHealth < 0)
            newHealth = 0;
        this.#health = newHealth;
    }
    getSendData(){
        this.updatePosition();
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            team: this.team,
            dir: this.dirFacing,
            nickname: this.nickname,
            health: this.#health / 100
        }
    }
    getStatData(){//data only for this player
        return {
            
        }
    }
        
    
    inputDown(key){
        this.keysPressed.push(key);
        this.moving = true;
        if("wasd".includes(key)){
            this.moveDir = keyMap[key];
        }
        if(this.keysPressed.length > 4){
            console.error("Too many keys in keysPressed");
        }
    }
    inputUp(key){
        this.keysPressed.splice(this.keysPressed.indexOf(key), 1);//removes key
        if(this.keysPressed.length == 0){
            this.moving = false;
        }
        else if(keyMap[key] == this.moveDir){
            this.moveDir = keyMap[this.keysPressed[this.keysPressed.length - 1]];
        }
        // if(key == "a" && this.moveDir == "left"){
        //     this.moving = false;
        // }
        // else if(key == "d" && this.moveDir == "right"){
        //     this.moving = false;
        // }
        // else if(key == "w" && this.moveDir == "up"){
        //     this.moving = false;
        // }
        // else if(key == "s" && this.moveDir == "down"){
        //     this.moving = false;
        // }
        
    }
    updatePosition(){
        let lastX = 0;
        let lastY = 0;
        if(this.moving){
            switch(this.moveDir){
                case "up":
                    this.y = Math.floor((this.y - playerSpeed) * 10) / 10;
                    break;
                case "down":
                    this.y = Math.floor((this.y + playerSpeed) * 10) / 10;
                    break;
                case "left":
                    this.x = Math.floor((this.x - playerSpeed) * 10) / 10;
                    break;
                case "right":
                    this.x = Math.floor((this.x + playerSpeed) * 10) / 10;
                    break;
            }
        }
        // console.log(this.x, this.y);
        if(mapCollision(map.tiles, this.x, this.y) || this.x < 0 || this.x > virtualGame.width - 1 || this.y < 0 || this.y > virtualGame.height - 1){
            if(this.moveDir == "up"){
                this.y = Math.ceil(this.y);
            }
            else if(this.moveDir == "down"){
                this.y = Math.floor(this.y);
            }
            else if(this.moveDir == "left"){
                this.x = Math.ceil(this.x);
            }
            else if(this.moveDir == "right"){
                this.x = Math.floor(this.x);
            }
            // this.x = lastX;
            // this.y = lastY;
        }
    }
    shoot(shootDirection){
        if(this.canShoot && this.dirFacing == shootDirection){
            this.canShoot = false;
            setTimeout(() => {
                this.canShoot = true;
            }, SHOOT_COOLDOWN);
            let vx = 0;
            let vy = 0;
            
            switch(shootDirection){
                case "up":
                    vy -= BULLET_SPEED;
                    break;  
                case "down":
                    vy += BULLET_SPEED;
                    break;   
                case "right":
                    vx += BULLET_SPEED;
                    break;
                case "left":
                    vx -= BULLET_SPEED;
                    break;

            }
            createNewBullet(this.x, this.y, vx, vy, this.id, this.team);

        }
        else{
            this.dirFacing = shootDirection;
        }
    }
}
class ServerBullet{
    constructor(x, y, vx, vy, sender, team){
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.dir = "up";
        if(this.vy != 0){
            if(this.vy > 0){
                this.dir = "down";
            }
            else{
                this.dir = "up";
            }
        }
        else{
            if(this.vx > 0){
                this.dir = "right";
            }
            else{
                this.dir = "left";
            }
        }
        this.senderID = sender;
        this.damage = BULLET_INITIAL_DAMAGE;
    }
    update(){
        this.x += this.vx;
        this.y += this.vy;
        this.damage -= 0.3;
        let hitPlayer = playersList.find(player => this.bulletCollision(player));
        if(hitPlayer){
            console.log("PLAYER HIT " + hitPlayer.id);
            bullets.splice(bullets.indexOf(this), 1);//delete bullet
            shootPlayer(hitPlayer.id, this.damage);
        }
    }
    bulletCollision(player){
        if(player.id == this.senderID){
            return false;
        }
        const getBulletDimensions = (xPos, yPos, w, h) => {
            return {x: xPos, y: yPos, width: w, height: h}
        }
        const LENGTH = 0.3;
        const WIDTH = 0.1;
        const HALF_SIZE = 1 / 2;
        const POSITION_OFFSET = HALF_SIZE - WIDTH / 2;
        let bulletDims;
        switch(this.dir){
            case "up":
                bulletDims = getBulletDimensions(this.x + POSITION_OFFSET, this.y + HALF_SIZE - LENGTH, WIDTH, LENGTH);
                break;
            case "down":
                bulletDims = getBulletDimensions(this.x + POSITION_OFFSET, this.y + HALF_SIZE, WIDTH, LENGTH);
                break;
            case "left":
                bulletDims = getBulletDimensions(this.x + HALF_SIZE - LENGTH, this.y + POSITION_OFFSET, LENGTH, WIDTH);
                break;
            case "right":
                bulletDims = getBulletDimensions(this.x + HALF_SIZE, this.y + POSITION_OFFSET, LENGTH, WIDTH);
                break;
        }


        return !(
            ((bulletDims.y + bulletDims.height) < (player.y)) ||
            (bulletDims.y > (player.y + 1)) ||
            ((bulletDims.x + bulletDims.width) < player.x) ||
            (bulletDims.x > (player.x + 1))
        );
    }
    getSendData(){
        this.update();
        return {
            x: this.x + this.vx,
            y: this.y + this.vy,
            damage: this.damage,
            dir: this.dir,
            sender: this.senderID
        }
    }
    isAlive(){
        if(mapCollision(map.tiles, this.x, this.y) || this.x < 0 || this.x > virtualGame.width - 1 || this.y < 0 || this.y > virtualGame.height - 1){
            return false;
        }
        else{
            return true;
        }
    }
}
function loadMap(mapName){
    fs.readFile("Maps/" + mapName + ".json", 'utf-8', (err, data) => {
        if(err){
            console.log(err);
            return;
        }
        const jsonData = JSON.parse(data);
        map = jsonData;
        console.log(map);
        virtualGame.width = map.dimensions.width;
        virtualGame.height = map.dimensions.height;
        // console.log(mapCollision(map.tiles, 3, 4));//true
        // console.log(mapCollision(map.tiles, 3.34, 3.34));//true
        // console.log(mapCollision(map.tiles, 2, 4));//false
        // console.log(mapCollision(map.tiles, 6, 1.5));//true
        // console.log(mapCollision(map.tiles, 8, 2.1));//false
        // console.log(mapCollision(map.tiles, 9, 7.5));//true
        // console.log(mapCollision(map.tiles, 2.5, 4));//true
        // console.log(mapCollision(map.tiles, 5, 9));//true
    });
}

function createNewBullet(x, y, vx, vy, senderID, team){
    bullets.push(new ServerBullet(x, y, vx, vy, senderID, team));
    // console.log(bullets);
}
function getRandomPosition(map){
    let x = Math.floor(Math.random() * virtualGame.width);
    let y = Math.floor(Math.random() * virtualGame.height);
    // x = 3;
    // y = 4;
    let loopCounter = 0;
    while(map.tiles.find(tile => tile.x == x && tile.y == y)){
        if(this.loopCounter > virtualGame.width * virtualGame.height){
            return false;
        }
        if(this.x + 1 < virtualGame.width){
            this.x++;
        }
        else if(this.y + 1 < virtualGame.height){
            this.x = 0;
            this.y++;
        }
        else{
            this.x = 0;
            this.y = 0;
        }
        loopCounter++;
    }
    return {
        xPos: x,
        yPos: y
    }
}

app.use(express.static(__dirname));//app.use is middleware
//express.static finds dirname files and sends when app.get is called

app.get("/", (req, res) => {
    res.sendFile(__dirname + "index.html");
});


function mapCollision(map, x, y){
    let xFloor = Math.floor(x);
    let yFloor = Math.floor(y);
    let xCeil = Math.ceil(x);
    let yCeil = Math.ceil(y);
    // console.log(map);
    let block = map.find(spot => (spot.x == xFloor || spot.x == xCeil) && (spot.y == yFloor || spot.y == yCeil));
    if(block){
        return true;
    }
    return false;
}

function addNewPlayer(socket){
    let player = getPlayerByID(socket.id);

    if(player == undefined){
        playersList.push(new ServerPlayer(socket.id, "blue"));
    }
    console.log("adding new player:  " + socket.id);
}

function removePlayer(socket){
    let player = getPlayerByID(socket.id);
    if(player){
        playersList.splice(playersList.indexOf(player), 1);
        console.log("removed " + socket.id);
    }
    else{
        console.log("not found and not removed");
    }
}

function getPlayerByID(ID){
    return playersList.find(player => player.id == ID);
}

function handleGetPlayerID(id, callback){
    let player = getPlayerByID(id);
    if(player){
        callback(player);
    }
    else{
        console.log("player not found");
    }
}

function shootPlayer(playerID, damage){
    handleGetPlayerID(playerID, (player) => {
        
        player.health = player.health - damage;
        if(player.health <= 0){
            player.die();
            io.to(playerID).emit("death", player.deaths);
            // let newPos = getRandomPosition(map);
            player.x = Math.floor(Math.random() * virtualGame.width);
            player.y = Math.floor(Math.random() * virtualGame.height);
        }
        else{
            io.to(playerID).emit("damage", player.health);
        }
        
    });
    
}

function updateGame(){
    let updateData = {
        players: [],
        bullets: []
    };
    playersList.forEach(player => {
        updateData.players.push(player.getSendData());
        // io.to(player.id).emit('stats', player.getStatData());
    });
    let bulletsRemoved = [];
    bullets.forEach(bullet => {
        if(bullet.isAlive()){
            updateData.bullets.push(bullet.getSendData());
        }
        else{
            bulletsRemoved.push(bullets.indexOf(bullet));
        }
    });
    for(let index in bulletsRemoved){
        bullets.splice(index, 1);
    }
    if(bulletsRemoved.length > 0){
        console.log(bulletsRemoved.length + " bullets removed");
    }
    
    io.emit("update", updateData);
}
function sendMapData(socket){
    socket.emit("map-data", map);
}

io.on("connection", (socket) => {
    addNewPlayer(socket);
    sendMapData(socket);
    // socket.on("map-data-request", sendMapData(socket));
    socket.on("keydown", (data) => {
        let player = getPlayerByID(socket.id);
        // console.log(data);
        if(player){
            player.inputDown(data);
        }
        else{
            console.log("player not found");
        }
        //socket.emit("update", pos);
        //socket.broadcast.emit("update-players", pos);
    });
    socket.on("keyup", (data) => {
        let player = getPlayerByID(socket.id);
        if(player){
            player.inputUp(data);
        }
        else{
            console.log("player not found");
        }
    });
    socket.on("shoot", (shootDirection) => {
        handleGetPlayerID(socket.id, (player) => {
            console.log(player.nickname + " is trying to shoot");
            player.shoot(shootDirection);
        });
    });
    socket.on("update-nickname", (newName) => {
        let player = getPlayerByID(socket.id);
        if(player){
            console.log("updated " + socket.id + " to " + newName);
            player.nickname = newName;
        }
        else{
            console.log("Id not found");
        }
    });

    socket.on("disconnecting", () => {
        removePlayer(socket);
    });
});



loadMap("test");
setInterval(updateGame, 1000 / UPDATE_FPS);
// server.listen(3000, () => {
//     console.log("Listening rn");
// });
server.listen(3000, "192.168.1.72", ()=> {
    console.log("listeing on 192.168.1.72");
});