var AngularInterface = angular.module("MooseInvaders", []);
var audioContext = new AudioContext();
var Shooter = new Image();
Shooter.src = "img/shooter.png";
var mooseBuffer;
var outGain = audioContext.createGain();
outGain.connect(audioContext.destination);
(function () {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "audio/moose.mp3");
    xhr.onload = function (data) {
        if (xhr.status !== 200) {
            throw ("WAHH");
        }
        audioContext.decodeAudioData(data.target.response).then(function (buffer) {
            mooseBuffer = buffer;
        });
    }
    xhr.responseType = "arraybuffer";
    xhr.send();
})();

var Controller = new(function () {
    var Mooses = [];
    var MooseImage = new Image();
    var time = new Date();
    var direction = "Right";
    var mooveIter = 0;
    MooseImage.src = "img/mooseAlone.png";

    var user = {
        x: 150,
        v: 0,
        f0: false,
        f1: false
    };

    var lasers = [];

    var laserStats = {
        fires: 0,
        hits: 0
    };

    window.onkeypress = function (e) {
        if (e.key === "ArrowLeft") {
            user.v = -10;
        } else if (e.key === "ArrowRight") {
            user.v = 10;
        } else if (e.key === " ") {
            user.f0 = true;
        }
    };
    window.onkeyup = function (e) {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            user.v = 0;
        } else if (e.key === " ") {
            user.f0 = user.f1 = false;
        }
    };

    function moveMoosesHorizontal() {
        var delta = new Date();
        if ((delta - time) > 100) {
            if (direction === "Right") {
                moveMoosesRight(5);
            } else {
                moveMoosesLeft(5);
            }
            time = delta;
            var edges = Mooses.reduce(function (a, moose) {
                a.x = Math.min(a.x, moose.coords.x);
                a.y = Math.max(a.y, moose.coords.y);
                return a;
            }, {
                x: window.innerWidth,
                y: 0
            });
            if (direction == "Right" && a.y >= (window.innerWidth - 100)) {
                direction = "Left";
            } else if (direction == "Left" && a.x <= 100) {
                direction = "Right";
            }
        }
    }

    function moveMoosesRight(s) {
        Mooses.forEach(function (m) {
            m.moveRight(s);
        });
    }

    function moveMoosesLeft(s) {
        Mooses.forEach(function (m) {
            m.moveLeft(s);
        });
    }

    Object.defineProperties(this, {
        "mooses": {
            "value": Mooses
        },
        "drawMoose": {
            "value": function (ctx) {
                var count = 0;
                for (var i = 0; i < Mooses.length; i++) {
                    if (Mooses[i].hp > 0) {
                        var coords = Mooses[i].coords;
                        count++;
                        ctx.drawImage(MooseImage, coords.x, coords.y, coords.w, coords.h);
                    }
                }
                moveMoosesHorizontal();
                return count;
            }
        },
        "drawUser": {
            "value": function (ctx) {
                user.x += user.v;
                ctx.drawImage(Shooter, user.x, ctx.canvas.height - 50, 40, 30);
                if (user.f0 && !user.f1) {
                    user.f1 = true;
                    var c = user.x + 20;
                    lasers.push({
                        x: c,
                        y: ctx.canvas.height - 50
                    });
                    laserStats.fires += 1;
                }
            }
        },
        "drawLasers": {
            "value": function (ctx) {
                for (var i = 0; i < lasers.length; i++) {
                    var collision = false;
                    lasers[i].y -= 10;
                    var y = lasers[i].y;
                    var x = lasers[i].x;
                    for (var m = 0; m < Mooses.length; m++) {
                        collision = Mooses[m].checkInBounds(x, y);
                        if (collision) {
                            Mooses[m].hit(20);
                            laserStats.hits += 1;
                            break;
                        }
                    }
                    if (lasers[i].y <= 0 || collision) {
                        lasers.splice(i, 1);
                    } else {
                        ctx.save();
                        ctx.strokeStyle = "#ff0000";
                        ctx.beginPath();
                        ctx.moveTo(x, y);
                        ctx.lineTo(x, y + 20);
                        ctx.stroke();
                        ctx.restore();
                    }
                }
            }
        },
        "mooveUser": {
            "value": function (p) {
                var x = user.x + p;
                user.x = Math.max(0, Math.min(x, 1000));
            }
        },
        "stats": {
            "get": function () {
                return {
                    fired: laserStats.fires,
                    hits: laserStats.hits
                };
            }
        }
    });
})();

