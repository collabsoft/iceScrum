/*
 * Copyright (c) 2014 Kagilum SAS.
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
 *
 */

extensibleController('backlogDetailsCtrl', ['$scope', 'StoryService', 'BacklogService', 'backlog', function($scope, StoryService, BacklogService, backlog) {
    // Functions
    $scope.refreshBacklog = function(backlog) {
        $scope.stories = BacklogService.filterStories(backlog, $scope.project.stories);
    };
    // Init
    $scope.backlog = backlog;
    $scope.refreshBacklog(backlog);
    // Ensures that the stories list of displayed backlogs are up to date
    $scope.$on('is:backlogsUpdated', function(event, backlogCodes) {
        if (_.includes(backlogCodes, backlog.code)) {
            $scope.refreshBacklog(backlog);
        }
    });
}]);

extensibleController('backlogChartCtrl', ['$scope', '$controller', '$element', function($scope, $controller, $element) {
    $controller('chartCtrl', {$scope: $scope, $element: $element});
    var displayChart = function() {
        var unit = $scope.backlog.chartUnit;
        var chartName = $scope.backlog.chartType + (unit ? '-' + unit : ''); // Hack to preserve the chartLoaderInterface while using an additional parameter
        $scope.openChart('backlog', chartName, $scope.backlog);
    };
    displayChart();
    $scope.$watchGroup(['backlog.chartType', 'backlog.chartUnit'], displayChart, true);
}]);


