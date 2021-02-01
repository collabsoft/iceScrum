/*
 * Copyright (c) 2015 Kagilum SAS.
 *
 * This file is part of iceScrum.
 *
 * iceScrum is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License.
 *
 * iceScrum is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with iceScrum.  If not, see <http://www.gnu.org/licenses/>.
 *
 * Authors:
 *
 * Vincent Barrier (vbarrier@kagilum.com)
 * Nicolas Noullet (nnoullet@kagilum.com)
 * Colin Bontemps (cbontemps@kagilum.com)
 *
 */

controllers.controller('sprintCtrl', ['$rootScope', '$scope', '$state', '$q', '$uibModal', '$window', 'Session', 'SprintService', 'SprintStatesByName', 'StoryService', 'StoryStatesByName', 'StoryTypesByName', function($rootScope, $scope, $state, $q, $uibModal, $window, Session, SprintService, SprintStatesByName, StoryService, StoryStatesByName, StoryTypesByName) {
    // Functions
    $scope.showSprintMenu = function() {
        return Session.poOrSm();
    };
    $scope.authorizedSprint = SprintService.authorizedSprint;
    $scope.activate = function(sprint) {
        $rootScope.uiWorking('todo.is.ui.sprint.being.activated', true);
        SprintService.activate(sprint, $scope.project).then(function() {
            $scope.notifySuccess('todo.is.ui.sprint.activated');
        }).finally(function() {
            $rootScope.uiReady(true);
        });
    };
    $scope.reactivate = function(sprint) {
        $rootScope.uiWorking('todo.is.ui.sprint.being.reactivated', true);
        SprintService.reactivate(sprint, $scope.project).then(function() {
            $scope.notifySuccess('todo.is.ui.sprint.reactivated');
        }).finally(function() {
            $rootScope.uiReady(true);
        });
    };
    $scope.autoPlan = function(sprint, plannedVelocity) {
        $rootScope.uiWorking("todo.is.ui.sprint.being.autoPlanned", true);
        SprintService.autoPlan(sprint, plannedVelocity, $scope.project).then(function() {
            $scope.notifySuccess('todo.is.ui.sprint.autoPlanned');
        }).finally(function() {
            $rootScope.uiReady(true);
        });
    };
    $scope.unPlan = function(sprint) {
        $rootScope.uiWorking("todo.is.ui.sprint.being.unPlanned", true);
        SprintService.unPlan(sprint, $scope.project).then(function() {
            $scope.notifySuccess('todo.is.ui.sprint.unPlanned');
        }).finally(function() {
            $rootScope.uiReady(true);
        });
    };
    $scope['delete'] = function(sprint) {
        $rootScope.uiWorking(true, true);
        SprintService.delete(sprint, $scope.release).then(function() {
            $scope.notifySuccess('todo.is.ui.deleted');
        }).finally(function() {
            $rootScope.uiReady(true);
        });
    };
    $scope.tabUrl = function(sprintTabId) {
        var stateName = $state.params.sprintTabId ? (sprintTabId ? '.' : '^') : (sprintTabId ? '.tab' : '.');
        return $state.href(stateName, {sprintTabId: sprintTabId});
    };
    $scope.openActivateModal = function(sprint) {
        var parentScope = $scope;
        $uibModal.open({
            templateUrl: 'story.activate.html',
            size: 'md',
            controller: ['$scope', function($scope) {
                $scope.activate = function(sprint) {
                    $scope.$close(true);
                    parentScope.activate(sprint);
                };
                $scope.sprint = sprint;
            }]
        });
    };
    $scope.openCloseModal = function(sprint) {
        var project = $scope.project;
        $uibModal.open({
            templateUrl: 'story.close.html',
            size: 'md',
            controller: ['$scope', '$filter', 'StoryService', 'StoryStatesByName', function($scope, $filter, StoryService, StoryStatesByName) {
                // Functions
                $scope.loadStories = function() {
                    $scope.backlog.storiesLoaded = false;
                    StoryService.filter({parentSprint: sprint.id}, $scope.getProjectFromState()).then(function(stories) {
                        $scope.newDone = _.transform(stories, function(newDone, story) {
                            newDone[story.id] = story.state == StoryStatesByName.DONE;
                        }, {});
                        $scope.backlog.stories = $filter('orderBy')(stories, 'rank');
                        $scope.backlog.storiesLoaded = true;
                    });
                };
                $scope.closeSprint = function() {
                    $rootScope.uiWorking('todo.is.ui.sprint.being.closed', true);
                    var getStory = function(id) {
                        return _.find($scope.backlog.stories, {id: id});
                    };
                    var newDone = _.transform($scope.newDone, function(newDone, isDone, storyId) {
                        if (isDone) {
                            newDone.push(parseInt(storyId));
                        }
                    }, []);
                    var storyIdsByDone = _.chain($scope.backlog.stories).groupBy(function(story) {
                        return story.state == StoryStatesByName.DONE;
                    }).mapValues(function(stories) {
                        return _.map(stories, 'id');
                    }).value();
                    var oldDone = storyIdsByDone[true];
                    var toBeDone = _.difference(newDone, oldDone);
                    var oldUndone = storyIdsByDone[false];
                    var newUndone = _.difference(_.map($scope.backlog.stories, 'id'), newDone);
                    var toBeUndone = _.difference(newUndone, oldUndone);
                    var promise = $q.when();
                    if (toBeUndone.length) {
                        promise = promise.then(function() {
                            return toBeUndone.length > 1 ? StoryService.updateStateMultiple(toBeUndone, $scope.getProjectFromState().id, 'unDone') : StoryService.updateState(getStory(toBeUndone[0]), 'unDone');
                        });
                    }
                    if (toBeDone.length) {
                        promise = promise.then(function() {
                            return toBeDone.length > 1 ? StoryService.updateStateMultiple(toBeDone, $scope.getProjectFromState().id, 'done') : StoryService.updateState(getStory(toBeDone[0]), 'done');
                        });
                    }
                    promise.then(function() {
                        return SprintService.close(sprint, project).then(function() {
                            $scope.notifySuccess('todo.is.ui.sprint.closed');
                            $scope.$close(true);
                        }).finally(function() {
                            $rootScope.uiReady(true);
                        });
                    });
                };
                // Init
                $scope.backlog = {
                    stories: [],
                    storiesLoaded: false
                };
                $scope.loadStories();
                $scope.storyStatesByName = StoryStatesByName;
            }]
        });
    };
    $scope.openPlanModal = function(sprint) {
        $scope.openStorySelectorModal({
            code: 'plan',
            order: 'rank',
            filter: {
                state: StoryStatesByName.ESTIMATED,
                type: [StoryTypesByName.USER_STORY, StoryTypesByName.DEFECT, StoryTypesByName.TECHNICAL_STORY]
            },
            submit: function(selectedIds) {
                if (selectedIds.length > 0) {
                    $rootScope.uiWorking('todo.is.ui.story.multiple.being.planned', true);
                    // Will refresh sprint.stories which will in turn refresh sprint backlog stories through the watch
                    return StoryService.planMultiple(selectedIds, sprint, $scope.project.id).then(function() {
                        $scope.notifySuccess('todo.is.ui.story.multiple.planned');
                    }).finally(function() {
                        $rootScope.uiReady(true);
                    });
                } else {
                    return $q.when();
                }
            }
        });
    };
    $scope.menus = [
        {
            name: 'todo.is.ui.story.plan',
            visible: function(sprint) { return $scope.authorizedSprint('plan', sprint); },
            action: function(sprint) { $scope.openPlanModal(sprint); }
        },
        {
            name: 'is.ui.releasePlan.menu.sprint.activate',
            visible: function(sprint) { return $scope.authorizedSprint('activate', sprint); },
            priority: function(sprint, defaultPriority) { return sprint.state === 1 && (sprint.stories_ids && sprint.stories_ids.length > 0 || sprint.startDate.getTime() < (new Date()).getTime()) ? 100 : defaultPriority; },
            action: $scope.openActivateModal
        },
        {
            name: 'is.ui.releasePlan.menu.sprint.reactivate',
            visible: function(sprint) { return $scope.authorizedSprint('reactivate', sprint); },
            priority: function(sprint, defaultPriority) { return defaultPriority; },
            action: function(sprint) {
                $scope.confirm({
                    buttonColor: 'danger',
                    buttonTitle: 'is.ui.releasePlan.menu.sprint.reactivate',
                    message: $scope.message('is.ui.releasePlan.menu.sprint.reactivate.confirm'),
                    callback: $scope.reactivate,
                    args: [sprint]
                });
            }
        },
        {
            name: 'is.ui.releasePlan.menu.sprint.close',
            priority: function(sprint, defaultPriority, viewType) { return sprint.state === SprintStatesByName.IN_PROGRESS ? (viewType === 'details' ? 120 : 100) : defaultPriority; },
            visible: function(sprint) { return $scope.authorizedSprint('close', sprint); },
            action: function(sprint) { $scope.openCloseModal(sprint); }
        },
        {
            name: 'todo.is.ui.taskBoard',
            visible: function(sprint, viewType) { return viewType !== 'taskBoard'; },
            priority: function(sprint, defaultPriority, viewType) { return viewType !== 'taskBoard' && sprint.state === SprintStatesByName.IN_PROGRESS && sprint.endDate.getTime() > (new Date()).getTime() ? 110 : defaultPriority; },
            url: function(sprint) { return '#taskBoard/' + sprint.id + '/details'; }
        },
        {
            name: 'is.ui.releasePlan.toolbar.autoPlan',
            visible: function(sprint) { return $scope.authorizedSprint('autoPlan', sprint); },
            action: function(sprint) { $scope.showAutoPlanModal({callback: $scope.autoPlan, args: [sprint]}); }
        },
        {
            name: 'is.ui.releasePlan.menu.sprint.dissociateAll',
            visible: function(sprint) { return $scope.authorizedSprint('unPlan', sprint); },
            action: function(sprint) { $scope.confirm({message: $scope.message('is.ui.releasePlan.menu.sprint.warning.dissociateAll'), callback: $scope.unPlan, args: [sprint]}); }
        },
        {
            name: 'todo.is.ui.details',
            visible: function(sprint, viewType) { return viewType !== 'details'; },
            url: function(sprint) { return $scope.openSprintUrl(sprint); } // Inherited
        },
        {
            name: 'is.ui.releasePlan.menu.sprint.delete',
            deleteMenu: true,
            visible: function(sprint) { return $scope.authorizedSprint('delete', sprint); },
            action: function(sprint) { $scope.delete(sprint); }
        }
    ];
    $scope.validateStartDate = function(startDate) {
        if (startDate && $scope.startDateOptions.minDate && startDate < $scope.startDateOptions.minDate) {
            return false;
        }
        if (startDate && $scope.startDateOptions.maxDate && startDate > $scope.startDateOptions.maxDate) {
            return false;
        }
        return true;
    };
    $scope.validateEndDate = function(endDate) {
        if (endDate && $scope.endDateOptions.minDate && endDate < $scope.endDateOptions.minDate) {
            return false;
        }
        if (endDate && $scope.endDateOptions.maxDate && endDate > $scope.endDateOptions.maxDate) {
            return false;
        }
        return true;
    };
    // Init
    $scope.project = $scope.getProjectFromState();
    $scope.startDateOptions = {
        opened: false
    };
    $scope.endDateOptions = angular.copy($scope.startDateOptions);
}]);

