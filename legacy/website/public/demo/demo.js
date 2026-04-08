// PARAMETERS
const canvas = document.getElementById("mainCanvas");
const mouseCanvas = document.getElementById("mouseCanvas")
const perfectPathCanvas = document.getElementById("pathCanvas")

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
mouseCanvas.width = window.innerWidth;
mouseCanvas.height = window.innerHeight;
perfectPathCanvas.width = window.innerWidth;
perfectPathCanvas.height = window.innerHeight;

const ctx = canvas.getContext("2d");
const mouseCtx = mouseCanvas.getContext("2d");
const perfectPathCtx = perfectPathCanvas.getContext("2d")

ctx.lineWidth = 1;
ctx.strokeStyle = "black";

let innerSize = 110;
let outerSize = innerSize * 1.7;

const borderX = canvas.width / 2;
const borderY = canvas.height / 2;

const startSize = (outerSize - innerSize) / 6;
const targetHeight = 200;
const targetWidth = 20
const leftCircleX = canvas.width / 2 - innerSize - (outerSize - innerSize) / 2;

let data = [];
let accuracy = 0;
let timingAccuracy = 0;
let blockAccuracy = 0;
let allAccuracies = [];
let completed = false;
let training = false;
let experimentDay = 0;
let clickedDayNumber = 0
let timerColor = '#66FF99'

const demoRoundPage = document.getElementById("DemoRound")
const demoPageHeading = demoRoundPage.getElementsByTagName('h1')[0];
const demoPageDesc = document.getElementById('DemoRoundDesc').getElementsByTagName('p')[0]; 

const gameTimer = document.getElementById("timer")
const gameRound = document.getElementById("round");
const goalTime = document.getElementById("goalTime");

gameTimer.style.display = "none"
gameRound.style.display = "none" 
goalTime.style.display = "none"

let angle = 0 // degrees 
let radAngle = 0
let rotatedLeftX = 0
let rotatedLeftY = 0

let rotatedRightX = 0
let rotatedRightY = 0

let gameOver = false

const updateTimerAndRoundPosition = () => {
  const borderY = window.innerHeight / 2;
  gameTimer.style.top = `${borderY - targetHeight * 1.5}px`;
  goalTime.style.top = `${borderY - targetHeight * 1.8}px`;
  gameRound.style.top = `${borderY - targetHeight * 2.1}px`;
};

updateTimerAndRoundPosition();
window.addEventListener('resize', updateTimerAndRoundPosition);
window.addEventListener('zoom', updateTimerAndRoundPosition);

// MAIN PAGE
document.addEventListener("DOMContentLoaded", async function () {
  await instructions();
  await demoPage();
  await demoGame();

  gameOver = true
  document.exitPointerLock()
  document.removeEventListener("mousemove", drawMouse, false);
  mouseCtx.clearRect(0, 0, mouseCanvas.width, mouseCanvas.height);
  gameRound.style.display = "none";
  gameTimer.style.display = "none";
  goalTime.style.display = "none";

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = "rgb(211, 211, 211)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  document.getElementById("GameOverDemo").style.display = "flex";
});

async function instructions() {
  return new Promise(async (resolve) => {
    const Instructions = document.getElementById("MovementInstructions");
    Instructions.style.display = "flex";

    function handleEnterPress(event) {
      if (event.key === "Enter") {
        document.removeEventListener("keydown", handleEnterPress);
        Instructions.style.display = "none";
        resolve();
      }
    }

    document.addEventListener("keydown", handleEnterPress);
  });
}

// MOUSE CALIBRATION
canvas.requestPointerLock = canvas.requestPointerLock ||
                            canvas.mozRequestPointerLock ||
                            canvas.webkitRequestPointerLock;

document.exitPointerLock = document.exitPointerLock ||
                           document.mozExitPointerLock ||
                           document.webkitExitPointerLock;
                                          
