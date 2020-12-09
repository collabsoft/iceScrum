%{--
- Copyright (c) 2015 Kagilum.
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
<script type="text/ng-template" id="feature.multiple.html">
<div class="card">
    <div class="details-header">
        <a class="btn btn-icon" href="#/{{ ::viewName }}">
            <span class="icon icon-close"></span>
        </a>
    </div>
    <div class="card-header">
        <div class="card-title">
            ${message(code: "is.ui.feature")} ({{ features.length }})
        </div>
        <div class="row">
            <div class="col-md-6">
                <div class="sticky-notes sticky-notes-standalone grid-group">
                    <div class="sticky-note-container sticky-note-feature stack twisted">
                        <div sticky-note-color-watch="{{ topFeature.color }}"
                             class="sticky-note {{ (topFeature.color | contrastColor) + ' ' + (featurePreview.type | featureType) }}">
                            <div class="sticky-note-head">
                                <span class="id">{{ topFeature.uid }}</span>
                                <div class="sticky-note-type-icon"></div>
                            </div>
                            <div class="sticky-note-content" ng-class="::{'has-description':!!feature.description}">
                                <div class="item-values">
                                    <span ng-if="topFeature.value">
                                        ${message(code: 'is.feature.value')} <strong>{{  topFeature.value }}</strong>
                                    </span>
                                </div>
                                <div class="title">{{ topFeature.name }}</div>
                                <div class="description"
                                     ng-bind-html="topFeature.description | lineReturns"></div>
                            </div>
                            <div class="sticky-note-tags">
                                <a ng-repeat="tag in topFeature.tags"
                                   href="{{ tagContextUrl(tag) }}">
                                    <span class="tag {{ getTagColor(tag) | contrastColor }}"
                                          ng-style="{'background-color': getTagColor(tag) }">{{:: tag }}</span>
                                </a>
                            </div>
                            <div class="sticky-note-actions">
                                <span class="action" ng-class="{'active':topFeature.attachments_count}">
                                    <a class="action-link" defer-tooltip="${message(code: 'todo.is.ui.backlogelement.attachments')}">
                                        <span class="action-icon action-icon-attach"></span>
                                    </a>
                                </span>
                                <span class="action" ng-class="{'active':topFeature.comments_count}">
                                    <a class="action-link" defer-tooltip="${message(code: 'todo.is.ui.comments')}">
                                        <span class="action-icon action-icon-comment"></span>
                                        <span class="badge">{{ topFeature.comments_count || '' }}</span>
                                    </a>
                                </span>
                                <span class="action" ng-class="{'active':topFeature.stories_ids.length}">
                                    <a class="action-link" defer-tooltip="${message(code: 'todo.is.ui.stories')}">
                                        <span class="action-icon action-icon-story"></span>
                                        <span class="badge">{{ topFeature.stories_ids.length || ''}}</span>
                                    </a>
                                </span>
                                <span class="action">
                                    <a class="action-link">
                                        <span class="action-icon action-icon-menu"></span>
                                    </a>
                                </span>
                            </div>
                            <div class="sticky-note-state-progress">
                                <div class="state">{{ topFeature.state | i18n:'FeatureStates' }}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="btn-toolbar btn-toolbar-multiline">
                    <entry:point id="feature-multiple-toolbar"/>
                    <div ng-if="authorizedFeatures('markDone', features)"
                         class="btn-group">
                        <button type="button"
                                class="btn btn-primary btn-sm"
                                ng-click="doneMultiple()">
                            ${message(code: 'is.ui.feature.state.done')}
                        </button>
                    </div>
                    <button type="button"
                            ng-if="authorizedFeatures('copy', features)"
                            class="btn btn-secondary btn-sm"
                            ng-click="copyMultiple()">
                        ${message(code: 'is.ui.copy')}
                    </button>
                    <div ng-if="authorizedFeatures('markInProgress', features)"
                         class="btn-group">
                        <button type="button"
                                class="btn btn-secondary btn-sm"
                                ng-click="inProgressMultiple()">
                            ${message(code: 'is.ui.feature.state.inProgress')}
                        </button>
                    </div>
                    <div ng-if="authorizedFeatures('delete')"
                         class="btn-group">
                        <button type="button"
                                class="btn btn-danger btn-sm"
                                delete-button-click="deleteMultiple()">
                            ${message(code: 'default.button.delete.label')}
                        </button>
                    </div>
                </div>
                <br/>
                <div class="table-responsive">
                    <table class="table">
                        <tr><td>${message(code: 'is.feature.value')}</td><td>{{ sumValues(features) }}</td></tr>
                        <tr><td>${message(code: 'todo.is.ui.stories')}</td><td>{{ sumStories(features) }}</td></tr>
                    </table>
                </div>
            </div>
        </div>
    </div>
    <div class="details-no-tab">
        <form ng-submit="updateMultiple(featurePreview)"
              ng-if="authorizedFeature('update')"
              name='featureForm'
              show-validation
              novalidate>
            <div class="card-body">
                <div class="row is-form-row">
                    <div class="form-half">
                        <label for="type">${message(code: 'is.feature.type')}</label>
                        <ui-select class="form-control"
                                   name="type"
                                   ng-model="featurePreview.type">
                            <ui-select-match placeholder="${message(code: 'todo.is.ui.feature.type.placeholder')}">{{ $select.selected | i18n:'FeatureTypes' }}</ui-select-match>
                            <ui-select-choices repeat="featureType in featureTypes">{{ featureType | i18n:'FeatureTypes' }}</ui-select-choices>
                        </ui-select>
                    </div>
                </div>
                <div class="form-group"
                     ng-if="showTags">
                    <label for="tags">${message(code: 'is.backlogelement.tags')}</label>
                    <ui-select ng-click="retrieveTags()"
                               class="form-control"
                               name="tags"
                               multiple
                               tagging
                               tagging-tokens="SPACE|,"
                               tagging-label="${message(code: 'todo.is.ui.tag.create')}"
                               ng-model="featurePreview.tags">
                        <ui-select-match placeholder="${message(code: 'is.ui.backlogelement.notags')}">{{ $item }}</ui-select-match>
                        <ui-select-choices repeat="tag in tags | filter: $select.search">
                            <span ng-bind-html="tag | highlight: $select.search"></span>
                        </ui-select-choices>
                    </ui-select>
                </div>
                <entry:point id="feature-multiple-properties-after-tag"/>
            </div>
            <div class="card-footer">
                <div class="btn-toolbar">
                    <a class="btn btn-secondary"
                       href="#/{{ ::viewName }}">
                        ${message(code: 'is.button.cancel')}
                    </a>
                    <button class="btn btn-primary"
                            type="submit"
                            ng-disabled="!featureForm.$dirty || featureForm.$invalid || application.submitting">
                        ${message(code: 'default.button.update.label')}
                    </button>
                </div>
            </div>
        </form>
    </div>
</div>
</script>