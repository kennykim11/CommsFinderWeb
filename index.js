//Assets
const img = new Image(47.7398, 47.7398)
img.src = "planeicon.svg"

//Simulation
var time = 0
var paused = false
var alerted = false
var hitCooldown = 0
var pulsesLeftForGroup = 0
var pulseRecord = []
var lastPulseTime = 0
var freqRecord = []
var lastFreq = 0
var deltaFreqRecord = []
var lastDeltaFreq = 0
var recordSize = 0
var planeRecord = []

//Assets
var pulses = []
var plane = {x: 700, y: 700, v: 0.5, heading: -Math.PI/2}
var emitter = {x: 800, y: 600}

//Settings
// pulse settings
var pulsesPerGroup = 4
var pulseInterval = 100
var pulseGroupInterval = 400
const radiusGrowth = 3
const radiusTimeout = 2000
// simulation settings
const timeInterval = 10
const hitCooldownStart = 150
const collisionRadius = 3
// graph settings
const pulseColor = 'red'
const freqColor = 'green'
const deltaFreqColor = 'blue'
const graphInterval = 25

function checkCollision(plane, pulse) {
    //Sees if pulse hit the plane, use collisionRadius
    const deltaPulseToPlane = Math.abs(Math.sqrt((plane.x - pulse.startX)**2 + (plane.y - pulse.startY)**2) - pulse.radius)
    if (deltaPulseToPlane < collisionRadius) return true
}

function rotateAndDrawImage(context, image, angleInRad, positionX, positionY) {
    //Used to draw the plane
    context.save()
    context.translate(positionX, positionY)
    context.rotate(angleInRad);
    context.drawImage(image, -img.width/2, -img.height/2);
    context.restore()
}

function insertToRecord(record, value){
    if (record.length >= recordSize) record.shift(1)
    record.push(value)
}

function redraw(canvas) {
    //Called every frame

    //Getting canvas ready
    const cv = canvas.getContext("2d")
    cv.clearRect(0, 0, canvas.width, canvas.height);
    
    //Drawing plane
    rotateAndDrawImage(cv, img, plane.heading + Math.PI/2, plane.x, plane.y)
    insertToRecord(planeRecord, Object.assign({}, plane))

    //Make a new pulse group if it's time to
    if (!(time % pulseGroupInterval))pulsesLeftForGroup = pulsesPerGroup
    //Make a new pulse if it's time to
    if (!((time % pulseGroupInterval) % pulseInterval) && pulsesLeftForGroup){
        pulses.push({
            createTime: time,
            startX: emitter.x,
            startY: emitter.y,
            radius: 0
        })
        pulsesLeftForGroup -= 1
    }

    //Delete pulse if out of bounds
    if (pulses.length && pulses[0].radius >= radiusTimeout) pulses.shift(1) 

    cv.strokeStyle = 'grey'
    for (const pulse of pulses){ //For each pulse
        //Draw
        cv.beginPath(); 
        cv.arc(pulse.startX, pulse.startY, pulse.radius, 0, 2 * Math.PI);
        cv.stroke();

        //Check for hit
        if (hitCooldown) hitCooldown -= 1
        if (checkCollision(plane, pulse) && !hitCooldown) {
            console.log('HIT')
            hitCooldown = hitCooldownStart
            insertToRecord(pulseRecord, 1)
            const thisFreq = 1/(time - lastPulseTime)
            insertToRecord(freqRecord, thisFreq)
            const thisDeltaFreq = thisFreq - lastFreq
            insertToRecord(deltaFreqRecord, thisDeltaFreq)
            lastPulseTime = time
            lastFreq = thisFreq
            lastDeltaFreq = thisDeltaFreq
        }
        else {
            if (!(time % graphInterval)){
                insertToRecord(pulseRecord, 0)
                insertToRecord(freqRecord, lastFreq)
                insertToRecord(deltaFreqRecord, lastDeltaFreq)
            }
            
        }

        //Expand pulse
        pulse.radius += 1 * radiusGrowth
    }

    //Draw plane path
    cv.beginPath();
    cv.moveTo(plane.x, plane.y)
    let planeRecordLength = planeRecord.length
    for (let i=0; i<planeRecordLength; i++){
        cv.strokeStyle = '#FF0000' + (255-i).toString(16);
        cv.lineTo(planeRecord[planeRecordLength-1-i].x, planeRecord[planeRecordLength-1-i].y)
        cv.stroke()
    }
}

