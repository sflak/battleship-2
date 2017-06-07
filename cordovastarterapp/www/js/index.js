
var app = function() {

    var self = {};
    self.is_configured = false;

    var server_url = "https://luca-ucsc-teaching-backend.appspot.com/keystore/";
    var call_interval = 2000;

    Vue.config.silent = false; // show all warnings

    // Extends an array
    self.extend = function(a, b) {
        for (var i = 0; i < b.length; i++) {
            a.push(b[i]);
        }
    };

    self.my_identity = randomString(20);
    // self.null_board = function(){
    //     var diff_empty_array = [];
    //     for (var i = 0; i<64; i++){
    //         Vue.set(diff_empty_array, i, ' ');
    //     }
    //     return diff_empty_array;
    //
    // };
    self.null_board = ["", "", "", "", "", "", "", "",
        "", "", "", "", "", "", "", "",
        "", "", "", "", "", "", "", "",
        "", "", "", "", "", "", "", "",
        "", "", "", "", "", "", "", "",
        "", "", "", "", "", "", "", "",
        "", "", "", "", "", "", "", "",
        "", "", "", "", "", "", "", ""];
    self.enemy_null_board = ["", "", "", "", "", "", "", "",
        "", "", "", "", "", "", "", "",
        "", "", "", "", "", "", "", "",
        "", "", "", "", "", "", "", "",
        "", "", "", "", "", "", "", "",
        "", "", "", "", "", "", "", "",
        "", "", "", "", "", "", "", "",
        "", "", "", "", "", "", "", ""];

    // Enumerates an array.
    var enumerate = function(v) {
        var k=0;
        v.map(function(e) {e._idx = k++;});
    };

    // Initializes an attribute of an array of objects.
    var set_array_attribute = function (v, attr, x) {
        v.map(function (e) {e[attr] = x;});
    };

    self.initialize = function () {
        document.addEventListener('deviceready', self.ondeviceready, false);
    };

    self.ondeviceready = function () {
        // This callback is called once Cordova has finished its own initialization.
        console.log("The device is ready");

        $("#vue-div").show();
        self.is_configured = true;
    };

    // This is the object that contains the information coming from the server.
    self.player_x = null;
    self.player_o = null;
    self.o_board = null;
    self.x_board = null;
    self.turn_counter = 0;
    self.total_hits = 0; // win game by getting to 10 hits before opponent

    // This is the main control loop.
    function call_server() {
        console.log("Calling the server");
        if (self.vue.chosen_magic_word === null) {
            console.log("No magic word.");
            setTimeout(call_server, call_interval);
        } else {
            // We can do a server call.
            // Add a bit of random delay to avoid synchronizations.
            var extra_delay = Math.floor(Math.random() * 1000);
            $.ajax({
                dataType: 'json',
                url: server_url +'read',
                data: {key: self.vue.chosen_magic_word},
                success: self.process_server_data,
                complete: setTimeout(call_server, call_interval + extra_delay) // Here we go again.
            });
        }
    }

    // Main function for sending the state.
    self.send_state = function () {
        $.post(server_url + 'store',
            {
                key: self.vue.chosen_magic_word,
                val: JSON.stringify(
                    {
                        'player_x': self.player_x,
                        'player_o': self.player_o,
                        'x_board': self.x_board,
                        'o_board': self.o_board,
                        'turn_counter': self.turn_counter
                    }
                )
            }
        );
    };


    // Main place where we receive data and act on it.
    self.process_server_data = function (data) {
        // If data is null, we send our data.
        if (!data.result) {
            self.player_x = self.my_identity;
            self.player_o = null;
            self.vue.is_my_turn = true;
            self.vue.board = getBoard();
            self.x_board = self.vue.board;
            self.o_board = self.null_board;
            self.turn_counter = 1;
            self.send_state();
        } else {
            // I technically don't need to assign this to self, but it helps debug the code.
            self.server_answer = JSON.parse(data.result);
            self.player_x = self.server_answer.player_x;
            self.player_o = self.server_answer.player_o;
            self.x_board = self.server_answer.x_board;
            self.o_board = self.server_answer.o_board;
            self.turn_counter = self.server_answer.turn_counter;



            if (self.player_x === null || self.player_o === null) {
                // Some player is missing. We cannot play yet.
                self.vue.is_my_turn = false;
                console.log("Not all players present.");
                if (self.player_o === self.my_identity || self.player_x === self.my_identity) {
                    // We are already present, nothing to do.
                    console.log("Waiting for other player to join");
                } else {
                    console.log("Signing up now.");
                    // We are not present.  Let's join if we can.
                    if (self.player_x === null) {
                        // Preferentially we play as x.
                        self.player_x = self.my_identity;
                        self.vue.board = getBoard();
                        self.x_board = self.vue.board;
                        for(var i=0; i<64; i++){
                            Vue.set(self.vue.enemy_board, i, self.server_answer.o_board[i]);
                        }
                        self.send_state();
                    } else if (self.player_o === null) {
                        self.player_o = self.my_identity;
                        self.vue.board = getBoard();
                        self.o_board = self.vue.board;
                        self.send_state();
                    } else {
                        // The magic word is already taken.
                        self.vue.need_new_magic_word = true;
                    }
                }
            } else {
                console.log("Both players are present");
                // Both players are present.
                // Let us determine our role if any.
                if (self.player_o !== self.my_identity && self.player_x !== self.my_identity) {
                    // Again, we are intruding in a game.
                    self.vue.need_new_magic_word = true;
                } else {
                    // Here is the interesting code: we are playing, and the opponent is there.
                    // Reconciles the state.
                    console.log("calling update local vars");
                    self.update_local_vars(self.server_answer);
                }

            }
        }
    };

    self.update_local_vars = function (server_answer) {
        // First, figures out our role.
        if (server_answer.player_o === self.my_identity) {
            self.vue.my_role = 'o';
            // self.
        } else if (server_answer.player_x === self.my_identity) {
            self.vue.my_role = 'x';
        } else {
            self.vue.my_role = ' ';
        }


        if(self.player_x === self.my_identity){
            self.vue.enemy_board = self.o_board;
            self.vue.board = self.x_board;
            console.log("enemy-board: " + self.vue.enemy_board);
        }else if (self.player_o === self.my_identity){
            self.vue.enemy_board = self.x_board;
            self.vue.board = self.o_board;
            console.log("enemy-board: " + self.vue.enemy_board);
        }

    };


    function whose_turn(counter) {
        // player x goes on odd turns, and player o goes on even turns
        if(self.my_role === 'x' && counter%2 !== 0) {
            return 'x';
        } else if (self.my_role === 'o' && counter&2 === 0){
            return 'o';
        } else {
            return '';
        }

    }


    self.set_magic_word = function () {
        self.vue.chosen_magic_word = self.vue.magic_word;
        self.vue.need_new_magic_word = false;

        // Resets board and turn.
        self.vue.board = self.null_board;
        self.vue.is_my_turn = false;
        self.vue.my_role = "";
    };
    // self.set_player_board = function() {
    //     var newBoard = getBoard();
    //     for(var i = 0; i<64; i++){
    //         Vue.set(self.vue.board, i, newBoard[i]);
    //     }
    // };

    self.play = function (el) {
        // Check that the game is ongoing and that it's our turn to play.
        // if (!self.vue.is_my_turn) {
        //     return;
        // }
        if(self.hitShip(el)){
            self.total_hits += 1;
            // set number to negative
            var neg = self.vue.enemy_board[el] - 2*self.vue.enemy_board[el];
            Vue.set(self.vue.enemy_board, el, neg);
        }else if(!self.hitShip(el)){
            // check if tile was previously hit, in which case, do nothing
            // If not previously hit, change tile to 'W'
            if(self.vue.enemy_board[el] === 'W' || self.vue.enemy_board[el] < 0){
                console.log("tile was already hit-do nothing");
                return;
            }else if(self.vue.enemy_board[el] === '*'){
                console.log("found water!");
                Vue.set(self.vue.enemy_board, el, 'W');

            }


        }
        self.update_other_board();
        self.send_state();
    };
    self.update_other_board = function(){
        console.log("in update function");
        if(self.vue.my_role === 'x'){
            // enemy board is o_board, so update it
            console.log("I'm x, updating board_o");
            for (var i=0; i<64; i++){
                if(self.vue.enemy_board[i] !== self.o_board[i]){
                    Vue.set(self.o_board, i, self.vue.enemy_board[i]);
                }
            }
        }else if (self.vue.my_role === 'o'){
            // enemy board is x_board, so update it
            console.log("I'm o, updating board_x");
            for (var j=0; j<64; j++){
                if(self.vue.enemy_board[j] !== self.x_board[j]){
                    Vue.set(self.x_board, j, self.vue.enemy_board[j]);
                }
            }
        }
    };

    self.hitShip = function(el) {
        var entity = self.vue.enemy_board[el];
        if(entity > 0) {
            console.log("ship was hit");
            return true;
        } else if(entity === '*' || entity === 'W' || entity < 0){
            console.log('water or something that was already clicked');
            return false;
        }
    };

    self.vue = new Vue({
        el: "#vue-div",
        delimiters: ['${', '}'],
        unsafeDelimiters: ['!{', '}'],
        data: {
            magic_word: "",
            chosen_magic_word: null,
            need_new_magic_word: false,
            my_role: "",
            board: self.null_board,
            enemy_board: self.enemy_null_board,
            x_board: self.null_board,
            o_board: self.null_board,
            is_other_present: false,
            is_my_turn: false
        },
        methods: {
            set_magic_word: self.set_magic_word,
            play: self.play,
            hitShip: self.hitShip

            // enemy_null_board: self.enemy_null_board(),
            // set_player_board: self.set_player_board()
        }

    });

    call_server();

    return self;
};

var APP = null;

// This will make everything accessible from the js console;
// for instance, self.x above would be accessible as APP.x
jQuery(function(){
    APP = app();
    APP.initialize();
});
