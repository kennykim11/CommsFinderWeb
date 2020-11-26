var img = new Image(47.7398, 47.7398)
img.src = "planeicon.svg"

var time = 0
const timeInterval = 10
var paused = false
var pulses = []
var plane = {x: 200, y: 200, v: 0.5, heading: -Math.PI/2}
var emitter = {x: 100, y: 75}
var alerted = false
var hitCooldown = 0
const hitCooldownStart = 500
const pulseInterval = 1000
const radiusGrowth = 1
const radiusTimeout = 2000
const planeVMax = 1

function checkCollision(plane, pulse) {
    const deltaPulseToPlane = Math.abs(Math.sqrt((plane.x - pulse.startX)**2 + (plane.y - pulse.startY)**2) - pulse.radius)
    if (deltaPulseToPlane < 0.9) return true
}

function rotateAndPaintImage(context, image, angleInRad, positionX, positionY) {
    context.save()
    context.translate(positionX, positionY)
    context.rotate(angleInRad);
    context.drawImage(image, -img.width/2, -img.height/2);
    context.restore()
}

function redraw(canvas) {
    const cv = canvas.getContext("2d");
    cv.clearRect(0, 0, canvas.width, canvas.height);
    rotateAndPaintImage(cv, img, plane.heading + Math.PI/2, plane.x, plane.y)

    if (!(time % pulseInterval)){ //Make a new pulse if time
        pulses.push({
            createTime: time,
            startX: emitter.x,
            startY: emitter.y,
            radius: 0
        })
    }

    if (pulses.length && pulses[0].radius >= radiusTimeout) pulses.shift(1) //Delete pulse if out of bounds

    for (const pulse of pulses){ //For each pulse
        cv.beginPath(); //Draw
        cv.arc(pulse.startX, pulse.startY, pulse.radius, 0, 2 * Math.PI);
        cv.stroke();

        if (hitCooldown) hitCooldown -= 1
        if (checkCollision(plane, pulse) && !hitCooldown) {
            console.log('HIT')
            hitCooldown = hitCooldownStart
        }
        pulse.radius += 1 * radiusGrowth
    }
}

function movePlane(canvas){
    plane.x += plane.v * Math.cos(plane.heading)
    plane.y += plane.v * Math.sin(plane.heading)
    if (!alerted && (plane.x < 0 || plane.x > canvas.width || plane.y < 0 || plane.y > canvas.height)){
        alerted = true
        alert("Out of bounds")
    } 
}

function setUpKeys(){
    document.addEventListener('keydown', function(event) {
        switch (event.key){
            case "ArrowDown":
            case "S":
                if (plane.v > 0.2) plane.v -= 0.1
                break
            case "ArrowUp":
            case "W":
                if (plane.v < planeVMax) plane.v += 0.1
                break
            case "ArrowRight":
            case "D":
                plane.heading += 0.07
                break
            case "ArrowLeft":
            case "A":
                plane.heading -= 0.07
                break
        }
    });
}

window.onload = function(){
    const canvas = document.getElementById("mapCanvas");
    const canvasStyle = window.getComputedStyle(canvas)
    canvas.width = +canvasStyle.width.slice(0, -2)
    canvas.height = +canvasStyle.height.slice(0, -2)
    var cv = canvas.getContext("2d");
    cv.fillStyle = "white";

    setUpKeys()

    this.timerHandler = setInterval(function(){
        if (!paused) {
            movePlane(canvas)
            redraw(canvas);
            time += timeInterval;
        }
    },timeInterval)
 };