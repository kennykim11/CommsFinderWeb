var img = new Image()
img.src = "planeicon.svg"

var time = 0
const timeInterval = 10
var paused = false
var pulses = []
var plane = {x: 200, y: 200}
var emitter = {x: 100, y: 75}
const pulseInterval = 1000
const radiusGrowth = 1
const radiusTimeout = 2000

function checkCollision(plane, pulse) {
    const deltaPulseToPlane = Math.abs(Math.sqrt((plane.x - pulse.startX)**2 + (plane.y - pulse.startY)**2) - pulse.radius)
    if (deltaPulseToPlane < 0.7) return true
}

function redraw(canvas) {
    const cv = canvas.getContext("2d");
    cv.clearRect(0, 0, canvas.width, canvas.height);

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

        if (checkCollision(plane, pulse)) console.log('HIT')

        pulse.radius += 1 * radiusGrowth
    }
}

window.onload = function(){
    const canvas = document.getElementById("mapCanvas");
    const canvasStyle = window.getComputedStyle(canvas)
    canvas.width = +canvasStyle.width.slice(0, -2)
    canvas.height = +canvasStyle.height.slice(0, -2)
    var cv = canvas.getContext("2d");
    console.log(canvas)
    cv.fillStyle = "white";
    cv.fillRect(0, 0, canvas.width, canvas.height);
    cv.drawImage(img, 10, 10)

    this.timerHandler = setInterval(function(){
        if (!paused) {
            time += timeInterval;
            redraw(canvas);
        }
    },timeInterval)
 };