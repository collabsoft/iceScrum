import org.icescrum.atmosphere.IceScrumMeteorHandler

defaultMapping = "/stream/app/*"

servlets = [
        MeteorServletDefault: [
                className : "org.icescrum.atmosphere.IceScrumMeteorServlet",
                mapping   : "/stream/app/*",
                handler   : IceScrumMeteorHandler,
                initParams: [
                        "org.atmosphere.cpr.AtmosphereFramework.analytics"                           : false,
                        "org.atmosphere.interceptor.HeartbeatInterceptor.heartbeatFrequencyInSeconds": 60, // seconds
                        "org.atmosphere.cpr.CometSupport.maxInactiveActivity"                        : 30 * 60000, // 30 minutes
                        "org.atmosphere.cpr.broadcasterClass"                                        : "org.icescrum.atmosphere.IceScrumBroadcaster",
                        "org.atmosphere.cpr.Broadcaster.sharedListenersList"                         : true,
                        "org.atmosphere.cpr.AtmosphereInterceptor"                                   : """
                                org.atmosphere.client.TrackMessageSizeInterceptor,
                                org.atmosphere.interceptor.AtmosphereResourceLifecycleInterceptor
                        """,
                ]
        ]
]