/***** POSITION OPERATIONS *****/

var posEquals = function(p1, p2) {
    return p1[0] === p2[0] && p1[1] === p2[1];
}

var posAdd = function(p1, p2) {
    return [p1[0] + p2[0], p1[1] + p2[1]];
}

var posMultiply = function(p1, p2) {
    // if no length property, assume it's a scalar value, and multiply both
    // dimensions of the other pos by it.
    if (!p2.length)
        p2 = [p2, p2];

    return [p1[0] * p2[0], p1[1] * p2[1]];
}

var posDistance = function(start, target) {
    return Math.abs(start[0] - target[0]) + Math.abs(start[1] - target[1]);
}

var containsPos = function(l, pos) {
    return l.some(function(v) { return posEquals(pos, v); });
}

var indexOfPos = function(l, pos) {
    for (var i = 0; i < l.length; i++) {
        if (posEquals(l[i], pos))
            return i;
    }
    return -1;
}
var posClone = function(pos) {
    return [pos[0], pos[1]];
}

var occupied = function(pos, world) {
    return pos[0] < 0 || pos[1] < 0 ||
        pos[0] >= world.tile_width || pos[1] >= world.tile_height ||
        containsPos(world.obstacles, pos);
}

var adjacents = function(pos, world) {
    north = posAdd(pos, [-1, 0]);
    south = posAdd(pos, [1, 0]);
    west = posAdd(pos, [0, -1]);
    east = posAdd(pos, [0, 1]);

    return [north, west, south, east].filter(function(v) {
        return !occupied(v, world);
    });
}

/***** SEARCH FUNCTIONS *****/
var bfs = function(start, target, world) {
    var explored = [];
    var to_search = [[start]]

    while (to_search.length > 0) {
        var current_path = to_search.shift();
        var current_pos = current_path[current_path.length - 1];

        if (posEquals(current_pos, target)) {
            return [current_path, explored];
        }

        var adjs = adjacents(current_pos, world);
        for (var i = 0; i < adjs.length; i++) {
            var adj = adjs[i];

            if (containsPos(explored, adj))
                continue;

            to_search.push(current_path.concat([adj]));
            explored.push(adj);
        }
    }
    
    return null;
}

// basically the same as bfs, except we need to sort the points that we're
// going to explore next by the heuristic results.
var astar = function(start, target, world, heuristic) {
    var explored = [];
    var to_search = [[start]]

    while (to_search.length > 0) {
        var current_path = to_search.shift();
        var current_pos = current_path[current_path.length - 1];

        if (posEquals(current_pos, target))
            return [current_path, explored];

        var adjs = adjacents(current_pos, world);
        for (var i = 0; i < adjs.length; i++) {
            var adj = adjs[i];

            if (containsPos(explored, adj))
                continue;

            to_search.push(current_path.concat([adj]));
            explored.push(adj);

            // SORT BASED ON HEURISTIC
            to_search.sort(function(path1, path2) {
                var next1 = path1[path1.length - 1];
                var next2 = path2[path2.length - 1];

                return heuristic(next1, target) - heuristic(next2, target);
            })
        }
    }
    
    return null;
}

var distanceAStar = function(start, target, world) {
    return astar(start, target, world, posDistance);
}

var dfsHelper = function(current, target, world, explored) {
    if (containsPos(explored, current))
        return null;

    if (posEquals(current, target))
        return [target];
    
    explored.push(current);

    var adjs = adjacents(current, world);
    for (var i = 0; i < adjs.length; i++) {
        var adj = adjs[i];

        var adj_path = dfsHelper(adj, target, world, explored);
        if (adj_path)
            return [current].concat(adj_path);
    }
    
    return null;
}

var dfs = function(start, target, world) {
    var explored = [];
    return [dfsHelper(start, target, world, explored), explored];
}

/***** INPUT HANDLING *****/

var clicked = false;
var removeTilesMode = false;
var mousePos = [0, 0];
var keys = [];
var keysTapped = [];

window.onclick = function(e) {
    mousePos = [e.pageX, e.pageY];
    clicked = true;
}

window.onkeydown = function(e) {
    if (keys.indexOf(e.keyCode) === -1) {
        keys.push(e.keyCode);
        keysTapped.push(e.keyCode);
    }

    if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
    }
}

window.onkeyup = function(e) {
    keys.splice(keys.indexOf(e.keyCode), 1);
}

var keyTapped = function(c) {
    return keysTapped.indexOf(c.charCodeAt()) !== -1;
}

var moveOnChar = function(c, dir, obj) {
    if (keyTapped(c)) {
        obj.pos = posAdd(obj.pos, dir);
        obj.lastDir = dir;
    }
}

/***** UPDATE/DRAW LOOP *****/

window.onload = function() {
    var canvas = document.getElementById("game");
    var ctx = canvas.getContext("2d");
    var world = World(canvas.width - 200, canvas.height - 200, 30);
    world.initializeObstacles();

    setInterval(function() {
        update(world);
        draw(ctx, world);
    }, 1000 / 60);
}

