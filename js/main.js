/*global Phaser*/

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
            str += (data) ? "1" : "0";
        }
        
        return str;
    },
    // returns an object that maps 'data' to 'schema'
    decode: function(schema, data) {
        if(scheme.length != data.length)
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
    
    document.getElementById("connect").style.display = "none";
    document.getElementById("send").style.display = "block";
    
    conn.on('data', function(data) {
        // its a message, append it to the messages textarea
        if(data.message) {
            document.getElementById("messages").value += conn.peer + ": " + data.message + "\n";
        }
        
        // only the server should ever get this message
        if(server && data.state) {
            friend.decodedState = Binary.decode(stateBinarySchema, data.state);
        }
        
        // only the client should ever get position info
        if(!server) {
            
            if(data.me.x && data.me.y) {
                
            }
            else if(data.friend.x && data.friend.y) {
                friend.sprite.position.x = data.friend.x;
                friend.sprite.position.y = data.friend.y;
            }
            
        }
    });
    
    game = new Phaser.Game(800, 600, Phaser.AUTO, 'MiningGame', playState);
}

function connect() {

    var yourName = document.getElementById("yourName").value;
    var friendsName = document.getElementById("friendsName").value;

    if(yourName != '') {
        peer = new Peer(yourName, {key: '55sj0os1x512a9k9'});
        
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
        
        me.sprite = game.add.sprite(400, 300, 'miningTextures');
        me.sprite.animations.add('idle', [0], 15, false);
        me.sprite.animations.play('idle', 15, false);
        
        friend.sprite = game.add.sprite(432, 300, 'miningTextures');
        friend.sprite.animations.add('idle', [0], 15, false);
        friend.sprite.animations.play('idle', 15, false);
        
        // only the server simulates physics
        if(server) {
            
            // setup global physics properties 
            game.physics.startSystem(Phaser.Physics.ARCADE);
            game.physics.arcade.gravity.y = 250;
            
            // setup physics for me
            me.sprite.anchor.setTo(0.5, 0.5);
            me.sprite.smoothed = false;
            game.physics.arcade.enable(me.sprite);
            me.sprite.body.collideWorldBounds = true;
            me.sprite.body.setSize(32, 32, 0,0);
            
            // setup physics for friend
            friend.sprite.anchor.setTo(0.5, 0.5);
            friend.sprite.smoothed = false;
            game.physics.arcade.enable(friend.sprite);
            friend.sprite.body.collideWorldBounds = true;
            friend.sprite.body.setSize(32, 32, 0,0);
        }
    },
    
    update: function() {
        
        var left = game.input.keyboard.isDown(Phaser.Keyboard.LEFT);
        var right = game.input.keyboard.isDown(Phaser.Keyboard.RIGHT);
        var up = game.input.keyboard.isDown(Phaser.Keyboard.UP);
        var down = game.input.keyboard.isDown(Phaser.Keyboard.DOWN);
        var space = game.input.keyboard.justPressed(Phaser.Keyboard.SPACEBAR);
        
        if(server) {
            
            
            
        }
        else {
            
            var state = Binary.encode(stateBinarySchema, [left, right, up, down]);
            
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