controllers.controller('sprintBacklogCtrl', ['$scope', '$rootScope', '$controller', 'StoryService', 'SprintStatesByName', 'BacklogCodes', function($scope, $rootScope, $controller, StoryService, SprintStatesByName, BacklogCodes) {
    $controller('sprintCtrl', {$scope: $scope}); // inherit from sprintCtrl
    // Functions
    $scope.isSortingSprint = function(sprint) {
        return !$rootScope.waitSortingTask && StoryService.authorizedStory('rank') && sprint.state < SprintStatesByName.DONE;
    };
    // Init
    $scope.sprintSortableOptions = {
        itemMoved: function(event) {
            var destScope = event.dest.sortableScope;
            var story = event.source.itemScope.modelValue;
            var newRank = event.dest.index + 1;
            $rootScope.waitSortingTask = true;
            StoryService.plan(story, destScope.sprint, newRank).catch(function() {
                $scope.revertSortable(event);
            }).finally(function() {
                $rootScope.waitSortingTask = false;
            });
        },
        orderChanged: function(event) {
            var story = event.source.itemScope.modelValue;
            var newRank = event.dest.index + 1;
            story.rank = newRank;
            $rootScope.waitSortingTask = true;
            StoryService.update(story).then(function(updatedStory) {
                if (updatedStory.rank !== newRank) {
                    $scope.notifyWarning('is.ui.story.warning.rank');
                }
            }).catch(function() {
                $scope.revertSortable(event);
            }).finally(function() {
                $rootScope.waitSortingTask = false;
            });
        },
        accept: function(sourceItemHandleScope, destSortableScope) {
            var sameSortable = sourceItemHandleScope.itemScope.sortableScope.sortableId === destSortableScope.sortableId;
            return sameSortable && destSortableScope.isSortingSprint(destSortableScope.sprint);
        }
    };
    $scope.sortableId = 'sprint';
    $scope.backlogCodes = BacklogCodes;
    $scope.sprintStatesByName = SprintStatesByName;
    $scope.backlog = {stories: [], code: 'sprint', storiesLoaded: false};
    StoryService.listByType($scope.sprint, $scope.getProjectFromState().id).then(function() {
        $scope.backlog.stories = $scope.sprint.stories;
        $scope.backlog.storiesLoaded = true;
    });
}]);

