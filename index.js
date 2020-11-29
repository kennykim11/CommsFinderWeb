//Assets
const img = new Image(47.7398, 47.7398)
img.src = "planeicon.svg"

//Simulation
var frame = 0
var paused = false
var alerted = false
var hitCooldown = 0
var pulsesLeftForGroup = 0
var pulseRecord = []
var lastPulseFrame = 0
var freqRecord = []
var lastFreq = 0
var deltaFreqRecord = []
var lastDeltaFreq = 0
var recordSize = 0
var planeRecord = []
var colorRecord = []
var lastColor = 'white'
var save = {}

//Assets
var pulses = []
var plane = {x: 700, y: 700, v: 0.2, heading: -Math.PI/2}
var emitter = {x: 800, y: 600}

//Settings
// pulse settings
var pulsesPerGroup = 1
var pulseInterval = 1
var pulseGroupInterval = 20
const radiusGrowth = 1
const radiusTimeout = 500
// simulation settings
const timeInterval = 5
const estimatedMaxFreq = 0.06
const estimatedMinFreq = 0.04
// graph settings
const pulseColor = 'red'
const freqColor = 'green'
const deltaFreqColor = 'blue'
// save settings
const saveInterval = 2000

function checkCollision(plane, pulse) {
    //Sees if pulse hit the plane, use collisionRadius
    const rLessThanPlane = pulse.radius < Math.sqrt((plane.x - pulse.startX)**2 + (plane.y - pulse.startY)**2)
    if (rLessThanPlane != pulse.rLessThanPlane){
        pulse.rLessThanPlane = rLessThanPlane
        return true
    }
    return false
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

function quadraticSolver(a, b, c){
    //https://stackoverflow.com/a/33454565
    const insideRoot = Math.pow(b, 2) - (4 * a * c)
    if (insideRoot < 0) {
        alert("QUADRATIC ERROR")
        return [null]
    }
    else if (insideRoot == 0) return [b/(-2*a)]
    else {
        const result1 = (b + Math.sqrt(insideRoot)) / (-2 * a)
        const result2 = (b - Math.sqrt(insideRoot)) / (-2 * a)
        const filteredResults = [result1, result2].filter(x => x > 0).sort()
        if (filteredResults.length == 0) {console.log(`a=${a}\nb=${b}\nc=${c}\nresult1=${result1}\nresult2=${result2}`); return null}
        return filteredResults
    }
}

function calculateCollisionTime(plane, pulse){
    //Predict when the plane exactly hit the pulse
    const lastPlane = planeRecord[planeRecord.length - 1]
    const vx = plane.x - lastPlane.x //time unit is frames, not (milli)seconds
    const vy = plane.y - lastPlane.y //
    const r0 = pulse.radius - radiusGrowth
    const px = lastPlane.x - pulse.startX
    const py = lastPlane.y - pulse.startY
    const a = vx**2 + vy**2 - radiusGrowth**2
    const b = 2 * (vx*px + vy*py - radiusGrowth*r0)
    const c = px**2 + py**2 - r0**2
    const quadResult = quadraticSolver(a, b, c)
    if (quadResult == null) {console.log(`vx=${vx}\nvy=${vy}\nr0=${r0}\nradiusGrowth=${radiusGrowth}\npx=${px}\npy=${py}`); alert("Quadratic error")}
    return quadResult[0]
}

function redraw(canvas) {
    //Called every frame

    //Getting canvas ready
    const cv = canvas.getContext("2d")
    cv.clearRect(0, 0, canvas.width, canvas.height);
    
    //Drawing plane
    rotateAndDrawImage(cv, img, plane.heading + Math.PI/2, plane.x, plane.y)

    //Make a new pulse group if it's time to
    if (!(frame % pulseGroupInterval))pulsesLeftForGroup = pulsesPerGroup
    //Make a new pulse if it's time to
    if (!((frame % pulseGroupInterval) % pulseInterval) && pulsesLeftForGroup){
        pulses.push({
            createFrame: frame,
            startX: emitter.x,
            startY: emitter.y,
            rLessThanPlane: true, //whether the plane is outside the circle
            radius: 0
        })
        pulsesLeftForGroup -= 1
    }

    //Delete pulse if out of bounds
    if (pulses.length && pulses[0].radius >= radiusTimeout) pulses.shift(1) 

    cv.strokeStyle = '#AAAAAA'
    var didGetPulse = false
    for (const pulse of pulses){ //For each pulse
        //Draw
        cv.beginPath(); 
        cv.arc(pulse.startX, pulse.startY, pulse.radius, 0, 2 * Math.PI);
        cv.stroke();

        //Check for hit
        if (checkCollision(plane, pulse)) {
            didGetPulse = true
            insertToRecord(pulseRecord, 1)
            const collisionTime = calculateCollisionTime(plane, pulse)
            const currentPulseFrame = frame - 1 + collisionTime
            // console.log(time)
            // console.log(collisionTime)
            
            if (lastPulseFrame == 0){
                lastPulseFrame = currentPulseFrame
                continue
            }
            const thisFreq = 1/(currentPulseFrame - lastPulseFrame)
            insertToRecord(freqRecord, thisFreq)
            console.log(thisFreq)

            if (lastFreq == 0){
                lastFreq = thisFreq
                continue
            }
            const thisDeltaFreq = thisFreq - lastFreq
            insertToRecord(deltaFreqRecord, thisDeltaFreq)

            lastPulseFrame = currentPulseFrame
            lastFreq = thisFreq
            lastDeltaFreq = thisDeltaFreq
            lastColor = `hsla(${Math.round((((thisFreq - estimatedMinFreq) / (estimatedMaxFreq - estimatedMinFreq)) * 360))},100%,50%)`
            console.log(lastColor)
            insertToRecord(colorRecord, lastColor)

            //Save the data
            const lastPlane = planeRecord[planeRecord.length - 1]
            const dataframe = {
                frame: frame,
                freq: thisFreq,
                dFreq: thisDeltaFreq,
                pX: plane.x - lastPlane.x,
                pY: plane.y - lastPlane.y,
                pV: lastPlane.v,
                pH: lastPlane.heading,
                eX: emitter.x,
                eY: emitter.y
            }
            save[frame] = dataframe
        }

        //Expand pulse
        pulse.radius += 1 * radiusGrowth
    }

    if (!didGetPulse){
        insertToRecord(colorRecord, lastColor)
        insertToRecord(pulseRecord, 0)
        insertToRecord(freqRecord, lastFreq)
        insertToRecord(deltaFreqRecord, lastDeltaFreq)
    }

    //Draw plane path
    let planeRecordLength = planeRecord.length
    for (let i=0; i<planeRecordLength-1; i++){
        cv.beginPath();
        cv.moveTo(planeRecord[i].x, planeRecord[i].y)
        cv.strokeStyle = colorRecord[i]
        cv.lineTo(planeRecord[i+1].x, planeRecord[i+1].y)
        cv.stroke()
    }
    

    //check for save
    if (frame % saveInterval == 0 && frame != 0){
        console.log(JSON.stringify(save, function(key, val) {
            if (typeof(val) == Number){
                return Number(val.toFixed(3))
            } else return val
            }
        ))
        //window.open("data:application/json:base64," + btoa(JSON.stringify(save)))
        //Ha, the string's way too long
        alert("We saved!")
    }
}

function movePlane(canvas){
    //Move the plane to the next position
    insertToRecord(planeRecord, Object.assign({}, plane)) //Save old plane values before moving
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
        //console.log(`Color: ${graph.lineColor}, scale: ${scale}. high: ${scale * Math.max(...graph.data)}, low: ${scale * Math.min(...graph.data)}`)
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
    Delta Freq: ${fiveDecMil(lastDeltaFreq)}
    
    Current Frame: ${frame}`
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
    const graphStyle = window.getComputedStyle(deltaFreqGraphCanvas)
    pulseGraphCanvas.lineColor = pulseColor
    freqGraphCanvas.lineColor = freqColor
    deltaFreqGraphCanvas.lineColor = deltaFreqColor
    pulseGraphCanvas.data = pulseRecord
    freqGraphCanvas.data = freqRecord
    deltaFreqGraphCanvas.data = deltaFreqRecord
    pulseGraphCanvas.width = freqGraphCanvas.width = deltaFreqGraphCanvas.width = +graphStyle.width.slice(0, -2)
    pulseGraphCanvas.height = freqGraphCanvas.height = deltaFreqGraphCanvas.height = +graphStyle.height.slice(0, -2)
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
            frame++;
        }
    },timeInterval)
 };