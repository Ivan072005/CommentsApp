using FluentValidation;

namespace CommentsApp.Application.Comments.Commands.CreateComment;

public class CreateCommentCommandValidator : AbstractValidator<CreateCommentCommand>
{
    public CreateCommentCommandValidator()
    {
        RuleFor(x => x.UserName)
            .NotEmpty().WithMessage("Имя пользователя обязательно")
            .Matches("^[a-zA-Z0-9]+$").WithMessage("Имя пользователя должно содержать только латинские буквы и цифры")
            .MaximumLength(50);

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email обязателен")
            .EmailAddress().WithMessage("Некорректный формат email")
            .MaximumLength(255);

        RuleFor(x => x.HomePage)
            .Must(BeAValidUrl).WithMessage("Некорректный формат URL")
            .When(x => !string.IsNullOrEmpty(x.HomePage));

        RuleFor(x => x.Text)
            .NotEmpty().WithMessage("Текст комментария обязателен");

        RuleFor(x => x.CaptchaId).NotEmpty().WithMessage("Капча обязательна");
        RuleFor(x => x.CaptchaCode).NotEmpty().WithMessage("Введите код с картинки");
    }

    private bool BeAValidUrl(string? url)
    {
        return Uri.TryCreate(url, UriKind.Absolute, out var result)
            && (result.Scheme == Uri.UriSchemeHttp || result.Scheme == Uri.UriSchemeHttps);
    }
}