controllers.controller('sprintNewCtrl', ['$scope', '$controller', '$state', 'DateService', 'SprintService', 'ReleaseService', 'ReleaseStatesByName', 'hotkeys', 'releases', 'detailsRelease', function($scope, $controller, $state, DateService, SprintService, ReleaseService, ReleaseStatesByName, hotkeys, releases, detailsRelease) {
    $controller('sprintCtrl', {$scope: $scope}); // inherit from sprintCtrl
    // Functions
    $scope.resetSprintForm = function() {
        $scope.sprint = {parentRelease: {}};
        if ($scope.release) {
            $scope.sprint.parentRelease = $scope.release;
        }
        $scope.resetFormValidation($scope.formHolder.sprintForm);
    };
    $scope.save = function(sprint, andContinue) {
        SprintService.save(sprint, $scope.release).then(function(sprint) {
            if (andContinue) {
                $scope.resetSprintForm();
                initSprintDates();
            } else {
                $scope.setInEditingMode(true);
                $state.go('^.withId.details', {releaseId: $scope.release.id, sprintId: sprint.id});
            }
            $scope.notifySuccess('todo.is.ui.sprint.saved');
        });
    };
    $scope.selectRelease = function(release) {
        $scope.release = _.find($scope.editableReleases, {id: release.id});
    };
    // Init
    var initSprintDates = function() {
        $scope.releaseEndDateWarning = null;
        var sprints = $scope.release.sprints;
        if (!_.isUndefined(sprints)) {
            if (_.isEmpty(sprints)) {
                $scope.startDateOptions.minDate = $scope.release.startDate;
            } else {
                $scope.startDateOptions.minDate = DateService.immutableAddDaysToDate(_.max(_.map($scope.release.sprints, 'endDate')), 1);
                if ($scope.startDateOptions.minDate >= $scope.release.endDate) {
                    $scope.releaseEndDateWarning = $scope.message('is.ui.sprint.warning.release.end')
                }
            }
            $scope.sprint.startDate = $scope.startDateOptions.minDate;
            var sprintDuration = $scope.project.preferences.estimatedSprintsDuration;
            var hypotheticalEndDate = DateService.immutableAddDaysToDate($scope.sprint.startDate, sprintDuration - 1);
            $scope.sprint.endDate = _.min([hypotheticalEndDate, $scope.release.endDate]);
        }
    };
    $scope.$watchCollection('release.sprints', initSprintDates);
    $scope.$watch('release', initSprintDates);
    $scope.$watchCollection('[sprint.startDate, sprint.endDate]', function(newValues) {
        var startDate = newValues[0];
        var endDate = newValues[1];
        if (startDate) {
            $scope.endDateOptions.minDate = DateService.immutableAddDaysToDate(startDate, 1);
        }
        if (endDate) {
            $scope.startDateOptions.maxDate = DateService.immutableAddDaysToDate(endDate, -1);
        }
    });
    $scope.formHolder = {};
    $scope.resetSprintForm();
    $scope.editableReleases = _.sortBy(_.filter(releases, function(release) {
        return release.state < ReleaseStatesByName.DONE;
    }), 'orderNumber');
    $scope.sprint.parentRelease = detailsRelease;
    $scope.release = detailsRelease;
}]);