var MooseSprite = function (x, y, w, h, hp) {

    function dead() {
        var bufferSource;
        if (mooseBuffer) {
            bufferSource = audioContext.createBufferSource();
            bufferSource.buffer = mooseBuffer;
            bufferSource.connect(outGain);
            bufferSource.oneneded = function () {
                bufferSource = undefined;
            }
            bufferSource.start(0);
        }
    }
    Object.defineProperties(this, {
        "moveRight": {
            "value": function (p) {
                x += p;
                return x;
            }
        },
        "moveLeft": {
            "value": function (p) {
                x -= p;
                return x;
            }
        },
        "coords": {
            "get": function () {
                return {
                    x: x,
                    y: y,
                    w: w,
                    h: h
                };
            }
        },
        "hp": {
            "get": function () {
                return hp;
            }
        },
        "hit": {
            "value": function (cost) {
                hp -= cost;
                if (hp <= 0) {
                    dead();
                }
                return hp;
            }
        },
        "checkInBounds": {
            "value": function (dx, dy) {
                if (hp <= 0) {
                    return false;
                }
                return (dx >= x && dx <= x + w && dy >= y && dy <= y + h);
            }
        }
    });
};

AngularInterface.controller("window", ["$scope", "$window", "$element", function ($s, $w, $e) {
    $s.width = $w.innerWidth;
    $s.height = $w.innerHeight;
}]);

for (var y = 50; y < window.innerHeight - 400; y += 100) {
    for (var x = 50; x < window.innerWidth - 400; x += 100) {
        Controller.mooses.push(new MooseSprite(x, y, 50, 43, 50));
    }
}

function draw() {
    var canv = document.getElementById('canvas');
    var ctx = canv.getContext('2d');

    ctx.globalCompositeOperation = 'destination-over';
    ctx.clearRect(0, 0, canv.width, canv.height); // clear canvas

    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.strokeStyle = 'rgba(0, 153, 255, 0.4)';

    var num_moose = Controller.drawMoose(ctx);
    Controller.drawUser(ctx);
    Controller.drawLasers(ctx);

    //ctx.fillRect(50, 50, 100, 100);
    if (num_moose > 0) {
        window.requestAnimationFrame(draw);
    } else {
        window.requestAnimationFrame(gameOver);
    }
}

function gameOver() {
    var canv = document.getElementById('canvas');
    var ctx = canv.getContext('2d');
    var stats = Controller.stats;
    var ratio = stats.hits / stats.fired;

    ctx.globalCompositeOperation = 'destination-over';
    ctx.clearRect(0, 0, canv.width, canv.height); // clear canvas

    ctx.fillStyle = '#00ff00';
    ctx.strokeStyle = '#00ff00';

    ctx.textAlign = "center";
    ctx.font = "50px monospace";
    ctx.fillText("Game Over!", canvas.width / 2, 250);
    ctx.fillText("Fired: " + stats.fired, canvas.width / 2, 350);
    ctx.fillText("Hits: " + stats.hits, canvas.width / 2, 450);
    var message;
    if (ratio < 0.4) {
        message = "Spray and Pray";
    } else if (ratio < 0.6) {
        message = "Noober";
    } else if (ratio < 0.8) {
        message = "Apprentice";
    } else if (ratio < 0.9) {
        message = "Let the hate consume you";
    } else {
        message = "Moose Slayer!";
    }
    ctx.fillText(message, canvas.width / 2, 650);

    Controller.drawUser(ctx);
    ctx.stroke();
}


window.onload = function () {
    window.requestAnimationFrame(draw);
};
