var renderer = PIXI.autoDetectRenderer(window.innerWidth, window.innerHeight, { transparent: true });

// add render view to DOM
document.body.appendChild(renderer.view);

// create an new instance of a pixi stage
var stage = new PIXI.Container();

var pondContainer = new PIXI.Container();


var LSystems = require('./lsystem');
var canvas = document.getElementById('canvas');
HEIGHT = canvas.height;
WIDTH = canvas.width;
var context = canvas.getContext("2d");
context.clearRect(0,0,canvas.width,canvas.height);
context.fillStyle = "rgba(0, 0, 200, 0.5)";

var systems = [
    [
        5, 22, "", "F", "F=C0FF-[C1-F+F+F]+[C2+F-F-F]"
    ],
    [
        5, 25, "", "FX", "F=C0FF-[C1-F+F]+[C2+F-F]", "X=C0FF+[C1+F]+[C3-F]"
    ],
    [
        5, 27, "", "F", "F=C0FF[C1-F++F][C2+F--F]C3++F--F"
    ],

];

for (var i = 0, l = systems.length; i<l ; i++){
    var lsys = new LSystems.LSystemsProcessor();
    lsys.iterations = parseInt(systems[i][0]);
    lsys.axiom = systems[i][3];
    for(var j=4, lj = systems[i].length; j<lj; j++)
    {
        lsys.addRule(systems[i][j]);
    }
    var g_commands = lsys.generate();
    var g_renderer = new LSystems.TurtleRenderer(WIDTH, HEIGHT);
    g_renderer.setAngle(parseInt(systems[i][1]));
    g_renderer.setConstants(systems[i][2]);
    g_renderer.setRenderLineWidths(true);
    g_renderer.process(g_commands, false);
    // calc new distance based on screen res
    var oldDistance = 10.0;
    var newDistance;
    var dim = g_renderer.getMinMaxValues();;
    if (dim.maxx - dim.minx > dim.maxy - dim.miny)
    {
        // X has the largest delta - use that
        newDistance = (WIDTH / (dim.maxx - dim.minx)) * oldDistance;
    }
    else
    {
        // Y has the largest delta - use that
        newDistance = (HEIGHT / (dim.maxy - dim.miny)) * oldDistance;
    }

    // calc rendering offsets

    // scale min/max values by new distance
    dim.minx *= (newDistance / oldDistance);
    dim.maxx *= (newDistance / oldDistance);
    dim.miny *= (newDistance / oldDistance);
    dim.maxy *= (newDistance / oldDistance);

    var xoffset = (WIDTH / 2) - (((dim.maxx - dim.minx) / 2) + dim.minx);
    var yoffset = (HEIGHT / 2) - (((dim.maxy - dim.miny) / 2) + dim.miny);
    g_renderer.setOffsets(xoffset, yoffset);
    g_renderer.setDistance(newDistance);
    var before = new Date();
    g_renderer.process(g_commands, true);
    var after = new Date();
    var dataURL = canvas.toDataURL();
    var three =  PIXI.Sprite.fromImage(dataURL);
    three.anchor.x = three.anchor.y = 0;
    three.position.x = window.innerWidth / 3 * i - 100;
    pondContainer.addChild(three);
    context.clearRect(0, 0, canvas.width, canvas.height);
}


var Boids = require('boids');
var Vec2= require('./Vec2');

PIXI.Sprite.prototype.bringToFront = function() {
    if (this.parent) {
        var parent = this.parent;
        parent.removeChild(this);
        parent.addChild(this);
    }
}

var FISHES = 240;
var FLOCK = FISHES/4;
var PREDATORS = 6;

var attractors0 = [[Infinity, Infinity, 200, 0.2]];

var attractors1 = [[Infinity, Infinity, 200, 0.2]];

var predatorAtractor = [];