async function lockPointer() {
  return new Promise((resolve) => {
    const clickHandler = async () => {
      await canvas.requestPointerLock({unadjustedMovement: true});
      resolve();
      document.removeEventListener("click", clickHandler);
    };

    setTimeout(() => {
      document.addEventListener("click", clickHandler);
    }, 5000);
  });
}

async function lockChange() {
  if(document.pointerLockElement === canvas ||
     document.mozPointerLockElement === canvas ||
     document.webkitPointerLockElement === canvas) {
      // pointer locked
      document.getElementById('MouseOverlay').style.display = 'none'
      document.addEventListener("mousemove", drawMouse, false);
    } else {
      // pointer unlocked
      if (gameOver == false) {
        document.getElementById('MouseOverlay').style.display = 'flex';
        document.removeEventListener("mousemove", drawMouse, false);
        mouseCtx.clearRect(0, 0, mouseCanvas.width, mouseCanvas.height);
        await lockPointer();
      }
    }
}

function requestLock() {
  canvas.requestPointerLock({unadjustedMovement: true});
  document.addEventListener('pointerlockchange', lockChange, false);
  document.addEventListener('mozpointerlockchange', lockChange, false);
  document.addEventListener('webkitpointerlockchange', lockChange, false);
}

var actualX, actualY
document.addEventListener('mousemove', function(e){
  actualX = e.screenX
  actualY = e.screenY;
}, false);

let mouseX = mouseCanvas.width/2;
let mouseY = mouseCanvas.height/2;
let prevMouseX = mouseCanvas.width/2;
let prevMouseY = mouseCanvas.height/2;
let animation;
let scaleFactor = 2.4
function drawMouse(e) {
  if (e) {
    prevMouseX = mouseX;
    prevMouseY = mouseY;
    mouseX += e.movementX*scaleFactor;
    mouseY += e.movementY*scaleFactor;
  }

  mouseX = Math.max(0, Math.min(mouseX, mouseCanvas.width));
  mouseY = Math.max(0, Math.min(mouseY, mouseCanvas.height));

  mouseCtx.clearRect(0, 0, mouseCanvas.width, mouseCanvas.height);

  if (!animation) {
    animation = requestAnimationFrame(function () {
      animation = null;

      mouseCtx.fillStyle = 'white';
      mouseCtx.strokeStyle = 'black';
      mouseCtx.lineWidth = 2;

      mouseCtx.beginPath();
      mouseCtx.arc(mouseX, mouseY, 5, 0, 2 * Math.PI, true);
      mouseCtx.fill();
      mouseCtx.stroke();
    });
  }
}

// DEMO
const demoTimes = [
  { min: 800, max: 1200 },
  { min: 800, max: 1200 },
  { min: 800, max: 1200 },
  { min: 800, max: 1200 },
  { min: 800, max: 1200 },

  { min: 640, max: 960 },
  { min: 640, max: 960 },
  { min: 640, max: 960 },
  { min: 640, max: 960 },
  { min: 640, max: 960 },

  { min: 400, max: 600 },
  { min: 400, max: 600 },
  { min: 400, max: 600 },
  { min: 400, max: 600 },
  { min: 400, max: 600 },

  { min: 240, max: 420 },
  { min: 240, max: 420 },
  { min: 240, max: 420 },
  { min: 240, max: 420 },
  { min: 240, max: 420 },
];

const numBlocks = 4
const numTrials = 5

async function demoPage() {
  return new Promise(async (resolve) => {
    const Demo = document.getElementById("Demo");
    Demo.style.display = "flex";

    function handleEnterPress(event) {
      if (event.key === "Enter") {
        document.removeEventListener("keydown", handleEnterPress);
        Demo.style.display = "none";
        resolve();
      }
    }

    document.addEventListener("keydown", handleEnterPress);
  });
}

