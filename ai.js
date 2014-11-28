/***** POSITION OPERATIONS *****/
var occupied = function(pos, world) {
    return pos[0] < 0 || pos[1] < 0 ||
        pos[0] >= world.tile_height || pos[1] >= world.tile_width ||
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
    // explored is a list of all the tiles we've previously explored
    var explored = [];

    // to_search is a list of paths that we're currently searching for the
    // target on
    var to_search = [[start]]

    // while we haven't exhausted all of our options
    while (to_search.length > 0) {

        // get the next path to explore from the beginning of the list,
        // i.e. the oldest unexplored paths added to the list
        var current_path = to_search.shift();

        // the latest position on the path is the last element
        var current_pos = current_path[current_path.length - 1];

        // did we find the target?
        if (posEquals(current_pos, target)) {

            // return both the path to the target, and the list of explored
            // paths for reference. the latter is useful if we want to pick
            // a suboptimal path, or just display all the paths searched.
            return [current_path, explored];
        }

        // we didn't find the target, so grab all the adjacent positions
        // and explore those
        var adjs = adjacents(current_pos, world);
        for (var i = 0; i < adjs.length; i++) {
            var adj = adjs[i];

            // make sure we haven't explored this position before or we'll
            // infinitely loop if the target can't be found
            if (containsPos(explored, adj))
                continue;

            // add the new path to explore to the end of the search list, so
            // we don't explore it until after we've checked all the other
            // paths currently in our list
            to_search.push(current_path.concat([adj]));

            // mark this node as explored, so we don't explore it again later
            explored.push(adj);
        }
    }
    
    // we couldn't find the target, so no path exists.
    return [null, explored];
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

            // SORT PATHS TO EXPLORE NEXT BASED ON HEURISTIC
            to_search.sort(function(path1, path2) {
                var next1 = path1[path1.length - 1];
                var next2 = path2[path2.length - 1];

                return heuristic(next1, target) - heuristic(next2, target);
            })
        }
    }
    
    return [null, explored];
}

var distanceAStar = function(start, target, world) {
    return astar(start, target, world, posDistance);
}

var dfsRecursive = function(current, target, world, explored) {
    // make sure we haven't explored this position before
    if (containsPos(explored, current))
        return null;

    // check if we found the target
    if (posEquals(current, target))
        return [target];
    
    // mark this node as explored, so we don't check it later
    explored.push(current);

    // go through all the adjacent positions and explore them recursively.
    // Note that since adjacents always returns nodes in the same order of
    // direction, this will exhaust one direction until it can't explore
    // that direction anymore.
    var adjs = adjacents(current, world);
    for (var i = 0; i < adjs.length; i++) {
        var adj = adjs[i];

        // see if there's a path to the target from this adjacent node
        var adj_path = dfsRecursive(adj, target, world, explored);
        if (adj_path)
            return [current].concat(adj_path);
    }
    
    // no path exists from this node
    return null;
}

var dfs = function(start, target, world) {
    var explored = [];

    // explore recursively, bringing the results of what we explored
    // into the explored array so we can reference it later to see the
    // paths that were explored.
    return [dfsRecursive(start, target, world, explored), explored];
}

/***** INPUT HANDLING *****/
var moveOnChar = function(c, dir, obj) {
    if (keyTapped(c)) {
        obj.pos = posAdd(obj.pos, dir);
        obj.lastDir = dir;
    }
}

/***** INITIALIZATION + UPDATE/DRAW LOOP *****/

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
                var newObstaclePos = [Math.floor(Math.random() * this.tile_height),
                                      Math.floor(Math.random() * this.tile_width)];
                this.obstacles.push(newObstaclePos);
            }
        },

        player: {
            pos: [0, 0],
            color: "#0000ff",
            lastDir: [0, 0],
        },

        monster: {
            pos: [Math.floor(tile_height / 2), Math.floor(tile_width / 2)],
            color: "#ff0000",
            move_time: 250,
            moving: true,
            timer: 0,

            playerPosLastUpdate: [0, 0],
            playerMovedSinceLastUpdate: function(world) {
                return !posEquals(world.player.pos, this.playerPosLastUpdate);
            },

            // a pathfinder function is any function that takes in a start
            // position, a target position, and the world and returns an array
            // in the form [pathToTargetPosition, allExploredNodes]
            pathfinder: function(s, t, w) { return astar(s, t, w, posDistance) },
            //pathfinder: bfs,
            //pathfinder: dfs,

            path: [],
            considered: [],

            // AI functions take the world and update the monster accordingly.
            // Having this function as a property on the monster object allows
            // you to easily swap in different behaviors for the monster by changing
            // this function.
            runAI: monsterRunAI
        }
    };
}

