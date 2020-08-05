var img = new Image()
img.src = "planeicon.svg"

window.onload = function(){
    const canvas = document.getElementById("mapCanvas");
    var cv = canvas.getContext("2d");

    {
        console.log(canvas)
        cv.fillStyle = "white";
        cv.fillRect(0, 0, canvas.width, canvas.height);
        cv.drawImage(img, 10, 10)
    }
 };