async function demoGame() {
  return new Promise(async (resolve) => {
    let round = 0;
    let score = 0;

    for (let b = 0; b < numBlocks; b++) {
        perfectPathCtx.clearRect(0, 0, canvas.width, canvas.height);
        demoPageHeading.textContent = `Demo Round ${b+1}`;
        if (b == 0) {
          demoPageDesc.innerHTML = `5 movements, goal time of ${demoTimes[round].min} - ${demoTimes[round].max}ms`;
        }
        else {
          demoPageDesc.innerHTML = `Accuracy so far: <b>${(score/round).toFixed(2)}%</b><br> Next round: 5 movements, goal time of ${demoTimes[round].min} - ${demoTimes[round].max}ms`;
        }

        gameRound.style.display = "none";
        gameTimer.style.display = "none";
        goalTime.style.display = "none";
        await demoRoundStart();
        gameRound.style.display = "flex";
        gameTimer.style.display = "flex";
        goalTime.style.display = "flex";
  
        for (let t = 0; t < numTrials; t++) {
          if (t%2 == 0) {
            angle = 0
          } else {
            angle = 90
          }
  
          gameRound.textContent = `Movements Remaining: ${numTrials-t}`;
  
          goalTime.textContent = `Your Goal Time:  ${demoTimes[round].min} - ${demoTimes[round].max} ms`
          gameTimer.textContent = `Your Movement Time: 0 ms`;
          goalTime.style.color = 'white'
          gameTimer.style.color = 'white'
          
          displayBoundary();
          await beginRound( (demoTimes[round].min + demoTimes[round].max) / 2);
          data = await beginDraw(demoTimes[round].min, demoTimes[round].max);
  
          let time = parseFloat(data["time"]);

          if (data["completed"] == true && (time*1000) >= demoTimes[round].min - 200 && (time*1000) <= demoTimes[round].max + 200) {
            await drawPath(data["data"]);
          }

          accuracy = calculateAccuracy(data["data"]);
          await displayAccuracy(data["data"], data["time"], demoTimes[round].min, demoTimes[round].max);

          if (data["completed"] == true) {
            score += accuracy
          }
          else {
            score += 25
          }
          
          round++
        }
      }

  gameRound.style.display = "none";
  gameTimer.style.display = "none";
  goalTime.style.display = "none";
  perfectPathCtx.clearRect(0, 0, canvas.width, canvas.height);

  document.getElementById("FinishScreenDemo").innerHTML = `<p>Final Accuracy: <b>${(score/round).toFixed(2)}%</b><br>Thanks for trying the experiment!</p>`
  resolve();
  });
}

function demoRoundStart() {
  return new Promise(async (resolve) => {
    ctx.fillStyle = "rgb(211, 211, 211)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    demoRoundPage.style.display = "flex";
    
    function handleEnterPress(event) {
      if (event.key === "Enter") {
        document.removeEventListener("keydown", handleEnterPress);
        demoRoundPage.style.display = "none";
        resolve();
      }
    }

    document.addEventListener("keydown", handleEnterPress);
  });
}

// GAME
function lineToAngle(ctx, x1, y1, length, ang) {
  var angle = (ang - 90) * Math.PI / 180;
  var x2 = x1 - length * Math.cos(angle),
      y2 = y1 - length * Math.sin(angle);

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.fill();

  return {
    x: x2,
    y: y2
  };
}