extensibleController('backlogCtrl', ['$controller', '$scope', '$q', 'window', '$filter', '$timeout', '$state', 'StoryService', 'Story', 'BacklogService', 'BacklogCodes', 'StoryStatesByName', 'WorkspaceType', 'project', 'backlogs', function($controller, $scope, $q, window, $filter, $timeout, $state, StoryService, Story, BacklogService, BacklogCodes, StoryStatesByName, WorkspaceType, project, backlogs) {
    $controller('windowCtrl', {$scope: $scope, window: window}); // inherit from windowCtrl
    // Functions
    $scope.authorizedStory = StoryService.authorizedStory;
    $scope.isSelected = function(selectable) {
        if ($state.params.storyId) {
            return $state.params.storyId === selectable.id;
        } else if ($state.params.storyListId) {
            return _.includes($state.params.storyListId.split(','), selectable.id.toString());
        } else {
            return false;
        }
    };
    $scope.hasSelected = function() {
        return $state.params.storyId !== undefined || $state.params.storyListId !== undefined;
    };
    $scope.toggleSelectableMultiple = function() {
        $scope.selectableOptions.selectingMultiple = !$scope.selectableOptions.selectingMultiple;
        if ($state.params.storyListId !== undefined) {
            var currentStateName = $state.current.name;
            var storyIndexInStateName = currentStateName.indexOf('story');
            $state.go(currentStateName.slice(0, storyIndexInStateName - 1));
        }
    };
    $scope.refreshSingleBacklog = function(backlogContainer) {
        var backlog = backlogContainer.backlog;
        var filteredStories = BacklogService.filterStories(backlog, $scope.project.stories);
        backlog.stories = $filter('orderBy')(filteredStories, 'rank'); // This will be the model for the sortable directive so it must be in sort order, regardless of current display order
        if (backlog.stories && backlog.stories.length > 0) {
            backlogContainer.backlog.storiesLoaded = true; // Render stories already there in the client cache
        }
        backlogContainer.sortable = StoryService.authorizedStory('rank') && ((BacklogService.isBacklog(backlog) && !$scope.hasContextOrSearch()) || BacklogService.isSandbox(backlog) || BacklogService.isSortableFromState(backlog));
        $timeout(function() { // Timeout to wait for story rendering
            $scope.$emit('selectableRefresh');
        }, 0);
    };
    var getValueEffortRateForSorting = function(story) {
        var rate = -3; // Rate = -3 when no effort (null) & no value (0)
        if (story.value === 0) {
            if (story.effort !== null) {
                rate = -story.effort / 10000; // Rate spans from 0 to -1 (unless effort is > 1000, very unlikely), higher effort => lower rate
            }
        } else {
            if (story.effort === null) {
                rate = -1 / story.value - 1; // Rate spans from -2 to -1, higher value => higher rate
            } else {
                rate = story.value / story.effort; // Rate spans from 0 to Infinity, higher value compared to effort => higher rate
            }
        }
        return rate;
    };
    $scope.orderBacklogByRank = function(backlogContainer) {
        backlogContainer.orderBy.reverse = false;
        $scope.changeBacklogOrder(backlogContainer, _.find(backlogContainer.orderBy.values, {id: 'rank'}));
    };
    $scope.changeBacklogOrder = function(backlogContainer, order) {
        var newOrder = _.clone(order);
        newOrder.value = [order.value];
        if (order.id !== 'rank') {
            newOrder.value.push('id'); // Order by id is crucial to ensure stable order when duplicate value (e.g. same effort) regardless of storyService.list order which itself depends on navigation order
        }
        if (BacklogService.isAll(backlogContainer.backlog) && order.id === 'rank') { // Hack to ensure that rank sort in "All" backlog is consistent with individual backlog ranking
            var sortByStateGroupingByBacklogState = function(story) {
                var orderCriteria = story.state === StoryStatesByName.ESTIMATED ? StoryStatesByName.ACCEPTED : story.state; // Ignore the differences betweed accepted and estimated
                return -orderCriteria; // "minus" the state to make done stories more prioritary
            };
            newOrder.value.unshift(sortByStateGroupingByBacklogState);
        }
        backlogContainer.orderBy.current = newOrder;
    };
    $scope.reverseBacklogOrder = function(backlogContainer) {
        backlogContainer.orderBy.reverse = !backlogContainer.orderBy.reverse;
    };
    $scope.isSortingBacklog = function(backlogContainer) {
        return backlogContainer.sortable && backlogContainer.orderBy.current.id === 'rank' && !backlogContainer.orderBy.reverse && !$scope.hasSearch();
    };
    $scope.enableSortable = function(backlogContainer) {
        $scope.clearContextAndSearch();
        $scope.orderBacklogByRank(backlogContainer)
    };
    $scope.openStoryUrl = function(storyId) {
        return '#/' + $scope.viewName + '/' + $state.params.elementId + '/story/' + storyId;
    };
    $scope.closeBacklogUrl = function(backlog) {
        var stateParams;
        if (backlog.code === $state.params.pinnedElementId) {
            stateParams = {pinnedElementId: $state.params.elementId, elementId: null};
        } else {
            stateParams = {elementId: null};
        }
        return $state.href('.', stateParams);
    };
    $scope.getBacklogContainer = function(backlogCode) {
        return _.find($scope.backlogContainers, function(backlogContainer) {
            return backlogContainer.backlog.code === backlogCode;
        });
    };
    $scope.showBacklog = function(backlogCode) {
        var backlogContainer = $scope.getBacklogContainer(backlogCode);
        if (!backlogContainer) {
            var backlog = _.find($scope.availableBacklogs, {code: backlogCode});
            backlog.storiesLoaded = false;
            backlogContainer = {
                backlog: backlog,
                orderBy: {
                    values: _.sortBy($scope.sortOptions, 'name')
                }
            };
            $scope.orderBacklogByRank(backlogContainer);
            $scope.refreshSingleBacklog(backlogContainer); // Init the backlog from client data (storyService.list) + init sortable variable
            var setStoriesLoaded = function() {
                backlog.storiesLoaded = true;
            };
            var retrieveServerStories = function() { // Retrieve server data, stories that were missing will be automatically added
                StoryService.listByBacklog(backlogContainer.backlog, project.id).then(function(stories) {
                    if (stories.length === 0) {
                        setStoriesLoaded();
                    }
                });
            };
            if (backlogContainer.backlog.count > 500) {
                $scope.confirm({message: $scope.message('todo.is.ui.backlog.load.confirm'), callback: retrieveServerStories, closeCallback: setStoriesLoaded});
            } else {
                retrieveServerStories();
            }
            $scope.backlogContainers.push(backlogContainer);
            var savedBacklogsOrder = $scope.getWindowSetting('elementsListOrder');
            if (savedBacklogsOrder) {
                $scope.backlogContainers.sort(function(a, b) {
                    return savedBacklogsOrder.indexOf(a.backlog.code) - savedBacklogsOrder.indexOf(b.backlog.code)
                });
            } else {
                // Keep old fashion way for all users that never reordered their backlog at least one time
                $scope.backlogContainers = _.sortBy($scope.backlogContainers, function(backlogContainer) {
                    return backlogContainer.backlog.id;
                });
            }
        }
    };
    $scope.$watchGroup([function() { return $state.$current.self.name; }, function() { return $state.params.pinnedElementId; }, function() { return $state.params.elementId; }], function(newValues) {
        var stateName = newValues[0];
        var pinnedElementId = newValues[1];
        var elementId = newValues[2];
        if (stateName === 'backlog') {
            var visibleElementsListOrder = $scope.getWindowSetting('elementsListOrder');
            var defaultBacklogCode = _.head($scope.availableBacklogs).code;
            if (visibleElementsListOrder && visibleElementsListOrder.length > 0 && _.find($scope.availableBacklogs, {code: _.head(visibleElementsListOrder)})) {
                defaultBacklogCode = _.head(visibleElementsListOrder);
            }
            $state.go('backlog.backlog', {elementId: defaultBacklogCode}, {location: 'replace'});
        } else if (_.startsWith(stateName, 'backlog')) {
            if (pinnedElementId) {
                $scope.showBacklog(pinnedElementId);
            }
            if (elementId) {
                $scope.showBacklog(elementId);
            }
            _.remove($scope.backlogContainers, function(backlogContainer) {
                return !_.includes([pinnedElementId, elementId], backlogContainer.backlog.code);
            });
        }
    });
    $scope.openBacklogUrl = function(backlog) {
        var stateName = 'backlog.backlog';
        if ($state.current.name != 'backlog.backlog.details') {
            stateName += '.details';
        }
        return $state.href(stateName, {elementId: backlog.code});
    };
    $scope.newFromFiles = function($flow, project) {
        var createStoryWithFile = function(files, project, selectOnComplet) {
            var story = new Story();
            $controller('attachmentCtrl', {$scope: $scope, attachmentable: story, clazz: 'story', workspace: project, workspaceType: WorkspaceType.PROJECT});
            var fileName = files[0].name;
            story.name = fileName.substr(0, fileName.length > 100 ? 100 : fileName.length);
            story.state = $state.includes('backlog.backlog', {elementId: 'backlog'}) && $scope.authorizedStory('createAccepted') ? StoryStatesByName.ACCEPTED : StoryStatesByName.SUGGESTED;
            return StoryService.save(story, project.id).then(function(savedObject) {
                var onFileSuccess = function(flowFile) {
                    $flow.removeFile(flowFile);
                };
                var onFileError = function(flowFile, message) {
                    var data = JSON.parse(message);
                    $scope.notifyError(angular.isArray(data) ? data[0].text : data.text, {delay: 8000});
                    $flow.removeFile(flowFile);
                };
                var onComplete = function() {
                    if (selectOnComplet) {
                        $scope.selectableOptions.selectionUpdated([savedObject.id]);
                        $timeout(function() {
                            $("[ui-view='details'] input[name='name']").focus();
                        }, 25);
                    }
                    $flow.off('fileError', onFileError);
                    $flow.off('fileSuccess', onFileSuccess);
                    $flow.off('complete', onComplete);
                };
                $flow.on('fileError', onFileError);
                $flow.on('fileSuccess', onFileSuccess);
                $flow.on('complete', onComplete);
                $flow.files = files;
                $scope.attachmentQuery($flow, savedObject);
            }, function() {
                $flow.files = files;
                $flow.cancel();
            });
        };
        var storyPerFile = $('.drop-split-zone-left').hasClass('draghover');
        var files = $flow.files;
        $flow.files = null;
        if (storyPerFile) {
            $q.serial(_.map(files, function(file) {
                return {
                    success: function() {
                        return createStoryWithFile([file], project, false);
                    }
                };
            }));
        } else {
            createStoryWithFile(files, project, true);
        }
    };
    $scope.authorizedStoryCreateFromFile = function() {
        return StoryService.authorizedStory('create') && _.find($scope.backlogContainers, function(backlogContainer) {
            return BacklogService.isSandbox(backlogContainer.backlog) || BacklogService.isBacklog(backlogContainer.backlog);
        });
    };
    // Init
    $scope.viewName = 'backlog';
    $scope.project = project;
    $scope.sortOptions = [
        {id: 'effort', value: 'effort', name: $scope.message('todo.is.ui.sort.effort')},
        {id: 'rank', value: 'rank', name: $scope.message('todo.is.ui.sort.rank')},
        {id: 'name', value: 'name', name: $scope.message('todo.is.ui.sort.name')},
        {id: 'tasks_count', value: 'tasks_count', name: $scope.message('todo.is.ui.sort.tasks')},
        {id: 'suggestedDate', value: 'suggestedDate', name: $scope.message('todo.is.ui.sort.date')},
        {id: 'feature.id', value: 'feature.id', name: $scope.message('todo.is.ui.sort.feature')},
        {id: 'value', value: 'value', name: $scope.message('todo.is.ui.sort.value')},
        {id: 'type', value: 'type', name: $scope.message('todo.is.ui.sort.type')},
        {id: 'state', value: 'state', name: $scope.message('todo.is.ui.sort.state')},
        {id: 'value/effort', value: getValueEffortRateForSorting, name: $scope.message('todo.is.ui.sort.value.effort.rate')}
    ];
    $scope.backlogSortableOptions = {
        itemMoved: function(event) {
            var story = event.source.itemScope.modelValue;
            var newRank = event.dest.index + 1;
            var sourceScope = event.source.sortableScope;
            var destScope = event.dest.sortableScope;
            var promise;
            if (BacklogService.isBacklog(sourceScope.backlogContainer.backlog) && BacklogService.isSandbox(destScope.backlogContainer.backlog)) {
                promise = StoryService.updateState(story, 'returnToSandbox', newRank);
            } else if (BacklogService.isSandbox(sourceScope.backlogContainer.backlog) && BacklogService.isBacklog(destScope.backlogContainer.backlog)) {
                promise = StoryService.updateState(story, 'accept', newRank);
            }
            if (promise) {
                promise.catch(function() {
                    $scope.revertSortable(event);
                });
            }
        },
        orderChanged: function(event) {
            var story = event.source.itemScope.modelValue;
            var backlog = event.source.sortableScope.backlogContainer.backlog;
            if (!$scope.hasContext() && !BacklogService.isCustomBacklog(backlog)) {
                var newRank = event.dest.index + 1;
                if ($state.params.storyListId !== undefined) {
                    var ids = $state.params.storyListId.split(',');
                    StoryService.rankMultiple(ids, newRank, story.backlog.id).catch(function() {
                        $scope.revertSortable(event);
                    });
                } else {
                    story.rank = newRank;
                    StoryService.update(story).then(function(updatedStory) {
                        if (updatedStory.rank !== newRank) {
                            $scope.notifyWarning('is.ui.story.warning.rank.dependsOn');
                        }
                    }).catch(function() {
                        $scope.revertSortable(event);
                    });
                }
            } else {
                var newIndex = event.dest.index;
                var stories = backlog.stories;
                StoryService.shiftRankInList(story, _.map(stories, 'id'), newIndex).catch(function() {
                    $scope.revertSortable(event);
                });
            }
        },
        accept: function(sourceItemHandleScope, destSortableScope) {
            var sameSortable = sourceItemHandleScope.itemScope.sortableScope.sortableId === destSortableScope.sortableId;
            // We don't check more that the fact that the dest backlog is also sorting
            // because we know that the only backlogs that can be sorted (Sandbox & Backlog) can always be inter-sorted (accept <-> return to backlog)
            return sameSortable && destSortableScope.isSortingBacklog(destSortableScope.backlogContainer);
        }
    };
    $scope.sortableId = 'backlog';
    $scope.selectableOptions = {
        notSelectableSelector: '.action, button, a',
        allowMultiple: true,
        selectionUpdated: function(selectedIds) {
            var currentStateName = $state.current.name;
            if (selectedIds.length === 0) {
                var storyIndexInStateName = currentStateName.indexOf('story');
                if (storyIndexInStateName != -1) {
                    $state.go(currentStateName.slice(0, storyIndexInStateName - 1));
                }
            } else {
                var stateName;
                var stateParams;
                if (_.startsWith(currentStateName, 'backlog.backlog')) {
                    stateName = 'backlog.backlog.story'
                } else if (_.startsWith(currentStateName, 'backlog.multiple')) {
                    stateName = 'backlog.multiple.story'
                }
                if (selectedIds.length === 1) {
                    stateName += '.details' + ($state.params.storyTabId ? '.tab' : '');
                    stateParams = {storyId: selectedIds};
                } else {
                    stateName += '.multiple';
                    stateParams = {storyListId: selectedIds.join(",")};
                }
                $state.go(stateName, stateParams);
            }
        },
        hasSelected: function() { // Required to disable bulk select automatically when nothing is selected
            return !_.isUndefined($state.params.storyId) || !_.isUndefined($state.params.storyListId);
        }
    };
    $scope.backlogContainers = [];
    $scope.availableBacklogs = backlogs;
    $scope.backlogCodes = BacklogCodes;
    var backlogsPendingUpdate = [];
    // Ensures that the stories list of displayed backlogs are up to date
    $scope.$on('is:backlogsUpdated', function(event, backlogCodes) {
        _.each(backlogCodes, function(backlogCode) {
            var backlogContainer = $scope.getBacklogContainer(backlogCode);
            if (backlogContainer && !_.includes(backlogsPendingUpdate, backlogCode)) {
                backlogsPendingUpdate.push(backlogCode);
                $timeout(function() {
                    _.pull(backlogsPendingUpdate, backlogCode);
                    $scope.refreshSingleBacklog(backlogContainer);
                }, 25);
            }
        });
    });
    $scope.storyListGetters = []; // Mandatory to share code between two separate substates
    $scope.findPreviousOrNextStory = StoryService.findPreviousOrNextStory($scope.storyListGetters);
}]);