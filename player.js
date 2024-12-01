const COLORS = {
	RED: {
		FILL:"#5B2C2C",
		STROKE: "#FF8084",
		BULLET:"#ffc9c9",
		HEALTH_FORE: "#FF8084",
        // HEALTH_BACK: "black"
		HEAlTH_BACK: "#9D4649"
	},
	BLUE: {
		FILL: "#0F4462",
		STROKE: "#46AAE9",
		BULLET: "#a5d8ff",
		HEALTH_FORE: "#46AAE9",
        // HEALTH_BACK: "black"
		HEALTH_BACK: "#2B668B"
	},
	BACKGROUND: {
		FILL: "#202020"
	},

}


class Player{
    constructor(id, x, y, dir){
        this.id = id;
        this.x = x;
        this.y = y;
        this.dir = dir;
    }
    static drawTank(ctx, x, y, size, dir = "up", teamColor = "BLUE", health = 1){
        //probably going to be replaced lmao
        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.strokeStyle = COLORS[teamColor].STROKE;
        ctx.fillStyle = COLORS[teamColor].FILL;
        ctx.roundRect(x,y, size, size, size * 0.15);
        ctx.stroke();
        ctx.fill();
        ctx.lineWidth = 3;
        //tank barrel
        const BARREL_WIDTH = size * 0.2;
        const BARREL_HEIGHT = size * 0.7;
        ctx.beginPath();
        const ROUND_RADIUS = size * 0.04;
        const HALF_SIZE = size / 2;
        const POSITION_OFFSET = HALF_SIZE - BARREL_WIDTH / 2; // offset for x when up or down, y when left or right
        switch(dir){
            case "up":
                ctx.roundRect(x + POSITION_OFFSET, y + HALF_SIZE - BARREL_HEIGHT, BARREL_WIDTH, BARREL_HEIGHT, ROUND_RADIUS);
                break;
            case "down":
                ctx.roundRect(x + POSITION_OFFSET, y + HALF_SIZE, BARREL_WIDTH, BARREL_HEIGHT, ROUND_RADIUS);
                break;
            case "left":
                ctx.roundRect(x + HALF_SIZE - BARREL_HEIGHT, y + POSITION_OFFSET, BARREL_HEIGHT, BARREL_WIDTH, ROUND_RADIUS);
                break;
            case "right":
                ctx.roundRect(x + HALF_SIZE, y + POSITION_OFFSET, BARREL_HEIGHT, BARREL_WIDTH, ROUND_RADIUS);
                break;
        }
        ctx.stroke();
        ctx.fill();
        //tank circle
        ctx.beginPath();
        ctx.moveTo(x + size / 2, y + size / 2);
        ctx.arc(x + size / 2, y + size / 2, size / 3.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fill();
        ctx.lineWidth = 2;
        Player.drawHealth(ctx, x + size / 2, y + size / 2, size / 3.5, health, COLORS[teamColor].HEALTH_FORE, COLORS[teamColor].HEALTH_BACK);
        ctx.lineWidth = 1;
    }

    static drawHealth(ctx, x, y, r, healthPercent, foreColor = "tomato", backColor = "grey", clockwise = false, startAngle = -0.25 * Math.PI * 2){
        let endAngle = healthPercent * Math.PI * 2 + startAngle;
        ctx.fillStyle = backColor;
        ctx.beginPath();
        ctx.moveTo(x,y);
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = foreColor;
        ctx.beginPath();
        ctx.moveTo(x,y);
        ctx.arc(x, y, r, startAngle, endAngle, clockwise);
        ctx.fill();
        
    }
}

class Bullet{
    constructor(x, y, vx, vy, sender, team){
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.sender = sender;
        this.team = team;
    }
    static drawBullet(ctx, size, x, y, dir, team = "BLUE"){
        let color = COLORS[team];
        ctx.fillStyle = color.BULLET;
        ctx.strokeStyle = color.BULLET;
        
        const LENGTH = size * 0.3;
        const WIDTH = size * 0.1;
        const BORDER_RADIUS = size * 0.02;
        const HALF_SIZE = size / 2;
        const POSITION_OFFSET = HALF_SIZE - WIDTH / 2;
        ctx.beginPath();
        switch(dir){
            case "up":
                ctx.roundRect(x + POSITION_OFFSET, y + HALF_SIZE - LENGTH, WIDTH, LENGTH, BORDER_RADIUS);
                break;
            case "down":
                ctx.roundRect(x + POSITION_OFFSET, y + HALF_SIZE, WIDTH, LENGTH, BORDER_RADIUS);
                break;
            case "left":
                ctx.roundRect(x + HALF_SIZE - LENGTH, y + POSITION_OFFSET, LENGTH, WIDTH, BORDER_RADIUS);
                break;
            case "right":
                ctx.roundRect(x + HALF_SIZE, y + POSITION_OFFSET, LENGTH, WIDTH, BORDER_RADIUS);
                break;
        }
        // ctx.roundRect(x, y, size * 0.3, size * 0.1, size * 0.02);
        ctx.stroke();
        ctx.fill();
    }
}