var boids1 = Boids({
    boids: FLOCK
    , speedLimit: 2
    , accelerationLimit: 0.7
    , attractors: attractors0
});
var boids2 = Boids({
    boids: FLOCK
    , speedLimit: 1.5
    , accelerationLimit: 0.6
    , attractors: attractors0
});
var boids3 = Boids({
    boids: FLOCK
    , speedLimit: 1.8
    , accelerationLimit: 0.9
    , attractors: attractors1
});
var boids0 = Boids({
    boids: FLOCK
    , speedLimit: 1.2
    , accelerationLimit: 0.9
    , attractors: attractors1
});

var predatorBoids = Boids({
    boids: FLOCK
    , speedLimit: 1.7
    , accelerationLimit: 0.5
    , attractors: predatorAtractor
    , separationDistance : 100
});

var boidData = new Array(4);
boidData[0] = boids0.boids;
boidData[1] = boids1.boids;
boidData[2] = boids2.boids;
boidData[3] = boids3.boids;
var predatorBoidData;


stage.addChild(pondContainer);

stage.interactive = true;



//pondContainer.addChild(bg);

//var fish = PIXI.Sprite.fromImage("displacement_fish2.jpg");//
//littleDudes.position.y = 100;
var padding = 0;
var bounds = new PIXI.Rectangle(-padding, -padding, window.innerWidth + padding * 2, window.innerHeight + padding * 2);
var fishs = [];
var predators = [];

document.body.onclick = function(e) {
    var halfHeight = bounds.height/2
        , halfWidth = bounds.width/2;

    attractors0[0][0] = e.x - halfWidth;
    attractors0[0][1] = e.y - halfHeight;

};

document.body.ondblclick = function(e) {
    var halfHeight = bounds.height/2
        , halfWidth = bounds.width/2;

    attractors1[0][0] = e.x - halfWidth;
    attractors1[0][1] = e.y - halfHeight;
};


for (var i = 0; i < FISHES; i++)
{
	var fishId = i % 4;
	fishId += 1;
	var fish =  PIXI.Sprite.fromImage("displacement_fish"+fishId+".png");
	fish.anchor.x = fish.anchor.y = 0.5;
    fish.lastLocation = new Vec2();
    fish.orientation = 0;
    fish.lastOrientation = 0;
	pondContainer.addChild(fish);
	fish.scale.x = fish.scale.y = 0.2 + Math.random() * 0.3;
    var mask = new PIXI.Graphics();
    var h = parseInt(20 + Math.random()*80);
    var w = parseInt(15 + Math.random()*40);
    fish.addChild(mask);
    mask.beginFill();
    mask.arc(0,0,w,Math.PI/2,Math.PI*3/2);
    mask.bezierCurveTo(80, 0, 140, -w/2, h, 0);
    mask.bezierCurveTo(140, 10,80, 0,  0, w);
    mask.endFill();
    mask.isMask = true;
    var eyes = new PIXI.Graphics();
    eyes.beginFill(0xFFFFFF);
    eyes.drawCircle(-2,-5, 5);
    eyes.drawCircle(-2,5, 5);
    eyes.beginFill(0x000000);
    eyes.drawCircle(-2,-5, 2);
    eyes.drawCircle(-2,5, 2);
    eyes.endFill();
    fish.addChild(eyes);
    fish.mask = mask;
	fishs.push(fish);

}

for (var i = 0; i < PREDATORS; i++) {

    var predator = PIXI.Sprite.fromImage("predator.png");
    predator.anchor.x = predator.anchor.y = 0.5;
    fish.scale.x = fish.scale.y = 0.01;
    var mask = new PIXI.Graphics();
    var h = parseInt(20 + Math.random()*80);
    var w = parseInt(15 + Math.random()*40);
    predator.addChild(mask);
    mask.beginFill();
    mask.arc(0,0,w,Math.PI/2,Math.PI*3/2);
    mask.bezierCurveTo(80, 0, 140, -w/2, h, 0);
    mask.bezierCurveTo(140, 10,80, 0,  0, w);
    mask.endFill();
    mask.isMask = true;
    var eyes = new PIXI.Graphics();
    eyes.beginFill(0xFFFFFF);
    eyes.drawCircle(-2,-5, 5);
    eyes.drawCircle(-2,5, 5);
    eyes.beginFill(0x000000);
    eyes.drawCircle(-2,-5, 2);
    eyes.drawCircle(-2,5, 2);
    eyes.endFill();
    predator.addChild(eyes);
    predator.mask = mask;
    pondContainer.addChild(predator);
    predator.lastLocation = new Vec2();
    predator.orientation = 0;
    predator.lastOrientation = 0;
    predators.push(predator);

}