controllers.controller('sprintDetailsCtrl', ['$scope', '$controller', 'SprintStatesByName', 'WorkspaceType', 'DateService', 'SprintService', 'ReleaseService', 'TimeBoxNotesTemplateService', 'FormService', 'detailsSprint', 'detailsRelease', 'project', function($scope, $controller, SprintStatesByName, WorkspaceType, DateService, SprintService, ReleaseService, TimeBoxNotesTemplateService, FormService, detailsSprint, detailsRelease, project) {
    $controller('sprintCtrl', {$scope: $scope}); // inherit from sprintCtrl
    $controller('attachmentCtrl', {$scope: $scope, attachmentable: detailsSprint, clazz: 'sprint', workspace: project, workspaceType: WorkspaceType.PROJECT});
    // Functions
    $scope.update = function(sprint) {
        SprintService.update(sprint, $scope.release).then(function() {
            $scope.resetSprintForm();
            $scope.notifySuccess('todo.is.ui.sprint.updated');
        });
    };
    $scope.authorizedTimeboxNotes = TimeBoxNotesTemplateService.authorizedTimeboxNotes;
    // Init
    $scope.$watchCollection('release.sprints', function(sprints) {
        if (!_.isUndefined(sprints)) {
            var previousSprint = _.findLast(_.sortBy(sprints, 'orderNumber'), function(sprint) {
                return sprint.orderNumber < $scope.sprint.orderNumber;
            });
            $scope.startDateOptions.minDate = _.isEmpty(previousSprint) ? $scope.release.startDate : DateService.immutableAddDaysToDate(previousSprint.endDate, 1);
        }
    });
    $scope.$watchCollection('[editableSprint.startDate, editableSprint.endDate]', function(newValues) {
        var startDate = newValues[0];
        var endDate = newValues[1];
        if (startDate) {
            $scope.endDateOptions.minDate = DateService.immutableAddDaysToDate(startDate, 1);
        }
        if (endDate) {
            $scope.startDateOptions.maxDate = DateService.immutableAddDaysToDate(endDate, -1);
        }
    });
    $controller('updateFormController', {$scope: $scope, item: detailsSprint, type: 'sprint'});
    $scope.sprintStatesByName = SprintStatesByName;
    $scope.release = detailsRelease;
    $scope.endDateOptions.maxDate = $scope.release.endDate;
    var sortedSprints = _.sortBy($scope.release.sprints, 'orderNumber');
    $scope.previousSprint = FormService.previous(sortedSprints, $scope.sprint);
    $scope.nextSprint = FormService.next(sortedSprints, $scope.sprint);
}]);