function displayBoundary() {
  perfectPathCtx.clearRect(0, 0, canvas.width, canvas.height);

  document.documentElement.style.setProperty('--borderX', `${borderX}px`);
  document.documentElement.style.setProperty('--borderY', `${borderY}px`);
  document.documentElement.style.setProperty('--outerSize', `${outerSize}px`);  
  document.documentElement.style.setProperty('--diameter', `${outerSize-innerSize}px`); 

  ctx.setLineDash([]);
  ctx.lineWidth = 1;
  ctx.strokeStyle = "black";

  ctx.fillStyle = "rgb(211, 211, 211)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  radAngle = angle * (Math.PI / 180);
  rotatedLeftX = borderX + (leftCircleX - borderX) * Math.cos(radAngle)
  rotatedLeftY = borderY + (leftCircleX - borderX) * Math.sin(radAngle)

  let radAngleRight = radAngle + Math.PI;
  rotatedRightX = borderX + (leftCircleX - borderX) * Math.cos(radAngleRight)
  rotatedRightY = borderY + (leftCircleX - borderX) * Math.sin(radAngleRight)

  // display start circle
  ctx.fillStyle = "rgb(115, 147, 179)";
  ctx.beginPath();
  ctx.arc(rotatedLeftX, rotatedLeftY, startSize, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();

  // display end target
  const colors = ['#ff4545', '#ffa535', '#ffe233', '#b8dd28', '#58e32c', '#b8dd28', '#ffe233', '#ffa535', '#ff4545'];
  const numRings = colors.length;
  const ringHeight = targetHeight / numRings;

  ctx.save();
  ctx.translate(rotatedRightX, rotatedRightY);
  ctx.rotate(angle*Math.PI/180+Math.PI/2);
  for (let i = 0; i < numRings; i++) {
    ctx.fillStyle = colors[i];
    ctx.fillRect(-targetWidth / 2, -targetHeight / 2 + ringHeight * i, targetWidth, ringHeight);
    ctx.strokeRect(-targetWidth / 2, -targetHeight / 2 + ringHeight * i, targetWidth, ringHeight);
  }
  ctx.restore();

  ctx.setLineDash([3, 6]);
  ctx.strokeStyle = "black";
  ctx.lineWidth = 3;    
  ctx.beginPath();
  ctx.arc(borderX, borderY, (innerSize + outerSize)/2, radAngle + Math.PI, radAngle + Math.PI*2);
  ctx.stroke();

  ctx.setLineDash([]);
  lineToAngle(ctx, rotatedRightX, rotatedRightY, 12, angle - 45 + 180);
  lineToAngle(ctx, rotatedRightX, rotatedRightY, 12, angle + 45 + 180);

  ctx.setLineDash([]);
  ctx.lineWidth = 1;
  ctx.strokeStyle = "black";
}

function beginRound(intervalTime) {
  return new Promise(async (resolve) => {
    requestLock()
    var roundStart = false
    var isMouseInsideCircle = false;
    var mouseInCircleTime = 0;
    var intervalId;
    
    canvas.addEventListener("mousemove", function (event) {
      if (
        Math.sqrt((mouseX - rotatedLeftX) ** 2 + (mouseY - rotatedLeftY) ** 2) <=
        startSize
      ) {
        if (!isMouseInsideCircle) {
          isMouseInsideCircle = true;
          mouseInCircleTime = Date.now();
          intervalId = setInterval(checkTime, 100);
        }
      } else {
        isMouseInsideCircle = false;
        clearInterval(intervalId);
      }
    });

    async function checkTime() {
      var elapsedTime = Date.now() - mouseInCircleTime;
      if (elapsedTime >= 1000 && roundStart == false) {
        roundStart = true
        var sound = document.getElementById("readySound");

        ctx.fillStyle = "rgb(255, 0, 0)"; // red
        ctx.beginPath();
        ctx.arc(rotatedLeftX, rotatedLeftY, startSize, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        sound.play();
        await wait(intervalTime)

        if (!isMouseInsideCircle) {
          roundStart = false
          ctx.fillStyle = "rgb(115, 147, 179)";
          ctx.fill();
          ctx.stroke();
          ctx.beginPath()
          return
        }
        ctx.fillStyle = "rgb(255, 255, 102)"; // yellow
        ctx.fill();
        ctx.stroke();
        sound.currentTime = 0
        sound.play();
        await wait(intervalTime)

        if (!isMouseInsideCircle) {
          roundStart = false
          ctx.fillStyle = "rgb(115, 147, 179)";
          ctx.fill();
          ctx.stroke();
          ctx.beginPath()
          return
        }
        canvas.removeEventListener("mousemove", beginRound);

        ctx.fillStyle = "rgb(0, 255, 0)"; // green
        ctx.fill();
        ctx.stroke();
        var sound = document.getElementById("goSound");
        sound.play();
      
        clearInterval(intervalId);
        resolve();
      }
    }
  });
}  

function isMouseOnTarget(mouseX, mouseY) {
  function lineIntersect(a, b, c, d, p, q, r, s) {
    var det, gamma, lambda;
    det = (c - a) * (s - q) - (r - p) * (d - b);
    if (det === 0) {
      return false;
    } else {
      lambda = ((s - q) * (r - a) + (p - r) * (s - b)) / det;
      gamma = ((b - d) * (r - a) + (c - a) * (s - b)) / det;
      return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
    }
  };
    
  let [targetStartX, targetStartY, targetEndX, targetEndY] = [0, 0, 0, 0]
  let [targetStartX_Opposite, targetStartY_Opposite, targetEndX_Opposite, targetEndY_Opposite] = [0, 0, 0, 0]

  if (angle == 0 || angle == 180) {
    targetStartX = rotatedRightX - targetHeight/2
    targetStartY = rotatedRightY - targetWidth/2
    targetEndX = rotatedRightX + targetHeight/2
    targetEndY = rotatedRightY + targetWidth/2
    targetStartX_Opposite = rotatedRightX + targetHeight/2
    targetStartY_Opposite = rotatedRightY + targetWidth/2
    targetEndX_Opposite = rotatedRightX - targetHeight/2
    targetEndY_Opposite = rotatedRightY - targetWidth/2
  } else if (angle == 90 || angle == 270) {
    targetStartX = rotatedRightX - targetWidth/2
    targetStartY = rotatedRightY - targetHeight/2
    targetEndX = rotatedRightX + targetWidth/2
    targetEndY = rotatedRightY + targetHeight/2
    targetStartX_Opposite = rotatedRightX + targetWidth/2
    targetStartY_Opposite = rotatedRightY + targetHeight/2
    targetEndX_Opposite = rotatedRightX - targetWidth/2
    targetEndY_Opposite = rotatedRightY - targetHeight/2
  }

  return (mouseX >= targetStartX &&
          mouseX <= targetEndX &&
          mouseY >= targetStartY &&
          mouseY <= targetEndY
          ) || lineIntersect(prevMouseX, prevMouseY, mouseX, mouseY, targetStartX, targetStartY, targetEndX, targetEndY)
            || lineIntersect(prevMouseX, prevMouseY, mouseX, mouseY, targetStartX_Opposite, targetStartY_Opposite, targetEndX_Opposite, targetEndY_Opposite)
}

function beginDraw(minTime, maxTime) {
  return new Promise(async (resolve) => {
    var startTime = new Date().getTime();
    var elapsedTime = 0;
    var data = [];
    var completed = false;
    let time = 0
    let meanTime = (minTime + maxTime)/2
    let soundPlayed = false
    let roundOver = false
    let finalAnimation = false;
    let lastX = 0
    let lastY = 0

    async function gameRound() {
      elapsedTime = new Date().getTime() - startTime;
      gameTimer.style.display = "flex";

      if (elapsedTime > maxTime || elapsedTime < minTime) {
        gameTimer.innerHTML = `Your Movement Time: <span style="color: red"> &nbsp${elapsedTime} ms</span>`;
      } else {
        gameTimer.innerHTML = `Your Movement Time: <span style="color:${timerColor}"> &nbsp${elapsedTime} ms</span>`;
      }

      // draw perfect path
      let progress = elapsedTime / meanTime;
      let currentAngle = radAngle + Math.PI + progress * Math.PI;
      const perfectX = borderX + ((innerSize + outerSize) / 2) * Math.cos(currentAngle);
      const perfectY = borderY + ((innerSize + outerSize) / 2) * Math.sin(currentAngle);
      
      if(progress <= 1) {
        perfectPathCtx.lineWidth = 2;
        perfectPathCtx.clearRect(0, 0, canvas.width, canvas.height);
        perfectPathCtx.beginPath();
        perfectPathCtx.arc(perfectX, perfectY, 5, 0, 2 * Math.PI);
        perfectPathCtx.fillStyle = "lightgreen";
        perfectPathCtx.fill();
        perfectPathCtx.strokeStyle = "black";
        perfectPathCtx.stroke();

        perfectPathCtx.strokeStyle = "lightgreen";
        perfectPathCtx.lineWidth = 5;    
        perfectPathCtx.beginPath();
        perfectPathCtx.arc(borderX, borderY, (innerSize + outerSize)/2, radAngle + Math.PI, currentAngle);
        perfectPathCtx.stroke();
        lastX = perfectX
        lastY = perfectY
      } else if (finalAnimation == false) {
        perfectPathCtx.lineWidth = 5;
        lineToAngle(perfectPathCtx, rotatedRightX, rotatedRightY, 12, angle - 45 + 180);
        lineToAngle(perfectPathCtx, rotatedRightX, rotatedRightY, 12, angle + 45 + 180);

        perfectPathCtx.lineWidth = 2;
        perfectPathCtx.beginPath();
        perfectPathCtx.arc(lastX, lastY, 5, 0, 2 * Math.PI);
        perfectPathCtx.fillStyle = "lightgreen";
        perfectPathCtx.fill();
        perfectPathCtx.strokeStyle = "black";
        perfectPathCtx.stroke();
        finalAnimation = true
      }

      if (elapsedTime >= meanTime && soundPlayed == false) {
        var sound = document.getElementById("meanSound");
        sound.play();
        soundPlayed = true
      }

      data.push({
        x: mouseX - canvas.width / 2,
        y: canvas.height / 2 - mouseY, //mouseY is 0 at the top of the screen
        t: elapsedTime
      });
    
      if ( isMouseOnTarget(mouseX, mouseY) )
        {
          roundOver = true

          if (elapsedTime > maxTime || elapsedTime < minTime) {
            completed = false
          } else {
            completed = true
          }
          
          ctx.save();
          ctx.translate(rotatedRightX, rotatedRightY);
          ctx.rotate(angle*Math.PI/180+Math.PI/2);
          ctx.strokeStyle = "rgb(0, 255, 0)";
          ctx.strokeRect(-targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
          ctx.restore();
  
          time = ((new Date().getTime() - startTime) / 1000).toFixed(3);

          if (soundPlayed == false) {
            await wait(meanTime - elapsedTime)
            var sound = document.getElementById("meanSound");
            sound.play();
          }
          resolve({
            data: data,
            time: time,
            completed: completed,
          });
      } else if (roundOver == false) {
        setTimeout(gameRound, 10);
      }
    }

    gameRound();
  });
}

// ACCURACY
function calculateAccuracy(data) {
  let totalAccuracy = 0
  for (const coord of data) {
    let { x, y } = coord;
    x += canvas.width / 2;
    y += canvas.height / 2 - 2*y;
    totalAccuracy += dotAccuracy(x, y)
  }
  
  const accuracyPercentage = (totalAccuracy/data.length).toFixed(2);
  return parseFloat(accuracyPercentage);
}

function lineStraightness(points) {
  const startPoint = points[0];
  const endPoint = points[points.length - 1];

  const dx = endPoint[0] - startPoint[0];
  const dy = endPoint[1] - startPoint[1];
  const lengthSquared = dx * dx + dy * dy;

  let sumOfSquaredDistances = 0;
  points.forEach(point => {
      const px = point[0];
      const py = point[1];
      const t = ((px - startPoint[0]) * dx + (py - startPoint[1]) * dy) / lengthSquared;
      const closestPointOnLine = {
          x: startPoint[0] + t * dx,
          y: startPoint[1] + t * dy
      };
      const distance = Math.sqrt((px - closestPointOnLine.x) ** 2 + (py - closestPointOnLine.y) ** 2);
      sumOfSquaredDistances += distance ** 2;
  });

  return Math.sqrt(sumOfSquaredDistances / points.length);
}

function displayAccuracy(data, time, minTime, maxTime) {
  return new Promise((resolve) => {
    time *= 1000;
    let mean = (minTime + maxTime)/2
    timingAccuracy = 50 * (1 + (1 - (3 * Math.abs(time - mean) / (maxTime - minTime))));

    const points = data.map(point => [point.x, point.y]);
    const straightness = lineStraightness(points)
    const minStraightness = 25

    const display = document.getElementById("DemoFeedback");
    const feedback = document.getElementById("demoF");
    if (straightness <= minStraightness) {
      feedback.textContent = `Straight Line Detected! 5s Timeout Penalty`;
      display.style.display = "flex";
      setTimeout(() => {
      display.style.display = "none";
          resolve();
      }, 5000);
    }
    else if (time < minTime - 200) {
      feedback.textContent = `Move Slower! 3s Timeout Penalty`;
      display.style.display = "flex";
      setTimeout(() => {
        display.style.display = "none";
        resolve();
      }, 3000);
    } 
    else if (time > maxTime + 200) {
      feedback.textContent = `Move Faster! 3s Timeout Penalty`;
      display.style.display = "flex";
      setTimeout(() => {
        display.style.display = "none";
        resolve();
      }, 3000);
    } 
    else {
      resolve();
    }
  });
}

// HELPER
function dotAccuracy(x, y) {
  const dx = x - borderX;
  const dy = y - borderY;
  const distToCenter = Math.sqrt(dx**2 + dy**2);
  const radius = (innerSize + outerSize)/2
  
  let dotAngle = Math.atan2(dy, dx) + Math.PI;
  let radAngleStart =  angle * (Math.PI / 180);
  let radAngleEnd = radAngle + Math.PI;
  if (radAngleEnd > 2*Math.PI && dotAngle >= 0 && dotAngle <= 1/2*Math.PI) {
    dotAngle += 2*Math.PI
  }
  
  // we consider a 1px difference as an error of 3%
  if (dotAngle >= radAngleStart && dotAngle <= radAngleEnd) {
      return Math.max(100 - Math.abs(radius - distToCenter)*1.5, 0);
  } else {
      let distanceToStart = Math.sqrt( (x - rotatedLeftX)**2 + (y - rotatedLeftY)**2 )
      let distanceToEnd = Math.sqrt( (x - rotatedRightX)**2 + (y - rotatedRightY)**2 );
      return Math.max(100 - distanceToStart, 100 - distanceToEnd, 0);
  }
}

const colorScale = chroma.scale(['#58e32c', '#b8dd28', '#ffe233', '#ffa535', '#ff4545']).domain([100, 0]);
function drawPath(data) {
  return new Promise(async (resolve) => {
    for (const coord of data) {
      let { x, y } = coord;
      x += canvas.width / 2;
      y += canvas.height / 2 - 2*y;

      perfectPathCtx.strokeStyle = "black";
      perfectPathCtx.lineWidth = 1;   
      perfectPathCtx.fillStyle = colorScale(dotAccuracy(x, y)).hex();
      perfectPathCtx.beginPath();
      perfectPathCtx.arc(x, y, 3, 0, 2 * Math.PI);
      perfectPathCtx.fill();
      perfectPathCtx.stroke();
    }
    await wait(1000);
    resolve();
  });
}

function getRandomNum(min, max) {
  return Math.random() * (max - min + 1) + min;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}