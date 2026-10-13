using System.Security.Cryptography;
using CommentsApp.Domain.Interfaces;
using Microsoft.Extensions.Caching.Distributed;
using SixLabors.Fonts;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Drawing.Processing;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;


namespace CommentsApp.Infrastructure.Services;

public class CaptchaService : ICaptchaService
{
    // без похожих символов (0/O, 1/I), чтобы код было легко читать
    private const string Alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private const int CodeLength = 5;
    private const int Width = 170;
    private const int Height = 60;
    private static readonly TimeSpan Ttl = TimeSpan.FromMinutes(5);

    private readonly IDistributedCache _cache;

    public CaptchaService(IDistributedCache cache)
    {
        _cache = cache;
    }

    public async Task<CaptchaChallenge> GenerateAsync(CancellationToken cancellationToken = default)
    {
        var code = new string(Enumerable.Range(0, CodeLength)
            .Select(_ => Alphabet[RandomNumberGenerator.GetInt32(Alphabet.Length)])
            .ToArray());

        var id = Guid.NewGuid().ToString("N");

        await _cache.SetStringAsync(
            Key(id),
            code,
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = Ttl },
            cancellationToken);

        var dataUri = "data:image/png;base64," + Convert.ToBase64String(RenderPng(code));
        return new CaptchaChallenge(id, dataUri);
    }

    public async Task<bool> ValidateAsync(string id, string code, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(id) || string.IsNullOrWhiteSpace(code))
            return false;

        var key = Key(id);
        var expected = await _cache.GetStringAsync(key, cancellationToken);

        if (expected is null)
            return false;

        await _cache.RemoveAsync(key, cancellationToken);

        return string.Equals(expected, code.Trim(), StringComparison.OrdinalIgnoreCase);
    }

    //public async Task<bool> ValidateAsync(string id, string code, CancellationToken cancellationToken = default)
    //{
    //    if (string.IsNullOrWhiteSpace(id) || string.IsNullOrWhiteSpace(code))
    //        return false;

    //    var key = Key(id);
    //    var expected = await _cache.GetStringAsync(key, cancellationToken);
    //    if (expected is null)
    //        return false; // истекла или такой не было

    //    await _cache.RemoveAsync(key, cancellationToken); // одноразовая: после проверки удаляем

    //    return string.Equals(expected, code.Trim(), StringComparison.OrdinalIgnoreCase);
    //}

    private static string Key(string id) => $"captcha:{id}";

    private static byte[] RenderPng(string code)
    {
        // Windows — Arial; Linux/Docker — DejaVu Sans (ставится в Dockerfile); иначе — любой доступный
        var family = SystemFonts.TryGet("Arial", out var arial) ? arial
            : SystemFonts.TryGet("DejaVu Sans", out var dejaVu) ? dejaVu
            : SystemFonts.Collection.Families.First();
        var font = family.CreateFont(34, FontStyle.Bold);

        using var image = new Image<Rgba32>(Width, Height);
        image.Mutate(ctx =>
        {
            ctx.Fill(Color.White);

            // шумовые линии
            for (var i = 0; i < 6; i++)
            {
                var from = new PointF(RandomNumberGenerator.GetInt32(Width), RandomNumberGenerator.GetInt32(Height));
                var to = new PointF(RandomNumberGenerator.GetInt32(Width), RandomNumberGenerator.GetInt32(Height));
                ctx.DrawLine(Color.Gray, 1.5f, from, to);
            }

            // каждая буква с небольшим вертикальным разбросом
            for (var i = 0; i < code.Length; i++)
            {
                var x = 12 + i * 29;
                var y = 8 + RandomNumberGenerator.GetInt32(10);
                ctx.DrawText(code[i].ToString(), font, Color.Black, new PointF(x, y));
            }
        });

        using var ms = new MemoryStream();
        image.SaveAsPng(ms);
        return ms.ToArray();
    }
}