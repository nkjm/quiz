var path = require("path");
var express = require("express");
var app = express();

// view engineのセットアップ
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'public')));

// serverインスタンスを作成する
var server = app.listen(process.env.PORT || 3000, function(){
    var host = server.address().address;
    var port = server.address().port;
});

// socket.ioのインスタンスを作成する
io = require("socket.io")(server);

function openChannel(io, channel){
    if (io.nsps["/" + channel]){
        // 名前空間はすでに作成済み
        return;
    }

    // クイズチャンネルを作成する
    var quizChannel = io.of("/" + channel);

    // ハンドラー登録
    quizChannel.on("connection", function(socket){
        socket.on("quizPublished", function(quiz){
            quizChannel.emit("quizPublished", quiz);
        });

        socket.on("answerSubmitted", function(answer){
            quizChannel.emit("answerSubmitted", answer);
        });

        socket.on("correctAnswerGiven", function(answer){
            quizChannel.emit("correctAnswerGiven", answer);
        });
    });
}

// 出題者向けページ
app.get("/", function(req, res, next){
    if (req.query.channel){
        openChannel(io, req.query.channel);
        res.render("host", {channel: req.query.channel});
        return;
    }
    res.render("host", {channel: null});
    return;
});

// 回答者向けページ
app.get("/:channel", function(req, res, next){
    res.render("guest", {channel: req.params.channel});
    return;
});

module.exports = app;