requestAnimationFrame(animate);

function animate() {
    boids0.tick();
    boids1.tick();
    boids2.tick();
    boids3.tick();
    predatorBoids.tick();

    predatorBoidData = predatorBoids.boids;
    var halfHeight = bounds.height/2
        , halfWidth = bounds.width/2;
    predatorAtractor = [];
    while(attractors0.length > 1){
        attractors0.pop();
        attractors1.pop();
    }
    for (var i = 0, pl = predators.length, x, y; i < pl; i += 1) {
        var predator = predators[i];
        x = predatorBoidData[i][0];
        y = predatorBoidData[i][1];
        attr = [x, y, 300, -0.7];
        attractors0.push(attr);
        attractors1.push(attr);
        // wrap around the screen
        predatorBoidData[i][0] = x > halfWidth ? -halfWidth : -x > halfWidth ? halfWidth : x;
        predatorBoidData[i][1] = y > halfHeight ? -halfHeight : -y > halfHeight ? halfHeight : y;

        predator.position.x = x + halfWidth;
        predator.position.y = y + halfHeight;
        if (predator.position.x < bounds.x) predator.position.x += bounds.width;
        if (predator.position.x > bounds.x + bounds.width) predator.position.x -= bounds.width;

        if (predator.position.y < bounds.y) predator.position.y += bounds.height;
        if (predator.position.y > bounds.y + bounds.height) predator.position.y -= bounds.height;
        var locVector = new Vec2(predator.position.x - predator.lastLocation.x, predator.position.y - predator.lastLocation.y);
        predator.orientation = locVector.rad() + Math.PI/2;
        predator.rotation -= predator.orientation - predator.lastOrientation ;
        predator.lastOrientation = predator.orientation;
        predator.lastLocation.x =  predator.position.x;
        predator.lastLocation.y =  predator.position.y;
    }
    for (var i = 0, l = fishs.length, pl = predators.length, x, y; i < l; i += 1) {
        var fish = fishs[i];
        var fishId = i % 4;
        var idx = parseInt(i/4);
        x = boidData[fishId][idx][0];
        y = boidData[fishId][idx][1];
        predatorAtractor.push([x,y, 1500, 1]);
        // wrap around the screen
        boidData[fishId][idx][0] = x > halfWidth ? -halfWidth : -x > halfWidth ? halfWidth : x;
        boidData[fishId][idx][1] = y > halfHeight ? -halfHeight : -y > halfHeight ? halfHeight : y;


        fish.position.x = x + halfWidth;
        fish.position.y = y + halfHeight;
        if(fish.position.x < bounds.x)fish.position.x += bounds.width;
        if(fish.position.x > bounds.x + bounds.width)fish.position.x -= bounds.width;

        if(fish.position.y < bounds.y)fish.position.y += bounds.height;
        if(fish.position.y > bounds.y + bounds.height)fish.position.y -= bounds.height;
        var locVector = new Vec2(fish.position.x - fish.lastLocation.x, fish.position.y - fish.lastLocation.y);
        fish.orientation = locVector.rad() + Math.PI/2;
        fish.rotation -= fish.orientation - fish.lastOrientation ;
        fish.lastOrientation =fish.orientation;
        fish.lastLocation.x = fish.position.x;
        fish.lastLocation.y = fish.position.y;

    }
    renderer.render(stage);
    requestAnimationFrame( animate );
}

