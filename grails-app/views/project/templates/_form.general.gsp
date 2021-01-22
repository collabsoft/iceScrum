<%@ page import="org.icescrum.core.domain.security.Authority; grails.plugin.springsecurity.SpringSecurityUtils; org.icescrum.core.support.ApplicationSupport" %>
%{--
- Copyright (c) 2014 Kagilum.
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
<script type="text/ng-template" id="form.general.project.html">
<h4>${message(code: "is.dialog.wizard.section.project")}</h4>
<p class="form-text">${message(code: 'is.dialog.wizard.section.project.description')}</p>
<entry:point id="project-form-general-before"/>
<div class="row">
    <div class="form-half">
        <label for="name">${message(code: 'is.project.name')}</label>
        <input autofocus
               name="name"
               type="text"
               autocomplete="off"
               class="form-control"
               placeholder="${message(code: 'todo.is.ui.project.noname')}"
               ng-model="project.name"
               ng-change="nameChanged()"
               ng-required="isCurrentStep(1, 'project')">
    </div>
    <div class="form-1-quarter">
        <label for="pkey">${message(code: 'is.project.pkey')}</label>
        <input name="pkey"
               type="text"
               capitalize
               class="form-control"
               placeholder="${message(code: 'todo.is.ui.project.nokey')}"
               ng-model="project.pkey"
               ng-pattern="/^[A-Z0-9]*[A-Z][A-Z0-9]*$/"
               pattern-error-message="${message(code: 'project.pkey.matches.invalid')}"
               autocomplete="off"
               ng-required="isCurrentStep(1, 'project')"
               ng-maxlength="10"
               ng-remote-validate-code="project.pkey.unique"
               ng-remote-validate="{{ checkProjectPropertyUrl }}/pkey">
    </div>
    <div class="form-1-quarter">
        <label for="hidden">${message(code: 'is.ui.project.visibility')}</label>
        <div>
            <button class="btn btn-model btn-sm"
                    type="button"
                    ng-disabled="!enableVisibilityChange()"
                    ng-model="project.preferences.hidden"
                    ng-click="project.preferences.hidden = !project.preferences.hidden;"
                    ng-class="project.preferences.hidden ? 'btn-success' : 'btn-danger'">
                {{ message(project.preferences.hidden  ? 'is.ui.workspace.hidden' : 'is.ui.workspace.public') }}
            </button>
        </div>
    </div>
</div>
<div class="row">
    <div class="col form-group">
        <label for="description">${message(code: 'is.project.description')}</label>
        <textarea at
                  is-markitup
                  name="project.description"
                  class="form-control"
                  placeholder="${message(code: 'todo.is.ui.project.description.placeholder')}"
                  ng-model="project.description"
                  ng-show="showDescriptionTextarea"
                  ng-blur="delayCall(toggleDescription, [false])"
                  is-model-html="project.description_html"></textarea>
        <div class="markitup-preview form-control"
             tabindex="0"
             ng-show="!showDescriptionTextarea"
             ng-click="toggleDescription(true)"
             ng-focus="toggleDescription(true)"
             ng-class="{'placeholder': !project.description_html}"
             ng-bind-html="project.description_html ? project.description_html : '<p>' + message('todo.is.ui.project.description.placeholder') + '</p>'"></div>
    </div>
</div>
</script>