controllers.controller('sprintMultipleCtrl', ['$scope', 'SprintService', 'detailsRelease', function($scope, SprintService, detailsRelease) {
    // Functions
    $scope.authorizedSprints = SprintService.authorizedSprints;
    $scope.autoPlanMultiple = function(sprints, plannedVelocity) {
        SprintService.autoPlanMultiple(sprints, plannedVelocity, $scope.release).then(function() {
            $scope.notifySuccess('todo.is.ui.sprint.autoPlanned');
        });
    };
    $scope.unPlanMultiple = function(sprints) {
        SprintService.unPlanMultiple(sprints, $scope.release).then(function() {
            $scope.notifySuccess('todo.is.ui.sprint.unPlanned');
        });
    };
    // Init
    $scope.release = detailsRelease;
    $scope.$watch('sprints', function(sprints) {
        if (sprints.length) {
            $scope.startDate = _.head(sprints).startDate;
            $scope.endDate = _.last(sprints).endDate;
            var storyCounts = _.map(sprints, function(sprint) {
                return sprint.stories_ids ? sprint.stories_ids.length : 0;
            });
            $scope.sumStory = _.sum(storyCounts);
            $scope.meanStory = _.round(_.mean(storyCounts));
            $scope.meanVelocity = _.round(_.meanBy(sprints, 'velocity'));
            $scope.meanCapacity = _.round(_.meanBy(sprints, 'capacity'));
        }
    }, true);  // Be careful of circular objects, it will blow up the stack when comparing equality by value
}]);