var monsterRunAI = function(world) {
    var player = world.player;

    // only re-evaluate the path if the player moved since we last calculated
    // the path to them
    if (this.playerMovedSinceLastUpdate(world)) {

        this.playerPosLastUpdate = player.pos;

        var pathAndConsidered = this.pathfinder(this.pos, player.pos, world);
        this.path = pathAndConsidered[0];
        this.considered = pathAndConsidered[1];

        // remove the start node from the new path so the monster doesn't stay
        // in place
        if (this.path)
            this.path.shift();
    }

    // move the monster if we have a path and it should move
    if (this.moving && this.path && this.path.length > 0) {
        this.pos = this.path.shift();
    }
}

window.onload = function() {
    // initialize canvas
    var canvas = document.getElementById("game");
    var ctx = canvas.getContext("2d");

    // initialize the world
    var world = World(canvas.width, canvas.height - 60, 30);
    world.initializeObstacles();

    // update/render the world about(not exactly) 60 FPS
    setInterval(function() {
        update(world);
        draw(ctx, world);
    }, 1000 / 60);
}

var update = function(world) {
    // move the monster occasionally
    world.monster.timer += 1000 / 60;
    if (world.monster.timer >= world.monster.move_time) {
        world.monster.runAI(world);
        world.monster.timer = 0;
    }

    var player = world.player;
    var prevPos = player.pos;

    moveOnChar('W', [-1, 0], player);
    moveOnChar('A', [0, -1], player);
    moveOnChar('S', [1, 0], player);
    moveOnChar('D', [0, 1], player);

    // we attempted to move the player, but if they've hit an obstacle
    // return them to where they were before they moved.
    if (occupied(player.pos, world)) {
        player.pos = prevPos;
    }

    // DEBUG KEYS -- USED TO CONTROL SEARCH ALGORITHM + DEBUG INFO FOR DEMO
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

    if (keyTapped('O')) {
        world.monster.move_time += 100;
    }
    if (keyTapped('P')) {
        world.monster.move_time = Math.max(0, world.monster.move_time - 100);
    }

    if (keyTapped('R')) {
        removeTilesMode = !removeTilesMode;
    }

    if (keyTapped('U')) {
        world.monster.moving = !world.monster.moving;
    }

    // ADD/REMOVE TILES
    if (clicked) {
        var tileY = Math.floor((mousePos[0] - 14) / world.tilesize);
        var tileX = Math.floor((mousePos[1] - 11) / world.tilesize);
        var tilePos = [tileY, tileX];

        if (!(removeTilesMode || occupied(tilePos, world))) {
            world.obstacles.push(tilePos);
        } else if (removeTilesMode) {
            var index = indexOfPos(world.obstacles, tilePos);
            if (index !== -1) 
                world.obstacles.splice(index, 1);
        }

        // recompute the path to the player on the next update, since we added
        // or removed a tile which might mess with the monster's path
        world.monster.playerPosLastUpdate = [-1, -1];
    }

    // reset per-frame input trackers
    clicked = false;
    keysTapped = [];
};

var draw = function(ctx, world) {
    // need to clear the previous frame
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // stroke everything black
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;

    var tilesize = world.tilesize;

    // draw each tile
    for (var row = 0; row < world.tile_height; row++) {
        for (var col = 0; col < world.tile_width; col++) {
            var pos = [row, col];

            // shade tiles different colors depending on their properties
            if (occupied(pos, world)) {
                ctx.fillStyle = "#aaa";
            } else if (posEquals(pos, world.monster.pos)) {
                ctx.fillStyle = world.monster.color;
            } else if (posEquals(pos, world.player.pos)) {
                ctx.fillStyle = world.player.color;
            } else if (world.showPath && world.monster.path && containsPos(world.monster.path, pos)) {
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
        20, world.height + 20);
};

