%{--
- Copyright (c) 2017 Kagilum.
-
- This file is part of iceScrum.
-
- iceScrum is free software: you can redistribute it and/or modify
- it under the terms of the GNU Affero General Public License as published by
- the Free Software Foundation, either version 3 of the License.
-
- iceScrum is distributed in the hope that it will be useful,
- but WITHOUT ANY WARRANTY; without even the implied warranty of
- MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
- GNU General Public License for more details.
-
- You should have received a copy of the GNU Affero General Public License
- along with iceScrum.  If not, see <http://www.gnu.org/licenses/>.
-
- Authors:
-
- Vincent Barrier (vbarrier@kagilum.com)
- Nicolas Noullet (nnoullet@kagilum.com)
--}%
<form ng-submit="update(editableSprint)"
      name='formHolder.sprintForm'
      ng-class="{'form-editable': formEditable(), 'form-editing': formHolder.editing }"
      show-validation
      novalidate>
    <div class="card-body">
        <div class="drop-zone d-flex align-items-center justify-content-center">
            <div>
                <asset:image src="application/upload.svg" width="70" height="70"/>
                <span class="drop-text">${message(code: 'todo.is.ui.drop.here')}</span>
            </div>
        </div>
        <div class="row is-form-row">
            <div class="form-half">
                <label for="sprint.startDate">${message(code: 'is.sprint.startDate')}</label>
                <div ng-class="{'input-group': authorizedSprint('updateStartDate', sprint)}">
                    <input type="text"
                           class="form-control"
                           required
                           ng-focus="editForm(true)"
                           name="startDate"
                           ng-disabled="!authorizedSprint('updateStartDate', sprint)"
                           ng-model="editableSprint.startDate"
                           ng-model-options="{timezone: 'utc'}"
                           custom-validate="validateStartDate"
                           custom-validate-code="is.ui.timebox.warning.dates"
                           uib-datepicker-popup
                           datepicker-options="startDateOptions"
                           is-open="startDateOptions.opened"/>
                    <span class="input-group-append"
                          ng-if="authorizedSprint('updateStartDate', sprint)">
                        <button type="button"
                                class="btn btn-secondary btn-sm"
                                ng-focus="editForm(true)"
                                ng-click="openDatepicker($event, startDateOptions)">
                            <i class="fa fa-calendar"></i>
                        </button>
                    </span>
                </div>
            </div>
            <div class="form-half">
                <label for="sprint.endDate">${message(code: 'is.sprint.endDate')}</label>
                <div ng-class="{'input-group': authorizedSprint('updateEndDate', sprint)}">
                    <input type="text"
                           class="form-control"
                           required
                           ng-focus="editForm(true)"
                           name="endDate"
                           ng-disabled="!authorizedSprint('updateEndDate', sprint)"
                           ng-model="editableSprint.endDate"
                           ng-model-options="{timezone: 'utc'}"
                           custom-validate="validateEndDate"
                           custom-validate-code="is.ui.timebox.warning.dates"
                           uib-datepicker-popup
                           datepicker-options="endDateOptions"
                           is-open="endDateOptions.opened"/>
                    <span class="input-group-append"
                          ng-if="authorizedSprint('updateEndDate', sprint)">
                        <button type="button"
                                class="btn btn-secondary btn-sm"
                                ng-focus="editForm(true)"
                                ng-click="openDatepicker($event, endDateOptions)">
                            <i class="fa fa-calendar"></i>
                        </button>
                    </span>
                </div>
            </div>
        </div>
        <div ng-if="project.portfolio && (formHolder.sprintForm.startDate.$dirty || formHolder.sprintForm.endDate.$dirty)"
             class="form-text alert bg-warning spaced-form-text mb-3">
            ${message(code: 'is.ui.portfolio.warning.dates')}
        </div>
        <div is-watch="sprint" is-watch-property="['doneDate','endDate']">
            <div class="chart"
                 ng-controller="chartCtrl"
                 ng-init="openChart('sprint', 'burnupTasks', sprint)">
                <div uib-dropdown
                     ng-controller="projectChartCtrl"
                     class="float-right">
                    <div class="btn-group visible-on-hover">
                        <button class="btn btn-secondary btn-sm"
                                ng-click="openChartInModal(chartParams)"
                                type="button">
                            <i class="fa fa-search-plus"></i>
                        </button>
                        <button class="btn btn-secondary btn-sm"
                                ng-click="saveChart(chartParams)"
                                type="button">
                            <i class="fa fa-floppy-o"></i>
                        </button>
                    </div>
                    <button class="btn btn-secondary btn-sm"
                            type="button"
                            uib-dropdown-toggle>
                        <span defer-tooltip="${message(code: 'todo.is.ui.charts')}"><i class="fa fa-bar-chart"></i></span>
                    </button>
                    <div uib-dropdown-menu class="dropdown-menu-right">
                        <a href
                           class="dropdown-item"
                           ng-class="{'active': chart.id == chartParams.chartName}"
                           ng-repeat="chart in projectCharts.sprint"
                           ng-click="openChart('sprint', chart.id, sprint)">{{ message(chart.name) }}</a>
                    </div>
                </div>
                <div ng-switch="chartLoaded">
                    <nvd3 ng-switch-when="true" options="options | merge: {chart:{height: 200}, title:{enable: false}}" data="data"></nvd3>
                    <div ng-switch-default class="chart-loading loading-dot dot-elastic align-middle align-self-center"></div>
                </div>
            </div>
        </div>
        <div class="form-group">
            <label for="goal">${message(code: 'is.sprint.goal')}</label>
            <textarea at
                      name="goal"
                      class="form-control"
                      ng-focus="editForm(true)"
                      ng-disabled="!formEditable()"
                      ng-maxlength="5000"
                      ng-model="editableSprint.goal"
                      placeholder="${message(code: 'todo.is.ui.sprint.nogoal')}"></textarea>
        </div>
        <div class="form-group">
            <label for="doneDefinition">${message(code: 'is.sprint.doneDefinition')}</label>
            <textarea at
                      is-markitup
                      class="form-control"
                      name="doneDefinition"
                      ng-model="editableSprint.doneDefinition"
                      is-model-html="editableSprint.doneDefinition_html"
                      ng-show="showDoneDefinitionTextarea"
                      ng-blur="showDoneDefinitionTextarea = false"
                      placeholder="${message(code: 'todo.is.ui.sprint.nodonedefinition')}"></textarea>
            <div class="markitup-preview form-control"
                 ng-disabled="!formEditable()"
                 ng-show="!showDoneDefinitionTextarea"
                 ng-focus="editForm(true); showDoneDefinitionTextarea = formEditable()"
                 ng-class="{'placeholder': !editableSprint.doneDefinition_html}"
                 tabindex="0"
                 bind-html-scope="markitupCheckboxOptions('doneDefinition')"
                 bind-html-compile="editableSprint.doneDefinition_html ? editableSprint.doneDefinition_html : '<p>${message(code: 'todo.is.ui.sprint.nodonedefinition').replaceAll("'", "\\\\'")}</p>'"></div>
        </div>
        <div class="form-group" ng-if="sprint.state > sprintStatesByName.TODO">
            <label for="retrospective">${message(code: 'is.sprint.retrospective')}</label>
            <textarea at
                      is-markitup
                      class="form-control"
                      name="retrospective"
                      ng-model="editableSprint.retrospective"
                      is-model-html="editableSprint.retrospective_html"
                      ng-show="showRetrospectiveTextarea"
                      ng-blur="showRetrospectiveTextarea = false"
                      placeholder="${message(code: 'todo.is.ui.sprint.noretrospective')}"></textarea>
            <div class="markitup-preview form-control"
                 ng-disabled="!formEditable()"
                 ng-show="!showRetrospectiveTextarea"
                 ng-focus="editForm(true); showRetrospectiveTextarea = formEditable()"
                 ng-class="{'placeholder': !editableSprint.retrospective_html}"
                 tabindex="0"
                 bind-html-scope="markitupCheckboxOptions('retrospective')"
                 bind-html-compile="editableSprint.retrospective_html ? editableSprint.retrospective_html : '<p>${message(code: 'todo.is.ui.sprint.noretrospective').replaceAll("'", "\\\\'")}</p>'"></div>
        </div>
        <div class="form-group">
            <label for="deliveredVersion">${message(code: 'is.sprint.deliveredVersion')}</label>
            <input name="deliveredVersion"
                   ng-focus="editForm(true)"
                   ng-model="editableSprint.deliveredVersion"
                   type="text"
                   ng-maxlength="255"
                   class="form-control"
                   placeholder="${message(code: 'todo.is.ui.sprint.nodeliveredversion')}"/>
        </div>
        <label>${message(code: 'is.backlogelement.attachment')} {{ sprint.attachments_count > 0 ? '(' + sprint.attachments_count + ')' : '' }}</label>
        <div class="attachments attachments-bordered">
            <div ng-if="authorizedSprint('upload', sprint)" ng-controller="attachmentNestedCtrl" class="upload-and-apps row">
                <div class="upload-file col-6">
                    <span class="attachment-icon"></span><span flow-btn class="link">${message(code: 'todo.is.ui.attachment.add')}</span>&nbsp;<span class="d-none d-md-inline">${message(code: 'todo.is.ui.attachment.drop')}</span>
                </div>
                <div class="upload-apps col-6">
                    <g:include view="attachment/_buttons.gsp"/>
                </div>
            </div>
            <div ng-include="'attachment.list.html'"></div>
        </div>
    </div>
    <div class="card-footer" ng-if="isModal || formHolder.editing">
        <div class="btn-toolbar" ng-class="[{ 'text-right' : isModal }]">
            <button class="btn btn-secondary"
                    type="button"
                    ng-if="isModal && !isDirty()"
                    ng-click="$close()">
                ${message(code: 'is.button.close')}
            </button>
            <button class="btn btn-secondary"
                    type="button"
                    ng-if="(!isModal && formHolder.editing) || (isModal && isDirty())"
                    ng-click="editForm(false)">
                ${message(code: 'is.button.cancel')}
            </button>
            <button class="btn btn-warning"
                    type="button"
                    ng-if="isDirty() && !isLatest() && !application.submitting"
                    ng-click="resetSprintForm()">
                <i class="fa fa-warning"></i> ${message(code: 'default.button.refresh.label')}
            </button>
            <button class="btn btn-danger"
                    ng-if="formHolder.editing && !isLatest() && !application.submitting"
                    ng-disabled="!isDirty() || formHolder.sprintForm.$invalid"
                    type="submit">
                ${message(code: 'default.button.override.label')}
            </button>
            <button class="btn btn-primary"
                    ng-if="formHolder.editing && (isLatest() || application.submitting)"
                    ng-disabled="!isDirty() || formHolder.sprintForm.$invalid || application.submitting"
                    type="submit">
                ${message(code: 'default.button.update.label')}
            </button>
        </div>
    </div>
</form>
