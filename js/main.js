/*global Phaser Peer*/

// reference - http://mrmine.com/

var game, peer, conn, server = true;

var me = {
    sprite: null,
    encodedState: null
};

var friend = {
    sprite: null,
    decodedState: null
};

var ground = null;

var stateBinarySchema = [
    'left',
    'right',
    'up',
    'down'
];

// converts 1 and 0 strings to user friendly objects
// this makes it a lot faster to transfer data between clients 
// (opposed to sending a JSON object which is much larger)
var Binary = {
    // takes an array of booleans and converts them to a string of 1's and 0's
    encode: function(data) {
        var str = "";
        
        for(var i = 0; i < data.length; i++) {
            str += (data[i]) ? "1" : "0";
        }
        
        return str;
    },
    // returns an object that maps 'data' to 'schema'
    decode: function(schema, data) {
        if(schema.length != data.length)
            throw new Error("'Binary.decode' scheme.length must equal data.length!");
        
        var obj = {};
        
        for(var i = 0; i < schema.length; i++) {
            obj[schema[i]] = (data[i] == "1") ? true : false;
        }
        
        return obj;
    }
};

function sendMessage() {
    if(conn) {
        var $connect = document.getElementById("message");
        document.getElementById("messages").value += peer.id + ": " + $connect.value + "\n";
        conn.send({
            'message': $connect.value
        });
        $connect.value = "";
    }
}

function onConnection() {
    console.log('Connected!');
    
    document.getElementById("send").style.display = "block";
    
    conn.on('data', function(data) {
        // its a message, append it to the messages textarea
        if(data.message) {
            document.getElementById("messages").value += conn.peer + ": " + data.message + "\n";
        }
        
        // only the server should ever get this message
        if(server && data.state) {
            console.log(data.state);
            friend.decodedState = Binary.decode(stateBinarySchema, data.state);
        }
        
        // only the client should ever get position info
        if(!server) {
            
            if(me.sprite && data.me && data.me.x && data.me.y) {
                me.sprite.position.x = data.me.x;
                me.sprite.position.y = data.me.y;
            }
            if(friend.sprite && data.friend && data.friend.x && data.friend.y) {
                friend.sprite.position.x = data.friend.x;
                friend.sprite.position.y = data.friend.y;
            }
            
        }
    });
    
    game = new Phaser.Game(480, 320, Phaser.AUTO, 'MiningGame', playState);
}

function connect() {

    var yourName = document.getElementById("yourName").value;
    var friendsName = document.getElementById("friendsName").value;

    if(yourName != '') {
        peer = new Peer(yourName, {key: '55sj0os1x512a9k9'});
        
        document.getElementById("connect").style.display = "none";
        
        // we want to be the client
        if(friendsName != '') {
            server = false;
            conn = peer.connect(friendsName);
            conn.on('open', function(){
                onConnection();
            });
        }
        // we want to be the server
        else {
            server = true;
            peer.on('connection', function(connection){
                conn = connection;
                onConnection();
            });
        }
    }
    else {
        alert('Please give yoself a name!');
    }
}

var playState = {
    
    preload: function() {
        game.load.atlasJSONHash('miningTextures', 'assets/textures/miningTextures.png', 'assets/textures/miningTextures.json');
    },
    
    create: function() {
        game.stage.disableVisibilityChange = true;
        
        me.sprite = game.add.sprite(240, 160, 'miningTextures');
        me.sprite.animations.add('idle', [0], 15, false);
        me.sprite.animations.play('idle', 15, false);
        
        friend.sprite = game.add.sprite(272, 160, 'miningTextures');
        friend.sprite.animations.add('idle', [0], 15, false);
        friend.sprite.animations.play('idle', 15, false);
        
        ground = game.add.sprite(0, 192, 'miningTextures');
        ground.width = 800;
        ground.animations.add('ground', [1], 15, false);
        ground.animations.play('ground', 15, false);
        
        // only the server simulates physics
        if(server) {
            
            // setup global physics properties 
            game.physics.startSystem(Phaser.Physics.ARCADE);
            game.physics.arcade.gravity.y = 250;
            
            // setup physics for me
            me.sprite.anchor.setTo(0, 0);
            me.sprite.smoothed = false;
            game.physics.arcade.enable(me.sprite);
            me.sprite.body.collideWorldBounds = true;
            me.sprite.body.setSize(32, 32, 0, 0);
            me.sprite.body.gravity = new Phaser.Point(0, 9.6);
            
            // setup physics for friend
            friend.sprite.anchor.setTo(0, 0);
            friend.sprite.smoothed = false;
            game.physics.arcade.enable(friend.sprite);
            friend.sprite.body.collideWorldBounds = true;
            friend.sprite.body.setSize(32, 32, 0, 0);
            friend.sprite.body.gravity = new Phaser.Point(0, 9.6);
            
            game.physics.arcade.enable(ground);
            ground.body.setSize(800, 200, 0, 0);
            ground.body.immovable = true;
            ground.body.allowGravity = false;
        }
    },
    
    update: function() {
        
        var left = game.input.keyboard.isDown(Phaser.Keyboard.LEFT);
        var right = game.input.keyboard.isDown(Phaser.Keyboard.RIGHT);
        var up = game.input.keyboard.isDown(Phaser.Keyboard.UP);
        var down = game.input.keyboard.isDown(Phaser.Keyboard.DOWN);
        var space = game.input.keyboard.justPressed(Phaser.Keyboard.SPACEBAR);
        
        if(server) {
            
            game.physics.arcade.collide(me.sprite, ground);
            game.physics.arcade.collide(friend.sprite, ground);
            game.physics.arcade.collide(me.sprite, friend.sprite);
            
            if(left) {
                me.sprite.body.velocity.x -= 10;
            }
            if(right) {
                me.sprite.body.velocity.x += 10;
            }
            if(up) {
                me.sprite.body.velocity.y -= 200;
            }
            
            if(friend.decodedState) {
                if(friend.decodedState.left) {
                    friend.sprite.body.velocity.x -= 10;
                }
                if(friend.decodedState.right) {
                    friend.sprite.body.velocity.x += 10;
                }
                if(friend.decodedState.up) {
                    friend.sprite.body.velocity.y -= 200;
                }
            }
            
            conn.send({
                // me is friend
                me: {
                    x: friend.sprite.position.x,
                    y: friend.sprite.position.y
                },
                // friend is me
                friend: {
                    x: me.sprite.position.x,
                    y: me.sprite.position.y
                }
            });
            
        }
        else {
            
            var state = Binary.encode([left, right, up, down]);
            
            // only send the state when its been updated
            if(me.encodedState != state) {
                me.encodedState = state;
                conn.send({
                    state: state
                });
            }
            
        }
        
    }
    
};