function movePlane(canvas){
    //Move the plane to the next position
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
            case "s":
                if (plane.v > 0.2) plane.v -= 0.1
                break
            case "ArrowUp":
            case "w":
                if (plane.v <= radiusGrowth / 2) plane.v += 0.1
                //for now, the plane does not exceed speed of sound
                break
            case "ArrowRight":
            case "d":
                plane.heading += 0.07 * plane.v
                break
            case "ArrowLeft":
            case "a":
                plane.heading -= 0.07 * plane.v
                break
        }
    });
}

function getScale(array, size){
    let smallestValue = Math.min(...array)
    let scale = size / (Math.max(...array) - Math.min(0, smallestValue))
    let offset = smallestValue < 0 ? smallestValue : 0
    if (scale == Infinity) scale = 1
    return {scale, offset}
}

function drawGraphs(pulse, freq, deltaFreq){
    graphs = [pulse, freq, deltaFreq]
    for (graph of graphs){
        const ctx = graph.getContext("2d")
        ctx.clearRect(0, 0, graph.width, graph.height)
        ctx.beginPath()
        ctx.lineWidth = 2
        ctx.strokeStyle = graph.lineColor
        ctx.moveTo(graph.width, graph.height)
        const {scale, offset} = getScale(graph.data, graph.height)
        for (let i=0; i<graph.data.length; i++){
            ctx.lineTo(graph.width-i, graph.height - (scale * (graph.data[i] + offset)))
        }
        console.log(`Color: ${graph.lineColor}, scale: ${scale}. high: ${scale * Math.max(...graph.data)}, low: ${scale * Math.min(...graph.data)}`)
        ctx.stroke()
    }
}

function oneDec(num){ //Rounds to one decimal
    return (Math.round(num * 10) / 10).toFixed(1)
}

function fiveDecMil(num){ //Rounds to five decimals in milliunits
    return (Math.round(num * 100000) / 100).toFixed(5)
}

function drawStats(){
    document.getElementById('stats').innerText = `
    Coordinates: (${oneDec(plane.x)}, ${oneDec(plane.y)})
    Heading: ${oneDec(plane.heading)}
    Speed: ${oneDec(plane.v)}

    Emitter: (${oneDec(emitter.x)}, ${oneDec(emitter.y)})
    
    Freq: ${fiveDecMil(lastFreq)}
    Delta Freq: ${fiveDecMil(lastDeltaFreq)}`
}

window.onload = function(){
    //Get and setup map canvas
    const mapCanvas = document.getElementById("mapCanvas");
    const mapCanvasStyle = window.getComputedStyle(mapCanvas)
    mapCanvas.width = +mapCanvasStyle.width.slice(0, -2)
    mapCanvas.height = +mapCanvasStyle.height.slice(0, -2)
    plane.x = mapCanvas.width * 0.6
    plane.y = mapCanvas.height * 0.6
    emitter.x = mapCanvas.width * 0.4
    emitter.y = mapCanvas.height * 0.4
    
    //Get and setup graph canvases
    const pulseGraphCanvas = document.getElementById("pulseGraphCanvas")
    const freqGraphCanvas = document.getElementById("freqGraphCanvas")
    const deltaFreqGraphCanvas = document.getElementById("deltaFreqGraphCanvas")
    const quarterStyle = window.getComputedStyle(document.getElementById("graphsQuarter"))
    pulseGraphCanvas.lineColor = pulseColor
    freqGraphCanvas.lineColor = freqColor
    deltaFreqGraphCanvas.lineColor = deltaFreqColor
    pulseGraphCanvas.data = pulseRecord
    freqGraphCanvas.data = freqRecord
    deltaFreqGraphCanvas.data = deltaFreqRecord
    pulseGraphCanvas.width = freqGraphCanvas.width = deltaFreqGraphCanvas.width = +quarterStyle.width.slice(0, -2)
    pulseGraphCanvas.height = freqGraphCanvas.height = deltaFreqGraphCanvas.height = +quarterStyle.height.slice(0, -2) * 2 / 7
    //Getting it a little under 1/3
    recordSize = pulseGraphCanvas.width

    //Setup
    setUpKeys()

    //Frame timer
    this.timerHandler = setInterval(function(){
        if (!paused) {
            movePlane(mapCanvas)
            redraw(mapCanvas)
            drawGraphs(pulseGraphCanvas, freqGraphCanvas, deltaFreqGraphCanvas)
            drawStats()
            time += timeInterval;
        }
    },timeInterval)
 };