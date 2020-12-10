/*
 * Copyright (c) 2015 Kagilum SAS
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
import org.apache.commons.io.FilenameUtils
import org.hibernate.ObjectNotFoundException
import org.icescrum.components.FileUploadInfo
import org.icescrum.components.UtilsWebComponents
import org.icescrum.core.domain.Activity
import org.icescrum.core.domain.Invitation
import org.icescrum.core.domain.Project
import org.icescrum.core.domain.User
import org.icescrum.core.domain.preferences.UserPreferences
import org.icescrum.core.error.BusinessException
import org.icescrum.core.error.ControllerErrorHandler
import org.icescrum.core.support.ApplicationSupport
import org.springframework.mail.MailException
import org.springframework.security.acls.domain.BasePermission

class UserController implements ControllerErrorHandler {

    def userService
    def securityService
    def grailsApplication
    def springSecurityService

    @Secured(["hasRole('ROLE_ADMIN')"])
    def index(String term, String filter, Boolean paginate, Integer count, Integer page, String sorting, String order) {
        def options = [cache: true]
        if (paginate) {
            options.offset = page ? (page - 1) * count : 0
            options.max = count ?: 10
            options.sort = sorting ?: 'firstName'
            options.order = order ?: 'asc'
        }
        def users
        def userCount
        if (filter == "enabled") {
            users = term ? User.findUsersLikeAndEnabled(false, term, true, options) : User.findAllByEnabled(true, options)
            if (paginate) {
                userCount = term ? User.countUsersLikeAndEnabled(false, term, true, [cache: true]) : User.countByEnabled(true)
            }
        } else if (filter == "disabled") {
            users = term ? User.findUsersLikeAndEnabled(false, term, false, options) : User.findAllByEnabled(false, options)
            if (paginate) {
                userCount = term ? User.countUsersLikeAndEnabled(false, term, false, [cache: true]) : User.countByEnabled(false)
            }
        } else {
            users = term ? User.findUsersLike(term, false, true, options) : User.list(options)
            if (paginate) {
                userCount = term ? User.countUsersLike(false, term, [cache: true]) : User.count()
            }
        }
        request.marshaller = [user: [include: ['preferences']]]
        def returnData = paginate ? [users: users, count: userCount] : users
        render(status: 200, contentType: 'application/json', text: returnData as JSON)
    }

    @Secured("isAuthenticatedWeb() || hasAnyScopeOauth2('user', 'user:read')")
    def show(long id) {
        User user = User.withUser(id)
        if (user.id != springSecurityService.principal.id && !request.admin) {
            render(status: 403)
            return
        }
        request.marshaller = [user: [include: ['preferences']]]
        render(status: 200, contentType: 'application/json', text: user as JSON)
    }

    @Secured(["!isAuthenticated() or hasRole('ROLE_ADMIN')"])
    def save() {
        def userParams = params.user
        if (!userParams) {
            returnError(code: 'todo.is.ui.no.data')
            return
        }
        if (!request.restAPI && userParams.confirmPassword != userParams.password) {
            // Cannot be executed inside withFormat closure because return will return only from closure and code below will still be executed
            returnError(code: 'is.user.error.password.check')
            return
        }
        User user = new User()
        User.withTransaction {
            def propertiesToBind = ['username', 'firstName', 'lastName', 'email', 'password']
            if (request.admin) {
                propertiesToBind << 'accountExternal'
            }
            bindData(user, userParams, [include: propertiesToBind])
            user.preferences = new UserPreferences()
            bindData(user.preferences, userParams.preferences, [include: ['language', 'activity', 'needsEmailValidation']])
            if (userParams.preferences?.containsKey('colorScheme')) {
                user.preferences.colorScheme = userParams.preferences.colorScheme == 'null' ? null : userParams.preferences.colorScheme
            }
            userService.save(user, userParams.token)
        }
        render(status: 201, contentType: 'application/json', text: user as JSON)
    }

    @Secured("isAuthenticatedWeb() || hasAnyScopeOauth2('user', 'user:write')")
    def update(long id) {
        User user = User.withUser(id)
        if (user.id != springSecurityService.principal.id && !request.admin) {
            render(status: 403)
            return
        }
        Map props = [:]
        if (params.flowIdentifier) {
            User.withTransaction {
                def endOfUpload = { FileUploadInfo uploadInfo ->
                    def uploadedAvatar = new File(uploadInfo.filePath)
                    props.avatar = uploadedAvatar.canonicalPath
                    props.scale = true
                    userService.update(user, props)
                    render(status: 200, contentType: 'application/json', text: user as JSON)
                }
                UtilsWebComponents.handleUpload.delegate = this
                UtilsWebComponents.handleUpload(request, params, endOfUpload)
            }
            return;
        }
        if (!params.user) {
            returnError(code: 'todo.is.ui.no.data')
            return
        }
        if (!request.restAPI && (params.user.confirmPassword || params.user.password != "") && (params.user.confirmPassword != params.user.password)) {
            returnError(code: 'is.user.error.password.check')
            return
        }
        User.withTransaction {
            if (request.admin && params.user.username != user.username) {
                user.username = params.user.username
            }
            def propertiesToBind = ['firstName', 'lastName', 'email', 'notes']
            if (request.admin) {
                propertiesToBind << 'accountExternal'
            }
            bindData(user, params.user, [include: propertiesToBind])
            if (params.user.preferences) {
                bindData(user.preferences, params.user.preferences, [include: ['language', 'filterTask', 'activity', 'displayWhatsNew', 'displayReleaseNotes', 'needsEmailValidation']])
                if (params.user.preferences.containsKey('colorScheme')) {
                    user.preferences.colorScheme = params.user.preferences.colorScheme == 'null' ? null : params.user.preferences.colorScheme
                }
            }
            if (params.user.password?.trim() != '') {
                props.pwd = params.user.password
            }
            if (params.user.avatar && !(params.user.avatar in ['gravatar', 'custom', 'initials'])) {
                if (params.user.avatar instanceof String) {
                    params.user.avatar = params.user.avatar.split("/")?.last()
                    props.avatar = getAssetAvatarFile(params.user.avatar)
                    props.scale = false
                } else if (params.user.avatar) {
                    def uploadedAvatar = request.getFile('user.avatar')
                    props.avatar = new File(grailsApplication.config.icescrum.images.users.dir, "${user.id}.${FilenameUtils.getExtension(uploadedAvatar.originalFilename)}")
                    props.scale = true
                    uploadedAvatar.transferTo(props.avatar)
                }
                if (props.avatar) {
                    props.avatar = props.avatar.canonicalPath
                }
            } else if (params.user.avatar == 'initials') {
                props.avatar = "initials"
            } else if (params.user.avatar == 'gravatar') {
                props.avatar = null
            }
            if (params.user.preferences && params.user.preferences['emailsSettings']) {
                props.emailsSettings = [onStory     : params.remove('user.preferences.emailsSettings.onStory'),
                                        autoFollow  : params.remove('user.preferences.emailsSettings.autoFollow'),
                                        onUrgentTask: params.remove('user.preferences.emailsSettings.onUrgentTask')]
            }
            if (params.user.preferences && params.user.preferences['iceScrumRating'] != null) {
                props.iceScrumRating = params.remove('user.preferences.iceScrumRating').toInteger()
            }
            userService.update(user, props)
        }
        render(status: 200, contentType: 'application/json', text: user as JSON)
    }

    @Secured(["hasRole('ROLE_ADMIN')"])
    def delete(long substitutedBy) {
        User user
        if (params.id) {
            user = params.id.isLong() ? User.withUser(params.long('id')) : User.findByUsername(params.id)
        }
        if (!user) {
            redirect(controller: 'errors', action: 'error404')
            return
        }
        if (user.admin) {
            throw new BusinessException(code: 'Error, this user is an administrator and administrators cannot be deleted')
        }
        User substitute = User.withUser(substitutedBy)
        def deleteOwnedData = params.boolean('deleteOwnedData') ?: false
        userService.delete(user, substitute, deleteOwnedData)
        render(status: 204)
    }

    def register(String token) {
        if (springSecurityService.isLoggedIn()) {
            def targetUrl = createLink(absolute: true, controller: 'scrumOS', action: 'index')
            if (token) {
                targetUrl += "#/user/register/$token"
            }
            redirect(url: targetUrl)
            return
        } else {
            render(status: 200, view: 'register', model: [token: token])
        }
    }

    def avatar(Long id) {
        User user = id ? User.withUser(id) : null
        if (user) {
            withCacheHeaders {
                // If the cache has expired, tell the browser when the last change occured.
                // If the image has not changed, then the browser will keep using the cached image again for 30 seconds starting from this call
                // The combination of withCacheHeaders and cache(validFor: 30) ensures that for 1 user and 1 browser, this action is called at most once a minute
                // and that the image is rendered again only if it has changed
                delegate.lastModified {
                    user.lastUpdated
                }
                generate {
                    File avatar = userService.getAvatarFile(user)
                    if (!avatar?.exists()) {
                        if (ApplicationSupport.booleanValue(grailsApplication.config.icescrum.gravatar?.enable && user)) {
                            redirect(url: "https://secure.gravatar.com/avatar/" + user.email.encodeAsMD5())
                            return
                        }
                        avatar = getAssetAvatarFile("avatar.png")
                    }
                    cache(validFor: 30) // The browser will cache the request 30 seconds so it will not call the request again during this duration regardless of if the content has changed
                    render(file: avatar, contentType: 'image/png')
                }
            }
        } else {
            withCacheHeaders {
                delegate.lastModified {
                    new Date(1575371594)
                }
                generate {
                    cache(validFor: 3600)
                    render(file: getAssetAvatarFile('avatar.png'), contentType: 'image/png')
                }
            }
        }
    }

    @Secured(['isAuthenticated()'])
    def initialsAvatar(String firstName, String lastName) {
        OutputStream out = response.getOutputStream()
        ApplicationSupport.generateInitialsAvatar(firstName, lastName, out)
        out.close()
    }

    @Secured(['isAuthenticated()'])
    def search(String term, boolean showDisabled, String pkey, boolean invite) {
        def users = []
        def userFilter = { user ->
            def termLower = term.toLowerCase()
            user.email.toLowerCase().contains(termLower) ||
            user.username.toLowerCase().contains(termLower) ||
            "$user.lastName $user.firstName".toLowerCase().contains(termLower) ||
            "$user.firstName $user.lastName".toLowerCase().contains(termLower)
        }
        if (pkey) {
            users = Project.findByPkey(pkey).getAllUsers().findAll(userFilter).take(9)
        } else if (grailsApplication.config.icescrum.user.search.enable || request.admin) {
            users = User.findUsersLike(term ?: '', false, showDisabled, [max: 9])
        } else if (term) {
            users = User.findAllByEmailIlike(term)
            Project.findAllByUserAndActive(springSecurityService.currentUser, null, null).each { project ->
                users.addAll(project.getAllUsers())
            }
            users = users.unique { it.email }.findAll(userFilter).take(9)
        }
        def enableInvitation = grailsApplication.config.icescrum.registration.enable && grailsApplication.config.icescrum.invitation.enable
        if (!users && invite && ApplicationSupport.isValidEmailAddress(term) && enableInvitation) {
            users << [id: null, email: term]
        }
        render(status: 200, contentType: 'application/json', text: users as JSON)
    }

    @Secured('isAuthenticated()')
    def openProfile() {
        def user = springSecurityService.currentUser
        render(status: 200, template: 'dialogs/profile', model: [user: user, projects: grailsApplication.config.icescrum.alerts.enable ? Project.findAllByRole(user, [BasePermission.WRITE, BasePermission.READ], [cache: true, max: 11], true, false) : null])
    }

    @Secured("permitAllWeb() || hasAnyScopeOauth2('user', 'user:read')")
    def current() {
        request.restMarshaller = [
                user   : [
                        include: ['preferences']
                ],
                userpreferences: [
                        exclude: ['iceScrumRating', 'lastIceScrumRating', 'needsEmailValidation']
                ]
        ]
        def user = [user : springSecurityService.currentUser?.id ? springSecurityService.currentUser : 'null',
                    roles: securityService.getRolesRequest(true)]
        render(status: 200, contentType: 'application/json', text: user as JSON)
    }

    def retrieve(String username) {
        if (springSecurityService.isLoggedIn()) {
            redirect(controller: 'scrumOS', action: 'index')
            return
        } else {
            if (username) {
                def user
                def error
                user = User.findWhere(username: username)
                if (!user) {
                    user = User.findWhere(email: username)
                }
                if (!user || !user.enabled || user.accountExternal) {
                    error = message(code: !user ? 'is.user.error.not.exist' : (!user.enabled ? 'is.login.error.disabled' : 'is.user.error.externalAccount'))
                } else {
                    try {
                        User.withTransaction {
                            userService.resetPassword(user)
                        }
                    } catch (MailException e) {
                        error = message(code: 'is.mail.error', exception: e)
                    } catch (Exception e) {
                        error = message(code: 'is.mail.error', exception: e)
                    }
                }
                if (error) {
                    render(status: 200, view: 'retrieve', model: [error: error])
                    return
                } else {
                    redirect(url: createLink(absolute: true, controller: 'login', action: 'auth') + '?retrieve=1&username=' + username)
                    return
                }
            } else {
                render(status: 200, view: 'retrieve')
                return
            }
        }
    }

    @Secured('isAuthenticated()')
    def menu(long id, String menuId, Integer position) {
        User user = springSecurityService.currentUser
        if (id != user.id) {
            render(status: 403)
            return
        }
        if (!menuId && !position) {
            returnError(code: 'todo.is.ui.no.data')
            return
        }
        userService.updateMenuPosition(user, menuId, position)
        render(status: 200)
    }

    @Secured(['permitAll()'])
    def available(String property) {
        def result = false
        //test for username
        if (property == 'username') {
            result = request.JSON.value && User.countByUsername(request.JSON.value) == 0
            //test for email
        } else if (property == 'email') {
            result = request.JSON.value && User.countByEmail(request.JSON.value) == 0
        }
        render(status: 200, text: [isValid: result, value: request.JSON.value] as JSON, contentType: 'application/json')
    }

    @Secured("isAuthenticatedWeb() || hasAnyScopeOauth2('user', 'user:history')")
    def activities(long id) {
        User user = springSecurityService.currentUser
        if (id != user.id) {
            render(status: 403)
            return
        }
        def activitiesAndStories = Activity.importantStoryActivities(user).collect {
            def activity = it[0]
            def story = it[1]
            def project = story.backlog
            [
                    activity: activity,
                    story   : [uid: story.uid, name: story.name, permalink: story.permalink],
                    project : [pkey: project.pkey, name: project.name],
                    notRead : activity.dateCreated > user.preferences.lastReadActivities
            ]
        }
        user.preferences.lastReadActivities = new Date()
        user.preferences.save(flush: true)
        render(status: 200, text: activitiesAndStories as JSON, contentType: 'application/json')
    }

    @Secured(['isAuthenticated()'])
    def unreadActivitiesCount(long id) {
        User user = springSecurityService.currentUser
        if (id != user.id) {
            render(status: 403)
            return

        }
        render(status: 200, text: [unreadActivitiesCount: Activity.countNewImportantStoryActivities(user)] as JSON, contentType: 'application/json')
    }

    def invitation(String token) {
        def enableInvitation = grailsApplication.config.icescrum.registration.enable && grailsApplication.config.icescrum.invitation.enable
        def invitations = Invitation.findAllByToken(token)
        if (!invitations || !enableInvitation) {
            throw new ObjectNotFoundException(token, 'Invitation')
        }
        render(status: 200, text: invitations as JSON, contentType: 'application/json')
    }

    @Secured(['isAuthenticated()'])
    def acceptInvitations(String token) {
        def enableInvitation = grailsApplication.config.icescrum.registration.enable && grailsApplication.config.icescrum.invitation.enable
        def invitations = Invitation.findAllByToken(token)
        if (!invitations || !enableInvitation) {
            throw new ObjectNotFoundException(token, 'Invitation')
        }
        userService.acceptInvitations(invitations, springSecurityService.currentUser)
        render(status: 200)
    }

    private File getAssetAvatarFile(String avatarFileName) {
        def avatarPath
        if (grailsApplication.warDeployed) {
            def avatar = g.assetPath(src: 'avatars/' + avatarFileName) as String
            def baseName = FilenameUtils.getBaseName(avatar)
            def extension = FilenameUtils.getExtension(avatar)
            avatarPath = "assets/avatars/${baseName}.${extension}"
        } else {
            avatarPath = "../grails-app/assets/images/avatars/${avatarFileName}"
        }
        return grailsApplication.parentContext.getResource(avatarPath).file
    }
}
