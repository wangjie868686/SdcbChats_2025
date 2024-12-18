﻿using Chats.BE.Controllers.Chats.Chats.Dtos;
using Chats.BE.Controllers.Chats.UserChats.Dtos;
using Chats.BE.DB;
using Chats.BE.Infrastructure;
using Chats.BE.Services;
using Chats.BE.Services.ChatServices;
using Chats.BE.Services.UrlEncryption;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Chats.BE.Controllers.Chats.Chats;

[Route("api/chat/{encryptedChatId}/span"), Authorize]
public class ChatSpanController(ChatsDB db, IUrlEncryptionService idEncryption, CurrentUser currentUser) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<ChatSpanDto>> CreateChatSpan(string encryptedChatId, [FromBody] CreateChatSpanRequest request,
        [FromServices] UserModelManager userModelManager,
        CancellationToken cancellationToken)
    {
        Chat? chat = await db.Chats
            .Include(x => x.ChatSpans.OrderByDescending(x => x.SpanId))
            .FirstOrDefaultAsync(x => x.Id == idEncryption.DecryptChatId(encryptedChatId) && x.UserId == currentUser.Id && !x.IsDeleted, cancellationToken);
        if (chat == null)
        {
            return NotFound();
        }

        ChatSpan toAdd = null!;
        if (chat.ChatSpans.Count == 0)
        {
            UserModel? um = await userModelManager.GetValidModelsByUserId(currentUser.Id).FirstOrDefaultAsync(cancellationToken);
            if (um == null)
            {
                return BadRequest("No models available");
            }

            toAdd = new ChatSpan
            {
                ChatId = chat.Id,
                SpanId = 0,
                ModelId = um.ModelId,
                Model = um.Model,
                Temperature = ChatService.DefaultTemperature,
                EnableSearch = true,
            };
        }
        else
        {
            if (chat.ChatSpans.Count >= 10)
            {
                return BadRequest("Max span count reached");
            }

            ChatSpan refSpan = chat.ChatSpans.First();
            short modelId = request.ModelId ?? refSpan.ModelId;
            UserModel? um = await userModelManager.GetValidModelsByUserId(currentUser.Id)
                .FirstOrDefaultAsync(x => x.ModelId == modelId, cancellationToken);
            if (um == null)
            {
                return BadRequest("Model not available");
            }

            toAdd = new ChatSpan()
            {
                ChatId = chat.Id,
                SpanId = (byte)(refSpan.SpanId + 1),
                ModelId = request.ModelId ?? refSpan.ModelId,
                Model = um.Model,
                Temperature = request.SetTemperature ? request.Temperature : refSpan.Temperature,
                EnableSearch = request.EnableSearch ?? refSpan.EnableSearch,
            };
        }

        chat.ChatSpans.Add(toAdd);
        await db.SaveChangesAsync(cancellationToken);
        return Created(default(string), ChatSpanDto.FromDB(toAdd));
    }

    [HttpPut("{spanId}")]
    public async Task<ActionResult<ChatSpanDto>> UpdateChatSpan(string encryptedChatId, byte spanId, [FromBody] CreateChatSpanRequest request,
        [FromServices] UserModelManager userModelManager,
        CancellationToken cancellationToken)
    {
        int chatId = idEncryption.DecryptChatId(encryptedChatId);

        ChatSpan? span = await db.ChatSpans.FirstOrDefaultAsync(x => 
            x.ChatId == chatId && x.SpanId == spanId && x.Chat.UserId == currentUser.Id && !x.Chat.IsDeleted, cancellationToken);
        if (span == null)
        {
            return NotFound();
        }

        if (request.ModelId != null)
        {
            UserModel? um = await userModelManager.GetValidModelsByUserId(currentUser.Id).FirstOrDefaultAsync(x => x.ModelId == request.ModelId, cancellationToken);
            if (um == null)
            {
                return BadRequest("Model not available");
            }

            span.ModelId = request.ModelId.Value;
            span.Model = um.Model;
        }

        if (request.SetTemperature)
        {
            span.Temperature = request.Temperature;
        }

        if (request.EnableSearch != null)
        {
            span.EnableSearch = request.EnableSearch.Value;
        }

        await db.SaveChangesAsync(cancellationToken);
        return Ok(ChatSpanDto.FromDB(span));
    }

    [HttpDelete("{spanId}")]
    public async Task<IActionResult> DeleteChatSpan(string encryptedChatId, byte spanId, CancellationToken cancellationToken)
    {
        int chatId = idEncryption.DecryptChatId(encryptedChatId);
        ChatSpan? span = await db.ChatSpans.FirstOrDefaultAsync(x =>
            x.ChatId == chatId && x.SpanId == spanId && x.Chat.UserId == currentUser.Id && !x.Chat.IsDeleted, cancellationToken);
        if (span == null)
        {
            return NotFound();
        }

        bool hasMessages = await db.Messages.AnyAsync(x => x.ChatId == chatId && x.SpanId == spanId, cancellationToken);
        if (hasMessages)
        {
            return BadRequest("Cannot delete span with messages");
        }

        db.ChatSpans.Remove(span);
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}
