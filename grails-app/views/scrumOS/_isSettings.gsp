%{--
- Copyright (c) 2016 Kagilum SAS.
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
<%@ page import="org.icescrum.core.support.ApplicationSupport; grails.converters.JSON;grails.util.Holders;" %>
<script type="text/javascript">
    var isSettings = {
        darkMode: '${asset.assetPath(src:"application-dark.css")}',
        lightMode: '${asset.assetPath(src:"application.css")}',
        lang: '${user ? user.preferences.language : lang}',
        user: ${user as JSON},
        userPreferences: ${user ? user.preferences as JSON : 'null'},
        menus: ${menus as JSON},
        roles: ${roles as JSON},
        defaultView: "${defaultView}",
        workspace: ${workspace ? workspace as JSON : 'null'},
        serverID: '${Holders.grailsApplication.config.icescrum.appID}',
        push: {
            enabled: true, // If == false, no atmosphere ressource is created
            transport: "${Holders.config.icescrum.push.transport ?: 'websocket'}",
            fallbackTransport: "${Holders.config.icescrum.push.fallbackTransport ?: 'streaming'}",
            fallbackToLastTransport: "${Holders.config.icescrum.fallbackToLastTransport ?: 'long-polling'}",
            pushLogLevel: "${Holders.config.icescrum.pushdebug.enable ? 'debug' : 'info'}"
        },
        projectPrivateDefault: ${grailsApplication.config.icescrum.project.private.default},
        projectPrivateEnabled: ${grailsApplication.config.icescrum.project.private.enable},
        projectCreationEnabled: ${ApplicationSupport.booleanValue(grailsApplication.config.icescrum.project.creation.enable)},
        registrationEnabled: ${ApplicationSupport.booleanValue(grailsApplication.config.icescrum.registration.enable)},
        retrieveEnabled: ${ApplicationSupport.booleanValue(grailsApplication.config.icescrum.login.retrieve.enable)},
        messages: ${i18nMessages as JSON},
        bundles: ${is.i18nBundle() as JSON},
        projectMenus: ${projectMenus as JSON},
        types: {
            task:${resourceBundles.taskTypes.keySet() as JSON},
            story:${resourceBundles.storyTypes.keySet() as JSON},
            feature:${resourceBundles.featureTypes.keySet() as JSON},
            planningPoker:${resourceBundles.planningPokerGameSuites.keySet() as JSON}
        },
        states: {
            task: ${resourceBundles.taskStates.keySet() as JSON},
            story: ${resourceBundles.storyStates.keySet() as JSON},
            acceptanceTest: ${resourceBundles.acceptanceTestStates.keySet() as JSON}
        },
        backlogChartTypes:${resourceBundles.backlogChartTypes.keySet() as JSON},
        backlogChartUnits:${resourceBundles.backlogChartUnits.keySet() as JSON},
        plugins: [],
        controllerHooks: {},
        showAppStore: ${flash.showAppStore?:false},
        displayWhatsNew: ${g.meta(name: 'app.displayWhatsNew') && user?.preferences?.displayWhatsNew ?: false},
        version: "${g.meta(name: 'app.version')}",
        serverUrl: "${serverURL.encodeAsJavaScript()}",
        warning: ${ApplicationSupport.getLastWarning() as JSON},
        workerSrc: "${asset.assetPath(src:"vendors/vanilla/pdfjs/pdf.worker.js")}",
        enableEmojis: ${ApplicationSupport.isUTF8Database()},
        enableProfiler: ${params.profiler ? grailsApplication.config.icescrum.profiling.enable : false},
        announcement: ${announcement as JSON},
        isMobile: ${isMobile},
        loginLink: "${createLink(controller: 'login', action: 'auth')}",
        logoutLink: "${createLink(controller: 'logout')}",
        redirectToParameter: "redirectTo",
        meeting: {
            providers: [<entry:point id="scrumOS-isSettings-meeting" model="[user:user, roles:roles, workspace: workspace]" join=","/>]
        },
        attachment: {
            providers: [<entry:point id="scrumOS-isSettings-attachment" model="[user:user, roles:roles, workspace: workspace]" join=","/>]
        },
        retrospective: {
            providers: [<entry:point id="scrumOS-isSettings-retrospective" model="[user:user, roles:roles, workspace: workspace]" join=","/>]
        },
        clientsOauth: {
    <g:each in="${grailsApplication.config.icescrum.clientsOauth}" var="clientOauth">
    ${clientOauth.key}: ${clientOauth.value.findAll{ it.key != 'clientSecret' } as JSON},
    </g:each>
    },
    <entry:point id="scrumOS-isSettings" model="[user:user, roles:roles, workspace: workspace]" join=","/>
    }
    ;
</script>
