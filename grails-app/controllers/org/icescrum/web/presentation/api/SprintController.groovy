/*
 * Copyright (c) 2015 Kagilum.
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
package org.icescrum.web.presentation.api

import grails.converters.JSON
import grails.plugin.springsecurity.annotation.Secured
import org.icescrum.core.domain.Project
import org.icescrum.core.domain.Release
import org.icescrum.core.domain.Sprint
import org.icescrum.core.error.ControllerErrorHandler
import org.icescrum.core.support.ApplicationSupport
import org.icescrum.core.utils.DateUtils

class SprintController implements ControllerErrorHandler {

    def sprintService
    def storyService

    @Secured(['stakeHolder() or inProject()'])
    def index(long project, Long releaseId, String type) {
        def sprints
        if (type == 'release') {
            Release release = releaseId ? Release.withRelease(project, releaseId) : Release.findCurrentOrNextRelease(project).list()[0]
            sprints = release?.sprints ?: []
        } else {
            Project _project = Project.withProject(project)
            sprints = _project.sprints
        }
        render(status: 200, contentType: 'application/json', text: sprints as JSON)
    }

    @Secured('inProject()')
    def show(long project, long id) {
        Sprint sprint = Sprint.withSprint(project, id)
        render(status: 200, contentType: 'application/json', text: sprint as JSON)
    }

    @Secured('(productOwner() or scrumMaster()) and !archivedProject()')
    def save(long project) {
        def sprintParams = params.sprint
        def releaseId = params.parentRelease?.id ?: sprintParams.parentRelease?.id
        if (!releaseId) {
            returnError(code: 'is.release.error.not.exist')
            return
        }
        Release release = Release.withRelease(project, releaseId.toLong())
        if (sprintParams.startDate) {
            sprintParams.startDate = DateUtils.parseDateISO8601(sprintParams.startDate)
        }
        if (sprintParams.endDate) {
            sprintParams.endDate = DateUtils.parseDateISO8601(sprintParams.endDate)
        }
        Sprint sprint = new Sprint()
        Sprint.withTransaction {
            bindData(sprint, sprintParams, [include: ['goal', 'startDate', 'endDate', 'deliveredVersion']])
            sprintService.save(sprint, release)
        }
        render(status: 201, contentType: 'application/json', text: sprint as JSON)
    }

    @Secured('(productOwner() or scrumMaster()) and !archivedProject()')
    def update(long project, long id) {
        def sprintParams = params.sprint
        Sprint sprint = Sprint.withSprint(project, id)
        def startDate = sprintParams.startDate && sprintParams.startDate != 'null' ? DateUtils.parseDateISO8601(sprintParams.startDate) : sprint.startDate // Catch a strange bug when "null"
        def endDate = sprintParams.endDate && sprintParams.endDate != 'null' ? DateUtils.parseDateISO8601(sprintParams.endDate) : sprint.endDate // Catch a strange bug when "null"
        Sprint.withTransaction {
            bindData(sprint, sprintParams, [include: ['goal', 'deliveredVersion', 'retrospective', 'doneDefinition']])
            sprintService.update(sprint, startDate, endDate)
        }
        render(status: 200, contentType: 'application/json', text: sprint as JSON)
    }

    @Secured('(productOwner() or scrumMaster()) and !archivedProject()')
    def delete(long project, long id) {
        Sprint sprint = Sprint.withSprint(project, id)
        sprintService.delete(sprint)
        withFormat {
            html {
                render(status: 200, contentType: 'application/json', text: [id: id] as JSON)
            }
            json {
                render(status: 204)
            }
        }
    }

    @Secured(['stakeHolder() or inProject()'])
    def currentOrNextOrLast(long project) {
        Sprint sprint = Sprint.findCurrentOrNextOrLast(project)
        render(status: 200, contentType: 'application/json', text: sprint as JSON)
    }

    @Secured('(productOwner() or scrumMaster()) and !archivedProject()')
    def generateSprints(long project, long releaseId) {
        Release release = Release.withRelease(project, releaseId)
        def sprints = sprintService.generateSprints(release)
        render(status: 200, contentType: 'application/json', text: sprints as JSON)
    }

    @Secured('(productOwner() or scrumMaster()) and !archivedProject()')
    def autoPlan(Double plannedVelocity) {
        def sprints = Sprint.withSprints(params)
        storyService.autoPlan(sprints, plannedVelocity)
        def returnData = sprints.size() > 1 ? sprints : sprints.first()
        render(status: 200, contentType: 'application/json', text: returnData as JSON)
    }

    @Secured('(productOwner() or scrumMaster()) and !archivedProject()')
    def unPlan() {
        def sprints = Sprint.withSprints(params)
        storyService.unPlanAll(sprints)
        def returnData = sprints.size() > 1 ? sprints : sprints.first()
        render(status: 200, contentType: 'application/json', text: returnData as JSON)
    }

    @Secured('(productOwner() or scrumMaster()) and !archivedProject()')
    def activate(long project, long id) {
        Sprint sprint = Sprint.withSprint(project, id)
        sprintService.activate(sprint)
        render(status: 200, contentType: 'application/json', text: sprint as JSON)
    }

    @Secured('(productOwner() or scrumMaster()) and !archivedProject()')
    def reactivate(long project, long id) {
        Sprint sprint = Sprint.withSprint(project, id)
        sprintService.reactivate(sprint)
        render(status: 200, contentType: 'application/json', text: sprint as JSON)
    }

    @Secured('(productOwner() or scrumMaster()) and !archivedProject()')
    def close(long project, long id) {
        Sprint sprint = Sprint.withSprint(project, id)
        sprintService.close(sprint)
        render(status: 200, contentType: 'application/json', text: sprint as JSON)
    }

    @Secured('inProject() and !archivedProject()')
    def copyRecurrentTasks(long project, long id) {
        Sprint sprint = Sprint.withSprint(project, id)
        sprintService.copyRecurrentTasks(sprint)
        render(status: 200, contentType: 'application/json', text: sprint as JSON)
    }

    @Secured(['stakeHolder() or inProject()'])
    def burndownRemaining(long project, Long id) {
        Sprint sprint = id ? Sprint.withSprint(project, id) : Sprint.findCurrentOrLastSprint(project).list()[0]
        def values = sprintService.sprintBurndownRemainingValues(sprint)
        def computedValues = [[key   : message(code: "is.chart.sprintBurndownRemainingChart.serie.task.name"),
                               values: values.findAll { it.remainingTime != null }.collect { return [it.label, it.remainingTime] },
                               color : '#00abfc']]
        if (values && values.first().idealTime) {
            computedValues << [key   : message(code: "is.chart.sprintBurndownRemainingChart.serie.task.ideal"),
                               values: values.findAll { it.idealTime != null }.collect { return [it.label, it.idealTime] },
                               color : '#50e3c2']
        }
        def xDomain = ApplicationSupport.getSprintXDomain(sprint, values)
        def options = [chart: [yDomain: [0, values.collect { [it.idealTime, it.remainingTime].max() }.max()],
                               xDomain: xDomain,
                               yAxis  : [axisLabel: message(code: 'is.chart.sprintBurndownRemainingChart.yaxis.label')],
                               xAxis  : [axisLabel: message(code: 'is.chart.sprintBurndownRemainingChart.xaxis.label'), tickValues: ApplicationSupport.getChartTickValues(xDomain)]],
                       title: [text: message(code: "is.chart.sprintBurndownRemainingChart.title")]]
        render(status: 200, contentType: 'application/json', text: [data: computedValues, options: options] as JSON)
    }

    @Secured(['stakeHolder() or inProject()'])
    def burnupTasks(long project, Long id) {
        Sprint sprint = id ? Sprint.withSprint(project, id) : Sprint.findCurrentOrLastSprint(project).list()[0]
        def values = sprintService.sprintBurnupTasksValues(sprint)
        def computedValues = [
                [key   : message(code: "is.chart.sprintBurnupTasksChart.serie.tasksDone.name"),
                 values: values.findAll { it.tasksDone != null }.collect { return [it.label, it.tasksDone] },
                 color : '#50e3c2'],
                [key   : message(code: "is.chart.sprintBurnupTasksChart.serie.tasks.name"),
                 values: values.findAll { it.tasks != null }.collect { return [it.label, it.tasks] },
                 color : '#00abfc']
        ]
        def xDomain = ApplicationSupport.getSprintXDomain(sprint, values)
        def options = [chart: [yDomain: [0, values.collect { [it.tasksDone, it.tasks].max() }.max()],
                               xDomain: xDomain,
                               yAxis  : [axisLabel: message(code: 'is.chart.sprintBurnupTasksChart.yaxis.label')],
                               xAxis  : [axisLabel: message(code: 'is.chart.sprintBurnupTasksChart.xaxis.label'), tickValues: ApplicationSupport.getChartTickValues(xDomain)]],
                       title: [text: message(code: "is.chart.sprintBurnupTasksChart.title")]]
        render(status: 200, contentType: 'application/json', text: [data: computedValues, options: options] as JSON)
    }

    @Secured(['stakeHolder() or inProject()'])
    def burndownPoints(long project, Long id) {
        Sprint sprint = id ? Sprint.withSprint(project, id) : Sprint.findCurrentOrLastSprint(project).list()[0]
        def values = sprintService.sprintStoriesValues(sprint)
        def computedValues = [
                [key   : message(code: "is.chart.sprintBurndownPointsChart.serie.points.name"),
                 values: values.findAll { it.remainingPoints != null }.collect { return [it.label, it.remainingPoints] },
                 color : '#00abfc']
        ]
        def xDomain = ApplicationSupport.getSprintXDomain(sprint, values)
        def options = [chart: [yDomain: [0, values.max { it.remainingPoints }],
                               xDomain: xDomain,
                               yAxis  : [axisLabel: message(code: 'is.chart.sprintBurndownPointsChart.yaxis.label')],
                               xAxis  : [axisLabel: message(code: 'is.chart.sprintBurndownPointsChart.xaxis.label'), tickValues: ApplicationSupport.getChartTickValues(xDomain)]],
                       title: [text: message(code: "is.chart.sprintBurndownPointsChart.title")]]
        render(status: 200, contentType: 'application/json', text: [data: computedValues, options: options] as JSON)
    }

    @Secured(['stakeHolder() or inProject()'])
    def burnupPoints(long project, Long id) {
        Sprint sprint = id ? Sprint.withSprint(project, id) : Sprint.findCurrentOrLastSprint(project).list()[0]
        def values = sprintService.sprintStoriesValues(sprint)
        def computedValues = [
                [key   : message(code: "is.chart.sprintBurnupPointsChart.serie.points.name"),
                 values: values.findAll { it.totalPoints != null }.collect { return [it.label, it.totalPoints] },
                 color : '#00abfc'],
                [key   : message(code: "is.chart.sprintBurnupPointsChart.serie.pointsDone.name"),
                 values: values.findAll { it.pointsDone != null }.collect { return [it.label, it.pointsDone] },
                 color : '#50e3c2']
        ]
        def xDomain = ApplicationSupport.getSprintXDomain(sprint, values)
        def options = [chart: [yDomain: [0, values.collect { [it.totalPoints, it.pointsDone].max() }.max()],
                               xDomain: xDomain,
                               yAxis  : [axisLabel: message(code: 'is.chart.sprintBurnupPointsChart.yaxis.label')],
                               xAxis  : [axisLabel: message(code: 'is.chart.sprintBurnupPointsChart.xaxis.label'), tickValues: ApplicationSupport.getChartTickValues(xDomain)]],
                       title: [text: message(code: "is.chart.sprintBurnupPointsChart.title")]]
        render(status: 200, contentType: 'application/json', text: [data: computedValues, options: options] as JSON)
    }

    @Secured(['stakeHolder() or inProject()'])
    def burnupStories(long project, Long id) {
        Sprint sprint = id ? Sprint.withSprint(project, id) : Sprint.findCurrentOrLastSprint(project).list()[0]
        def values = sprintService.sprintStoriesValues(sprint)
        def computedValues = [
                [key   : message(code: "is.chart.sprintBurnupStoriesChart.serie.stories.name"),
                 values: values.findAll { it.stories != null }.collect { return [it.label, it.stories] },
                 color : '#00abfc'],
                [key   : message(code: "is.chart.sprintBurnupStoriesChart.serie.storiesDone.name"),
                 values: values.findAll { it.storiesDone != null }.collect { return [it.label, it.storiesDone] },
                 color : '#50e3c2']
        ]
        def xDomain = ApplicationSupport.getSprintXDomain(sprint, values)
        def options = [chart: [yDomain: [0, values.collect { [it.stories, it.storiesDone].max() }.max()],
                               xDomain: xDomain,
                               yAxis  : [axisLabel: message(code: 'is.chart.sprintBurnupStoriesChart.yaxis.label')],
                               xAxis  : [axisLabel: message(code: 'is.chart.sprintBurnupStoriesChart.xaxis.label'), tickValues: ApplicationSupport.getChartTickValues(xDomain)]],
                       title: [text: message(code: "is.chart.sprintBurnupStoriesChart.title")]]
        render(status: 200, contentType: 'application/json', text: [data: computedValues, options: options] as JSON)
    }
}