var update = function(world) {
    world.monster.timer += 1000 / 60;
    if (world.monster.timer >= world.monster.move_speed) {
        world.monster.runAI(world);
        world.monster.timer = 0;
    }

    var player = world.player;
    var prevPos = player.pos;

    moveOnChar('W', [-1, 0], player);
    moveOnChar('A', [0, -1], player);
    moveOnChar('S', [1, 0], player);
    moveOnChar('D', [0, 1], player);

    if (occupied(player.pos, world)) {
        player.pos = prevPos;
    }

    // DEBUG KEYS
    if (keyTapped('C')) {
        world.showConsidered = !world.showConsidered;
    }
    if (keyTapped('X')) {
        world.showPath = !world.showPath;
    }
    if (keyTapped('B')) {
        world.monster.pathfinder = bfs;
    }
    if (keyTapped('N')) {
        world.monster.pathfinder = dfs;
    }
    if (keyTapped('M')) {
        world.monster.pathfinder = distanceAStar;
    }
    
    if (keyTapped('P')) {
        world.monster.move_speed += 100;
        console.log(world.monster.anticipation);
    }
    if (keyTapped('O')) {
        world.monster.move_speed = Math.max(0, world.monster.move_speed - 100);
    }

    if (keyTapped('R')) {
        removeTilesMode = !removeTilesMode;
    }

    if (keyTapped('U')) {
        world.monster.moving = !world.monster.moving;
    }

    // ADD/REMOVE TILES
    if (clicked) {
        var tileX = Math.floor((mousePos[0] - 10) / world.tilesize );
        var tileY = Math.floor((mousePos[1] - 10) / world.tilesize);
        var tilePos = [tileY, tileX];

        if (!(removeTilesMode || occupied(tilePos, world))) {
            world.obstacles.push(tilePos);
        } else if (removeTilesMode) {
            var index = indexOfPos(world.obstacles, tilePos);
            if (index !== -1) 
                world.obstacles.splice(index, 1);
        }

        // recompute the path to the player on the next update
        world.monster.playerPosLastUpdate = [-1, -1];

        clicked = false;
    }

    keysTapped = [];
};

var monsterRunAI = function(world) {
    var player = world.player;

    if (this.playerMovedSinceLastUpdate(world)) {
        
        this.playerPosLastUpdate = player.pos;

        // try to anticipate where the player will end up, and go there instead
        var anticipationPos = posAdd(player.pos, posMultiply(player.lastDir, this.anticipation));
        if (occupied(anticipationPos, world))
            anticipationPos = player.pos;

        var playerDistance = posDistance(player.pos, this.pos);
        var anticipationPointDistance = posDistance(anticipationPos, this.pos);
        
        var targetPos = playerDistance <= anticipationPointDistance ? player.pos : anticipationPos;

        var pathAndConsidered = this.pathfinder(this.pos, targetPos, world);
        this.path = pathAndConsidered[0];
        this.considered = pathAndConsidered[1];

        // remove the start node from the new path so the monster doesn't stay
        // in place
        this.path.shift();
    }

    if (this.moving && this.path.length > 0) {
        this.pos = this.path.shift();
    }
}

var draw = function(ctx, world) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;

    var tilesize = world.tilesize;

    for (var row = 0; row < world.tile_height; row++) {
        for (var col = 0; col < world.tile_width; col++) {
            var pos = [row, col];

            if (occupied(pos, world)) {
                ctx.fillStyle = "#aaa";
            } else if (posEquals(pos, world.monster.pos)) {
                ctx.fillStyle = world.monster.color;
            } else if (posEquals(pos, world.player.pos)) {
                ctx.fillStyle = world.player.color;
            } else if (world.showPath && containsPos(world.monster.path, pos)) {
                ctx.fillStyle = "#ffaa00";
            } else if (world.showConsidered && containsPos(world.monster.considered, pos)) {
                ctx.fillStyle = "#00aaff";
            } else {
                ctx.fillStyle = world.ground_color;
            }

            ctx.fillRect(col * tilesize, row * tilesize, tilesize, tilesize);
            ctx.strokeRect(col * tilesize, row * tilesize, tilesize, tilesize);
        }
    }

    // DRAW DEBUG INFO
    var pathfinder = world.monster.pathfinder;
    ctx.fillStyle = "#000";
    ctx.fillText("ALGORITHM: " + (pathfinder === bfs ? "BFS" : (pathfinder === dfs ? "DFS" : "A-STAR")),
        20, 620);

};

/***** WORLD INITIALIZATION *****/

var World = function(width, height, tilesize) {
    var tile_width = Math.floor(width / tilesize);
    var tile_height = Math.floor(height / tilesize);

    return {
        width: width,
        height: height,

        tile_width: tile_width,
        tile_height: tile_height,
        tilesize: tilesize,

        ground_color: "#00ff00",
        showConsidered: true,
        showPath: true,

        obstacles: [],
        initializeObstacles: function() {
            for (var i = 0; i < 14; i++) {
                var newObstaclePos = [Math.floor(Math.random() * this.tile_width),
                                      Math.floor(Math.random() * this.tile_height)];
                this.obstacles.push(newObstaclePos);
            }
        },

        player: {
            pos: [0, 0],
            color: "#0000ff",
            lastDir: [0, 0],
        },

        monster: {
            pos: [Math.floor(tile_width / 2), Math.floor(tile_height / 2)],
            color: "#ff0000",
            move_speed: 250,
            moving: true,
            timer: 0,
            anticipation: 0,
            playerPosLastUpdate: [0, 0],
            playerMovedSinceLastUpdate: function(world) { return !posEquals(world.player.pos, this.playerPosLastUpdate); },
            pathfinder: function(s, t, w) { return astar(s, t, w, posDistance) },
            // pathfinder: bfs,
            //pathfinder: dfs,
            path: [],
            considered: [],
            runAI: monsterRunAI
        }
    };
}