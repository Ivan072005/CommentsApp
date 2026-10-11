using CommentsApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CommentsApp.Infrastructure.Persistence.Configurations;

public class CommentConfiguration : IEntityTypeConfiguration<Comment>
{
    public void Configure(EntityTypeBuilder<Comment> entity)
    {
        entity.ToTable("comments");
        entity.HasKey(e => e.Id);

        entity.Property(e => e.Id).HasColumnName("id");
        entity.Property(e => e.ParentId).HasColumnName("parent_id");
        entity.Property(e => e.UserId).HasColumnName("user_id");
        entity.Property(e => e.Text).HasColumnName("text").IsRequired();
        entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");

        entity.HasOne(e => e.Parent)
            .WithMany(e => e.Replies)
            .HasForeignKey(e => e.ParentId)
            .OnDelete(DeleteBehavior.Cascade);

        entity.HasOne(e => e.User)
            .WithMany(e => e.Comments)
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        entity.HasIndex(e => e.ParentId, "idx_comments_parent_id");
        entity.HasIndex(e => e.CreatedAt, "idx_comments_created_at");
    }
}