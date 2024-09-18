﻿using Chats.BE.Services.Sessions;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using System.Security.Claims;
using System.Text.Encodings.Web;

namespace Chats.BE.Infrastructure;

public class SessionAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory loggerFactory,
    SessionManager sessionManager,
    UrlEncoder encoder) : AuthenticationHandler<AuthenticationSchemeOptions>(options, loggerFactory, encoder)
{
    private readonly ILogger<SessionAuthenticationHandler> _logger = loggerFactory.CreateLogger<SessionAuthenticationHandler>();

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue("Authorization", out var authorizationHeader))
        {
            return AuthenticateResult.NoResult();
        }

        string authorizationHeaderString = authorizationHeader.ToString();
        if (!Guid.TryParse(authorizationHeaderString.Split(' ').Last(), out Guid sessionId))
        {
            return AuthenticateResult.Fail("Invalid session id.");
        }

        SessionEntry? userInfo = await sessionManager.GetCachedUserInfoBySession(sessionId);
        if (userInfo == null)
        {
            return AuthenticateResult.Fail($"Invalid session id: {sessionId}");
        }

        var identity = new ClaimsIdentity(userInfo.ToClaims(), Scheme.Name);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, Scheme.Name);

        return AuthenticateResult.Success(ticket);
    }
}