using CommentsApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CommentsApp.Infrastructure.Persistence.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> entity)
    {
        entity.ToTable("users");
        entity.HasKey(e => e.Id);

        entity.Property(e => e.Id).HasColumnName("id");
        entity.Property(e => e.UserName).HasColumnName("user_name").HasMaxLength(50).IsRequired();
        entity.Property(e => e.Email).HasColumnName("email").HasMaxLength(255).IsRequired();
        entity.Property(e => e.HomePage).HasColumnName("home_page").HasMaxLength(255);
        entity.Property(e => e.IpAddress).HasColumnName("ip_address").HasMaxLength(45).IsRequired();
        entity.Property(e => e.UserAgent).HasColumnName("user_agent").HasMaxLength(500);
        entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");

        entity.HasIndex(e => e.UserName, "idx_users_user_name");
        entity.HasIndex(e => e.Email, "idx_users_email");
    }
}