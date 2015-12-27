angular.module("quiz-host", ["ui.bootstrap","googlechart"])
.service("socket", function(channel){
    this.connection = io.connect(location.protocol + '//' + location.host + '/' + channel);
})
.service("tool", function($log){
    this.genUniqueId = function(){
    	var uuid = "", i, random;
    	for (i = 0; i < 32; i++) {
    		random = Math.random() * 16 | 0;
    		if (i == 8 || i == 12 || i == 16 || i == 20) {
    			uuid += "-"
    		}
    		uuid += (i == 12 ? 4 : (i == 16 ? (random & 3 | 8) : random)).toString(16);
    	}
    	return uuid;
    }
})
.controller("rootCtl", function($scope, $log, channel){
    $scope.channel = channel;
    $scope.server = {
        protocol: location.protocol,
        hostname: location.host
    }
})
.controller("openChannelFormCtl", function($scope, $log){

})
.controller("quizCtl", function($scope, $log, $uibModal, socket){
    socket.connection.on("answerSubmitted", function(answer){
        updateAnswerChart($scope.answerChart, answer);
        $scope.$apply();
    });

    $scope.openQuizForm = function(){
        var modalInstance = $uibModal.open({
            controller: "quizFormCtl",
			templateUrl: "quizForm",
            scope: $scope
        });
    }

    $scope.giveCorrectAnswer = function(option, clickEvent){
		clickEvent.preventDefault();
		socket.connection.emit('correctAnswerGiven', {
            optionId: option.id
        });
		angular.forEach($scope.quiz.optionList, function(o, k){
			if (option.id == o.id){
				o.isCorrect = true;
			}
		});
		$scope.quiz.isClosed = true;
	}

    function createAnswerChart(quiz){
        var chart = {
            type: "BarChart",
            data: {
                "cols": [
                    {id: "option", label: "選択肢", type: "string"},
                    {id: "total", label: "合計", type: "number"}
                ],
                "rows": []
            }
        };

        angular.forEach(quiz.optionList, function(option, k){
            chart.data.rows.push(
                {c: [
                    {v: option.option},
                    {v: 0},
                    {v: option.id}
                ]}
            );
        });

        var height = 70 * chart.data.rows.length;
        chart.options = {
            'animation': {startup: true, easing: 'out', duration: 500},
            'height':height,
            'hAxis': {viewWindow: {min: 0}},
            'colors':['#76A7FA'],
            'dataOpacity': 0.5,
            'legend':{position:'none'}
        };

        return chart;
    }

    function updateAnswerChart(chart, answer){
		angular.forEach(chart.data.rows, function(row, k){
			if (answer.optionId == row.c[2].v){
				row.c[1].v += 1;
			}
		});
		return chart;
	}

    $scope.$watch("quiz.id", function(newValue, oldValue){
        if (newValue == oldValue || !newValue){
            return;
        }
        $scope.answerChart = createAnswerChart($scope.quiz);
    })
})
.controller("quizFormCtl", function($rootScope, $scope, $log, $uibModalInstance, socket, tool){
    $scope.quiz = initQuiz();
    $scope.alertList = [];

    function initQuiz(){
        return {
            id: tool.genUniqueId(),
			channel: $scope.channel,
            question: null,
            optionList: initOptionList(2)
        }
    }

    function initOptionList(numOfOptions){
        var optionList = [];
        for (var i = 0; i < numOfOptions; i++){
            optionList.push(initOption());
        }
        return optionList;
    }

    function initOption(){
        return {
            id: tool.genUniqueId()
        };
    }

    function addAlert(message){
        $scope.alertList.push(message);
    }

    function clearAlert(){
        $scope.alertList = [];
    }

	function checkQuiz(quiz){
		clearAlert();

		// Check if question is set.
		if (quiz.question == null || quiz.question == ""){
			addAlert("質問がセットされていません。");
			return false;
		}

		// Remove empty option.
		var validOptionList = [];
        angular.forEach(quiz.optionList, function(option, k){
            if (option.option != null && option.option != ""){
                validOptionList.push(option);
            }
        });

		// Check if this quiz contains at least 1 option.
		if (validOptionList.length == 0){
			addAlert("最低一つの選択肢が必要です。");
			return false;
		}
		quiz.optionList = validOptionList;

		return quiz;
	}

	$scope.publishQuiz = function(quiz){
		var checkedQuiz = checkQuiz(quiz);
		if (checkedQuiz){
			socket.connection.emit('quizPublished', checkedQuiz);
            $rootScope.quiz = checkedQuiz;
			$uibModalInstance.close();
		}
	}

    $scope.addOption = function(){
        $scope.quiz.optionList.push(initOption());
    }

    $scope.removeOption = function(hashKey){
        angular.forEach($scope.quiz.optionList, function(option, k){
            if (option.$$hashKey == hashKey) {
                $scope.quiz.optionList.splice(k, 1);
            }
        });
    }
});
