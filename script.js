const socket = io();

let canvas = document.querySelector("#canvas");
let ctx = canvas.getContext("2d");

let nicknameInput = document.querySelector("#nickname");
let topNavContainer = document.querySelector(".top-stats");
let topNavHeight = topNavContainer.getBoundingClientRect().height;
let healthElm = document.querySelector("#health-elm");
let KillDeathElm = document.querySelector("#kd-counter");
let deathMessageContainer = document.querySelector("#death-message-container");

let minDimension = innerWidth < innerHeight - topNavHeight ? innerWidth : innerHeight - topNavHeight;
canvas.width = minDimension;
canvas.height = minDimension;
canvas.style.width = canvas.width + "px";
canvas.style.height = canvas.height + "px";

topNavContainer.style.width = canvas.style.width;

let size = minDimension / 10;
let pos = {
    x: 0,
    y: 0,
}

let map = {};
let otherPlayerData = [];
let bullets = [];
let hasFired = false;
let lastKeyPressed = null;

let kills = 0;
let deaths = 0;

const keyMap = {
	"a": "left",
	"w": "up",
	"s": "down",
	"d": "right"
}

socket.on("connect", () => {

    console.log(socket.id);
});

socket.on("map-data", (mapData) => {
    console.log(mapData);
    map = mapData;
    let mapWidth = map.dimensions.width;
    let mapHeight = map.dimensions.height;
    size = mapWidth > mapHeight ? minDimension / mapWidth : minDimension / mapHeight;
    canvas.height = map.dimensions.height * size;
    canvas.style.height = canvas.height + "px";
    topNavContainer.style.width = canvas.style.width;
});
socket.on("update", (gameData) => {
    // console.log(data);
    otherPlayerData = gameData.players;
    // console.log(gameData.player);
    bullets = gameData.bullets;
    // console.log(bullets[0]);
    update();
});

socket.on("damage", (newHealth) => {
    displayHealth(newHealth);
});

socket.on("death", (deaths) => {
    console.log("I DIED");
    showDeathMessage();
    displayKD(kills, deaths);
})

function displayKD(kills, newDeaths){
    KillDeathElm.innerText = "Kills/Deaths: " + kills + "/" + newDeaths;
    deaths = newDeaths;
}
function displayHealth(health){
    healthElm.innerText = "Health:" + Math.floor(health);
}

function showDeathMessage(){
    deathMessageContainer.showModal();
    setTimeout(() => {
        deathMessageContainer.close();
    }, 900);
}
function drawMap(ctx){
    if(socket.connected){
        ctx.fillStyle = map.colors.background.fill;
        ctx.fillRect(0, 0, canvas.width, map.dimensions.height * size);
        ctx.fillStyle = map.colors.block.fill;
        ctx.strokeStyle = map.colors.block.stroke;
        ctx.beginPath();
        for(let i = 0; i < map.tiles.length; i++){
            let element = map.tiles[i];
            ctx.roundRect(element.x * size, element.y * size, size, size, size * 0.15);
        }; 
        ctx.stroke();
        ctx.fill();
    }   
}

function sendName(){
    console.log(nicknameInput.value);
    if(nicknameInput.value.split(" ").join("").length > 1){
        console.log("sent", nicknameInput.value);
        socket.emit("update-nickname", nicknameInput.value);
    }
}

function update(){
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawMap(ctx);
    otherPlayerData.forEach(player => {
        let teamColor = "RED";
        if(player.id == socket.id)
            teamColor = "BLUE";
        Player.drawTank(ctx, player.x * size, player.y * size, size, player.dir, teamColor, player.health);

    });
    if(bullets.length > 0){
        console.log(bullets[0]);
    }
    
    bullets.forEach(bullet => {
        let teamColor = "RED";
        if(bullet.sender == socket.id)
            teamColor = "BLUE";
        Bullet.drawBullet(ctx, size, bullet.x * size, bullet.y * size,bullet.dir, teamColor);
    });
    
    
    // console.log(otherPlayerData[0].x);
}
update();
window.addEventListener("keydown", (e) => {
    if(e.target == nicknameInput){
        return;
    }
    if("wasd".includes(e.key)){
        let moveKey = e.key;
        // keysActive.push(moveKey);
        if(moveKey != lastKeyPressed){
            socket.emit("keydown", moveKey);
            lastKeyPressed = moveKey;
        }
    }
    let shootDirection = null;
    switch(e.key){
		case "ArrowUp":
            shootDirection = "up";
            break;
		case "ArrowRight":
            shootDirection = "right";
            break;
		case "ArrowDown":
            shootDirection = "down";
            break;
		case "ArrowLeft":
            shootDirection = "left";
            break;
	}
    if(shootDirection){
        e.preventDefault();
        socket.emit("shoot", shootDirection);
    }
});
window.addEventListener("keyup", (e) => {
    if(e.target == nicknameInput)
        return;
    if("wasd".includes(e.key)){
        socket.emit("keyup", e.key);
    }
    if(e.key == lastKeyPressed){
        lastKeyPressed = null;
    }
});