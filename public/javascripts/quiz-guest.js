angular.module("quiz-guest", ["ui.bootstrap"])
.service("socket", function(channel){
    this.connection = io.connect(location.protocol + '//' + location.host + '/' + channel);
})
.controller("rootCtl", function($scope, $log, $uibModal, channel, socket){
    $scope.channel = channel;
	$scope.quiz = null;
	$scope.alertList = [];

    socket.connection.on("quizPublished", function(quiz) {
        $scope.quiz = quiz;
        $scope.$apply();
	});

	socket.connection.on("correctAnswerGiven", function(answer){
		$scope.$apply(function(){
			angular.forEach($scope.quiz.optionList, function(option, k){
				if (option.id == answer.optionId){
					if (option.isSelected){
						$scope.quiz.gaveCorrect = true;
						openResultNotification(true);
					} else {
						$scope.quiz.gaveCorrect = false;
						openResultNotification(false);
					}
				}
			});
		});
	});

	function addAlert(message){
		$scope.alertList.push(message);
	}

	function openResultNotification(isCorrect){
		var modalInstance = $uibModal.open({
			templateUrl: "resultNotification",
			controller: "resultNotificationCtl",
            scope: $scope,
			resolve: {
				isCorrect: isCorrect
			}
		});
		modalInstance.result.then(
			function(){
				$scope.quiz = null;
			},
            function(){
                $scope.quiz = null;
            }
		)
	}

    $scope.openFinalAnswer = function(option, clickEvent){
		clickEvent.preventDefault();
        var modalInstance = $uibModal.open({
            templateUrl: "finalAnswer",
            controller: "finalAnswerCtl",
            scope: $scope,
            resolve: {
                option: option
            }
        });
    }
})
.controller("finalAnswerCtl", function($rootScope, $scope, $uibModalInstance, $log, option, socket){
    $scope.option = option;

    $scope.submitAnswer = function(option){
        var answer = {
            optionId: option.id,
        };
		socket.connection.emit('answerSubmitted', answer);
        angular.forEach($scope.quiz.optionList, function(o, k){
            if (answer.optionId == o.id){
                o.isSelected = true;
            }
        });
        $scope.quiz.isAnswered = true;
        $uibModalInstance.close();
    }
})
.controller("resultNotificationCtl", function($scope, $uibModalInstance, $log, isCorrect){
    $scope.isCorrect = isCorrect;
})
.directive("spinner", function($log, $compile){
	var getTemplate = function(){
        var template =
			"<div class='spinner'>" +
				"<div class='bounce1'></div>" +
				"<div class='bounce2'></div>" +
				"<div class='bounce3'></div>" +
			"</div>";
        return template;
    }

    var linker = function(scope, element, attr){
        element.html(getTemplate());
        $compile(element.contents())(scope);
    }

	return {
		replace: true,
		restrict: 'E',
		link: linker
	};
});
